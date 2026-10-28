// Runs on the Pocket Coins website so the web game shares this extension's coins,
// name and owner perks. Only answers messages the page sends to itself.
(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const local = api.storage.local;
  const KEYS = ["coins", "name", "pid", "owner", "activeDuel", "luck", "bonusAt"];
  const only = (data) => Object.fromEntries(Object.entries(data || {}).filter(([k]) => KEYS.includes(k)));
  const reply = (rid, result) => window.postMessage({ source: "pc-ext", rid, result }, location.origin);

  window.addEventListener("message", async (e) => {
    const m = e.data;
    if (e.source !== window || e.origin !== location.origin || !m || m.source !== "pc-web") return;
    if (m.op === "hello") return reply(m.rid, true);
    if (m.op === "get") return reply(m.rid, only(await local.get([].concat(m.keys).filter((k) => KEYS.includes(k)))));
    if (m.op === "set") { await local.set(only(m.data)); return reply(m.rid, true); }
    if (m.op === "remove") { await local.remove([].concat(m.keys).filter((k) => KEYS.includes(k))); return reply(m.rid, true); }
  });

  api.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const picked = only(changes);
    if (Object.keys(picked).length) window.postMessage({ source: "pc-ext", op: "changed", changes: picked }, location.origin);
  });
})();
