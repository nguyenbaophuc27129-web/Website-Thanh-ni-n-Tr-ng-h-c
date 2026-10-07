-- ════════════════════════════════════════════════════════════════════════
--  Kiểm thử schema_v1.sql — chạy trên database vừa dựng schema:
--      psql -v ON_ERROR_STOP=1 -d <database> -f db/test_schema.sql
--  Toàn bộ chạy trong 1 transaction rồi ROLLBACK: không để lại dữ liệu.
--  Mỗi kịch bản in "OK ..." ; sai kỳ vọng thì dừng ngay với lỗi.
-- ════════════════════════════════════════════════════════════════════════

\set QUIET on
\o /dev/null
BEGIN;

-- Chạy 1 câu lệnh và kỳ vọng CSDL từ chối với đúng loại lỗi
CREATE FUNCTION pg_temp.expect_fail(label TEXT, stmt TEXT, expected_state TEXT) RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = expected_state THEN
      RAISE NOTICE 'OK  [chặn đúng] %', label;
      RETURN;
    END IF;
    RAISE EXCEPTION 'SAI [%]: mong lỗi %, nhận % (%)', label, expected_state, SQLSTATE, SQLERRM;
  END;
  RAISE EXCEPTION 'SAI [%]: câu lệnh lẽ ra phải bị chặn nhưng lại chạy được', label;
END $$;

CREATE FUNCTION pg_temp.ok(label TEXT, cond BOOLEAN) RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  IF cond IS NOT TRUE THEN RAISE EXCEPTION 'SAI [%]', label; END IF;
  RAISE NOTICE 'OK  %', label;
END $$;

-- ── Cấu trúc ────────────────────────────────────────────────────────────

SELECT pg_temp.ok('S1 đủ 43 bảng', count(*) = 43)
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = current_schema() AND c.relkind IN ('r', 'p') AND NOT c.relispartition;

-- Mọi khóa ngoại đều có index bắt đầu bằng đúng các cột của khóa
SELECT pg_temp.ok('S2 mọi khóa ngoại đều có index', count(*) = 0)
  FROM pg_constraint con
 WHERE con.contype = 'f'
   AND con.connamespace = current_schema()::regnamespace
   AND con.conparentid = 0
   AND NOT EXISTS (
         SELECT 1 FROM pg_index i
          WHERE i.indrelid = con.conrelid
            AND i.indpred IS NULL
            AND (i.indkey::int2[])[0:cardinality(con.conkey) - 1] @> con.conkey
            AND (i.indkey::int2[])[0:cardinality(con.conkey) - 1] <@ con.conkey);

-- ── Dữ liệu nền cho các kịch bản ────────────────────────────────────────

INSERT INTO school_types (code, name) VALUES ('THPT', 'Trung học phổ thông');

INSERT INTO org_units (code, name, org_level) VALUES ('TW', 'Ban Thanh niên Trường học', 1);
INSERT INTO org_units (parent_id, code, name, org_level)
  SELECT id, 'BD', 'Tỉnh Đoàn Bình Dương', 2 FROM org_units WHERE code = 'TW';
INSERT INTO org_units (parent_id, code, name, org_level)
  SELECT id, 'HCM', 'Thành Đoàn TP. Hồ Chí Minh', 2 FROM org_units WHERE code = 'TW';
INSERT INTO org_units (parent_id, code, name, org_level)
  SELECT id, 'BD-HT', 'Đoàn Phường Hiệp Thành', 3 FROM org_units WHERE code = 'BD';
INSERT INTO org_units (parent_id, code, name, org_level, school_type_id)
  SELECT o.id, 'BD-HT-CPH', 'Đoàn THPT Chánh Phú Hưng', 4, s.id
    FROM org_units o, school_types s WHERE o.code = 'BD-HT' AND s.code = 'THPT';

INSERT INTO accounts (org_unit_id, username, email, password_hash, status)
  SELECT id, lower(code) || '.admin', lower(code) || '@example.vn', 'x', 'ACTIVE' FROM org_units;

CREATE FUNCTION pg_temp.ou(c TEXT) RETURNS BIGINT LANGUAGE sql AS $$ SELECT id FROM org_units WHERE code = c $$;
CREATE FUNCTION pg_temp.acc(c TEXT) RETURNS BIGINT LANGUAGE sql AS
  $$ SELECT a.id FROM accounts a JOIN org_units o ON o.id = a.org_unit_id WHERE o.code = c $$;

-- ── Kịch bản khẳng định ─────────────────────────────────────────────────

-- P1. Trigger sinh path và depth
SELECT pg_temp.ok('P1 trigger sinh path/depth',
         s.path = tw.path || bd.id || '/' || ht.id || '/' || s.id || '/' AND s.depth = 3 AND tw.depth = 0)
  FROM org_units s, org_units ht, org_units bd, org_units tw
 WHERE s.code = 'BD-HT-CPH' AND ht.code = 'BD-HT' AND bd.code = 'BD' AND tw.code = 'TW';

-- P2. Truy vấn phạm vi quản lý bằng path
SELECT pg_temp.ok('P2 phạm vi quản lý của Tỉnh Đoàn BD = 3 đơn vị', count(*) = 3)
  FROM org_units WHERE path LIKE (SELECT path FROM org_units WHERE code = 'BD') || '%';

-- P3. Chuyển đơn vị sang cha khác: path cấp dưới tự cập nhật
UPDATE org_units SET parent_id = pg_temp.ou('HCM') WHERE code = 'BD-HT';
SELECT pg_temp.ok('P3 cascade path khi chuyển đơn vị',
         s.path = hcm.path || ht.id || '/' || s.id || '/' AND s.depth = 3)
  FROM org_units s, org_units ht, org_units hcm
 WHERE s.code = 'BD-HT-CPH' AND ht.code = 'BD-HT' AND hcm.code = 'HCM';
UPDATE org_units SET parent_id = pg_temp.ou('BD') WHERE code = 'BD-HT';

-- P4. Tìm tên đơn vị không dấu
SELECT pg_temp.ok('P4 tìm tên đơn vị không dấu', count(*) = 1)
  FROM org_units WHERE immutable_unaccent(name) ILIKE '%chanh phu hung%';

-- P5. Hoạt động gắn nhiều nhóm nội dung + tìm kiếm toàn văn không dấu
INSERT INTO content_categories (code, name) VALUES ('HOC_TAP', 'Học tập'), ('TINH_NGUYEN', 'Tình nguyện');
INSERT INTO activities (org_unit_id, title, summary, start_date, activity_type, created_by_account_id)
  VALUES (pg_temp.ou('BD-HT-CPH'), 'Ngày hội Đọc sách', 'Giao lưu tác giả và quyên góp sách cho thư viện',
          '2026-09-10', 'GENERAL', pg_temp.acc('BD-HT-CPH'));
INSERT INTO activity_categories (activity_id, content_category_id)
  SELECT a.id, c.id FROM activities a, content_categories c;
SELECT pg_temp.ok('P5a hoạt động gắn 2 nhóm nội dung', count(*) = 2) FROM activity_categories;
SELECT pg_temp.ok('P5b tìm kiếm toàn văn không dấu', count(*) = 1)
  FROM activities WHERE search_vector @@ to_tsquery('simple', immutable_unaccent('đọc & sách & viện'));

-- P6. Phân bổ chỉ tiêu nhiều cấp: tổng cấp dưới đối chiếu được với chỉ tiêu cấp trên
INSERT INTO criteria_sets (code, name, year, owner_org_unit_id, status)
  VALUES ('TD-2026', 'Bộ tiêu chí thi đua 2026', 2026, pg_temp.ou('TW'), 'ACTIVE');
INSERT INTO tasks (criteria_set_id, code, title, task_kind, max_points, scoring_method, created_by_org_unit_id, status)
  SELECT id, 'I.1', 'Tổ chức hoạt động đọc sách', 'CRITERION', 10, 'AUTO_AGGREGATE', pg_temp.ou('TW'), 'PUBLISHED'
    FROM criteria_sets;
INSERT INTO task_metrics (task_id, code, name, unit_of_measure, aggregation_type)
  SELECT id, 'SO_HD', 'Số hoạt động tổ chức', 'hoạt động', 'SUM' FROM tasks;
INSERT INTO task_assignments (task_id, org_unit_id, assigned_by_org_unit_id)
  SELECT id, pg_temp.ou('BD'), pg_temp.ou('TW') FROM tasks;
INSERT INTO task_assignments (task_id, org_unit_id, assigned_by_org_unit_id, parent_assignment_id)
  SELECT t.id, pg_temp.ou('BD-HT-CPH'), pg_temp.ou('BD'), ta.id FROM tasks t, task_assignments ta;
INSERT INTO assignment_targets (task_assignment_id, task_metric_id, target_value)
  SELECT ta.id, m.id, CASE WHEN ta.parent_assignment_id IS NULL THEN 100 ELSE 40 END
    FROM task_assignments ta, task_metrics m;
SELECT pg_temp.ok('P6 tổng phân bổ cấp dưới (40) ≤ chỉ tiêu cấp trên (100)',
         (SELECT sum(ct.target_value) FROM task_assignments c
            JOIN assignment_targets ct ON ct.task_assignment_id = c.id
           WHERE c.parent_assignment_id = p.id) <= pt.target_value)
  FROM task_assignments p JOIN assignment_targets pt ON pt.task_assignment_id = p.id
 WHERE p.parent_assignment_id IS NULL;

-- P7. Hoạt động làm minh chứng cho nhiệm vụ của CHÍNH đơn vị đó
INSERT INTO activity_task_links (activity_id, task_assignment_id, org_unit_id)
  SELECT a.id, ta.id, a.org_unit_id FROM activities a, task_assignments ta
   WHERE ta.org_unit_id = a.org_unit_id;
SELECT pg_temp.ok('P7 gắn minh chứng cùng đơn vị', count(*) = 1) FROM activity_task_links;

-- P8. Gửi phản ánh không cần đăng nhập + trao đổi
INSERT INTO feedbacks (tracking_code, access_token, sender_name, sender_email, title, content)
  VALUES ('PA-2026-000001', repeat('a', 64), 'Nguyễn Văn A', 'A@Example.vn', 'Góp ý', 'Nội dung góp ý');
INSERT INTO feedback_messages (feedback_id, sender_type, content)
  SELECT id, 'CITIZEN', 'Bổ sung thông tin' FROM feedbacks;
INSERT INTO feedback_messages (feedback_id, sender_type, sender_account_id, content, is_internal_note)
  SELECT id, 'STAFF', pg_temp.acc('TW'), 'Ghi chú nội bộ', TRUE FROM feedbacks;
SELECT pg_temp.ok('P8 phản ánh không đăng nhập, email không phân biệt hoa thường', count(*) = 1)
  FROM feedbacks WHERE sender_email = 'a@example.vn' AND status = 'NEW';

-- P9. Ghi log vào bảng phân vùng: tháng hiện tại vào đúng phân vùng tháng, tháng xa vào DEFAULT
INSERT INTO post_views (post_id, viewed_at) VALUES (1, now()), (1, '2099-01-15T00:00:00Z');
INSERT INTO audit_logs (action, entity_type) VALUES ('TEST', 'schema');
SELECT pg_temp.ok('P9 phân vùng theo tháng + phân vùng DEFAULT',
         (SELECT count(*) FROM post_views_default) = 1
     AND (SELECT count(*) FROM post_views) = 2
     AND (SELECT count(*) FROM audit_logs_default) = 0);

-- P10. Trigger updated_at
UPDATE org_units SET address = 'Hà Nội', updated_at = '2000-01-01' WHERE code = 'TW';
SELECT pg_temp.ok('P10 updated_at tự cập nhật', updated_at > '2026-01-01') FROM org_units WHERE code = 'TW';

-- P11. Tên tài khoản không phân biệt hoa thường
SELECT pg_temp.ok('P11 username không phân biệt hoa thường', count(*) = 1)
  FROM accounts WHERE username = 'TW.ADMIN';

-- ── Kịch bản phủ định: CSDL phải tự chặn ────────────────────────────────

SELECT pg_temp.expect_fail('N1 hai tài khoản cho cùng một đơn vị', format(
  $$INSERT INTO accounts (org_unit_id, username, email, password_hash) VALUES (%s, 'tw2', 'tw2@example.vn', 'x')$$,
  pg_temp.ou('TW')), '23505');

SELECT pg_temp.expect_fail('N2 đơn vị cấp 1 mà có cha', format(
  $$INSERT INTO org_units (parent_id, code, name, org_level) VALUES (%s, 'X1', 'x', 1)$$, pg_temp.ou('TW')), '23514');

SELECT pg_temp.expect_fail('N3 đơn vị cấp 2 không có cha',
  $$INSERT INTO org_units (code, name, org_level) VALUES ('X2', 'x', 2)$$, '23514');

SELECT pg_temp.expect_fail('N4 gán loại hình trường cho đơn vị không phải cấp 4', format(
  $$UPDATE org_units SET school_type_id = (SELECT id FROM school_types LIMIT 1) WHERE id = %s$$,
  pg_temp.ou('BD')), '23514');

SELECT pg_temp.expect_fail('N5 chuyển đơn vị vào cấp dưới của chính nó', format(
  $$UPDATE org_units SET parent_id = %s WHERE id = %s$$, pg_temp.ou('BD-HT'), pg_temp.ou('BD')), 'P0001');

SELECT pg_temp.expect_fail('N6 hoạt động có ngày kết thúc trước ngày bắt đầu', format(
  $$INSERT INTO activities (org_unit_id, title, start_date, end_date, activity_type, created_by_account_id)
    VALUES (%s, 'x', '2026-09-10', '2026-09-01', 'GENERAL', %s)$$, pg_temp.ou('BD'), pg_temp.acc('BD')), '23514');

SELECT pg_temp.expect_fail('N7 tóm tắt hoạt động quá 2000 ký tự', format(
  $$INSERT INTO activities (org_unit_id, title, summary, start_date, activity_type, created_by_account_id)
    VALUES (%s, 'x', repeat('a', 2001), '2026-09-10', 'GENERAL', %s)$$, pg_temp.ou('BD'), pg_temp.acc('BD')), '23514');

SELECT pg_temp.expect_fail('N8 link truyền thông không bắt đầu bằng http(s)://',
  $$INSERT INTO activity_links (activity_id, platform, url) SELECT id, 'FACEBOOK', 'facebook.com/abc' FROM activities$$,
  '23514');

SELECT pg_temp.expect_fail('N9 lấy hoạt động đơn vị A làm minh chứng cho nhiệm vụ đơn vị B', format(
  $$INSERT INTO activity_task_links (activity_id, task_assignment_id, org_unit_id)
    SELECT a.id, ta.id, ta.org_unit_id FROM activities a, task_assignments ta WHERE ta.org_unit_id = %s$$,
  pg_temp.ou('BD')), '23503');

SELECT pg_temp.expect_fail('N10 giao một nhiệm vụ cho một đơn vị hai lần', format(
  $$INSERT INTO task_assignments (task_id, org_unit_id, assigned_by_org_unit_id) SELECT id, %s, %s FROM tasks$$,
  pg_temp.ou('BD'), pg_temp.ou('TW')), '23505');

SELECT pg_temp.expect_fail('N11 chấm điểm vượt điểm tối đa', format(
  $$INSERT INTO scores (criteria_set_id, task_id, org_unit_id, points, max_points, scoring_method)
    SELECT criteria_set_id, id, %s, 11, 10, 'MANUAL_CONFIRM' FROM tasks$$, pg_temp.ou('BD')), '23514');

SELECT pg_temp.expect_fail('N12 chỉ tiêu âm',
  $$UPDATE assignment_targets SET target_value = -1$$, '23514');

INSERT INTO task_results (task_assignment_id, reported_value, reported_by_account_id)
  SELECT id, 5, pg_temp.acc('BD') FROM task_assignments WHERE parent_assignment_id IS NULL;
SELECT pg_temp.expect_fail('N13 sửa dòng trong task_results (append-only)',
  $$UPDATE task_results SET reported_value = 99$$, 'P0001');

SELECT pg_temp.expect_fail('N14 bài PUBLISHED mà thiếu published_at', format(
  $$INSERT INTO published_posts (slug, title, status, editor_account_id) VALUES ('bai-1', 'x', 'PUBLISHED', %s)$$,
  pg_temp.acc('TW')), '23514');

INSERT INTO published_posts (activity_id, slug, title, editor_account_id)
  SELECT id, 'ngay-hoi-doc-sach', title, pg_temp.acc('TW') FROM activities;
SELECT pg_temp.expect_fail('N15 một hoạt động xuất bản thành hai bài', format(
  $$INSERT INTO published_posts (activity_id, slug, title, editor_account_id)
    SELECT id, 'ngay-hoi-doc-sach-2', title, %s FROM activities$$, pg_temp.acc('TW')), '23505');

SELECT pg_temp.expect_fail('N16 báo cáo tháng với số tháng 13', format(
  $$INSERT INTO reports (org_unit_id, title, report_type, period_year, period_number, period_start, period_end, created_by_account_id)
    VALUES (%s, 'x', 'MONTHLY', 2026, 13, '2026-01-01', '2026-01-31', %s)$$, pg_temp.ou('BD'), pg_temp.acc('BD')), '23514');

SELECT pg_temp.expect_fail('N17 báo cáo quý thiếu số quý', format(
  $$INSERT INTO reports (org_unit_id, title, report_type, period_year, period_start, period_end, created_by_account_id)
    VALUES (%s, 'x', 'QUARTERLY', 2026, '2026-01-01', '2026-03-31', %s)$$, pg_temp.ou('BD'), pg_temp.acc('BD')), '23514');

SELECT pg_temp.expect_fail('N18 phản ánh với email sai định dạng',
  $$INSERT INTO feedbacks (tracking_code, access_token, sender_name, sender_email, title, content)
    VALUES ('PA-2026-000002', 'x', 'B', 'khong-phai-email', 't', 'c')$$, '23514');

SELECT pg_temp.expect_fail('N19 tin nhắn STAFF không có tài khoản',
  $$INSERT INTO feedback_messages (feedback_id, sender_type, content) SELECT id, 'STAFF', 'x' FROM feedbacks$$, '23514');

SELECT pg_temp.expect_fail('N20 người dân tạo ghi chú nội bộ',
  $$INSERT INTO feedback_messages (feedback_id, sender_type, content, is_internal_note)
    SELECT id, 'CITIZEN', 'x', TRUE FROM feedbacks$$, '23514');

INSERT INTO notifications (recipient_account_id, notification_type, title, dedupe_key)
  VALUES (pg_temp.acc('BD'), 'TASK_DUE_SOON', 'Sắp đến hạn', 'TASK_DUE:1:D7');
SELECT pg_temp.expect_fail('N21 gửi trùng thông báo (dedupe_key)', format(
  $$INSERT INTO notifications (recipient_account_id, notification_type, title, dedupe_key)
    VALUES (%s, 'TASK_DUE_SOON', 'Sắp đến hạn', 'TASK_DUE:1:D7')$$, pg_temp.acc('BD')), '23505');

SELECT pg_temp.expect_fail('N22 trạng thái tài khoản ngoài danh sách',
  $$UPDATE accounts SET status = 'BANNED'$$, '23514');

ROLLBACK;
\o
\echo 'HOÀN TẤT: mọi kịch bản đạt (dữ liệu thử đã được ROLLBACK).'
