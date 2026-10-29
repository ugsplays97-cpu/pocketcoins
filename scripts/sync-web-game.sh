#!/usr/bin/env bash
# Copies the extension's game into public/game so the website can run the same game.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
rm -rf "$ROOT/public/game"
mkdir -p "$ROOT/public/game"
cp "$ROOT/extension/game.html" "$ROOT/public/game/popup.html"
for f in popup.css icon.png supabase.js config.js store.js rules.js games.js app.js; do
  cp "$ROOT/extension/$f" "$ROOT/public/game/$f"
done
echo "public/game updated"
