"use client";

import { Handshake } from "lucide-react";
import { useStore } from "@/lib/store-context";

const TIER_STYLE: Record<"GOLD" | "SILVER" | "BRONZE", { ring: string; chip: string; label: string }> = {
  GOLD: { ring: "ring-amber-400/70 bg-gradient-to-br from-amber-50/90 to-white", chip: "bg-amber-100 text-amber-700", label: "Tài trợ Vàng" },
  SILVER: { ring: "ring-slate-300 bg-gradient-to-br from-slate-50/90 to-white", chip: "bg-slate-100 text-slate-600", label: "Tài trợ Bạc" },
  BRONZE: { ring: "ring-orange-300/70 bg-gradient-to-br from-orange-50/90 to-white", chip: "bg-orange-100 text-orange-700", label: "Tài trợ Đồng" },
};

/** Dải nhà tài trợ đồng hành — chỉ hiện khi có sponsor đang hoạt động */
export function SponsorStrip() {
  const { sponsors } = useStore();
  const active = sponsors.filter((s) => s.isActive);
  if (active.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-14">
      <div className="flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
        <Handshake className="h-3.5 w-3.5" />
        Nhà tài trợ đồng hành
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {active.map((s) => {
          const style = TIER_STYLE[s.tier];
          const card = (
            <div
              className={`group flex h-full flex-col rounded-2xl bg-white p-4 ring-1 ${style.ring} shadow-[0_8px_30px_rgb(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgb(15,23,42,0.08)]`}
            >
              <span className={`self-start rounded-full px-2 py-0.5 text-[10px] font-bold ${style.chip}`}>
                {style.label}
              </span>
              <p className="mt-2.5 line-clamp-2 text-[13px] font-semibold leading-snug text-stone-800">
                {s.name}
              </p>
              {s.note ? (
                <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-stone-500">{s.note}</p>
              ) : null}
              <span className="mt-auto pt-2.5 text-[10px] text-stone-400">
                {s.sinceYear ? `Đồng hành từ ${s.sinceYear}` : "Đồng hành cùng tuổi trẻ"}
              </span>
            </div>
          );
          return s.websiteUrl ? (
            <a key={s.id} href={s.websiteUrl} target="_blank" rel="noreferrer" className="h-full">
              {card}
            </a>
          ) : (
            <div key={s.id} className="h-full">{card}</div>
          );
        })}
      </div>
    </section>
  );
}
