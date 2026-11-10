-- 0034 — Gửi bài dự thi không cần tài khoản: xác thực Gmail là đủ (09/11/2026)
-- Khách xác thực Gmail → nộp bài: account_id + school_org_unit_id để NULL,
-- định danh bằng submitter_email; mỗi Gmail 1 bài cho mỗi chiến dịch.

ALTER TABLE hs3t_stories
  ALTER COLUMN account_id DROP NOT NULL,
  ALTER COLUMN school_org_unit_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS submitter_email text;

-- Mỗi Gmail chỉ nộp 1 bài mỗi chiến dịch (song song ràng buộc UNIQUE (campaign_id, account_id) cũ)
CREATE UNIQUE INDEX IF NOT EXISTS hs3t_stories_campaign_email_uq
  ON hs3t_stories (campaign_id, lower(submitter_email))
  WHERE submitter_email IS NOT NULL;
