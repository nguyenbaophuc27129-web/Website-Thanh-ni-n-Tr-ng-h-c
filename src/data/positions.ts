/**
 * Chức vụ Đoàn - Hội của Đoàn viên / Hội viên (dùng cho đăng ký tài khoản Đoàn viên
 * và khi admin cấp tài khoản cá nhân) — đúng thứ bậc, gộp theo tổ chức.
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
      "Phó Bí thư Đoàn trường",
      "Bí thư Đoàn trường",
    ],
  },
  {
    label: "Hội LHTN Việt Nam",
    positions: [
      "Hội viên Hội LHTN Việt Nam",
      "Bí thư Chi hội Hội LHTN Việt Nam",
      "Ủy viên Ban Chấp hành Hội LHTN Việt Nam",
    ],
  },
  {
    label: "Đội TNTP Hồ Chí Minh",
    positions: ["Đội viên", "Đội phó", "Đội trưởng"],
  },
  {
    label: "Lớp học",
    positions: ["Lớp trưởng", "Lớp phó"],
  },
];

/** Danh sách phẳng (mặc định chọn phần tử đầu = "Đoàn viên") */
export const DV_HOI_POSITIONS = DV_HOI_POSITION_GROUPS.flatMap((g) => g.positions);
