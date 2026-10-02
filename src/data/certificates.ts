import type { Certificate } from "@/types";

/** Seed chứng nhận số — id < 900000, có 1 bản ghi REVOKED để demo tra cứu */
export const certificates: Certificate[] = [
  {
    id: 301, code: "CRT-2026-00301",
    recipientName: "Chi đoàn 12A1 — THPT Chánh Phú Hưng",
    recipientOrgText: "Đoàn Trường THPT Chánh Phú Hưng",
    activityId: 101,
    title: "Chứng nhận hoàn thành xuất sắc Lễ ra quân Tháng Thanh niên tình nguyện 2026",
    certType: "HOAT_DONG", issuedByOrgUnitId: 25,
    issuedAt: "2026-08-20T02:00:00Z", status: "ACTIVE",
  },
  {
    id: 302, code: "CRT-2026-00302",
    recipientName: "Đội tuyển Hành trình đỏ Trường THPT Chánh Phú Hưng",
    recipientOrgText: "Đoàn Trường THPT Chánh Phú Hưng",
    activityId: 102,
    title: "Chứng nhận tham gia Vòng cấp tỉnh Hành trình đỏ — Về nguồn quốc gia 2026",
    certType: "HOAT_DONG", issuedByOrgUnitId: 25,
    issuedAt: "2026-08-06T02:00:00Z", status: "ACTIVE",
  },
  {
    id: 303, code: "CRT-2026-00303",
    recipientName: "Nguyễn Thị Khánh Linh",
    recipientOrgText: "Đoàn Trường THCS Hiệp Thành",
    title: "Danh hiệu Đoàn viên xuất sắc tháng 8/2026",
    certType: "DANH_HIEU", issuedByOrgUnitId: 12,
    issuedAt: "2026-08-31T02:00:00Z", status: "REVOKED",
  },
  {
    id: 304, code: "CRT-2026-00304",
    recipientName: "Ban tổ chức Giải bóng đá Thanh niên Tương Bình Hiệp 2026",
    recipientOrgText: "Đoàn Phường Tương Bình Hiệp",
    activityId: 112,
    title: "Chứng nhận tổ chức Giải bóng đá Thanh niên Tương Bình Hiệp 2026",
    certType: "HOAT_DONG", issuedByOrgUnitId: 27,
    issuedAt: "2026-09-27T01:30:00Z", status: "ACTIVE",
  },
  {
    id: 305, code: "CRT-2026-00305",
    recipientName: "Trần Quốc Bảo",
    recipientOrgText: "Đoàn Trường ĐH Sư phạm Nghệ An",
    activityId: 115,
    title: "Chứng nhận đề tài nghiên cứu khoa học cấp trường đạt giải Nhì",
    certType: "KHOA_HOC", issuedByOrgUnitId: 45,
    issuedAt: "2026-09-18T02:00:00Z", status: "ACTIVE",
  },
];
