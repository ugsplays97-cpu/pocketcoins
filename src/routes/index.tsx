import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Check, Laptop, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstallDialog } from "@/components/InstallDialog";
import { WebGame, type GameLink } from "@/components/WebGame";
import { BROWSER_LABEL, EXTENSION, detectBrowser, storeLinkFor, type BrowserKind } from "@/lib/extension";
import icon from "@/assets/pocket-coins-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pocket Coins — Play the coin game online, free" },
      {
        name: "description",
        content:
          "Play Pocket Coins right in your browser: flip pretend coins and duel real players in Walls, Connect 4, Reaction and Rock Paper Scissors. Add the extension to play from any tab.",
      },
      { property: "og:title", content: "Pocket Coins — flip coins and duel players online" },
      {
        property: "og:description",
        content: "Play free on the web or add it to your browser. Your coins sync.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FEATURES = [
  { emoji: "🧱", title: "Walls", text: "Race your pawn across the board. Drop walls to slow them down." },
  { emoji: "🔴", title: "Connect 4", text: "Line up four before they do." },
  { emoji: "⚡", title: "Reaction", text: "Wait for green. Fastest click takes the pot." },
  { emoji: "✊", title: "Rock Paper Scissors", text: "First to two rounds wins." },
];

function SyncStatus({ link }: { link: GameLink }) {
  if (link === "linked")
    return (
      <p className="flex items-center gap-2 text-sm font-semibold text-win">
        <RefreshCw className="size-4" />
        Synced with your extension — same coins, same name.
      </p>
    );
  if (link === "local")
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Laptop className="size-4" />
        Playing on the web. Add the extension and your coins come with you.
      </p>
    );
  return <p className="h-5" />;
}

function Index() {
  const [browser, setBrowser] = useState<BrowserKind>("chrome");
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<GameLink>("checking");
  const onLink = useCallback((l: GameLink) => setLink(l), []);

  useEffect(() => {
    detectBrowser().then(setBrowser);
  }, []);

  const addToBrowser = () => {
    const store = storeLinkFor(browser);
    if (store) window.open(store, "_blank", "noopener");
    else setOpen(true);
  };

  const added = link === "linked";
  const AddButton = ({ size = "xl" as const }: { size?: "xl" | "default" }) => (
    <Button variant="coin" size={size} onClick={addToBrowser} disabled={added}>
      {added ? <Check strokeWidth={3} /> : <Plus strokeWidth={3} />}
      {added ? `Added to ${BROWSER_LABEL[browser]}` : `Add to ${BROWSER_LABEL[browser]}`}
    </Button>
  );

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-dots" />
      <div className="pointer-events-none absolute inset-0 bg-glow" />

      <div className="relative mx-auto flex max-w-6xl flex-col px-6">
        <nav className="flex items-center justify-between gap-4 py-6">
          <span className="flex items-center gap-2 font-display text-lg font-extrabold">
            <img src={icon.url} alt="" className="size-7" />
            Pocket Coins
          </span>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-border px-3 py-1 font-mono text-xs text-muted-foreground sm:inline">
              v{EXTENSION.version}
            </span>
            <AddButton size="default" />
          </div>
        </nav>

        <section className="grid items-start gap-12 py-10 lg:grid-cols-[1fr_400px] lg:py-16">
          <div className="lg:pt-10">
            <div className="mb-8 [perspective:600px]">
              <img
                src={icon.url}
                alt="Pocket Coins coin"
                className="size-20 animate-coin-spin drop-shadow-[0_12px_30px_var(--gold)]"
              />
            </div>
            <h1 className="font-display text-5xl leading-[0.95] font-extrabold tracking-tight sm:text-7xl">
              la peaceeeeeeee,
              <br />
              <span className="text-gold">Why is Anjou lowkey tuff?</span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground">
              Play right here — flip coins, see who's online and send them a duel. Add it to your
              browser to play from any tab. Same coins either way.
            </p>

            <div className="mt-8 flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-5">
                <AddButton />
                <p className="text-sm text-muted-foreground">
                  Free · No account
                  <br />
                  Chrome, Edge, Brave & Firefox
                </p>
              </div>
              <SyncStatus link={link} />
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <WebGame onLink={onLink} />
          </div>
        </section>

        <h2 className="mb-6 font-display text-3xl font-extrabold tracking-tight">
          Duel anyone who's online
        </h2>
        <p className="-mt-3 mb-6 text-muted-foreground">
          Website and extension players share one lobby, so you can duel either.
        </p>
        <section className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur transition-colors hover:border-gold"
            >
              <div className="text-3xl">{f.emoji}</div>
              <h3 className="mt-4 font-display text-xl font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>

        <section className="mb-20 flex flex-col items-center gap-6 rounded-3xl border border-border bg-card px-6 py-14 text-center">
          <h2 className="font-display text-4xl font-extrabold tracking-tight">
            Want it in every tab?
          </h2>
          <p className="max-w-md text-muted-foreground">
            Add Pocket Coins to your browser. Your coins and name sync with this page.
          </p>
          <AddButton />
        </section>

        <footer className="pb-10 text-center text-xs text-muted-foreground">
          Pocket Coins uses pretend coins only. No real money, ever.
        </footer>
      </div>

      <InstallDialog open={open} onOpenChange={setOpen} browser={browser} />
    </main>
  );
}
