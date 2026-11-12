#!/usr/bin/env bash
# Dựng môi trường thử: DB tnth_test (bản sao tnth_dev) + 9 tài khoản thử đủ vai trò + file env cho web thử.
# Thư mục làm việc: $TNTH_TEST_DIR (mặc định /var/tmp/tnth-kiem-thu) — chứa mật khẩu thử, env, tệp tải lên thử.
# Dọn sau khi thử xong: xoa-moi-truong-thu.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
T=${TNTH_TEST_DIR:-/var/tmp/tnth-kiem-thu}
mkdir -p "$T" && chmod 700 "$T"
if docker compose exec -T db psql -U postgres -At -c "select 1 from pg_database where datname='tnth_test'" | grep -q 1; then
  echo "tnth_test đã có — bỏ qua bước sao chép"; else
  docker compose exec -T db psql -v ON_ERROR_STOP=1 -U postgres -c "CREATE DATABASE tnth_test OWNER coder_dev"
  docker compose exec -T db pg_dump -U postgres -d tnth_dev --format=custom > "$T/dev.dump"
  docker compose exec -T db pg_restore -U postgres -d tnth_test --no-owner --role=coder_dev < "$T/dev.dump"
  rm -f "$T/dev.dump"
fi
[[ -f "$T/test-password.txt" ]] || { echo "Thu-$(openssl rand -hex 6)" > "$T/test-password.txt"; chmod 600 "$T/test-password.txt"; }
HASH=$(docker run --rm -e PW="$(cat "$T/test-password.txt")" node:22-alpine node -e "const c=require('crypto');const s=c.randomBytes(16);const k=c.scryptSync(process.env.PW,s,64,{N:16384,r:8,p:1});console.log('scrypt:16384:8:1:'+s.toString('hex')+':'+k.toString('hex'))")
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U postgres -d tnth_test <<SQL
SET ROLE coder_dev;
INSERT INTO accounts (org_unit_id, username, email, password_hash, contact_person, contact_position, status, must_change_password, failed_login_count, role_code, class_name)
SELECT v.* FROM (VALUES
 (1,'t.tw','t.tw@test.local','$HASH','Thử TW','Thường trực Web','ACTIVE',false,0,'QUAN_TRI_TW',null::text),
 (131,'t.tinh','t.tinh@test.local','$HASH','Thử Tỉnh','Bí thư','ACTIVE',false,0,'QUAN_TRI_TINH',null),
 (100,'t.tinhkhac','t.tinhkhac@test.local','$HASH','Thử Tỉnh khác','Bí thư','ACTIVE',false,0,'QUAN_TRI_TINH',null),
 (13101,'t.cap3','t.cap3@test.local','$HASH','Thử Cấp 3','Bí thư','ACTIVE',false,0,'QUAN_TRI_CAP3',null),
 (131101,'t.donvi','t.donvi@test.local','$HASH','Thử Đơn vị','Bí thư','ACTIVE',false,0,'DON_VI',null),
 (131103,'t.donvi2','t.donvi2@test.local','$HASH','Thử Đơn vị 2','Bí thư','ACTIVE',false,0,'DON_VI',null),
 (1,'t.btv','t.btv@test.local','$HASH','Thử Biên tập','Biên tập viên','ACTIVE',false,0,'BIEN_TAP_VIEN',null),
 (131101,'t.dv1','t.dv1@test.local','$HASH','Đoàn viên 1','Đoàn viên','ACTIVE',false,0,'DOAN_VIEN','12A1'),
 (131101,'t.dv2','t.dv2@test.local','$HASH','Đoàn viên 2','Đoàn viên','ACTIVE',false,0,'DOAN_VIEN','12A2')
) AS v(org_unit_id, username, email, password_hash, contact_person, contact_position, status, must_change_password, failed_login_count, role_code, class_name)
WHERE NOT EXISTS (SELECT 1 FROM accounts a WHERE a.username = v.username);
SQL
# Web thử dùng tnth_test, KHÔNG gửi email
grep -v '^SMTP_\|^MAIL_FROM' .env.production | sed 's#@db:5432/tnth_dev#@db:5432/tnth_test#' > "$T/staging.env"; chmod 600 "$T/staging.env"
grep -q tnth_test "$T/staging.env" || { echo "LỖI: staging.env không trỏ tnth_test"; exit 1; }
echo "Xong. Mật khẩu tài khoản thử: $T/test-password.txt"
