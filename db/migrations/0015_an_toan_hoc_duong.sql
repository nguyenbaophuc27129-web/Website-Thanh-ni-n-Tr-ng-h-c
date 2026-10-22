-- 0015: Chuyên trang An toàn học đường (bạo lực, bạo hành, xâm hại + chuyên gia tâm lý/pháp lý)
-- Thêm lĩnh vực phản ánh AN_TOAN (id 8) và 3 bài viết truyền thông khớp seed
-- src/data/published-posts.ts (5032–5034, category "An toàn học đường").
BEGIN;

INSERT INTO feedback_topics (id, code, name, display_order, is_active)
OVERRIDING SYSTEM VALUE
VALUES (8, 'AN_TOAN', 'Bảo vệ an toàn — bạo lực, bạo hành, xâm hại', 7, true)
ON CONFLICT (code) DO NOTHING;

-- Bài viết mẫu (3 bài 5032–5034) cần editor_account_id = 2 (NOT NULL, FK accounts):
-- chỉ chèn khi tài khoản 2 đã tồn tại — DB trống (tnth_prod mới) thì bỏ qua.
-- (Không thụt lề khối INSERT để giữ nguyên nội dung chuỗi nhiều dòng.)
DO $$
BEGIN
IF EXISTS (SELECT 1 FROM accounts WHERE id = 2) THEN
INSERT INTO published_posts (
  id, activity_id, slug, title, excerpt, content, status, is_featured,
  published_at, view_count, editor_account_id, category_names, cover_seed,
  author_org_unit_name, created_at
)
OVERRIDING SYSTEM VALUE
VALUES
  (5032, NULL, 'an-toan-hoc-duong-cach-nhan-biet-va-noi-to-bao-luc',
   'An toàn học đường: Nhận biết sớm 4 dạng bạo lực học đường và cách phản ứng đúng',
   'Bạo lực học đường không chỉ là đánh nhau — nó có mặt ở thể chất, lời nói, mạng xã hội và cả sự cô lập tinh thần. Bài viết giúp học sinh nhận biết dấu hiệu và 3 bước phản ứng an toàn.',
   'Theo các khảo sát của ngành giáo dục, cứ 10 học sinh thì có khoảng 3 bạn từng chứng kiến hoặc là nạn nhân của ít nhất một dạng bạo lực học đường trong năm học.

Bốn dạng thường gặp: bạo lực thể chất (đánh, đẩy, giật đồ), bạo lực lời nói (chửi bới, đặt biệt danh xấu, dọa dẫm), bạo lực trên không gian mạng (đăng ảnh, bình luận miệt thị, lập nhóm nói xấu) và cô lập xã hội (xa lánh, loại khỏi nhóm một cách ác ý).

Ba bước phản ứng an toàn: Một — giữ bình tĩnh, tránh đối đầu trực tiếp và rời khỏi nơi nguy hiểm nếu có thể. Hai — lưu giữ minh chứng (ảnh chụp màn hình, tin nhắn, tên người chứng kiến). Ba — nói với người tin cậy: bố mẹ, giáo viên chủ nhiệm, Ban Đoàn trường hoặc gửi về chuyên mục An toàn học đường của Cổng TNTH — thông tin được bảo mật.

Cổng TNTH phối hợp chuyên gia tâm lý và pháp lý tiếp nhận, tư vấn và đồng hành tới khi vụ việc được xử lý xong.',
   'PUBLISHED', false, '2026-10-10T02:00:00Z', 410, 2,
   ARRAY['An toàn học đường', 'Kỹ năng số'], 44,
   'Ban Thanh niên Trường học — Trung ương Đoàn', '2026-10-10T01:00:00Z'),
  (5033, NULL, 'chuyen-gia-tam-ly-phap-li-dong-hanh-cung-hoc-sinh-tren-cong-tnth',
   'Kênh chuyên gia tâm lý — pháp lý của Cổng TNTH: Học sinh được đồng hành trong 24 giờ',
   'Từ tháng 10/2026, phản ánh thuộc lĩnh vực an toàn — bạo lực, xâm hại được chuyển thẳng tới đội ngũ chuyên gia tâm lý và pháp lý, bảo mật danh tính, phản hồi trong vòng 24 giờ.',
   'Nhận thấy học sinh thường ngại chia sẻ vì sợ bị lộ danh tính, Cổng TNTH khai trương kênh hỗ trợ riêng: phản ánh gửi tại mục An toàn học đường sẽ được chuyển thẳng tới chuyên gia tâm lý hoặc pháp lý thay vì luồng xử lý hành chính thông thường.

Đội chuyên gia gồm nhà tư vấn tâm lý học đường và luật sư, pháp lý viên tình nguyện, đã ký cam kết bảo mật. Danh tính người gửi chỉ dùng để liên hệ khi chính các bạn đồng ý.

Quy trình 3 bước: gửi nội dung (không cần đăng nhập) — nhận mã tra cứu — chuyên gia liên hệ qua kênh an toàn trong 24 giờ làm việc. Trường hợp khẩn cấp, gọi ngay Tổng đài quốc gia 111 (miễn phí, 24/7) hoặc 113.

Kênh mở ra nhằm bổ trợ tổng đài 111 trong những thời điểm bận, bảo đảm không bạn trẻ nào phải chờ.',
   'PUBLISHED', false, '2026-10-12T02:00:00Z', 285, 2,
   ARRAY['An toàn học đường'], 45,
   'Ban Thanh niên Trường học — Trung ương Đoàn', '2026-10-12T01:00:00Z'),
  (5034, NULL, 'chong-xam-hai-tre-em-nhung-dieu-hoc-sinh-can-biet',
   'Chống xâm hại trẻ em: Những điều học sinh cần biết để tự bảo vệ mình và bạn bè',
   'Xâm hại có thể đến từ cả người quen. Học sinh cần nắm 5 quy tắc an toàn cơ thể, biết số 111 và hiểu rằng kể ra không bao giờ là lỗi của mình.',
   'Xâm hại trẻ em bao gồm xâm hại thể chất, tình dục, tinh thần và bạo hành, bỏ bê. Đáng chú ý, phần lớn vụ việc đến từ người quen — chính vì thế học sinh cần được trang bị kỹ năng nhận biết, không chỉ cảnh giác với người lạ.

Năm quy tắc an toàn: cơ thể mình thuộc về mình; không ai được chạm vào vùng kín trừ chăm sóc y tế có người lớn tin cậy đi cùng; bí mật khiến bạn sợ hãi hoặc khó chịu thì không cần giữ; từ chối và chạy đến nơi đông người khi thấy không an toàn; kể với người lớn tin cậy cho tới khi có người tin và giúp mình.

Điều quan trọng nhất: bị xâm hại không bao giờ là lỗi của trẻ. Kể ra là hành động dũng cảm.

Nếu bạn hoặc bạn bè gặp tình huống này, gọi Tổng đài quốc gia bảo vệ trẻ em 111 (miễn phí, 24/7) hoặc gửi về chuyên mục An toàn học đường trên Cổng TNTH để được chuyên gia tâm lý, pháp lý hỗ trợ bảo mật.',
   'PUBLISHED', false, '2026-10-14T02:00:00Z', 330, 2,
   ARRAY['An toàn học đường'], 46,
   'Ban Thanh niên Trường học — Trung ương Đoàn', '2026-10-14T01:00:00Z')
ON CONFLICT (id) DO NOTHING;
END IF;
END $$;

COMMIT;
