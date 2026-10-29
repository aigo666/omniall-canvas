#!/usr/bin/env bash
# 准备本地前端资源并打出 macOS DMG。
# 用法:
#   DESKTOP_API_BASE_URL=http://127.0.0.1:18080 ./scripts/build-desktop-dmg.sh
# 跳过前端重建（已有 .next/standalone）:
#   DESKTOP_SKIP_WEB_BUILD=1 ./scripts/build-desktop-dmg.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESKTOP_DIR="$ROOT_DIR/desktop"
export DESKTOP_API_BASE_URL="${DESKTOP_API_BASE_URL:-http://127.0.0.1:18080}"

chmod +x "$ROOT_DIR/scripts/prepare-desktop-web.sh"
"$ROOT_DIR/scripts/prepare-desktop-web.sh"

cd "$DESKTOP_DIR"
if [[ ! -d node_modules/electron ]]; then
  bun install
fi

echo "==> Packaging DMG (apiBaseUrl=$DESKTOP_API_BASE_URL)"
bunx electron-builder --mac dmg --x64

echo "==> Done. Artifacts:"
ls -lh "$DESKTOP_DIR/dist"/*.dmg 2>/dev/null || ls -lh "$DESKTOP_DIR/dist"
