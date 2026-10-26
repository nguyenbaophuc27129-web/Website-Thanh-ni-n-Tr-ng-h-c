#!/usr/bin/env bash
# Dựng dữ liệu thử cho scripts/clean-orphan-media.mts trên tnth_test + $S/uploads-e
set -euo pipefail
S=${TNTH_TEST_DIR:-/var/tmp/tnth-kiem-thu}
U=$S/uploads-e
OLD="30 days ago"
mk() { mkdir -p "$(dirname "$U/$1")"; head -c 2048 /dev/urandom > "$U/$1"; [ "${2:-old}" = old ] && touch -d "$OLD" "$U/$1"; chown 1000:1000 "$U/$1"; }
mk bai-viet/2025/01/eeee0001.webp     # cũ, DB nhắc (markdown trong cột text)      → GIỮ
mk dien-dan/2025/01/eeee0002.mp4      # cũ, DB nhắc (jsonb media)                  → GIỮ
mk van-ban/2025/01/eeee0003.pdf       # cũ, DB nhắc (URL tuyệt đối + dấu chấm)     → GIỮ
mk tai-nguyen/2025/01/eeee0004.pdf    # cũ, không ai nhắc, có dòng media_files cũ  → XOÁ tệp + dòng
mk bai-viet/2025/01/eeee0005.webp     # cũ, không ai nhắc, không có dòng           → XOÁ tệp
mk bai-viet/2025/01/eeee0006.webp new # MỚI, không ai nhắc                         → GIỮ (chưa đủ 7 ngày)
mk tai-nguyen/2025/01/eeee0009.pdf    # tệp cũ nhưng dòng media_files mới tạo      → GIỮ
docker compose -f /root/Website-Thanh-ni-n-Tr-ng-h-c/docker-compose.yml exec -T db psql -U postgres -d tnth_test -v ON_ERROR_STOP=1 <<'SQL'
SET ROLE coder_dev;
-- Bảng tạm của nhóm E (xoá sau khi thử): mô phỏng cột text + jsonb có đường dẫn tệp
CREATE TABLE IF NOT EXISTS e_test_refs (id int primary key, body text, media jsonb);
DELETE FROM e_test_refs;
INSERT INTO e_test_refs VALUES
  (1, E'Nội dung\n![ảnh](/uploads/bai-viet/2025/01/eeee0001.webp)\nXem https://thanhnientruonghoc.vn/uploads/van-ban/2025/01/eeee0003.pdf.', '[{"dataUrl":"/uploads/dien-dan/2025/01/eeee0002.mp4","name":"v.mp4"}]'),
  (2, 'Báo cáo /uploads/du-an/2025/01/eeee0008.pdf', null);
DELETE FROM media_files WHERE path LIKE '/uploads/%/2025/01/eeee%';
INSERT INTO media_files (path, sha256, kind, mime_type, size_bytes, created_at) VALUES
  ('/uploads/tai-nguyen/2025/01/eeee0004.pdf', repeat('e',64), 'tai-nguyen', 'application/pdf', 2048, now() - interval '30 days'),
  ('/uploads/du-an/2025/01/eeee0007.pdf',      repeat('e',64), 'du-an',      'application/pdf', 2048, now() - interval '30 days'),
  ('/uploads/du-an/2025/01/eeee0008.pdf',      repeat('e',64), 'du-an',      'application/pdf', 2048, now() - interval '30 days'),
  ('/uploads/tai-nguyen/2025/01/eeee0009.pdf', repeat('e',64), 'tai-nguyen', 'application/pdf', 2048, now());
SQL
find $U -type f | sort
