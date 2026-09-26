"use client";

import { ActivityForm } from "@/components/dashboard/activity-form";

export default function TaoMoiHoatDongPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <h1 className="font-serif-display text-xl font-bold text-stone-900">Cập nhật hoạt động mới</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Hoạt động có thể lưu nháp hoặc nộp ngay để cấp trên xác nhận. Nộp xong cấp trên sẽ nhận thông báo.
        </p>
      </div>
      <ActivityForm />
    </div>
  );
}
