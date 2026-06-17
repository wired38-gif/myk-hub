#!/usr/bin/env bash
# Build a GoDaddy Publish-style zip from repo root.
# Matches the WORKING Publish pipeline: archive with node_modules (~58-59 MB)
# so GoDaddy skips npm install/build and starts node server.js directly.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHA="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
OUT_DIR="${1:-$ROOT/dist}"
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/myk-hub-stage.XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$OUT_DIR"
ZIP="$OUT_DIR/myk-hub-deploy-${SHA}.zip"
rm -f "$ZIP"

echo "Staging app tree (no .git, no node_modules)..."
rsync -a \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '.env' \
  --exclude '.env.*' \
  --exclude '*.DS_Store' \
  "$ROOT/" "$STAGE/"

echo "Installing deps with npm ci (production bundle)..."
(cd "$STAGE" && npm ci --omit=dev 2>/dev/null || npm ci)

echo "Verifying site assets..."
(cd "$STAGE" && node ./scripts/ensure-sites.js)

echo "Creating zip (target ~58-59 MB like GoDaddy Publish archive)..."
(cd "$STAGE" && zip -r -q "$ZIP" \
  package.json package-lock.json server.js index.html vite.config.js \
  .godaddy .node-version .deploy-trigger \
  scripts/ config/ sites/ node_modules/ \
  -x "*.DS_Store" -x "sites/*/node_modules/*" -x "*.env" -x ".env*")

SIZE="$(du -h "$ZIP" | cut -f1)"
echo "Created $ZIP ($SIZE)"
echo "Latest: $ROOT/dist/myk-hub-deploy.zip"
cp -f "$ZIP" "$ROOT/dist/myk-hub-deploy.zip"
cp -f "$ZIP" "/tmp/myk-hub-deploy-${SHA}.zip" 2>/dev/null || true
