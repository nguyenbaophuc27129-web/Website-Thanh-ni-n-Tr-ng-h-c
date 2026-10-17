-- 0014: Chuyển "Bản đồ dự án tình nguyện" thành "Ngân hàng dự án tình nguyện"
-- (bản đồ trùng nền tảng Hội Sinh viên Việt Nam — bỏ sơ đồ pin).
-- Thêm cột lĩnh vực (field) + giai đoạn (phase); thả NOT NULL map_x/map_y
-- (cột cũ giữ nguyên làm dữ liệu lịch sử, app không ghi nữa).
BEGIN;

ALTER TABLE volunteer_projects
    ADD COLUMN IF NOT EXISTS field varchar(20) NOT NULL DEFAULT 'KHAC'
        CHECK (field IN ('MOI_TRUONG', 'GIAO_DUC', 'AN_SINH', 'Y_TE', 'VAN_HOA', 'KHAC'));

ALTER TABLE volunteer_projects
    ADD COLUMN IF NOT EXISTS phase varchar(20) NOT NULL DEFAULT 'DANG_TRIEN_KHAI'
        CHECK (phase IN ('DANG_TUYEN', 'DANG_TRIEN_KHAI', 'HOAN_THANH'));

ALTER TABLE volunteer_projects ALTER COLUMN map_x DROP NOT NULL;
ALTER TABLE volunteer_projects ALTER COLUMN map_y DROP NOT NULL;

-- Gán lĩnh vực/giai đoạn cho dữ liệu mẫu đang có (theo seed src/data/volunteer-projects.ts)
UPDATE volunteer_projects SET field = 'MOI_TRUONG',   phase = 'HOAN_THANH'      WHERE project_name LIKE 'Đồng quản lý%';
UPDATE volunteer_projects SET field = 'AN_SINH',     phase = 'DANG_TRIEN_KHAI' WHERE project_name LIKE 'Bữa sáng%';
UPDATE volunteer_projects SET field = 'GIAO_DUC',    phase = 'HOAN_THANH'      WHERE project_name LIKE 'Sách cũ%';
UPDATE volunteer_projects SET field = 'GIAO_DUC',    phase = 'DANG_TRIEN_KHAI' WHERE project_name LIKE 'Lớp học số%';
UPDATE volunteer_projects SET field = 'AN_SINH',     phase = 'HOAN_THANH'      WHERE project_name LIKE 'Giải cứu nông sản%';
UPDATE volunteer_projects SET field = 'MOI_TRUONG',  phase = 'DANG_TRIEN_KHAI' WHERE project_name LIKE 'Cây xanh%';
UPDATE volunteer_projects SET field = 'AN_SINH',     phase = 'DANG_TUYEN'      WHERE project_name LIKE 'Áo ấm%';
UPDATE volunteer_projects SET field = 'MOI_TRUONG',  phase = 'DANG_TRIEN_KHAI' WHERE project_name LIKE 'Đường dòng%';
UPDATE volunteer_projects SET field = 'GIAO_DUC',    phase = 'DANG_TUYEN'      WHERE project_name LIKE 'Sao băng%';

COMMIT;
