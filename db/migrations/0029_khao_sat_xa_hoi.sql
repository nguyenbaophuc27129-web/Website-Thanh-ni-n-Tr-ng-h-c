-- 0029: Khảo sát xã hội — TW tạo khảo sát; mọi người tham gia được (khách theo thiết bị)
-- - surveys: câu hỏi jsonb [{id,text,type:SINGLE|MULTI|TEXT,options[]}]
-- - survey_responses: account_id hoặc guest_token (khách localStorage); unique biểu thức
--   1 phiếu/tài khoản hoặc 1 phiếu/thiết bị

create table if not exists surveys (
  id bigint generated always as identity primary key,
  code varchar(40) not null unique,
  title varchar(200) not null,
  description text,
  status varchar(10) not null default 'DRAFT',
  starts_at timestamptz,
  ends_at timestamptz,
  questions jsonb not null default '[]'::jsonb,
  created_by_account_id bigint references accounts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint surveys_status_ck check (status in ('DRAFT','LIVE','ENDED')),
  constraint surveys_period_ck check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create index if not exists surveys_status_idx on surveys (status);

create table if not exists survey_responses (
  id bigint generated always as identity primary key,
  survey_id bigint not null references surveys(id) on delete cascade,
  account_id bigint references accounts(id) on delete cascade,
  guest_token varchar(64),
  answers jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now()
);

create unique index if not exists survey_responses_identity_uq
  on survey_responses (survey_id, coalesce('a' || account_id::text, 'g' || guest_token));

create index if not exists survey_responses_survey_idx on survey_responses (survey_id);
