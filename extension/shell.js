// Opens the always-up-to-date game from the Pocket Coins website, so game updates
// reach players without reinstalling. Falls back to the copy bundled in the
// extension (game.html) when the website can't be reached.
(() => {
  const api = globalThis.browser ?? globalThis.chrome;
  const params = new URLSearchParams(location.search);
  const isWin = params.has("win");
  const fallback = () => location.replace("game.html" + location.search);
  if (params.has("local")) return fallback();
  if (isWin) document.body.classList.add("win");

  const src = new URL(window.PC_CONFIG.game);
  src.searchParams.set("ext", "1");
  if (isWin) src.searchParams.set("win", "1");
  const frame = document.getElementById("game");
  let alive = false;

  window.addEventListener("message", (e) => {
    if (e.source !== frame.contentWindow || e.origin !== src.origin) return;
    const m = e.data;
    if (!m || m.source !== "pc-game") return;
    if (!alive) { alive = true; document.getElementById("wait").remove(); }
    if (m.op === "size" && typeof m.height === "number" && !isWin) frame.style.height = Math.max(420, Math.ceil(m.height)) + "px";
    if (m.op === "popout") {
      api.windows.create({ url: api.runtime.getURL("popup.html?win=1"), type: "popup", width: 380, height: 660 });
      window.close();
    }
  });

  frame.onload = () => frame.contentWindow.postMessage({ source: "pc-host", op: "ping" }, src.origin);
  frame.src = src.href;
  // Offline, or the website doesn't answer: use the bundled game.
  setTimeout(() => { if (!alive) fallback(); }, 4000);
})();
