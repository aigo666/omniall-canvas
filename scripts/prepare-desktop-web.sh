#!/usr/bin/env bash
# 构建 Next standalone，并拷贝到 desktop/resources/web 供 Electron 本地启动。
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEB_DIR="$ROOT_DIR/web"
DESKTOP_DIR="$ROOT_DIR/desktop"
TARGET="$DESKTOP_DIR/resources/web"
API_BASE_URL="${DESKTOP_API_BASE_URL:-http://127.0.0.1:18080}"
PORT="${DESKTOP_WEB_PORT:-17890}"

echo "==> API base for desktop package: $API_BASE_URL"
mkdir -p "$DESKTOP_DIR/resources"
cat > "$DESKTOP_DIR/resources/config.json" <<EOF
{
  "apiBaseUrl": "${API_BASE_URL}",
  "port": ${PORT},
  "host": "127.0.0.1",
  "agentPort": 3210
}
EOF

if [[ "${DESKTOP_SKIP_WEB_BUILD:-}" != "1" ]]; then
  echo "==> Building Next.js standalone"
  cd "$WEB_DIR"
  bun install --frozen-lockfile
  bun run build
fi

STANDALONE_SERVER="$(find "$WEB_DIR/.next/standalone" -type f -name server.js | head -n 1 || true)"
if [[ -z "$STANDALONE_SERVER" ]]; then
  echo "standalone server.js not found; run web build first" >&2
  exit 1
fi

STANDALONE_WEB_DIR="$(cd "$(dirname "$STANDALONE_SERVER")" && pwd)"
echo "==> Using standalone: $STANDALONE_WEB_DIR"

rm -rf "$TARGET"
mkdir -p "$TARGET"
# 拷贝 standalone 树到 resources/web，使 server.js 位于 resources/web/server.js
# Next 可能嵌套 omniall-canvas/web，统一摊平到 TARGET。
rsync -a --delete "$STANDALONE_WEB_DIR/" "$TARGET/"

mkdir -p "$TARGET/.next"
rm -rf "$TARGET/.next/static"
rsync -a "$WEB_DIR/.next/static/" "$TARGET/.next/static/"
rm -rf "$TARGET/public"
# 桌面端不需要把安装包再打进 App（体积大，且会干扰 electron-builder 签名/挂载）
rsync -a --exclude 'downloads/' "$WEB_DIR/public/" "$TARGET/public/"

if [[ ! -f "$TARGET/server.js" ]]; then
  echo "expected $TARGET/server.js after copy" >&2
  exit 1
fi

AGENT_SRC="$ROOT_DIR/canvas-agent"
AGENT_TARGET="$DESKTOP_DIR/resources/agent"
echo "==> Preparing desktop canvas-agent"
rm -rf "$AGENT_TARGET"
mkdir -p "$AGENT_TARGET"
cp "$AGENT_SRC/index.mjs" "$AGENT_SRC/codex.mjs" "$AGENT_SRC/codex-bin.mjs" "$AGENT_SRC/cursor-bin.mjs" "$AGENT_SRC/package.json" "$AGENT_TARGET/"
(
  cd "$AGENT_TARGET"
  bun install --production
)
if [[ ! -f "$AGENT_TARGET/index.mjs" ]]; then
  echo "expected $AGENT_TARGET/index.mjs after copy" >&2
  exit 1
fi

echo "==> Desktop web resources ready: $TARGET"
echo "==> Desktop agent resources ready: $AGENT_TARGET"
echo "==> config: $DESKTOP_DIR/resources/config.json"
