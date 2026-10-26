"use client";

import { useEffect, useState } from "react";

/** Số liệu công khai trả về từ GET /api/thong-ke (chỉ con số, không dữ liệu cá nhân) */
export interface PublicStats {
  posts: number;
  activities: number;
  activitiesConfirmed: number;
  participants: number;
  forumThreads: number;
  volunteerProjects: number;
  resources: number;
  hs3tAwarded: number;
  orgUnits: number;
}

export const EMPTY_PUBLIC_STATS: PublicStats = {
  posts: 0, activities: 0, activitiesConfirmed: 0, participants: 0, forumThreads: 0,
  volunteerProjects: 0, resources: 0, hs3tAwarded: 0, orgUnits: 0,
};

/* Dùng chung 1 lần gọi cho mọi component trên trang (trang chủ + StoryFlow) */
let inflight: Promise<PublicStats | null> | null = null;
let lastAt = 0;
let last: PublicStats | null = null;

function fetchStats(): Promise<PublicStats | null> {
  if (last && Date.now() - lastAt < 30_000) return Promise.resolve(last);
  inflight ??= fetch("/api/thong-ke")
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { ok?: boolean; stats?: PublicStats } | null) => {
      if (j?.ok && j.stats) {
        last = j.stats;
        lastAt = Date.now();
      }
      return last;
    })
    .catch(() => last)
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Số liệu thống kê công khai — 0 khi chưa tải xong / mất kết nối */
export function usePublicStats(): PublicStats {
  const [stats, setStats] = useState<PublicStats>(last ?? EMPTY_PUBLIC_STATS);
  useEffect(() => {
    let alive = true;
    void fetchStats().then((s) => {
      if (alive && s) setStats(s);
    });
    return () => {
      alive = false;
    };
  }, []);
  return stats;
}
