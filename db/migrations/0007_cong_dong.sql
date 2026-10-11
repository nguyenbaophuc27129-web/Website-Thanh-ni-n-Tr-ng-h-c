-- 0007: Cộng đồng & vận hành — danh bạ, sự kiện trực tiếp, điểm danh QR,
--       đóng góp cộng đồng (bài + điểm thưởng), nhật ký email phản ánh

-- Danh bạ Đoàn trường — upsert theo đơn vị, phạm vi theo scope (v12)
create table if not exists org_directory (
    id bigint generated always as identity primary key,
    org_unit_id bigint not null unique references org_units(id) on delete cascade,
    secretary_name varchar(150) not null,
    secretary_phone varchar(20),
    email varchar(255),
    achievements text,
    strengths text,
    academic_resources text,
    clubs text,
    updated_by_account_id bigint references accounts(id),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Sự kiện trực tiếp (mô phỏng realtime) — feed giới hạn theo scope
create table if not exists live_events (
    id bigint generated always as identity primary key,
    org_unit_id bigint not null references org_units(id),
    event_type varchar(30) not null check (event_type in (
        'ACTIVITY_SUBMITTED', 'ACTIVITY_CONFIRMED', 'TASK_RESULT',
        'TASK_ASSIGNED', 'ATTENDANCE', 'REPORT_CREATED', 'FEEDBACK_NEW'
    )),
    title varchar(500) not null,
    created_at timestamptz not null default now()
);

create index if not exists live_events_created_idx on live_events(created_at desc);
create index if not exists live_events_org_idx on live_events(org_unit_id);

-- Điểm danh QR hoạt động — công khai, không cần đăng nhập (v2)
create table if not exists attendances (
    id bigint generated always as identity primary key,
    activity_id bigint not null references activities(id) on delete cascade,
    org_unit_id bigint not null references org_units(id),
    member_name varchar(150) not null,
    member_class varchar(100),
    checked_in_at timestamptz not null default now()
);

create index if not exists attendances_activity_idx on attendances(activity_id);

-- Bài viết chuyên mục do Đoàn viên đóng góp — AI kiểm duyệt → Ban TNTH duyệt đăng
create table if not exists member_contributions (
    id bigint generated always as identity primary key,
    contributor_account_id bigint not null references accounts(id) on delete cascade,
    category_tag varchar(100) not null,
    title varchar(255) not null,
    excerpt varchar(500),
    content text not null,
    cover_data_url text,
    status varchar(10) not null default 'PENDING'
        check (status in ('PENDING', 'APPROVED', 'REJECTED')),
    ai_verdict varchar(10) not null default 'CLEAN'
        check (ai_verdict in ('CLEAN', 'FLAGGED')),
    ai_reason text,
    ai_model varchar(100),
    moderated_by_account_id bigint references accounts(id),
    moderated_at timestamptz,
    rejection_reason text,
    post_slug varchar(255),
    created_at timestamptz not null default now()
);

create index if not exists member_contributions_status_idx on member_contributions(status);
create index if not exists member_contributions_contributor_idx on member_contributions(contributor_account_id);

-- Nhật ký cộng điểm đóng góp: POST 15 · RESOURCE 10 · PROJECT 20 · HS3T 30
create table if not exists contribution_logs (
    id bigint generated always as identity primary key,
    account_id bigint not null references accounts(id) on delete cascade,
    contribution_kind varchar(10) not null
        check (contribution_kind in ('POST', 'RESOURCE', 'PROJECT', 'HS3T')),
    ref_id bigint not null,
    ref_title varchar(500) not null,
    points integer not null check (points > 0),
    created_at timestamptz not null default now()
);

create index if not exists contribution_logs_account_idx on contribution_logs(account_id, created_at desc);

-- Email hệ thống gửi người gửi phản ánh (REPLY trung gian / RESULT kết quả)
create table if not exists email_logs (
    id bigint generated always as identity primary key,
    feedback_id bigint not null references feedbacks(id) on delete cascade,
    to_email citext not null,
    subject varchar(500) not null,
    body text not null,
    email_kind varchar(10) not null check (email_kind in ('REPLY', 'RESULT')),
    sent_by_account_id bigint not null references accounts(id),
    delivery varchar(10) check (delivery in ('PENDING', 'SENT', 'FAILED')),
    sent_at timestamptz not null default now()
);

create index if not exists email_logs_feedback_idx on email_logs(feedback_id);
