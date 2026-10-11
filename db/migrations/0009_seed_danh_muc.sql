-- 0009: Nạp danh mục chuẩn — khớp src/data (chỉ thêm khi chưa có, khớp theo code)
-- Lưu ý: app định nghĩa 5 loại hình trường (đặc tả cũ chỉ 3) — lấy theo app.

insert into school_types (code, name, display_order) values
    ('THPT', 'Trung học phổ thông', 1),
    ('THCS', 'Trung học cơ sở', 2),
    ('TIEU_HOC', 'Tiểu học', 3),
    ('MAM_NON', 'Mầm non', 4),
    ('Dai_Hoc_CĐ', 'Đại học, Cao đẳng', 5)
on conflict (code) do nothing;

insert into resource_types (code, name, short_name, display_order) values
    ('THIET_KE', 'Tài nguyên thiết kế', null, 1),
    ('BIEU_MAU', 'Tài nguyên biểu mẫu', null, 2),
    ('TRUYEN_THONG', 'Tài nguyên truyền thông', null, 3),
    ('VAN_BAN', 'Tài nguyên văn bản', null, 4),
    ('CLIP_TINH_BAN',
     'Clip tuyên truyền Xây dựng tình bạn đẹp, nói không với bạo lực học đường',
     'Clip tuyên truyền tình bạn đẹp', 5),
    ('THONG_DIEP', 'Thông điệp tuổi trẻ', null, 6)
on conflict (code) do nothing;

insert into roles (code, name, description) values
    ('QUAN_TRI_TW', 'Quản trị Trung ương',
     'Toàn quyền hệ thống — Ban Thanh niên Trường học Trung ương Đoàn'),
    ('QUAN_TRI_TINH', 'Quản trị cấp Tỉnh/TW',
     'Quản trị phạm vi tỉnh/thành phố trực thuộc Trung ương'),
    ('QUAN_TRI_CAP3', 'Quản trị cấp 3',
     'Quản trị phạm vi phường/xã (cấp trên trực tiếp cơ sở)'),
    ('DON_VI', 'Đơn vị cơ sở',
     'Tài khoản dùng chung của trường/đơn vị cơ sở'),
    ('BIEN_TAP_VIEN', 'Biên tập viên',
     'Xuất bản, quản trị nội dung cổng thông tin'),
    ('DOAN_VIEN', 'Đoàn viên',
     'Tài khoản cá nhân — diễn đàn, hồ sơ 3 tốt, đóng góp cộng đồng')
on conflict (code) do nothing;
