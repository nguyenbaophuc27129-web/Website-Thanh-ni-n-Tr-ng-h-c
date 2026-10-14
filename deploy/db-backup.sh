#!/usr/bin/env bash
# Sao lưu hằng đêm tnth_prod + tnth_dev (pg_dump định dạng custom), giữ 14 ngày,
# và tạo sẵn phân vùng tháng cho post_views / audit_logs. Cron: /etc/cron.d/tnth-db
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."

dir=${TNTH_BACKUP_DIR:-/var/backups/tnth}
keep_days=14
stamp=$(date +%Y%m%d-%H%M%S)
mkdir -p "$dir"; chmod 700 "$dir"

for db in tnth_prod tnth_dev; do
  # coder có thể đã xóa hàm này trong tnth_dev — không coi là lỗi
  docker compose exec -T db psql -q -U postgres -d "$db" -c "SELECT ensure_month_partitions()" >/dev/null 2>&1 \
    || echo "CẢNH BÁO: $db không chạy được ensure_month_partitions()" >&2

  out="$dir/$db-$stamp.dump"
  docker compose exec -T db pg_dump -U postgres -d "$db" --format=custom > "$out.tmp"
  mv "$out.tmp" "$out"
  echo "$(date '+%F %T') $db → $out ($(du -h "$out" | cut -f1))"
done

find "$dir" -name 'tnth_*-*.dump' -mtime +"$keep_days" -delete
find "$dir" -name '*.tmp' -mmin +120 -delete
