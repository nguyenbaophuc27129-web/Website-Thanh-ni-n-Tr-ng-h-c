import type { Metadata } from "next";
import { Noto_Serif, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ToastProvider } from "@/lib/toast-context";
import { StoreProvider } from "@/lib/store-context";

const notoSerif = Noto_Serif({
  variable: "--font-noto-serif",
  subsets: ["vietnamese", "latin"],
  weight: ["400", "600", "700", "900"],
});

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["vietnamese", "latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
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
