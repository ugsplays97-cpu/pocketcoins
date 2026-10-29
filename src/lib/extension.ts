export type BrowserKind = "chrome" | "edge" | "brave" | "opera" | "firefox" | "other";

export const EXTENSION = {
  name: "Pocket Coins",
  version: "1.5.0",
  // Served from public/ so it downloads on any host (Lovable, Netlify, custom domains).
  fileUrl: "/pocket-coins.zip",
  fileName: "pocket-coins.zip",
  /**
   * Store listings. When a link is set, "Add to browser" sends visitors straight
   * to the one-click store install instead of the manual setup guide.
   */
  storeLinks: {
    chrome: "",
    firefox: "",
  } as Record<"chrome" | "firefox", string>,
};

export const BROWSER_LABEL: Record<BrowserKind, string> = {
  chrome: "Chrome",
  edge: "Edge",
  brave: "Brave",
  opera: "Opera",
  firefox: "Firefox",
  other: "Browser",
};

export const EXTENSIONS_PAGE: Record<BrowserKind, string> = {
  chrome: "chrome://extensions",
  edge: "edge://extensions",
  brave: "brave://extensions",
  opera: "opera://extensions",
  firefox: "about:debugging#/runtime/this-firefox",
  other: "chrome://extensions",
};

export async function detectBrowser(): Promise<BrowserKind> {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  const nav = navigator as Navigator & { brave?: { isBrave?: () => Promise<boolean> } };
  if (/Firefox\//.test(ua)) return "firefox";
  if (/Edg\//.test(ua)) return "edge";
  if (/OPR\//.test(ua)) return "opera";
  if (nav.brave?.isBrave) {
    try {
      if (await nav.brave.isBrave()) return "brave";
    } catch {
      /* ignore */
    }
  }
  if (/Chrome\//.test(ua)) return "chrome";
  return "other";
}

export function storeLinkFor(browser: BrowserKind): string {
  return browser === "firefox" ? EXTENSION.storeLinks.firefox : EXTENSION.storeLinks.chrome;
}
