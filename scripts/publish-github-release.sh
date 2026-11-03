#!/usr/bin/env bash
# 将桌面端安装包发布到 GitHub Releases（含更新说明）。
# 用法:
#   ./scripts/publish-github-release.sh                 # 读取 VERSION
#   ./scripts/publish-github-release.sh v0.8.2          # 指定版本
#   ./scripts/publish-github-release.sh v0.8.2 --draft  # 草稿
#
# 期望产物（在 desktop/dist，也兼容旧文件名）:
#   OmniAll Canvas-<ver>-mac-x64.dmg
#   OmniAll Canvas-<ver>-mac-arm64.dmg
#   OmniAll Canvas-<ver>-win-x64.exe
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/desktop/dist"
REPO="${GITHUB_REPO:-aigo666/omniall-canvas}"

TAG="${1:-}"
DRAFT=0
if [[ "${2:-}" == "--draft" || "${1:-}" == "--draft" ]]; then
  DRAFT=1
fi
if [[ "$TAG" == "--draft" ]]; then
  TAG=""
fi
if [[ -z "$TAG" ]]; then
  TAG="$(tr -d '[:space:]' < "$ROOT_DIR/VERSION")"
fi
if [[ ! "$TAG" =~ ^v ]]; then
  TAG="v$TAG"
fi
VERSION="${TAG#v}"

notes_from_changelog() {
  local ver="$1"
  python3 - "$ROOT_DIR/CHANGELOG.md" "$ver" <<'PY'
import re, sys
path, ver = sys.argv[1], sys.argv[2]
text = open(path, encoding="utf-8").read()
# Match ## vX.Y.Z ... until next ##
pat = rf"(?ms)^##\s+{re.escape(ver)}\b.*?\n(.*?)(?=^##\s+|\Z)"
m = re.search(pat, text)
body = (m.group(1).strip() if m else "").strip()
if not body:
    body = f"OmniAll Canvas {ver} desktop release."
print(body)
PY
}

pick_existing() {
  local f
  for f in "$@"; do
    if [[ -f "$f" ]]; then
      printf '%s' "$f"
      return 0
    fi
  done
  return 1
}

MAC_X64="$(pick_existing \
  "$DIST_DIR/OmniAll Canvas-${VERSION}-mac-x64.dmg" \
  "$DIST_DIR/OmniAll Canvas-${VERSION}.dmg" \
  || true)"
MAC_ARM="$(pick_existing \
  "$DIST_DIR/OmniAll Canvas-${VERSION}-mac-arm64.dmg" \
  || true)"
WIN_X64="$(pick_existing \
  "$DIST_DIR/OmniAll Canvas-${VERSION}-win-x64.exe" \
  "$DIST_DIR/OmniAll Canvas Setup ${VERSION}.exe" \
  || true)"

missing=0
[[ -n "$MAC_X64" ]] || { echo "缺少 Mac Intel 包 (mac-x64.dmg)"; missing=1; }
[[ -n "$MAC_ARM" ]] || { echo "缺少 Mac Apple Silicon 包 (mac-arm64.dmg)"; missing=1; }
[[ -n "$WIN_X64" ]] || { echo "缺少 Windows 包 (win-x64.exe)"; missing=1; }
if [[ "$missing" -ne 0 ]]; then
  echo "请先执行: ./scripts/build-desktop-release.sh"
  exit 1
fi

# Normalize upload names for GitHub Assets
STAGE="$(mktemp -d)"
cp "$MAC_X64" "$STAGE/OmniAll-Canvas-${VERSION}-mac-intel-x64.dmg"
cp "$MAC_ARM" "$STAGE/OmniAll-Canvas-${VERSION}-mac-apple-silicon-arm64.dmg"
cp "$WIN_X64" "$STAGE/OmniAll-Canvas-${VERSION}-windows-x64.exe"

NOTES_FILE="$(mktemp)"
{
  echo "## OmniAll Canvas ${TAG}"
  echo
  echo "### 桌面端安装包"
  echo
  echo "| 平台 | 文件 |"
  echo "| --- | --- |"
  echo "| Windows x64 | \`OmniAll-Canvas-${VERSION}-windows-x64.exe\` |"
  echo "| macOS Intel | \`OmniAll-Canvas-${VERSION}-mac-intel-x64.dmg\` |"
  echo "| macOS Apple Silicon (M 系列) | \`OmniAll-Canvas-${VERSION}-mac-apple-silicon-arm64.dmg\` |"
  echo
  echo "### 更新说明"
  echo
  notes_from_changelog "$TAG"
} > "$NOTES_FILE"

ARGS=(release create "$TAG" -R "$REPO" --title "OmniAll Canvas $TAG" --notes-file "$NOTES_FILE")
if [[ "$DRAFT" -eq 1 ]]; then
  ARGS+=(--draft)
else
  ARGS+=(--latest)
fi

# Recreate if tag release already exists empty / update assets
if gh release view "$TAG" -R "$REPO" >/dev/null 2>&1; then
  echo "==> Release $TAG 已存在，上传/覆盖资源"
  gh release upload "$TAG" -R "$REPO" --clobber \
    "$STAGE/OmniAll-Canvas-${VERSION}-windows-x64.exe" \
    "$STAGE/OmniAll-Canvas-${VERSION}-mac-intel-x64.dmg" \
    "$STAGE/OmniAll-Canvas-${VERSION}-mac-apple-silicon-arm64.dmg"
  gh release edit "$TAG" -R "$REPO" --notes-file "$NOTES_FILE" --latest
else
  echo "==> 创建 Release $TAG"
  gh "${ARGS[@]}" \
    "$STAGE/OmniAll-Canvas-${VERSION}-windows-x64.exe" \
    "$STAGE/OmniAll-Canvas-${VERSION}-mac-intel-x64.dmg" \
    "$STAGE/OmniAll-Canvas-${VERSION}-mac-apple-silicon-arm64.dmg"
fi

echo "==> Done: https://github.com/${REPO}/releases/tag/${TAG}"
rm -rf "$STAGE" "$NOTES_FILE"
