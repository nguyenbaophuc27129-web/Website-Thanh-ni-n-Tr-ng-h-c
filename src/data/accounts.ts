import type { Account } from "@/types";

/**
 * Danh sách tài khoản hệ thống:
 * Chỉ duy nhất tài khoản Quản trị Trung ương (@tw.admin) theo yêu cầu.
 * Tất cả tài khoản khác được tạo thực tế qua Thêm tài khoản hoặc Import Excel.
 */
export const accounts: Account[] = [
  {
    id: 1,
    orgUnitId: 1,
    username: "tw.admin",
    email: "tnth@doanthanhnienvn.vn",
    contactPerson: "Quản trị viên Trung ương",
    contactPosition: "Ban Bí thư Trung ương Đoàn",
    chucDanh: "Quản trị viên Trung ương Đoàn",
    role: "QUAN_TRI_TW",
    status: "ACTIVE",
    lastLoginAt: "2026-10-24T08:30:00Z",
  },
];
