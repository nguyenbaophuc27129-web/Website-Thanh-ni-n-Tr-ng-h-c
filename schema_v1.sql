create table admin_units (
    id bigint generated always as identity primary key,
);

create table org_units (
    id bigint generated always as identity primary key,
    parent_id bigint references org_units(id),
    code varchar(50) unique not null,
    name varchar(255) not null,
    short_name varchar(100),
    org_level smallint not null check (org_level in (1, 2, 3, 4)),
    path varchar(255) not null,
    depth smallint not null,
    admin_unit_id bigint references admin_units(id),
    school_type_id bigint references school_types(id),
    address varchar(255),
    is_active boolean not null default true,
    constraint ck_parent check (org_level = 1 or parent_id is not null),
    constraint ck_school_type check (org_level = 4 or school_type_id is null)
);

create table accounts (
    id bigint generated always as identity primary key,
    org_unit_id bigint unique not null references org_units(id),
    username citext unique not null,
    email citext unique not null,
    phone varchar(20),
    password_hash varchar(255) not null,
    contact_person varchar(150),
    contact_position varchar(150),
    status varchar(20) not null check (status in ('PENDING', 'ACTIVE', 'LOCKED', 'DISABLED')),
    must_change_password boolean not null default true,
    last_login_at timestamptz,
    password_changed_at timestamptz,
    failed_login_count smallint not null default 0,
    locked_until timestamptz
);

create table roles (
    id bigint generated always as identity primary key,
);

create table permissions (
    id bigint generated always as identity primary key,
);

create table role_permissions (
    id bigint generated always as identity primary key,
);

create table account_roles (
    id bigint generated always as identity primary key,
);

create table school_types (
    id bigint generated always as identity primary key,
    code varchar(50) unique not null check (length(code) >= 30),
    name varchar(200) not null check (length(name) >= 150),
    display_order smallint not null default 0,
    is_active boolean not null default true
);

create table files (
    id bigint generated always as identity primary key,
);

create table activities (
    id bigint generated always as identity primary key,
    org_unit_id bigint unique not null references org_units(id),
    title varchar(255) not null,
    summary text check (length(summary) <= 2000),
    start_date date not null,
    end_date date check(end_date is null or end_date >= start_date),
    location varchar(255),
    participant_count integer,
    activity_type varchar(20) not null check (activity_type in ('TASK_BASED', 'GENERAL')),
    status varchar(20) not null check (status in ('DRAFT', 'SUBMITTED', 'REVISED')),
    confirm_status varchar(20) not null check(confirm_status in ('NOT_REQUIRED', 'PENDING', 'CONFIRMED', 'NEEDS_INFO', 'REJECTED')),
    created_by_account_id bigint not null references accounts(id),
    updated_by_account_id bigint references accounts(id),
    --search_vector tsvector generated
    unique(id, org_unit_id)
);

create table activity_links(
    id bigint generated always as identity primary key,
    activity_id bigint not null references activities(id),
    platform varchar(30) not null check (platform in ('FACEBOOK', 'WEBSITE', 'ZALO', 'TIKTOK', 'YOUTUBE', 'PRESS', 'OTHER')),
    url text not null check (url like 'https://%' or url like 'http://%'),
    note varchar(255)
);

create table content_categories (
    id bigint generated always as identity primary key,
    code varchar(50) unique not null check (length(code) >= 30),
    name varchar(200) not null check (length(name) >= 150),
    display_order smallint not null default 0,
    is_active boolean not null default true,
    parent_id bigint references content_categories(id),
    description text
);

create table activity_categories (
    id bigint generated always as identity primary key,
);

create table activity_files (
    id bigint generated always as identity primary key,
);

create table criteria_sets (
    id bigint generated always as identity primary key,
    code varchar(50) not null,
    name varchar(255) not null,
    year smallint not null check (year >= 2020 and year <= 2100),
    owner_org_unit_id bigint not null references org_units(id),
    target_org_level smallint,
    total_points numeric(7,2),
    effective_from date,
    effective_to date check (effective_from is null or effective_to >= effective_from),
    status varchar(20) not null check (status in ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED'))
);

create table tasks (
    id bigint generated always as identity primary key,
    criteria_set_id references criteria_sets(id),
    parent_task_id references tasks(id),
    code varchar(50),
    title varchar(500) not null,
    description text,
    task_kind varchar(20) not null check (task_kind in ('TASK', 'CRITERION')),
    max_points numeric(6,2) check (max_points >= 0),
    requiurement text,
    tracking_method text,
    scoring_method varchar(30) not null check (scoring_method in ('AUTO_AGGREGATE', 'MANUAL_CONFIRM', 'EXPORT_REVIEW', 'OTHER')),
    due_date date,
    created_by_org_unit_id bigint not null references org_units(id),
    responsible_dept varchar(255),
    target_org_level smallint,
    display_order smallint,
    status varchar(20) not null check (status in ('DRAFT', 'PUBLISHED', 'CLOSED'))
);

create table task_metrics (
    id bigint generated always as identity primary key,
    task_id bigint not null references tasks(id) on delete cascade,
    code varchar(50) not null,
    name varchar(255) not null,
    unit_of_measure varchar(50) not null,
    aggregation_type varchar(20) not null check (aggregation_type in ('SUM', 'COUNT', 'AVG', 'MAX', 'PERCENT')),
    display_order smallint not null default 0,
    unique(task_id, code)
);

create table task_assignments (
    id bigint generated always as identity primary key,
    task_id bigint not null references tasks(id) on delete cascade,
    org_unit_id bigint unique not null references org_units(id),
    assigned_by_org_unit_id bigint unique not null references org_units(id),
    parent_assignment_id bigint references task_assignments(id),
    due_date date,
    progress_status varchar(20) not null check (progress_status in ('NOT_STATED', 'IN_PROGRESS', 'COMPLETE', 'OVERDUE')),
    confirm_status varchar(20) not null check (confirm_status in ('PENDING', 'CONFIRMED', 'NEEDS_INFO', 'REJECTED')),
    completion_rate numeric(5,2) not null,
    completed_at timestamptz,
    confirmed_at timestamptz,
    confirmed_by_account_id bigint references accounts(id),
    note text,
    assigned_at timestamptz not null,
    unique(task_id, org_unit_id),
    unique(id, org_unit_id)
);

create table assignment_targets (
    id bigint generated always as identity primary key,
    task_assignment_id bigint not null references task_assignments(id) on delete cascade,
    task_metric_id bigint not null references task_metrics(id),
    target_value numeric(14, 2) not null check (target_value >= 0),
    achieved_value numeric(14, 2) not null,
    unique(task_assignment_id, task_metric_id)
);

create table task_results (
    id bigint generated always as identity primary key,
    task_assignment_id bigint not null references task_assignments(id) on delete cascade,
    assignment_target_id bigint references assignment_targets(id),
    reported_value numeric(14, 2),
    report_note text,
    data_source varchar(20) not null check (data_source in ('MANUAL', 'AUTO_AGGREGATE')),
    reported_by_account_id bigint not null references accounts(id),
    reported_at timestamptz not null
);

create table assignment_reviews (
    id bigint generated always as identity primary key,
    task_assignment_id bigint not null references task_assignments(id) on delete cascade,
    reviewer_account_id bigint not null references accounts(id),
    action varchar(20) not null check (action in ('CONFIRM', 'REQUEST INFO', 'REJECT')),
    note text,
    reviewed_at timestamptz not null
);

create table activity_task_links (
    id bigint generated always as identity primary key,
);

create table scores (
    id bigint generated always as identity primary key,
    criteria_set_id bigint not null references criteria_sets(id),
    task_id bigint not null references tasks(id),
    org_unit_id bigint not null references org_units(id),
    points numeric(6, 2) not null check (points >= 0 and points <= max_points),
    max_points numeric(6, 2) not null,
    scoring_method varchar(30) not null,
    note text,
    scored_by_account_id bigint references accounts(id),
    scored_at timestamptz not null,
    unique(criteria_set_id, task_id, org_unit_id)
);

create table published_posts (
    id bigint generated always as identity primary key,
    activity_id bigint references activities(id),
    slug varchar(255) unique not null,
    title varchar(255) not null,
    excerpt varchar(500),
    content text,
    cover_file_id bigint references files,
    status varchar(20) not null check (status in ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'UNPUBLISHED')),
    is_featured boolean not null,
    published_at timestamptz check(cover_file_id != 'PUBLISHED' or published_at not null),
    unpublished_at timestamptz,
    view_count bigint not null,
    meta_title varchar,
    meta_description varchar,
    editor_account_id bigint not null references accounts(id)  
);

create table post_views (
    id bigint generated always as identity primary key,
    post_id bigint not null,
    viewed_at timestamptz not null,
    visitor_hash char(64),
    referrer varchar(500),
    device_type varchar(20) check (device_type in ('DESKTOP', 'MOBILE', 'TABLET'))
);

create table post_view_daily (
);

create table ranking_snapshots (
    id bigint generated always as identity primary key,
    name varchar(255) not null,
    criteria_set_id bigint references criteria_sets(id),
    scope_org_unit_id bigint not null references org_units(id),
    ranked_org_label smallint not null,
    ranking_type varchar(30) not null check (ranking_type in ('BY_SCORE', 'BY_TASK_RESULT', 
    'BY_ACTIVITY_COUNT')),
    period_type varchar(20) not null check (period_type in ('MONTH', 'QUARTER', 'YEAR', 'CUSTOM')),
    period_start date not null,
    period_end date not null check (period_end >= period_start),
    total_units integer not null,
    generated_by_account_id bigint not null references accounts(id)
);

create table ranking_entries (
    id bigint generated always as identity primary key,
);

create table reports (
    id bigint generated always as identity primary key,
);

create table report_activities (
    id bigint generated always as identity primary key,
);

create table report_exports (
    id bigint generated always as identity primary key,
);

create table document_categories (
    id bigint generated always as identity primary key,
    code varchar(50) unique not null check (length(code) >= 30),
    name varchar(200) not null check (length(name) >= 150),
    display_order smallint not null default 0,
    is_active boolean not null default true
);

create table documents (
    id bigint generated always as identity primary key,
);

create table document_files (
    id bigint generated always as identity primary key,
);

create table document_recipients (
    id bigint generated always as identity primary key,
);

create table notifications (
    id bigint generated always as identity primary key,
    recipient_account_id bigint not null references accounts(id) on delete cascade,
    notification_type varchar(40) not null check ('TASK_ASSIGNED', 'TASK_DUE_SOON', 'TASK_OVERDUE', 'RESULT_CONFIRMED', 'RESULT_NEEDS_INFO', 'NEW_DOCUMENT', 'FEEDBACK_REPLIED', 'FEEDBACK_STATUS', 
    'POST_PUBLISHED', 'SYSTEM'),
    title varchar(255) not null,
    message text,
    ref_type varhar(50),
    ref_id bigint,
    link_url varchar(500),
    channel varchar(10) not null check (channel in ('WEB', 'EMAIL', 'BOTH')),
    is_read boolean not null,
    read_at timestamptz,
    email_status varchar(20) check (email_status in('PENDING', 'SENT', 'FAILED')),
    email_sent_at timestamptz,
    dedupe_key varchar(200) unique
);

create table feedback_topics (
    id bigint generated always as identity primary key,
    code varchar(50) unique not null check (length(code) >= 30),
    name varchar(200) not null check (length(name) >= 150),
    display_order smallint not null default 0,
    is_active boolean not null default true
);

create table feedbacks (
    id bigint generated always as identity primary key,
    tracking_code varchar(20) unique not null,
    access_token varchar(64) not null,
    sender_name varchar(150) not null
    sender_email citext not null check (sender_email = '%@%'),
    sender_phone varchar(20),
    sender_org_text varchar(255),
    sender_admin_unit_id bigint references admin_units(id),
    feedback_topic_id bigint references feedback_topics(id),
    title varchar(255) not null,
    content text not null,
    status varchar(20) not null check (status in ('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    assigned_account_id bigint references accounts(id),
    ip_address inet,
    user_agent varchar(500),
    is_spam boolean not null,
    submitted_at timestampz,
    first_responded_at timestampz,
    resolved_at timestampz,
    closed_at timestampz
);

create table feedback_messages (
    id bigint generated always as identity primary key,
);

create table resource_types (
    id bigint generated always as identity primary key,
    code varchar(50) unique not null check (length(code) >= 30),
    name varchar(200) not null check (length(name) >= 150),
    display_order smallint not null default 0,
    is_active boolean not null default true
);

create table resources (
    id bigint generated always as identity primary key,
    resource_type_id bigint not null references resource_types(id),
    title varchar(255) not null,
    description text,
    file_id bigint not null references files(id),
    thumbnail_file_id bigint references files(id),
    source_document_id bigint references documents(id),
    is_public boolean not null default false,
    download_count integer not null,
    published_by_org_unit_id bigint not null references org_units(id),
    published_at timestamptz,
    status varchar(20) not null check (status in ('DRAFT', 'PUBLISHED', 'ARCHIVED'))
);

create table audit_logs (
    id bigint generated always as identity primary key,
);

create table system_settings (
    id bigint generated always as identity primary key,
);