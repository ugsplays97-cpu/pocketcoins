// Game rules shared by the extension and the website (and covered by tests).
(() => {
  const BONUS_WAIT = 60000; // free 50 coins once a minute
  const clampLuck = (n) => Math.max(-100, Math.min(100, Math.round(+n) || 0));
  // Skill tree: three branches, each node needs the one before it.
  const SKILLS = [
    { id: "luck1", branch: "Fortune", icon: "🍀", name: "Lucky Charm", desc: "+5 luck on flips", cost: 200 },
    { id: "luck2", branch: "Fortune", icon: "🌟", name: "Four-Leaf", desc: "+5 more luck", cost: 1000, req: "luck1" },
    { id: "luck3", branch: "Fortune", icon: "👑", name: "Golden Touch", desc: "Flip wins pay 10% more", cost: 5000, req: "luck2" },
    { id: "safe1", branch: "Safety", icon: "🛡️", name: "Cushion", desc: "Get 10% back on lost flips", cost: 300 },
    { id: "safe2", branch: "Safety", icon: "🪂", name: "Safety Net", desc: "Get 25% back on lost flips", cost: 1500, req: "safe1" },
    { id: "safe3", branch: "Safety", icon: "🏰", name: "Duel Guard", desc: "Get 25% back on lost duels", cost: 6000, req: "safe2" },
    { id: "bonus1", branch: "Bonus", icon: "⏱️", name: "Quick Claim", desc: "Free coins every 30s", cost: 150 },
    { id: "bonus2", branch: "Bonus", icon: "💰", name: "Bigger Pouch", desc: "Free claim gives 100", cost: 800, req: "bonus1" },
    { id: "bonus3", branch: "Bonus", icon: "⚔️", name: "Duel Prize", desc: "Duel wins pay 10% more", cost: 4000, req: "bonus2" },
  ];
  const has = (owned, id) => Array.isArray(owned) && owned.includes(id);
  window.PC_RULES = {
    SKILLS,
    /** Can this skill be bought now? */
    canBuy: (owned, id, coins) => {
      const s = SKILLS.find((k) => k.id === id);
      return !!s && !has(owned, id) && (!s.req || has(owned, s.req)) && coins >= s.cost;
    },
    /** Combined effects of the owned skills. */
    perks: (owned) => ({
      luck: (has(owned, "luck1") ? 5 : 0) + (has(owned, "luck2") ? 5 : 0),
      flipBonus: has(owned, "luck3") ? 0.1 : 0,
      flipRefund: has(owned, "safe2") ? 0.25 : has(owned, "safe1") ? 0.1 : 0,
      duelRefund: has(owned, "safe3") ? 0.25 : 0,
      bonusWait: has(owned, "bonus1") ? 30000 : BONUS_WAIT,
      bonusAmount: has(owned, "bonus2") ? 100 : 50,
      duelBonus: has(owned, "bonus3") ? 0.1 : 0,
    }),
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
