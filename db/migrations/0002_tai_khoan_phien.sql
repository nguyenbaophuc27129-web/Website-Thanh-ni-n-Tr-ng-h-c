-- 0002: Mở rộng tài khoản (vai trò + đoàn viên cá nhân) + phiên đăng nhập
-- Mô hình chốt (v13.4): đơn vị cơ sở dùng chung 01 tài khoản, ngoài ra có
-- tài khoản Đoàn viên cá nhân cùng đơn vị → BỎ UNIQUE accounts.org_unit_id.
-- role_code: bảng roles/account_roles vẫn giữ cho RBAC tương lai; ứng dụng
-- hiện dùng 1 vai trò/tài khoản nên lưu trực tiếp cột role_code.

alter table accounts drop constraint if exists accounts_org_unit_id_key;

alter table accounts add column if not exists role_code varchar(30);
alter table accounts add column if not exists class_name varchar(100);

alter table accounts drop constraint if exists accounts_role_code_ck;
alter table accounts add constraint accounts_role_code_ck
    check (role_code is null or role_code in (
        'QUAN_TRI_TW', 'QUAN_TRI_TINH', 'QUAN_TRI_CAP3',
        'DON_VI', 'BIEN_TAP_VIEN', 'DOAN_VIEN'
    ));

create index if not exists accounts_role_code_idx on accounts(role_code);

-- Phiên đăng nhập / refresh token
create table if not exists auth_sessions (
    id bigint generated always as identity primary key,
    account_id bigint not null references accounts(id) on delete cascade,
    refresh_token_hash varchar(64) not null unique,
    user_agent varchar(500),
    ip_address inet,
    expires_at timestamptz not null,
    revoked_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists auth_sessions_account_id_idx on auth_sessions(account_id);
