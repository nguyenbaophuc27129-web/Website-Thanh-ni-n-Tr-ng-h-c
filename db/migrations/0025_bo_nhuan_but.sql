-- 0025: Bỏ hẳn chức năng nhuận bút ở trang đăng bài (thêm ở 0023, chưa có bài nào dùng)
-- Chạy SAU khi web đã lên bản mới không còn ghi 2 cột này. Muốn quay về bản web cũ
-- thì phải thêm lại 2 cột trước (chạy lại 2 dòng add column royalty_* trong 0023).

alter table published_posts
    drop column if exists royalty_amount,
    drop column if exists royalty_notes;
