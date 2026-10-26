"use client";

import { useEffect, useState } from "react";

/** Lượt xem tin bài theo ngày (GET /api/thong-ke/luot-xem) cho biểu đồ quản trị; chưa có dữ liệu thì mảng rỗng */
export function usePostViewDaily(days = 30): { name: string; value: number }[] {
  const [data, setData] = useState<{ name: string; value: number }[]>([]);
  useEffect(() => {
    let alive = true;
    fetch(`/api/thong-ke/luot-xem?days=${days}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { ok?: boolean; days?: { date: string; views: number }[] } | null) => {
        if (alive && j?.ok && Array.isArray(j.days)) setData(j.days.map((d) => ({ name: d.date, value: d.views })));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [days]);
  return data;
}
