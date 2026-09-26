import Link from "next/link";
import { Star, MapPin, Phone, Mail } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-stone-900 text-stone-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-doan-600">
              <Star className="h-5 w-5 fill-vang-300 text-vang-300" />
            </div>
            <p className="font-serif-display text-sm font-bold text-white">
              Cổng Thanh niên Trường học
            </p>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-stone-400">
            Cổng thông tin điện tử quản lý hoạt động, thi đua và truyền thông
            thanh niên trường học của Đoàn TNCS Hồ Chí Minh. Bản demo giao diện,
            dữ liệu mẫu không phải dữ liệu thật.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white">Liên kết nhanh</h4>
          <ul className="mt-4 space-y-2 text-xs">
            {[
              ["/tin-tuc", "Tin tức hoạt động"],
              ["/van-ban", "Văn bản chỉ đạo"],
              ["/bang-xep-hang", "Bảng xếp hạng thi đua"],
              ["/tai-nguyen", "Kho tài nguyên"],
              ["/phan-anh", "Góp ý - Phản ánh"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="hover:text-vang-300">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white">Hệ thống</h4>
          <ul className="mt-4 space-y-2 text-xs">
            <li><Link href="/gioi-thieu" className="hover:text-vang-300">Giới thiệu cổng</Link></li>
            <li><Link href="/gioi-thieu#hdsd" className="hover:text-vang-300">Hướng dẫn sử dụng</Link></li>
            <li><Link href="/dang-nhap" className="hover:text-vang-300">Đăng nhập khu quản trị</Link></li>
            <li><Link href="/phan-anh/tra-cuu" className="hover:text-vang-300">Tra cứu phản ánh</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold text-white">Liên hệ</h4>
          <ul className="mt-4 space-y-2.5 text-xs">
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-vang-300" />
              Số 64 Bà Triệu, Hoàn Kiếm, Hà Nội
            </li>
            <li className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 shrink-0 text-vang-300" />
              024.38253271
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5 shrink-0 text-vang-300" />
              tnth@doanthanhnienvn.vn
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-800 py-4 text-center text-[11px] text-stone-500">
        © 2026 Ban Thanh niên Trường học — Trung ương Đoàn TNCS Hồ Chí Minh. Bản demo phục vụ trình duyệt chức năng.
      </div>
    </footer>
  );
}
