import Link from "next/link";
import { Network, ClipboardList, Megaphone, Gauge, FileCheck2, Trophy, MessageSquareText, FolderOpen } from "lucide-react";

const MODULES = [
  { icon: Network, title: "Tổ chức 4 cấp", desc: "Trung ương → Tỉnh/Thành → Phường/Xã → Trường học. Mỗi đơn vị một tài khoản, dữ liệu quản lý theo phạm vi của mình." },
  { icon: ClipboardList, title: "Hoạt động", desc: "Đơn vị cập nhật hoạt động kèm link minh chứng Facebook, website, TikTok… cấp trên xác nhận trực tuyến." },
  { icon: Gauge, title: "Nhiệm vụ & chỉ tiêu", desc: "Giao nhiệm vụ theo bộ tiêu chí, phân bổ chỉ tiêu nhiều cấp (60 = 25+20+15), theo dõi deadline D-7/D-3." },
  { icon: FileCheck2, title: "Xác nhận & chấm điểm", desc: "Ba phương thức: tự động tổng hợp, xác nhận thủ công, hội đồng chuyên gia. Điểm lưu snapshot giữ nguyên lịch sử." },
  { icon: Megaphone, title: "Xuất bản truyền thông", desc: "Biên tập viên chọn hoạt động đạt chất lượng, biên tập và đăng công khai lên trang tin tức." },
  { icon: Trophy, title: "Xếp hạng & báo cáo", desc: "Chốt kỳ xếp hạng theo tháng/quý/năm; báo cáo có bản nháp gợi ý (giả lập AI) và xuất Word/PDF/Excel." },
  { icon: MessageSquareText, title: "Văn bản & phản ánh", desc: "Ban hành văn bản theo nhóm đơn vị nhận, theo dõi đã đọc; kênh phản ánh công dân có mã tra cứu." },
  { icon: FolderOpen, title: "Kho tài nguyên", desc: "Tài liệu, biểu mẫu, sản phẩm truyền thông dùng chung, phân biệt công khai/nội bộ." },
];

export default function GioiThieuPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <section className="text-center">
        <h1 className="font-serif-display text-3xl font-black text-stone-900">
          Giới thiệu Cổng Thanh niên Trường học
        </h1>
        <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-stone-600">
          Cổng Thanh niên Trường học là hệ thống quản lý tập trung hoạt động, nhiệm vụ thi đua, truyền thông
          và khen thưởng của phong trào thanh niên trường học, phục vụ 4 cấp Đoàn: Trung ương, Tỉnh/Thành Đoàn,
          Đoàn phường/xã và Đoàn trường học. Trang này mô tả các phân hệ chính của bản demo giao diện.
        </p>
      </section>

      <section className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {MODULES.map((m) => (
          <div key={m.title} className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-doan-50 text-doan-600">
              <m.icon className="h-5 w-5" />
            </div>
            <h2 className="mt-3 text-sm font-bold text-stone-900">{m.title}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-stone-500">{m.desc}</p>
          </div>
        ))}
      </section>

      <section id="hdsd" className="mt-14 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="font-serif-display text-xl font-bold text-stone-900">Hướng dẫn trải nghiệm bản demo</h2>
        <ol className="mt-4 list-decimal space-y-2.5 pl-5 text-sm leading-relaxed text-stone-600">
          <li>
            Đăng nhập khu quản trị bằng 1 trong 5 tài khoản demo
            (<code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">tw.admin</code>,{" "}
            <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">bd.province</code>,{" "}
            <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">hc.hiepthanh</code>,{" "}
            <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">thpt.chanhphu</code>,{" "}
            <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">btv.tw</code> — mật khẩu chung{" "}
            <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">demo123</code>) để thấy sự khác biệt
            phạm vi dữ liệu theo cấp.
          </li>
          <li>Đơn vị cơ sở tạo hoạt động → nộp → đăng nhập cấp trên xác nhận → quay lại cập nhật kết quả nhiệm vụ.</li>
          <li>Bạn muốn xem luồng công khai: gửi phản ánh → nhận mã PA-2026-XXXXX → tra cứu tiến độ xử lý.</li>
          <li>Tin bài xuất bản từ khu quản trị sẽ xuất hiện ngay trên trang Tin tức của website công khai.</li>
        </ol>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/dang-nhap" className="rounded-lg bg-doan-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-doan-700">
            Đăng nhập khu quản trị
          </Link>
          <Link href="/phan-anh" className="rounded-lg border border-doan-600 px-5 py-2.5 text-sm font-semibold text-doan-700 hover:bg-doan-50">
            Gửi phản ánh thử
          </Link>
        </div>
      </section>
    </div>
  );
}
