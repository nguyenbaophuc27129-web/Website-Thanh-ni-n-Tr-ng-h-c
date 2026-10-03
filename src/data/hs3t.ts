import type { Hs3tAchievement, Hs3tProfile } from "@/types";

/**
 * Hồ sơ Học sinh 3 tốt mẫu — account 6 = dv.demo (THPT Chánh Phú Hưng, org 31);
 * 901/902 là tài khoản học sinh mô phỏng cùng trường.
 */
export const hs3tProfiles: Hs3tProfile[] = [
  {
    id: 941, code: "HS3T-2026-1001", accountId: 6, studentName: "Nguyễn Bảo Phúc",
    schoolOrgUnitId: 31, className: "12A1", createdAt: "2026-09-05T02:00:00Z",
  },
  {
    id: 942, code: "HS3T-2026-1002", accountId: 901, studentName: "Trần Hoàng Phú",
    schoolOrgUnitId: 31, className: "11A3", createdAt: "2026-09-06T02:00:00Z",
  },
  {
    id: 943, code: "HS3T-2026-1003", accountId: 902, studentName: "Lê Thanh Trúc",
    schoolOrgUnitId: 31, className: "12A5", createdAt: "2026-09-07T02:00:00Z",
  },
];

export const hs3tAchievements: Hs3tAchievement[] = [
  // 941 — đủ 3 nhóm, nhiều minh chứng (khuôn TW)
  { id: 951, profileId: 941, title: "Giải Ba Học sinh giỏi Tin học cấp tỉnh", category: "HOC_TAP", achievedAt: "2026-04-12", addedByRole: "SCHOOL", addedByAccountId: 5, createdAt: "2026-09-08T02:00:00Z" },
  { id: 952, profileId: 941, title: "Thành tích học kỳ I xếp loại Giỏi", category: "HOC_TAP", evidenceNames: ["hoc-ba-hk1.pdf"], achievedAt: "2026-06-15", addedByRole: "STUDENT", addedByAccountId: 6, createdAt: "2026-09-08T02:05:00Z" },
  { id: 953, profileId: 941, title: "Đạt danh hiệu Lao động Đoàn xuất sắc", category: "REN_LUYEN", achievedAt: "2026-05-20", addedByRole: "SCHOOL", addedByAccountId: 5, createdAt: "2026-09-08T02:10:00Z" },
  { id: 954, profileId: 941, title: "Tham gia Chủ nhật xanh thu gom rác thải nhựa", category: "PHONG_TRAO", evidenceNames: ["chu-nhat-xanh.jpg"], achievedAt: "2026-09-20", addedByRole: "STUDENT", addedByAccountId: 6, createdAt: "2026-09-21T02:00:00Z" },
  { id: 955, profileId: 941, title: "Đội trưởng đội khuyến học của trường", category: "REN_LUYEN", achievedAt: "2026-03-10", addedByRole: "SCHOOL", addedByAccountId: 5, createdAt: "2026-09-08T02:15:00Z" },
  // 942 — 2 nhóm (khuôn tỉnh)
  { id: 956, profileId: 942, title: "Giải Nhì tay vợt non sông cấp tỉnh", category: "REN_LUYEN", achievedAt: "2026-05-02", addedByRole: "SCHOOL", addedByAccountId: 5, createdAt: "2026-09-09T02:00:00Z" },
  { id: 957, profileId: 942, title: "Học sinh giỏi Toán cấp trường", category: "HOC_TAP", achievedAt: "2026-04-22", addedByRole: "SCHOOL", addedByAccountId: 5, createdAt: "2026-09-09T02:05:00Z" },
  { id: 958, profileId: 942, title: "Tham gia Mùa hè xanh 2026 tại Bình Phước", category: "PHONG_TRAO", evidenceNames: ["mua-he-xanh-1.jpg", "mua-he-xanh-2.jpg"], achievedAt: "2026-07-18", addedByRole: "STUDENT", addedByAccountId: 901, createdAt: "2026-09-09T02:10:00Z" },
  // 943 — 1 nhóm (khuôn xã)
  { id: 959, profileId: 943, title: "Học sinh tiến bộ toàn diện năm học 2025-2026", category: "HOC_TAP", achievedAt: "2026-06-10", addedByRole: "SCHOOL", addedByAccountId: 5, createdAt: "2026-09-10T02:00:00Z" },
];
