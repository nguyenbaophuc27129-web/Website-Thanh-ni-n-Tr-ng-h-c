# db/ — Schema cơ sở dữ liệu TNTH

## Bố cục

- `schema_v1.sql` — baseline 43 bảng đã có trên server (bản replicate của `tnth_dev`).
  **Không sửa file này** — nó chỉ là mốc gốc.
- `schema_hien_tai.sql` — cấu trúc hiện tại (xuất từ `tnth_dev`, đã gồm migration tới `0029`, 76 bảng kể cả phân vùng) để **cài mới**; không chứa dữ liệu. Xuất lại sau mỗi migration mới: `docker compose exec -T db pg_dump -U postgres -d tnth_dev --schema-only --no-owner --no-privileges`.
- `migrations/` — mọi thay đổi cấu trúc về sau, đánh số tăng dần, chạy theo thứ tự tên file.

## Quy tắc

1. Đổi cấu trúc = tạo file migration mới `migrations/00NN_ten.sql`. Không sửa migration đã chạy.
2. File migration viết **idempotent** (`if exists`, `on conflict do nothing`) — chạy lại không lỗi.
3. `tnth_dev` là nơi thử (có thể bị ghi đè bất cứ lúc nào); chạy trên `tnth_prod` khi đưa vào chính thức.

## Cách chạy

```bash
# cần DATABASE_URL trong .env.local; với tnth_dev mở tunnel trước:
ssh -N tnth-db        # giữ cửa sổ này (không in gì = đúng)

node scripts/db-migrate.mjs --list   # xem trạng thái
node scripts/db-migrate.mjs          # áp các migration chưa chạy
```

Tiến độ đã áp dụng nằm trong bảng `schema_migrations`.

## Danh sách migration

| File | Nội dung |
|------|----------|
| `0002_tai_khoan_phien.sql` | Bỏ UNIQUE `accounts.org_unit_id`; thêm `role_code`, `class_name`; bảng `auth_sessions` (refresh token) |
| `0003_dien_dan.sql` | `forum_threads`, `forum_comments` — diễn đàn ẩn danh có AI kiểm duyệt |
| `0004_hs3t.sql` | `hs3t_profiles`, `hs3t_achievements`, `hs3t_unit_standards` — Học sinh 3 tốt (QĐ 317 + TB 630/2025) |
| `0005_thi_truc_tuyen.sql` | `quiz_questions`, `quiz_exams`, `quiz_attempts` |
| `0006_du_an_tai_tro.sql` | `volunteer_projects`, `sponsors` |
| `0007_cong_dong.sql` | `org_directory`, `live_events`, `attendances`, `member_contributions`, `contribution_logs`, `email_logs` |
| `0008_mo_rong_xuat_ban.sql` | Mở rộng `published_posts`, `resources`, `resource_types`; nới CHECK `notifications.notification_type` thêm 5 loại mới |
| `0009_seed_danh_muc.sql` | Seed `school_types` (5 loại), `resource_types` (6 nhóm), `roles` (6 vai trò) |

## Công cụ kèm theo

- `node scripts/db-check.mjs` — kiểm tra kết nối + đếm bảng.
- `node scripts/db-introspect.mjs [bảng…]` — soi cột/ràng buộc thật của bảng trên server.
