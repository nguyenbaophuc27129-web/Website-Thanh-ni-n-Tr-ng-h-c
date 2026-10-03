"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ClipboardList, Activity, Megaphone, Users, CheckSquare,
  FileBarChart, FileText, FolderOpen, ArrowRight, Rocket, QrCode, Flag,
  UserPlus, PenLine, Heart, ShieldCheck,
} from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, type Role } from "@/lib/auth-context";

interface Step {
  icon: typeof Activity;
  title: string;
  desc: string;
  href?: string;
}

const ROLE_STEPS: Record<Role, Step[]> = {
  QUAN_TRI_TW: [
    { icon: ClipboardList, title: "Giao nhiệm vụ & chỉ tiêu", desc: "Chọn nhiệm vụ trong bộ tiêu chí, giao cho tỉnh/đơn vị con kèm chỉ tiêu cụ thể và hạn hoàn thành.", href: "/quan-tri/nhiem-vu" },
    { icon: FileText, title: "Phát hành văn bản", desc: "Ban hành văn bản chỉ đạo, kế hoạch tới toàn hệ thống hoặc phạm vi chọn lọc; đơn vị nhận được thông báo.", href: "/quan-tri/van-ban" },
    { icon: Megaphone, title: "Xuất bản tin bài", desc: "Tạo tin từ hoạt động đã xác nhận hoặc viết mới, xuất bản lên trang công khai.", href: "/quan-tri/xuat-ban" },
    { icon: Activity, title: "Duyệt đóng góp cộng đồng", desc: "Duyệt bài viết và tài nguyên đoàn viên gửi về — duyệt xong tự cộng điểm và đăng công khai.", href: "/quan-tri/dong-gop" },
  ],
  QUAN_TRI_TINH: [
    { icon: Users, title: "Tạo tài khoản đơn vị con", desc: "Khởi tạo tài khoản cho Đoàn phường/xã và trường học trực thuộc tỉnh.", href: "/quan-tri/he-thong/tai-khoan" },
    { icon: ClipboardList, title: "Giao nhiệm vụ xuống cấp dưới", desc: "Phân bổ chỉ tiêu thi đua cho các Đoàn cấp 3 trong tỉnh, theo dõi tiến độ.", href: "/quan-tri/nhiem-vu" },
    { icon: CheckSquare, title: "Xác nhận hoạt động & báo cáo", desc: "Duyệt hoạt động, xác nhận báo cáo kết quả của cấp dưới; hoạt động chờ quá 3 ngày sẽ thành đèn đỏ ở bảng Trực tiếp.", href: "/quan-tri/nhiem-vu/xac-nhan" },
    { icon: Flag, title: "Theo dõi chương trình trọng tâm", desc: "Xem tiến triển các chương trình trọng tâm (HS3T, dự án tình nguyện, thi kiến thức) của đơn vị bạn.", href: "/quan-tri/chuong-trinh" },
  ],
  QUAN_TRI_CAP3: [
    { icon: Users, title: "Quản lý cây đơn vị & tài khoản", desc: "Theo dõi các trường học trực thuộc, tạo tài khoản cho đơn vị mới.", href: "/quan-tri/he-thong/don-vi" },
    { icon: ClipboardList, title: "Phân bổ nhiệm vụ cho trường", desc: "Chia chỉ tiêu từ nhiệm vụ cấp trên xuống từng trường, đặt hạn riêng phù hợp.", href: "/quan-tri/nhiem-vu" },
    { icon: Activity, title: "Xác nhận hoạt động các trường", desc: "Xem hoạt động trường cập nhật, yêu cầu bổ sung hoặc xác nhận.", href: "/quan-tri/hoat-dong" },
    { icon: FileBarChart, title: "Xem báo cáo & xếp hạng", desc: "Tổng hợp tình hình các trường, lập báo cáo gửi cấp trên.", href: "/quan-tri/bao-cao" },
  ],
  DON_VI: [
    { icon: Activity, title: "Tạo hoạt động", desc: "Cập nhật hoạt động phong trào kèm link minh chứng, gửi cấp trên xác nhận.", href: "/quan-tri/hoat-dong" },
    { icon: QrCode, title: "Điểm danh QR", desc: "Bật điểm danh QR trong trang hoạt động — đoàn viên quét mã, không cần cài ứng dụng.", href: "/quan-tri/hoat-dong" },
    { icon: ClipboardList, title: "Cập nhật kết quả nhiệm vụ", desc: "Nhập số liệu đạt được theo từng chỉ tiêu, kèm ghi chú và minh chứng.", href: "/quan-tri/nhiem-vu" },
    { icon: FileBarChart, title: "Lập báo cáo định kỳ", desc: "Tạo báo cáo tháng/quý từ dữ liệu hoạt động và nhiệm vụ đã có.", href: "/quan-tri/bao-cao" },
  ],
  BIEN_TAP_VIEN: [
    { icon: Megaphone, title: "Xuất bản tin bài", desc: "Biên tập tin từ hoạt động của đơn vị, chọn chuyên mục, hẹn giờ hoặc xuất bản ngay.", href: "/quan-tri/xuat-ban" },
    { icon: FolderOpen, title: "Quản lý tài nguyên", desc: "Đăng tài liệu, biểu mẫu, sản phẩm truyền thông dùng chung cho toàn hệ thống.", href: "/quan-tri/tai-nguyen" },
  ],
  DOAN_VIEN: [
    { icon: UserPlus, title: "Đăng ký tài khoản Đoàn viên", desc: "Điền họ tên, lớp, chức vụ và chọn đơn vị (Đoàn tỉnh/thành phố, Đoàn xã/phường/đặc khu hoặc Đoàn trường) — tài khoản dùng để tham gia diễn đàn.", href: "/dang-ky" },
    { icon: PenLine, title: "Đăng bài ẩn danh", desc: "Chia sẻ câu chuyện, góp ý thẳng thắn. Hệ thống tự sinh bí danh ngẫu nhiên, không ai biết bạn là ai.", href: "/dien-dan" },
    { icon: Heart, title: "Bình luận & thả cảm xúc", desc: "Thảo luận trong các bài viết, thả trái tim cho nội dung bạn thích — mỗi tài khoản thả được một lần.", href: "/dien-dan" },
    { icon: ShieldCheck, title: "AI kiểm duyệt tự động", desc: "Nội dung thô tục, spam, lừa đảo hoặc kèm thông tin cá nhân sẽ bị gắn cờ và chờ Ban biên tập duyệt trước khi hiện công khai.", href: "/dien-dan" },
  ],
};

export default function HuongDanPage() {
  const [role, setRole] = useState<Role>("QUAN_TRI_TW");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="text-center">
        <h1 className="font-serif-display text-2xl font-bold text-stone-900">Hướng dẫn sử dụng Cổng TNTH</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-stone-500">
          Chọn đúng vai trò của bạn để xem các bước làm việc cơ bản trên hệ thống. Mỗi bước gắn trực tiếp với
          phân hệ tương ứng trong khu quản trị.
        </p>
      </div>

      <div className="mt-8 flex justify-center">
        <Tabs
          value={role}
          onChange={setRole}
          tabs={(Object.keys(ROLE_LABELS) as Role[]).map((r) => ({ value: r, label: ROLE_LABELS[r] }))}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {ROLE_STEPS[role].map((step, i) => (
          <Card key={step.title}>
            <CardHeader
              title={
                <span className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-doan-50 text-doan-600">
                    <step.icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-stone-400">Bước {i + 1}</span>
                    {step.title}
                  </span>
                </span>
              }
            />
            <CardBody>
              <p className="text-sm leading-relaxed text-stone-600">{step.desc}</p>
              {step.href ? (
                <Link href={step.href} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-doan-600 hover:underline">
                  Mở phân hệ <ArrowRight className="h-3 w-3" />
                </Link>
              ) : null}
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="mt-8 border-doan-100">
        <CardBody className="flex flex-wrap items-center gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-doan-600 text-vang-300">
            <Rocket className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-stone-900">Sẵn sàng trải nghiệm?</p>
            <p className="text-xs text-stone-500">
              Đăng nhập bằng tài khoản demo (mật khẩu <code className="rounded bg-stone-100 px-1">demo123</code>):
              tw.admin · bd.province · hc.hiepthanh · thpt.chanhphu · btv.tw
            </p>
          </div>
          <Link href="/dang-nhap">
            <Button>
              Đăng nhập <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardBody>
      </Card>

      <div className="mt-6 rounded-xl bg-stone-50 px-4 py-3 text-[11px] leading-relaxed text-stone-500">
        <p className="font-semibold text-stone-600">Mẹo nhanh</p>
        <p className="mt-1">
          · Mọi hành động trong bản demo chỉ lưu trên trình duyệt của bạn (tải lại trang sẽ về dữ liệu mẫu).<br />
          · Sự cố kỹ thuật app Thanh niên Việt Nam / web Quản lý Đoàn gửi qua form{" "}
          <Link href="/phan-anh" className="text-doan-600 hover:underline">Phản ánh</Link>, chọn lĩnh vực tương ứng.
        </p>
      </div>
    </div>
  );
}
