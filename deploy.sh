#!/usr/bin/env bash
# 在服务器仓库目录执行：用 Docker 构建并启动服务。
# 容器内前端监听 3000、后端监听 8080；宿主机对外端口为 8866。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "未找到 docker，请先在服务器安装 Docker。"
  exit 1
fi

if docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "未找到 docker compose，请安装 Docker Compose 插件。"
  exit 1
fi

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "已从 .env.example 生成 .env，请先修改管理员密码和 JWT_SECRET 后再执行。"
  exit 1
fi

mkdir -p data

echo "==> 构建镜像并启动容器"
"${COMPOSE[@]}" -f docker-compose.deploy.yml up -d --build --remove-orphans

echo "部署完成"
echo "访问: http://<服务器地址>:8866"
echo "查看日志: ${COMPOSE[*]} -f docker-compose.deploy.yml logs -f"
