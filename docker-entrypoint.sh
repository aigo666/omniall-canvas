#!/bin/sh
set -eu

PORT=8080 /app/server &
API_PID=$!

# 前端运行目录必须同时包含 server.js 与 .next/static（CSS/JS）。
# Dockerfile 已归一到 /app/web；这里再兜底查找，避免嵌套 standalone 导致首页 CSS 404。
WEB_DIR="/app/web"
if [ ! -f "$WEB_DIR/server.js" ]; then
  WEB_DIR="$(find /app/web -type f -name server.js ! -path '*/node_modules/*' 2>/dev/null | head -n 1 | xargs dirname 2>/dev/null || true)"
fi
if [ -z "${WEB_DIR:-}" ] || [ ! -f "$WEB_DIR/server.js" ]; then
  echo "ERROR: 未找到 Next.js server.js" >&2
  exit 1
fi
if ! ls "$WEB_DIR"/.next/static/chunks/*.css >/dev/null 2>&1; then
  echo "ERROR: 缺少前端 CSS ($WEB_DIR/.next/static/chunks/*.css)，首页会排版错乱" >&2
  ls -la "$WEB_DIR"/.next/static 2>&1 || true
  exit 1
fi

cd "$WEB_DIR"
PORT=3000 node server.js &
WEB_PID=$!

shutdown() {
  trap - INT TERM
  kill -TERM "$API_PID" "$WEB_PID" 2>/dev/null || true
  wait "$API_PID" 2>/dev/null || true
  wait "$WEB_PID" 2>/dev/null || true
  exit 0
}

trap shutdown INT TERM

while kill -0 "$API_PID" 2>/dev/null && kill -0 "$WEB_PID" 2>/dev/null; do
  sleep 1
done

kill -TERM "$API_PID" "$WEB_PID" 2>/dev/null || true
wait "$API_PID" 2>/dev/null || true
wait "$WEB_PID" 2>/dev/null || true
exit 1
