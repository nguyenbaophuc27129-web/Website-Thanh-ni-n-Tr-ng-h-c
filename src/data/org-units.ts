import type { OrgBlock, OrgUnit, SchoolType } from "@/types";

/** Loại trường — id khớp bảng school_types trong DB */
export const schoolTypes: SchoolType[] = [
  { id: 3, code: "THPT", name: "Trung học phổ thông" },
  { id: 4, code: "THCS", name: "Trung học cơ sở" },
  { id: 5, code: "TIEU_HOC", name: "Tiểu học" },
  { id: 6, code: "MAM_NON", name: "Mầm non" },
  { id: 7, code: "Dai_Hoc_CĐ", name: "Đại học, Cao đẳng" },
  { id: 13, code: "GDNN_GDTX", name: "Trung tâm GDNN - GDTX" },
];

/** 4 khối tổ chức Đoàn */
export const ORG_BLOCKS: { value: OrgBlock; label: string; hint: string }[] = [
  {
    value: "DAN_CU",
    label: "Khối Địa bàn dân cư",
    hint: "Quận/Huyện/Thị/Thành đoàn thuộc tỉnh; Đoàn xã, phường, thị trấn; Chi đoàn thôn, xóm, khu phố",
  },
  {
    value: "TRUONG_HOC",
    label: "Khối Trường học",
    hint: "Đoàn Học viện, ĐH, CĐ; Đoàn THPT, TT GDNN-GDTX; Liên chi đoàn khoa, chi đoàn lớp",
  },
  {
    value: "CO_QUAN",
    label: "Khối Cơ quan và Doanh nghiệp",
    hint: "Đoàn Khối cơ quan tỉnh, Đoàn Khối doanh nghiệp, Đoàn Tập đoàn/Tổng công ty; Đoàn cơ sở tại Sở, Ban, Ngành, ngân hàng",
  },
  {
    value: "VU_TRANG",
    label: "Khối Lực lượng vũ trang",
    hint: "Ban TN Quân đội/Công an; Đoàn Quân khu, Quân đoàn, Sư đoàn; Đoàn cơ sở Công an tỉnh, huyện",
  },
];

export const ORG_BLOCK_LABEL: Record<string, string> = Object.fromEntries(
  ORG_BLOCKS.map((b) => [b.value, b.label])
);

/** Nhãn 5 cấp tổ chức */
export const ORG_LEVEL_LABEL: Record<number, string> = {
  1: "Trung ương Đoàn",
  2: "Tỉnh / Thành đoàn, Đoàn trực thuộc TW",
  3: "Cấp trên cơ sở (Quận, Huyện, Thị, Thành đoàn, Khối…)",
  4: "Đoàn cơ sở (xã, phường, trường, cơ quan…)",
  5: "Dưới cơ sở (Liên chi, Chi đoàn)",
};

/** Nhãn ngắn dùng trong bảng */
export const ORG_LEVEL_SHORT: Record<number, string> = {
  1: "Trung ương",
  2: "Tỉnh / Thành",
  3: "Cấp trên cơ sở",
  4: "Cơ sở",
  5: "Dưới cơ sở",
};

/**
 * Cây đơn vị tổ chức Đoàn — đồng bộ với bảng org_units trong DB.
 * Cấp 1 = TW Đoàn · Cấp 2 = 34 tỉnh/thành (sau sáp nhập 2025) + 5 đoàn trực thuộc TW.
 * Các cấp dưới (3/4/5) do tỉnh/thành đoàn tự tạo trên hệ thống.
 */
export const orgUnits: OrgUnit[] = [
  {
    id: 1, parentId: null, code: "TW-DOAN", name: "Trung ương Đoàn TNCS Hồ Chí Minh", shortName: "TW Đoàn",
    orgLevel: 1, adminUnitName: "Thành phố Hà Nội", address: "Số 62 Bà Triệu, Hà Nội", isActive: true,
  },
  // 34 tỉnh/thành phố (sắp theo danh mục đơn vị hành chính 2025)
  { id: 100, parentId: 1, code: "TD-TQ",  name: "Đoàn TNCS Hồ Chí Minh Tỉnh Tuyên Quang",             shortName: "Tỉnh đoàn Tuyên Quang",     orgLevel: 2, adminUnitName: "Tỉnh Tuyên Quang",        isActive: true },
  { id: 101, parentId: 1, code: "TD-LC",  name: "Đoàn TNCS Hồ Chí Minh Tỉnh Lào Cai",                shortName: "Tỉnh đoàn Lào Cai",         orgLevel: 2, adminUnitName: "Tỉnh Lào Cai",            isActive: true },
  { id: 102, parentId: 1, code: "TD-TNN", name: "Đoàn TNCS Hồ Chí Minh Tỉnh Thái Nguyên",            shortName: "Tỉnh đoàn Thái Nguyên",     orgLevel: 2, adminUnitName: "Tỉnh Thái Nguyên",        isActive: true },
  { id: 103, parentId: 1, code: "TD-PT",  name: "Đoàn TNCS Hồ Chí Minh Tỉnh Phú Thọ",                shortName: "Tỉnh đoàn Phú Thọ",         orgLevel: 2, adminUnitName: "Tỉnh Phú Thọ",            isActive: true },
  { id: 104, parentId: 1, code: "TD-BN",  name: "Đoàn TNCS Hồ Chí Minh Tỉnh Bắc Ninh",               shortName: "Tỉnh đoàn Bắc Ninh",        orgLevel: 2, adminUnitName: "Tỉnh Bắc Ninh",           isActive: true },
  { id: 105, parentId: 1, code: "TD-HY",  name: "Đoàn TNCS Hồ Chí Minh Tỉnh Hưng Yên",               shortName: "Tỉnh đoàn Hưng Yên",        orgLevel: 2, adminUnitName: "Tỉnh Hưng Yên",           isActive: true },
  { id: 106, parentId: 1, code: "TD-HP",  name: "Đoàn TNCS Hồ Chí Minh Thành phố Hải Phòng",         shortName: "Thành đoàn Hải Phòng",      orgLevel: 2, adminUnitName: "Thành phố Hải Phòng",     isActive: true },
  { id: 107, parentId: 1, code: "TD-NB",  name: "Đoàn TNCS Hồ Chí Minh Tỉnh Ninh Bình",              shortName: "Tỉnh đoàn Ninh Bình",       orgLevel: 2, adminUnitName: "Tỉnh Ninh Bình",          isActive: true },
  { id: 108, parentId: 1, code: "TD-QTR", name: "Đoàn TNCS Hồ Chí Minh Tỉnh Quảng Trị",              shortName: "Tỉnh đoàn Quảng Trị",       orgLevel: 2, adminUnitName: "Tỉnh Quảng Trị",          isActive: true },
  { id: 109, parentId: 1, code: "TD-DN",  name: "Đoàn TNCS Hồ Chí Minh Thành phố Đà Nẵng",           shortName: "Thành đoàn Đà Nẵng",        orgLevel: 2, adminUnitName: "Thành phố Đà Nẵng",       isActive: true },
  { id: 110, parentId: 1, code: "TD-QNG", name: "Đoàn TNCS Hồ Chí Minh Tỉnh Quảng Ngãi",             shortName: "Tỉnh đoàn Quảng Ngãi",      orgLevel: 2, adminUnitName: "Tỉnh Quảng Ngãi",         isActive: true },
  { id: 111, parentId: 1, code: "TD-GL",  name: "Đoàn TNCS Hồ Chí Minh Tỉnh Gia Lai",                shortName: "Tỉnh đoàn Gia Lai",         orgLevel: 2, adminUnitName: "Tỉnh Gia Lai",            isActive: true },
  { id: 112, parentId: 1, code: "TD-KH",  name: "Đoàn TNCS Hồ Chí Minh Tỉnh Khánh Hoà",              shortName: "Tỉnh đoàn Khánh Hoà",       orgLevel: 2, adminUnitName: "Tỉnh Khánh Hoà",          isActive: true },
  { id: 113, parentId: 1, code: "TD-LD",  name: "Đoàn TNCS Hồ Chí Minh Tỉnh Lâm Đồng",               shortName: "Tỉnh đoàn Lâm Đồng",        orgLevel: 2, adminUnitName: "Tỉnh Lâm Đồng",           isActive: true },
  { id: 114, parentId: 1, code: "TD-DL",  name: "Đoàn TNCS Hồ Chí Minh Tỉnh Đắk Lắk",                shortName: "Tỉnh đoàn Đắk Lắk",         orgLevel: 2, adminUnitName: "Tỉnh Đắk Lắk",            isActive: true },
  { id: 115, parentId: 1, code: "TD-HCM", name: "Đoàn TNCS Hồ Chí Minh Thành phố Hồ Chí Minh",       shortName: "Thành đoàn TP Hồ Chí Minh", orgLevel: 2, adminUnitName: "Thành phố Hồ Chí Minh",   isActive: true },
  { id: 116, parentId: 1, code: "TD-DNA", name: "Đoàn TNCS Hồ Chí Minh Tỉnh Đồng Nai",               shortName: "Tỉnh đoàn Đồng Nai",        orgLevel: 2, adminUnitName: "Tỉnh Đồng Nai",           isActive: true },
  { id: 117, parentId: 1, code: "TD-TNH", name: "Đoàn TNCS Hồ Chí Minh Tỉnh Tây Ninh",               shortName: "Tỉnh đoàn Tây Ninh",        orgLevel: 2, adminUnitName: "Tỉnh Tây Ninh",           isActive: true },
  { id: 118, parentId: 1, code: "TD-CT",  name: "Đoàn TNCS Hồ Chí Minh Thành phố Cần Thơ",           shortName: "Thành đoàn Cần Thơ",        orgLevel: 2, adminUnitName: "Thành phố Cần Thơ",       isActive: true },
  { id: 119, parentId: 1, code: "TD-VL",  name: "Đoàn TNCS Hồ Chí Minh Tỉnh Vĩnh Long",              shortName: "Tỉnh đoàn Vĩnh Long",       orgLevel: 2, adminUnitName: "Tỉnh Vĩnh Long",          isActive: true },
  { id: 120, parentId: 1, code: "TD-DTP", name: "Đoàn TNCS Hồ Chí Minh Tỉnh Đồng Tháp",              shortName: "Tỉnh đoàn Đồng Tháp",       orgLevel: 2, adminUnitName: "Tỉnh Đồng Tháp",          isActive: true },
  { id: 121, parentId: 1, code: "TD-CM",  name: "Đoàn TNCS Hồ Chí Minh Tỉnh Cà Mau",                 shortName: "Tỉnh đoàn Cà Mau",          orgLevel: 2, adminUnitName: "Tỉnh Cà Mau",             isActive: true },
  { id: 122, parentId: 1, code: "TD-AG",  name: "Đoàn TNCS Hồ Chí Minh Tỉnh An Giang",               shortName: "Tỉnh đoàn An Giang",        orgLevel: 2, adminUnitName: "Tỉnh An Giang",           isActive: true },
  { id: 123, parentId: 1, code: "TD-HN",  name: "Đoàn TNCS Hồ Chí Minh Thành phố Hà Nội",            shortName: "Thành đoàn Hà Nội",         orgLevel: 2, adminUnitName: "Thành phố Hà Nội",        isActive: true },
  { id: 124, parentId: 1, code: "TD-HUE", name: "Đoàn TNCS Hồ Chí Minh Thành phố Huế",               shortName: "Thành đoàn Huế",            orgLevel: 2, adminUnitName: "Thành phố Huế",           isActive: true },
  { id: 125, parentId: 1, code: "TD-LZ",  name: "Đoàn TNCS Hồ Chí Minh Tỉnh Lai Châu",               shortName: "Tỉnh đoàn Lai Châu",        orgLevel: 2, adminUnitName: "Tỉnh Lai Châu",           isActive: true },
  { id: 126, parentId: 1, code: "TD-DB",  name: "Đoàn TNCS Hồ Chí Minh Tỉnh Điện Biên",              shortName: "Tỉnh đoàn Điện Biên",       orgLevel: 2, adminUnitName: "Tỉnh Điện Biên",          isActive: true },
  { id: 127, parentId: 1, code: "TD-SL",  name: "Đoàn TNCS Hồ Chí Minh Tỉnh Sơn La",                 shortName: "Tỉnh đoàn Sơn La",          orgLevel: 2, adminUnitName: "Tỉnh Sơn La",             isActive: true },
  { id: 128, parentId: 1, code: "TD-LS",  name: "Đoàn TNCS Hồ Chí Minh Tỉnh Lạng Sơn",               shortName: "Tỉnh đoàn Lạng Sơn",        orgLevel: 2, adminUnitName: "Tỉnh Lạng Sơn",           isActive: true },
  { id: 129, parentId: 1, code: "TD-QNH", name: "Đoàn TNCS Hồ Chí Minh Tỉnh Quảng Ninh",             shortName: "Tỉnh đoàn Quảng Ninh",      orgLevel: 2, adminUnitName: "Tỉnh Quảng Ninh",         isActive: true },
  { id: 130, parentId: 1, code: "TD-TH",  name: "Đoàn TNCS Hồ Chí Minh Tỉnh Thanh Hoá",              shortName: "Tỉnh đoàn Thanh Hoá",       orgLevel: 2, adminUnitName: "Tỉnh Thanh Hoá",          isActive: true },
  { id: 131, parentId: 1, code: "TD-NA",  name: "Đoàn TNCS Hồ Chí Minh Tỉnh Nghệ An",                shortName: "Tỉnh đoàn Nghệ An",         orgLevel: 2, adminUnitName: "Tỉnh Nghệ An",            isActive: true },
  { id: 132, parentId: 1, code: "TD-HT",  name: "Đoàn TNCS Hồ Chí Minh Tỉnh Hà Tĩnh",                shortName: "Tỉnh đoàn Hà Tĩnh",         orgLevel: 2, adminUnitName: "Tỉnh Hà Tĩnh",            isActive: true },
  { id: 133, parentId: 1, code: "TD-CB",  name: "Đoàn TNCS Hồ Chí Minh Tỉnh Cao Bằng",               shortName: "Tỉnh đoàn Cao Bằng",        orgLevel: 2, adminUnitName: "Tỉnh Cao Bằng",           isActive: true },
  // 5 đoàn trực thuộc Trung ương
  { id: 140, parentId: 1, code: "TW-QDOI",     name: "Ban Thanh niên Quân đội",                       shortName: "Ban TN Quân đội",     orgLevel: 2, adminUnitName: "Thành phố Hà Nội", isActive: true, block: "VU_TRANG" },
  { id: 141, parentId: 1, code: "TW-CONGAN",   name: "Ban Thanh niên Công an Nhân dân",               shortName: "Ban TN Công an ND",   orgLevel: 2, adminUnitName: "Thành phố Hà Nội", isActive: true, block: "VU_TRANG" },
  { id: 142, parentId: 1, code: "TW-CHINHPHU", name: "Đoàn Thanh niên Chính phủ",                     shortName: "Đoàn TN Chính phủ",   orgLevel: 2, adminUnitName: "Thành phố Hà Nội", isActive: true, block: "CO_QUAN" },
  { id: 143, parentId: 1, code: "TW-CQDANG",   name: "Đoàn thanh niên các Cơ quan Đảng Trung ương",   shortName: "Đoàn TN CQ Đảng TW",  orgLevel: 2, adminUnitName: "Thành phố Hà Nội", isActive: true, block: "CO_QUAN" },
  { id: 144, parentId: 1, code: "TW-MTTQ",     name: "Đoàn thanh niên Mặt trận Tổ quốc Việt Nam",     shortName: "Đoàn TN MTTQ VN",     orgLevel: 2, adminUnitName: "Thành phố Hà Nội", isActive: true, block: "CO_QUAN" },
];

/** Đơn vị hành chính cho form phản ánh (admin_units) — 34 tỉnh/thành trực thuộc TW */
export const adminUnits = [
  { id: 1, code: "AD-TQ", name: "Tỉnh Tuyên Quang", unitType: "PROVINCE" as const, parentId: null },
  { id: 2, code: "AD-LC", name: "Tỉnh Lào Cai", unitType: "PROVINCE" as const, parentId: null },
  { id: 3, code: "AD-TNN", name: "Tỉnh Thái Nguyên", unitType: "PROVINCE" as const, parentId: null },
  { id: 4, code: "AD-PT", name: "Tỉnh Phú Thọ", unitType: "PROVINCE" as const, parentId: null },
  { id: 5, code: "AD-BN", name: "Tỉnh Bắc Ninh", unitType: "PROVINCE" as const, parentId: null },
  { id: 6, code: "AD-HY", name: "Tỉnh Hưng Yên", unitType: "PROVINCE" as const, parentId: null },
  { id: 7, code: "AD-HP", name: "Thành phố Hải Phòng", unitType: "PROVINCE" as const, parentId: null },
  { id: 8, code: "AD-NB", name: "Tỉnh Ninh Bình", unitType: "PROVINCE" as const, parentId: null },
  { id: 9, code: "AD-QTR", name: "Tỉnh Quảng Trị", unitType: "PROVINCE" as const, parentId: null },
  { id: 10, code: "AD-DN", name: "Thành phố Đà Nẵng", unitType: "PROVINCE" as const, parentId: null },
  { id: 11, code: "AD-QNG", name: "Tỉnh Quảng Ngãi", unitType: "PROVINCE" as const, parentId: null },
  { id: 12, code: "AD-GL", name: "Tỉnh Gia Lai", unitType: "PROVINCE" as const, parentId: null },
  { id: 13, code: "AD-KH", name: "Tỉnh Khánh Hoà", unitType: "PROVINCE" as const, parentId: null },
  { id: 14, code: "AD-LD", name: "Tỉnh Lâm Đồng", unitType: "PROVINCE" as const, parentId: null },
  { id: 15, code: "AD-DL", name: "Tỉnh Đắk Lắk", unitType: "PROVINCE" as const, parentId: null },
  { id: 16, code: "AD-HCM", name: "Thành phố Hồ Chí Minh", unitType: "PROVINCE" as const, parentId: null },
  { id: 17, code: "AD-DNA", name: "Tỉnh Đồng Nai", unitType: "PROVINCE" as const, parentId: null },
  { id: 18, code: "AD-TNH", name: "Tỉnh Tây Ninh", unitType: "PROVINCE" as const, parentId: null },
  { id: 19, code: "AD-CT", name: "Thành phố Cần Thơ", unitType: "PROVINCE" as const, parentId: null },
  { id: 20, code: "AD-VL", name: "Tỉnh Vĩnh Long", unitType: "PROVINCE" as const, parentId: null },
  { id: 21, code: "AD-DTP", name: "Tỉnh Đồng Tháp", unitType: "PROVINCE" as const, parentId: null },
  { id: 22, code: "AD-CM", name: "Tỉnh Cà Mau", unitType: "PROVINCE" as const, parentId: null },
  { id: 23, code: "AD-AG", name: "Tỉnh An Giang", unitType: "PROVINCE" as const, parentId: null },
  { id: 24, code: "AD-HN", name: "Thành phố Hà Nội", unitType: "PROVINCE" as const, parentId: null },
  { id: 25, code: "AD-HUE", name: "Thành phố Huế", unitType: "PROVINCE" as const, parentId: null },
  { id: 26, code: "AD-LZ", name: "Tỉnh Lai Châu", unitType: "PROVINCE" as const, parentId: null },
  { id: 27, code: "AD-DB", name: "Tỉnh Điện Biên", unitType: "PROVINCE" as const, parentId: null },
  { id: 28, code: "AD-SL", name: "Tỉnh Sơn La", unitType: "PROVINCE" as const, parentId: null },
  { id: 29, code: "AD-LS", name: "Tỉnh Lạng Sơn", unitType: "PROVINCE" as const, parentId: null },
  { id: 30, code: "AD-QNH", name: "Tỉnh Quảng Ninh", unitType: "PROVINCE" as const, parentId: null },
  { id: 31, code: "AD-TH", name: "Tỉnh Thanh Hoá", unitType: "PROVINCE" as const, parentId: null },
  { id: 32, code: "AD-NA", name: "Tỉnh Nghệ An", unitType: "PROVINCE" as const, parentId: null },
  { id: 33, code: "AD-HT", name: "Tỉnh Hà Tĩnh", unitType: "PROVINCE" as const, parentId: null },
  { id: 34, code: "AD-CB", name: "Tỉnh Cao Bằng", unitType: "PROVINCE" as const, parentId: null },
];

/** Tìm đơn vị và toàn bộ con cháu (mô phỏng truy vấn path LIKE) */
export function descendantIds(id: number, units: OrgUnit[] = orgUnits): number[] {
  const direct = units.filter((u) => u.parentId === id).map((u) => u.id);
  const all = [...direct];
  for (const d of direct) all.push(...descendantIds(d, units));
  return all;
}

/** Danh sách tổ chức các vai trò demo */
export const roleList = [
  { id: 1, code: "QUAN_TRI_TW" as const, name: "Quản trị Trung ương", description: "Toàn quyền hệ thống, cấu hình, phân cấp" },
  { id: 2, code: "QUAN_TRI_TINH" as const, name: "Quản trị Tỉnh/Thành", description: "Quản lý đơn vị thuộc địa bàn tỉnh" },
  { id: 3, code: "QUAN_TRI_CAP3" as const, name: "Quản trị cấp Phường/Xã", description: "Quản lý trường thuộc địa bàn phường/xã" },
  { id: 4, code: "DON_VI" as const, name: "Đơn vị cơ sở", description: "Cập nhật hoạt động, báo cáo kết quả" },
  { id: 5, code: "BIEN_TAP_VIEN" as const, name: "Biên tập viên", description: "Biên tập, xuất bản tin bài" },
  { id: 6, code: "DOAN_VIEN" as const, name: "Đoàn viên", description: "Tham gia Diễn đàn ẩn danh (đăng bài, bình luận, cảm xúc)" },
];

export const permissionsList = [
  { id: 1, code: "activity.view", name: "Xem hoạt động", module: "Hoạt động" },
  { id: 2, code: "activity.create", name: "Cập nhật hoạt động", module: "Hoạt động" },
  { id: 3, code: "activity.review", name: "Xác nhận hoạt động", module: "Hoạt động" },
  { id: 4, code: "task.assign", name: "Giao nhiệm vụ", module: "Nhiệm vụ" },
  { id: 5, code: "task.update", name: "Cập nhật kết quả", module: "Nhiệm vụ" },
  { id: 6, code: "task.review", name: "Xác nhận kết quả", module: "Nhiệm vụ" },
  { id: 7, code: "score.manage", name: "Chấm điểm thi đua", module: "Đánh giá" },
  { id: 8, code: "score.view", name: "Xem điểm", module: "Đánh giá" },
  { id: 9, code: "report.create", name: "Lập báo cáo", module: "Báo cáo" },
  { id: 10, code: "report.manage", name: "Quản lý báo cáo", module: "Báo cáo" },
  { id: 11, code: "ranking.manage", name: "Chốt kỳ xếp hạng", module: "Xếp hạng" },
  { id: 12, code: "document.issue", name: "Ban hành văn bản", module: "Văn bản" },
  { id: 13, code: "document.view", name: "Xem văn bản", module: "Văn bản" },
  { id: 14, code: "feedback.manage", name: "Xử lý phản ánh", module: "Phản ánh" },
  { id: 15, code: "feedback.view", name: "Xem phản ánh, kiến nghị của Học sinh THPT", module: "Phản ánh" },
  { id: 16, code: "post.manage", name: "Quản lý bài viết", module: "Xuất bản" },
  { id: 17, code: "post.publish", name: "Đăng bài công khai", module: "Xuất bản" },
  { id: 18, code: "resource.manage", name: "Quản lý tài nguyên", module: "Tài nguyên" },
  { id: 19, code: "resource.view", name: "Xem tài nguyên", module: "Tài nguyên" },
  { id: 20, code: "system.orgtree.view", name: "Xem cây tổ chức", module: "Hệ thống" },
  { id: 21, code: "system.account.manage", name: "Quản lý tài khoản", module: "Hệ thống" },
  { id: 22, code: "system.settings", name: "Cấu hình hệ thống", module: "Hệ thống" },
  /* Bổ sung theo Copy of Book1.xlsx — phân quyền theo tài khoản */
  { id: 23, code: "feedback.reply", name: "Trả lời phản ánh, kiến nghị của Học sinh THPT", module: "Phản ánh" },
  { id: 24, code: "hs3t.view", name: "Xem hồ sơ Học sinh 3 tốt", module: "Học sinh 3 tốt" },
  { id: 25, code: "hs3t.review", name: "Thẩm định, duyệt, đánh giá hồ sơ Học sinh 3 tốt", module: "Học sinh 3 tốt" },
  { id: 26, code: "quiz.manage", name: "Quản lý kỳ thi trực tuyến", module: "Thi trực tuyến" },
  { id: 27, code: "quiz.result", name: "Xem kết quả thi trực tuyến", module: "Thi trực tuyến" },
  { id: 28, code: "forum.manage", name: "Kiểm duyệt Diễn đàn", module: "Cộng đồng" },
  { id: 29, code: "forum.interact", name: "Đăng bài, bình luận, tương tác Diễn đàn", module: "Cộng đồng" },
  { id: 30, code: "project.manage", name: 'Quản lý chuyên mục dự án tình nguyện vì cộng đồng', module: "Cộng đồng" },
  { id: 31, code: "contribution.review", name: "Duyệt đóng góp của Đoàn viên", module: "Cộng đồng" },
];
