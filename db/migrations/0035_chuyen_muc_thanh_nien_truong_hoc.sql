-- 0035: Chuyên mục "Thanh niên Trường học" cho nội dung do TW tự biên tập (12/11/2026)
-- Vấn đề: bài do Ban biên tập Thanh niên Trường học tự làm rơi vào chuyên mục
-- "Tin tức hoạt động Đoàn" (fallback DEFAULT_POST_CATEGORY, migration 0032 map tag cũ)
-- → hiển thị lẫn với tin hoạt động của các đơn vị cơ sở.
-- Giải pháp: chuyên mục riêng id 15; gắn cho mọi bài PUBLISHED do tài khoản TW biên tập
-- (accounts.org_unit_id = 1, root org). Bài từ hoạt động/gương đã có chuyên mục riêng
-- ("Mỗi tuần một câu chuyện đẹp"…) vẫn giữ — tag mới là tag SONG SONG.

insert into content_categories (id, code, name, description) overriding system value
values
  (15, 'THANH_NIEN_TRUONG_HOC', 'Thanh niên Trường học',
   'Tin bài do Ban biên tập Cổng Thanh niên Trường học (Trung ương Đoàn) thực hiện và tổng hợp')
on conflict (code) do update set name = excluded.name, description = excluded.description;

select setval(pg_get_serial_sequence('content_categories', 'id'), (select max(id) from content_categories));

-- Gắn chuyên mục song song cho toàn bộ bài đã đăng do TW biên tập
update published_posts p
   set category_names = p.category_names || array['Thanh niên Trường học']::text[]
 where p.deleted_at is null
   and p.status = 'PUBLISHED'
   and exists (select 1 from accounts a where a.id = p.editor_account_id and a.org_unit_id = 1)
   and not ('Thanh niên Trường học' = any(p.category_names));
