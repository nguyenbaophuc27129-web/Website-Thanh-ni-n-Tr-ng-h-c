#!/usr/bin/env bash
# Build + chạy web thử (chỉ 127.0.0.1:<cổng>, DB tnth_test, không gửi email). Dùng: web-thu.sh [cổng=3100]
set -euo pipefail
cd "$(dirname "$0")/../.."
T=${TNTH_TEST_DIR:-/var/tmp/tnth-kiem-thu}; PORT=${1:-3100}
mkdir -p "$T/uploads" && chown 1000:1000 "$T/uploads"
docker build -q -t tnth-web:thu . >/dev/null
docker rm -f tnth-web-thu >/dev/null 2>&1 || true
docker run -d --name tnth-web-thu --network tnth_internal -p "127.0.0.1:$PORT:3000" \
  --env-file "$T/staging.env" -v "$T/uploads:/app/uploads" \
  --read-only --tmpfs /tmp --tmpfs /app/.next/cache:uid=1000,gid=1000 tnth-web:thu >/dev/null
for i in $(seq 1 40); do curl -sf -o /dev/null "http://127.0.0.1:$PORT/" && { echo "web thử chạy ở http://127.0.0.1:$PORT"; exit 0; }; sleep 1; done
echo "web thử không lên"; docker logs tnth-web-thu | tail -30; exit 1
