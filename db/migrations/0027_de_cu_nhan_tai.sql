-- 0027: Đề cử gương mặt nhân tài — hệ riêng (bảng nominations + duyệt + hiển thị /nhan-tai)
-- Đơn vị Đoàn (TW/Tỉnh/Cấp3/Đơn vị trường) đề cử gương mặt kèm minh chứng ảnh;
-- AI + admin duyệt; hồ sơ APPROVED hiển thị công khai trên /nhan-tai.

create table if not exists nominations (
  id bigint generated always as identity primary key,
  nominee_name varchar(120) not null,
  nominee_position varchar(120),
  org_unit_id bigint not null references org_units(id),
  field varchar(120) not null,
  quote varchar(300),
  achievements text not null,
  evidence_data_url text not null,
  evidence_thumb_data_url text not null,
  submitter_account_id bigint references accounts(id) on delete cascade,
  ai_verdict varchar(10) not null default 'CLEAN',
  ai_reason text,
  ai_model varchar(80),
  status varchar(10) not null default 'PENDING',
  rejection_reason text,
  reviewed_by_account_id bigint references accounts(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nominations_ai_verdict_ck check (ai_verdict in ('CLEAN','FLAGGED')),
  constraint nominations_status_ck check (status in ('PENDING','APPROVED','REJECTED')),
  constraint nominations_achievements_len_ck check (char_length(achievements) between 30 and 4000)
);

create index if not exists nominations_status_idx on nominations (status);
create index if not exists nominations_created_idx on nominations (created_at desc);
create index if not exists nominations_org_idx on nominations (org_unit_id);
