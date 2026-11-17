"use client";

import { useEffect, useState } from "react";
import type { DonViBanHanh } from "@/data/the-thuc-van-ban";

/**
 * Hồ sơ thể thức 29-HD của đơn vị đang đăng nhập (tên cơ quan 1-2 dòng, ký hiệu, địa danh, đề ký, nơi nhận).
 * Dùng khi xuất Word bản nháp AI. Lỗi/không có quyền → null (lớp xuất Word dùng mặc định cũ).
 */
export function useHoSoTheThuc(orgUnitId: number | null | undefined): DonViBanHanh | null {
  const [hoSo, setHoSo] = useState<{ id: number; donVi: DonViBanHanh } | null>(null);
  useEffect(() => {
    if (!orgUnitId) return;
    let huy = false;
    fetch("/api/org-units/ho-so-the-thuc")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { ok?: boolean; donVi?: DonViBanHanh } | null) => {
        if (!huy && d?.ok && d.donVi) setHoSo({ id: orgUnitId, donVi: d.donVi });
      })
      .catch(() => undefined);
    return () => {
      huy = true;
    };
  }, [orgUnitId]);
  return hoSo && hoSo.id === orgUnitId ? hoSo.donVi : null;
}
