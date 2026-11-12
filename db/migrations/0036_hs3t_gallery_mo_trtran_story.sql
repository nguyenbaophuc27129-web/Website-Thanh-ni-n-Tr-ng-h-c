-- 0036: HS3T — mở trần "quá trình phấn đấu" + thư viện 3 ảnh kèm caption (12/11/2026)
-- 1) DROP CHECK story ≤ 2000 (đang chặn bài dài dù code đã bỏ giới hạn — YCCN: nhiều bạn
--    viết rất tâm huyết); thay check mới: tối thiểu 30 ký tự, trần phòng thủ 200.000.
-- 2) Cột gallery jsonb: tối đa 3 ảnh (data URL nén client ~≤1.5MB/ảnh) + caption tự do
--    theo sở thích học sinh — hiển thị trong trang chi tiết truyện.

alter table hs3t_stories drop constraint if exists hs3t_stories_story_len_ck;
alter table hs3t_stories
  add constraint hs3t_stories_story_len_ck
  check (char_length(story) >= 30 and char_length(story) <= 200000);

alter table hs3t_stories add column if not exists gallery jsonb not null default '[]'::jsonb;
