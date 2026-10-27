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
- The extension source lives in `extension/` (plain JS, no build step); after changing it, re-zip it and replace the hosted file referenced by `src/lib/extension.ts`, because the site serves that file, not the folder.
- Online play uses Lovable Cloud realtime presence + broadcast on one shared lobby channel (no tables); presence updates must stay throttled (min ~3s apart) because the realtime service closes channels that exceed its presence rate limit.
