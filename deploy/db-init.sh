#!/usr/bin/env bash
# Khởi tạo PostgreSQL: tài khoản, 2 database (tnth_prod, tnth_dev), phân quyền và schema v1.
# Chạy lại nhiều lần an toàn: thứ gì đã có thì bỏ qua, mật khẩu được đặt lại theo secrets/db.env.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; . secrets/db.env; set +a

psql_as() { local role=$1 db=$2; shift 2; docker compose exec -T db psql -v ON_ERROR_STOP=1 -q -U "$role" -d "$db" "$@"; }

echo "==> Tài khoản"
psql_as postgres postgres -v app="$TNTH_APP_PASSWORD" -v dev="$CODER_DEV_PASSWORD" -v ro="$CODER_READONLY_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE %I LOGIN', r) FROM unnest(ARRAY['tnth_app','coder_dev','coder_readonly']) r
 WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) \gexec
ALTER ROLE tnth_app       PASSWORD :'app';
ALTER ROLE coder_dev      PASSWORD :'dev' CONNECTION LIMIT 30;
ALTER ROLE coder_readonly PASSWORD :'ro'  CONNECTION LIMIT 10;
ALTER ROLE coder_readonly SET default_transaction_read_only = on;
SQL

echo "==> Database"
for pair in tnth_prod:tnth_app tnth_dev:coder_dev; do
  db=${pair%%:*}; owner=${pair##*:}
  if [[ -z "$(psql_as postgres postgres -Atc "SELECT 1 FROM pg_database WHERE datname = '$db'")" ]]; then
    psql_as postgres postgres -c "CREATE DATABASE $db OWNER $owner TEMPLATE template0 ENCODING 'UTF8' LOCALE_PROVIDER icu ICU_LOCALE 'vi-VN' LOCALE 'en_US.utf8'"
  fi
done

echo "==> Phân quyền kết nối"
psql_as postgres postgres <<'SQL'
REVOKE ALL ON DATABASE tnth_prod, tnth_dev, postgres FROM PUBLIC;
GRANT CONNECT ON DATABASE tnth_prod TO coder_readonly;
SQL

echo "==> Schema"
for pair in tnth_prod:tnth_app tnth_dev:coder_dev; do
  db=${pair%%:*}; owner=${pair##*:}
  if [[ -z "$(psql_as "$owner" "$db" -Atc "SELECT to_regclass('public.org_units')")" ]]; then
    psql_as "$owner" "$db" < db/schema_v1.sql >/dev/null
    echo "    $db: đã dựng schema v1"
  else
    echo "    $db: đã có schema, bỏ qua"
  fi
done

echo "==> Quyền chỉ đọc trên tnth_prod cho coder_readonly"
psql_as tnth_app tnth_prod <<'SQL'
GRANT USAGE ON SCHEMA public TO coder_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO coder_readonly;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO coder_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO coder_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON SEQUENCES TO coder_readonly;
SQL
echo "==> Xong"
