-- 0028: Kho tài nguyên nhiều tệp + hiển thị người đóng góp.
-- - attachments: danh sách tệp [{name, url, sizeKb, mime?}] (url là đường dẫn /uploads/tai-nguyen/...).
--   file_name / file_data_url giữ nguyên là TỆP CHÍNH (= tệp đầu) để tương thích; file_size_kb = TỔNG dung lượng.
-- - contributor_name: tên người đóng góp hiển thị công khai ("Đóng góp bởi …"), chụp lại lúc gửi
--   (không lộ id tài khoản; đổi tên tài khoản về sau không làm đổi lịch sử).
-- Idempotent: chạy lại không lỗi, không ghi đè dữ liệu đã có.

alter table resources add column if not exists attachments jsonb not null default '[]'::jsonb;
alter table resources add column if not exists contributor_name varchar(255);

-- Dòng cũ do đoàn viên đóng góp: lấy tên người liên hệ của tài khoản gửi
update resources r
   set contributor_name = left(a.contact_person, 255)
  from accounts a
 where r.submitted_by_account_id = a.id
   and r.contributor_name is null
   and a.contact_person is not null
   and btrim(a.contact_person) <> '';

-- Dòng cũ có 1 tệp (file_data_url là đường dẫn /uploads/...) → attachments 1 phần tử
update resources
   set attachments = jsonb_build_array(jsonb_build_object(
         'name', coalesce(nullif(file_name, ''), 'tai-lieu'),
         'url', file_data_url,
         'sizeKb', greatest(file_size_kb, 1)))
 where attachments = '[]'::jsonb
   and file_data_url like '/uploads/%';
