-- Migration 0042: Tối ưu ràng buộc tài khoản đơn vị và xử lý tài khoản đã xóa mềm
-- Cho phép tái sử dụng username/email khi tài khoản cũ đã bị xóa mềm (deleted_at IS NOT NULL)
-- Đảm bảo mỗi đơn vị cơ sở chỉ có tối đa 01 tài khoản quản trị hoạt động

-- 1. Đổi tên username và email của các tài khoản đã bị xóa mềm để giải phóng hoàn toàn tên gốc
UPDATE accounts 
SET username = username || '__del_' || id || '_' || extract(epoch from COALESCE(deleted_at, now()))::bigint,
    email = email || '__del_' || id || '_' || extract(epoch from COALESCE(deleted_at, now()))::bigint
WHERE deleted_at IS NOT NULL AND username NOT LIKE '%__del_%';

-- 2. Xóa các ràng buộc UNIQUE toàn bảng cũ
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_username_key;
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_email_key;

-- 3. Tạo index UNIQUE có điều kiện (chỉ áp dụng với tài khoản đang hoạt động - deleted_at IS NULL, không phân biệt hoa thường)
CREATE UNIQUE INDEX IF NOT EXISTS accounts_username_active_idx ON accounts (lower(username)) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_active_idx ON accounts (lower(email)) WHERE deleted_at IS NULL;

-- 4. Đảm bảo mỗi đơn vị cấp 2, 3, 4 chỉ có 01 tài khoản quản trị dùng chung đang hoạt động
CREATE UNIQUE INDEX IF NOT EXISTS accounts_unit_active_idx ON accounts (org_unit_id) 
WHERE deleted_at IS NULL AND role_code <> 'DOAN_VIEN' AND org_unit_id <> 1;
