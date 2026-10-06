#!/usr/bin/env bash
# Build image theo commit hiện tại rồi thay container. Dùng: deploy/deploy.sh [--pull]
set -euo pipefail
cd "$(dirname "$0")/.."

[[ "${1:-}" == "--pull" ]] && git pull --ff-only

tag="$(git rev-parse --short HEAD)"
[[ -n "$(git status --porcelain)" ]] && tag="$tag-dirty-$(date +%Y%m%d%H%M%S)"
history=deploy/.releases

echo "==> Build tnth-web:$tag"
docker build -t "tnth-web:$tag" .

docker tag "tnth-web:$tag" tnth-web:current
[[ "$(tail -n1 "$history" 2>/dev/null)" == "$tag" ]] || echo "$tag" >> "$history"

echo "==> Khởi động"
docker compose up -d --no-build --wait --force-recreate web
docker compose up -d --no-build --wait

# Giữ 5 bản gần nhất để rollback, xóa image cũ hơn
head -n -5 "$history" | while read -r old; do docker rmi "tnth-web:$old" >/dev/null 2>&1 || true; done
tail -n 5 "$history" > "$history.tmp" && mv "$history.tmp" "$history"
docker image prune -f >/dev/null

echo "==> Xong: đang chạy tnth-web:$tag"
docker compose ps
