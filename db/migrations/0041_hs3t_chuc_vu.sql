-- 0041: Bổ sung chức vụ Đoàn - Hội / Ban cán sự cho bài dự thi HS3T (học sinh nhập tự do)
-- Cột nullable → hoàn toàn an toàn khi deploy, không ảnh hưởng dữ liệu hiện có.

ALTER TABLE hs3t_stories
  ADD COLUMN IF NOT EXISTS student_position varchar(120);
