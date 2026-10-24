#!/usr/bin/env bash
# Khôi phục 1 database từ file sao lưu. XÓA toàn bộ nội dung hiện có của database đó.
# Dùng: deploy/db-restore.sh <tnth_dev|tnth_prod> <file.dump>
#   Bản "sạch" của tnth_dev (schema v1, chưa có dữ liệu): /var/backups/tnth/baseline/tnth_dev-schema_v1.dump
set -euo pipefail
cd "$(dirname "$0")/.."

db=${1:?thiếu tên database}; file=${2:?thiếu đường dẫn file .dump}
case "$db" in tnth_dev) owner=coder_dev ;; tnth_prod) owner=tnth_app ;; *) echo "Database không hợp lệ: $db"; exit 1 ;; esac
[[ -f "$file" ]] || { echo "Không thấy file: $file"; exit 1; }

read -r -p "Sẽ XÓA và nạp lại '$db' từ $file. Gõ tên database để xác nhận: " answer
[[ "$answer" == "$db" ]] || { echo "Đã hủy."; exit 1; }

psql_admin() { docker compose exec -T db psql -v ON_ERROR_STOP=1 -q -U postgres -d postgres "$@"; }
psql_admin -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$db' AND pid <> pg_backend_pid()" >/dev/null
psql_admin -c "DROP DATABASE IF EXISTS $db"
psql_admin -c "CREATE DATABASE $db OWNER $owner TEMPLATE template0 ENCODING 'UTF8' LOCALE_PROVIDER icu ICU_LOCALE 'vi-VN' LOCALE 'en_US.utf8'"
psql_admin -c "REVOKE ALL ON DATABASE $db FROM PUBLIC"
[[ "$db" == tnth_prod ]] && psql_admin -c "GRANT CONNECT ON DATABASE tnth_prod TO coder_readonly"

# --no-owner + --role: mọi đối tượng thuộc về chủ sở hữu database, kể cả khi nạp bản của database kia
docker compose exec -T db pg_restore -U postgres -d "$db" --no-owner --no-acl --role="$owner" --exit-on-error < "$file"

if [[ "$db" == tnth_prod ]]; then
  docker compose exec -T db psql -v ON_ERROR_STOP=1 -q -U tnth_app -d tnth_prod <<'SQL'
GRANT USAGE ON SCHEMA public TO coder_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO coder_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO coder_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO coder_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO coder_readonly;
SQL
fi
echo "Xong: $db đã được khôi phục từ $file"
