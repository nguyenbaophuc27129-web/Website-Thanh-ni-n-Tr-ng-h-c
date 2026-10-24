-- 0018: Chuyên mục tin bài lớn + loại tài nguyên Hình ảnh
-- 4 chuyên mục truyền thông trọng yếu (yêu cầu 22/10) + nhóm hình ảnh jpg/png
-- cho kho tài nguyên. Chạy idempotent theo code.

insert into content_categories (id, code, name, description) overriding system value
values
  (8,  'GUONG_MAT_HS3T_TW', 'Gương mặt Học sinh 3 tốt cấp Trung ương', 'Gương mặt tiêu biểu Học sinh 3 tốt cấp Trung ương'),
  (9,  'HANH_TRINH_KHOA_HOC_TRE', 'Hành trình khoa học trẻ', 'Câu chuyện nghiên cứu khoa học, sáng tạo trẻ'),
  (10, 'CONG_DAN_TOAN_CAU', 'Học sinh THPT - Công dân toàn cầu', 'Học sinh THPT với kỹ năng công dân toàn cầu'),
  (11, 'TOI_LA_DANG_VIEN_TRE', 'Câu chuyện "Tôi là Đảng viên trẻ"', 'Gương đảng viên trẻ - học sinh THPT')
on conflict (code) do update set name = excluded.name, description = excluded.description;

select setval(pg_get_serial_sequence('content_categories', 'id'), (select max(id) from content_categories));

insert into resource_types (id, code, name) overriding system value
values (7, 'HINH_ANH', 'Hình ảnh (jpg, png)')
on conflict (code) do update set name = excluded.name;

select setval(pg_get_serial_sequence('resource_types', 'id'), (select max(id) from resource_types));
