#!/usr/bin/env bash
# One-time setup for /make-poster: installs the pinned rendering runtime (Playwright with
# its Chromium, a QR code generator and pdf-lib) into ~/.cache/make-poster, so nothing
# touches the project. Safe to re-run: it only reinstalls when the pinned versions change.
set -euo pipefail

MIN_NODE=20
SKILL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIR="${MAKE_POSTER_HOME:-$HOME/.cache/make-poster}"

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "make-poster needs Node.js $MIN_NODE or newer, with npm. Install a current LTS from https://nodejs.org (or: nvm install --lts)." >&2
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt "$MIN_NODE" ]; then
  echo "make-poster needs Node.js $MIN_NODE or newer; this shell has $(node --version)." >&2
  echo "Install a current LTS (for example: nvm install --lts && nvm use --lts), then run this again." >&2
  exit 1
fi

mkdir -p "$DIR"
cd "$DIR"

# The runtime's exact versions live in the skill (runtime/package.json and its lockfile)
cp "$SKILL_DIR/runtime/package.json" "$SKILL_DIR/runtime/package-lock.json" .
STAMP="$(cksum < package-lock.json)"
if [ ! -f .installed ] || [ "$(cat .installed)" != "$STAMP" ] || [ ! -d node_modules/playwright ]; then
  npm ci --no-audit --no-fund --silent
  printf '%s' "$STAMP" > .installed
fi

# Browsers go into the same cache so they're easy to find and remove
export PLAYWRIGHT_BROWSERS_PATH="$DIR/browsers"
./node_modules/.bin/playwright install chromium

echo "make-poster runtime ready in $DIR"
