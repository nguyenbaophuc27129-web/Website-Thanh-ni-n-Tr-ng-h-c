-- 0013: Nới cột tên chỉ tiêu thi đua — BTS 2027 có tên điều kiện chấm dài
-- (269–376 ký tự, trích nguyên văn từ Excel phân tích KPI) vượt varchar(255).
-- Nâng sang text để không mất dữ liệu khi sync/AI lượng hoá công văn tạo KPI.
BEGIN;

ALTER TABLE task_metrics ALTER COLUMN name TYPE text;

COMMIT;
