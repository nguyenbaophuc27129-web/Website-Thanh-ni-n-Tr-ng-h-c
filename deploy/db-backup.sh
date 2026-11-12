#!/usr/bin/env bash
# Sao lưu hằng đêm tnth_prod + tnth_dev (pg_dump định dạng custom) và thư mục tệp tải lên
# /srv/tnth/uploads (ảnh, video, văn bản), giữ 14 ngày,
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

# Tệp tải lên: mỗi đêm 1 bản chụp đầy đủ, tệp không đổi dùng chung hard link với bản trước
# (--link-dest) nên chỉ tốn dung lượng cho tệp mới. Tệp đặt tên theo mã băm, không bao giờ sửa tại chỗ.
uploads_src=${TNTH_UPLOADS_DIR:-/srv/tnth/uploads}
if [[ -d "$uploads_src" ]]; then
  prev=$(find "$dir" -maxdepth 1 -type d -name 'uploads-*' ! -name '*.tmp' | sort | tail -n1)
  out="$dir/uploads-$stamp"
  rsync -a --delete ${prev:+--link-dest="$prev"} "$uploads_src/" "$out.tmp/"
  mv "$out.tmp" "$out"
  echo "$(date '+%F %T') uploads → $out ($(find "$out" -type f | wc -l) tệp)"
fi

find "$dir" -name 'tnth_*-*.dump' -mtime +"$keep_days" -delete
# rsync -a chép cả mtime của thư mục nguồn → giữ theo số bản (tên có ngày giờ), không theo mtime
find "$dir" -maxdepth 1 -type d -name 'uploads-*' ! -name '*.tmp' | sort | head -n -"$keep_days" | xargs -r rm -rf
find "$dir" -maxdepth 1 -type d -name 'uploads-*.tmp' -mmin +120 -exec rm -rf {} +
find "$dir" -maxdepth 1 -type f -name '*.tmp' -mmin +120 -delete
