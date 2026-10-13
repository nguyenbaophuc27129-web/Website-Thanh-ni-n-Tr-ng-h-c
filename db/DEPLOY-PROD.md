# Triển khai DB lên tnth_prod — tài liệu cho chủ dự án

Tài liệu này gói lại toàn bộ thay đổi DB so với schema v1 ban đầu để anh chạy
migration trên **tnth_prod** khi đưa hệ thống vào chính thức. Toàn bộ file đã
commit trên repo, không có gì chỉ tồn tại trong tnth_dev.

## 1. Các file migration cần chạy (theo đúng thứ tự)

| File | Nội dung |
|---|---|
| `0002_tai_khoan_phien.sql` | Bỏ UNIQUE `accounts.org_unit_id` (cho phép nhiều TK/đơn vị + TK đoàn viên cá nhân); thêm `role_code` (CHECK 6 vai trò), `class_name`; bảng `auth_sessions` (lưu SHA-256 refresh token) |
| `0003_dien_dan.sql` | `forum_threads`, `forum_comments` — diễn đàn ẩn danh (alias, media jsonb, liked_account_ids, ai_verdict, status kiểm duyệt) |
| `0004_hs3t.sql` | `hs3t_profiles`, `hs3t_achievements`, `hs3t_unit_standards` — Học sinh 3 tốt theo QĐ 317 + TB 630/2025 |
| `0005_thi_truc_tuyen.sql` | `quiz_questions` (7 dạng câu), `quiz_exams` (sinh đề theo chuyên mục, adaptive), `quiz_attempts` |
| `0006_du_an_tai_tro.sql` | `volunteer_projects` (kèm toạ độ bản đồ, file báo cáo), `sponsors` |
| `0007_cong_dong.sql` | `org_directory`, `live_events`, `attendances`, `member_contributions`, `contribution_logs`, `email_logs` |
| `0008_mo_rong_xuat_ban.sql` | Mở rộng `published_posts` (tác giả đơn vị, người đóng góp, chuyên mục, ảnh cover); `resources` cho phép file trỏ bảng files hoặc lưu trực tiếp + video_url; `resource_types.short_name`; CHECK `notifications.notification_type` nới từ 10 → 15 loại |
| `0009_seed_danh_muc.sql` | Seed danh mục: `school_types` 5 loại, `resource_types` 6 nhóm, `roles` 6 vai trò (khớp `src/data/`) — idempotent ON CONFLICT DO NOTHING |
| `0010_bo_sung_cot_store.sql` | Bổ sung cột cho sync store: `attendances.org_unit_id`, `member_contributions.*`, `feedbacks.tracking_code` UNIQUE… — đáp ứng đầy đủ các trường client đang dùng |
| `0011_seed_danh_muc_noi_dung.sql` | Seed danh mục nội dung id khớp app: `content_categories` 8, `document_categories` 6, `feedback_topics` 7 — id tường minh + ON CONFLICT (code) DO UPDATE, idempotent |
| `0012_xoa_nha_tai_tro.sql` | **Bãi bỏ chức năng nhà tài trợ** (quyết định giai đoạn 01) — drop bảng `sponsors`; web đã xoá toàn bộ trang quản trị + dải hiển thị tương ứng |
| `0013_task_metrics_name_text.sql` | Nới `task_metrics.name` varchar(255) → text — BTS 2027 có tên chỉ tiêu dài 269–376 ký tự (trích nguyên văn Excel phân tích KPI), AI lượng hoá công văn cũng tạo tên dài tương tự |

## 2. Cách chạy trên tnth_prod

```bash
# Khi đã cấu hình DATABASE_URL trỏ tnth_prod:
node scripts/db-migrate.mjs          # áp các file chưa chạy, ghi bảng schema_migrations
node scripts/db-migrate.mjs --list   # xem trạng thái đã áp
```

- Mỗi file chạy trong 1 transaction; mọi file đều viết idempotent — chạy lại không lỗi.
- Chỉ nên dùng tài khoản **coder_readonly để đối chiếu**; chạy migration cần tài khoản
  có quyền DDL trên tnth_prod (chủ dự án).

### 2.1. Nạp dữ liệu ban đầu (chạy 1 LẦN khi khởi tạo)

CSDL prod khởi tạo trống (chưa có cây đơn vị) → web chưa đăng nhập được qua DB
và chức năng đồng bộ chưa chạy. Nạp cây 4 cấp + tài khoản ban đầu:

```bash
node scripts/db-seed-dev.mts     # idempotent — chỉ nên chạy 1 lần lúc khởi tạo
```

Script nạp: 28 đơn vị 4 cấp, tài khoản `tw.admin` + các TK demo (`demo123`),
2 học sinh mô phỏng `hs.mophong1/2` (ids 901/902 — hồ sơ HS3T mẫu gắn vào đây).
Sau khi vận hành thật **không chạy lại** (sẽ đè mật khẩu đã đổi).

## 3. Thay đổi so với schema ban đầu (điểm cần biết)

1. **accounts KHÔNG có cột `role` như đặc tả** → dùng `role_code` (migration 0002).
2. **Bỏ ràng buộc 1 đơn vị = 1 tài khoản** (`accounts_org_unit_id_key`) — hệ thống có
   TK đoàn viên cá nhân và nhiều TK cùng đơn vị, đúng hướng ghi trong mục "Khoảng trống".
3. **Cột id của `org_units`/`accounts`/`school_types` là IDENTITY GENERATED ALWAYS**:
   nạp dữ liệu với id tường minh phải `OVERRIDING SYSTEM VALUE` và cần
   `setval(pg_get_serial_sequence(...), max(id))` sau khi nạp để tránh trùng id.
4. **`pg` trả bigint dạng string** ở tầng driver — lớp truy cập app đã ép `Number()`.
5. Danh mục mở rộng so với đặc tả: 5 loại hình trường (thay 3), 6 nhóm tài nguyên.
6. Phiên đăng nhập mục 8.4 của đặc tả đã cụ thể hoá bằng bảng `auth_sessions`
   + cookie httpOnly (token thô nằm ở client, DB chỉ lưu SHA-256).
7. **Chưa đụng**: phân vùng tháng `post_views`/`audit_logs`, materialized view,
   `account_roles` (app đang dùng `accounts.role_code` — nếu anh muốn chuẩn hoá
   nhiều vai trò/TK thì báo để làm tiếp).

## 4. Web app đã nối DB tới đâu

- ✅ **Đăng nhập/phiên/đăng xuất** qua bảng `accounts` + `auth_sessions`
  (`src/lib/db.ts`, `src/lib/server/auth.ts`, `api/auth/*`) — web tự fallback
  localStorage khi chưa nối DB nên demo không gãy.
- ✅ **Toàn bộ store dữ liệu ↔ DB** qua API `api/store` (GET snapshot /
  POST sync 35 entity trong 1 transaction): phản ánh, diễn đàn, HS3T, thi,
  hoạt động, xuất bản, công văn/thi đua 8 bảng, văn bản, thông báo, dự án TN,
  tài nguyên… Khi web mở lên, `store-context` nạp snapshot từ DB (DB thắng khi
  có dữ liệu); mọi thay đổi phía client tự đẩy về DB theo nhóm kín khoá ngoại
  sau 1,2 giây. Nếu DB còn trống và đăng nhập bằng quản trị, app tự đẩy dữ
  liệu mẫu lên trong lần truy cập đầu (điều kiện: đã nạp tài khoản ban đầu —
  mục 2.1, vì đồng bộ cần phiên đăng nhập qua DB).
- ✅ **Đã kiểm chứng tròn chuyến 35/35 entity** trên tnth_dev:
  `node scripts/db-smoke-sync.mts [port]` — 28 bước (login, sync toàn bộ,
  roundtrip kiểu dữ liệu, ghi công khai của khách, đăng ký + khoá TK),
  thoát mã 1 nếu fail.
- ✅ **Tài khoản**: tạo TK quản trị qua `api/accounts` (batch), đăng ký đoàn
  viên công khai qua `api/auth/register`, khoá/mở TK qua PATCH `api/accounts/[id]`.
- ✅ Nạp cây đơn vị + tài khoản mẫu cho tnth_dev: `node scripts/db-seed-dev.mts`
  (**KHÔNG chạy file này trên tnth_prod** — chỉ dành cho tnth_dev).
- Kiểm tra nhanh sau khi chạy migration + khởi động web:
  `node scripts/db-smoke-sync.mts [port]` — 15 bước (login, sync 12 entity,
  roundtrip kiểu dữ liệu, ghi công khai, đăng ký + khoá TK), thoát mã 1 nếu fail.

## 5. Lưu ý bảo mật

- `.env.local` chứa mật khẩu DB đã gitignore từ đầu; chưa từng commit vào repo.
- Nhờ anh **rotate mật khẩu** `coder_dev`/`coder_readonly` khi tiện (đã từng gửi
  qua kênh chat).
