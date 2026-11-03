# 编译独立 ComfyUI Bridge 下载产物。
FROM golang:1.25-alpine AS bridge-build

WORKDIR /app/canvas-agent/native/comfy-bridge
COPY canvas-agent/native/comfy-bridge ./
RUN mkdir -p /bridge && GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build -o /bridge/InfiniteCanvas-ComfyBridge.exe . \
    && GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build -o /bridge/InfiniteCanvas-ComfyBridge-linux-amd64 . \
    && GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -o /bridge/InfiniteCanvas-ComfyBridge-linux-arm64 .

# 构建 Next.js 前端产物，并整理成扁平可运行目录（避免 standalone 嵌套导致 .next/static 404）。
FROM oven/bun:1.3.14 AS web-build

WORKDIR /app/web
COPY web/package.json web/bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile --cache-dir=/root/.bun/install/cache
COPY VERSION /app/VERSION
COPY CHANGELOG.md /app/CHANGELOG.md
COPY web ./
COPY canvas-agent/scripts /app/canvas-agent/scripts
COPY --from=bridge-build /bridge/ /app/web/public/
ENV CANVAS_PREBUILT_BRIDGE=1
RUN bun run build

# 将 standalone + static + public 归一到 /web-out，保证 server.js 旁必有完整 .next/static。
RUN set -eu; \
  STANDALONE_ROOT="/app/web/.next/standalone"; \
  if [ -f "$STANDALONE_ROOT/server.js" ]; then \
    SERVER_DIR="$STANDALONE_ROOT"; \
  else \
    SERVER_JS="$(find "$STANDALONE_ROOT" -type f -name server.js ! -path '*/node_modules/*' | head -n 1)"; \
    if [ -z "$SERVER_JS" ]; then \
      echo "ERROR: standalone 中未找到 server.js" >&2; \
      find "$STANDALONE_ROOT" -maxdepth 4 -type f -name 'server.js' -o -name 'package.json' | head -n 50 >&2 || true; \
      exit 1; \
    fi; \
    SERVER_DIR="$(dirname "$SERVER_JS")"; \
  fi; \
  echo "==> standalone server dir: $SERVER_DIR"; \
  rm -rf /web-out; \
  mkdir -p /web-out; \
  cp -a "$SERVER_DIR"/. /web-out/; \
  mkdir -p /web-out/.next/static /web-out/public; \
  cp -a /app/web/.next/static/. /web-out/.next/static/; \
  cp -a /app/web/public/. /web-out/public/; \
  CSS_COUNT="$(find /web-out/.next/static -type f -name '*.css' | wc -l | tr -d ' ')"; \
  echo "==> packaged CSS files: $CSS_COUNT"; \
  ls -lh /web-out/.next/static/chunks/*.css; \
  if [ "$CSS_COUNT" -lt 1 ]; then \
    echo "ERROR: .next/static 中没有 CSS，首页会排版错乱" >&2; \
    exit 1; \
  fi; \
  # 主样式通常是最大的 css；小于 20KB 基本可判定打包异常
  MAIN_CSS="$(ls -1S /web-out/.next/static/chunks/*.css | head -n 1)"; \
  MAIN_SIZE="$(wc -c < "$MAIN_CSS" | tr -d ' ')"; \
  echo "==> main css: $MAIN_CSS ($MAIN_SIZE bytes)"; \
  if [ "$MAIN_SIZE" -lt 20000 ]; then \
    echo "ERROR: 主 CSS 体积异常偏小，疑似 Tailwind 样式未打进产物" >&2; \
    exit 1; \
  fi; \
  test -f /web-out/server.js

# 构建 Go 后端入口。
FROM golang:1.25-alpine AS api-build

WORKDIR /app
COPY go.mod go.sum ./
COPY config ./config
COPY handler ./handler
COPY middleware ./middleware
COPY model ./model
COPY repository ./repository
COPY router ./router
COPY service ./service
COPY main.go ./
RUN go build -o /server .

# 运行镜像：Next.js 对外监听 3000，Go 只在容器内部监听 8080。
FROM node:22-bookworm-slim

WORKDIR /app
COPY VERSION /app/VERSION
COPY CHANGELOG.md /app/CHANGELOG.md
COPY --from=api-build /server /app/server
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh
COPY --from=web-build /web-out /app/web
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV PROMPT_DATA_DIR=/app/data/prompts
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*
RUN mkdir -p /app/data/prompts \
  && test -f /app/web/server.js \
  && test -d /app/web/.next/static/chunks \
  && ls /app/web/.next/static/chunks/*.css >/dev/null

EXPOSE 3000
# 先启动内部 Go API，再由 Next.js 提供页面并代理 /api/*。
CMD ["/app/docker-entrypoint.sh"]
