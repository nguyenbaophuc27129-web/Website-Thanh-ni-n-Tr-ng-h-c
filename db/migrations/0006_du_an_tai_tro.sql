-- 0006: Dự án tình nguyện + Nhà tài trợ (v12)
-- Dự án: "Mỗi trường THPT — 01 dự án", pin trên bản đồ 34 tỉnh (% từ mép trái/trên).

create table if not exists volunteer_projects (
    id bigint generated always as identity primary key,
    org_unit_id bigint not null references org_units(id),
    school_name varchar(255) not null,
    province varchar(100) not null,
    project_name varchar(255) not null,
    summary text not null,
    beneficiaries varchar(500),
    participants integer not null default 0 check (participants >= 0),
    status varchar(10) not null default 'PENDING'
        check (status in ('PENDING', 'APPROVED', 'REJECTED')),
    submitted_by_account_id bigint references accounts(id),
    map_x numeric(5, 2) not null,
    map_y numeric(5, 2) not null,
    ai_verdict varchar(10) check (ai_verdict in ('CLEAN', 'FLAGGED')),
    ai_reason text,
    moderated_by_account_id bigint references accounts(id),
    moderated_at timestamptz,
    rejection_reason text,
    report_file_name varchar(255),
    report_file_data text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists volunteer_projects_status_idx on volunteer_projects(status);
create index if not exists volunteer_projects_org_idx on volunteer_projects(org_unit_id);
create index if not exists volunteer_projects_province_idx on volunteer_projects(province);

create table if not exists sponsors (
    id bigint generated always as identity primary key,
    name varchar(255) not null,
    tier varchar(10) not null check (tier in ('GOLD', 'SILVER', 'BRONZE')),
    website_url varchar(500),
    note text,
    since_year smallint,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);
