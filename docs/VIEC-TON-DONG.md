# Việc còn tồn đọng (cập nhật 26/10/2026)

Sau đợt sửa lưu dữ liệu, lưu tệp trên máy chủ và bảo mật `/api/store` (các commit từ `a81b4ee` đến merge `ae7a49c`, đã triển khai lên thanhnientruonghoc.io.vn — DB `tnth_dev`, migration tới `0027`). Bộ kiểm thử dùng lại được: `scripts/kiem-thu/README.md`.

## Đã làm trong đợt này (để đối chiếu)
- Ảnh/video/văn bản lưu ở `/srv/tnth/uploads`, Caddy phục vụ `/uploads/*`; không còn base64 trong DB (`DEPLOY.md` mục "Tệp tải lên").
- Bỏ nhuận bút (cột đã xoá ở `0025`); trang Trực tiếp hiện số đơn vị thật.
- Khôi phục lưu dữ liệu: commit `0065d65` đã bỏ bộ theo dõi thay đổi nên gần như không gì được ghi DB. Nay client chỉ gửi **dòng mới/đổi** (`src/lib/store-context.tsx`).
- Khách & đoàn viên ghi qua API riêng (`/api/phan-anh`, `/api/diem-danh`, `/api/thi/*`, `/api/dien-dan/*`, `/api/dong-gop`, `/api/tai-nguyen/dong-gop`, `/api/du-an`, `/api/hs3t/*`); server tự chấm điểm thi, tự kiểm duyệt.
- Cán bộ ghi qua `/api/store` bị kiểm quyền + phạm vi đơn vị từng dòng (`src/lib/server/store-write-policy.ts`), ghi `audit_logs`.
- Dữ liệu đọc lọc theo người xem (`src/lib/server/store-read-policy.ts`); thống kê công khai qua `/api/thong-ke`.
- `fetch-article` chỉ cán bộ; `/api/ai/*` bắt buộc đăng nhập + giới hạn tần suất (`src/lib/server/require-session.ts`).

## Ưu tiên cao
1. **Báo lập trình viên về cơ chế đồng bộ mới** trước khi họ sửa tiếp `store-context.tsx`: không được bỏ bộ theo dõi dòng; thao tác của khách/đoàn viên phải đi qua API riêng + `adoptServerRows`; thêm entity mới phải khai cả chính sách đọc (`store-read-policy.ts`) lẫn ghi (`store-write-policy.ts`) — thiếu luật thì cán bộ cấp dưới không đọc/ghi được.
2. **Trước khi chuyển sang `tnth_prod`:** áp migration `0018`–`0027` (0021 cần đơn vị id 1 trước), cấp cho `tnth_app` quyền `INSERT` vào `audit_logs` (nếu thiếu, nhật ký không ghi — chỉ có cảnh báo trong log), chép thư mục `/srv/tnth/uploads` đúng DB tương ứng.
3. **`/api/accounts`**: trình duyệt gọi mỗi 4 giây, trả 401/403 cho khách, đoàn viên, `DON_VI`, `BIEN_TAP_VIEN` (tốn tài nguyên, rác log). Hệ quả phụ: `accountByOrgUnit` không tìm được tài khoản nên thao tác của `DON_VI`/`BTV` không sinh thông báo. Cần rà luôn route này về lộ dữ liệu tài khoản.
4. **Cấp 3 chấm điểm**: server đã cho `QUAN_TRI_CAP3` (quyền `score.view`) chấm đơn vị cấp dưới, nhưng giao diện `quan-tri/nhiem-vu/cham-diem` chỉ hiện nút "Lưu điểm" cho TW/Tỉnh/`score.manage`. Cần quyết nghiệp vụ: mở nút cho cấp 3 hay siết server lại.
5. **Xác nhận nghiệp vụ các chỗ cố ý thu hẹp quyền đọc** (nhóm D): biểu đồ xu hướng ở `/quan-tri/thong-ke` nay chỉ tính trong cây đơn vị; cán bộ cấp dưới không thấy thông báo người khác, phân công ông/bà, xếp hạng nháp của TW, danh bạ ngoài cây; `DON_VI`/`BIEN_TAP_VIEN` (quyền mặc định) không nhận phản ánh.

## Bảo mật còn hở
6. **Diễn đàn với cán bộ ngoài TW chưa được che** `authorAccountId`/`likedByAccountIds` (khách/đoàn viên đã che). Lý do: duyệt bài diễn đàn của cán bộ vẫn ghi cả dòng qua `/api/store`, che cột sẽ làm UPSERT đè mất dữ liệu. Muốn che: chuyển `moderateForumItem` sang API riêng rồi áp hàm che (`maskForum` trong `store-read-policy.ts` / `viewForumRow` trong `src/lib/server/forum-view.ts` — nên hợp nhất làm một).
7. **Thông báo**: cán bộ tạo được thông báo gửi cho bất kỳ tài khoản nào (cần cho các tác dụng phụ hiện có). Nên chuyển việc sinh thông báo về server.
8. **Phản ánh không có cột đơn vị** → không kiểm được phạm vi ghi theo đơn vị; quyền đọc của cán bộ đang suy theo người được giao / địa bàn / ô "Đoàn tỉnh" người gửi tự gõ. Nên thêm cột đơn vị tiếp nhận.
9. **Ảnh diễn đàn ≤2MB chỉ kiểm ở trình duyệt**; `/api/uploads` cho phân hệ `dien-dan` tới 15MB.
10. **Bộ đếm giới hạn tần suất nằm trong bộ nhớ** (về 0 khi khởi động lại web). Hạn mức chung của khách cho chat AI (30 lượt/10 phút) có thể bị một người dùng cạn → mọi khách chỉ nhận gợi ý tự động tối đa 10 phút.
11. **Id do trình duyệt sinh** (thời gian + ngẫu nhiên) — đã giảm trùng nhưng về lâu dài nên để server sinh id.

## Lỗi / kỹ thuật
12. **Gửi lại 39 dòng `tasks` một lần** khi mở vài trang (`/quan-tri/nhiem-vu`, `cham-diem`, `truc-tiep`) — chưa tìm ra nguyên nhân (có thể so khớp lệch định dạng một trường). Hiện vô hại: server so với DB và bỏ qua dòng không đổi (`skipped`).
13. **Vòng nạp lại 4 giây vẫn tải toàn bộ snapshot** (đã dừng khi tab ẩn). Nên đổi sang chỉ tải phần thay đổi (`?since=`) khi dữ liệu lớn dần.
14. **`derive` trong `ENTITY_SPECS`** của `tasks`/`reports`/`documents` vẫn ghi `created_by` = 1; route đang sửa lại bằng câu UPDATE sau khi ghi — nên sửa tận gốc ở `store-tables.ts`.
15. **Mở/đóng điểm danh gửi cả chuỗi `attendance_open_ids`**: hai đơn vị bật cùng lúc thì bên sau có thể bị 403 (client báo lỗi rồi nạp lại). Nên tách thành API bật/tắt từng hoạt động.
16. **43 lỗi ESLint có sẵn** (không phát sinh trong đợt này), đáng chú ý `react-hooks/rules-of-hooks` ở `src/app/(dashboard)/quan-tri/hs3t/page.tsx` (dòng ~87–111) — có thể gây lỗi thật khi render.
17. Chưa thử nhánh "tạo hồ sơ HS3T mới" trên DB thử (các tài khoản thử đã có hồ sơ).
18. Lượt thi đang làm dở trước lần triển khai 26/10 không nộp được (không có mã bí mật) — chỉ ảnh hưởng một lần.

## Vận hành
19. **Dọn tệp mồ côi** (`scripts/clean-orphan-media.mts`) chưa đặt lịch. Chỉ chạy với `DATABASE_URL` của DB đang dùng thư mục tệp (hiện `tnth_dev`); có chốt chặn 50%, không dùng `--force` khi chưa hiểu vì sao bị chặn.
20. **Bản sao lưu nằm cùng ổ đĩa** với DB và tệp — cần chép ra nơi khác.
21. **SEO**: `deploy/Caddyfile` vẫn gắn `noindex` mọi trang trừ trang chủ (chờ nội dung thật); `src/lib/seo.ts` chưa đọc bài từ DB cho sitemap.
22. `docs/de-xuat-luu-tru-file.md` là đề xuất cũ về lưu tệp — đối chiếu với cách đã triển khai (`DEPLOY.md` mục "Tệp tải lên") rồi cập nhật hoặc xoá. `DOCS_HE_THONG_LOGIC_VA_DB.md` cần bổ sung cơ chế đồng bộ/phân quyền mới.

## Bộ kiểm thử
23. Ba kịch bản cần sửa cho khớp chính sách đã gộp (không phải lỗi hệ thống): `a-api.mjs` kiểm `liveEvents` bằng snapshot khách (nay khách không nhận — kiểm bằng `t.tw`); `c-api.mjs` mục "gửi lại dòng không đổi của đơn vị khác" lấy dòng từ snapshot `t.donvi` (nay không còn thấy hoạt động đó — lấy từ `t.tw`); `sec-smoke.mjs` mục "cấp 3 chấm cấp dưới" thiếu `maxPoints` trong dòng điểm.
