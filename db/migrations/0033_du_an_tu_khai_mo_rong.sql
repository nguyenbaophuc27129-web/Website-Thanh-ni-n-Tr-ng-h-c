-- 0033 — Form tự khai dự án tình nguyện mở rộng (spec họp Meet 07/11/2026 buổi 2)
-- Bỏ upload file báo cáo khỏi form; thêm xã/phường, mục tiêu, thời gian thực hiện,
-- kết quả bước đầu, định hướng dự án và danh sách giai đoạn (mốc thời gian + nội dung chính).
-- Các cột mới đều nullable để dữ liệu cũ (mẫu file báo cáo) không phải migrate.

ALTER TABLE volunteer_projects
  ADD COLUMN IF NOT EXISTS ward text,
  ADD COLUMN IF NOT EXISTS objectives text,
  ADD COLUMN IF NOT EXISTS timeframe text,
  ADD COLUMN IF NOT EXISTS initial_results text,
  ADD COLUMN IF NOT EXISTS direction text,
  ADD COLUMN IF NOT EXISTS phases jsonb NOT NULL DEFAULT '[]'::jsonb;
