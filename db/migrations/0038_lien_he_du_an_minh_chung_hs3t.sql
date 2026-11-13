-- 0038: Kênh liên hệ của dự án tình nguyện (yêu cầu 13/11/2026) +
--       minh chứng bằng khen/giấy khen (PDF) khi gửi bài bình chọn HS3T.
-- Cột đều nullable / có default → không cần migrate dữ liệu cũ (bảng đang trống).

ALTER TABLE volunteer_projects
  ADD COLUMN IF NOT EXISTS contact_email varchar(254),
  ADD COLUMN IF NOT EXISTS contact_phone varchar(20),
  ADD COLUMN IF NOT EXISTS contact_facebook text,
  ADD COLUMN IF NOT EXISTS contact_website text;

ALTER TABLE hs3t_stories
  ADD COLUMN IF NOT EXISTS evidence_files jsonb NOT NULL DEFAULT '[]';
