-- 0024: Mã xác nhận đặt lại mật khẩu gửi qua email (thay cơ chế tự đặt mật khẩu không xác minh)
-- Mỗi yêu cầu sinh mã 6 số, DB chỉ lưu SHA-256 của mã; hết hạn sau 10 phút,
-- tối đa 5 lần nhập sai, dùng 1 lần. Yêu cầu mới làm vô hiệu mã cũ chưa dùng.

create table if not exists password_reset_codes (
  id bigserial primary key,
  account_id bigint not null references accounts(id) on delete cascade,
  code_hash char(64) not null,
  expires_at timestamptz not null,
  failed_attempts integer not null default 0,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists password_reset_codes_account_idx
  on password_reset_codes (account_id, created_at desc);
