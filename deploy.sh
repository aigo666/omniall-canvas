#!/usr/bin/env bash
# OmniAll Canvas 一键拉取 / 清理旧镜像 / 构建 / 部署
# 在服务器仓库目录执行：
#   ./deploy.sh
#
# 环境变量（可选）：
#   GIT_REMOTE=https://github.com/aigo666/omniall-canvas.git
#   GIT_BRANCH=main
#   DEPLOY_SKIP_DOCKER_CLEAN=1   跳过镜像/缓存清理
#   DEPLOY_PRUNE_BUILD_ALL=1     清理全部 BuildKit 缓存（默认仅清 24h 前）
#   DEPLOY_MIN_FREE_GB=8         构建前最低可用磁盘（GB）
#   DEPLOY_NO_CACHE=1            docker build 不使用缓存（更干净，更慢）
#
# 容器内前端 3000、后端 8080；宿主机端口见 docker-compose.deploy.yml（默认 8866）。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

GIT_REMOTE="${GIT_REMOTE:-https://github.com/aigo666/omniall-canvas.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"
COMPOSE_FILE="docker-compose.deploy.yml"
IMAGE_NAME="omniall-canvas:local"
CONTAINER_NAME="omniall-canvas"
HOST_PORT="8866"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }
info() { echo -e "${CYAN}[ENV]${NC}  $1"; }

cleanup_docker_residuals() {
  local phase="${1:-清理}"
  if [ "${DEPLOY_SKIP_DOCKER_CLEAN:-}" = "1" ]; then
    warn "已跳过 Docker 清理 (DEPLOY_SKIP_DOCKER_CLEAN=1)"
    return 0
  fi

  log "清理 Docker ${phase}残留..."
  info "当前磁盘占用:"
  df -h / /var/lib/docker 2>/dev/null | sed 's/^/  /' || df -h / | sed 's/^/  /'
  docker system df 2>/dev/null | sed 's/^/  /' || warn "无法读取 docker system df"

  if out=$(docker image prune -f 2>&1); then
    reclaimed=$(echo "$out" | awk '/Total reclaimed space:/ {print $4, $5}')
    [ -n "$reclaimed" ] && info "已删除悬空镜像，释放 ${reclaimed}" || info "无悬空镜像需清理"
  else
    warn "悬空镜像清理失败（不影响服务）"
  fi

  local builder_prune_args=(-f)
  if [ "${DEPLOY_PRUNE_BUILD_ALL:-}" = "1" ]; then
    warn "DEPLOY_PRUNE_BUILD_ALL=1：清理全部 BuildKit 构建缓存"
  else
    builder_prune_args+=(--filter "until=24h")
  fi
  if out=$(docker builder prune "${builder_prune_args[@]}" 2>&1); then
    reclaimed=$(echo "$out" | awk '/Total:/ {print $2, $3}')
    [ -n "$reclaimed" ] && info "已清理构建缓存，释放 ${reclaimed}" || info "无过期构建缓存需清理"
  else
    warn "构建缓存清理失败（不影响服务）"
  fi

  info "清理后磁盘占用:"
  df -h / /var/lib/docker 2>/dev/null | sed 's/^/  /' || df -h / | sed 's/^/  /'
  docker system df 2>/dev/null | sed 's/^/  /' || true
}

ensure_disk_for_build() {
  local min_gb="${DEPLOY_MIN_FREE_GB:-8}"
  local avail_kb
  avail_kb=$(df -Pk / | awk 'NR==2 {print $4}')
  if [ -z "$avail_kb" ]; then
    warn "无法读取根分区可用空间，跳过磁盘预检"
    return 0
  fi

  local avail_gb=$((avail_kb / 1024 / 1024))
  info "根分区可用空间: ${avail_gb}GB（建议 ≥ ${min_gb}GB）"
  docker system df 2>/dev/null | sed 's/^/  /' || true

  if [ "$avail_gb" -lt "$min_gb" ]; then
    warn "磁盘空间不足 ${min_gb}GB，构建前先清理 Docker 残留..."
    DEPLOY_PRUNE_BUILD_ALL=1 cleanup_docker_residuals "构建前"

    avail_kb=$(df -Pk / | awk 'NR==2 {print $4}')
    avail_gb=$((avail_kb / 1024 / 1024))
    info "清理后根分区可用空间: ${avail_gb}GB"

    if [ "$avail_gb" -lt "$min_gb" ]; then
      fail "磁盘空间仍不足（可用 ${avail_gb}GB < ${min_gb}GB）。请在服务器执行:
  docker system prune -af && docker builder prune -af
  df -h /
然后重试 ./deploy.sh"
    fi
  fi
}

# ── 0. 先拉最新代码，再 exec 用最新 deploy.sh 继续 ──
if [ "${DEPLOY_POST_SYNC:-}" != "1" ]; then
  if ! git rev-parse --git-dir >/dev/null 2>&1; then
    fail "当前目录不是 Git 仓库。请先执行: git clone -b ${GIT_BRANCH} ${GIT_REMOTE} && cd omniall-canvas"
  fi

  log "拉取最新代码 (分支: ${GIT_BRANCH})..."
  if git remote | grep -qx 'origin'; then
    git remote set-url origin "$GIT_REMOTE"
  else
    git remote add origin "$GIT_REMOTE"
  fi
  git fetch origin "$GIT_BRANCH"
  git reset --hard "origin/$GIT_BRANCH"
  log "代码已更新到 $(git rev-parse --short HEAD)，重新执行 deploy.sh …"
  export DEPLOY_POST_SYNC=1
  exec bash "$0" "$@"
fi

# ── 1. 依赖检查 ───────────────────────────────────
if ! command -v docker >/dev/null 2>&1; then
  fail "未找到 docker，请先在服务器安装 Docker。"
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  fail "未找到 docker compose，请安装 Docker Compose 插件。"
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  fail "缺少 ${COMPOSE_FILE}"
fi

if [ ! -f .env ]; then
  cp .env.example .env
  fail "已从 .env.example 生成 .env，请先修改管理员密码和 JWT_SECRET 后再执行。"
fi

mkdir -p data
info "镜像: ${IMAGE_NAME} | 容器: ${CONTAINER_NAME} | 端口: ${HOST_PORT}"
info "提交: $(git rev-parse --short HEAD) ($(git log -1 --pretty=format:'%s'))"
echo ""

# ── 2. 停止旧容器并删除旧镜像，避免堆积浪费 ───────
log "停止并移除旧容器/编排服务..."
"${COMPOSE[@]}" -f "$COMPOSE_FILE" down --remove-orphans || true

if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  log "强制删除残留容器: ${CONTAINER_NAME}"
  docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
fi

if docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
  log "删除旧镜像: ${IMAGE_NAME}"
  docker rmi -f "$IMAGE_NAME" >/dev/null 2>&1 || warn "旧镜像删除失败（可能仍被引用，稍后 prune）"
fi

# 构建前顺手清悬空镜像，避免历史 <none> 占盘
cleanup_docker_residuals "构建前"

# ── 3. 磁盘预检 + 重新构建并启动 ─────────────────
ensure_disk_for_build

BUILD_ARGS=( -f "$COMPOSE_FILE" build )
if [ "${DEPLOY_NO_CACHE:-}" = "1" ]; then
  warn "DEPLOY_NO_CACHE=1：不使用 Docker 构建缓存"
  BUILD_ARGS+=(--no-cache)
fi

log "构建镜像并启动容器..."
DOCKER_BUILDKIT=1 "${COMPOSE[@]}" "${BUILD_ARGS[@]}"
"${COMPOSE[@]}" -f "$COMPOSE_FILE" up -d --force-recreate --remove-orphans

# ── 4. 健康检查 ───────────────────────────────────
log "等待服务启动..."
MAX_WAIT="${DEPLOY_HEALTH_WAIT:-90}"
COUNT=0
until curl -sf "http://127.0.0.1:${HOST_PORT}/" >/dev/null 2>&1 \
  || curl -sf "http://127.0.0.1:${HOST_PORT}/api/health" >/dev/null 2>&1; do
  sleep 2
  COUNT=$((COUNT + 2))
  if [ "$COUNT" -ge "$MAX_WAIT" ]; then
    warn "健康检查超时，最近日志:"
    "${COMPOSE[@]}" -f "$COMPOSE_FILE" logs --tail=40 || true
    fail "服务未能在 ${MAX_WAIT}s 内启动"
  fi
  echo -n "."
done
echo ""

# ── 5. 部署后清理悬空镜像与过期构建缓存 ───────────
cleanup_docker_residuals "部署后"

# ── 6. 完成 ───────────────────────────────────────
log "✅ 部署完成！"
log "  访问地址: http://<服务器IP>:${HOST_PORT}"
log "  当前提交: $(git rev-parse --short HEAD)"
log "  查看日志: ${COMPOSE[*]} -f ${COMPOSE_FILE} logs -f"
warn "Docker 清理：默认回收悬空镜像 + 24h 前构建缓存；跳过清理 export DEPLOY_SKIP_DOCKER_CLEAN=1；全量清缓存 export DEPLOY_PRUNE_BUILD_ALL=1；强制无缓存构建 export DEPLOY_NO_CACHE=1"
