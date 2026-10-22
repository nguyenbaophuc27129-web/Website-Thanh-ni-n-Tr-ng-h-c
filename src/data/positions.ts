/**
 * Chức vụ Đoàn của Đoàn viên / Học sinh (dùng cho đăng ký tài khoản Đoàn viên
 * và khi admin cấp tài khoản cá nhân) — chuẩn hóa chỉ tập trung Đoàn TNCS Hồ Chí Minh
 * và Ban cán sự lớp học (theo yêu cầu Ban TNTH TW Đoàn).
 */
export const DV_HOI_POSITION_GROUPS: { label: string; positions: string[] }[] = [
  {
    label: "Đoàn TNCS Hồ Chí Minh",
    positions: [
      "Đoàn viên",
      "Ủy viên Ban Chấp hành Chi Đoàn",
      "Phó Bí thư Chi Đoàn",
      "Bí thư Chi Đoàn",
      "Ủy viên Ban Chấp hành Đoàn trường",
      "Ủy viên Ban Thường vụ Đoàn trường",
      "Phó Bí thư Đoàn trường",
      "Bí thư Đoàn trường",
    ],
  },
  {
    label: "Ban cán sự lớp",
    positions: [
      "Lớp trưởng",
      "Lớp phó học tập",
      "Lớp phó phong trào",
      "Thành viên lớp",
    ],
  },
];

/** Danh sách phẳng (mặc định chọn phần tử đầu = "Đoàn viên") */
export const DV_HOI_POSITIONS = DV_HOI_POSITION_GROUPS.flatMap((g) => g.positions);
