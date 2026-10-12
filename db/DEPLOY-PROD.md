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

## 2. Cách chạy trên tnth_prod

```bash
# Khi đã cấu hình DATABASE_URL trỏ tnth_prod:
node scripts/db-migrate.mjs          # áp các file chưa chạy, ghi bảng schema_migrations
node scripts/db-migrate.mjs --list   # xem trạng thái đã áp
```

- Mỗi file chạy trong 1 transaction; mọi file đều viết idempotent — chạy lại không lỗi.
- Chỉ nên dùng tài khoản **coder_readonly để đối chiếu**; chạy migration cần tài khoản
  có quyền DDL trên tnth_prod (chủ dự án).

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

- ✅ Đăng nhập/phiên/đăng xuất thật qua bảng `accounts` + `auth_sessions`
  (`src/lib/db.ts`, `src/lib/server/auth.ts`, `api/auth/*`) — web tự fallback
  localStorage khi chưa nối DB nên demo không gãy.
- ✅ Nạp cây đơn vị + tài khoản mẫu cho tnth_dev: `node scripts/db-seed-dev.mts`
  (**KHÔNG chạy file này trên tnth_prod** — chỉ dành cho tnth_dev).
- ⏳ Các module nghiệp vụ còn đọc localStorage, sẽ chuyển dần theo từng cụm
  (accounts/org_units → phản ánh → diễn đàn → HS3T → thi…) — schema đã đủ 100%.

## 5. Lưu ý bảo mật

- `.env.local` chứa mật khẩu DB đã gitignore từ đầu; chưa từng commit vào repo.
- Nhờ anh **rotate mật khẩu** `coder_dev`/`coder_readonly` khi tiện (đã từng gửi
  qua kênh chat).
