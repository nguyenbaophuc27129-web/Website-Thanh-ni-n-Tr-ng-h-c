-- 0024: Bình chọn "Học sinh 3 tốt tiêu biểu" — chiến dịch + bài dự thi + phiếu bầu
-- Học sinh tự đăng câu chuyện phấn đấu + ảnh chân dung cắt nền; AI + admin duyệt;
-- mỗi tài khoản 01 phiếu/chiến dịch (đổi được tới khi kết thúc). KHÔNG qua store sync.

-- ═══ Chiến dịch bình chọn ═══
create table if not exists vote_campaigns (
  id bigint generated always as identity primary key,
  code varchar(40) not null unique,
  title varchar(200) not null,
  year int not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status varchar(10) not null default 'DRAFT',
  gift_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vote_campaigns_status_ck check (status in ('DRAFT','LIVE','ENDED')),
  constraint vote_campaigns_period_ck check (ends_at > starts_at)
);

insert into vote_campaigns (code, title, year, starts_at, ends_at, status, gift_note)
values ('HS3T-2026', 'Bình chọn Học sinh 3 tốt tiêu biểu năm 2026', 2026,
        '2026-11-10 00:00:00+07', '2026-12-10 23:59:59+07', 'LIVE',
        'Câu chuyện được bình chọn cao nhất nhận quà từ TW Đoàn trong minigame truyền thông tuần 16/11')
on conflict (code) do nothing;

-- ═══ Bài dự thi (câu chuyện + ảnh cắt nền) ═══
create table if not exists hs3t_stories (
  id bigint generated always as identity primary key,
  campaign_id bigint not null references vote_campaigns(id),
  account_id bigint not null references accounts(id) on delete cascade,
  student_name varchar(120) not null,
  school_org_unit_id bigint not null references org_units(id),
  class_name varchar(60),
  quote varchar(300),
  story text not null,
  photo_data_url text not null,
  photo_thumb_data_url text not null,
  ai_verdict varchar(10) not null default 'CLEAN',
  ai_reason text,
  ai_model varchar(80),
  status varchar(10) not null default 'PENDING',
  rejection_reason text,
  approved_by_account_id bigint references accounts(id),
  approved_at timestamptz,
  vote_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hs3t_stories_campaign_account_uq unique (campaign_id, account_id),
  constraint hs3t_stories_story_len_ck check (char_length(story) between 100 and 2000),
  constraint hs3t_stories_ai_verdict_ck check (ai_verdict in ('CLEAN','FLAGGED')),
  constraint hs3t_stories_status_ck check (status in ('PENDING','APPROVED','REJECTED')),
  constraint hs3t_stories_vote_count_ck check (vote_count >= 0)
);

create index if not exists hs3t_stories_status_idx on hs3t_stories (status);
create index if not exists hs3t_stories_vote_count_idx on hs3t_stories (vote_count desc) where status = 'APPROVED';
create index if not exists hs3t_stories_school_idx on hs3t_stories (school_org_unit_id);
create index if not exists hs3t_stories_campaign_created_idx on hs3t_stories (campaign_id, created_at desc);

-- ═══ Phiếu bầu — 01 phiếu/tài khoản/chiến dịch, đổi được ═══
create table if not exists hs3t_votes (
  id bigint generated always as identity primary key,
  campaign_id bigint not null references vote_campaigns(id),
  voter_account_id bigint not null references accounts(id) on delete cascade,
  story_id bigint not null references hs3t_stories(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hs3t_votes_campaign_voter_uq unique (campaign_id, voter_account_id)
);

create index if not exists hs3t_votes_story_idx on hs3t_votes (story_id);
