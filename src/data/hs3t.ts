import type { Hs3tAchievement, Hs3tProfile, Hs3tUnitStandard } from "@/types";

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
  // 941 — đủ 3 nhóm theo quy chế TW (Đạo đức · Học tập · Thể lực) + Thành tích khác
  { id: 951, profileId: 941, title: "Giải Ba Học sinh giỏi Tin học cấp tỉnh", category: "HOC_TAP", sub: "Giải (Nhất, Nhì, Ba) học sinh giỏi cấp tỉnh trở lên", achievedAt: "2026-04-12", addedByRole: "SCHOOL", addedByAccountId: 5, createdAt: "2026-09-08T02:00:00Z" },
  { id: 952, profileId: 941, title: "Kết quả học kỳ I xếp loại Giỏi — hạnh kiểm Tốt", category: "HOC_TAP", sub: "Học lực loại Tốt, Toán – Văn – Ngoại ngữ từ 8,5", evidenceNames: ["hoc-ba-hk1.pdf"], achievedAt: "2026-06-15", addedByRole: "STUDENT", addedByAccountId: 6, createdAt: "2026-09-08T02:05:00Z" },
  { id: 953, profileId: 941, title: "Bằng khen thành tích xuất sắc công tác Đoàn trường năm học 2025-2026", category: "PHONG_TRAO", sub: "Thanh niên tiêu biểu / Bằng khen công tác Đoàn từ cấp trên trực tiếp cơ sở trở lên", achievedAt: "2026-05-20", addedByRole: "SCHOOL", addedByAccountId: 5, createdAt: "2026-09-08T02:10:00Z" },
  { id: 954, profileId: 941, title: "Giấy khen hoạt động tình nguyện — Chủ nhật xanh thu gom rác thải nhựa", category: "PHONG_TRAO", sub: "Được khen thưởng hoạt động tình nguyện từ cấp trên trực tiếp cơ sở trở lên", evidenceNames: ["chu-nhat-xanh.jpg"], achievedAt: "2026-09-20", addedByRole: "STUDENT", addedByAccountId: 6, createdAt: "2026-09-21T02:00:00Z" },
  { id: 955, profileId: 941, title: "Giải Ba cự ly 1500m nam — Hội thao tháng thanh niên của trường", category: "REN_LUYEN", sub: "Giải cá nhân (Nhất, Nhì, Ba) giải TDTT phong trào cấp trường trở lên", achievedAt: "2026-03-10", addedByRole: "SCHOOL", addedByAccountId: 5, createdAt: "2026-09-08T02:15:00Z" },
  { id: 960, profileId: 941, title: "Chứng chỉ IELTS 7.5 — British Council", category: "KHAC", sub: "Chứng chỉ ngoại ngữ", evidenceNames: ["ielts-7-5.pdf"], achievedAt: "2026-06-20", addedByRole: "STUDENT", addedByAccountId: 6, createdAt: "2026-09-08T02:20:00Z" },
  // 942 — 2 nhóm (khuôn tỉnh)
  { id: 956, profileId: 942, title: "Giải Nhì quần vợt đơn nam — Giải vợt non sông cấp tỉnh", category: "REN_LUYEN", sub: "Giải cá nhân (Nhất, Nhì, Ba) giải TDTT phong trào cấp trường trở lên", achievedAt: "2026-05-02", addedByRole: "SCHOOL", addedByAccountId: 5, createdAt: "2026-09-09T02:00:00Z" },
  { id: 957, profileId: 942, title: "Giải Nhất học sinh giỏi Toán cấp trường", category: "HOC_TAP", sub: "Giải (Nhất, Nhì, Ba) học sinh giỏi cấp tỉnh trở lên", achievedAt: "2026-04-22", addedByRole: "SCHOOL", addedByAccountId: 5, createdAt: "2026-09-09T02:05:00Z" },
  { id: 958, profileId: 942, title: "Giấy khen chiến sĩ tình nguyện — Mùa hè xanh 2026 tại Bình Phước", category: "PHONG_TRAO", sub: "Được khen thưởng hoạt động tình nguyện từ cấp trên trực tiếp cơ sở trở lên", evidenceNames: ["mua-he-xanh-1.jpg", "mua-he-xanh-2.jpg"], achievedAt: "2026-07-18", addedByRole: "STUDENT", addedByAccountId: 901, createdAt: "2026-09-09T02:10:00Z" },
  // 943 — 1 nhóm (khuôn xã)
  { id: 959, profileId: 943, title: "Học sinh tiến bộ toàn diện năm học 2025-2026", category: "HOC_TAP", sub: "Học lực loại Tốt, Toán – Văn – Ngoại ngữ từ 8,5", achievedAt: "2026-06-10", addedByRole: "SCHOOL", addedByAccountId: 5, createdAt: "2026-09-10T02:00:00Z" },
];

/**
 * Điều 5 Quy chế — đơn vị xây dựng tiêu chuẩn riêng phù hợp thực tiễn,
 * KHÔNG cao hơn chuẩn Trung ương. Seed: trường 31 (THPT Chánh Phú Hưng) đã điều chỉnh.
 */
export const hs3tUnitStandards: Hs3tUnitStandard[] = [
  {
    id: 961,
    orgUnitId: 31,
    applyTw: false,
    daoDuc:
      "Chuẩn TW giữ nguyên (hạnh kiểm Tốt, đoàn viên XSNV, không vi phạm). Tiêu chí đạt thêm: khen thưởng tình nguyện/đạt giải cuộc thi tìm hiểu từ cấp TRƯỜNG trở lên (TW yêu cầu cấp trên trực tiếp cơ sở trở lên).",
    hocTap:
      "Chuẩn TW giữ nguyên. Tiêu chí đạt thêm: giải Học sinh giỏi hoặc KHKT từ cấp TRƯỜNG trở lên (TW yêu cầu cấp tỉnh trở lên).",
    theLuc: "Áp dụng nguyên chuẩn TW — đạt thể lực theo QĐ 53/2008, TT 22/2021 và 1 tiêu chí thể thao đạt thêm.",
    note: "Điều chỉnh thấp hơn cho phù hợp học sinh vùng khó — không cao hơn chuẩn TW theo Điều 5.",
    confirmedByAccountId: 5,
    updatedAt: "2026-09-01T02:00:00Z",
  },
];
