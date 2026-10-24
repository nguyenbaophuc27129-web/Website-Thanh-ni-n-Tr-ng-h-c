-- 0021: Cấu trúc tổ chức Đoàn 2025 (sau sáp nhập 34 tỉnh/thành)
-- - Nới org_level 1..5 (thêm cấp 5 = dưới cơ sở: liên chi/chi đoàn)
-- - Thêm cột org_block: phân khối tổ chức (4 khối)
-- - Tái cấu trúc cây: TW Đoàn (id 1) + 34 tỉnh/thành (100-133) + 5 trực thuộc TW (140-144)
-- - Seed admin_units 34 tỉnh/thành trực thuộc TW

-- 1. Nới ràng buộc cấp + thêm phân khối
ALTER TABLE org_units DROP CONSTRAINT IF EXISTS org_units_org_level_ck;
ALTER TABLE org_units ADD CONSTRAINT org_units_org_level_ck CHECK (org_level >= 1 AND org_level <= 5);

ALTER TABLE org_units ADD COLUMN IF NOT EXISTS org_block varchar(20);
ALTER TABLE org_units DROP CONSTRAINT IF EXISTS org_units_org_block_ck;
ALTER TABLE org_units ADD CONSTRAINT org_units_org_block_ck
  CHECK (org_block IS NULL OR org_block IN ('DAN_CU', 'TRUONG_HOC', 'CO_QUAN', 'VU_TRANG'));

-- 2. Tài khoản cũ trỏ đơn vị cũ (31 không còn tồn tại) → về TW, chờ phân lại
UPDATE accounts SET org_unit_id = 1 WHERE org_unit_id <> 1;

-- 3. Xoá sạch đơn vị cũ (mọi bảng khác đã chỉ trỏ org 1 hoặc NULL — đã verify)
DELETE FROM org_units WHERE id <> 1;

-- 4. admin_units: 34 tỉnh/thành trực thuộc Trung ương (id 1-34)
INSERT INTO admin_units (id, parent_id, code, name, unit_type, is_active) OVERRIDING SYSTEM VALUE VALUES
  (1,  NULL, 'AD-TQ',  'Tỉnh Tuyên Quang',             'PROVINCE', true),
  (2,  NULL, 'AD-LC',  'Tỉnh Lào Cai',                 'PROVINCE', true),
  (3,  NULL, 'AD-TNN', 'Tỉnh Thái Nguyên',             'PROVINCE', true),
  (4,  NULL, 'AD-PT',  'Tỉnh Phú Thọ',                 'PROVINCE', true),
  (5,  NULL, 'AD-BN',  'Tỉnh Bắc Ninh',                'PROVINCE', true),
  (6,  NULL, 'AD-HY',  'Tỉnh Hưng Yên',                'PROVINCE', true),
  (7,  NULL, 'AD-HP',  'Thành phố Hải Phòng',          'PROVINCE', true),
  (8,  NULL, 'AD-NB',  'Tỉnh Ninh Bình',               'PROVINCE', true),
  (9,  NULL, 'AD-QTR', 'Tỉnh Quảng Trị',               'PROVINCE', true),
  (10, NULL, 'AD-DN',  'Thành phố Đà Nẵng',            'PROVINCE', true),
  (11, NULL, 'AD-QNG', 'Tỉnh Quảng Ngãi',              'PROVINCE', true),
  (12, NULL, 'AD-GL',  'Tỉnh Gia Lai',                 'PROVINCE', true),
  (13, NULL, 'AD-KH',  'Tỉnh Khánh Hoà',               'PROVINCE', true),
  (14, NULL, 'AD-LD',  'Tỉnh Lâm Đồng',                'PROVINCE', true),
  (15, NULL, 'AD-DL',  'Tỉnh Đắk Lắk',                 'PROVINCE', true),
  (16, NULL, 'AD-HCM', 'Thành phố Hồ Chí Minh',        'PROVINCE', true),
  (17, NULL, 'AD-DNA', 'Tỉnh Đồng Nai',                'PROVINCE', true),
  (18, NULL, 'AD-TNH', 'Tỉnh Tây Ninh',                'PROVINCE', true),
  (19, NULL, 'AD-CT',  'Thành phố Cần Thơ',            'PROVINCE', true),
  (20, NULL, 'AD-VL',  'Tỉnh Vĩnh Long',               'PROVINCE', true),
  (21, NULL, 'AD-DTP', 'Tỉnh Đồng Tháp',               'PROVINCE', true),
  (22, NULL, 'AD-CM',  'Tỉnh Cà Mau',                  'PROVINCE', true),
  (23, NULL, 'AD-AG',  'Tỉnh An Giang',                'PROVINCE', true),
  (24, NULL, 'AD-HN',  'Thành phố Hà Nội',             'PROVINCE', true),
  (25, NULL, 'AD-HUE', 'Thành phố Huế',                'PROVINCE', true),
  (26, NULL, 'AD-LZ',  'Tỉnh Lai Châu',                'PROVINCE', true),
  (27, NULL, 'AD-DB',  'Tỉnh Điện Biên',               'PROVINCE', true),
  (28, NULL, 'AD-SL',  'Tỉnh Sơn La',                  'PROVINCE', true),
  (29, NULL, 'AD-LS',  'Tỉnh Lạng Sơn',                'PROVINCE', true),
  (30, NULL, 'AD-QNH', 'Tỉnh Quảng Ninh',              'PROVINCE', true),
  (31, NULL, 'AD-TH',  'Tỉnh Thanh Hoá',               'PROVINCE', true),
  (32, NULL, 'AD-NA',  'Tỉnh Nghệ An',                 'PROVINCE', true),
  (33, NULL, 'AD-HT',  'Tỉnh Hà Tĩnh',                 'PROVINCE', true),
  (34, NULL, 'AD-CB',  'Tỉnh Cao Bằng',                'PROVINCE', true)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('admin_units', 'id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM admin_units), 1));

-- 5. Đơn vị gốc id 1 = Trung ương Đoàn
UPDATE org_units SET
  code = 'TW-DOAN',
  name = 'Trung ương Đoàn TNCS Hồ Chí Minh',
  short_name = 'TW Đoàn',
  org_block = NULL,
  admin_unit_id = (SELECT id FROM admin_units WHERE code = 'AD-HN')
WHERE id = 1;

-- 6. 34 tỉnh/thành đoàn (id 100-133, cấp 2, parent 1) + 5 đoàn trực thuộc TW (140-144)
INSERT INTO org_units (id, parent_id, code, name, short_name, org_level, path, depth, admin_unit_id, org_block, is_active) OVERRIDING SYSTEM VALUE VALUES
  (100, 1, 'TD-TQ',  'Đoàn TNCS Hồ Chí Minh Tỉnh Tuyên Quang',                'Tỉnh đoàn Tuyên Quang',      2, '/1/100/', 1, (SELECT id FROM admin_units WHERE code='AD-TQ'),  NULL,      true),
  (101, 1, 'TD-LC',  'Đoàn TNCS Hồ Chí Minh Tỉnh Lào Cai',                    'Tỉnh đoàn Lào Cai',          2, '/1/101/', 1, (SELECT id FROM admin_units WHERE code='AD-LC'),  NULL,      true),
  (102, 1, 'TD-TNN', 'Đoàn TNCS Hồ Chí Minh Tỉnh Thái Nguyên',                'Tỉnh đoàn Thái Nguyên',      2, '/1/102/', 1, (SELECT id FROM admin_units WHERE code='AD-TNN'), NULL,      true),
  (103, 1, 'TD-PT',  'Đoàn TNCS Hồ Chí Minh Tỉnh Phú Thọ',                    'Tỉnh đoàn Phú Thọ',          2, '/1/103/', 1, (SELECT id FROM admin_units WHERE code='AD-PT'),  NULL,      true),
  (104, 1, 'TD-BN',  'Đoàn TNCS Hồ Chí Minh Tỉnh Bắc Ninh',                   'Tỉnh đoàn Bắc Ninh',         2, '/1/104/', 1, (SELECT id FROM admin_units WHERE code='AD-BN'),  NULL,      true),
  (105, 1, 'TD-HY',  'Đoàn TNCS Hồ Chí Minh Tỉnh Hưng Yên',                   'Tỉnh đoàn Hưng Yên',         2, '/1/105/', 1, (SELECT id FROM admin_units WHERE code='AD-HY'),  NULL,      true),
  (106, 1, 'TD-HP',  'Đoàn TNCS Hồ Chí Minh Thành phố Hải Phòng',             'Thành đoàn Hải Phòng',       2, '/1/106/', 1, (SELECT id FROM admin_units WHERE code='AD-HP'),  NULL,      true),
  (107, 1, 'TD-NB',  'Đoàn TNCS Hồ Chí Minh Tỉnh Ninh Bình',                  'Tỉnh đoàn Ninh Bình',        2, '/1/107/', 1, (SELECT id FROM admin_units WHERE code='AD-NB'),  NULL,      true),
  (108, 1, 'TD-QTR', 'Đoàn TNCS Hồ Chí Minh Tỉnh Quảng Trị',                  'Tỉnh đoàn Quảng Trị',        2, '/1/108/', 1, (SELECT id FROM admin_units WHERE code='AD-QTR'), NULL,      true),
  (109, 1, 'TD-DN',  'Đoàn TNCS Hồ Chí Minh Thành phố Đà Nẵng',               'Thành đoàn Đà Nẵng',         2, '/1/109/', 1, (SELECT id FROM admin_units WHERE code='AD-DN'),  NULL,      true),
  (110, 1, 'TD-QNG', 'Đoàn TNCS Hồ Chí Minh Tỉnh Quảng Ngãi',                 'Tỉnh đoàn Quảng Ngãi',       2, '/1/110/', 1, (SELECT id FROM admin_units WHERE code='AD-QNG'), NULL,      true),
  (111, 1, 'TD-GL',  'Đoàn TNCS Hồ Chí Minh Tỉnh Gia Lai',                    'Tỉnh đoàn Gia Lai',          2, '/1/111/', 1, (SELECT id FROM admin_units WHERE code='AD-GL'),  NULL,      true),
  (112, 1, 'TD-KH',  'Đoàn TNCS Hồ Chí Minh Tỉnh Khánh Hoà',                  'Tỉnh đoàn Khánh Hoà',        2, '/1/112/', 1, (SELECT id FROM admin_units WHERE code='AD-KH'),  NULL,      true),
  (113, 1, 'TD-LD',  'Đoàn TNCS Hồ Chí Minh Tỉnh Lâm Đồng',                   'Tỉnh đoàn Lâm Đồng',         2, '/1/113/', 1, (SELECT id FROM admin_units WHERE code='AD-LD'),  NULL,      true),
  (114, 1, 'TD-DL',  'Đoàn TNCS Hồ Chí Minh Tỉnh Đắk Lắk',                    'Tỉnh đoàn Đắk Lắk',          2, '/1/114/', 1, (SELECT id FROM admin_units WHERE code='AD-DL'),  NULL,      true),
  (115, 1, 'TD-HCM', 'Đoàn TNCS Hồ Chí Minh Thành phố Hồ Chí Minh',           'Thành đoàn TP Hồ Chí Minh',  2, '/1/115/', 1, (SELECT id FROM admin_units WHERE code='AD-HCM'), NULL,      true),
  (116, 1, 'TD-DNA', 'Đoàn TNCS Hồ Chí Minh Tỉnh Đồng Nai',                   'Tỉnh đoàn Đồng Nai',         2, '/1/116/', 1, (SELECT id FROM admin_units WHERE code='AD-DNA'), NULL,      true),
  (117, 1, 'TD-TNH', 'Đoàn TNCS Hồ Chí Minh Tỉnh Tây Ninh',                   'Tỉnh đoàn Tây Ninh',         2, '/1/117/', 1, (SELECT id FROM admin_units WHERE code='AD-TNH'), NULL,      true),
  (118, 1, 'TD-CT',  'Đoàn TNCS Hồ Chí Minh Thành phố Cần Thơ',               'Thành đoàn Cần Thơ',         2, '/1/118/', 1, (SELECT id FROM admin_units WHERE code='AD-CT'),  NULL,      true),
  (119, 1, 'TD-VL',  'Đoàn TNCS Hồ Chí Minh Tỉnh Vĩnh Long',                  'Tỉnh đoàn Vĩnh Long',        2, '/1/119/', 1, (SELECT id FROM admin_units WHERE code='AD-VL'),  NULL,      true),
  (120, 1, 'TD-DTP', 'Đoàn TNCS Hồ Chí Minh Tỉnh Đồng Tháp',                  'Tỉnh đoàn Đồng Tháp',        2, '/1/120/', 1, (SELECT id FROM admin_units WHERE code='AD-DTP'), NULL,      true),
  (121, 1, 'TD-CM',  'Đoàn TNCS Hồ Chí Minh Tỉnh Cà Mau',                     'Tỉnh đoàn Cà Mau',           2, '/1/121/', 1, (SELECT id FROM admin_units WHERE code='AD-CM'),  NULL,      true),
  (122, 1, 'TD-AG',  'Đoàn TNCS Hồ Chí Minh Tỉnh An Giang',                   'Tỉnh đoàn An Giang',         2, '/1/122/', 1, (SELECT id FROM admin_units WHERE code='AD-AG'),  NULL,      true),
  (123, 1, 'TD-HN',  'Đoàn TNCS Hồ Chí Minh Thành phố Hà Nội',                'Thành đoàn Hà Nội',          2, '/1/123/', 1, (SELECT id FROM admin_units WHERE code='AD-HN'),  NULL,      true),
  (124, 1, 'TD-HUE', 'Đoàn TNCS Hồ Chí Minh Thành phố Huế',                   'Thành đoàn Huế',             2, '/1/124/', 1, (SELECT id FROM admin_units WHERE code='AD-HUE'), NULL,      true),
  (125, 1, 'TD-LZ',  'Đoàn TNCS Hồ Chí Minh Tỉnh Lai Châu',                   'Tỉnh đoàn Lai Châu',         2, '/1/125/', 1, (SELECT id FROM admin_units WHERE code='AD-LZ'),  NULL,      true),
  (126, 1, 'TD-DB',  'Đoàn TNCS Hồ Chí Minh Tỉnh Điện Biên',                  'Tỉnh đoàn Điện Biên',        2, '/1/126/', 1, (SELECT id FROM admin_units WHERE code='AD-DB'),  NULL,      true),
  (127, 1, 'TD-SL',  'Đoàn TNCS Hồ Chí Minh Tỉnh Sơn La',                     'Tỉnh đoàn Sơn La',           2, '/1/127/', 1, (SELECT id FROM admin_units WHERE code='AD-SL'),  NULL,      true),
  (128, 1, 'TD-LS',  'Đoàn TNCS Hồ Chí Minh Tỉnh Lạng Sơn',                   'Tỉnh đoàn Lạng Sơn',         2, '/1/128/', 1, (SELECT id FROM admin_units WHERE code='AD-LS'),  NULL,      true),
  (129, 1, 'TD-QNH', 'Đoàn TNCS Hồ Chí Minh Tỉnh Quảng Ninh',                 'Tỉnh đoàn Quảng Ninh',       2, '/1/129/', 1, (SELECT id FROM admin_units WHERE code='AD-QNH'), NULL,      true),
  (130, 1, 'TD-TH',  'Đoàn TNCS Hồ Chí Minh Tỉnh Thanh Hoá',                  'Tỉnh đoàn Thanh Hoá',        2, '/1/130/', 1, (SELECT id FROM admin_units WHERE code='AD-TH'),  NULL,      true),
  (131, 1, 'TD-NA',  'Đoàn TNCS Hồ Chí Minh Tỉnh Nghệ An',                    'Tỉnh đoàn Nghệ An',          2, '/1/131/', 1, (SELECT id FROM admin_units WHERE code='AD-NA'),  NULL,      true),
  (132, 1, 'TD-HT',  'Đoàn TNCS Hồ Chí Minh Tỉnh Hà Tĩnh',                    'Tỉnh đoàn Hà Tĩnh',          2, '/1/132/', 1, (SELECT id FROM admin_units WHERE code='AD-HT'),  NULL,      true),
  (133, 1, 'TD-CB',  'Đoàn TNCS Hồ Chí Minh Tỉnh Cao Bằng',                   'Tỉnh đoàn Cao Bằng',         2, '/1/133/', 1, (SELECT id FROM admin_units WHERE code='AD-CB'),  NULL,      true),
  (140, 1, 'TW-QDOI',     'Ban Thanh niên Quân đội',                        'Ban TN Quân đội',       2, '/1/140/', 1, NULL, 'VU_TRANG', true),
  (141, 1, 'TW-CONGAN',   'Ban Thanh niên Công an Nhân dân',                'Ban TN Công an ND',     2, '/1/141/', 1, NULL, 'VU_TRANG', true),
  (142, 1, 'TW-CHINHPHU', 'Đoàn Thanh niên Chính phủ',                      'Đoàn TN Chính phủ',     2, '/1/142/', 1, NULL, 'CO_QUAN',  true),
  (143, 1, 'TW-CQDANG',   'Đoàn thanh niên các Cơ quan Đảng Trung ương',    'Đoàn TN CQ Đảng TW',    2, '/1/143/', 1, NULL, 'CO_QUAN',  true),
  (144, 1, 'TW-MTTQ',     'Đoàn thanh niên Mặt trận Tổ quốc Việt Nam',      'Đoàn TN MTTQ VN',       2, '/1/144/', 1, NULL, 'CO_QUAN',  true)
ON CONFLICT (id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('org_units', 'id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM org_units), 1));
