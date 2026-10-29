<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Project rules
- Extension metadata, the hosted extension file and store links live in `src/lib/extension.ts`; when a store link is set, the "Add to browser" button opens the store instead of the manual setup guide — browsers only allow one-click installs from their stores.
- The extension source lives in `extension/` (plain JS, no build step) and is the only game source; after changing it, run `scripts/sync-web-game.sh` (the website plays the copy in `public/game` in an iframe) and re-zip it to `public/pocket-coins.zip` (served from public/ so downloads work on any host, not just Lovable), because neither copy updates itself. The extension's `popup.html` is only a shell that iframes the live website game (`PC_CONFIG.game`) so game updates reach players without reinstalling; it falls back to the bundled `game.html` when the site is unreachable. Only manifest/bridge/shell changes need a reinstall.
- Game storage goes through `extension/store.js`: extension storage in the extension; on the website, the extension's `bridge.js` content script (so coins sync) or localStorage when it isn't installed. New site domains must be added to the bridge's `matches` in the manifest.
- Game rules worth testing (free-coin wait, luck odds) live in `extension/rules.js`, tested by `src/test/game-rules.test.ts`.
- Online play uses Lovable Cloud realtime presence + broadcast on one shared lobby channel (no tables); presence updates must stay throttled (min ~3s apart) because the realtime service closes channels that exceed its presence rate limit.
