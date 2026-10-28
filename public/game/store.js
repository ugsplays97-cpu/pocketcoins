// Storage for Pocket Coins.
// - Inside the extension: browser extension storage.
// - On the website: the extension's storage through bridge.js when the extension is
//   installed (so coins, name and owner perks stay in sync), otherwise localStorage.
(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const listeners = [];
  const emit = (changes) => listeners.forEach((fn) => { try { fn(changes); } catch {} });

  if (api && api.storage && api.storage.local && api.runtime && api.runtime.id) {
    const local = api.storage.local;
    api.storage.onChanged.addListener((changes, area) => { if (area === "local") emit(changes); });
    window.PC_STORE = {
      mode: "extension",
      ready: Promise.resolve("extension"),
      get: (keys) => Promise.resolve(local.get(keys)),
      set: (data) => Promise.resolve(local.set(data)),
      remove: (keys) => Promise.resolve(local.remove(keys)),
      onChange: (fn) => listeners.push(fn),
    };
    return;
  }

  // ---------- website ----------
  const PREFIX = "pc:";
  const ls = {
    get(keys) {
      const out = {};
      for (const k of [].concat(keys)) {
        const v = localStorage.getItem(PREFIX + k);
        if (v != null) { try { out[k] = JSON.parse(v); } catch {} }
      }
      return out;
    },
    set(data) { for (const [k, v] of Object.entries(data)) localStorage.setItem(PREFIX + k, JSON.stringify(v)); },
    remove(keys) { for (const k of [].concat(keys)) localStorage.removeItem(PREFIX + k); },
  };

  const pending = new Map();
  let seq = 0;
  function ask(op, payload) {
    return new Promise((resolve) => {
      const rid = "w" + ++seq + Math.random().toString(36).slice(2, 6);
      pending.set(rid, resolve);
      window.postMessage({ source: "pc-web", rid, op, ...payload }, location.origin);
      setTimeout(() => { if (pending.has(rid)) { pending.delete(rid); resolve(undefined); } }, 1500);
    });
  }
  window.addEventListener("message", (e) => {
    const m = e.data;
    if (e.source !== window || !m || m.source !== "pc-ext") return;
    if (m.op === "changed") { emit(m.changes || {}); return; }
    const done = pending.get(m.rid);
    if (done) { pending.delete(m.rid); done(m.result); }
  });

  const store = {
    mode: "local",
    get: async (keys) => { await store.ready; return store.mode === "linked" ? (await ask("get", { keys })) || {} : ls.get(keys); },
    set: async (data) => { await store.ready; if (store.mode === "linked") await ask("set", { data }); else ls.set(data); },
    remove: async (keys) => { await store.ready; if (store.mode === "linked") await ask("remove", { keys }); else ls.remove(keys); },
    onChange: (fn) => listeners.push(fn),
  };

  // The extension's bridge answers "hello" when it is installed in this browser.
  store.ready = new Promise((resolve) => {
    let answered = false;
    const id = "hello" + Math.random().toString(36).slice(2, 8);
    const onHello = (e) => {
      const m = e.data;
      if (e.source !== window || !m || m.source !== "pc-ext" || m.rid !== id) return;
      answered = true;
      window.removeEventListener("message", onHello);
      resolve("linked");
    };
    window.addEventListener("message", onHello);
    window.postMessage({ source: "pc-web", rid: id, op: "hello" }, location.origin);
    setTimeout(() => { if (!answered) { window.removeEventListener("message", onHello); resolve("local"); } }, 600);
  }).then((mode) => {
    store.mode = mode;
    // First time linking: bring the coins earned on the website over to the extension
    // only when the extension has none yet.
    if (mode === "linked") {
      return ask("get", { keys: ["coins"] }).then((d) => {
        const web = ls.get(["coins", "name"]);
        if (d && typeof d.coins !== "number" && typeof web.coins === "number") return ask("set", { data: web });
      }).then(() => mode);
    }
    // Other website tabs: keep in sync through localStorage events.
    window.addEventListener("storage", (e) => {
      if (!e.key || !e.key.startsWith(PREFIX)) return;
      let v; try { v = e.newValue == null ? undefined : JSON.parse(e.newValue); } catch { return; }
      emit({ [e.key.slice(PREFIX.length)]: { newValue: v } });
    });
    return mode;
  });

  window.PC_STORE = store;

  // Tell the page around the game (if any) how tall the game is and whether it's linked.
  if (window.parent !== window) {
    const post = (msg) => window.parent.postMessage({ source: "pc-game", ...msg }, location.origin);
    store.ready.then((mode) => post({ op: "mode", mode }));
    const size = () => post({ op: "size", height: Math.ceil(document.body.getBoundingClientRect().height) });
    window.addEventListener("load", () => {
      size();
      new ResizeObserver(size).observe(document.body);
    });
  }
})();
