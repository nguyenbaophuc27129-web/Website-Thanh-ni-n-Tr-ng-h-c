#!/usr/bin/env bash
# psql vào DB thử tnth_test (KHÔNG BAO GIỜ trỏ sang tnth_dev / tnth_prod)
exec docker compose -f "$(dirname "$0")/../../docker-compose.yml" exec -T db psql -U postgres -d tnth_test -v ON_ERROR_STOP=1 "$@"
