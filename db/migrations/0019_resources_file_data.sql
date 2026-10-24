-- 0019: Tài nguyên có tệp thật — lưu nội dung base64 để tải xuống trực tiếp
alter table resources add column if not exists file_data_url text;
