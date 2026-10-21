import type { OrgUnit, SchoolType } from "@/types";

export const schoolTypes: SchoolType[] = [
  { id: 1, code: "THPT", name: "Trung học phổ thông" },
  { id: 2, code: "THCS", name: "Trung học cơ sở" },
  { id: 3, code: "TIEU_HOC", name: "Tiểu học" },
  { id: 4, code: "MAM_NON", name: "Mầm non" },
  { id: 5, code: "Dai_Hoc_CĐ", name: "Đại học, Cao đẳng" },
  { id: 6, code: "GDNN_GDTX", name: "Trung tâm GDNN - GDTX" },
];

/**
 * Cây đơn vị Đoàn 4 cấp — path dạng /1/12/25/31/ mô phỏng materialized path.
 * Cấp 1 = TW · 2 = Tỉnh/Thành · 3 = Phường/Xã · 4 = Cơ sở trường.
 */
export const orgUnits: OrgUnit[] = [
  // Cấp 1 — Trung ương
  { id: 1, parentId: null, code: "TW-TNTH", name: "Ban Công tác Thanh Thiếu Nhi — Trung ương Đoàn TNCS Hồ Chí Minh", shortName: "Ban CTTTN TW", orgLevel: 1, adminUnitName: "Hà Nội", address: "Số 62 Bà Triệu, Hà Nội", isActive: true },
  { id: 2, parentId: null, code: "TW-BIENTAP", name: "Ban Biên tập Cổng Thanh niên Trường học", shortName: "Ban Biên tập", orgLevel: 1, adminUnitName: "Hà Nội", address: "Số 62 Bà Triệu, Hà Nội", isActive: true },

  // Cấp 2 — Tỉnh/Thành Đoàn
  { id: 12, parentId: 1, code: "BD", name: "Tỉnh Đoàn Bình Dương", shortName: "Tỉnh Đoàn Bình Dương", orgLevel: 2, adminUnitName: "Tỉnh Bình Dương", address: "TP Thủ Dầu Một, Bình Dương", isActive: true },
  { id: 13, parentId: 1, code: "HCM", name: "Thành Đoàn TP. Hồ Chí Minh", shortName: "Thành Đoàn TP.HCM", orgLevel: 2, adminUnitName: "TP Hồ Chí Minh", address: "Q.1, TP Hồ Chí Minh", isActive: true },
  { id: 14, parentId: 1, code: "BG", name: "Tỉnh Đoàn Bắc Giang", shortName: "Tỉnh Đoàn Bắc Giang", orgLevel: 2, adminUnitName: "Tỉnh Bắc Giang", address: "TP Bắc Giang", isActive: true },
  { id: 15, parentId: 1, code: "NA", name: "Tỉnh Đoàn Nghệ An", shortName: "Tỉnh Đoàn Nghệ An", orgLevel: 2, adminUnitName: "Tỉnh Nghệ An", address: "TP Vinh, Nghệ An", isActive: true },
  { id: 16, parentId: 1, code: "DN", name: "Thành Đoàn Đà Nẵng", shortName: "Thành Đoàn Đà Nẵng", orgLevel: 2, adminUnitName: "TP Đà Nẵng", address: "TP Đà Nẵng", isActive: true },
  { id: 17, parentId: 1, code: "HN", name: "Thành Đoàn Hà Nội", shortName: "Thành Đoàn Hà Nội", orgLevel: 2, adminUnitName: "TP Hà Nội", address: "Cung Thanh niên Hà Nội", isActive: true },

  // Cấp 4 trực thuộc Tỉnh Đoàn (trường chuyên/PTDTNT do tỉnh quản lý trực tiếp)
  { id: 60, parentId: 12, code: "BD-THPT-CHUYEN", name: "Đoàn Trường THPT Chuyên Bình Dương", shortName: "THPT Chuyên Bình Dương", orgLevel: 4, adminUnitName: "TP Thủ Dầu Một, Bình Dương", schoolTypeName: "Trung học phổ thông", address: "TP Thủ Dầu Một, Bình Dương", isActive: true },

  // Cấp 3 — Phường/Xã (con của Tỉnh Đoàn Bình Dương)
  { id: 25, parentId: 12, code: "BD-HT", name: "Đoàn Phường Hiệp Thành", shortName: "Đoàn P. Hiệp Thành", orgLevel: 3, adminUnitName: "TP Thủ Dầu Một, Bình Dương", isActive: true },
  { id: 26, parentId: 12, code: "BD-PH", name: "Đoàn Phường Phú Hòa", shortName: "Đoàn P. Phú Hòa", orgLevel: 3, adminUnitName: "TP Thủ Dầu Một, Bình Dương", isActive: true },
  { id: 27, parentId: 12, code: "BD-TBH", name: "Đoàn Phường Tương Bình Hiệp", shortName: "Đoàn P. Tương Bình Hiệp", orgLevel: 3, adminUnitName: "TP Thủ Dầu Một, Bình Dương", isActive: true },
  { id: 28, parentId: 12, code: "BD-HA", name: "Đoàn Phường Hiệp An", shortName: "Đoàn P. Hiệp An", orgLevel: 3, adminUnitName: "TP Thủ Dầu Một, Bình Dương", isActive: true },
  // Cấp 3 (con của Thành Đoàn TP.HCM)
  { id: 29, parentId: 13, code: "HCM-BN", name: "Đoàn Phường Bến Nghé", shortName: "Đoàn P. Bến Nghé", orgLevel: 3, adminUnitName: "TP Hồ Chí Minh", isActive: true },
  { id: 30, parentId: 13, code: "HCM-COL", name: "Đoàn Phường Cầu Ông Lãnh", shortName: "Đoàn P. Cầu Ông Lãnh", orgLevel: 3, adminUnitName: "TP Hồ Chí Minh", isActive: true },
  // Cấp 3 (con của Tỉnh Đoàn Bắc Giang)
  { id: 40, parentId: 14, code: "BG-LL", name: "Đoàn Phường Lê Lợi", shortName: "Đoàn P. Lê Lợi", orgLevel: 3, adminUnitName: "TP Bắc Giang", isActive: true },
  { id: 41, parentId: 14, code: "BG-TP", name: "Đoàn Phường Trần Phú", shortName: "Đoàn P. Trần Phú", orgLevel: 3, adminUnitName: "TP Bắc Giang", isActive: true },
  // Cấp 3 (con của Tỉnh Đoàn Nghệ An)
  { id: 45, parentId: 15, code: "NA-VINH", name: "Đoàn Phường Vinh", shortName: "Đoàn P. Vinh", orgLevel: 3, adminUnitName: "TP Vinh, Nghệ An", isActive: true },
  // Cấp 3 (con của Thành Đoàn Đà Nẵng)
  { id: 50, parentId: 16, code: "DN-AH", name: "Đoàn Phường An Hải", shortName: "Đoàn P. An Hải", orgLevel: 3, adminUnitName: "TP Đà Nẵng", isActive: true },
  { id: 51, parentId: 16, code: "DN-TT", name: "Đoàn Phường Thạch Thang", shortName: "Đoàn P. Thạch Thang", orgLevel: 3, adminUnitName: "TP Đà Nẵng", isActive: true },

  // Cấp 4 — Đơn vị cơ sở (con của Đoàn Phường Hiệp Thành)
  { id: 31, parentId: 25, code: "BD-HT-THPT-CPH", name: "Đoàn Trường THPT Chánh Phú Hưng", shortName: "THPT Chánh Phú Hưng", orgLevel: 4, adminUnitName: "TP Thủ Dầu Một, Bình Dương", schoolTypeName: "Trung học phổ thông", address: "P. Hiệp Thành, TP Thủ Dầu Một", isActive: true },
  { id: 32, parentId: 25, code: "BD-HT-THCS", name: "Đoàn Trường THCS Hiệp Thành", shortName: "THCS Hiệp Thành", orgLevel: 4, adminUnitName: "TP Thủ Dầu Một, Bình Dương", schoolTypeName: "Trung học cơ sở", isActive: true },
  { id: 33, parentId: 25, code: "BD-HT-TH-KD", name: "Đoàn Trường Tiểu học Kim Đồng", shortName: "TH Kim Đồng", orgLevel: 4, adminUnitName: "TP Thủ Dầu Một, Bình Dương", schoolTypeName: "Tiểu học", isActive: true },
  // Cấp 4 (con của Đoàn Phường Phú Hòa)
  { id: 34, parentId: 26, code: "BD-PH-THPT-NTN", name: "Đoàn Trường THPT Ngô Thời Nhậm", shortName: "THPT Ngô Thời Nhậm", orgLevel: 4, adminUnitName: "TP Thủ Dầu Một, Bình Dương", schoolTypeName: "Trung học phổ thông", isActive: true },
  { id: 35, parentId: 26, code: "BD-PH-MN-AS", name: "Đoàn Trường Mầm non Ánh Sao", shortName: "MN Ánh Sao", orgLevel: 4, adminUnitName: "TP Thủ Dầu Một, Bình Dương", schoolTypeName: "Mầm non", isActive: true },
  { id: 36, parentId: 25, code: "BD-HT-GDNN", name: "Đoàn Trung tâm GDNN - GDTX TP. Thủ Dầu Một", shortName: "GDNN-GDTX Thủ Dầu Một", orgLevel: 4, adminUnitName: "TP Thủ Dầu Một, Bình Dương", schoolTypeName: "Trung tâm GDNN-GDTX", isActive: true },
  // Cấp 4 (con của Đoàn Phường Lê Lợi, Bắc Giang)
  { id: 42, parentId: 40, code: "BG-LL-THPT-BG", name: "Đoàn Trường THPT Bắc Giang", shortName: "THPT Bắc Giang", orgLevel: 4, adminUnitName: "TP Bắc Giang", schoolTypeName: "Trung học phổ thông", isActive: true },
  { id: 43, parentId: 40, code: "BG-LL-THCS-LL", name: "Đoàn Trường THCS Lê Lợi", shortName: "THCS Lê Lợi", orgLevel: 4, adminUnitName: "TP Bắc Giang", schoolTypeName: "Trung học cơ sở", isActive: true },
  // Cấp 4 (con của Đoàn Phường Vinh)
  { id: 46, parentId: 45, code: "NA-VINH-SP", name: "Đoàn Trường ĐH Sư phạm Nghệ An", shortName: "ĐHSP Nghệ An", orgLevel: 4, adminUnitName: "TP Vinh, Nghệ An", schoolTypeName: "Đại học, Cao đẳng", isActive: true },
  { id: 47, parentId: 15, code: "NA-THPT-PBC", name: "Đoàn Trường THPT Chuyên Phan Bội Châu", shortName: "THPT Phan Bội Châu", orgLevel: 4, adminUnitName: "TP Vinh, Nghệ An", schoolTypeName: "Trung học phổ thông", isActive: true },

  // Cấp 4 (con của Đoàn Phường An Hải & Thành Đoàn Đà Nẵng)
  { id: 52, parentId: 50, code: "DN-AH-KT", name: "Đoàn Trường ĐH Kinh tế Đà Nẵng", shortName: "ĐH Kinh tế ĐN", orgLevel: 4, adminUnitName: "TP Đà Nẵng", schoolTypeName: "Đại học, Cao đẳng", isActive: true },
  { id: 53, parentId: 16, code: "DN-THPT-LQD", name: "Đoàn Trường THPT Chuyên Lê Quý Đôn", shortName: "THPT Lê Quý Đôn ĐN", orgLevel: 4, adminUnitName: "TP Đà Nẵng", schoolTypeName: "Trung học phổ thông", isActive: true },

  // Cấp 4 (Thành Đoàn TP. Hồ Chí Minh)
  { id: 61, parentId: 13, code: "HCM-THPT-LHP", name: "Đoàn Trường THPT Chuyên Lê Hồng Phong", shortName: "THPT Lê Hồng Phong", orgLevel: 4, adminUnitName: "TP Hồ Chí Minh", schoolTypeName: "Trung học phổ thông", isActive: true },
  { id: 62, parentId: 29, code: "HCM-BN-THPT-NTMK", name: "Đoàn Trường THPT Nguyễn Thị Minh Khai", shortName: "THPT Minh Khai", orgLevel: 4, adminUnitName: "TP Hồ Chí Minh", schoolTypeName: "Trung học phổ thông", isActive: true },
  { id: 63, parentId: 13, code: "HCM-DH-KHTN", name: "Đoàn Trường ĐH Khoa học Tự nhiên - ĐHQG TP.HCM", shortName: "ĐH KHTN TP.HCM", orgLevel: 4, adminUnitName: "TP Hồ Chí Minh", schoolTypeName: "Đại học, Cao đẳng", isActive: true },
  { id: 64, parentId: 13, code: "HCM-DH-SP", name: "Đoàn Trường ĐH Sư phạm TP. Hồ Chí Minh", shortName: "ĐHSP TP.HCM", orgLevel: 4, adminUnitName: "TP Hồ Chí Minh", schoolTypeName: "Đại học, Cao đẳng", isActive: true },

  // Cấp 3 & 4 (Thành Đoàn Hà Nội)
  { id: 70, parentId: 17, code: "HN-HK", name: "Đoàn Quận Hoàn Kiếm", shortName: "Đoàn Q. Hoàn Kiếm", orgLevel: 3, adminUnitName: "TP Hà Nội", isActive: true },
  { id: 71, parentId: 17, code: "HN-THPT-CVA", name: "Đoàn Trường THPT Chu Văn An", shortName: "THPT Chu Văn An", orgLevel: 4, adminUnitName: "TP Hà Nội", schoolTypeName: "Trung học phổ thông", isActive: true },
  { id: 72, parentId: 17, code: "HN-THPT-AMS", name: "Đoàn Trường THPT Chuyên Hà Nội - Amsterdam", shortName: "THPT Chuyên Hà Nội-Amsterdam", orgLevel: 4, adminUnitName: "TP Hà Nội", schoolTypeName: "Trung học phổ thông", isActive: true },
  { id: 73, parentId: 17, code: "HN-DH-BKHN", name: "Đoàn Đại học Bách khoa Hà Nội", shortName: "ĐH Bách khoa HN", orgLevel: 4, adminUnitName: "TP Hà Nội", schoolTypeName: "Đại học, Cao đẳng", isActive: true },
  { id: 74, parentId: 17, code: "HN-DH-QGHN", name: "Đoàn Trường ĐH Khoa học Xã hội và Nhân văn - ĐHQGHN", shortName: "ĐH KHXH&NV HN", orgLevel: 4, adminUnitName: "TP Hà Nội", schoolTypeName: "Đại học, Cao đẳng", isActive: true },
  { id: 75, parentId: 70, code: "HN-HK-THPT-TP", name: "Đoàn Trường THPT Trần Phú - Hoàn Kiếm", shortName: "THPT Trần Phú - HK", orgLevel: 4, adminUnitName: "TP Hà Nội", schoolTypeName: "Trung học phổ thông", isActive: true },
  { id: 76, parentId: 17, code: "HN-GDNN-BD", name: "Đoàn Trung tâm GDNN - GDTX Ba Đình", shortName: "GDNN-GDTX Ba Đình", orgLevel: 4, adminUnitName: "TP Hà Nội", schoolTypeName: "Trung tâm GDNN-GDTX", isActive: true },
  { id: 65, parentId: 13, code: "HCM-THPT-GD", name: "Đoàn Trường THPT Gia Định", shortName: "THPT Gia Định", orgLevel: 4, adminUnitName: "TP Hồ Chí Minh", schoolTypeName: "Trung học phổ thông", isActive: true },
  { id: 66, parentId: 29, code: "HCM-BN-GDNN-Q1", name: "Đoàn Trung tâm GDNN - GDTX Quận 1", shortName: "GDNN-GDTX Quận 1", orgLevel: 4, adminUnitName: "TP Hồ Chí Minh", schoolTypeName: "Trung tâm GDNN-GDTX", isActive: true },
  { id: 54, parentId: 51, code: "DN-TT-THPT-PCT", name: "Đoàn Trường THPT Phan Châu Trinh", shortName: "THPT Phan Châu Trinh", orgLevel: 4, adminUnitName: "TP Đà Nẵng", schoolTypeName: "Trung học phổ thông", isActive: true },
  { id: 48, parentId: 45, code: "NA-VINH-THPT-HTK", name: "Đoàn Trường THPT Huỳnh Thúc Kháng", shortName: "THPT Huỳnh Thúc Kháng", orgLevel: 4, adminUnitName: "TP Vinh, Nghệ An", schoolTypeName: "Trung học phổ thông", isActive: true },
];

/** Đơn vị hành chính cho form phản ánh (admin_units) — chuẩn hóa Thành Đoàn, Tỉnh Đoàn */
export const adminUnits = [
  { id: 1, code: "BD", name: "Tỉnh Đoàn Bình Dương", unitType: "PROVINCE" as const, parentId: null },
  { id: 2, code: "HCM", name: "Thành Đoàn TP. Hồ Chí Minh", unitType: "PROVINCE" as const, parentId: null },
  { id: 3, code: "BG", name: "Tỉnh Đoàn Bắc Giang", unitType: "PROVINCE" as const, parentId: null },
  { id: 4, code: "NA", name: "Tỉnh Đoàn Nghệ An", unitType: "PROVINCE" as const, parentId: null },
  { id: 5, code: "DN", name: "Thành Đoàn Đà Nẵng", unitType: "PROVINCE" as const, parentId: null },
  { id: 6, code: "HN", name: "Thành Đoàn Hà Nội", unitType: "PROVINCE" as const, parentId: null },
  // Phường/xã thuộc Bình Dương
  { id: 101, code: "BD-HT", name: "Đoàn Phường Hiệp Thành, TP Thủ Dầu Một", unitType: "WARD" as const, parentId: 1 },
  { id: 102, code: "BD-PH", name: "Đoàn Phường Phú Hòa, TP Thủ Dầu Một", unitType: "WARD" as const, parentId: 1 },
  { id: 103, code: "BD-TBH", name: "Đoàn Phường Tương Bình Hiệp, TP Thủ Dầu Một", unitType: "WARD" as const, parentId: 1 },
  { id: 104, code: "BD-HA", name: "Đoàn Phường Hiệp An, TP Thủ Dầu Một", unitType: "WARD" as const, parentId: 1 },
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
  { id: 7, code: "score.manage", name: "Chấm điểm", module: "Đánh giá" },
  { id: 8, code: "score.view", name: "Xem điểm", module: "Đánh giá" },
  { id: 9, code: "report.create", name: "Lập báo cáo", module: "Báo cáo" },
  { id: 10, code: "report.manage", name: "Quản lý báo cáo", module: "Báo cáo" },
  { id: 11, code: "ranking.manage", name: "Chốt kỳ xếp hạng", module: "Xếp hạng" },
  { id: 12, code: "document.issue", name: "Ban hành văn bản", module: "Văn bản" },
  { id: 13, code: "document.view", name: "Xem văn bản", module: "Văn bản" },
  { id: 14, code: "feedback.manage", name: "Xử lý phản ánh", module: "Phản ánh" },
  { id: 15, code: "feedback.view", name: "Xem phản ánh", module: "Phản ánh" },
  { id: 16, code: "post.manage", name: "Quản lý bài viết", module: "Xuất bản" },
  { id: 17, code: "post.publish", name: "Đăng bài công khai", module: "Xuất bản" },
  { id: 18, code: "resource.manage", name: "Quản lý tài nguyên", module: "Tài nguyên" },
  { id: 19, code: "resource.view", name: "Xem tài nguyên", module: "Tài nguyên" },
  { id: 20, code: "system.orgtree.view", name: "Xem cây tổ chức", module: "Hệ thống" },
  { id: 21, code: "system.account.manage", name: "Quản lý tài khoản", module: "Hệ thống" },
  { id: 22, code: "system.settings", name: "Cấu hình hệ thống", module: "Hệ thống" },
];
