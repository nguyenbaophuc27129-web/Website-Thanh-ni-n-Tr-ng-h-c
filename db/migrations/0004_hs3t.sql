-- 0004: Học sinh 3 tốt theo Quy chế QĐ 317-QĐ/TWĐTN-TNTH (điều chỉnh TB 630 10/2025)
-- Nhóm: PHONG_TRAO=Đạo đức tốt · HOC_TAP=Học tập tốt · REN_LUYEN=Thể lực tốt ·
-- KHAC=Thành tích khác (bổ sung hồ sơ, không tính ngưỡng 3 nhóm).
-- awarded_level: XA (cấp trên trực tiếp cơ sở) | TINH (tỉnh) | TW (trung ương).

create table if not exists hs3t_profiles (
    id bigint generated always as identity primary key,
    code varchar(30) not null unique,
    account_id bigint not null unique references accounts(id) on delete cascade,
    student_name varchar(150) not null,
    school_org_unit_id bigint not null references org_units(id),
    class_name varchar(100),
    awarded_level varchar(10)
        check (awarded_level in ('XA', 'TINH', 'TW')),
    awarded_at timestamptz,
    awarded_by_account_id bigint references accounts(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists hs3t_profiles_school_idx on hs3t_profiles(school_org_unit_id);

-- Thành tích hồ sơ — append-only, không xóa
create table if not exists hs3t_achievements (
    id bigint generated always as identity primary key,
    profile_id bigint not null references hs3t_profiles(id) on delete cascade,
    title varchar(500) not null,
    category varchar(20) not null
        check (category in ('HOC_TAP', 'REN_LUYEN', 'PHONG_TRAO', 'KHAC')),
    sub varchar(255),
    evidence_names text[] not null default '{}',
    achieved_at date not null,
    added_by_role varchar(10) not null check (added_by_role in ('STUDENT', 'SCHOOL')),
    added_by_account_id bigint not null references accounts(id),
    created_at timestamptz not null default now()
);

create index if not exists hs3t_achievements_profile_idx on hs3t_achievements(profile_id);
create index if not exists hs3t_achievements_category_idx on hs3t_achievements(category);

-- Điều 5: đơn vị xây dựng tiêu chuẩn riêng, KHÔNG cao hơn chuẩn TW
create table if not exists hs3t_unit_standards (
    id bigint generated always as identity primary key,
    org_unit_id bigint not null unique references org_units(id) on delete cascade,
    apply_tw boolean not null default true,
    dao_duc text,
    hoc_tap text,
    the_luc text,
    thanh_tich_khac text,
    note text,
    confirmed_by_account_id bigint references accounts(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
