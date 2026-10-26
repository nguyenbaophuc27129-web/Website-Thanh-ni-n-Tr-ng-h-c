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

| Kịch bản | Nội dung | Kết quả lần chạy 26/10/2026 |
|---|---|---|
| `e2e/p0.mjs` | Lưu bài viết: chỉ gửi dòng đổi, F5 không mất, đóng tab vẫn lưu | 6/6 |
| `e2e/a-api.mjs`, `e2e/a-ui.mjs` | Khách: phản ánh (mã ngẫu nhiên), điểm danh, thi (server chấm) | 58/60\*, 23/23 |
| `b-api.py` (`python3 -I b-api.py http://127.0.0.1:3100`), `e2e/b-forum.mjs` | Đoàn viên: diễn đàn, đóng góp, dự án, HS3T | 56/56, 22/22 |
| `e2e/c-api.mjs`, `e2e/c-ui.mjs` | Phân quyền ghi của cán bộ qua `/api/store` | 51/52\*, 24/24 |
| `e2e/d-snapshot.mjs`, `e2e/d-pages.mjs` | Dữ liệu đọc theo vai trò; quét 40 trang × vai trò | 81/81, 160/160 |
| `e-api.sh` (`BASE=… bash e-api.sh`), `e2e/e-chat-widget.mjs` | fetch-article / AI: đăng nhập + giới hạn tần suất | 28/28, 7/7 |
| `e2e/f-tai-nguyen.mjs` | Kho tài nguyên nhiều tệp: đóng góp 3–10 tệp (tải song song ≤3), từ chối 11 tệp/url giả/url ngoài, duyệt, trang chi tiết (ảnh, PDF, 360px), tải `.zip` (CRC, tên tiếng Việt, trùng tên, thiếu tệp), đếm lượt tải chống trùng, chặn XSS ở luật ghi cán bộ, `/van-ban` tải thật. Cần áp migration 0028; ghi gói zip vào `e2e/out/` để chạy `unzip -t` | 115/115 |
| `e2e/sec-smoke.mjs` | Tổng hợp ~35 kịch bản tấn công | 34/35\* |

\* Các mục báo hỏng là do kịch bản viết trước khi các chính sách khác được gộp (vd. đọc `liveEvents` bằng tài khoản khách, nay khách không còn nhận) — không phải lỗi; xem `docs/VIEC-TON-DONG.md` mục "Bộ kiểm thử".

`e-api.sh` cố ý làm cạn hạn mức AI/fetch-article — chạy cuối, hoặc khởi động lại web thử trước khi chạy kịch bản khác.
