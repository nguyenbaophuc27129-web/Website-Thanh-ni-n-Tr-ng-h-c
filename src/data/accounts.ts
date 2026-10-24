import type { Account } from "@/types";

/**
 * Danh sách tài khoản hệ thống:
 * Quản trị viên Trung ương Đoàn (@tw.admin) — Nguyễn Văn Toàn.
 * Tất cả tài khoản khác được tạo thực tế qua Thêm tài khoản hoặc Import Excel.
 */
export const accounts: Account[] = [
  {
    id: 1,
    orgUnitId: 1,
    username: "tw.admin",
    email: "tnth@doanthanhnienvn.vn",
    contactPerson: "Nguyễn Văn Toàn",
    contactPosition: "Phó Trưởng Ban Công tác Thanh Thiếu Nhi",
    chucDanh: "Phó Trưởng Ban Công tác Thanh Thiếu Nhi",
    role: "QUAN_TRI_TW",
    status: "ACTIVE",
    lastLoginAt: "2026-10-24T08:30:00Z",
  },
];
