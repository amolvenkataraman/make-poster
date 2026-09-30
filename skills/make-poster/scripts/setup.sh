#!/usr/bin/env bash
# One-time setup for /make-poster: installs Playwright (with its Chromium), a QR code
# generator and pdf-lib into ~/.cache/make-poster, so nothing touches the project.
set -euo pipefail

DIR="${MAKE_POSTER_HOME:-$HOME/.cache/make-poster}"
mkdir -p "$DIR"
cd "$DIR"

if [ ! -f package.json ]; then
  printf '{ "name": "make-poster-runtime", "private": true, "type": "module" }\n' > package.json
fi

if [ ! -d node_modules/playwright ] || [ ! -d node_modules/qrcode ] || [ ! -d node_modules/pdf-lib ]; then
  npm install --no-audit --no-fund --silent playwright qrcode pdf-lib
fi

# Browsers go into the same cache so they're easy to find and remove
export PLAYWRIGHT_BROWSERS_PATH="$DIR/browsers"
npx --yes playwright install chromium

echo "make-poster runtime ready in $DIR"
