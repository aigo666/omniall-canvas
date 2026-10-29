#!/usr/bin/env bash
# 正式环境打包：apiBaseUrl 指向线上画布服务，同时出 macOS DMG + Windows NSIS。
# 用法:
#   ./scripts/build-desktop-release.sh
#   DESKTOP_API_BASE_URL=https://agent.omniall.ai ./scripts/build-desktop-release.sh
# 跳过前端重建:
#   DESKTOP_SKIP_WEB_BUILD=1 ./scripts/build-desktop-release.sh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DESKTOP_DIR="$ROOT_DIR/desktop"
export DESKTOP_API_BASE_URL="${DESKTOP_API_BASE_URL:-https://agent.omniall.ai}"
# 国内网络拉 Electron / builder 二进制更容易超时，默认走 npmmirror。
export ELECTRON_MIRROR="${ELECTRON_MIRROR:-https://npmmirror.com/mirrors/electron/}"
export ELECTRON_BUILDER_BINARIES_MIRROR="${ELECTRON_BUILDER_BINARIES_MIRROR:-https://npmmirror.com/mirrors/electron-builder-binaries/}"

chmod +x "$ROOT_DIR/scripts/prepare-desktop-web.sh"
"$ROOT_DIR/scripts/prepare-desktop-web.sh"

cd "$DESKTOP_DIR"
if [[ ! -d node_modules/electron ]]; then
  bun install
fi

echo "==> Packaging Mac DMG + Win NSIS (apiBaseUrl=$DESKTOP_API_BASE_URL)"
# 需要 Node >= 20（Next 要求）；本机若仍是 18，可先 PATH 加 node@20。
bunx electron-builder --mac dmg --x64 --win nsis --x64

echo "==> Done. Artifacts:"
ls -lh "$DESKTOP_DIR/dist"/*.{dmg,exe} 2>/dev/null || ls -lh "$DESKTOP_DIR/dist"
