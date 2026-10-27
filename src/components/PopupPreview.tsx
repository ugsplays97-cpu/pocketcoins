import { useState } from "react";
import { cn } from "@/lib/utils";

const TABS = ["Gamble", "Mini games", "Online", "Rivals"] as const;

/** A playable replica of the extension's "Gamble" tab. */
export function PopupPreview() {
  const [balance, setBalance] = useState(100);
  const [bet, setBet] = useState(10);
  const [chance, setChance] = useState(50);
  const [result, setResult] = useState<{ win: boolean; amount: number } | null>(null);
  const mult = 100 / chance;

  const flip = () => {
    const stake = Math.min(bet, balance);
    if (stake <= 0) {
      setBalance(50);
      setResult(null);
      return;
    }
    const win = Math.random() * 100 < chance;
    const amount = win ? Math.floor(stake * mult) - stake : stake;
    setBalance((b) => (win ? b + amount : b - amount));
    setResult({ win, amount });
  };

  return (
    <div className="w-[320px] overflow-hidden rounded-2xl border border-border bg-ink text-sm shadow-card">
      <header className="flex justify-between bg-card px-3 py-3 font-bold">
        <span>🪙 Pocket Coins</span>
        <b className="font-mono text-gold">{balance}</b>
      </header>
      <nav className="flex">
        {TABS.map((t, i) => (
          <span
            key={t}
            className={cn(
              "flex-1 py-2 text-center text-xs font-semibold",
              i === 0 ? "bg-gold text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {t}
          </span>
        ))}
      </nav>
      <section className="flex flex-col gap-3 p-3">
        <label className="flex flex-col gap-1">
          Bet
          <input
            type="number"
            min={1}
            value={bet}
            onChange={(e) => setBet(Math.max(1, Number(e.target.value) || 1))}
            className="rounded-md border border-border bg-background px-2 py-1.5 font-mono"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span>
            Win chance: <b className="font-mono">{chance}%</b>
          </span>
          <input
            type="range"
            min={1}
            max={50}
            value={chance}
            onChange={(e) => setChance(Number(e.target.value))}
            className="accent-gold"
          />
        </label>
        <p className="text-muted-foreground">
          Rarer win = bigger payout: <b className="font-mono text-foreground">x{mult.toFixed(2)}</b>
        </p>
        <button
          type="button"
          onClick={flip}
          className="rounded-md bg-gold py-2.5 text-base font-bold text-primary-foreground transition hover:brightness-110 active:scale-[0.98]"
        >
          {balance <= 0 ? "Claim free 50" : "Flip!"}
        </button>
        <p className={cn("h-5 font-semibold", result?.win ? "text-win" : "text-lose")}>
          {result && (result.win ? `You won ${result.amount}!` : `Lost ${result.amount}.`)}
        </p>
      </section>
    </div>
  );
}
