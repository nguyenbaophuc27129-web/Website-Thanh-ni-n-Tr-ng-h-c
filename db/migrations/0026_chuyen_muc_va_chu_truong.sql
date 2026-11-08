-- 0026: Chuyên mục tin bài chuẩn hóa + loại tài nguyên "Chủ trương, chính sách"
-- - 2 chuyên mục mới: "Mỗi tuần một câu chuyện đẹp" (id 12) + "Tin tức hoạt động Đoàn" (id 13)
-- - Loại tài nguyên id 8: chủ trương, chính sách (nhân tài dùng)
-- - Gắn lại nhãn chuyên mục các bài đã đăng về bộ tên chuẩn (bỏ tên cũ lạc hậu)

insert into content_categories (id, code, name, description) overriding system value
values
  (12, 'MOI_TUAN_MOT_CAU_CHUYEN', 'Mỗi tuần một câu chuyện đẹp', 'Dòng chuyện đẹp lan tỏa mỗi tuần trên Cổng Thanh niên Trường học'),
  (13, 'TIN_TUC_HOAT_DONG_DOAN', 'Tin tức hoạt động Đoàn', 'Tin tức, hoạt động của Đoàn các cấp trong trường học')
on conflict (code) do update set name = excluded.name, description = excluded.description;

select setval(pg_get_serial_sequence('content_categories', 'id'), (select max(id) from content_categories));

insert into resource_types (id, code, name) overriding system value
values (8, 'CHU_TRUONG_CHINH_SACH', 'Chủ trương, chính sách')
on conflict (code) do update set name = excluded.name;

select setval(pg_get_serial_sequence('resource_types', 'id'), (select max(id) from resource_types));

-- ═══ Gắn lại nhãn chuyên mục về bộ tên chuẩn ═══
-- Tên cũ → "Tin tức hoạt động Đoàn"
update published_posts
   set category_names = (
     select array_agg(distinct
       case c
         when 'Thanh niên trường học' then 'Tin tức hoạt động Đoàn'
         when 'Hoạt động Đoàn - Hội' then 'Tin tức hoạt động Đoàn'
         when 'Tin tức hoạt động Đoàn cơ sở' then 'Tin tức hoạt động Đoàn'
         when 'Khoa học trẻ' then 'Hành trình khoa học trẻ'
         when 'Đảng viên trẻ' then 'Câu chuyện "Tôi là Đảng viên trẻ"'
         else c
       end)
     from unnest(category_names) as c
   )
 where category_names && array[
     'Thanh niên trường học',
     'Hoạt động Đoàn - Hội',
     'Tin tức hoạt động Đoàn cơ sở',
     'Khoa học trẻ',
     'Đảng viên trẻ'
   ]::text[];
