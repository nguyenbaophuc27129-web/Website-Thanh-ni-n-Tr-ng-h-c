# Hướng Dẫn Triển Khai Cơ Sở Dữ Liệu Sản Phẩm (Production Deployment)

Tài liệu này hướng dẫn triển khai hệ thống Cơ sở dữ liệu và xác thực cho cổng thông tin **Thanh niên Trường học** trên môi trường chính thức (Production).

---

## 1. Yêu Cầu An Toàn & Bảo Mật Nghiêm Ngặt

> [!CAUTION]
> **Tuyệt đối không sử dụng mật khẩu thử nghiệm (`demo123`) trên môi trường thử nghiệm diện rộng hoặc môi trường chính thức.**
> Mọi tài khoản khởi tạo phải tuân thủ chính sách mật khẩu mạnh và đổi mật khẩu ngay lần đầu đăng nhập.

1. **Khởi tạo mật khẩu mạnh**:
   - Tối thiểu 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
   - Tài khoản cán bộ quản trị cấp Trung ương (`QUAN_TRI_TW`), Tỉnh/Thành đoàn (`QUAN_TRI_TINH`) và cấp huyện/xã (`QUAN_TRI_CAP3`) phải được cấp riêng biệt, không dùng chung mật khẩu.
2. **Chính sách bắt buộc đổi mật khẩu (`must_change_password`)**:
   - Khi tạo tài khoản mới qua API quản trị, cờ `must_change_password = true` được kích hoạt tự động.
   - Người dùng bắt buộc phải đổi mật khẩu sang mật khẩu cá nhân an toàn trước khi thực hiện các tác vụ quản trị.
3. **Phân quyền truy cập tầng API (RBAC)**:
   - Các API `/api/accounts` và `/api/accounts/[id]` kiểm tra nghiêm ngặt `session.role` và cây đơn vị (`path`).
   - Tài khoản đoàn viên (`DOAN_VIEN`) hoặc khách vãng lai bị chặn truy cập (403 Forbidden).
   - Tuyệt đối không cho phép tài khoản tự khóa tài khoản của chính mình hoặc khóa tài khoản Quản trị Trung ương tối cao (`tw.admin`, `id=1`).
4. **Bảo vệ toàn vẹn dữ liệu hệ thống (`/api/store`)**:
   - Loại bỏ hoàn toàn cơ chế xoá toàn bộ bảng (`DELETE FROM`). Mọi thao tác cập nhật đồng bộ sử dụng UPSERT (`ON CONFLICT`).
   - Khách vãng lai và đoàn viên bị phân vùng truy cập: chỉ được ghi/đọc dữ liệu hợp lệ (phản ánh cá nhân, kết quả thi, bài viết), không thể xem hoặc ghi đè dữ liệu quản lý, nhiệm vụ, chấm điểm của cán bộ.

---

## 2. Quy Trình Triển Khai Database

### Bước 1: Mở kết nối cơ sở dữ liệu
Thiết lập chuỗi kết nối PostgreSQL chính thức trong biến môi trường `.env.local` hoặc biến môi trường máy chủ:
```bash
DATABASE_URL=postgresql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/tnth_prod?sslmode=require
```

### Bước 2: Kiểm tra trạng thái và áp dụng Migration
Chạy công cụ migration để đảm bảo toàn bộ cấu trúc bảng và chỉ mục được áp dụng đầy đủ:
```bash
node scripts/db-migrate.mjs --list
node scripts/db-migrate.mjs
```

### Bước 3: Khởi tạo tài khoản Quản trị viên Trung ương
Chạy script tạo tài khoản với mật khẩu bảo mật riêng, hoặc cập nhật hash mật khẩu trực tiếp:
```sql
-- Cập nhật mật khẩu quản trị Trung ương an toàn
UPDATE accounts 
SET password_hash = '<BCRYPT_HASH_CUA_MAT_KHAU_MANH>',
    must_change_password = true,
    updated_at = now()
WHERE id = 1;
```

### Bước 4: Kiểm tra kết nối và bảo mật
Chạy script kiểm tra cấu trúc schema và các ràng buộc toàn vẹn:
```bash
node scripts/db-check.mjs
```

---

## 3. Nhật Ký Phân Quyền Vai Trò
- `QUAN_TRI_TW`: Toàn quyền quản trị hệ thống toàn quốc.
- `QUAN_TRI_TINH`: Quản lý dữ liệu và đơn vị trực thuộc trong tỉnh/thành.
- `QUAN_TRI_CAP3`: Quản lý đơn vị cơ sở và đoàn viên trong quận/huyện/xã/phường.
- `DON_VI`: Tài khoản dùng chung của Đoàn cơ sở (trường học, chi đoàn cơ sở).
- `BIEN_TAP_VIEN`: Thẩm định, duyệt và xuất bản tin bài, tài nguyên.
- `DOAN_VIEN`: Học sinh, đoàn viên tham gia diễn đàn, nộp hồ sơ Học sinh 3 tốt, phản ánh học đường.
