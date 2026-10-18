-- 0016: Cổng thông tin về nhân tài (thực hiện kết luận của Tổng Bí thư)
-- Thêm bài ra mắt cổng (5035) + gắn chuyên mục "Nhân tài" cho các bài gương mặt
-- đã có (5017 NCKH quốc gia, 5019 robotics, 5026 IMO) — khớp seed TS.
BEGIN;

UPDATE published_posts
SET category_names = (
    SELECT array_agg(DISTINCT c)
    FROM unnest(category_names || ARRAY['Nhân tài']) AS c
)
WHERE id IN (5017, 5019, 5026)
  AND NOT ('Nhân tài' = ANY (category_names));

INSERT INTO published_posts (
  id, activity_id, slug, title, excerpt, content, status, is_featured,
  published_at, view_count, editor_account_id, category_names, cover_seed,
  author_org_unit_name, created_at
)
OVERRIDING SYSTEM VALUE
VALUES
  (5035, NULL, 'ra-mat-cong-thong-tin-ve-nhan-tai-tuoi-truong-hoc',
   'Ra mắt Cổng thông tin về nhân tài tuổi trường học: Phát hiện — bồi dưỡng — vinh danh',
   'Thực hiện kết luận của Tổng Bí thư về công tác nhân tài, Cổng TNTH khai trương chuyên trang tập hợp chủ trương, chính sách bồi dưỡng và tôn vinh gương mặt trẻ tiêu biểu trên toàn quốc.',
   'Nhận thức sâu sắc rằng đầu tư cho nhân tài trẻ là đầu tư cho tương lai đất nước, Ban Thanh niên Trường học Trung ương Đoàn ra mắt Cổng thông tin về nhân tài — nơi tập hợp chủ trương, chính sách phát hiện và bồi dưỡng nhân tài trong lực lượng học sinh, sinh viên.

Chuyên trang vận hành theo ba trụ cột: Phát hiện (khai thác dữ liệu thành tích học tập, nghiên cứu khoa học, các sân chơi trí tuệ trên Cổng TNTH), Bồi dưỡng (kết nối học bổng, cố vấn chuyên môn, chương trình rèn luyện) và Vinh danh — Kết nối (sàn giao đổi cơ hội giữa nhân tài trẻ với doanh nghiệp, viện nghiên cứu).

Các Đoàn trường được mời đề cử gương mặt tiêu biểu kèm minh chứng trực tiếp qua cổng; hồ sơ xét công khai, minh bạch theo quý.

Chuyên trang sẽ lần lượt công bố danh sách cố vấn, đối tác tuyển dụng và bộ chính sách hỗ trợ trong các đợt cập nhật tiếp theo.',
   'PUBLISHED', false, '2026-10-16T02:00:00Z', 190, 2,
   ARRAY['Nhân tài', 'Tin tức hoạt động Đoàn'], 47,
   'Ban Thanh niên Trường học — Trung ương Đoàn', '2026-10-16T01:00:00Z')
ON CONFLICT (id) DO NOTHING;

COMMIT;
