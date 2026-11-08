/**
 * Bảng màu "Rực rỡ tuổi học sinh" — tông cam theo chữ hiệu (góp ý chị Ngọc Anh):
 * CREAM nền trang · ORANGE chủ đạo · RED nhấn heading · GOLD điểm xuyết · INK chữ.
 * Dùng chung cho trang bình chọn HS3T + Đoàn trường để 2 trang đồng bộ.
 */
export const PALETTE = {
  /** Nền kem chính của trang */
  cream: "#FFF7EE",
  /** Card trắng sạch */
  card: "#FFFDF9",
  /** Cam chủ đạo */
  orange: "#F26522",
  /** Đỏ nhấn (heading, nút chính) */
  red: "#C4161C",
  /** Vàng sáng điểm xuyết */
  gold: "#FFDF7E",
  /** Nâu đậm chữ trên nền kem */
  ink: "#3D1A0E",
  /** Cam nhạt viền/đệm */
  orangeSoft: "#FFE3CF",
} as const;

/** Gradient hero cam→đỏ dùng chung */
export const HERO_GRADIENT = "linear-gradient(135deg, #F26522 0%, #DE3A12 55%, #C4161C 100%)";

/** Gradient panel thẻ danh hiệu (khớp khung ảnh xưởng ảnh) */
export const CARD_GRADIENT = "linear-gradient(180deg, #FFDF7E 0%, #F26522 55%, #C4161C 100%)";

/** Nhãn danh hiệu 3 cấp — wording thống nhất */
export const HONOR_LEVEL_LABEL: Record<string, string> = {
  TRUONG: "Danh hiệu cấp trường",
  TINH: "Danh hiệu cấp tỉnh",
  TW_DE_CU: "Đề cử danh hiệu cấp Trung ương",
};

/** Nhãn ngắn cho chip */
export const HONOR_LEVEL_SHORT: Record<string, string> = {
  TRUONG: "Cấp trường",
  TINH: "Cấp tỉnh",
  TW_DE_CU: "Đề cử cấp TW",
};
