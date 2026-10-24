-- 0023: Mở rộng các trường cho trang đăng bài chuyên nghiệp (CMS)
-- Phù hợp với giao diện thiết kế xuất bản tin bài chuẩn:
-- Cột trái: Tiêu đề phụ, SEO (Tít hấp dẫn, Meta desc, Từ khóa)
-- Cột phải: Thuộc tính, Ảnh đại diện & chú thích, Chuyên mục, Tin liên quan, Chủ đề liên quan, Ghi chú, Nhuận bút

alter table published_posts
    add column if not exists subtitle text,
    add column if not exists seo_title text,
    add column if not exists seo_keywords text,
    add column if not exists image_caption text,
    add column if not exists cover_url text,
    add column if not exists post_attributes text[] not null default '{}',
    add column if not exists related_posts text[] not null default '{}',
    add column if not exists related_topics text[] not null default '{}',
    add column if not exists internal_notes text,
    add column if not exists royalty_amount numeric(15, 2) not null default 0,
    add column if not exists royalty_notes text;
