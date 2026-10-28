#!/usr/bin/env bash
# Copies the extension's game into public/game so the website can run the same game.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
rm -rf "$ROOT/public/game"
mkdir -p "$ROOT/public/game"
for f in popup.html popup.css icon.png supabase.js config.js store.js games.js app.js; do
  cp "$ROOT/extension/$f" "$ROOT/public/game/$f"
done
echo "public/game updated"
