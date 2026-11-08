-- 0028: Bình chọn hồ sơ Đoàn trường tiêu biểu + danh hiệu 3 cấp cho bài HS3T
-- - vote_campaigns: thêm campaign_kind (HS3T | DOAN_TRUONG) — chia nhánh chiến dịch
-- - đổi chữ hiệu HS3T: title "Hành trình 3 tốt — Bình chọn năm 2026", gift_note bỏ "TW Đoàn"
-- - seed chiến dịch Đoàn trường 2026
-- - hs3t_stories: thêm honor_level (TRUONG | TINH | TW_DE_CU) — HS tự khai, admin chỉnh khi duyệt
-- - unit_stories + unit_votes: hồ sơ trường nộp (1 hồ sơ/trường) + phiếu bầu đổi được

-- ═══ Chiến dịch: phân loại ═══
alter table vote_campaigns
  add column if not exists campaign_kind varchar(20) not null default 'HS3T';
alter table vote_campaigns
  drop constraint if exists vote_campaigns_kind_ck;
alter table vote_campaigns
  add constraint vote_campaigns_kind_ck check (campaign_kind in ('HS3T','DOAN_TRUONG'));

-- Đổi chữ hiệu chiến dịch HS3T + gift_note bỏ nhắc "TW Đoàn"
update vote_campaigns
   set title = 'Hành trình 3 tốt — Bình chọn năm 2026',
       gift_note = replace(gift_note, 'Câu chuyện được bình chọn cao nhất nhận quà từ TW Đoàn trong minigame truyền thông tuần 16/11',
                           'Câu chuyện được bình chọn cao nhất nhận quà vinh danh trong minigame truyền thông của Cổng Thanh niên Trường học')
 where code = 'HS3T-2026';

insert into vote_campaigns (code, title, year, starts_at, ends_at, status, campaign_kind, gift_note)
values ('DOAN-TRUONG-2026', 'Bình chọn Đoàn trường tiêu biểu năm 2026', 2026,
        '2026-11-10 00:00:00+07', '2026-12-10 23:59:59+07', 'LIVE', 'DOAN_TRUONG',
        'Hồ sơ Đoàn trường được bình chọn cao nhất được vinh danh và truyền thông trên Cổng Thanh niên Trường học')
on conflict (code) do nothing;

-- ═══ Danh hiệu 3 cấp của bài HS3T ═══
alter table hs3t_stories
  add column if not exists honor_level varchar(10) not null default 'TRUONG';
alter table hs3t_stories
  drop constraint if exists hs3t_stories_honor_ck;
alter table hs3t_stories
  add constraint hs3t_stories_honor_ck check (honor_level in ('TRUONG','TINH','TW_DE_CU'));

-- ═══ Hồ sơ Đoàn trường dự bình chọn ═══
create table if not exists unit_stories (
  id bigint generated always as identity primary key,
  campaign_id bigint not null references vote_campaigns(id),
  org_unit_id bigint not null references org_units(id),
  submitted_by_account_id bigint references accounts(id) on delete cascade,
  title varchar(200) not null,
  intro text not null,
  achievements text,
  photo_data_url text,
  photo_thumb_data_url text,
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
  constraint unit_stories_campaign_org_uq unique (campaign_id, org_unit_id),
  constraint unit_stories_intro_len_ck check (char_length(intro) between 30 and 2000),
  constraint unit_stories_ai_verdict_ck check (ai_verdict in ('CLEAN','FLAGGED')),
  constraint unit_stories_status_ck check (status in ('PENDING','APPROVED','REJECTED')),
  constraint unit_stories_vote_count_ck check (vote_count >= 0)
);

create index if not exists unit_stories_status_idx on unit_stories (status);
create index if not exists unit_stories_vote_count_idx on unit_stories (vote_count desc) where status = 'APPROVED';
create index if not exists unit_stories_campaign_created_idx on unit_stories (campaign_id, created_at desc);

-- ═══ Phiếu bầu hồ sơ trường — 01 phiếu/tài khoản/chiến dịch, đổi được ═══
create table if not exists unit_votes (
  id bigint generated always as identity primary key,
  campaign_id bigint not null references vote_campaigns(id),
  voter_account_id bigint not null references accounts(id) on delete cascade,
  unit_story_id bigint not null references unit_stories(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint unit_votes_campaign_voter_uq unique (campaign_id, voter_account_id)
);

create index if not exists unit_votes_story_idx on unit_votes (unit_story_id);
