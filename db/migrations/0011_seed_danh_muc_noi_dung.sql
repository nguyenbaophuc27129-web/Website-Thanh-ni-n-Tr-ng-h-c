-- 0011: Seed danh mục nội dung — chuyên mục tin, danh mục văn bản, chủ đề phản ánh.
-- ID phải khớp TUYỐT ĐỐI với src/data/categories.ts vì dữ liệu đồng bộ từ web
-- tham chiếu id these (feedbacks.feedback_topic_id, activity_categories.content_category_id,
-- documents.document_category_id). Bảng đích đang trống; on conflict (code) chỉ
-- cập nhật tên/mô tả, không đổi id để tránh vỡ khoá ngoại.

insert into content_categories (id, code, name, description, display_order, parent_id)
OVERRIDING SYSTEM VALUE values
    (1, 'HOC_TAP', 'Học tập, nghiên cứu khoa học', 'Hoạt động học tập, sáng tạo của học sinh, sinh viên', 1, null),
    (2, 'TINH_NGUYEN', 'Tình nguyện, cộng đồng', null, 2, null),
    (3, 'LI_CHUNG', 'Lịch sử, truyền thống, hành trình đỏ', null, 3, null),
    (4, 'BAO_VE', 'Bảo vệ môi trường, an toàn giao thông', null, 4, null),
    (5, 'AO_DUA', 'Áo ấm mùa đông, đồng dao vùng cao', null, 5, null),
    (6, 'THE_DUC', 'Thể dục thể thao, Đoàn kết sức trẻ', null, 6, null),
    (7, 'HS_3_TOT', 'Học sinh 3 tốt', null, 7, 1),
    (8, 'DN_3_TOT', 'Đoàn viên 3 tốt', null, 8, null)
on conflict (code) do update
    set name = excluded.name,
        description = excluded.description,
        display_order = excluded.display_order,
        parent_id = excluded.parent_id,
        is_active = true;

insert into document_categories (id, code, name, display_order)
OVERRIDING SYSTEM VALUE values
    (1, 'CHI_THI', 'Chỉ thị, nghị quyết', 1),
    (2, 'KE_HOACH', 'Kế hoạch', 2),
    (3, 'HUONG_DAN', 'Văn bản hướng dẫn', 3),
    (4, 'BAC_CUU', 'Hướng dẫn thi đua - khen thưởng', 4),
    (5, 'TB_KQ', 'Thông báo kết quả', 5),
    (6, 'KHAC', 'Khác', 6)
on conflict (code) do update
    set name = excluded.name,
        display_order = excluded.display_order,
        is_active = true;

insert into feedback_topics (id, code, name, display_order)
OVERRIDING SYSTEM VALUE values
    (1, 'HOAT_DONG', 'Hoạt động, phong trào', 1),
    (2, 'NHIEM_VU', 'Nhiệm vụ, chỉ tiêu thi đua', 2),
    (3, 'XEP_HANG', 'Xếp hạng, chấm điểm', 3),
    (4, 'CONG_KENH', 'Lỗi kỹ thuật trang web', 4),
    (5, 'TAI_KHOAN', 'Tài khoản, quyền truy cập', 5),
    (7, 'APP_QLD', 'Lỗi kỹ thuật app Thanh niên Việt Nam & web Quản lý Đoàn', 7),
    (6, 'KHAC', 'Nội dung khác', 6)
on conflict (code) do update
    set name = excluded.name,
        display_order = excluded.display_order,
        is_active = true;

select setval(pg_get_serial_sequence('content_categories', 'id'), (select max(id) from content_categories));
select setval(pg_get_serial_sequence('document_categories', 'id'), (select max(id) from document_categories));
select setval(pg_get_serial_sequence('feedback_topics', 'id'), (select max(id) from feedback_topics));
