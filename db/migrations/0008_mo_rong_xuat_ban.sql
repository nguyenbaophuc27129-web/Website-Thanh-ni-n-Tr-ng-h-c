-- 0008: Mở rộng bảng có sẵn cho chức năng v11–v14

-- published_posts: bài từ hoạt động + bài đóng góp của cộng đồng
alter table published_posts
    add column if not exists author_org_unit_id bigint references org_units(id),
    add column if not exists contributor_account_id bigint references accounts(id),
    add column if not exists category_names text[] not null default '{}',
    add column if not exists cover_data_url text;

create index if not exists published_posts_author_idx on published_posts(author_org_unit_id);
create index if not exists published_posts_contributor_idx on published_posts(contributor_account_id);

-- resources: tài nguyên xem trực tuyến (YouTube) không cần file + đóng góp của Đoàn viên
alter table resources alter column file_id drop not null;
alter table resources
    add column if not exists file_name varchar(255),
    add column if not exists file_size_kb integer not null default 0,
    add column if not exists video_url varchar(500),
    add column if not exists submitted_by_account_id bigint references accounts(id);

-- resource_types: tên ngắn hiển thị tab khi name quá dài
alter table resource_types add column if not exists short_name varchar(100);

-- notifications: mở 5 loại thông báo mới (diễn đàn bị cờ, đóng góp, dự án, HS3T)
alter table notifications drop constraint if exists notifications_notification_type_ck;
alter table notifications add constraint notifications_notification_type_ck
    check (notification_type in (
        'TASK_ASSIGNED', 'TASK_DUE_SOON', 'TASK_OVERDUE',
        'RESULT_CONFIRMED', 'RESULT_NEEDS_INFO', 'NEW_DOCUMENT',
        'FEEDBACK_REPLIED', 'FEEDBACK_STATUS', 'POST_PUBLISHED', 'SYSTEM',
        'FORUM_FLAGGED', 'CONTRIBUTION_APPROVED', 'CONTRIBUTION_REJECTED',
        'PROJECT_APPROVED', 'HS3T_AWARDED'
    ));
