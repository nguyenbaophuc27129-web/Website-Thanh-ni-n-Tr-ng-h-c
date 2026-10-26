#!/usr/bin/env bash
# Chạy 1 kịch bản Playwright trong e2e/ với web thử. Dùng: chay-e2e.sh <tên.mjs> [cổng=3100]
set -euo pipefail
D=$(cd "$(dirname "$0")" && pwd); T=${TNTH_TEST_DIR:-/var/tmp/tnth-kiem-thu}; PORT=${2:-3100}
IMG=mcr.microsoft.com/playwright:v1.49.1-noble
[[ -d "$D/e2e/node_modules/playwright" ]] || docker run --rm -v "$D/e2e:/e2e" -w /e2e $IMG npm i -s --no-audit --no-fund
exec docker run --rm --network host -e BASE="http://127.0.0.1:$PORT" -v "$D/e2e:/e2e" \
  -v "$T/test-password.txt:/staging/test-password.txt:ro" -v "$T/uploads:/uploads-test" -w /e2e $IMG node "$1"
