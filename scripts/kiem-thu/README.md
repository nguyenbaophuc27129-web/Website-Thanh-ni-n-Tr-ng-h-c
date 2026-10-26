# Bộ kiểm thử bảo mật & đồng bộ dữ liệu

Chạy trên **web thử** (container `tnth-web-thu`, chỉ nghe `127.0.0.1`) với **DB thử `tnth_test`** — không đụng web thật (`tnth-web-1`) hay `tnth_dev`/`tnth_prod`. Máy chủ không có node: mọi thứ chạy trong Docker.

```bash
scripts/kiem-thu/tao-moi-truong-thu.sh      # tnth_test (sao từ tnth_dev) + 9 tài khoản thử + env
scripts/kiem-thu/psql-test.sh -q < scripts/kiem-thu/seed/a-seed.sql   # dữ liệu thử nhóm A (đề thi, điểm danh…)
scripts/kiem-thu/psql-test.sh -q < scripts/kiem-thu/seed/d-seed.sql   # dữ liệu thử nhóm D (snapshot đa vai trò)
scripts/kiem-thu/web-thu.sh 3100            # build + chạy web thử
scripts/kiem-thu/chay-e2e.sh sec-smoke.mjs  # một kịch bản; xem danh sách bên dưới
scripts/kiem-thu/xoa-moi-truong-thu.sh      # dọn sạch khi xong
```

Tài khoản thử (mật khẩu chung trong `$TNTH_TEST_DIR/test-password.txt`, mặc định `/var/tmp/tnth-kiem-thu`): `t.tw` (TW), `t.tinh` (Nghệ An 131), `t.tinhkhac` (Tuyên Quang 100), `t.cap3` (13101), `t.donvi` (131101), `t.donvi2` (131103), `t.btv` (Biên tập viên, TW), `t.dv1`, `t.dv2` (Đoàn viên 131101).

| Kịch bản | Nội dung | Kết quả chạy 26/10/2026 (code đã gộp đợt 2, `tnth_test` + `0028`) |
|---|---|---|
| `e2e/p0.mjs` | Lưu bài viết: chỉ gửi dòng đổi, F5 không mất, đóng tab vẫn lưu | 6/6 |
| `e2e/a-api.mjs`, `e2e/a-ui.mjs` | Khách: phản ánh (mã ngẫu nhiên), điểm danh, thi (server chấm) | 60/60, 23/23 |
| `b-api.py` (`python3 -I b-api.py http://127.0.0.1:3100`), `e2e/b-forum.mjs` | Đoàn viên: diễn đàn, đóng góp, dự án, HS3T | 56/56, 22/22 |
| `e2e/c-api.mjs`, `e2e/c-ui.mjs` | Phân quyền ghi của cán bộ qua `/api/store` | 53/53, 24/24 |
| `e2e/d-snapshot.mjs`, `e2e/d-pages.mjs` | Dữ liệu đọc theo vai trò; quét 40 trang × vai trò | 81/81, 160/160 |
| `e-api.sh` (`BASE=… bash e-api.sh`), `e2e/e-chat-widget.mjs` | fetch-article / AI: đăng nhập + giới hạn tần suất | 28/28, 7/7 |
| `e2e/f-tai-nguyen.mjs` | Kho tài nguyên nhiều tệp: đóng góp 3–10 tệp (tải song song ≤3), từ chối 11 tệp/url giả/url ngoài, duyệt, trang chi tiết (ảnh, PDF, 360px), tải `.zip` (CRC, tên tiếng Việt, trùng tên, thiếu tệp), đếm lượt tải chống trùng, chặn XSS ở luật ghi cán bộ, `/van-ban` tải thật. Cần áp migration 0028; ghi gói zip vào `e2e/out/` để chạy `unzip -t` | 115/115 |
| `e2e/sec-smoke.mjs` | Tổng hợp ~35 kịch bản tấn công | 35/35 |
| `e2e/i-trinh-soan-thao.mjs` | Trình soạn thảo bài viết: chốt chặn `content_doc` ở `/api/store` (link `javascript:`, ảnh ngoài/data:, thuộc tính/khối lạ — chặn cả TW), soạn bằng giao diện (H2, đậm, canh đều, gõ `/` chèn bảng, ảnh hiện ngay rồi tải lên, độ rộng/vị trí/chú thích, ảnh dài vẫn chỉnh được), dán Word (danh sách `mso-list`, canh giữa, bỏ ảnh `file://`) và Google Docs, link; trang tin (ảnh không cắt/không kéo giãn, canh lề, bảng, phóng to, 360px), bài Markdown cũ hiển thị + mở sửa chuyển sang tài liệu. Cần migration 0029 | 56/56 |
| `e2e/h-phan-quyen.mjs` | Phân quyền tài khoản: tỉnh không tự gán `*`/tự phân quyền, không gán ngoài cây, không thêm/bớt quyền mình không có; cấp 3/đơn vị/BTV bị 403; TW toàn quyền vẫn gán được; mã trùng/mã sai | 28/28 |
| `e2e/g-kiem-duyet-diem-danh.mjs` | Cán bộ: kiểm duyệt diễn đàn qua `/api/dien-dan/kiem-duyet` (TW được, tỉnh/cấp 3/đơn vị không có `forum.manage` bị 403), cán bộ ngoài TW không thấy `authorAccountId`/`likedByAccountIds`, `/api/store` từ chối UPSERT diễn đàn; bật/tắt điểm danh từng hoạt động qua `/api/diem-danh/mo-dong` (3 bên cùng lúc không đè nhau, ngoài phạm vi 403); `created_by` của tasks/reports/documents mới = người tạo | 90/90 |

Web thử không đi qua Caddy nên không có header `X-Client-Ip`: mọi khách gộp chung khoá "unknown" (chat khách 10 lượt/10 phút) — `e-api.sh` đã tính theo cách này.

`e-api.sh` cố ý làm cạn hạn mức AI/fetch-article — chạy cuối, hoặc khởi động lại web thử trước khi chạy kịch bản khác.

## Chốt chặn chính sách đọc/ghi (không cần DB, web thử hay môi trường thử)

`kiem-chinh-sach.mts` kiểm **mọi entity** trong `ENTITY_SPECS` (`src/lib/server/store-tables.ts`) đều có luật ghi trong `store-write-policy.ts` và luật đọc cho từng nhóm người xem (khách, đoàn viên, cán bộ cấp dưới) trong `store-read-policy.ts`. Entity cố ý không cho ghi/đọc phải khai rõ ở `WRITE_DENIED_BY_DESIGN`/`READ_DENIED_BY_DESIGN` trong `src/lib/server/store-policy-audit.ts` — không để ngầm định. Thiếu thì thoát mã 1 và liệt kê từng chỗ thiếu.

```bash
docker build --target builder -t tnth-builder:chinhsach .
docker run --rm -v "$PWD/scripts:/app/scripts:ro" tnth-builder:chinhsach \
  node --no-warnings --import ./scripts/kiem-thu/alias-loader.mjs scripts/kiem-thu/kiem-chinh-sach.mts
```

`kiem-noi-dung-bai.mts` kiểm lõi trình soạn thảo (`src/lib/editor/`): chuyển Markdown cũ, rút văn bản thuần, chốt chặn `validatePostDoc`; thêm tệp JSON bài thật (`[{id, content}]`, gắn vào `/bai-cu.json` và truyền làm tham số) để kiểm bài đang có chuyển được không mất chữ/ảnh:

```bash
docker run --rm -v "$PWD/scripts:/app/scripts:ro" tnth-builder:chinhsach \
  node --no-warnings --import ./scripts/kiem-thu/alias-loader.mjs scripts/kiem-thu/kiem-noi-dung-bai.mts
```

(Thư mục `scripts/` bị `.dockerignore` loại khỏi image nên phải gắn vào.) `alias-loader.mjs` chỉ để node thuần giải được alias `@/` và import không ghi đuôi của mã trong `src/`. **Chạy mỗi khi thêm/sửa entity** (hoặc thêm vào bước kiểm trước khi triển khai). Ngoài ra route `/api/store` cũng ghi cảnh báo `[TNTH][STORE] Thiếu chính sách: …` vào log một lần khi nạp module nếu còn thiếu.

