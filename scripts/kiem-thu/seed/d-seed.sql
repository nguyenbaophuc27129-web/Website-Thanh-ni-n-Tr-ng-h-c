-- Dữ liệu thử nhóm D (id 973000–973999) — chạy lại được (xoá dải id rồi chèn lại)
SET ROLE coder_dev;
BEGIN;
DELETE FROM email_logs WHERE id BETWEEN 973000 AND 973999;
DELETE FROM feedback_messages WHERE id BETWEEN 973000 AND 973999;
DELETE FROM feedbacks WHERE id BETWEEN 973000 AND 973999;
DELETE FROM notifications WHERE id BETWEEN 973000 AND 973999;
DELETE FROM hs3t_achievements WHERE id BETWEEN 973000 AND 973999;
DELETE FROM hs3t_profiles WHERE id BETWEEN 973000 AND 973999;
DELETE FROM quiz_attempts WHERE id BETWEEN 973000 AND 973999;
DELETE FROM quiz_exams WHERE id BETWEEN 973000 AND 973999;
DELETE FROM quiz_questions WHERE id BETWEEN 973000 AND 973999;
DELETE FROM forum_comments WHERE id BETWEEN 973000 AND 973999;
DELETE FROM forum_threads WHERE id BETWEEN 973000 AND 973999;
DELETE FROM volunteer_projects WHERE id BETWEEN 973000 AND 973999;
DELETE FROM resources WHERE id BETWEEN 973000 AND 973999;
DELETE FROM document_recipients WHERE document_id BETWEEN 973000 AND 973999;
DELETE FROM documents WHERE id BETWEEN 973000 AND 973999;
DELETE FROM published_posts WHERE id BETWEEN 973000 AND 973999;
DELETE FROM attendances WHERE id BETWEEN 973000 AND 973999;
DELETE FROM live_events WHERE id BETWEEN 973000 AND 973999;
DELETE FROM activities WHERE id BETWEEN 973000 AND 973999;
DELETE FROM task_results WHERE id BETWEEN 973000 AND 973999;
DELETE FROM assignment_targets WHERE id BETWEEN 973000 AND 973999;
DELETE FROM task_assignments WHERE id BETWEEN 973000 AND 973999;
DELETE FROM scores WHERE id BETWEEN 973000 AND 973999;
DELETE FROM reports WHERE id BETWEEN 973000 AND 973999;
DELETE FROM ranking_entries WHERE id BETWEEN 973000 AND 973999;
DELETE FROM ranking_snapshots WHERE id BETWEEN 973000 AND 973999;
DELETE FROM org_directory WHERE id BETWEEN 973000 AND 973999;
DELETE FROM member_contributions WHERE id BETWEEN 973000 AND 973999;
DELETE FROM contribution_logs WHERE id BETWEEN 973000 AND 973999;

-- Hoạt động: 973001 của t.donvi (đang mở điểm danh), 973002 Tuyên Quang, 973003 của t.donvi2
INSERT INTO activities (id, org_unit_id, title, summary, start_date, end_date, participant_count, activity_type, status, confirm_status, created_by_account_id, review_note)
OVERRIDING SYSTEM VALUE VALUES
 (973001, 131101, '[D] HĐ trường PBC', 'tóm tắt', '2026-09-01', '2026-09-02', 120, 'GENERAL', 'SUBMITTED', 'CONFIRMED', 924, 'D-REVIEW-NOTE'),
 (973002, 100, '[D] HĐ Tuyên Quang', 'tóm tắt', '2026-09-03', '2026-09-03', 40, 'GENERAL', 'SUBMITTED', 'PENDING', 922, NULL),
 (973003, 131103, '[D] HĐ Diễn Châu nháp', 'tóm tắt', '2026-09-05', '2026-09-05', 0, 'GENERAL', 'DRAFT', 'NOT_REQUIRED', 925, NULL);
INSERT INTO attendances (id, activity_id, org_unit_id, member_name, member_class) OVERRIDING SYSTEM VALUE VALUES
 (973001, 973001, 131101, '[D] HS Điểm danh', '11A1');
INSERT INTO live_events (id, org_unit_id, event_type, title) OVERRIDING SYSTEM VALUE VALUES
 (973001, 131101, 'ACTIVITY_SUBMITTED', '[D] live PBC'),
 (973002, 100, 'ACTIVITY_SUBMITTED', '[D] live TQ');
INSERT INTO system_settings (setting_key, value, value_type, group_name, description)
VALUES ('attendance_open_ids', '973001', 'STRING', 'Hoạt động', 'Danh sách hoạt động đang mở điểm danh (id phân tách bằng dấu phẩy)')
ON CONFLICT (setting_key) DO UPDATE SET value = CASE
  WHEN ',' || system_settings.value || ',' LIKE '%,973001,%' THEN system_settings.value
  WHEN system_settings.value = '' THEN '973001'
  ELSE system_settings.value || ',973001' END;

-- Bài viết
INSERT INTO published_posts (id, slug, title, excerpt, content, status, published_at, editor_account_id, internal_notes)
OVERRIDING SYSTEM VALUE VALUES
 (973001, 'd-bai-cong-khai', '[D] Bài công khai', 'tóm', 'nội dung', 'PUBLISHED', now(), 926, 'D-INTERNAL-NOTE'),
 (973002, 'd-bai-nhap', '[D] Bài nháp bí mật', 'tóm', 'nội dung', 'DRAFT', NULL, 926, 'D-INTERNAL-NOTE');

-- Văn bản
INSERT INTO documents (id, doc_number, title, issuing_org_unit_id, issued_date, recipient_scope, status, created_by_account_id)
OVERRIDING SYSTEM VALUE VALUES
 (973001, '01/D', '[D] Văn bản ban hành', 1, '2026-09-01', 'SELECTED', 'ISSUED', 920),
 (973002, '02/D', '[D] Văn bản nháp NA', 131, '2026-09-01', 'SELECTED', 'DRAFT', 921);
INSERT INTO document_recipients (document_id, org_unit_id) VALUES (973001, 131101), (973001, 100);

-- Tài nguyên
INSERT INTO resources (id, resource_type_id, title, description, file_name, file_size_kb, is_public, published_by_org_unit_id, published_at, status, submitted_by_account_id)
OVERRIDING SYSTEM VALUE VALUES
 (973001, 1, '[D] TN công khai', 'mô tả', 'd-cong-khai.pdf', 10, true, 1, now(), 'PUBLISHED', NULL),
 (973002, 1, '[D] TN nháp dv1', 'mô tả', 'd-nhap.pdf', 10, true, 131101, now(), 'DRAFT', 927),
 (973003, 1, '[D] TN nội bộ', 'mô tả', 'd-noi-bo.pdf', 10, false, 131, now(), 'PUBLISHED', NULL);

-- Dự án tình nguyện
INSERT INTO volunteer_projects (id, org_unit_id, school_name, province, project_name, summary, participants, status, submitted_by_account_id, ai_reason, rejection_reason)
OVERRIDING SYSTEM VALUE VALUES
 (973001, 131101, 'PBC', 'Nghệ An', '[D] DA đã duyệt', 'tóm', 10, 'APPROVED', 927, 'D-AI-REASON', NULL),
 (973002, 131101, 'PBC', 'Nghệ An', '[D] DA chờ duyệt dv2', 'tóm', 5, 'PENDING', 928, NULL, NULL);

-- Diễn đàn
INSERT INTO forum_threads (id, alias, author_account_id, title, content, status, liked_account_ids, ai_verdict, ai_reason, ai_model)
OVERRIDING SYSTEM VALUE VALUES
 (973001, 'Ẩn danh D1', 927, '[D] Chủ đề công khai dv1', 'nội dung', 'PUBLISHED', '{927,928,920}', 'CLEAN', 'D-AI-THREAD', 'm'),
 (973002, 'Ẩn danh D1', 927, '[D] Chủ đề ẩn dv1', 'nội dung', 'HIDDEN', '{}', 'FLAGGED', 'D-AI-FLAG', 'm'),
 (973003, 'Ẩn danh D2', 928, '[D] Chủ đề ẩn dv2', 'nội dung', 'HIDDEN', '{}', 'FLAGGED', 'D-AI-FLAG2', 'm');
INSERT INTO forum_comments (id, thread_id, alias, author_account_id, content, status, liked_account_ids)
OVERRIDING SYSTEM VALUE VALUES
 (973001, 973001, 'Ẩn danh D2', 928, '[D] BL công khai dv2', 'PUBLISHED', '{927}'),
 (973002, 973001, 'Ẩn danh D1', 927, '[D] BL chờ duyệt dv1', 'PENDING_REVIEW', '{}'),
 (973003, 973001, 'Ẩn danh D2', 928, '[D] BL chờ duyệt dv2', 'PENDING_REVIEW', '{}');

-- Thi trực tuyến
INSERT INTO quiz_questions (id, topic, difficulty, question_type, stem, options, correct_indexes, correct_text, points)
OVERRIDING SYSTEM VALUE VALUES
 (973001, 'D', 'EASY', 'MCQ_SINGLE', '[D] Câu 1', '["a","b"]', '{1}', 'D-DAP-AN-1', 1),
 (973002, 'D', 'EASY', 'MCQ_SINGLE', '[D] Câu 2', '["a","b"]', '{0}', 'D-DAP-AN-2', 1),
 (973003, 'D', 'EASY', 'MCQ_SINGLE', '[D] Câu đề nháp', '["a","b"]', '{0}', 'D-DAP-AN-3', 1);
INSERT INTO quiz_exams (id, code, title, duration_minutes, question_ids, status, created_by_account_id)
OVERRIDING SYSTEM VALUE VALUES
 (973001, 'D-OPEN', '[D] Đề mở', 10, '{973001,973002}', 'OPEN', 920),
 (973002, 'D-DRAFT', '[D] Đề nháp', 10, '{973003}', 'DRAFT', 920),
 (973003, 'D-CLOSED', '[D] Đề đã đóng NA', 10, '{973002}', 'CLOSED', 921);
INSERT INTO quiz_attempts (id, exam_id, account_id, examinee_name, examinee_org_text, status, auto_score, max_score)
OVERRIDING SYSTEM VALUE VALUES
 (973001, 973001, 927, '[D] Thí sinh dv1', 'PBC', 'SUBMITTED', 1, 2),
 (973002, 973003, 928, '[D] Thí sinh dv2', 'PBC', 'SUBMITTED', 1, 1),
 (973003, 973003, NULL, '[D] Thí sinh khách', 'Khách', 'SUBMITTED', 0, 1);

-- Phản ánh: 973001 của dv1 (Nghệ An), 973002 khách Tuyên Quang, 973003 khách gõ "nghe an" không dấu
INSERT INTO feedbacks (id, tracking_code, access_token, sender_name, sender_email, sender_phone, sender_account_id, sender_province_union, title, content, status)
OVERRIDING SYSTEM VALUE VALUES
 (973001, 'D-FB-1', 'd-tok-1', '[D] Người gửi dv1', 'dv1-secret@example.com', '0900000001', 927, 'Tỉnh Đoàn Nghệ An', '[D] PA Nghệ An dv1', 'nd', 'NEW'),
 (973002, 'D-FB-2', 'd-tok-2', '[D] Khách TQ', 'tq-secret@example.com', '0900000002', NULL, 'Tỉnh đoàn Tuyên Quang', '[D] PA Tuyên Quang', 'nd', 'NEW'),
 (973003, 'D-FB-3', 'd-tok-3', '[D] Khách NA', 'na-secret@example.com', NULL, NULL, 'tinh doan nghe an', '[D] PA nghe an khong dau', 'nd', 'NEW');
INSERT INTO feedback_messages (id, feedback_id, sender_type, sender_name, sender_account_id, content, is_internal_note, sent_at)
OVERRIDING SYSTEM VALUE VALUES
 (973001, 973001, 'CITIZEN', 'dv1', NULL, '[D] tin người gửi', false, now() - interval '3 hour'),
 (973002, 973001, 'STAFF', 'Tỉnh NA', 921, 'D-GHI-CHU-NOI-BO', true, now() - interval '2 hour'),
 (973003, 973001, 'STAFF', 'Tỉnh NA', 921, '[D] trả lời công khai', false, now() - interval '1 hour'),
 (973004, 973002, 'STAFF', 'Tỉnh TQ', 922, '[D] trả lời TQ', false, now());
INSERT INTO email_logs (id, feedback_id, to_email, subject, body, email_kind, sent_by_account_id, delivery)
OVERRIDING SYSTEM VALUE VALUES
 (973001, 973001, 'dv1-secret@example.com', '[D] email dv1', 'b', 'REPLY', 921, 'SENT'),
 (973002, 973002, 'tq-secret@example.com', '[D] email TQ', 'b', 'REPLY', 922, 'SENT');

-- Thông báo của nhiều tài khoản
INSERT INTO notifications (id, recipient_account_id, notification_type, title, message)
OVERRIDING SYSTEM VALUE VALUES
 (973001, 927, 'TASK_ASSIGNED', '[D] TB dv1', 'm'),
 (973002, 928, 'TASK_ASSIGNED', '[D] TB dv2', 'm'),
 (973003, 921, 'TASK_ASSIGNED', '[D] TB tinh', 'm'),
 (973004, 924, 'TASK_ASSIGNED', '[D] TB donvi', 'm'),
 (973005, 920, 'TASK_ASSIGNED', '[D] TB tw', 'm');

-- HS3T
INSERT INTO hs3t_profiles (id, code, account_id, student_name, school_org_unit_id, class_name, awarded_level)
OVERRIDING SYSTEM VALUE VALUES
 (973001, 'D-HS3T-1', 927, '[D] HS Nguyễn Một', 131101, '12A1', 'XA'),
 (973002, 'D-HS3T-2', 928, '[D] HS Trần Hai', 131101, '12A2', NULL),
 (973003, 'D-HS3T-3', 925, '[D] HS Diễn Châu', 131103, '10A1', 'TINH');
INSERT INTO hs3t_achievements (id, profile_id, title, category, achieved_at, added_by_role, added_by_account_id)
OVERRIDING SYSTEM VALUE VALUES
 (973001, 973001, '[D] TT dv1', 'HOC_TAP', '2026-05-01', 'STUDENT', 927),
 (973002, 973002, '[D] TT dv2', 'HOC_TAP', '2026-05-01', 'STUDENT', 928),
 (973003, 973003, '[D] TT DC', 'HOC_TAP', '2026-05-01', 'SCHOOL', 925);

-- Đóng góp
INSERT INTO member_contributions (id, contributor_account_id, category_tag, title, content, status)
OVERRIDING SYSTEM VALUE VALUES
 (973001, 927, 'Tin', '[D] ĐG dv1', 'nd', 'PENDING'),
 (973002, 928, 'Tin', '[D] ĐG dv2', 'nd', 'APPROVED');
INSERT INTO contribution_logs (id, account_id, contribution_kind, ref_id, ref_title, points)
OVERRIDING SYSTEM VALUE VALUES
 (973001, 927, 'POST', 973001, '[D] điểm dv1', 10),
 (973002, 928, 'POST', 973002, '[D] điểm dv2', 5);

-- Phân công: TW → Nghệ An → TP Vinh → PBC; TW → Tuyên Quang
INSERT INTO task_assignments (id, task_id, org_unit_id, assigned_by_org_unit_id, parent_assignment_id, due_date, note)
OVERRIDING SYSTEM VALUE VALUES
 (973001, 100, 131, 1, NULL, '2026-12-31', '[D] PC NA'),
 (973002, 100, 13101, 131, 973001, '2026-12-31', '[D] PC Vinh'),
 (973003, 100, 131101, 13101, 973002, '2026-12-31', '[D] PC PBC'),
 (973004, 100, 100, 1, NULL, '2026-12-31', '[D] PC TQ');
INSERT INTO assignment_targets (id, task_assignment_id, task_metric_id, target_value)
OVERRIDING SYSTEM VALUE VALUES (973003, 973003, 200, 5), (973004, 973004, 200, 7);
INSERT INTO task_results (id, task_assignment_id, assignment_target_id, reported_value, report_note, reported_by_account_id)
OVERRIDING SYSTEM VALUE VALUES (973003, 973003, 973003, 3, '[D] KQ PBC', 924), (973004, 973004, 973004, 4, '[D] KQ TQ', 922);
INSERT INTO scores (id, criteria_set_id, task_id, org_unit_id, points, max_points, scoring_method, scored_by_account_id)
OVERRIDING SYSTEM VALUE VALUES (973001, 3, 100, 131, 5, 10, 'MANUAL', 920), (973002, 3, 100, 100, 6, 10, 'MANUAL', 920);
INSERT INTO reports (id, org_unit_id, title, report_type, period_year, period_start, period_end, status, created_by_account_id)
OVERRIDING SYSTEM VALUE VALUES
 (973001, 131101, '[D] BC PBC', 'ANNUAL', 2026, '2026-01-01', '2026-12-31', 'DRAFT', 924),
 (973002, 100, '[D] BC TQ', 'ANNUAL', 2026, '2026-01-01', '2026-12-31', 'DRAFT', 922);
INSERT INTO ranking_snapshots (id, name, criteria_set_id, scope_org_unit_id, ranked_org_level, ranking_type, period_type, period_start, period_end, total_units, generated_by_account_id, status)
OVERRIDING SYSTEM VALUE VALUES
 (973001, '[D] BXH đã chốt', 3, 1, 2, 'BY_SCORE', 'YEAR', '2026-01-01', '2026-12-31', 2, 920, 'FINALIZED'),
 (973002, '[D] BXH nháp TW', 3, 1, 2, 'BY_SCORE', 'YEAR', '2026-01-01', '2026-12-31', 2, 920, 'DRAFT');
INSERT INTO ranking_entries (id, snapshot_id, org_unit_id, rank_position, total_score)
OVERRIDING SYSTEM VALUE VALUES (973001, 973001, 100, 1, 6), (973002, 973001, 131, 2, 5), (973003, 973002, 131, 1, 9);
INSERT INTO org_directory (id, org_unit_id, secretary_name, secretary_phone, email)
OVERRIDING SYSTEM VALUE VALUES
 (973001, 131101, '[D] BT PBC', '0911111111', 'pbc-secret@example.com'),
 (973002, 100, '[D] BT TQ', '0922222222', 'tq-dir@example.com');
COMMIT;
