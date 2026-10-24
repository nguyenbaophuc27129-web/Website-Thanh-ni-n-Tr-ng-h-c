"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Mục Tài khoản đã được tích hợp vào trang "Phân quyền & Tài khoản":
 * /quan-tri/he-thong/phan-quyen theo yêu cầu người dùng.
 * Tự động chuyển hướng mượt sang trang tích hợp.
 */
export default function TaiKhoanRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/quan-tri/he-thong/phan-quyen");
  }, [router]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <Loader2 className="h-6 w-6 animate-spin text-doan-600" />
      <p className="text-sm font-medium text-stone-600">
        Đang chuyển hướng tới trang Quản lý Tài khoản & Phân quyền...
      </p>
    </div>
  );
}
