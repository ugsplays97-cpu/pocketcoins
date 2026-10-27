// Duel games. Each game runs the same deterministic state on both sides and
// only exchanges moves. ctx: { el, side (0 = inviter, 1 = invitee), seed, foe,
// send(move), end(result: 1 win | 0 tie | -1 loss), status(html) }.
(() => {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const rng = (a) => () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // ---------- Walls (race across a 9x9 board, block with walls) ----------
  function walls(ctx) {
    const N = 9, S = 30, G = 6, STEP = S + G;
    const me = ctx.side, foe = 1 - me;
    const pos = [[8, 4], [0, 4]], left = [10, 10];
    const H = new Set(), V = new Set();
    let turn = 0, over = false, winner = -1, mode = "move";
    const k = (r, c) => r + "," + c;
    const inB = (r, c) => r >= 0 && r < N && c >= 0 && c < N;
    const goal = (p) => (p === 0 ? 0 : N - 1);
    const D = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    // Display transforms: you always start at the bottom.
    const dCell = (r, c) => (me === 0 ? [r, c] : [8 - r, 8 - c]);
    const dWall = (r, c) => (me === 0 ? [r, c] : [7 - r, 7 - c]);

    function blocked(r, c, r2, c2) {
      if (r2 === r - 1) return H.has(k(r - 1, c)) || H.has(k(r - 1, c - 1));
      if (r2 === r + 1) return H.has(k(r, c)) || H.has(k(r, c - 1));
      if (c2 === c - 1) return V.has(k(r, c - 1)) || V.has(k(r - 1, c - 1));
      if (c2 === c + 1) return V.has(k(r, c)) || V.has(k(r - 1, c));
      return true;
    }
    function hasPath(p) {
      const [sr, sc] = pos[p];
      const seen = new Set([k(sr, sc)]), q = [[sr, sc]];
      while (q.length) {
        const [r, c] = q.shift();
        if (r === goal(p)) return true;
        for (const [dr, dc] of D) {
          const r2 = r + dr, c2 = c + dc;
          if (!inB(r2, c2) || blocked(r, c, r2, c2) || seen.has(k(r2, c2))) continue;
          seen.add(k(r2, c2)); q.push([r2, c2]);
        }
      }
      return false;
    }
    function canWall(o, r, c) {
      if (r < 0 || r > 7 || c < 0 || c > 7) return false;
      const key = k(r, c);
      if (H.has(key) || V.has(key)) return false;
      if (o === "h" && (H.has(k(r, c - 1)) || H.has(k(r, c + 1)))) return false;
      if (o === "v" && (V.has(k(r - 1, c)) || V.has(k(r + 1, c)))) return false;
      const set = o === "h" ? H : V;
      set.add(key);
      const ok = hasPath(0) && hasPath(1);
      set.delete(key);
      return ok;
    }
    function moves(p) {
      const [r, c] = pos[p], [or, oc] = pos[1 - p], out = [];
      for (const [dr, dc] of D) {
        const r2 = r + dr, c2 = c + dc;
        if (!inB(r2, c2) || blocked(r, c, r2, c2)) continue;
        if (r2 === or && c2 === oc) {
          const r3 = r2 + dr, c3 = c2 + dc;
          if (inB(r3, c3) && !blocked(r2, c2, r3, c3)) out.push([r3, c3]);
          else for (const [pr, pc] of dr ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]]) {
            const r4 = r2 + pr, c4 = c2 + pc;
            if (inB(r4, c4) && !blocked(r2, c2, r4, c4)) out.push([r4, c4]);
          }
        } else out.push([r2, c2]);
      }
      return out;
    }
    function apply(p, m) {
      if (m.k === "m") {
        if (!moves(p).some(([r, c]) => r === m.r && c === m.c)) return false;
        pos[p] = [m.r, m.c];
      } else {
        if (left[p] <= 0 || (m.o !== "h" && m.o !== "v") || !canWall(m.o, m.r, m.c)) return false;
        (m.o === "h" ? H : V).add(k(m.r, m.c));
        left[p]--;
      }
      if (pos[p][0] === goal(p)) { over = true; winner = p; }
      turn = 1 - turn;
      return true;
    }

    ctx.el.innerHTML = `<div class="walls">
      <div class="walls-bar">
        <span class="wl"><span class="pawn-key me"></span>You · <b data-l="me">10</b> walls</span>
        <span class="wl"><b data-l="foe">10</b> walls · ${esc(ctx.foe)}<span class="pawn-key foe"></span></span>
      </div>
      <div class="wboard" style="width:${N * STEP - G}px;height:${N * STEP - G}px"></div>
      <div class="wmodes"><button data-m="move" class="on">Move</button><button data-m="h">Wall ━</button><button data-m="v">Wall ┃</button></div>
    </div>`;
    const board = ctx.el.querySelector(".wboard");
    const wallStyle = (o, pr, pc) => o === "h"
      ? `left:${pc * STEP}px;top:${pr * STEP + S}px;width:${2 * S + G}px;height:${G}px`
      : `left:${pc * STEP + S}px;top:${pr * STEP}px;width:${G}px;height:${2 * S + G}px`;

    function draw() {
      const legal = !over && turn === me && mode === "move" ? moves(me).map(([r, c]) => k(r, c)) : [];
      let html = "";
      for (let dr = 0; dr < N; dr++) for (let dc = 0; dc < N; dc++) {
        const [r, c] = dCell(dr, dc);
        const cls = ["wcell", r === goal(me) ? "goal" : "", legal.includes(k(r, c)) ? "legal" : ""].join(" ");
        html += `<div class="${cls}" data-dr="${dr}" data-dc="${dc}" style="left:${dc * STEP}px;top:${dr * STEP}px"></div>`;
      }
      for (const [set, o] of [[H, "h"], [V, "v"]]) for (const key of set) {
        const [r, c] = key.split(",").map(Number), [pr, pc] = dWall(r, c);
        html += `<div class="wall" style="${wallStyle(o, pr, pc)}"></div>`;
      }
      for (const p of [me, foe]) {
        const [dr, dc] = dCell(...pos[p]);
        html += `<div class="pawn ${p === me ? "me" : "foe"}" style="left:${dc * STEP + 4}px;top:${dr * STEP + 4}px"></div>`;
      }
      html += `<div class="wall prev" hidden></div>`;
      board.innerHTML = html;
      board.classList.toggle("wallmode", mode !== "move");
      ctx.el.querySelector('[data-l="me"]').textContent = left[me];
      ctx.el.querySelector('[data-l="foe"]').textContent = left[foe];
      ctx.el.querySelectorAll(".wmodes button").forEach((b) => {
        b.classList.toggle("on", b.dataset.m === mode);
        b.disabled = b.dataset.m !== "move" && left[me] <= 0;
      });
      if (over) ctx.status(winner === me ? "You made it across!" : `${esc(ctx.foe)} made it across.`);
      else ctx.status(turn === me ? (mode === "move" ? "Your turn — step or drop a wall" : "Your turn — tap to place the wall") : `${esc(ctx.foe)} is thinking…`);
    }
    const after = () => { draw(); if (over) ctx.end(winner === me ? 1 : -1); };
    const wallPoint = (el) => [Math.min(+el.dataset.dr, 7), Math.min(+el.dataset.dc, 7)];

    ctx.el.querySelector(".wmodes").onclick = (e) => {
      const b = e.target.closest("button");
      if (!b || b.disabled) return;
      mode = b.dataset.m; draw();
    };
    board.onclick = (e) => {
      const cell = e.target.closest(".wcell");
      if (!cell || over || turn !== me) return;
      let m;
      if (mode === "move") {
        const [r, c] = dCell(+cell.dataset.dr, +cell.dataset.dc);
        m = { k: "m", r, c };
      } else {
        const [r, c] = dWall(...wallPoint(cell));
        m = { k: "w", o: mode, r, c };
      }
      if (!apply(me, m)) return;
      ctx.send(m);
      if (m.k === "w" && left[me] <= 0) mode = "move";
      after();
    };
    board.onmousemove = (e) => {
      const prev = board.querySelector(".prev");
      const cell = e.target.closest(".wcell");
      if (!prev) return;
      if (!cell || mode === "move" || over || turn !== me) { prev.hidden = true; return; }
      const [pr, pc] = wallPoint(cell);
      const [r, c] = dWall(pr, pc);
      prev.setAttribute("style", wallStyle(mode, pr, pc));
      prev.classList.toggle("bad", !canWall(mode, r, c));
      prev.hidden = false;
    };
    board.onmouseleave = () => { const p = board.querySelector(".prev"); if (p) p.hidden = true; };
    draw();
    return { onMove(m) { if (over || turn !== foe) return; if (apply(foe, m)) after(); } };
  }

  // ---------- Connect 4 ----------
  function connect4(ctx) {
    const R = 6, C = 7, me = ctx.side;
    const b = Array.from({ length: R }, () => Array(C).fill(-1));
    let turn = 0, over = false, last = null, line = [];
    const colors = ["var(--gold)", "var(--red)"];

    function four(r, c) {
      const p = b[r][c];
      for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
        const cells = [[r, c]];
        for (const s of [1, -1]) {
          let rr = r + dr * s, cc = c + dc * s;
          while (rr >= 0 && rr < R && cc >= 0 && cc < C && b[rr][cc] === p) { cells.push([rr, cc]); rr += dr * s; cc += dc * s; }
        }
        if (cells.length >= 4) return cells;
      }
      return null;
    }
    function drop(col, who) {
      if (!(col >= 0 && col < C)) return false;
      for (let r = R - 1; r >= 0; r--) if (b[r][col] === -1) {
        b[r][col] = who; last = [r, col]; turn = 1 - turn;
        const w = four(r, col);
        if (w) { over = true; line = w; draw(); ctx.end(who === me ? 1 : -1); return true; }
        if (b[0].every((x) => x !== -1)) { over = true; draw(); ctx.end(0); return true; }
        draw(); return true;
      }
      return false;
    }
    function draw() {
      const mine = !over && turn === me;
      let html = `<div class="c4 ${mine ? "my-turn" : ""}">`;
      for (let c = 0; c < C; c++) {
        html += `<div class="c4-col" data-c="${c}">`;
        for (let r = 0; r < R; r++) {
          const v = b[r][c];
          const isLast = last && last[0] === r && last[1] === c;
          const isWin = line.some(([lr, lc]) => lr === r && lc === c);
          html += `<div class="c4-cell ${v >= 0 ? "p" + v : ""} ${isLast && !over ? "last" : ""} ${isWin ? "win" : ""}"></div>`;
        }
        html += `</div>`;
      }
      ctx.el.innerHTML = html + `</div>`;
      if (!over) ctx.status(mine
        ? `<span class="turn-dot" style="background:${colors[me]}"></span>Your turn`
        : `<span class="turn-dot" style="background:${colors[1 - me]}"></span>${esc(ctx.foe)}'s turn`);
      else if (!line.length) ctx.status("Board full — it's a tie.");
      else ctx.status(b[line[0][0]][line[0][1]] === me ? "Four in a row!" : `${esc(ctx.foe)} got four in a row.`);
    }
    ctx.el.onclick = (e) => {
      const col = e.target.closest(".c4-col");
      if (!col || over || turn !== me) return;
      const c = +col.dataset.c;
      if (b[0][c] !== -1) return;
      ctx.send({ col: c });
      drop(c, me);
    };
    draw();
    return { onMove(m) { if (!over && turn !== me) drop(m.col, 1 - me); } };
  }

  // ---------- Reaction ----------
  function reaction(ctx) {
    const delay = 1500 + rng(ctx.seed)() * 3000;
    let t0 = 0, mine = null, theirs = null;
    ctx.el.innerHTML = `<div class="pad wait">Wait for green…</div>`;
    const pad = ctx.el.firstChild;
    ctx.status("Click the moment it turns green. Too early = miss.");
    const tm = setTimeout(() => { t0 = performance.now(); pad.className = "pad go"; pad.textContent = "CLICK!"; }, delay);
    const fmt = (v) => (v >= 99999 ? "too early" : v + " ms");
    function check() {
      if (mine === null) return;
      if (theirs === null) return ctx.status(`Waiting for ${esc(ctx.foe)}…`);
      ctx.status(`You ${fmt(mine)} · ${esc(ctx.foe)} ${fmt(theirs)}`);
      ctx.end(mine === theirs ? 0 : mine < theirs ? 1 : -1);
    }
    pad.onmousedown = () => {
      if (mine !== null) return;
      clearTimeout(tm);
      mine = t0 ? Math.round(performance.now() - t0) : 99999;
      pad.className = "pad done";
      pad.textContent = t0 ? mine + " ms" : "Too early!";
      ctx.send({ ms: mine });
      check();
    };
    return { onMove(m) { if (theirs === null) { theirs = Math.max(0, +m.ms || 99999); check(); } } };
  }

  // ---------- Rock Paper Scissors (first to 2) ----------
  function rps(ctx) {
    const P = { r: "✊", p: "✋", s: "✌️" }, beats = { r: "s", p: "r", s: "p" };
    let round = 1, my = 0, their = 0, over = false, revealing = false;
    const picks = {};
    ctx.el.innerHTML = `<div class="rps">
      <div class="rps-score"><span>You <b data-s="me">0</b></span><span data-s="round">Round 1</span><span><b data-s="them">0</b> ${esc(ctx.foe)}</span></div>
      <div class="rps-arena"><div class="rps-hand" data-h="me">❔</div><span class="vs">vs</span><div class="rps-hand" data-h="them">❔</div></div>
      <div class="rps-picks">${Object.entries(P).map(([k, e]) => `<button data-k="${k}">${e}</button>`).join("")}</div>
    </div>`;
    const q = (s) => ctx.el.querySelector(s);
    const btns = () => ctx.el.querySelectorAll(".rps-picks button");
    function resetRound() {
      revealing = false;
      q('[data-s="round"]').textContent = "Round " + round;
      q('[data-h="me"]').textContent = "❔";
      q('[data-h="them"]').textContent = picks[round]?.them ? "✅" : "❔";
      btns().forEach((b) => { b.disabled = false; b.classList.remove("picked"); });
      ctx.status("Pick your hand.");
    }
    function resolve() {
      const p = picks[round];
      if (!p || !p.me) return;
      if (!p.them) return ctx.status(`Waiting for ${esc(ctx.foe)}…`);
      revealing = true;
      q('[data-h="them"]').textContent = P[p.them];
      if (p.me === p.them) ctx.status("Same hand — replay the round.");
      else if (beats[p.me] === p.them) { my++; ctx.status("You take the round!"); }
      else { their++; ctx.status(`${esc(ctx.foe)} takes the round.`); }
      q('[data-s="me"]').textContent = my;
      q('[data-s="them"]').textContent = their;
      if (my === 2 || their === 2) { over = true; ctx.end(my === 2 ? 1 : -1); return; }
      setTimeout(() => { round++; resetRound(); }, 1300);
    }
    ctx.el.querySelector(".rps-picks").onclick = (e) => {
      const b = e.target.closest("button");
      if (!b || b.disabled || over || revealing) return;
      picks[round] = picks[round] || {};
      if (picks[round].me) return;
      picks[round].me = b.dataset.k;
      q('[data-h="me"]').textContent = P[b.dataset.k];
      btns().forEach((x) => { x.disabled = true; x.classList.toggle("picked", x === b); });
      ctx.send({ round, k: b.dataset.k });
      resolve();
    };
    resetRound();
    return {
      onMove(m) {
        if (over || !P[m.k]) return;
        picks[m.round] = picks[m.round] || {};
        if (picks[m.round].them) return;
        picks[m.round].them = m.k;
        if (m.round === round && !revealing) {
          if (!picks[round].me) q('[data-h="them"]').textContent = "✅";
          resolve();
        }
      },
    };
  }

  window.GAMES = {
    walls: { name: "Walls", emoji: "🧱", desc: "Race across, block with walls", start: walls },
    connect4: { name: "Connect 4", emoji: "🔴", desc: "Line up four first", start: connect4 },
    reaction: { name: "Reaction", emoji: "⚡", desc: "Fastest click on green", start: reaction },
    rps: { name: "Rock Paper Scissors", emoji: "✊", desc: "First to two rounds", start: rps },
  };
  window.PC_ESC = esc;
})();
