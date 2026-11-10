-- 0032: Khớp "Chuyên mục nổi bật" trang chủ ↔ Cổng Tin tức (6 mục lãnh đạo yêu cầu 10/11/2026)
-- - Thêm chuyên mục "Chiến dịch tình nguyện chủ lực" (id 14)
-- - Gắn lại nhãn các bài còn tag cũ ("Thanh niên trường học", "Đảng viên trẻ",
--   "Khoa học trẻ", "Khen thưởng - Gương sáng", "Thời sự"…) về bộ tên chuẩn
-- - Bổ sung: gương cá nhân HS3T cấp TW → "Gương mặt Học sinh 3 tốt cấp Trung ương";
--   bài chiến dịch → chuyên mục chiến dịch + "Tình nguyện, cộng đồng"

insert into content_categories (id, code, name, description) overriding system value
values
  (14, 'CHIEN_DICH_TNCL', 'Chiến dịch tình nguyện chủ lực', 'Ba chiến dịch tình nguyện chủ lực khối trường học: Tiếp sức mùa thi, Hoa phượng đỏ, Mùa hè xanh')
on conflict (code) do update set name = excluded.name, description = excluded.description;

select setval(pg_get_serial_sequence('content_categories', 'id'), (select max(id) from content_categories));

-- ═══ Map tag cũ → tên chuẩn (bổ sung 0026 cho bài đăng sau + tag còn sót) ═══
update published_posts
   set category_names = (
     select array_agg(distinct
       case c
         when 'Thanh niên trường học' then 'Tin tức hoạt động Đoàn'
         when 'Hoạt động Đoàn - Hội' then 'Tin tức hoạt động Đoàn'
         when 'Tin tức hoạt động Đoàn cơ sở' then 'Tin tức hoạt động Đoàn'
         when 'Khoa học trẻ' then 'Hành trình khoa học trẻ'
         when 'Đảng viên trẻ' then 'Câu chuyện "Tôi là Đảng viên trẻ"'
         when 'Khen thưởng - Gương sáng' then 'Mỗi tuần một câu chuyện đẹp'
         when 'Thời sự' then 'Mỗi tuần một câu chuyện đẹp'
         else c
       end)
     from unnest(category_names) as c
   )
 where category_names && array[
     'Thanh niên trường học',
     'Hoạt động Đoàn - Hội',
     'Tin tức hoạt động Đoàn cơ sở',
     'Khoa học trẻ',
     'Đảng viên trẻ',
     'Khen thưởng - Gương sáng',
     'Thời sự'
   ]::text[];

-- ═══ Bổ sung chuyên mục cho bài đã có ═══
-- Gương cá nhân HS3T cấp TW (trừ bài Hỏi-Đáp quy chế; chỉ bài đã đăng)
update published_posts
   set category_names = category_names || array['Gương mặt Học sinh 3 tốt cấp Trung ương']::text[]
 where deleted_at IS NULL AND status = 'PUBLISHED'
   and category_names && array['Học sinh 3 tốt']::text[]
   and title !~* 'hỏi( và|-)đáp|vấn đáp'
   and not ('Gương mặt Học sinh 3 tốt cấp Trung ương' = any(category_names));

-- Bài chiến dịch tình nguyện chủ lực → chuyên mục mới + "Tình nguyện, cộng đồng"
update published_posts
   set category_names = category_names || array['Chiến dịch tình nguyện chủ lực', 'Tình nguyện, cộng đồng']
 where deleted_at IS NULL AND status = 'PUBLISHED'
   and (title ~* 'hoa phượng đỏ|tiếp sức mùa thi|mùa hè xanh')
   and not ('Chiến dịch tình nguyện chủ lực' = any(category_names));
