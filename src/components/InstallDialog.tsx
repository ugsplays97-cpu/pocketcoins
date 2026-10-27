import { useState } from "react";
import { Check, Copy, Puzzle, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  BROWSER_LABEL,
  EXTENSION,
  EXTENSIONS_PAGE,
  type BrowserKind,
} from "@/lib/extension";

function CopyAddress({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard?.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      className="mt-2 inline-flex items-center gap-2 rounded-lg border border-border bg-ink px-3 py-1.5 font-mono text-xs text-gold transition-colors hover:border-gold"
    >
      {value}
      {copied ? <Check className="size-3.5 text-win" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function Step({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-gold font-mono text-sm font-bold text-primary-foreground">
        {n}
      </span>
      <div className="pt-1">
        <p className="font-semibold text-foreground">{title}</p>
        {children && <div className="mt-1 text-sm text-muted-foreground">{children}</div>}
      </div>
    </li>
  );
}

export function InstallDialog({
  open,
  onOpenChange,
  browser,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  browser: BrowserKind;
}) {
  const [gotIt, setGotIt] = useState(false);
  const label = BROWSER_LABEL[browser];
  const isFirefox = browser === "firefox";
  const page = EXTENSIONS_PAGE[browser];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto border-border bg-card p-8 sm:rounded-3xl">
        <DialogHeader>
          <DialogTitle className="font-display text-3xl font-extrabold tracking-tight">
            Add Pocket Coins to {label}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Takes about a minute. You only do this once.
          </DialogDescription>
        </DialogHeader>

        <ol className="mt-2 space-y-6">
          <Step n={1} title="Grab Pocket Coins">
            <Button
              asChild
              variant="coin"
              className="mt-3 h-11 rounded-xl px-5"
              onClick={() => setGotIt(true)}
            >
              <a href={EXTENSION.fileUrl} download={EXTENSION.fileName}>
                {gotIt ? <Check /> : <Sparkles />}
                {gotIt ? "Got it" : "Get Pocket Coins"}
              </a>
            </Button>
            {!isFirefox && <p className="mt-3">Open the file once so you get a Pocket Coins folder.</p>}
          </Step>

          {isFirefox ? (
            <>
              <Step n={2} title="Open this address in a new tab">
                <CopyAddress value={page} />
              </Step>
              <Step n={3} title="Click “Load Temporary Add-on…”">
                Pick the Pocket Coins file you just got. That's it.
              </Step>
            </>
          ) : (
            <>
              <Step n={2} title="Open this address and switch on “Developer mode”">
                <CopyAddress value={page} />
              </Step>
              <Step n={3} title="Click “Load unpacked” and pick the Pocket Coins folder">
                <span className="inline-flex items-center gap-1">
                  Done — find it under the <Puzzle className="size-4" /> icon in your toolbar.
                </span>
              </Step>
            </>
          )}
        </ol>

        {!isFirefox && (
          <div className="mt-2">
            <p className="mb-2 text-sm font-semibold text-foreground">Stuck? Watch how it's done</p>
            <div className="aspect-video overflow-hidden rounded-2xl border border-border bg-ink">
              <iframe
                className="size-full"
                src="https://www.youtube-nocookie.com/embed/xiT8c8M1OIw"
                title="How to load an unpacked extension"
                loading="lazy"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
