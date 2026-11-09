"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Flame, Vote } from "lucide-react";
import { countdownParts, fetchStories } from "@/lib/binh-chon";
import { formatNumber } from "@/lib/utils";

const MEDAL_TONES = ["bg-amber-400 text-white", "bg-stone-300 text-stone-700", "bg-orange-300 text-orange-900"];

/**
 * Band nhẹ cạnh Hs3tBanner ở trang chủ — countdown chiến dịch + tổng phiếu + top-3 + CTA.
 * Tự ẩn khi API lỗi (degrade mềm, không phá layout trang chủ).
 */
export function BinhChonBand() {
  const [data, setData] = useState<{
    campaignTitle?: string;
    endsAt?: string;
    totalVotes: number;
    approvedStories: number;
    top: { id: number; studentName: string; photoThumbDataUrl: string; voteCount: number }[];
  } | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    fetchStories({ page: 1, sort: "hot" })
      .then((res) => {
        if (!alive || !res?.ok || !res?.stats) return;
        setData({
          campaignTitle: res.campaign?.title,
          endsAt: res.campaign?.endsAt,
          totalVotes: res.stats.totalVotes,
          approvedStories: res.stats.approvedStories,
          top: (res.stories ?? []).slice(0, 3).map((s) => ({
            id: s.id,
            studentName: s.studentName,
            photoThumbDataUrl: s.photoThumbDataUrl,
            voteCount: s.voteCount,
          })),
        });
      })
      .catch(() => undefined);
    const t = setInterval(() => setTick((v) => v + 1), 30_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (!data) return null;
  const cd = countdownParts(data.endsAt);

  return (
    <div className="overflow-hidden rounded-xl border border-orange-200 bg-gradient-to-br from-[#FFF6E9] via-white to-orange-50 shadow-sm">
      <div className="flex items-center gap-3 border-b border-orange-100 bg-gradient-to-r from-[#F26522] to-[#C4161C] px-4 py-3 text-white">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
          <Vote className="h-4.5 w-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight">Bình chọn HS3T tiêu biểu</p>
          <p className="text-[10px] font-medium uppercase tracking-wider text-white/75">Cổng Thanh niên Trường học phát động</p>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {/* Countdown */}
        <div className="flex items-center gap-2">
          {cd.ended ? (
            <span className="text-xs font-semibold text-orange-700">Chiến dịch đã kết thúc — xem kết quả</span>
          ) : (
            <>
              {[
                { v: cd.days, l: "ngày" },
                { v: cd.hours, l: "giờ" },
                { v: cd.minutes, l: "phút" },
              ].map((p) => (
                <span key={p.l} className="flex flex-col items-center rounded-lg bg-white px-2.5 py-1.5 shadow-sm ring-1 ring-orange-100">
                  <span className="text-sm font-black tabular-nums text-[#C4161C]">{String(p.v).padStart(2, "0")}</span>
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-stone-400">{p.l}</span>
                </span>
              ))}
              <span className="ml-1 text-[11px] font-medium text-stone-500">còn lại để bình chọn</span>
            </>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-stone-600">
          <span className="inline-flex items-center gap-1 font-semibold text-orange-700">
            <Flame className="h-3.5 w-3.5" /> {formatNumber(data.totalVotes)} phiếu
          </span>
          <span className="text-stone-300">·</span>
          <span>{formatNumber(data.approvedStories)} câu chuyện</span>
        </div>

        {/* Top-3 */}
        {data.top.length > 0 ? (
          <ul className="space-y-1.5">
            {data.top.map((s, i) => (
              <li key={s.id} className="flex items-center gap-2.5 rounded-lg bg-white/70 px-2 py-1.5 ring-1 ring-orange-100/60">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${MEDAL_TONES[i]}`}>
                  {i + 1}
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.photoThumbDataUrl} alt="" className="h-8 w-6 shrink-0 rounded object-cover" />
                <span className="min-w-0 flex-1 truncate text-xs font-semibold text-stone-800">{s.studentName}</span>
                <span className="shrink-0 text-[11px] font-bold text-orange-600">{formatNumber(s.voteCount)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg bg-white/70 px-3 py-2 text-[11px] text-stone-500 ring-1 ring-orange-100/60">
            Cuộc thi đang mở — hãy là người đầu tiên đăng câu chuyện của mình!
          </p>
        )}

        <Link
          href="/binh-chon-hs3t"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#FFC93C] to-[#E04A1F] py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-110"
        >
          Tham gia bình chọn <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
