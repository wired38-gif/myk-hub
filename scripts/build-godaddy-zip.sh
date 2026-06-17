#!/usr/bin/env bash
# Build a GoDaddy manual-upload zip from repo root (no node_modules, no .env).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHA="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
OUT_DIR="${1:-$ROOT/dist}"
mkdir -p "$OUT_DIR"
ZIP="$OUT_DIR/myk-hub-deploy-${SHA}.zip"
rm -f "$ZIP"
cd "$ROOT"
zip -r "$ZIP" \
  package.json package-lock.json server.js index.html vite.config.js .godaddy .node-version .deploy-trigger \
  scripts/ config/ sites/ \
  -x "*.DS_Store" -x "sites/*/node_modules/*" -x "*/node_modules/*" -x "*.env" -x ".env*"
echo "Created $ZIP ($(du -h "$ZIP" | cut -f1))"
echo "Latest: $ROOT/dist/myk-hub-deploy.zip"
cp -f "$ZIP" "$ROOT/dist/myk-hub-deploy.zip"
cp -f "$ZIP" "/tmp/myk-hub-deploy-${SHA}.zip" 2>/dev/null || true
