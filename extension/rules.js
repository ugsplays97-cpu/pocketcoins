// Game rules shared by the extension and the website (and covered by tests).
(() => {
  const BONUS_WAIT = 60000; // free 50 coins once a minute
  const clampLuck = (n) => Math.max(-100, Math.min(100, Math.round(+n) || 0));
  // Skill tree: five honeycomb columns, each skill needs the one above it.
  // Balance: every perk is small and prices climb steeply. With every skill owned a
  // flip is only at most ~20% in your favour, so skills reward playing without breaking the game.
  const S = (id, branch, icon, name, desc, cost, req) => ({ id, branch, icon, name, desc, cost, req });
  const SKILLS = [
    S("luck1", "Fortune", "🍀", "Lucky Charm", "Win chance +5%", 500),
    S("luck2", "Fortune", "🌟", "Four-Leaf", "Win chance +5% more", 3000, "luck1"),
    S("luck4", "Fortune", "🔮", "Crystal Ball", "Win chance +10% more", 15000, "luck2"),
    S("luck5", "Fortune", "🌈", "Rainbow", "Win chance +10% more", 60000, "luck4"),
    S("luck3", "Payout", "🪙", "Shiny Coin", "Flip wins pay 5% more", 600, null),
    S("pay2", "Payout", "💎", "Gem Polish", "Flip wins pay 5% more", 3500, "luck3"),
    S("pay3", "Payout", "👑", "Golden Touch", "Flip wins pay 10% more", 18000, "pay2"),
    S("pay4", "Payout", "🏆", "Jackpot", "Flip wins pay 10% more", 70000, "pay3"),
    S("safe1", "Safety", "🛡️", "Cushion", "Get 5% back on lost flips", 500),
    S("safe2", "Safety", "🪂", "Safety Net", "Get 10% back on lost flips", 3000, "safe1"),
    S("safe4", "Safety", "🧱", "Bunker", "Get 20% back on lost flips", 15000, "safe2"),
    S("safe5", "Safety", "🏰", "Fortress", "Get 30% back on lost flips", 60000, "safe4"),
    S("duel1", "Duelist", "🗡️", "Sharp Blade", "Duel wins pay 15% more", 800),
    S("safe3", "Duelist", "🛡", "Duel Guard", "Get 15% back on lost duels", 4000, "duel1"),
    S("bonus3", "Duelist", "⚔️", "Duel Prize", "Duel wins pay 25% more", 20000, "safe3"),
    S("duel4", "Duelist", "🐉", "Champion", "Get 25% back on lost duels", 80000, "bonus3"),
    S("bonus1", "Bonus", "⏱️", "Quick Claim", "Free coins every 30s", 200),
    S("bonus2", "Bonus", "👛", "Bigger Pouch", "Free claim gives 500", 1000, "bonus1"),
    S("bonus4", "Bonus", "⌛", "Hourglass", "Free coins every 15s", 4000, "bonus2"),
    S("bonus5", "Bonus", "💰", "Treasure Bag", "Free claim gives 2000", 12000, "bonus4"),
  ];
  // Casino tycoon: buildings cost coins and make chips over time. Chips buy and upgrade skills.
  const B = (id, icon, name, cost, rate) => ({ id, icon, name, cost, rate });
  const BUILDINGS = [
    B("slot", "🎰", "Slot Machine", 100, 0.2),
    B("table", "🃏", "Card Table", 1000, 1),
    B("wheel", "🎡", "Roulette", 8000, 4),
    B("bar", "🍸", "Bar", 50000, 15),
    B("vip", "💎", "VIP Lounge", 300000, 60),
    B("poker", "♠️", "Poker Room", 2000000, 250),
    B("tower", "🏙️", "High-Roller Tower", 15000000, 1200),
  ];
  // One-time casino upgrades (saved in the casino object as "up_<id>": 1).
  const UPGRADES = [
    { id: "neon", icon: "💡", name: "Neon Sign", desc: "All places make 25% more", cost: 5000, mult: 1.25 },
    { id: "goldslots", icon: "🪙", name: "Golden Slots", desc: "Slot Machines make 3×", cost: 20000, only: "slot", mult: 3 },
    { id: "security", icon: "🛡️", name: "Security Guards", desc: "Earn while away for 24h (not 8h)", cost: 60000 },
    { id: "dealers", icon: "🤵", name: "Pro Dealers", desc: "Card Tables & Roulette make 2×", cost: 150000, only: ["table", "wheel"], mult: 2 },
    { id: "valet", icon: "🚗", name: "Valet Parking", desc: "All places make 50% more", cost: 750000, mult: 1.5 },
    { id: "penthouse", icon: "🌃", name: "Penthouse Suite", desc: "All places make 2×", cost: 5000000, mult: 2 },
  ];
  const hasUp = (casino, id) => !!(casino || {})["up_" + id];
  const MAX_LEVEL = 5;
  // Packs: bought with coins, give coins + chips. Odds add up to 100.
  const PACKS = [
    { id: "bronze", icon: "📦", name: "Bronze Pack", cost: 250, chips: 20 },
    { id: "silver", icon: "🎁", name: "Silver Pack", cost: 2500, chips: 250 },
    { id: "gold", icon: "👑", name: "Gold Pack", cost: 25000, chips: 3000 },
    { id: "first-limited", icon: "⏳", name: "first limited time!!!", cost: 2500, chips: 250,
      startsAt: Date.parse("2026-11-06T10:13:00Z"), endsAt: Date.parse("2026-11-13T10:13:00Z") },
  ];
  const packAvailable = (id, now = Date.now()) => {
    const p = PACKS.find((k) => k.id === id);
    return !!p && (p.startsAt == null || now >= p.startsAt) && (p.endsAt == null || now < p.endsAt);
  };
  // Items drop from packs, sit in your bag, and can be sold or bet for their value in coins.
  const I = (id, icon, name, rarity, value) => ({ id, icon, name, rarity, value });
  const ITEMS = [
    I("dice", "🎲", "Lucky Dice", "common", 50), I("card", "🃏", "Joker Card", "common", 60), I("chip", "🔴", "Red Chip", "common", 40),
    I("watch", "⌚", "Gold Watch", "uncommon", 200), I("cigar", "🚬", "Fancy Cigar", "uncommon", 250),
    I("ring", "💍", "Diamond Ring", "rare", 1000), I("car", "🏎️", "Sports Car Key", "rare", 1500),
    I("crown", "👑", "Royal Crown", "epic", 6000), I("yacht", "🛥️", "Yacht Deed", "epic", 8000),
    I("dragon", "🐉", "Golden Dragon", "legendary", 40000),
    I("star", "🌠", "Fallen Star", "mythic", 500000),
  ];
  const RARITIES = [
    { id: "common", name: "Common", odds: 60, coins: 0.4, chips: 1 },
    { id: "uncommon", name: "Uncommon", odds: 25, coins: 0.8, chips: 2 },
    { id: "rare", name: "Rare", odds: 10, coins: 1.5, chips: 5 },
    { id: "epic", name: "Epic", odds: 4, coins: 4, chips: 15 },
    { id: "legendary", name: "Legendary", odds: 0.9, coins: 15, chips: 60 },
    { id: "mythic", name: "Mythic", odds: 0.1, coins: 100, chips: 500 },
  ];
  const OFFLINE_CAP = 8 * 3600 * 1000; // chips build up for at most 8 hours while away
  const skillChipCost = (s) => Math.round(s.cost / 10);
  const lvlOf = (levels, id) => Math.max(1, Math.min(MAX_LEVEL, Math.floor((levels || {})[id]) || 1));
  // Each level adds the full perk again: level 2 = 2x, level 5 = 5x.
  const LEVEL_MULT = (l) => l;
  const mult = (levels, id) => LEVEL_MULT(lvlOf(levels, id));
  const has = (owned, id) => Array.isArray(owned) && owned.includes(id);
  const count = (owned, ids, levels) => ids.reduce((n, i) => n + (has(owned, i) ? mult(levels, i) : 0), 0);
  const pick = (owned, levels, list) => { for (const [id, v] of list) if (has(owned, id)) return v * mult(levels, id); return 0; };
  window.PC_RULES = {
    SKILLS,
    BUILDINGS,
    UPGRADES,
    hasUp,
    MAX_LEVEL,
    levelMult: LEVEL_MULT,
    PACKS,
    packAvailable,
    RARITIES,
    ITEMS,
    item: (id) => ITEMS.find((i) => i.id === id),
    /** Open a pack: rand() gives 0..1. Returns { rarity, chips, coins }. */
    openPack: (id, rand = Math.random, now = Date.now()) => {
      const p = PACKS.find((k) => k.id === id);
      if (!p || !packAvailable(id, now)) return null;
      let r = rand() * 100, pick = RARITIES[0];
      for (const x of RARITIES) { if (r < x.odds) { pick = x; break; } r -= x.odds; }
      const roll = 0.8 + rand() * 0.4;
      const pool = ITEMS.filter((i) => i.rarity === pick.id);
      const item = pool[Math.min(pool.length - 1, Math.floor(rand() * pool.length))].id;
      return { rarity: pick.id, name: pick.name, item, coins: Math.floor(p.cost * pick.coins * roll), chips: Math.floor(p.chips * pick.chips * roll) };
    },
    OFFLINE_CAP,
    skillChipCost,
    level: lvlOf,
    /** Can this skill be bought now? (paid in casino chips) */
    canBuy: (owned, id, chips) => {
      const s = SKILLS.find((k) => k.id === id);
      return !!s && !has(owned, id) && (!s.req || has(owned, s.req)) && chips >= skillChipCost(s);
    },
    /** Chips to raise an owned skill one level (null when maxed). */
    upgradeCost: (id, levels) => {
      const s = SKILLS.find((k) => k.id === id), l = lvlOf(levels, id);
      return !s || l >= MAX_LEVEL ? null : skillChipCost(s) * (l + 1) * l;
    },
    /** Coins for the next building of this kind (prices grow 15% each). */
    buildingCost: (id, owned) => {
      const b = BUILDINGS.find((k) => k.id === id);
      return b ? Math.ceil(b.cost * Math.pow(1.15, Math.max(0, owned || 0))) : Infinity;
    },
    /** Chips per second from the casino ({ slot: 2, ... }). */
    chipRate: (casino) => BUILDINGS.reduce((n, b) => {
      let m = 1;
      for (const u of UPGRADES) if (u.mult && hasUp(casino, u.id) && (!u.only || [].concat(u.only).includes(b.id))) m *= u.mult;
      return n + b.rate * m * Math.max(0, Math.floor((casino || {})[b.id]) || 0);
    }, 0),
    /** Chips earned since the last visit (capped at 8 hours). */
    offlineChips: (casino, since, now) => (since ? Math.max(0, Math.min(hasUp(casino, "security") ? OFFLINE_CAP * 3 : OFFLINE_CAP, now - since)) / 1000 : 0) * window.PC_RULES.chipRate(casino),
    /** Combined effects of the owned skills (levels make them stronger). */
    perks: (owned, levels) => {
      const L = levels || {};
      const bw = has(owned, "bonus4") ? ["bonus4", 15000] : has(owned, "bonus1") ? ["bonus1", 30000] : null;
      const ba = has(owned, "bonus5") ? ["bonus5", 2000] : has(owned, "bonus2") ? ["bonus2", 500] : null;
      return {
        luck: 0,
        winBoost: 0.05 * count(owned, ["luck1", "luck2"], L) + 0.1 * count(owned, ["luck4", "luck5"], L),
        flipBonus: 0.05 * count(owned, ["luck3", "pay2"], L) + 0.1 * count(owned, ["pay3", "pay4"], L),
        flipRefund: Math.min(0.9, pick(owned, L, [["safe5", 0.3], ["safe4", 0.2], ["safe2", 0.1], ["safe1", 0.05]])),
        duelBonus: 0.15 * count(owned, ["duel1"], L) + 0.25 * count(owned, ["bonus3"], L),
        duelRefund: Math.min(0.9, 0.15 * count(owned, ["safe3"], L) + 0.25 * count(owned, ["duel4"], L)),
        bonusWait: bw ? Math.round(bw[1] / mult(L, bw[0])) : BONUS_WAIT,
        bonusAmount: ba ? Math.round(ba[1] * mult(L, ba[0])) : 50,
      };
    },
    /** Average coins won or lost per coin bet on a flip (0 = fair). */
    flipEdge: (chance, p) => {
      const win = Math.min(1, (chance / 100) * (1 + p.winBoost));
      return win * (100 / chance - 1) * (1 + p.flipBonus) - (1 - win) * (1 - p.flipRefund);
    },
    BONUS_WAIT,
    BONUS_AMOUNT: 50,
    clampLuck,
    /** Seconds left before the free coins can be claimed again (0 = claim now). */
    bonusLeft: (bonusAt, now, wait = BONUS_WAIT) => Math.max(0, Math.ceil(((bonusAt || 0) + wait - now) / 1000)),
    /** Chance (0-100) to win a flip with the picked win chance and luck (-100..100). */
    flipOdds: (chance, luck) => {
      const L = clampLuck(luck);
      return L >= 0 ? chance + ((100 - chance) * L) / 100 : chance * (1 + L / 100);
    },
  };
})();
