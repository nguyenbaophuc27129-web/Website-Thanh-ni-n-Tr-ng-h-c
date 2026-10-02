import type { LucideIcon } from "lucide-react";
import { GraduationCap, HeartHandshake, MonitorPlay } from "lucide-react";

/* 🔗 CỔNG DỊCH VỤ LIÊN THÔNG — website dịch vụ tách biệt chạy project "tnth-services" (port 3001).
   Khi lên production, chỉ cần đổi 2 hằng số này sang tên miền thật. */
export const CERT_PORTAL_URL = "http://localhost:3001/tra-cuu-chung-nhan";
export const HS3T_PORTAL_URL = "http://localhost:3001/hoc-sinh-3-tot";

export interface ProgramInfo {
  key: "HS3T" | "DU_AN_TN" | "THI_KT";
  title: string;
  desc: string;
  phase: 1 | 2 | 3;
  phaseLabel: string;
  href: string;
  /** true = mở tab mới sang website dịch vụ riêng; false = route nội bộ (trang giới thiệu giai đoạn) */
  external: boolean;
  icon: LucideIcon;
  grad: string;
}

/** Ba chương trình trọng tâm — hiển thị trên trang chủ và khu quản trị mọi cấp */
export const PROGRAMS: ProgramInfo[] = [
  {
    key: "HS3T",
    title: "Học sinh 3 Tốt",
    desc: "Cổng chương trình riêng — đăng ký hồ sơ, chấm điểm rèn luyện và cấp chứng nhận số có mã QR.",
    phase: 1,
    phaseLabel: "Đang hoạt động",
    href: HS3T_PORTAL_URL,
    external: true,
    icon: GraduationCap,
    grad: "from-emerald-500 to-teal-600",
  },
  {
    key: "DU_AN_TN",
    title: "Mỗi trường THPT — 01 dự án tình nguyện",
    desc: "Mỗi trường xây dựng tối thiểu 1 dự án tình nguyện vì cộng đồng, có đo lường kết quả và đánh giá.",
    phase: 2,
    phaseLabel: "Giai đoạn 02",
    href: "/du-an-tinh-nguyen",
    external: false,
    icon: HeartHandshake,
    grad: "from-blue-600 to-indigo-600",
  },
  {
    key: "THI_KT",
    title: "Thi kiến thức trực tuyến",
    desc: "Hệ thống thi trực tuyến về Đoàn, an toàn giao thông, kỹ năng số dành cho học sinh, sinh viên.",
    phase: 3,
    phaseLabel: "Giai đoạn 03",
    href: "/thi-kien-thuc",
    external: false,
    icon: MonitorPlay,
    grad: "from-amber-500 to-orange-600",
  },
];
