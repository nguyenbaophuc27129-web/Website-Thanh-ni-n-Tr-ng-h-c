#!/usr/bin/env bash
# Quay về bản trước (hoặc tag chỉ định). Dùng: deploy/rollback.sh [tag]
set -euo pipefail
cd "$(dirname "$0")/.."

history=deploy/.releases
target="${1:-$(tail -n 2 "$history" | head -n 1)}"
current="$(tail -n 1 "$history")"

if [[ -z "$target" || "$target" == "$current" && -z "${1:-}" ]]; then
  echo "Không có bản trước để quay về. Các bản đang giữ:"; cat "$history"; exit 1
fi
docker image inspect "tnth-web:$target" >/dev/null

echo "==> Quay về tnth-web:$target (đang chạy: $current)"
docker tag "tnth-web:$target" tnth-web:current
grep -vx "$target" "$history" > "$history.tmp" || true
echo "$target" >> "$history.tmp" && mv "$history.tmp" "$history"
docker compose up -d --no-build --wait
docker compose ps
