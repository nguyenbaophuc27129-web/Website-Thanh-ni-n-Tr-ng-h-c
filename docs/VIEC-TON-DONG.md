# Việc còn tồn đọng (cập nhật 26/10/2026, chiều)

DB chính thức vẫn là `tnth_dev` — chủ dự án quyết định **không chuyển sang `tnth_prod`** (bỏ mục chuẩn bị `tnth_prod` cũ). Bộ kiểm thử dùng lại được: `scripts/kiem-thu/README.md`.

## Đợt 1 (sáng 26/10, đã triển khai — merge `ae7a49c`, migration tới `0027`)
- Ảnh/video/văn bản lưu ở `/srv/tnth/uploads`, Caddy phục vụ `/uploads/*`; không còn base64 trong DB (`DEPLOY.md` mục "Tệp tải lên").
- Bỏ nhuận bút (cột đã xoá ở `0025`); trang Trực tiếp hiện số đơn vị thật.
- Client chỉ gửi **dòng mới/đổi** (`src/lib/store-context.tsx`); khách & đoàn viên ghi qua API riêng; cán bộ ghi qua `/api/store` bị kiểm quyền + phạm vi từng dòng (`store-write-policy.ts`), ghi `audit_logs`; dữ liệu đọc lọc theo người xem (`store-read-policy.ts`).
- `fetch-article` chỉ cán bộ; `/api/ai/*` bắt buộc đăng nhập + giới hạn tần suất.

## Đợt 2 (chiều 26/10, CHƯA triển khai — cần migration `0028` + khởi động lại Caddy)
- **Kho tài nguyên**: một tài nguyên gồm tối đa 10 tệp (`resources.attachments jsonb`, `contributor_name` — migration `0028`); đóng góp nhiều tệp (hook `src/lib/use-multi-upload.ts` + `src/components/ui/multi-upload.tsx`); trang chi tiết `/tai-nguyen/[id]` (và `/tai-nguyen/vb-<id>` cho văn bản) hiện người đóng góp, xem trước ảnh/PDF/video; tải tất cả `.zip` (`/api/tai-nguyen/[id]/zip`, `src/lib/server/zip-stream.ts`); đếm lượt tải thật (`/api/tai-nguyen/[id]/luot-tai`); `/van-ban` tải tệp thật; luật ghi chặn `javascript:`/URL ngoài ở `file_data_url`, `video_url`, `attachments`.
- Chốt chặn chính sách: `scripts/kiem-thu/kiem-chinh-sach.mts` (mọi entity phải có luật đọc + ghi hoặc khai rõ cố ý không); `/api/store` cảnh báo khi nạp nếu thiếu.
- `/api/accounts` chỉ được gọi/poll với TW/Tỉnh/Cấp 3 (`ACCOUNT_ADMIN_ROLES`); GET quyền gán riêng chỉ cho chính mình hoặc người có quyền phân quyền tài khoản đó.
- Diễn đàn: cán bộ kiểm duyệt qua `/api/dien-dan/kiem-duyet`; `/api/store` không còn ghi `forumThreads`/`forumComments`; cán bộ ngoài TW bị che `authorAccountId`/`likedByAccountIds` (hàm che hợp nhất ở `src/lib/server/forum-view.ts`).
- Điểm danh: bật/tắt từng hoạt động qua `/api/diem-danh/mo-dong` (khoá dòng setting, không đè nhau).
- `created_by` của tasks/reports/documents/activities lấy từ người ghi (`derive` có `actor`); bỏ câu UPDATE vá.
- Chat AI của khách: 10 lượt/IP/10 phút + trần chung 150. IP thật lấy từ header `X-Client-Ip` do Caddy ghi (`deploy/Caddyfile`, `src/lib/server/client-ip.ts`); đăng nhập và đếm lượt tải cũng dùng IP này.
- Giới hạn dung lượng theo loại tệp (`KIND_RULES.maxBytesByClass`; diễn đàn: ảnh ≤2MB, video ≤15MB, kiểm ở server).
- Sửa 12 lỗi `rules-of-hooks` (5 trang quản trị); ESLint còn 32 lỗi, 100 cảnh báo (trước 44 lỗi).
- **Sửa leo thang quyền** ở `/api/accounts/[id]/permissions` (trước đây tài khoản Tỉnh tự gán được `*`): chỉ người có toàn quyền `*` mới gán `*` / tự phân quyền cho mình; người có `system.account.manage` chỉ phân quyền cho tài khoản trong phạm vi quản lý (cùng luật sửa/xoá — `src/lib/server/account-scope.ts`), không tự phân quyền, và chỉ được thêm/bớt quyền mình đang có hoặc quyền mặc định của vai trò người được gán; mỗi lần đổi ghi `audit_logs` (`ACCOUNT_PERMISSIONS_SET`). Ảnh hưởng: tài khoản TW được gán quyền riêng mà không có `*` (vd. `phanbaoanh`) không còn tự gán `*`; `QUAN_TRI_CAP3` mặc định không có `system.account.manage` nên không phân quyền được (trang phân quyền vốn đã yêu cầu quyền này). Kịch bản `e2e/h-phan-quyen.mjs` 28/28.
- Tài liệu: `DOCS_HE_THONG_LOGIC_VA_DB.md` mục 4.4 (đồng bộ + phân quyền), `docs/de-xuat-luu-tru-file.md` thành ghi chú "đã triển khai".
- Kiểm thử trên `tnth_test` (code đã gộp): p0 6/6, a-api 60/60, a-ui 23/23, b-api 56/56, b-forum 22/22, c-api 53/53, c-ui 24/24, d-snapshot 81/81, d-pages 160/160, e-api 28/28, e-chat-widget 7/7, f-tai-nguyen 115/115, g-kiem-duyet-diem-danh 90/90, sec-smoke 35/35, h-phan-quyen 28/28, kiem-chinh-sach 37/37.

**Khi triển khai đợt 2:** sao lưu (`deploy/db-backup.sh`) → áp `0028` vào `tnth_dev` (`scripts/db-migrate.mjs` hoặc psql với `SET ROLE coder_dev`) → `deploy/deploy.sh` → `docker compose restart proxy` (Caddy nhận header `X-Client-Ip`; chưa restart thì mọi khách bị gộp chung một hạn mức chat AI). Báo lập trình viên: `moderateForumItem` và `toggleAttendance` đổi chữ ký (async, gọi API riêng); diễn đàn không ghi qua `/api/store` nữa.

## Ưu tiên cao
1. **Trang quản trị `quan-tri/tai-nguyen`** (để sau theo quyết định chủ dự án): vẫn tách mỗi tệp thành một tài nguyên; nên chuyển sang dùng `useMultiUpload` + `attachments` như trang đóng góp.
2. **Cấp 3 chấm điểm**: server cho `QUAN_TRI_CAP3` chấm đơn vị cấp dưới, giao diện `quan-tri/nhiem-vu/cham-diem` chỉ hiện nút "Lưu điểm" cho TW/Tỉnh/`score.manage`. Cần quyết nghiệp vụ: mở nút cho cấp 3 hay siết server.
3. **Xác nhận nghiệp vụ các chỗ cố ý thu hẹp quyền đọc**: biểu đồ xu hướng `/quan-tri/thong-ke` chỉ tính trong cây đơn vị; cán bộ cấp dưới không thấy thông báo người khác, phân công ông/bà, xếp hạng nháp của TW, danh bạ ngoài cây; `DON_VI`/`BIEN_TAP_VIEN` không nhận phản ánh. Thêm: kiểm duyệt diễn đàn chỉ người có `forum.manage` (mặc định chỉ TW), không phân theo đơn vị; `/api/dien-dan/thich|binh-luan` trên bài đang ẩn nay chỉ cho người có `forum.manage`.
4. `accountByOrgUnit` vẫn không tìm được tài khoản với `DON_VI`/`BTV` (họ không đọc `/api/accounts`) → thao tác của họ không sinh thông báo. Giải cùng mục 5.

## Bảo mật còn hở
5. **Thông báo**: cán bộ tạo được thông báo gửi cho bất kỳ tài khoản nào. Nên chuyển việc sinh thông báo về server.
6. **Phản ánh không có cột đơn vị** → không kiểm được phạm vi ghi; quyền đọc của cán bộ suy theo người được giao / địa bàn / ô "Đoàn tỉnh" người gửi tự gõ. Nên thêm cột đơn vị tiếp nhận.
7. **Bộ đếm giới hạn tần suất + chống đếm trùng lượt tải nằm trong bộ nhớ** (về 0 khi khởi động lại web). Nên chuyển sang Postgres nếu cần chính xác.
8. Danh sách IP máy chủ OneShield ghi cứng trong `deploy/Caddyfile` (`@oneshield`): OneShield thêm máy chủ mới thì người dùng qua máy đó bị gộp theo IP OneShield (chặt hơn, không lỏng hơn) cho tới khi bổ sung.
9. **Id do trình duyệt sinh** (thời gian + ngẫu nhiên) — về lâu dài nên để server sinh id.

## Lỗi / kỹ thuật
10. **Gửi lại 39 dòng `tasks` một lần** khi mở vài trang (`/quan-tri/nhiem-vu`, `cham-diem`, `truc-tiep`) — chưa rõ nguyên nhân (có thể lệch định dạng một trường); server bỏ qua dòng không đổi nên vô hại.
11. **Vòng nạp lại 4 giây vẫn tải toàn bộ snapshot** (đã dừng khi tab ẩn). Nên đổi sang chỉ tải phần thay đổi (`?since=`) khi dữ liệu lớn.
12. ESLint còn 32 lỗi (chủ yếu `set-state-in-effect` 19, `no-unescaped-entities` 4), không gây lỗi chạy; sửa dần.
13. Chưa thử nhánh "tạo hồ sơ HS3T mới" trên DB thử (các tài khoản thử đã có hồ sơ).
14. Lượt thi đang làm dở trước lần triển khai 26/10 sáng không nộp được (không có mã bí mật) — chỉ ảnh hưởng một lần.

## Vận hành
15. **Dọn tệp mồ côi** (`scripts/clean-orphan-media.mts`) chưa đặt lịch. Chỉ chạy với `DATABASE_URL` của `tnth_dev`; có chốt chặn 50%, không dùng `--force` khi chưa hiểu vì sao bị chặn.
16. **Bản sao lưu nằm cùng ổ đĩa** với DB và tệp — cần chép ra nơi khác (cần chọn nơi lưu: Drive/S3/VPS khác).
17. **SEO**: `deploy/Caddyfile` vẫn gắn `noindex` mọi trang trừ trang chủ (chờ nội dung thật); `src/lib/seo.ts` chưa đọc bài từ DB cho sitemap.
