-- 0010: Bổ sung cột cho các dữ liệu prototype chưa có trong schema v1
-- (map toàn bộ state của web app sang DB — xem src/lib/server/store-tables.ts)
-- Idempotent: IF NOT EXISTS ở mọi ALTER.

-- Hoạt động: ảnh bìa mô phỏng (seed) + ghi chú phản hồi xét duyệt
ALTER TABLE activities ADD COLUMN IF NOT EXISTS image_seed integer NOT NULL DEFAULT 0;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS review_note text;

-- Điều kiện chấm BTS 2027 (trích Excel bộ tiêu chí)
ALTER TABLE task_metrics ADD COLUMN IF NOT EXISTS max_points numeric;
ALTER TABLE task_metrics ADD COLUMN IF NOT EXISTS scoring_ladder text;
ALTER TABLE task_metrics ADD COLUMN IF NOT EXISTS requirement text;
ALTER TABLE task_metrics ADD COLUMN IF NOT EXISTS evidence text;
ALTER TABLE task_metrics ADD COLUMN IF NOT EXISTS period character varying(50);
ALTER TABLE task_metrics ADD COLUMN IF NOT EXISTS dept character varying(120);

-- Bài xuất bản: ảnh bìa mô phỏng + tên đơn vị tác giả (hiển thị nhanh)
ALTER TABLE published_posts ADD COLUMN IF NOT EXISTS cover_seed integer NOT NULL DEFAULT 0;
ALTER TABLE published_posts ADD COLUMN IF NOT EXISTS author_org_unit_name character varying(255);

-- Điểm số chi tiết theo điều kiện chấm
ALTER TABLE scores ADD COLUMN IF NOT EXISTS metric_id bigint REFERENCES task_metrics(id);

-- Bảng xếp hạng: trạng thái nháp/chốt
ALTER TABLE ranking_snapshots ADD COLUMN IF NOT EXISTS status character varying NOT NULL DEFAULT 'DRAFT';
ALTER TABLE ranking_snapshots DROP CONSTRAINT IF EXISTS ranking_snapshots_status_ck;
ALTER TABLE ranking_snapshots ADD CONSTRAINT ranking_snapshots_status_ck
  CHECK (status IN ('DRAFT', 'FINALIZED'));

-- Phản ánh: liên kết người gửi đã đăng nhập + trường nguồn gốc/m minh chứng của prototype
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS sender_account_id bigint REFERENCES accounts(id);
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS sender_commune_union character varying(255);
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS sender_province_union character varying(255);
ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS evidence_names text[] NOT NULL DEFAULT '{}';

-- Trao đổi phản ánh: tên người gửi + thời điểm gửi (mô phỏng)
ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS sender_name character varying(255);
ALTER TABLE feedback_messages ADD COLUMN IF NOT EXISTS sent_at timestamptz;
