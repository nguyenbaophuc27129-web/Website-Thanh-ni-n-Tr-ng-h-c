-- 0003: Diễn đàn ẩn danh (v11)
-- alias sinh cứng lúc tạo ("Bằng Lăng Tim Xanh #2481"); author_account_id là
-- RIÊNG TƯ — không bao giờ trả về client công khai.
-- media: mảng [{kind:"image"|"video", dataUrl, name?}] — ảnh ≤2MB×4, video ≤15MB×1.
-- Trạng thái: chờ duyệt = ai_verdict='FLAGGED' và moderated_by_account_id is null.

create table if not exists forum_threads (
    id bigint generated always as identity primary key,
    alias varchar(100) not null,
    author_account_id bigint not null references accounts(id),
    title varchar(255) not null,
    content text not null check (char_length(content) <= 20000),
    topic varchar(100),
    media jsonb not null default '[]'::jsonb,
    status varchar(20) not null default 'PUBLISHED'
        check (status in ('PUBLISHED', 'HIDDEN')),
    liked_account_ids bigint[] not null default '{}',
    ai_verdict varchar(10) not null default 'CLEAN'
        check (ai_verdict in ('CLEAN', 'FLAGGED')),
    ai_reason text,
    ai_model varchar(100),
    moderated_by_account_id bigint references accounts(id),
    moderated_at timestamptz,
    rejection_reason text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists forum_threads_status_idx on forum_threads(status, created_at desc);
create index if not exists forum_threads_author_idx on forum_threads(author_account_id);

create table if not exists forum_comments (
    id bigint generated always as identity primary key,
    thread_id bigint not null references forum_threads(id) on delete cascade,
    alias varchar(100) not null,
    author_account_id bigint not null references accounts(id),
    content text not null check (char_length(content) <= 10000),
    media jsonb not null default '[]'::jsonb,
    status varchar(20) not null default 'PUBLISHED'
        check (status in ('PUBLISHED', 'PENDING_REVIEW', 'REJECTED')),
    liked_account_ids bigint[] not null default '{}',
    ai_verdict varchar(10) not null default 'CLEAN'
        check (ai_verdict in ('CLEAN', 'FLAGGED')),
    ai_reason text,
    ai_model varchar(100),
    moderated_by_account_id bigint references accounts(id),
    moderated_at timestamptz,
    created_at timestamptz not null default now()
);

create index if not exists forum_comments_thread_idx on forum_comments(thread_id, created_at);
create index if not exists forum_comments_status_idx on forum_comments(status);
create index if not exists forum_comments_author_idx on forum_comments(author_account_id);
