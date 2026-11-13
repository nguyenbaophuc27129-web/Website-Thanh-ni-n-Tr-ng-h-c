-- 0039: Bổ sung phường/xã và tỉnh/thành phố cho bài dự thi HS3T (khách gửi bài Gmail)
-- Cột nullable → hoàn toàn an toàn khi deploy, không ảnh hưởng dữ liệu hiện có.

ALTER TABLE hs3t_stories
  ADD COLUMN IF NOT EXISTS ward_name varchar(150),
  ADD COLUMN IF NOT EXISTS province_name varchar(150);
