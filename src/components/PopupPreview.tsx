import { useState } from "react";
import { cn } from "@/lib/utils";

/** A playable replica of the extension's "Flip" tab. */
export function PopupPreview() {
  const [balance, setBalance] = useState(100);
  const [bet, setBet] = useState(10);
  const [chance, setChance] = useState(50);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ win: boolean; amount: number } | null>(null);
  const mult = 100 / chance;

  const flip = () => {
    if (balance <= 0) {
      setBalance(50);
      setResult(null);
      return;
    }
    const stake = Math.min(bet, balance);
    setSpinning(true);
    setResult(null);
    setTimeout(() => {
      const win = Math.random() * 100 < chance;
      const amount = win ? Math.floor((stake * 100) / chance) - stake : stake;
      setBalance((b) => (win ? b + amount : b - amount));
      setResult({ win, amount });
      setSpinning(false);
    }, 600);
  };

  return (
    <div className="w-[320px] overflow-hidden rounded-3xl border border-border bg-ink text-sm shadow-card">
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <span className="font-display font-extrabold">🪙 Pocket Coins</span>
        <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1">
          <span className="size-2.5 rounded-full bg-gold" />
          <b className="font-mono text-gold">{balance}</b>
        </span>
      </header>
      <nav className="mx-4 flex gap-1 rounded-xl bg-card p-1">
        <span className="flex-1 rounded-lg bg-secondary py-1.5 text-center text-xs font-bold">Flip</span>
        <span className="flex flex-1 items-center justify-center gap-1.5 py-1.5 text-xs font-bold text-muted-foreground">
          Players <span className="rounded-full bg-win px-1.5 text-[10px] text-ink">3</span>
        </span>
      </nav>
      <section className="flex flex-col gap-3 p-4">
        <div className="grid h-14 place-items-center text-4xl [perspective:400px]">
          <span className={cn(spinning && "animate-coin-spin [animation-duration:0.6s]")}>🪙</span>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-bold tracking-wider text-muted-foreground uppercase">Bet</span>
          <input
            type="number"
            min={1}
            value={bet}
            onChange={(e) => setBet(Math.max(1, Number(e.target.value) || 1))}
            className="rounded-lg border border-border bg-background px-2.5 py-2 font-mono"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="flex justify-between text-[11px] font-bold tracking-wider text-muted-foreground uppercase">
            Win chance <b className="font-mono text-foreground">{chance}%</b>
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
        <div className="flex justify-between rounded-lg bg-card px-3 py-2">
          <span>Payout</span>
          <b className="font-mono text-gold">×{mult.toFixed(2)}</b>
        </div>
        <button
          type="button"
          onClick={flip}
          disabled={spinning}
          className="rounded-xl bg-[image:var(--gradient-gold)] py-3 text-base font-extrabold text-primary-foreground shadow-[0_4px_0_var(--gold-deep)] transition active:translate-y-0.5 active:shadow-none"
        >
          {balance <= 0 ? "Claim free 50" : "Flip"}
        </button>
        <p className={cn("h-5 text-center font-bold", result?.win ? "text-win" : "text-lose")}>
          {result && (result.win ? `+${result.amount} coins` : `−${result.amount} coins`)}
        </p>
      </section>
    </div>
  );
}
