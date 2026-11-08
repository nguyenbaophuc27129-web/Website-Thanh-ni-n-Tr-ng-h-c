-- 0025: hs3t_stories — tách ô "Thành tích nổi bật" + tên đơn vị tự nhập + nới ngưỡng story
-- - achievements: ô nhập riêng (cột mới, optional)
-- - org_display_name: tên đơn vị học sinh tự nhập (fallback = school_name từ cây tổ chức)
-- - story: nới CHECK 100 → 30 ký tự (khi tách 2 ô, phần quá trình có thể ngắn hơn)
ALTER TABLE hs3t_stories ADD COLUMN IF NOT EXISTS achievements TEXT;
ALTER TABLE hs3t_stories ADD COLUMN IF NOT EXISTS org_display_name VARCHAR(120);

ALTER TABLE hs3t_stories DROP CONSTRAINT IF EXISTS hs3t_stories_story_len_ck;
ALTER TABLE hs3t_stories
  ADD CONSTRAINT hs3t_stories_story_len_ck CHECK (char_length(story) BETWEEN 30 AND 2000);
