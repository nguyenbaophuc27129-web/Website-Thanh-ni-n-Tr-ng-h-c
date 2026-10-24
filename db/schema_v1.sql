-- ════════════════════════════════════════════════════════════════════════
--  CSDL Website Thanh niên Trường học — schema v1 (43 bảng, 8 phân hệ)
--  Dựng lại từ đặc tả "THIET-KE-SCHEMA (1).md" (bản 1.0, 07/09/2026).
--  DBMS: PostgreSQL 15+ (đang chạy 16). Chạy bằng tài khoản CHỦ SỞ HỮU database:
--      psql -v ON_ERROR_STOP=1 -d <database> -f db/schema_v1.sql
--  File chỉ tạo cấu trúc, KHÔNG nạp dữ liệu mẫu.
-- ════════════════════════════════════════════════════════════════════════

BEGIN;

CREATE EXTENSION IF NOT EXISTS citext;     -- username/email không phân biệt hoa thường
CREATE EXTENSION IF NOT EXISTS pg_trgm;    -- tìm gần đúng theo tên
CREATE EXTENSION IF NOT EXISTS unaccent;   -- tìm kiếm không dấu

-- ────────────────────────────────────────────────────────────────────────
--  Hàm dùng chung
-- ────────────────────────────────────────────────────────────────────────

-- unaccent() gốc là STABLE nên không dùng được trong generated column / index;
-- bọc lại thành IMMUTABLE với từ điển chỉ định tường minh.
CREATE FUNCTION immutable_unaccent(text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

CREATE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- ════════════════════════════════════════════════════════════════════════
--  PHÂN HỆ 1 — TỔ CHỨC & TÀI KHOẢN
-- ════════════════════════════════════════════════════════════════════════

-- 1. Đơn vị hành chính (tỉnh → xã/phường/đặc khu)
CREATE TABLE admin_units (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  parent_id   BIGINT REFERENCES admin_units (id),
  code        VARCHAR(20)  NOT NULL UNIQUE,
  name        VARCHAR(150) NOT NULL,
  unit_type   VARCHAR(20)  NOT NULL
              CONSTRAINT admin_units_unit_type_ck
              CHECK (unit_type IN ('PROVINCE', 'WARD', 'COMMUNE', 'SPECIAL_ZONE')),
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX admin_units_parent_id_idx ON admin_units (parent_id);

-- 8. Danh mục loại hình trường
CREATE TABLE school_types (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code          VARCHAR(30)  NOT NULL UNIQUE,
  name          VARCHAR(150) NOT NULL,
  display_order SMALLINT     NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 2. Đơn vị Đoàn 4 cấp — bảng gốc toàn hệ thống
CREATE TABLE org_units (
  id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  parent_id      BIGINT REFERENCES org_units (id),
  code           VARCHAR(50)  NOT NULL UNIQUE,
  name           VARCHAR(255) NOT NULL,
  short_name     VARCHAR(100),
  org_level      SMALLINT     NOT NULL
                 CONSTRAINT org_units_org_level_ck CHECK (org_level BETWEEN 1 AND 4),
  path           VARCHAR(255) NOT NULL,   -- [D] /1/12/345/ — trigger tự sinh
  depth          SMALLINT     NOT NULL,   -- [D] số cấp tổ tiên (gốc = 0)
  admin_unit_id  BIGINT REFERENCES admin_units (id),
  school_type_id BIGINT REFERENCES school_types (id),
  address        VARCHAR(255),
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ,
  CONSTRAINT org_units_parent_by_level_ck
    CHECK ((org_level = 1 AND parent_id IS NULL) OR (org_level > 1 AND parent_id IS NOT NULL)),
  CONSTRAINT org_units_school_type_level_ck
    CHECK (school_type_id IS NULL OR org_level = 4),
  CONSTRAINT org_units_not_own_parent_ck CHECK (parent_id <> id)
);
CREATE INDEX org_units_parent_id_idx      ON org_units (parent_id);
CREATE INDEX org_units_admin_unit_id_idx  ON org_units (admin_unit_id);
CREATE INDEX org_units_school_type_id_idx ON org_units (school_type_id);
-- Phạm vi quản lý: WHERE path LIKE '/1/12/%'
CREATE INDEX org_units_path_idx           ON org_units (path varchar_pattern_ops);
-- Tìm tên đơn vị không dấu: WHERE immutable_unaccent(name) ILIKE '%binh duong%'
CREATE INDEX org_units_name_trgm_idx      ON org_units USING gin (immutable_unaccent(name) gin_trgm_ops);

-- Sinh path/depth khi thêm mới hoặc đổi đơn vị cha
CREATE FUNCTION org_units_set_path() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  parent_path  VARCHAR(255);
  parent_depth SMALLINT;
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.path  := '/' || NEW.id || '/';
    NEW.depth := 0;
    RETURN NEW;
  END IF;

  SELECT path, depth INTO parent_path, parent_depth FROM org_units WHERE id = NEW.parent_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Đơn vị cha % không tồn tại', NEW.parent_id;
  END IF;
  IF TG_OP = 'UPDATE' AND parent_path LIKE OLD.path || '%' THEN
    RAISE EXCEPTION 'Không thể chuyển đơn vị % vào chính nó hoặc đơn vị cấp dưới của nó', NEW.id;
  END IF;

  NEW.path  := parent_path || NEW.id || '/';
  NEW.depth := parent_depth + 1;
  RETURN NEW;
END $$;

CREATE TRIGGER org_units_set_path_trg
BEFORE INSERT OR UPDATE OF parent_id ON org_units
FOR EACH ROW EXECUTE FUNCTION org_units_set_path();

-- Khi chuyển đơn vị sang cha khác: cập nhật path/depth của toàn bộ cấp dưới
CREATE FUNCTION org_units_cascade_path() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.path IS DISTINCT FROM OLD.path THEN
    UPDATE org_units
       SET path  = NEW.path || substr(path, length(OLD.path) + 1),
           depth = depth + (NEW.depth - OLD.depth)
     WHERE path LIKE OLD.path || '%'
       AND id <> NEW.id;
  END IF;
  RETURN NULL;
END $$;

CREATE TRIGGER org_units_cascade_path_trg
AFTER UPDATE OF parent_id ON org_units
FOR EACH ROW EXECUTE FUNCTION org_units_cascade_path();

-- 3. Tài khoản đăng nhập (1 đơn vị = 1 tài khoản)
CREATE TABLE accounts (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- UQ thực thi quy tắc 1 đơn vị = 1 tài khoản; muốn mở nhiều tài khoản/đơn vị thì bỏ ràng buộc này
  org_unit_id          BIGINT       NOT NULL REFERENCES org_units (id)
                       CONSTRAINT accounts_org_unit_id_key UNIQUE,
  username             CITEXT       NOT NULL UNIQUE,
  email                CITEXT       NOT NULL UNIQUE,
  phone                VARCHAR(20),
  password_hash        VARCHAR(255) NOT NULL,   -- bcrypt / argon2id
  contact_person       VARCHAR(150),
  contact_position     VARCHAR(150),
  status               VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                       CONSTRAINT accounts_status_ck
                       CHECK (status IN ('PENDING', 'ACTIVE', 'LOCKED', 'DISABLED')),
  must_change_password BOOLEAN      NOT NULL DEFAULT TRUE,
  last_login_at        TIMESTAMPTZ,
  password_changed_at  TIMESTAMPTZ,
  failed_login_count   SMALLINT     NOT NULL DEFAULT 0
                       CONSTRAINT accounts_failed_login_count_ck CHECK (failed_login_count >= 0),
  locked_until         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ
);

-- 4. Vai trò
CREATE TABLE roles (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code        VARCHAR(50)  NOT NULL UNIQUE,
  name        VARCHAR(150) NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 5. Quyền chi tiết
CREATE TABLE permissions (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code        VARCHAR(100) NOT NULL UNIQUE,
  name        VARCHAR(200) NOT NULL,
  group_name  VARCHAR(100),
  description TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 6. Nối vai trò ↔ quyền
CREATE TABLE role_permissions (
  role_id       BIGINT NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);
CREATE INDEX role_permissions_permission_id_idx ON role_permissions (permission_id);

-- 7. Nối tài khoản ↔ vai trò
CREATE TABLE account_roles (
  account_id            BIGINT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  role_id               BIGINT NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
  granted_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by_account_id BIGINT REFERENCES accounts (id),
  PRIMARY KEY (account_id, role_id)
);
CREATE INDEX account_roles_role_id_idx               ON account_roles (role_id);
CREATE INDEX account_roles_granted_by_account_id_idx ON account_roles (granted_by_account_id);

-- 9. Kho file dùng chung toàn hệ thống
CREATE TABLE files (
  id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  storage_path           VARCHAR(500) NOT NULL,
  original_name          VARCHAR(255) NOT NULL,
  mime_type              VARCHAR(100) NOT NULL,
  size_bytes             BIGINT       NOT NULL
                         CONSTRAINT files_size_bytes_ck CHECK (size_bytes > 0),
  checksum_sha256        CHAR(64),
  uploaded_by_account_id BIGINT REFERENCES accounts (id),
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at             TIMESTAMPTZ
);
CREATE INDEX files_uploaded_by_account_id_idx ON files (uploaded_by_account_id);
CREATE INDEX files_checksum_sha256_idx        ON files (checksum_sha256);

-- ════════════════════════════════════════════════════════════════════════
--  PHÂN HỆ 2 — HOẠT ĐỘNG
-- ════════════════════════════════════════════════════════════════════════

-- 10. Hoạt động do đơn vị cập nhật
CREATE TABLE activities (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_unit_id           BIGINT       NOT NULL REFERENCES org_units (id),
  title                 VARCHAR(255) NOT NULL,
  summary               TEXT
                        CONSTRAINT activities_summary_length_ck CHECK (char_length(summary) <= 2000),
  start_date            DATE         NOT NULL,
  end_date              DATE,
  location              VARCHAR(255),
  participant_count     INTEGER
                        CONSTRAINT activities_participant_count_ck CHECK (participant_count >= 0),
  activity_type         VARCHAR(20)  NOT NULL
                        CONSTRAINT activities_activity_type_ck
                        CHECK (activity_type IN ('TASK_BASED', 'GENERAL')),
  status                VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'
                        CONSTRAINT activities_status_ck
                        CHECK (status IN ('DRAFT', 'SUBMITTED', 'REVISED')),
  confirm_status        VARCHAR(20)  NOT NULL DEFAULT 'NOT_REQUIRED'
                        CONSTRAINT activities_confirm_status_ck
                        CHECK (confirm_status IN ('NOT_REQUIRED', 'PENDING', 'CONFIRMED', 'NEEDS_INFO', 'REJECTED')),
  created_by_account_id BIGINT       NOT NULL REFERENCES accounts (id),
  updated_by_account_id BIGINT REFERENCES accounts (id),
  -- [D] tìm kiếm toàn văn không dấu
  search_vector         TSVECTOR GENERATED ALWAYS AS (
                          to_tsvector('simple',
                            immutable_unaccent(coalesce(title, '') || ' ' || coalesce(summary, '')))
                        ) STORED,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ,
  CONSTRAINT activities_date_range_ck CHECK (end_date >= start_date),
  -- phục vụ khóa ngoại phức hợp tại activity_task_links
  CONSTRAINT activities_id_org_unit_id_key UNIQUE (id, org_unit_id)
);
CREATE INDEX activities_org_unit_start_date_idx       ON activities (org_unit_id, start_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX activities_org_unit_id_idx               ON activities (org_unit_id);
CREATE INDEX activities_created_by_account_id_idx     ON activities (created_by_account_id);
CREATE INDEX activities_updated_by_account_id_idx     ON activities (updated_by_account_id);
CREATE INDEX activities_search_vector_idx             ON activities USING gin (search_vector);
CREATE INDEX activities_confirm_status_idx            ON activities (confirm_status) WHERE deleted_at IS NULL;

-- 11. Link bài đã đăng trên FB/website/báo
CREATE TABLE activity_links (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  activity_id BIGINT      NOT NULL REFERENCES activities (id) ON DELETE CASCADE,
  platform    VARCHAR(30) NOT NULL
              CONSTRAINT activity_links_platform_ck
              CHECK (platform IN ('FACEBOOK', 'WEBSITE', 'ZALO', 'TIKTOK', 'YOUTUBE', 'PRESS', 'OTHER')),
  url         TEXT        NOT NULL
              CONSTRAINT activity_links_url_ck CHECK (url ~* '^https?://'),
  note        VARCHAR(255),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX activity_links_activity_id_idx ON activity_links (activity_id);

-- 12. Danh mục nhóm nội dung
CREATE TABLE content_categories (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  parent_id     BIGINT REFERENCES content_categories (id),
  code          VARCHAR(50)  NOT NULL UNIQUE,
  name          VARCHAR(200) NOT NULL,
  description   TEXT,
  display_order SMALLINT     NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX content_categories_parent_id_idx ON content_categories (parent_id);

-- 13. Nối hoạt động ↔ nhóm nội dung (N-N)
CREATE TABLE activity_categories (
  activity_id         BIGINT NOT NULL REFERENCES activities (id) ON DELETE CASCADE,
  content_category_id BIGINT NOT NULL REFERENCES content_categories (id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (activity_id, content_category_id)
);
CREATE INDEX activity_categories_content_category_id_idx ON activity_categories (content_category_id);

-- 14. Nối hoạt động ↔ file ảnh
CREATE TABLE activity_files (
  activity_id   BIGINT   NOT NULL REFERENCES activities (id) ON DELETE CASCADE,
  file_id       BIGINT   NOT NULL REFERENCES files (id),
  display_order SMALLINT NOT NULL DEFAULT 0,
  is_cover      BOOLEAN  NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (activity_id, file_id)
);
CREATE INDEX activity_files_file_id_idx ON activity_files (file_id);

-- ════════════════════════════════════════════════════════════════════════
--  PHÂN HỆ 3–4 — NHIỆM VỤ, CHỈ TIÊU & ĐÁNH GIÁ
-- ════════════════════════════════════════════════════════════════════════

-- 15. Bộ tiêu chí theo từng năm
CREATE TABLE criteria_sets (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code              VARCHAR(50)  NOT NULL,
  name              VARCHAR(255) NOT NULL,
  year              SMALLINT     NOT NULL
                    CONSTRAINT criteria_sets_year_ck CHECK (year BETWEEN 2020 AND 2100),
  owner_org_unit_id BIGINT       NOT NULL REFERENCES org_units (id),
  target_org_level  SMALLINT
                    CONSTRAINT criteria_sets_target_org_level_ck CHECK (target_org_level BETWEEN 1 AND 4),
  total_points      NUMERIC(7,2)
                    CONSTRAINT criteria_sets_total_points_ck CHECK (total_points >= 0),
  effective_from    DATE,
  effective_to      DATE,
  status            VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'
                    CONSTRAINT criteria_sets_status_ck
                    CHECK (status IN ('DRAFT', 'ACTIVE', 'CLOSED', 'ARCHIVED')),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,
  CONSTRAINT criteria_sets_effective_range_ck CHECK (effective_to >= effective_from),
  CONSTRAINT criteria_sets_owner_year_code_key UNIQUE (owner_org_unit_id, year, code)
);

-- 16. Nhiệm vụ / tiêu chí đánh giá (cây I → I.1 → I.1.a)
CREATE TABLE tasks (
  id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  criteria_set_id        BIGINT REFERENCES criteria_sets (id),   -- NULL = nhiệm vụ giao đột xuất
  parent_task_id         BIGINT REFERENCES tasks (id),
  code                   VARCHAR(50),
  title                  VARCHAR(500) NOT NULL,
  description            TEXT,
  task_kind              VARCHAR(20)  NOT NULL
                         CONSTRAINT tasks_task_kind_ck CHECK (task_kind IN ('TASK', 'CRITERION')),
  max_points             NUMERIC(6,2)
                         CONSTRAINT tasks_max_points_ck CHECK (max_points >= 0),
  requirement            TEXT,
  tracking_method        TEXT,
  scoring_method         VARCHAR(30)  NOT NULL
                         CONSTRAINT tasks_scoring_method_ck
                         CHECK (scoring_method IN ('AUTO_AGGREGATE', 'MANUAL_CONFIRM', 'EXPERT_REVIEW', 'OTHER')),
  due_date               DATE,
  created_by_org_unit_id BIGINT       NOT NULL REFERENCES org_units (id),
  responsible_dept       VARCHAR(255),
  target_org_level       SMALLINT
                         CONSTRAINT tasks_target_org_level_ck CHECK (target_org_level BETWEEN 1 AND 4),
  display_order          SMALLINT     NOT NULL DEFAULT 0,
  status                 VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'
                         CONSTRAINT tasks_status_ck CHECK (status IN ('DRAFT', 'PUBLISHED', 'CLOSED')),
  created_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at             TIMESTAMPTZ,
  CONSTRAINT tasks_not_own_parent_ck CHECK (parent_task_id <> id)
);
CREATE INDEX tasks_criteria_set_id_idx        ON tasks (criteria_set_id);
CREATE INDEX tasks_parent_task_id_idx         ON tasks (parent_task_id);
CREATE INDEX tasks_created_by_org_unit_id_idx ON tasks (created_by_org_unit_id);

-- 17. Định nghĩa chỉ tiêu định lượng của nhiệm vụ
CREATE TABLE task_metrics (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id          BIGINT       NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  code             VARCHAR(50)  NOT NULL,
  name             VARCHAR(255) NOT NULL,
  unit_of_measure  VARCHAR(50)  NOT NULL,
  aggregation_type VARCHAR(20)  NOT NULL
                   CONSTRAINT task_metrics_aggregation_type_ck
                   CHECK (aggregation_type IN ('SUM', 'COUNT', 'AVG', 'MAX', 'PERCENT')),
  display_order    SMALLINT     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT task_metrics_task_code_key UNIQUE (task_id, code)
);

-- 18. Giao nhiệm vụ cho đơn vị (hỗ trợ phân bổ nhiều cấp)
CREATE TABLE task_assignments (
  id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_id                 BIGINT       NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
  org_unit_id             BIGINT       NOT NULL REFERENCES org_units (id),   -- đơn vị NHẬN
  assigned_by_org_unit_id BIGINT       NOT NULL REFERENCES org_units (id),   -- đơn vị GIAO
  parent_assignment_id    BIGINT REFERENCES task_assignments (id),           -- lượt giao ở cấp trên
  due_date                DATE,
  progress_status         VARCHAR(20)  NOT NULL DEFAULT 'NOT_STARTED'
                          CONSTRAINT task_assignments_progress_status_ck
                          CHECK (progress_status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE')),
  confirm_status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING'
                          CONSTRAINT task_assignments_confirm_status_ck
                          CHECK (confirm_status IN ('PENDING', 'CONFIRMED', 'NEEDS_INFO', 'REJECTED')),
  completion_rate         NUMERIC(5,2) NOT NULL DEFAULT 0     -- [D] % hoàn thành
                          CONSTRAINT task_assignments_completion_rate_ck
                          CHECK (completion_rate BETWEEN 0 AND 100),
  completed_at            TIMESTAMPTZ,
  confirmed_at            TIMESTAMPTZ,
  confirmed_by_account_id BIGINT REFERENCES accounts (id),
  note                    TEXT,
  assigned_at             TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at              TIMESTAMPTZ,
  CONSTRAINT task_assignments_not_own_parent_ck CHECK (parent_assignment_id <> id),
  -- mỗi nhiệm vụ giao cho một đơn vị đúng 1 lần
  CONSTRAINT task_assignments_task_org_unit_key UNIQUE (task_id, org_unit_id),
  -- phục vụ khóa ngoại phức hợp tại activity_task_links
  CONSTRAINT task_assignments_id_org_unit_id_key UNIQUE (id, org_unit_id)
);
CREATE INDEX task_assignments_org_unit_progress_idx        ON task_assignments (org_unit_id, progress_status);
CREATE INDEX task_assignments_assigned_by_org_unit_id_idx  ON task_assignments (assigned_by_org_unit_id);
CREATE INDEX task_assignments_parent_assignment_id_idx     ON task_assignments (parent_assignment_id);
CREATE INDEX task_assignments_confirmed_by_account_id_idx  ON task_assignments (confirmed_by_account_id);
-- Job quét nhiệm vụ sắp/quá hạn
CREATE INDEX task_assignments_due_date_open_idx            ON task_assignments (due_date)
  WHERE progress_status <> 'COMPLETED' AND deleted_at IS NULL;

-- 19. Chỉ tiêu phân bổ cho từng lượt giao
CREATE TABLE assignment_targets (
  id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_assignment_id BIGINT        NOT NULL REFERENCES task_assignments (id) ON DELETE CASCADE,
  task_metric_id     BIGINT        NOT NULL REFERENCES task_metrics (id),
  target_value       NUMERIC(14,2) NOT NULL
                     CONSTRAINT assignment_targets_target_value_ck CHECK (target_value >= 0),
  achieved_value     NUMERIC(14,2) NOT NULL DEFAULT 0,   -- [D] kết quả hiện tại
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CONSTRAINT assignment_targets_assignment_metric_key UNIQUE (task_assignment_id, task_metric_id)
);
CREATE INDEX assignment_targets_task_metric_id_idx ON assignment_targets (task_metric_id);

-- 20. Lịch sử cập nhật kết quả (append-only)
CREATE TABLE task_results (
  id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_assignment_id     BIGINT      NOT NULL REFERENCES task_assignments (id) ON DELETE CASCADE,
  assignment_target_id   BIGINT REFERENCES assignment_targets (id) ON DELETE CASCADE,  -- NULL = không có chỉ tiêu số
  reported_value         NUMERIC(14,2),
  report_note            TEXT,
  data_source            VARCHAR(20) NOT NULL DEFAULT 'MANUAL'
                         CONSTRAINT task_results_data_source_ck
                         CHECK (data_source IN ('MANUAL', 'AUTO_AGGREGATE')),
  reported_by_account_id BIGINT      NOT NULL REFERENCES accounts (id),
  reported_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX task_results_assignment_reported_at_idx   ON task_results (task_assignment_id, reported_at DESC);
CREATE INDEX task_results_assignment_target_id_idx     ON task_results (assignment_target_id);
CREATE INDEX task_results_reported_by_account_id_idx   ON task_results (reported_by_account_id);

-- Append-only: cấm sửa dòng đã ghi. Xóa chỉ xảy ra qua CASCADE khi xóa lượt giao.
CREATE FUNCTION task_results_forbid_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'task_results là bảng append-only: không được sửa, hãy ghi dòng mới';
END $$;

CREATE TRIGGER task_results_forbid_update_trg
BEFORE UPDATE ON task_results
FOR EACH ROW EXECUTE FUNCTION task_results_forbid_update();

-- 21. Lịch sử xác nhận của cấp trên
CREATE TABLE assignment_reviews (
  id                  BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  task_assignment_id  BIGINT      NOT NULL REFERENCES task_assignments (id) ON DELETE CASCADE,
  reviewer_account_id BIGINT      NOT NULL REFERENCES accounts (id),
  action              VARCHAR(20) NOT NULL
                      CONSTRAINT assignment_reviews_action_ck
                      CHECK (action IN ('CONFIRM', 'REQUEST_INFO', 'REJECT')),
  note                TEXT,
  reviewed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX assignment_reviews_assignment_reviewed_at_idx ON assignment_reviews (task_assignment_id, reviewed_at DESC);
CREATE INDEX assignment_reviews_reviewer_account_id_idx    ON assignment_reviews (reviewer_account_id);

-- 22. Nối hoạt động ↔ nhiệm vụ (làm minh chứng)
-- org_unit_id là cột cầu nối: hai FK phức hợp buộc hoạt động và lượt giao phải cùng một đơn vị,
-- nên CSDL tự chặn việc lấy hoạt động đơn vị A làm minh chứng cho nhiệm vụ đơn vị B.
CREATE TABLE activity_task_links (
  activity_id        BIGINT NOT NULL,
  task_assignment_id BIGINT NOT NULL,
  org_unit_id        BIGINT NOT NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (activity_id, task_assignment_id),
  CONSTRAINT activity_task_links_activity_fk
    FOREIGN KEY (activity_id, org_unit_id) REFERENCES activities (id, org_unit_id) ON DELETE CASCADE,
  CONSTRAINT activity_task_links_assignment_fk
    FOREIGN KEY (task_assignment_id, org_unit_id) REFERENCES task_assignments (id, org_unit_id) ON DELETE CASCADE
);
CREATE INDEX activity_task_links_activity_org_idx   ON activity_task_links (activity_id, org_unit_id);
CREATE INDEX activity_task_links_assignment_org_idx ON activity_task_links (task_assignment_id, org_unit_id);

-- 23. Kết quả chấm điểm theo tiêu chí
CREATE TABLE scores (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  criteria_set_id      BIGINT       NOT NULL REFERENCES criteria_sets (id),
  task_id              BIGINT       NOT NULL REFERENCES tasks (id),
  org_unit_id          BIGINT       NOT NULL REFERENCES org_units (id),   -- đơn vị được chấm
  points               NUMERIC(6,2) NOT NULL,
  max_points           NUMERIC(6,2) NOT NULL,   -- chép lại tại thời điểm chấm
  scoring_method       VARCHAR(30)  NOT NULL,
  note                 TEXT,
  scored_by_account_id BIGINT REFERENCES accounts (id),   -- NULL = hệ thống tự chấm
  scored_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT scores_points_range_ck CHECK (points >= 0 AND points <= max_points),
  CONSTRAINT scores_set_task_org_unit_key UNIQUE (criteria_set_id, task_id, org_unit_id)
);
CREATE INDEX scores_task_id_idx              ON scores (task_id);
CREATE INDEX scores_org_unit_id_idx          ON scores (org_unit_id);
CREATE INDEX scores_scored_by_account_id_idx ON scores (scored_by_account_id);

-- ════════════════════════════════════════════════════════════════════════
--  PHÂN HỆ 5 — XUẤT BẢN
-- ════════════════════════════════════════════════════════════════════════

-- 24. Bài xuất bản công khai trên Website
CREATE TABLE published_posts (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  activity_id       BIGINT REFERENCES activities (id),   -- NULL = bài do biên tập viên tự viết
  slug              VARCHAR(255) NOT NULL UNIQUE,
  title             VARCHAR(255) NOT NULL,
  excerpt           VARCHAR(500),
  content           TEXT,
  cover_file_id     BIGINT REFERENCES files (id),
  status            VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'
                    CONSTRAINT published_posts_status_ck
                    CHECK (status IN ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'UNPUBLISHED')),
  is_featured       BOOLEAN      NOT NULL DEFAULT FALSE,
  published_at      TIMESTAMPTZ,
  unpublished_at    TIMESTAMPTZ,
  view_count        BIGINT       NOT NULL DEFAULT 0,   -- [D] bộ đếm nhanh
  meta_title        VARCHAR(255),
  meta_description  VARCHAR(500),
  editor_account_id BIGINT       NOT NULL REFERENCES accounts (id),
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ,
  CONSTRAINT published_posts_published_at_ck CHECK (status <> 'PUBLISHED' OR published_at IS NOT NULL)
);
-- Mỗi hoạt động chỉ được chọn xuất bản thành 1 bài (UQ có điều kiện)
CREATE UNIQUE INDEX published_posts_activity_id_key   ON published_posts (activity_id)
  WHERE activity_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX published_posts_activity_id_idx          ON published_posts (activity_id);
CREATE INDEX published_posts_cover_file_id_idx        ON published_posts (cover_file_id);
CREATE INDEX published_posts_editor_account_id_idx    ON published_posts (editor_account_id);
-- Trang chủ Website
CREATE INDEX published_posts_status_published_at_idx  ON published_posts (status, published_at DESC);

-- 25. Log lượt xem — phân vùng theo tháng. Cố ý KHÔNG đặt FK post_id để không làm chậm ghi log.
CREATE SEQUENCE post_views_id_seq AS BIGINT;
CREATE TABLE post_views (
  id           BIGINT      NOT NULL DEFAULT nextval('post_views_id_seq'),
  post_id      BIGINT      NOT NULL,
  viewed_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  visitor_hash CHAR(64),             -- hash(IP + user agent), không lưu IP thô
  referrer     VARCHAR(500),
  device_type  VARCHAR(20)
               CONSTRAINT post_views_device_type_ck
               CHECK (device_type IN ('DESKTOP', 'MOBILE', 'TABLET')),
  PRIMARY KEY (id, viewed_at)
) PARTITION BY RANGE (viewed_at);
ALTER SEQUENCE post_views_id_seq OWNED BY post_views.id;
CREATE INDEX post_views_post_id_viewed_at_idx ON post_views (post_id, viewed_at DESC);

-- 26. Tổng hợp lượt xem theo ngày [D] — job đêm dồn dữ liệu, báo cáo chỉ đọc bảng này
CREATE TABLE post_view_daily (
  post_id         BIGINT  NOT NULL REFERENCES published_posts (id) ON DELETE CASCADE,
  view_date       DATE    NOT NULL,
  view_count      INTEGER NOT NULL DEFAULT 0
                  CONSTRAINT post_view_daily_view_count_ck CHECK (view_count >= 0),
  unique_visitors INTEGER NOT NULL DEFAULT 0
                  CONSTRAINT post_view_daily_unique_visitors_ck CHECK (unique_visitors >= 0),
  PRIMARY KEY (post_id, view_date)
);
CREATE INDEX post_view_daily_view_date_idx ON post_view_daily (view_date);

-- ════════════════════════════════════════════════════════════════════════
--  PHÂN HỆ 6 — XẾP HẠNG & BÁO CÁO
-- ════════════════════════════════════════════════════════════════════════

-- 27. Kỳ xếp hạng đã chốt — mỗi lần chốt sổ tạo 1 bản ghi
CREATE TABLE ranking_snapshots (
  id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name                    VARCHAR(255) NOT NULL,
  criteria_set_id         BIGINT REFERENCES criteria_sets (id),
  scope_org_unit_id       BIGINT       NOT NULL REFERENCES org_units (id),
  ranked_org_level        SMALLINT     NOT NULL
                          CONSTRAINT ranking_snapshots_ranked_org_level_ck CHECK (ranked_org_level BETWEEN 1 AND 4),
  ranking_type            VARCHAR(30)  NOT NULL
                          CONSTRAINT ranking_snapshots_ranking_type_ck
                          CHECK (ranking_type IN ('BY_SCORE', 'BY_TASK_RESULT', 'BY_ACTIVITY_COUNT')),
  period_type             VARCHAR(20)  NOT NULL
                          CONSTRAINT ranking_snapshots_period_type_ck
                          CHECK (period_type IN ('MONTH', 'QUARTER', 'YEAR', 'CUSTOM')),
  period_start            DATE         NOT NULL,
  period_end              DATE         NOT NULL,
  total_units             INTEGER      NOT NULL DEFAULT 0
                          CONSTRAINT ranking_snapshots_total_units_ck CHECK (total_units >= 0),
  generated_by_account_id BIGINT       NOT NULL REFERENCES accounts (id),
  created_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT ranking_snapshots_period_range_ck CHECK (period_end >= period_start)
);
CREATE INDEX ranking_snapshots_criteria_set_id_idx         ON ranking_snapshots (criteria_set_id);
CREATE INDEX ranking_snapshots_scope_period_idx            ON ranking_snapshots (scope_org_unit_id, period_start DESC);
CREATE INDEX ranking_snapshots_generated_by_account_id_idx ON ranking_snapshots (generated_by_account_id);

-- 28. Thứ hạng từng đơn vị trong một kỳ
CREATE TABLE ranking_entries (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  snapshot_id     BIGINT  NOT NULL REFERENCES ranking_snapshots (id) ON DELETE CASCADE,
  org_unit_id     BIGINT  NOT NULL REFERENCES org_units (id),
  rank_position   INTEGER NOT NULL
                  CONSTRAINT ranking_entries_rank_position_ck CHECK (rank_position > 0),
  total_score     NUMERIC(8,2),
  completion_rate NUMERIC(5,2),
  completed_tasks INTEGER,
  total_tasks     INTEGER,
  activity_count  INTEGER,
  extra_metrics   JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ranking_entries_snapshot_org_unit_key UNIQUE (snapshot_id, org_unit_id)
);
CREATE INDEX ranking_entries_snapshot_rank_idx ON ranking_entries (snapshot_id, rank_position);
CREATE INDEX ranking_entries_org_unit_id_idx   ON ranking_entries (org_unit_id);

-- 29. Báo cáo tháng/quý/năm
CREATE TABLE reports (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  org_unit_id           BIGINT       NOT NULL REFERENCES org_units (id),
  title                 VARCHAR(255) NOT NULL,
  report_type           VARCHAR(20)  NOT NULL
                        CONSTRAINT reports_report_type_ck
                        CHECK (report_type IN ('MONTHLY', 'QUARTERLY', 'ANNUAL', 'CUSTOM')),
  period_year           SMALLINT     NOT NULL
                        CONSTRAINT reports_period_year_ck CHECK (period_year BETWEEN 2020 AND 2100),
  period_number         SMALLINT,    -- tháng 1–12 hoặc quý 1–4
  period_start          DATE         NOT NULL,
  period_end            DATE         NOT NULL,
  content               TEXT,        -- nội dung cuối sau khi người dùng sửa
  ai_draft_content      TEXT,        -- bản nháp AI, giữ lại để đối chiếu
  ai_model              VARCHAR(100),
  ai_generated_at       TIMESTAMPTZ,
  status                VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'
                        CONSTRAINT reports_status_ck CHECK (status IN ('DRAFT', 'FINALIZED')),
  created_by_account_id BIGINT       NOT NULL REFERENCES accounts (id),
  finalized_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ,
  CONSTRAINT reports_period_range_ck CHECK (period_end >= period_start),
  CONSTRAINT reports_period_number_ck CHECK (
       (report_type = 'MONTHLY'   AND period_number IS NOT NULL AND period_number BETWEEN 1 AND 12)
    OR (report_type = 'QUARTERLY' AND period_number IS NOT NULL AND period_number BETWEEN 1 AND 4)
    OR (report_type IN ('ANNUAL', 'CUSTOM') AND period_number IS NULL)
  )
);
CREATE INDEX reports_org_unit_period_idx          ON reports (org_unit_id, period_year DESC, period_number);
CREATE INDEX reports_created_by_account_id_idx    ON reports (created_by_account_id);

-- 30. Nối báo cáo ↔ hoạt động
CREATE TABLE report_activities (
  report_id      BIGINT   NOT NULL REFERENCES reports (id) ON DELETE CASCADE,
  activity_id    BIGINT   NOT NULL REFERENCES activities (id) ON DELETE CASCADE,
  display_order  SMALLINT NOT NULL DEFAULT 0,
  is_highlighted BOOLEAN  NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (report_id, activity_id)
);
CREATE INDEX report_activities_activity_id_idx ON report_activities (activity_id);

-- 31. Lịch sử xuất file Word/PDF/Excel
CREATE TABLE report_exports (
  id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  report_id              BIGINT      NOT NULL REFERENCES reports (id) ON DELETE CASCADE,
  file_id                BIGINT      NOT NULL REFERENCES files (id),
  export_format          VARCHAR(10) NOT NULL
                         CONSTRAINT report_exports_export_format_ck
                         CHECK (export_format IN ('DOCX', 'PDF', 'XLSX')),
  exported_by_account_id BIGINT      NOT NULL REFERENCES accounts (id),
  exported_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX report_exports_report_id_idx              ON report_exports (report_id);
CREATE INDEX report_exports_file_id_idx                ON report_exports (file_id);
CREATE INDEX report_exports_exported_by_account_id_idx ON report_exports (exported_by_account_id);

-- ════════════════════════════════════════════════════════════════════════
--  PHÂN HỆ 7 — VĂN BẢN & THÔNG BÁO
-- ════════════════════════════════════════════════════════════════════════

-- 32. Danh mục nhóm văn bản
CREATE TABLE document_categories (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code          VARCHAR(50)  NOT NULL UNIQUE,
  name          VARCHAR(200) NOT NULL,
  display_order SMALLINT     NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 33. Văn bản ban hành theo cấp
CREATE TABLE documents (
  id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  doc_number            VARCHAR(100),
  title                 VARCHAR(500) NOT NULL,
  summary               TEXT,
  document_category_id  BIGINT REFERENCES document_categories (id),
  issuing_org_unit_id   BIGINT       NOT NULL REFERENCES org_units (id),
  issued_date           DATE         NOT NULL,
  effective_date        DATE,
  recipient_scope       VARCHAR(20)  NOT NULL
                        CONSTRAINT documents_recipient_scope_ck
                        CHECK (recipient_scope IN ('ALL_DESCENDANTS', 'DIRECT_CHILDREN', 'SELECTED')),
  status                VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'
                        CONSTRAINT documents_status_ck CHECK (status IN ('DRAFT', 'ISSUED', 'REVOKED')),
  created_by_account_id BIGINT       NOT NULL REFERENCES accounts (id),
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at            TIMESTAMPTZ
);
CREATE INDEX documents_document_category_id_idx  ON documents (document_category_id);
CREATE INDEX documents_issuing_org_issued_idx    ON documents (issuing_org_unit_id, issued_date DESC);
CREATE INDEX documents_created_by_account_id_idx ON documents (created_by_account_id);

-- 34. Nối văn bản ↔ file đính kèm
CREATE TABLE document_files (
  document_id   BIGINT   NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  file_id       BIGINT   NOT NULL REFERENCES files (id),
  display_order SMALLINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (document_id, file_id)
);
CREATE INDEX document_files_file_id_idx ON document_files (file_id);

-- 35. Nối văn bản ↔ đơn vị nhận + trạng thái đọc
CREATE TABLE document_recipients (
  document_id BIGINT NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  org_unit_id BIGINT NOT NULL REFERENCES org_units (id),
  read_at     TIMESTAMPTZ,   -- NULL = chưa đọc
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (document_id, org_unit_id)
);
CREATE INDEX document_recipients_org_unit_id_idx     ON document_recipients (org_unit_id);
-- Đếm badge văn bản chưa đọc
CREATE INDEX document_recipients_org_unit_unread_idx ON document_recipients (org_unit_id) WHERE read_at IS NULL;

-- 36. Thông báo hệ thống
CREATE TABLE notifications (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipient_account_id BIGINT       NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  notification_type    VARCHAR(40)  NOT NULL
                       CONSTRAINT notifications_notification_type_ck
                       CHECK (notification_type IN (
                         'TASK_ASSIGNED', 'TASK_DUE_SOON', 'TASK_OVERDUE', 'RESULT_CONFIRMED',
                         'RESULT_NEEDS_INFO', 'NEW_DOCUMENT', 'FEEDBACK_REPLIED', 'FEEDBACK_STATUS',
                         'POST_PUBLISHED', 'SYSTEM')),
  title                VARCHAR(255) NOT NULL,
  message              TEXT,
  ref_type             VARCHAR(50),   -- tham chiếu mềm tới đối tượng liên quan
  ref_id               BIGINT,
  link_url             VARCHAR(500),
  channel              VARCHAR(10)  NOT NULL DEFAULT 'WEB'
                       CONSTRAINT notifications_channel_ck CHECK (channel IN ('WEB', 'EMAIL', 'BOTH')),
  is_read              BOOLEAN      NOT NULL DEFAULT FALSE,
  read_at              TIMESTAMPTZ,
  email_status         VARCHAR(20)
                       CONSTRAINT notifications_email_status_ck
                       CHECK (email_status IN ('PENDING', 'SENT', 'FAILED')),
  email_sent_at        TIMESTAMPTZ,
  dedupe_key           VARCHAR(200) UNIQUE,   -- chống gửi trùng, VD TASK_DUE:1234:D7
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX notifications_recipient_created_idx ON notifications (recipient_account_id, created_at DESC);
-- Đếm badge thông báo
CREATE INDEX notifications_recipient_unread_idx  ON notifications (recipient_account_id) WHERE NOT is_read;
-- Hàng đợi gửi email
CREATE INDEX notifications_email_pending_idx     ON notifications (email_status) WHERE email_status = 'PENDING';

-- ════════════════════════════════════════════════════════════════════════
--  PHÂN HỆ 8 — PHẢN ÁNH, TÀI NGUYÊN & HỆ THỐNG
-- ════════════════════════════════════════════════════════════════════════

-- 37. Danh mục lĩnh vực góp ý
CREATE TABLE feedback_topics (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code          VARCHAR(50)  NOT NULL UNIQUE,
  name          VARCHAR(200) NOT NULL,
  display_order SMALLINT     NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 38. Ý kiến, góp ý, phản ánh (không cần đăng nhập)
CREATE TABLE feedbacks (
  id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tracking_code        VARCHAR(20)  NOT NULL UNIQUE,   -- mã tra cứu, VD PA-2026-000123
  access_token         VARCHAR(64)  NOT NULL,          -- chuỗi bí mật trong link, chống dò mã
  sender_name          VARCHAR(150) NOT NULL,
  sender_email         CITEXT       NOT NULL
                       CONSTRAINT feedbacks_sender_email_ck
                       CHECK (sender_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  sender_phone         VARCHAR(20),
  sender_org_text      VARCHAR(255),
  sender_admin_unit_id BIGINT REFERENCES admin_units (id),
  feedback_topic_id    BIGINT REFERENCES feedback_topics (id),
  title                VARCHAR(255) NOT NULL,
  content              TEXT         NOT NULL,
  status               VARCHAR(20)  NOT NULL DEFAULT 'NEW'
                       CONSTRAINT feedbacks_status_ck
                       CHECK (status IN ('NEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  assigned_account_id  BIGINT REFERENCES accounts (id),
  ip_address           INET,
  user_agent           VARCHAR(500),
  is_spam              BOOLEAN      NOT NULL DEFAULT FALSE,
  submitted_at         TIMESTAMPTZ  NOT NULL DEFAULT now(),
  first_responded_at   TIMESTAMPTZ,
  resolved_at          TIMESTAMPTZ,
  closed_at            TIMESTAMPTZ,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ
);
CREATE INDEX feedbacks_sender_admin_unit_id_idx ON feedbacks (sender_admin_unit_id);
CREATE INDEX feedbacks_feedback_topic_id_idx    ON feedbacks (feedback_topic_id);
CREATE INDEX feedbacks_assigned_account_id_idx  ON feedbacks (assigned_account_id);
CREATE INDEX feedbacks_status_submitted_idx     ON feedbacks (status, submitted_at DESC);
-- Giới hạn tần suất gửi, chống spam
CREATE INDEX feedbacks_ip_submitted_idx         ON feedbacks (ip_address, submitted_at DESC);

-- 39. Lịch sử trao đổi trên từng phản ánh
CREATE TABLE feedback_messages (
  id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  feedback_id       BIGINT      NOT NULL REFERENCES feedbacks (id) ON DELETE CASCADE,
  sender_type       VARCHAR(10) NOT NULL
                    CONSTRAINT feedback_messages_sender_type_ck CHECK (sender_type IN ('CITIZEN', 'STAFF')),
  sender_account_id BIGINT REFERENCES accounts (id),
  content           TEXT        NOT NULL,
  is_internal_note  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- STAFF bắt buộc có tài khoản, CITIZEN bắt buộc không
  CONSTRAINT feedback_messages_sender_account_ck CHECK (
       (sender_type = 'STAFF'   AND sender_account_id IS NOT NULL)
    OR (sender_type = 'CITIZEN' AND sender_account_id IS NULL)
  ),
  -- ghi chú nội bộ chỉ STAFF được tạo
  CONSTRAINT feedback_messages_internal_note_ck CHECK (NOT is_internal_note OR sender_type = 'STAFF')
);
CREATE INDEX feedback_messages_feedback_created_idx  ON feedback_messages (feedback_id, created_at);
CREATE INDEX feedback_messages_sender_account_id_idx ON feedback_messages (sender_account_id);

-- 40. Danh mục loại tài nguyên
CREATE TABLE resource_types (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  code          VARCHAR(50)  NOT NULL UNIQUE,
  name          VARCHAR(200) NOT NULL,
  display_order SMALLINT     NOT NULL DEFAULT 0,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 41. Kho tài liệu, biểu mẫu, sản phẩm truyền thông
CREATE TABLE resources (
  id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  resource_type_id         BIGINT       NOT NULL REFERENCES resource_types (id),
  title                    VARCHAR(255) NOT NULL,
  description              TEXT,
  file_id                  BIGINT       NOT NULL REFERENCES files (id),
  thumbnail_file_id        BIGINT REFERENCES files (id),
  source_document_id       BIGINT REFERENCES documents (id),   -- đưa văn bản đã ban hành vào kho công khai
  is_public                BOOLEAN      NOT NULL DEFAULT TRUE,  -- FALSE = chỉ tài khoản nội bộ tải được
  download_count           INTEGER      NOT NULL DEFAULT 0      -- [D]
                           CONSTRAINT resources_download_count_ck CHECK (download_count >= 0),
  published_by_org_unit_id BIGINT       NOT NULL REFERENCES org_units (id),
  published_at             TIMESTAMPTZ,
  status                   VARCHAR(20)  NOT NULL DEFAULT 'DRAFT'
                           CONSTRAINT resources_status_ck CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at               TIMESTAMPTZ
);
CREATE INDEX resources_type_status_published_idx    ON resources (resource_type_id, status, published_at DESC);
CREATE INDEX resources_file_id_idx                  ON resources (file_id);
CREATE INDEX resources_thumbnail_file_id_idx        ON resources (thumbnail_file_id);
CREATE INDEX resources_source_document_id_idx       ON resources (source_document_id);
CREATE INDEX resources_published_by_org_unit_id_idx ON resources (published_by_org_unit_id);

-- 42. Nhật ký thao tác — phân vùng theo tháng
CREATE SEQUENCE audit_logs_id_seq AS BIGINT;
CREATE TABLE audit_logs (
  id          BIGINT       NOT NULL DEFAULT nextval('audit_logs_id_seq'),
  account_id  BIGINT REFERENCES accounts (id),   -- NULL = hệ thống
  action      VARCHAR(50)  NOT NULL,
  entity_type VARCHAR(50)  NOT NULL,
  entity_id   BIGINT,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  INET,
  user_agent  VARCHAR(500),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);
ALTER SEQUENCE audit_logs_id_seq OWNED BY audit_logs.id;
CREATE INDEX audit_logs_account_created_idx ON audit_logs (account_id, created_at DESC);
CREATE INDEX audit_logs_entity_idx          ON audit_logs (entity_type, entity_id, created_at DESC);

-- 43. Cấu hình hệ thống (gồm link Học sinh 3 tốt)
CREATE TABLE system_settings (
  setting_key VARCHAR(100) PRIMARY KEY,
  value       TEXT,
  value_type  VARCHAR(10)  NOT NULL DEFAULT 'STRING'
              CONSTRAINT system_settings_value_type_ck
              CHECK (value_type IN ('STRING', 'NUMBER', 'BOOLEAN', 'JSON')),
  group_name  VARCHAR(100),
  description TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ────────────────────────────────────────────────────────────────────────
--  Phân vùng theo tháng cho post_views và audit_logs
-- ────────────────────────────────────────────────────────────────────────

-- Phân vùng DEFAULT hứng dữ liệu của tháng chưa có phân vùng, để việc ghi không bao giờ lỗi.
CREATE TABLE post_views_default PARTITION OF post_views DEFAULT;
CREATE TABLE audit_logs_default PARTITION OF audit_logs DEFAULT;

-- Tạo sẵn phân vùng từ tháng trước đến N tháng tới (mốc tháng tính theo UTC). Chạy lại nhiều lần an toàn.
-- Nên gọi định kỳ (cron hằng đêm/hằng tháng):  SELECT ensure_month_partitions();
CREATE FUNCTION ensure_month_partitions(months_ahead INTEGER DEFAULT 3) RETURNS INTEGER
LANGUAGE plpgsql AS $$
DECLARE
  base_month DATE := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
  month_start DATE;
  parent TEXT;
  part_name TEXT;
  created INTEGER := 0;
BEGIN
  FOREACH parent IN ARRAY ARRAY['post_views', 'audit_logs'] LOOP
    FOR i IN -1 .. months_ahead LOOP
      month_start := (base_month + make_interval(months => i))::date;
      part_name   := format('%s_y%sm%s', parent, to_char(month_start, 'YYYY'), to_char(month_start, 'MM'));
      IF to_regclass(part_name) IS NULL THEN
        EXECUTE format(
          'CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
          part_name, parent,
          to_char(month_start, 'YYYY-MM-DD') || ' 00:00:00+00',
          to_char((month_start + interval '1 month')::date, 'YYYY-MM-DD') || ' 00:00:00+00');
        created := created + 1;
      END IF;
    END LOOP;
  END LOOP;
  RETURN created;
END $$;

SELECT ensure_month_partitions();

-- ────────────────────────────────────────────────────────────────────────
--  Trigger tự cập nhật updated_at cho mọi bảng có cột này
-- ────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT c.table_name
      FROM information_schema.columns c
      JOIN information_schema.tables tb
        ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
     WHERE c.table_schema = current_schema()
       AND c.column_name = 'updated_at'
       AND tb.table_type = 'BASE TABLE'
     ORDER BY c.table_name
  LOOP
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t || '_set_updated_at_trg', t);
  END LOOP;
END $$;

COMMIT;
