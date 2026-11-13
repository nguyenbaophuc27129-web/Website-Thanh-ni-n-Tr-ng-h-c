-- 0040 — Xác thực Gmail cho Dự án tình nguyện (13/11/2026)
-- 1. Đăng ký dự án: Không bắt buộc tài khoản nội bộ — thả NOT NULL org_unit_id,
--    thêm submitter_email để lưu Gmail xác thực qua Google Identity Services.
-- 2. Đoàn viên tham gia dự án: Bảng volunteer_project_participants ghi nhận đoàn viên
--    đăng ký tham gia dự án (qua xác thực Gmail hoặc tài khoản), tự động liên kết khi đăng ký tài khoản sau này.

BEGIN;

-- Cho phép dự án tình nguyện do khách xác thực Gmail gửi (chưa có org_unit_id nội bộ)
ALTER TABLE volunteer_projects
  ALTER COLUMN org_unit_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS submitter_email varchar(254);

CREATE INDEX IF NOT EXISTS volunteer_projects_submitter_email_idx
  ON volunteer_projects(lower(submitter_email))
  WHERE submitter_email IS NOT NULL;

-- Bảng đoàn viên đăng ký tham gia dự án tình nguyện
CREATE TABLE IF NOT EXISTS volunteer_project_participants (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  project_id bigint NOT NULL REFERENCES volunteer_projects(id) ON DELETE CASCADE,
  account_id bigint REFERENCES accounts(id),
  email varchar(254) NOT NULL,
  full_name varchar(255) NOT NULL,
  phone varchar(20),
  school_name varchar(255),
  note text,
  status varchar(20) NOT NULL DEFAULT 'REGISTERED' CHECK (status IN ('REGISTERED', 'CONFIRMED', 'CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS volunteer_participants_proj_idx ON volunteer_project_participants(project_id);
CREATE INDEX IF NOT EXISTS volunteer_participants_email_idx ON volunteer_project_participants(lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS volunteer_participants_proj_email_uq ON volunteer_project_participants(project_id, lower(email));

COMMIT;
