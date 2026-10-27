import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InstallDialog } from "@/components/InstallDialog";
import { PopupPreview } from "@/components/PopupPreview";
import { BROWSER_LABEL, EXTENSION, detectBrowser, storeLinkFor, type BrowserKind } from "@/lib/extension";
import icon from "@/assets/pocket-coins-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pocket Coins — Add the tiny coin game to your browser" },
      {
        name: "description",
        content:
          "Pocket Coins is a free browser extension: flip pretend coins and duel real players online in Walls, Connect 4, Reaction and more.",
      },
      { property: "og:title", content: "Pocket Coins — a tiny side game for your browser" },
      {
        property: "og:description",
        content: "Flip pretend coins and duel real players online. Free.",
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

function Index() {
  const [browser, setBrowser] = useState<BrowserKind>("chrome");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    detectBrowser().then(setBrowser);
  }, []);

  const addToBrowser = () => {
    const store = storeLinkFor(browser);
    if (store) window.open(store, "_blank", "noopener");
    else setOpen(true);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-dots" />
      <div className="pointer-events-none absolute inset-0 bg-glow" />

      <div className="relative mx-auto flex max-w-6xl flex-col px-6">
        <nav className="flex items-center justify-between py-6">
          <span className="flex items-center gap-2 font-display text-lg font-extrabold">
            <img src={icon.url} alt="" className="size-7" />
            Pocket Coins
          </span>
          <span className="rounded-full border border-border px-3 py-1 font-mono text-xs text-muted-foreground">
            v{EXTENSION.version}
          </span>
        </nav>

        <section className="grid items-center gap-16 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div>
            <div className="mb-8 [perspective:600px]">
              <img
                src={icon.url}
                alt="Pocket Coins coin"
                className="size-24 animate-coin-spin drop-shadow-[0_12px_30px_var(--gold)]"
              />
            </div>
            <h1 className="font-display text-6xl leading-[0.95] font-extrabold tracking-tight sm:text-7xl">
              la peaceeeeeeee,
              <br />
              <span className="text-gold">Why is Anjou lowkey tuff?</span>
            </h1>
            <p className="mt-6 max-w-md text-lg text-muted-foreground">
              Flip pretend coins, see who's online, and send them a duel — Walls, Connect 4,
              Reaction or Rock Paper Scissors.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-5">
              <Button variant="coin" size="xl" onClick={addToBrowser}>
                <Plus strokeWidth={3} />
                Add to {BROWSER_LABEL[browser]}
              </Button>
              <p className="text-sm text-muted-foreground">
                Free · No account
                <br />
                Chrome, Edge, Brave & Firefox
              </p>
            </div>
          </div>

          <div className="relative flex justify-center">
            <img
              src={icon.url}
              alt=""
              width={56}
              height={56}
              className="absolute -top-6 right-6 hidden size-14 animate-float [--tilt:12deg] sm:block"
            />
            <div className="absolute bottom-4 -left-2 hidden animate-float text-4xl [--tilt:-18deg] [animation-delay:1.5s] sm:block">
              🎲
            </div>
            <div className="rotate-2 transition-transform duration-300 hover:rotate-0">
              <PopupPreview />
              <p className="mt-3 text-center font-mono text-xs text-muted-foreground">
                ↑ try it — it's the real thing
              </p>
            </div>
          </div>
        </section>

        <h2 className="mb-6 font-display text-3xl font-extrabold tracking-tight">
          Duel anyone who's online
        </h2>
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
            Ready to flip?
          </h2>
          <Button variant="coin" size="xl" onClick={addToBrowser}>
            <Plus strokeWidth={3} />
            Add to {BROWSER_LABEL[browser]}
          </Button>
        </section>

        <footer className="pb-10 text-center text-xs text-muted-foreground">
          Pocket Coins uses pretend coins only. No real money, ever.
        </footer>
      </div>

      <InstallDialog open={open} onOpenChange={setOpen} browser={browser} />
    </main>
  );
}
