import { useEffect, useRef, useState } from "react";

export type GameLink = "checking" | "linked" | "local";

/**
 * The real Pocket Coins game (same code as the extension), served from /game.
 * When the extension is installed, it shares coins, name and owner perks with it.
 */
export function WebGame({ onLink }: { onLink?: (link: GameLink) => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(600);
  const ping = () =>
    frame.current?.contentWindow?.postMessage({ source: "pc-host", op: "ping" }, window.location.origin);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.source !== frame.current?.contentWindow) return;
      const m = e.data as { source?: string; op?: string; height?: number; mode?: string };
      if (m?.source !== "pc-game") return;
      if (m.op === "size" && typeof m.height === "number") setHeight(Math.max(420, Math.ceil(m.height)));
      if (m.op === "mode") onLink?.(m.mode === "linked" ? "linked" : "local");
    };
    window.addEventListener("message", onMessage);
    ping();
    return () => window.removeEventListener("message", onMessage);
  }, [onLink]);

  return (
    <div className="w-full max-w-[400px] overflow-hidden rounded-3xl border border-border bg-ink shadow-card">
      <iframe
        ref={frame}
        src="/game/popup.html"
        title="Pocket Coins game"
        className="block w-full border-0"
        style={{ height }}
        allow="clipboard-write"
        onLoad={ping}
      />
    </div>
  );
}
