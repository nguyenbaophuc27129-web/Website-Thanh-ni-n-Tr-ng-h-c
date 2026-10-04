import type { Account } from "@/types";

/** Tài khoản 1 đơn vị = 1 tài khoản (mock dùng cho trang quản lý tài khoản) */
export const accounts: Account[] = [
  { id: 1, orgUnitId: 1, username: "tw.admin", email: "tnth@doanthanhnienvn.vn", contactPerson: "Nguyễn Văn Toàn", contactPosition: "Phó Ban TNTH", role: "QUAN_TRI_TW", status: "ACTIVE", lastLoginAt: "2026-09-22T08:30:00Z" },
  { id: 2, orgUnitId: 2, username: "btv.tw", email: "bientap@tnth.vn", contactPerson: "Võ Ngọc Lan", contactPosition: "Phóng viên biên tập", role: "BIEN_TAP_VIEN", status: "ACTIVE", lastLoginAt: "2026-09-22T07:45:00Z" },
  { id: 3, orgUnitId: 12, username: "bd.province", email: "bandoan@binhduong.doan.vn", contactPerson: "Trần Thị Mai", contactPosition: "Phó Bí thư Tỉnh Đoàn", role: "QUAN_TRI_TINH", status: "ACTIVE", lastLoginAt: "2026-09-21T16:20:00Z" },
  { id: 4, orgUnitId: 25, username: "hc.hiepthanh", email: "hiepthanh@bd.doan.vn", contactPerson: "Lê Quốc Hùng", contactPosition: "Bí thư Đoàn Phường", role: "QUAN_TRI_CAP3", status: "ACTIVE", lastLoginAt: "2026-09-22T09:10:00Z" },
  { id: 5, orgUnitId: 31, username: "thpt.chanhphu", email: "thptchanhphuhung@bd.edu.vn", contactPerson: "Phạm Minh Tuấn", contactPosition: "Bí thư Đoàn Trường", role: "DON_VI", status: "ACTIVE", lastLoginAt: "2026-09-22T10:05:00Z" },
  { id: 6, orgUnitId: 13, username: "hcm.city", email: "thanhdoan@hcm.doan.vn", contactPerson: "Hoàng Anh Dũng", contactPosition: "Chuyên viên Thành Đoàn", role: "QUAN_TRI_TINH", status: "ACTIVE" },
  { id: 7, orgUnitId: 26, username: "hc.phuhoa", email: "phuhoa@bd.doan.vn", contactPerson: "Đặng Thị Thủy", contactPosition: "Bí thư Đoàn Phường", role: "QUAN_TRI_CAP3", status: "ACTIVE" },
  { id: 8, orgUnitId: 27, username: "hc.tuongbinhhiep", email: "tbh@bd.doan.vn", contactPerson: "Nguyễn Đắc Lợi", contactPosition: "Bí thư Đoàn Phường", role: "QUAN_TRI_CAP3", status: "ACTIVE" },
  { id: 9, orgUnitId: 28, username: "hc.hiepan", email: "hiepan@bd.doan.vn", contactPerson: "Trương Mỹ Duyên", contactPosition: "Bí thư Đoàn Phường", role: "QUAN_TRI_CAP3", status: "PENDING" },
  { id: 10, orgUnitId: 32, username: "thcs.hiepthanh", email: "thcsht@bd.edu.vn", contactPerson: "Lý Thanh Bình", contactPosition: "Tổng phụ trách Đội", role: "DON_VI", status: "ACTIVE" },
  { id: 11, orgUnitId: 34, username: "thpt.ngothoinham", email: "ntn@bd.edu.vn", contactPerson: "Đỗ Việt Khoa", contactPosition: "Bí thư Đoàn Trường", role: "DON_VI", status: "LOCKED" },
  { id: 12, orgUnitId: 40, username: "hc.leloi", email: "leloi@bg.doan.vn", contactPerson: "Vũ Hải Yến", contactPosition: "Bí thư Đoàn Phường", role: "QUAN_TRI_CAP3", status: "ACTIVE" },
  { id: 13, orgUnitId: 42, username: "thpt.bacgiang", email: "thptbg@bg.edu.vn", contactPerson: "Hoàng Tuấn Kiệt", contactPosition: "Bí thư Đoàn Trường", role: "DON_VI", status: "DISABLED" },
  { id: 14, orgUnitId: 14, username: "bg.province", email: "bandoan@bacgiang.doan.vn", contactPerson: "Lý Hồng Nhung", contactPosition: "Phó Bí thư Tỉnh Đoàn", role: "QUAN_TRI_TINH", status: "ACTIVE" },
  { id: 15, orgUnitId: 29, username: "hc.benghe", email: "benghe@hcm.doan.vn", contactPerson: "Ngô Thanh Trúc", contactPosition: "Bí thư Đoàn Phường", role: "QUAN_TRI_CAP3", status: "ACTIVE" },
  /* Chức danh TW quyền giới hạn — quyền tự theo bảng phân quyền chức danh (lib/permissions.ts) */
  { id: 16, orgUnitId: 1, username: "cv.hs3t", email: "hs3t@tnth.vn", contactPerson: "Trần Thị Thu Hà", contactPosition: "Chuyên viên phụ trách xét hồ sơ Học sinh 3 tốt", role: "QUAN_TRI_TW", status: "ACTIVE" },
  { id: 17, orgUnitId: 1, username: "cv.kiemtra", email: "kiemtra@tnth.vn", contactPerson: "Lê Minh Đức", contactPosition: "Chuyên viên phụ trách công tác kiểm tra", role: "QUAN_TRI_TW", status: "ACTIVE" },
  { id: 18, orgUnitId: 1, username: "ctv.tintuc", email: "tintuc@tnth.vn", contactPerson: "Nguyễn Hải Yến", contactPosition: "CTV phụ trách chuyên mục Tin tức", role: "QUAN_TRI_TW", status: "ACTIVE" },
  { id: 19, orgUnitId: 1, username: "ctv.duan", email: "duan@tnth.vn", contactPerson: "Phạm Đức Anh", contactPosition: 'CTV phụ trách chuyên mục "Mỗi trường THPT 01 dự án tình nguyện vì cộng đồng"', role: "QUAN_TRI_TW", status: "ACTIVE" },
];
