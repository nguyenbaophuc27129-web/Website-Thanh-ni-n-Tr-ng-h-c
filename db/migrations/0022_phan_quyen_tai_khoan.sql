-- 0022: Phân quyền theo tài khoản + danh mục chức danh động (nametag)
-- Nguồn yêu cầu: họp 24/10/2026 — chức danh KHÔNG cố định gắn quyền; quyền gán riêng
-- từng tài khoản (tick mục nào xem mục đó), cấp trên phân quyền cho cấp dưới.
-- Danh mục chức danh seed từ "Copy of Book1.xlsx" (17 chức danh + chuyên gia đồng hành).

-- 1. Danh mục chức danh động (thêm/bớt được, KHÔNG gắn quyền cứng — chỉ là thẻ tên)
CREATE TABLE IF NOT EXISTS chuc_danh (
  id bigserial PRIMARY KEY,
  name varchar(200) NOT NULL UNIQUE,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Quyền gán riêng theo tài khoản — có dòng nào thì tài khoản được quyền đó,
--    THAY HOÀN TOÀN quyền mặc định theo vai trò (tick mục nào xem mục đó).
CREATE TABLE IF NOT EXISTS account_permissions (
  account_id bigint NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  perm_code varchar(50) NOT NULL,
  granted_by_account_id bigint REFERENCES accounts(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, perm_code)
);
CREATE INDEX IF NOT EXISTS account_permissions_account_idx ON account_permissions(account_id);

-- 3. accounts.chuc_danh — tên chức danh trong danh mục động (khớp chuc_danh.name)
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS chuc_danh varchar(200);

-- 4. Seed danh mục chức danh từ Copy of Book1.xlsx
INSERT INTO chuc_danh (id, name, description, display_order) OVERRIDING SYSTEM VALUE VALUES
  (1,  'Bí thư thứ nhất Trung ương Đoàn', 'Tất cả chức năng quản trị cơ bản; cấp thêm quyền xem thông tin chi tiết, trả lời phản ánh, kiến nghị của Học sinh THPT.', 1),
  (2,  'Bí thư Thường trực Trung ương Đoàn', 'Tất cả chức năng quản trị cơ bản; cấp thêm quyền xem thông tin chi tiết, trả lời phản ánh, kiến nghị của Học sinh THPT.', 2),
  (3,  'Bí thư Ban Bí thư', 'Tất cả chức năng quản trị cơ bản; cấp thêm quyền xem thông tin chi tiết, trả lời phản ánh, kiến nghị của Học sinh THPT.', 3),
  (4,  'Trưởng Ban Công tác Thanh thiếu nhi', 'Tất cả chức năng quản trị cơ bản; chỉ cấp quyền xem kết quả thi trực tuyến.', 4),
  (5,  'Trưởng Ban Công tác Đoàn', 'Tất cả chức năng quản trị cơ bản; chỉ cấp quyền xem kết quả thi trực tuyến.', 5),
  (6,  'Phó Trưởng Ban Công tác Thanh thiếu nhi phụ trách Web', 'Superadmin — toàn quyền hệ thống.', 6),
  (7,  'Phó Trưởng Ban Công tác Thanh thiếu nhi', 'Tất cả chức năng quản trị cơ bản; chỉ cấp quyền xem kết quả thi trực tuyến.', 7),
  (8,  'Phó Trưởng Ban Công tác Đoàn phụ trách công tác kiểm tra', 'Diễn đàn + Chấm điểm thi đua + Tin tức + Xem thông tin chi tiết, trả lời phản ánh, kiến nghị của Học sinh THPT + Báo cáo & Xếp hạng.', 8),
  (9,  'Chuyên viên phụ trách chính Web', 'Superadmin — toàn quyền hệ thống.', 9),
  (10, 'Chuyên viên phụ trách công tác kiểm tra', 'Chỉ chức năng xem thông tin chi tiết, trả lời phản ánh, kiến nghị của Học sinh THPT.', 10),
  (11, 'Chuyên viên phụ trách xét hồ sơ Học sinh 3 tốt', 'Chỉ chức năng xem, thẩm định, duyệt, đánh giá hồ sơ Học sinh 3 tốt.', 11),
  (12, 'Trưởng Ban Biên tập', 'Superadmin — toàn quyền hệ thống.', 12),
  (13, 'Phó Trưởng Ban Biên tập', 'Superadmin — toàn quyền hệ thống.', 13),
  (14, 'Thường trực Web', 'Tất cả chức năng quản trị cơ bản.', 14),
  (15, 'CTV phụ trách chuyên mục Tin tức', 'Chỉ chức năng đọc, thẩm định, duyệt đăng, bình luận các chủ đề trong mục Tin tức + Diễn đàn.', 15),
  (16, 'CTV phụ trách chuyên mục "Mỗi trường THPT 01 dự án tình nguyện vì cộng đồng"', 'Chỉ chức năng đọc, thẩm định, duyệt đăng, bình luận các chủ đề trong mục dự án tình nguyện vì cộng đồng.', 16),
  (17, 'CTV hỗ trợ xét "Học sinh 3 tốt"', 'Chỉ chức năng xem, thẩm định, duyệt, đánh giá hồ sơ Học sinh 3 tốt.', 17),
  (18, 'Chuyên gia, nhà khoa học đồng hành Web', 'Chỉ trả lời phản ánh, kiến nghị của Học sinh THPT về bạo lực học đường, bạo hành gia đình, hành vi xâm hại người chưa thành niên; xem, theo dõi, tương tác Diễn đàn; không xem thông tin cá nhân chi tiết người phản ánh.', 18)
ON CONFLICT (name) DO NOTHING;
SELECT setval(pg_get_serial_sequence('chuc_danh', 'id'), (SELECT max(id) FROM chuc_danh));
