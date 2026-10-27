(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const store = api.storage.local;
  const $ = (id) => document.getElementById(id);
  const esc = window.PC_ESC;
  const GAMES = window.GAMES;
  const IS_WIN = new URLSearchParams(location.search).has("win");
  if (IS_WIN) document.body.classList.add("win");

  const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const VIEWS = ["home", "setup", "waiting", "duel", "over"];
  const show = (v) => VIEWS.forEach((id) => ($(id).hidden = id !== v));

  let coins = 100;
  let me = { id: "", name: "" };
  let lobby = null, lobbyReady = false;
  let online = {}; // id -> { name, coins, busy }
  let duel = null; // { id, game, bet, foeId, foeName, side, ended, handle }
  let outgoing = null; // { id, to, toName, game, bet, timer }
  const invites = new Map(); // id -> { from, fromName, game, bet, timer }
  let target = null, pickedGame = "walls";

  // ---------- coins ----------
  function setCoins(n) {
    coins = Math.max(0, Math.floor(n));
    $("bal").textContent = coins;
    store.set({ coins });
    $("bonus").hidden = coins >= 10;
    track();
  }
  function notice(html) {
    $("notice").innerHTML = html;
    $("notice").hidden = false;
    clearTimeout(notice.t);
    notice.t = setTimeout(() => ($("notice").hidden = true), 5000);
  }

  // ---------- tabs ----------
  function tab(name) {
    document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === name));
    $("flip").hidden = name !== "flip";
    $("players").hidden = name !== "players";
  }
  document.querySelectorAll(".tabs button").forEach((b) => (b.onclick = () => tab(b.dataset.tab)));

  // ---------- flip ----------
  const updMult = () => {
    const c = +$("chance").value;
    $("chanceTxt").textContent = c + "%";
    $("mult").textContent = "×" + (100 / c).toFixed(2);
  };
  $("chance").oninput = updMult;
  document.querySelectorAll("[data-bet]").forEach((b) => (b.onclick = () => {
    const cur = Math.floor(+$("bet").value) || 1;
    const v = { half: Math.floor(cur / 2), double: cur * 2, max: coins }[b.dataset.bet];
    $("bet").value = Math.max(1, Math.min(v, Math.max(coins, 1)));
  }));
  $("spin").onclick = () => {
    const bet = Math.floor(+$("bet").value), c = +$("chance").value;
    const res = $("flipResult");
    if (!(bet >= 1) || bet > coins) { res.innerHTML = `<span class="lose-txt">Not enough coins</span>`; return; }
    $("spin").disabled = true;
    const coin = $("flipCoin");
    coin.classList.remove("spin"); void coin.offsetWidth; coin.classList.add("spin");
    res.textContent = "";
    setTimeout(() => {
      if (Math.random() * 100 < c) {
        const win = Math.floor((bet * 100) / c) - bet;
        setCoins(coins + win);
        res.innerHTML = `<span class="win-txt">+${win} coins</span>`;
      } else {
        setCoins(coins - bet);
        res.innerHTML = `<span class="lose-txt">−${bet} coins</span>`;
      }
      $("spin").disabled = false;
    }, 700);
  };
  $("bonus").onclick = () => { if (coins < 10) { setCoins(coins + 50); $("flipResult").innerHTML = `<span class="win-txt">+50 free coins</span>`; } };

  // ---------- lobby ----------
  // Presence updates are debounced so quick coin changes don't flood the lobby.
  function track() {
    if (!lobby || !lobbyReady) return;
    clearTimeout(track.t);
    track.t = setTimeout(() => {
      lobby.track({ name: me.name || "Player", coins, busy: !!(duel && !duel.ended) || !!outgoing });
    }, 250);
  }
  function send(to, msg) {
    if (!lobby) return;
    lobby.send({ type: "broadcast", event: "msg", payload: { ...msg, to, from: me.id } });
  }
  const hue = (s) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 360, 7);

  function renderPlayers() {
    const ids = Object.keys(online).sort((a, b) => online[a].name.localeCompare(online[b].name));
    $("onlineCount").textContent = ids.length;
    if (!ids.length) {
      $("plist").innerHTML = `<div class="empty">Nobody else is online right now.<br>Players show up here the moment they open Pocket Coins.</div>`;
      return;
    }
    $("plist").innerHTML = ids.map((id) => {
      const p = online[id];
      return `<div class="player ${p.busy ? "busy" : ""}">
        <div class="avatar" style="background:hsl(${hue(id)} 80% 72%)">${esc((p.name || "?")[0].toUpperCase())}</div>
        <div class="pinfo"><div class="pname">${esc(p.name)}</div>
          <div class="pmeta"><span class="online-dot"></span>${p.busy ? "In a duel" : "Online"} · ${p.coins} coins</div></div>
        <button class="duel-btn" data-id="${esc(id)}" ${p.busy ? "disabled" : ""}>Duel</button>
      </div>`;
    }).join("");
  }
  $("plist").onclick = (e) => {
    const b = e.target.closest(".duel-btn");
    if (!b || b.disabled || duel) return;
    openSetup(b.dataset.id);
  };

  function renderInvites() {
    const show = !duel || duel.ended;
    $("invites").innerHTML = !show ? "" : [...invites.entries()].map(([id, inv]) => {
      const g = GAMES[inv.game];
      return `<div class="invite" data-id="${esc(id)}">
        <div><b>${esc(inv.fromName)}</b> wants to duel: ${g.emoji} <b>${g.name}</b> for <b>${inv.bet}</b> coins</div>
        <div class="invite-actions"><button class="accept">Accept</button><button class="decline">No thanks</button></div>
      </div>`;
    }).join("");
  }
  $("invites").onclick = (e) => {
    const card = e.target.closest(".invite");
    if (!card) return;
    const id = card.dataset.id, inv = invites.get(id);
    if (!inv) return;
    if (e.target.closest(".decline")) { dropInvite(id, true); return; }
    if (e.target.closest(".accept")) {
      if (inv.bet > coins) { notice(`You need ${inv.bet} coins to accept that duel.`); dropInvite(id, true); return; }
      if (outgoing) cancelOutgoing();
      const seed = Math.floor(Math.random() * 2 ** 31);
      send(inv.from, { t: "accept", id, seed });
      invites.delete(id); clearTimeout(inv.timer);
      for (const other of [...invites.keys()]) dropInvite(other, true);
      startDuel({ id, game: inv.game, bet: inv.bet, foeId: inv.from, foeName: inv.fromName, side: 1, seed });
    }
  };
  function dropInvite(id, tellThem) {
    const inv = invites.get(id);
    if (!inv) return;
    clearTimeout(inv.timer);
    invites.delete(id);
    if (tellThem) send(inv.from, { t: "decline", id });
    renderInvites();
  }

  // ---------- setup / outgoing invites ----------
  function openSetup(id) {
    target = id;
    $("setupFoe").textContent = online[id]?.name || "Player";
    $("gamePick").innerHTML = Object.entries(GAMES).map(([key, g]) =>
      `<button class="game-card ${key === pickedGame ? "on" : ""}" data-g="${key}"><span class="emo">${g.emoji}</span><b>${g.name}</b><span>${g.desc}</span></button>`).join("");
    $("duelBet").value = Math.max(1, Math.min(+$("duelBet").value || 10, coins || 1));
    $("setupStatus").textContent = "";
    show("setup");
  }
  $("gamePick").onclick = (e) => {
    const c = e.target.closest(".game-card");
    if (!c) return;
    pickedGame = c.dataset.g;
    $("gamePick").querySelectorAll(".game-card").forEach((x) => x.classList.toggle("on", x === c));
  };
  $("setupBack").onclick = () => { target = null; show("home"); };
  $("sendInvite").onclick = () => {
    const p = online[target];
    const bet = Math.floor(+$("duelBet").value);
    if (!p) { $("setupStatus").textContent = "That player just went offline."; return; }
    if (p.busy) { $("setupStatus").textContent = "They're in another duel right now."; return; }
    if (!(bet >= 1)) { $("setupStatus").textContent = "Bet at least 1 coin."; return; }
    if (bet > coins) { $("setupStatus").textContent = "You don't have that many coins."; return; }
    if (bet > p.coins) { $("setupStatus").textContent = `${p.name} only has ${p.coins} coins.`; return; }
    outgoing = { id: rid(), to: target, toName: p.name, game: pickedGame, bet };
    outgoing.timer = setTimeout(() => { cancelOutgoing(); notice(`${esc(p.name)} didn't answer.`); }, 30000);
    send(target, { t: "invite", id: outgoing.id, game: pickedGame, bet, fromName: me.name || "Player" });
    $("waitFoe").textContent = p.name;
    show("waiting");
    track();
  };
  function cancelOutgoing(silent) {
    if (!outgoing) return;
    clearTimeout(outgoing.timer);
    if (!silent) send(outgoing.to, { t: "cancel", id: outgoing.id });
    outgoing = null;
    if (!duel) { show("home"); tab("players"); }
    track();
  }
  $("cancelInvite").onclick = () => cancelOutgoing();

  // ---------- duels ----------
  function startDuel(d) {
    duel = { ...d, ended: false };
    store.set({ activeDuel: { id: d.id, bet: d.bet } });
    const g = GAMES[d.game];
    $("duelGame").textContent = `${g.emoji} ${g.name}`;
    $("duelFoe").textContent = d.foeName;
    $("duelBetTxt").textContent = d.bet;
    $("duelStatus").textContent = "";
    $("forfeit").hidden = false;
    $("stage").innerHTML = "";
    $("stage").onclick = $("stage").onmousemove = $("stage").onmouseleave = null;
    show("duel");
    renderInvites();
    track();
    const id = d.id;
    duel.handle = g.start({
      el: $("stage"), side: d.side, seed: d.seed, foe: d.foeName,
      send: (move) => { if (duel && duel.id === id && !duel.ended) send(d.foeId, { t: "move", id, move }); },
      end: (res) => endDuel(id, res),
      status: (html) => { if (duel && duel.id === id) $("duelStatus").innerHTML = html; },
    });
  }
  function endDuel(id, res, reason) {
    if (!duel || duel.id !== id || duel.ended) return;
    duel.ended = true;
    store.remove("activeDuel");
    if (res > 0) setCoins(coins + duel.bet);
    else if (res < 0) setCoins(coins - duel.bet);
    $("forfeit").hidden = true;
    const d = duel;
    setTimeout(() => {
      if (duel !== d) return;
      $("overEmoji").textContent = res > 0 ? "🏆" : res < 0 ? "💸" : "🤝";
      $("overTitle").textContent = res > 0 ? "You won!" : res < 0 ? "You lost" : "It's a tie";
      $("overText").innerHTML = (reason ? reason + " " : "") +
        (res > 0 ? `<span class="win-txt">+${d.bet} coins</span>` : res < 0 ? `<span class="lose-txt">−${d.bet} coins</span>` : "No coins changed hands.");
      show("over");
      track();
    }, reason ? 0 : 1600);
  }
  $("forfeit").onclick = () => {
    if (!duel || duel.ended) return;
    send(duel.foeId, { t: "quit", id: duel.id });
    endDuel(duel.id, -1, "You gave up.");
  };
  $("overBack").onclick = () => { duel = null; show("home"); tab("players"); renderInvites(); renderPlayers(); track(); };

  function onMsg(m) {
    if (!m || m.to !== me.id || !m.from) return;
    if (m.t === "invite") {
      if (!GAMES[m.game] || !(m.bet >= 1)) return;
      if ((duel && !duel.ended) || invites.has(m.id)) { send(m.from, { t: "decline", id: m.id }); return; }
      const inv = { from: m.from, fromName: String(m.fromName || "Player").slice(0, 16), game: m.game, bet: Math.floor(m.bet) };
      inv.timer = setTimeout(() => dropInvite(m.id, false), 30000);
      invites.set(m.id, inv);
      renderInvites();
    } else if (m.t === "cancel") {
      dropInvite(m.id, false);
    } else if (m.t === "decline") {
      if (outgoing && outgoing.id === m.id) { const n = outgoing.toName; cancelOutgoing(true); notice(`${esc(n)} said no thanks.`); }
    } else if (m.t === "accept") {
      if (outgoing && outgoing.id === m.id && outgoing.to === m.from) {
        const o = outgoing;
        clearTimeout(o.timer);
        outgoing = null;
        startDuel({ id: o.id, game: o.game, bet: o.bet, foeId: o.to, foeName: o.toName, side: 0, seed: m.seed | 0 });
      } else send(m.from, { t: "quit", id: m.id });
    } else if (m.t === "move") {
      if (duel && duel.id === m.id && !duel.ended && m.from === duel.foeId) duel.handle?.onMove(m.move || {});
    } else if (m.t === "quit") {
      if (duel && duel.id === m.id && !duel.ended) endDuel(m.id, 1, `${esc(duel.foeName)} gave up.`);
    }
  }

  function onSync() {
    const state = lobby.presenceState();
    online = {};
    for (const [key, metas] of Object.entries(state)) {
      if (key === me.id || !metas.length) continue;
      const p = metas[metas.length - 1];
      online[key] = { name: String(p.name || "Player").slice(0, 16), coins: Math.floor(+p.coins || 0), busy: !!p.busy };
    }
    console.info("[pc] sync", Object.keys(online).length);
    renderPlayers();
    // Presence updates can briefly drop a player, so only act if they're still gone a few seconds later.
    clearTimeout(onSync.t);
    onSync.t = setTimeout(checkGone, 4000);
  }
  function checkGone() {
    for (const [id, inv] of invites) if (!online[inv.from]) dropInvite(id, false);
    if (outgoing && !online[outgoing.to]) { const n = outgoing.toName; cancelOutgoing(true); notice(`${esc(n)} went offline.`); }
    if (duel && !duel.ended && !online[duel.foeId]) endDuel(duel.id, 1, `${esc(duel.foeName)} left the duel.`);
  }

  function connect() {
    const sb = window.supabase.createClient(window.PC_CONFIG.url, window.PC_CONFIG.key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    lobby = sb.channel("pocket-coins-lobby", { config: { presence: { key: me.id }, broadcast: { self: false } } });
    lobby
      .on("presence", { event: "sync" }, onSync)
      .on("broadcast", { event: "msg" }, ({ payload }) => onMsg(payload))
      .subscribe((status, err) => {
        console.info("[pc] lobby", status, err ? String(err) : "");
        if (status === "SUBSCRIBED") { lobbyReady = true; $("pStatus").textContent = "Keep Pocket Coins open to get duel invites. Tip: ⧉ opens it in its own window."; track(); }
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") { lobbyReady = false; $("pStatus").textContent = "Can't reach the lobby right now. Retrying…"; }
      });
  }

  // ---------- name + pop-out ----------
  $("name").onchange = (e) => {
    me.name = e.target.value.trim().slice(0, 16) || me.name;
    e.target.value = me.name;
    store.set({ name: me.name });
    track();
  };
  $("popout").onclick = () => {
    api.windows.create({ url: api.runtime.getURL("popup.html?win=1"), type: "popup", width: 380, height: 660 });
    window.close();
  };

  // ---------- boot ----------
  Promise.resolve(store.get(["coins", "name", "pid", "activeDuel"])).then((d) => {
    d = d || {};
    coins = typeof d.coins === "number" ? d.coins : 100;
    me.id = d.pid || rid();
    me.name = d.name || "Player" + Math.floor(100 + Math.random() * 900);
    store.set({ pid: me.id, name: me.name });
    $("name").value = me.name;
    if (d.activeDuel && d.activeDuel.bet) {
      coins = Math.max(0, coins - d.activeDuel.bet);
      store.remove("activeDuel");
      notice(`You left a duel early and lost ${d.activeDuel.bet} coins.`);
    }
    updMult();
    setCoins(coins);
    renderPlayers();
    connect();
  });
  window.addEventListener("pagehide", () => { try { lobby && lobby.untrack(); } catch {} });
})();
