#!/usr/bin/env bash
# Dọn sạch môi trường thử: container + image web thử, DB tnth_test, thư mục $TNTH_TEST_DIR.
set -euo pipefail
cd "$(dirname "$0")/../.."
docker rm -f tnth-web-thu >/dev/null 2>&1 || true
docker rmi tnth-web:thu >/dev/null 2>&1 || true
docker compose exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS tnth_test WITH (FORCE)"
rm -rf "${TNTH_TEST_DIR:-/var/tmp/tnth-kiem-thu}" "$(dirname "$0")/e2e/node_modules"
echo "Đã dọn môi trường thử."
