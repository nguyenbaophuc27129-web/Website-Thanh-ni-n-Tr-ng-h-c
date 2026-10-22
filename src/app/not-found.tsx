import Link from "next/link";
import { ArrowLeft, Home, Newspaper, Info, MessageSquare, HelpCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mx-auto max-w-md w-full">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-2 shadow-lg ring-1 ring-slate-900/5">
            <img src="/logo.png" alt="Logo" className="h-full w-full object-contain" />
          </div>
        </div>

        {/* Badge 404 */}
        <span className="inline-flex items-center rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-700/10">
          Lỗi 404 — Không tìm thấy trang
        </span>

        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Trang bạn tìm kiếm không tồn tại
        </h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-500">
          Đường dẫn có thể đã bị thay đổi, chuyển dời hoặc bạn đã nhập sai địa chỉ. Hãy kiểm tra lại hoặc quay lại trang chủ của Cổng Thanh niên Trường học.
        </p>

        {/* Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 hover:brightness-110"
          >
            <Home className="h-4 w-4" /> Về Trang chủ
          </Link>
          <Link
            href="/tin-tuc"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Newspaper className="h-4 w-4" /> Xem Tin tức
          </Link>
        </div>

        {/* Gợi ý liên kết nhanh */}
        <div className="mt-10 rounded-2xl bg-white p-5 text-left shadow-sm ring-1 ring-slate-200">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Các chuyên mục chính
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-medium text-slate-700">
            <Link href="/gioi-thieu" className="flex items-center gap-2 rounded-lg p-2 hover:bg-blue-50 hover:text-blue-600">
              <Info className="h-4 w-4 text-slate-400" /> Giới thiệu cổng
            </Link>
            <Link href="/dien-dan" className="flex items-center gap-2 rounded-lg p-2 hover:bg-blue-50 hover:text-blue-600">
              <MessageSquare className="h-4 w-4 text-slate-400" /> Diễn đàn Đoàn viên
            </Link>
            <Link href="/phan-anh" className="flex items-center gap-2 rounded-lg p-2 hover:bg-blue-50 hover:text-blue-600">
              <HelpCircle className="h-4 w-4 text-slate-400" /> Gửi phản ánh
            </Link>
            <Link href="/an-toan-hoc-duong" className="flex items-center gap-2 rounded-lg p-2 hover:bg-blue-50 hover:text-blue-600">
              <ArrowLeft className="h-4 w-4 text-slate-400" /> An toàn học đường
            </Link>
          </div>
        </div>

        <p className="mt-6 text-[11px] text-slate-400">
          Cổng thông tin số Thanh niên Trường học — Trung ương Đoàn TNCS Hồ Chí Minh
        </p>
      </div>
    </div>
  );
}
