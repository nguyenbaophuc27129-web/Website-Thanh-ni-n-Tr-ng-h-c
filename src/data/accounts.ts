import type { Account } from "@/types";

/** Tài khoản khởi tạo — 01 admin TW; các tài khoản còn lại do đơn vị đăng ký / TW tạo */
export const accounts: Account[] = [
  { id: 1, orgUnitId: 1, username: "tw.admin", email: "tnth@doanthanhnienvn.vn", contactPerson: "Nguyễn Văn Toàn", contactPosition: "Phó Trưởng Ban Công tác Thanh Thiếu Nhi TW Đoàn", role: "QUAN_TRI_TW", status: "ACTIVE" },
];
