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
    desc: "Hồ sơ thành tích số — học sinh tự cập nhật minh chứng học tập, rèn luyện, phong trào; cấp Đoàn xét danh hiệu theo 3 mức.",
    phase: 1,
    phaseLabel: "Đang hoạt động",
    href: "/hoc-sinh-3-tot",
    external: false,
    icon: GraduationCap,
    grad: "from-emerald-500 to-teal-600",
  },
  {
    key: "DU_AN_TN",
    title: "Mỗi trường THPT — 01 dự án tình nguyện",
    desc: "Tiếp nhận và ghim dự án lên bản đồ 34 tỉnh — mỗi trường tối thiểu 1 dự án vì cộng đồng, đo lường kết quả.",
    phase: 2,
    phaseLabel: "Đang hoạt động",
    href: "/du-an-tinh-nguyen",
    external: false,
    icon: HeartHandshake,
    grad: "from-blue-600 to-indigo-600",
  },
  {
    key: "THI_KT",
    title: "Thi kiến thức trực tuyến",
    desc: "Sinh đề từ ngân hàng câu hỏi, đề thích ứng theo năng lực — khách thi được ngay, đoàn viên lưu kết quả.",
    phase: 3,
    phaseLabel: "Đang hoạt động",
    href: "/thi-kien-thuc",
    external: false,
    icon: MonitorPlay,
    grad: "from-amber-500 to-orange-600",
  },
];
