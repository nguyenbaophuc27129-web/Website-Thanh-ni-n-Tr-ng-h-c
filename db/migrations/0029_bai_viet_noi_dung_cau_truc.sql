-- 0029: Nội dung bài viết dạng có cấu trúc (trình soạn thảo Tiptap).
-- - content_doc: tài liệu Tiptap/ProseMirror (JSON) — nguồn hiển thị chính khi có.
-- - content (đã có) giữ VĂN BẢN THUẦN do máy chủ rút ra từ content_doc, dùng cho tìm kiếm,
--   đoạn trích; bài cũ (content_doc null) vẫn hiển thị từ content dạng Markdown như trước.
-- Idempotent: chạy lại không lỗi, không đụng dữ liệu đã có.

alter table published_posts add column if not exists content_doc jsonb;
