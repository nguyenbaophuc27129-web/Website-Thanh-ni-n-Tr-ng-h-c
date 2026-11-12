-- Dữ liệu thử của nhóm A (id dải 271xxx) — chạy lại được nhiều lần, chỉ dùng cho tnth_test
SET ROLE coder_dev;
BEGIN;
INSERT INTO activities (id, org_unit_id, title, summary, start_date, activity_type, status, created_by_account_id)
OVERRIDING SYSTEM VALUE VALUES
  (271001, 131101, '[A] Hoạt động đang mở điểm danh', 'Thử điểm danh nhóm A', '2026-10-20', 'GENERAL', 'SUBMITTED', 924),
  (271002, 131101, '[A] Hoạt động đóng điểm danh', 'Thử điểm danh nhóm A', '2026-10-20', 'GENERAL', 'SUBMITTED', 924)
ON CONFLICT (id) DO NOTHING;

UPDATE system_settings
SET value = CASE WHEN coalesce(value, '') ~ '(^|,)271001(,|$)' THEN value
                 ELSE trim(both ',' from coalesce(value, '') || ',271001') END
WHERE setting_key = 'attendance_open_ids';
INSERT INTO system_settings (setting_key, value, value_type, group_name, description)
VALUES ('attendance_open_ids', '271001', 'STRING', 'Hoạt động', 'Danh sách hoạt động đang mở điểm danh (id phân tách bằng dấu phẩy)')
ON CONFLICT (setting_key) DO NOTHING;

INSERT INTO quiz_questions (id, topic, difficulty, question_type, stem, options, correct_indexes, correct_text, points)
OVERRIDING SYSTEM VALUE VALUES
  (271001, '[A] Lịch sử Đoàn', 'EASY', 'MCQ_SINGLE', '[A] Đoàn TNCS Hồ Chí Minh thành lập năm nào?', '["1930","1931","1941","1945"]', '{1}', NULL, 1),
  (271002, '[A] Lịch sử Đoàn', 'MEDIUM', 'MCQ_MULTI', '[A] Chọn các phong trào của Đoàn', '["Thanh niên tình nguyện","Bóng đá phủi","Sinh viên 5 tốt","Đi chợ"]', '{0,2}', NULL, 2),
  (271003, '[A] Lịch sử Đoàn', 'EASY', 'TRUE_FALSE', '[A] Ngày 26/3 là ngày thành lập Đoàn.', '["Đúng","Sai"]', '{0}', NULL, 1),
  (271004, '[A] Lịch sử Đoàn', 'MEDIUM', 'FILL', '[A] Đoàn mang tên Chủ tịch ...', NULL, '{}', 'Hồ Chí Minh', 1),
  (271005, '[A] Lịch sử Đoàn', 'HARD', 'SHORT_ANSWER', '[A] Nêu cảm nghĩ về Đoàn.', NULL, '{}', NULL, 2),
  (271011, '[A] Thích ứng', 'EASY', 'MCQ_SINGLE', '[A] Dễ 1 — chọn B', '["A","B","C","D"]', '{1}', NULL, 1),
  (271012, '[A] Thích ứng', 'EASY', 'MCQ_SINGLE', '[A] Dễ 2 — chọn C', '["A","B","C","D"]', '{2}', NULL, 1),
  (271013, '[A] Thích ứng', 'MEDIUM', 'MCQ_SINGLE', '[A] Vừa 1 — chọn A', '["A","B","C","D"]', '{0}', NULL, 2),
  (271014, '[A] Thích ứng', 'MEDIUM', 'MCQ_SINGLE', '[A] Vừa 2 — chọn D', '["A","B","C","D"]', '{3}', NULL, 2),
  (271015, '[A] Thích ứng', 'HARD', 'MCQ_SINGLE', '[A] Khó 1 — chọn B', '["A","B","C","D"]', '{1}', NULL, 3),
  (271016, '[A] Thích ứng', 'HARD', 'MCQ_SINGLE', '[A] Khó 2 — chọn C', '["A","B","C","D"]', '{2}', NULL, 3)
ON CONFLICT (id) DO NOTHING;

INSERT INTO quiz_exams (id, code, title, description, duration_minutes, question_ids, shuffle_questions, shuffle_options, adaptive, topics, status, created_by_account_id)
OVERRIDING SYSTEM VALUE VALUES
  (271001, 'A-THUONG', '[A] Đề thường trộn câu + trộn đáp án', 'Đề thử nhóm A', 15, '{271001,271002,271003,271004,271005}', true, true, false, '{}', 'OPEN', 920),
  (271002, 'A-THICHUNG', '[A] Đề thích ứng', 'Đề thử nhóm A', 10, '{271011,271012,271013,271014,271015,271016}', false, false, true, '{}', 'OPEN', 920),
  (271003, 'A-DONG', '[A] Đề đã đóng', 'Đề thử nhóm A', 10, '{271001}', false, false, false, '{}', 'CLOSED', 920)
ON CONFLICT (id) DO NOTHING;

-- Phản ánh mã kiểu cũ (đoán được) của t.dv1 + 1 ghi chú nội bộ + 1 phản hồi công khai
INSERT INTO feedbacks (id, tracking_code, access_token, sender_name, sender_email, sender_account_id, feedback_topic_id, title, content, status)
OVERRIDING SYSTEM VALUE VALUES
  (271001, 'PA-2026-27001', 'seed-a-legacy-27001', 'Đoàn viên Một', 'dv1.a@example.com', 927, 1, '[A] Phản ánh mã cũ', 'Nội dung phản ánh mã kiểu cũ của nhóm A để thử quyền xem.', 'IN_PROGRESS')
ON CONFLICT (id) DO NOTHING;
INSERT INTO feedback_messages (id, feedback_id, sender_type, sender_account_id, sender_name, content, is_internal_note, sent_at)
OVERRIDING SYSTEM VALUE VALUES
  (271001, 271001, 'STAFF', 920, 'Cán bộ A', '[A] GHI CHU NOI BO — khong duoc lo', true, now()),
  (271002, 271001, 'STAFF', 920, 'Cán bộ A', '[A] Phản hồi công khai cho người gửi', false, now())
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('activities', 'id'), (SELECT max(id) FROM activities));
SELECT setval(pg_get_serial_sequence('quiz_questions', 'id'), (SELECT max(id) FROM quiz_questions));
SELECT setval(pg_get_serial_sequence('quiz_exams', 'id'), (SELECT max(id) FROM quiz_exams));
SELECT setval(pg_get_serial_sequence('feedbacks', 'id'), (SELECT max(id) FROM feedbacks));
SELECT setval(pg_get_serial_sequence('feedback_messages', 'id'), (SELECT max(id) FROM feedback_messages));
COMMIT;
SELECT value FROM system_settings WHERE setting_key = 'attendance_open_ids';
