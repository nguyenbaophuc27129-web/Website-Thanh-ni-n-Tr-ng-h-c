-- 0017: Xóa danh mục sai quy chuẩn 'Đoàn viên 3 tốt' (chỉ có Học sinh 3 tốt, Học sinh 3 rèn luyện, Sinh viên 5 tốt)
delete from activity_categories where content_category_id in (select id from content_categories where code = 'DN_3_TOT');
delete from content_categories where parent_id in (select id from content_categories where code = 'DN_3_TOT');
delete from content_categories where code = 'DN_3_TOT';
