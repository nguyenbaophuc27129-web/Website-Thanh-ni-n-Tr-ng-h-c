-- 0020: văn bản đính kèm tệp (base64 ≤4MB) — ban hành văn bản kèm file tải về
alter table documents add column if not exists file_name text;
alter table documents add column if not exists file_data_url text;
