-- 0030: published_posts + source_url — lưu đường dẫn bài gốc khi nhập tin từ link
-- (Facebook / báo điện tử) để cổng trang chủ lọc ra "Bảng tin fanpage" từ dữ liệu thật.
ALTER TABLE published_posts ADD COLUMN IF NOT EXISTS source_url text;
