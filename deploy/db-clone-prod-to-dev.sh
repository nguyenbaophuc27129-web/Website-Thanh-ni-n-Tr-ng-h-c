#!/usr/bin/env bash
# Chép toàn bộ tnth_prod (cấu trúc + dữ liệu) đè lên tnth_dev để coder thử với dữ liệu giống thật.
# LƯU Ý: dữ liệu thật (email, số điện thoại, hash mật khẩu) sẽ nằm trong tnth_dev mà coder toàn quyền đọc.
set -euo pipefail
cd "$(dirname "$0")/.."
tmp=$(mktemp /var/tmp/tnth_prod-clone-XXXXXX.dump); trap 'rm -f "$tmp"' EXIT
docker compose exec -T db pg_dump -U postgres -d tnth_prod --format=custom > "$tmp"
deploy/db-restore.sh tnth_dev "$tmp"
