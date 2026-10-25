-- 0026: Nhật ký tệp tải lên lưu trên ổ đĩa máy chủ (/srv/tnth/uploads → URL /uploads/...)
-- Mỗi tệp ảnh / video / văn bản người dùng tải lên được ghi 1 dòng: tra trùng nội dung
-- (sha256 + phân hệ), biết ai tải, và về sau dọn tệp không còn bài/văn bản nào dùng.
-- Bản thân tệp KHÔNG nằm trong DB.

create table if not exists media_files (
  id bigint generated always as identity primary key,
  path varchar(255) not null unique,          -- đường dẫn công khai, vd /uploads/bai-viet/2026/10/<sha>.webp
  sha256 char(64) not null,                   -- băm nội dung tệp đã lưu (sau khi nén ảnh)
  kind varchar(30) not null,                  -- phân hệ: bai-viet, dong-gop, dien-dan, van-ban, tai-nguyen, du-an
  mime_type varchar(100) not null,
  size_bytes bigint not null,
  width integer,
  height integer,
  original_name varchar(255),
  uploaded_by_account_id bigint references accounts(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists media_files_sha256_kind_idx on media_files (sha256, kind);
