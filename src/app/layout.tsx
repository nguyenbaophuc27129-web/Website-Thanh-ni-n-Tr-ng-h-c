import type { Metadata } from "next";
import { Noto_Serif, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/lib/toast-context";
import { StoreProvider } from "@/lib/store-context";

const notoSerif = Noto_Serif({
  variable: "--font-noto-serif",
  subsets: ["vietnamese", "latin"],
  // Phông biến thiên: 1 tệp / bộ ký tự cho mọi độ đậm (thay vì 1 tệp / độ đậm)
});

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["vietnamese", "latin"],
  // Chỉ các độ đậm đang dùng nhiều (font-light/extrabold hiển thị bằng 400/700) — mỗi độ đậm là thêm tệp phải tải
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Cổng Thanh niên Trường học — Trung ương Đoàn",
    template: "%s | Thanh niên Trường học",
  },
  description:
    "Cổng thông tin quản lý hoạt động thanh niên trường học — hệ thống thi đua, nhiệm vụ, truyền thông của Đoàn TNCS Hồ Chí Minh.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${notoSerif.variable} ${beVietnam.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <AuthProvider>
            <StoreProvider>{children}</StoreProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
