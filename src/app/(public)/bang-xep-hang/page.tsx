"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Trophy,
  Crown,
  TrendingUp,
  TrendingDown,
  Minus,
  CalendarRange,
  Users,
  Target,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { Select } from "@/components/ui/input";
import { formatPercent, formatDate, cn } from "@/lib/utils";
import type { RankingEntry } from "@/types";
import { EmptyState } from "@/components/public/empty-state";

/* Staggered fade-up — đồng bộ ngôn ngữ chuyển động của cổng */
const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

/* Hào quang & chất liệu bục vinh danh Top 3 — huy hiệu 3D phát sáng */
const PODIUM: Record<
  number,
  {
    grad: string;
    halo: string;
    glow: string;
    icon: string;
    base: string;
    baseH: string;
    medal: string;
    label: string;
  }
> = {
  1: {
    grad: "from-amber-200 via-amber-400 to-amber-600",
    halo: "bg-amber-400/40",
    glow: "shadow-[0_16px_40px_rgba(245,158,11,0.45),inset_0_2px_10px_rgba(255,255,255,0.7)]",
    icon: "text-amber-500",
    base: "from-slate-900 to-slate-800",
    baseH: "h-16 sm:h-32",
    medal: "h-28 w-28",
    label: "Quán quân",
  },
  2: {
    grad: "from-slate-100 via-slate-300 to-slate-500",
    halo: "bg-slate-400/35",
    glow: "shadow-[0_12px_32px_rgba(100,116,139,0.35),inset_0_2px_10px_rgba(255,255,255,0.8)]",
    icon: "text-slate-500",
    base: "from-slate-700 to-slate-600",
    baseH: "h-14 sm:h-24",
    medal: "h-20 w-20",
    label: "Á quân",
  },
  3: {
    grad: "from-orange-200 via-orange-400 to-orange-700",
    halo: "bg-orange-400/35",
    glow: "shadow-[0_12px_32px_rgba(234,88,12,0.35),inset_0_2px_10px_rgba(255,255,255,0.6)]",
    icon: "text-orange-600",
    base: "from-orange-900/80 to-orange-800/60",
    baseH: "h-12 sm:h-20",
    medal: "h-20 w-20",
    label: "Hạng ba",
  },
};

/** Biến động thứ hạng mô phỏng so với kỳ trước (deterministic theo id) */
const rankDelta = (e: RankingEntry) => ((e.id * 37 + e.rankPosition * 11) % 5) - 2;

function DeltaChip({ delta }: { delta: number }) {
  if (delta > 0)
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
        <TrendingUp className="h-3 w-3" /> +{delta}
      </span>
    );
  if (delta < 0)
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-500">
        <TrendingDown className="h-3 w-3" /> {delta}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-400">
      <Minus className="h-3 w-3" /> 0
    </span>
  );
}

/** Thanh tiến độ mỏng tinh tế — gradient xanh dương thương hiệu */
function GlowBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1 w-full overflow-hidden rounded-full bg-slate-100", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export default function BangXepHangPage() {
  const { rankingSnapshots, rankingEntries, orgName, orgById } = useStore();
  const finalized = useMemo(
    () => rankingSnapshots.filter((s) => s.status === "FINALIZED").sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)),
    [rankingSnapshots]
  );
  const [snapshotId, setSnapshotId] = useState<string>(finalized[0]?.id.toString() ?? "");

  const snapshot = finalized.find((s) => s.id.toString() === snapshotId) ?? finalized[0];
  const entries = useMemo(
    () =>
      snapshot
        ? rankingEntries.filter((e) => e.snapshotId === snapshot.id).sort((a, b) => a.rankPosition - b.rankPosition)
        : [],
    [rankingEntries, snapshot]
  );

  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const podiumOrder = [top3[1], top3[0], top3[2]]; // hiển thị 2 - 1 - 3

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* ===== Header ===== */}
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="h-1 w-12 rounded-full bg-gradient-to-r from-amber-400 to-amber-500" />
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            Bảng xếp hạng thi đua
          </h1>
          <p className="mt-2 max-w-xl text-sm text-slate-500">
            Kết quả các kỳ đã chốt — số liệu công bố giữ nguyên trạng (snapshot).
          </p>
        </div>
        <Select
          value={snapshot?.id.toString()}
          onChange={(e) => setSnapshotId(e.target.value)}
          className="w-full rounded-full sm:w-80"
        >
          {finalized.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
      </div>

      {snapshot && entries.length > 0 ? (
        <>
          {/* Kỳ xếp hạng */}
          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-3xl bg-white px-5 py-3.5 text-xs text-slate-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-200">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 px-3 py-1 text-[11px] font-bold text-white shadow-md shadow-amber-500/25">
              <Trophy className="h-3 w-3" />
              {snapshot.periodType === "QUARTER" ? "Quý" : snapshot.periodType === "MONTH" ? "Tháng" : "Theo giai đoạn"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarRange className="h-3.5 w-3.5 text-blue-500" strokeWidth={1.5} />
              {formatDate(snapshot.periodStart)} — {formatDate(snapshot.periodEnd)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-blue-500" strokeWidth={1.5} />
              Cấp {snapshot.rankedOrgLevel} · {snapshot.totalUnits} đơn vị
            </span>
            <span className="ml-auto hidden truncate text-slate-400 sm:block">
              Phạm vi: {orgName(snapshot.scopeOrgUnitId)}
            </span>
          </div>

          {/* ===== Podium vinh danh Top 3 — huy hiệu 3D phát sáng ===== */}
          <motion.div
            key={snapshot.id}
            variants={listVariants}
            initial="hidden"
            animate="show"
            className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3 sm:items-end"
          >
            {podiumOrder.map((e, i) => {
              if (!e) return null;
              const p = PODIUM[e.rankPosition];
              const unit = orgById(e.orgUnitId);
              const delta = rankDelta(e);
              const big = e.rankPosition === 1;
              return (
                <motion.div
                  key={e.id}
                  variants={itemVariants}
                  className={cn(
                    i === 0 && "order-2 sm:order-1",
                    i === 1 && "order-1 sm:order-2",
                    i === 2 && "order-3"
                  )}
                >
                  <div className="relative overflow-hidden rounded-3xl bg-white p-6 pt-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-200">
                    {/* Hào quang viền phát sáng */}
                    <span className={cn("halo-pulse pointer-events-none absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full blur-3xl", p.halo)} />
                    {big ? (
                      <Crown className="float-y absolute left-1/2 top-3.5 h-6 w-6 -translate-x-1/2 fill-amber-400 text-amber-400 drop-shadow-[0_2px_8px_rgba(245,158,11,0.6)]" />
                    ) : null}

                    {/* Huy hiệu 3D —-gradient kim loại + ánh bóng trong + quầng ngoài */}
                    <div className="relative mx-auto mt-3">
                      <span className={cn("absolute -inset-3 rounded-full blur-xl", p.halo)} />
                      <div
                        className={cn(
                          "relative flex items-center justify-center rounded-full bg-gradient-to-br p-[4px]",
                          p.grad,
                          p.glow,
                          p.medal
                        )}
                      >
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-white shadow-inner">
                          <Trophy className={cn(big ? "h-11 w-11" : "h-8 w-8", p.icon)} strokeWidth={1.5} />
                        </div>
                      </div>
                    </div>

                    <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                      {p.label}
                    </p>
                    <h3 className={cn("mt-1 line-clamp-2 font-bold leading-snug text-slate-900", big ? "text-lg" : "text-base")}>
                      {orgName(e.orgUnitId)}
                    </h3>
                    <p className="mt-0.5 truncate text-xs text-slate-400">
                      {unit?.shortName}{unit?.schoolTypeName ? ` · ${unit.schoolTypeName}` : ""}
                    </p>

                    <p className={cn("mt-4 font-black tracking-tight text-slate-900", big ? "text-5xl" : "text-4xl")}>
                      {e.totalScore}
                      <span className="ml-1 text-xs font-semibold text-slate-400">điểm</span>
                    </p>

                    <div className="mt-4 space-y-1.5">
                      <GlowBar value={e.completionRate} />
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{e.completedTasks}/{e.totalTasks} nhiệm vụ</span>
                        <span className="font-semibold text-blue-600">{formatPercent(e.completionRate)}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-center gap-2 border-t border-slate-100 pt-3 text-[11px] text-slate-400">
                      <DeltaChip delta={delta} />
                      <span>so với kỳ trước</span>
                    </div>
                  </div>

                  {/* Bục podium */}
                  <div className={cn("mx-auto mt-1 flex w-4/5 items-start justify-center rounded-t-2xl bg-gradient-to-b pt-2 shadow-lg", p.base, p.baseH)}>
                    <span className="text-2xl font-black text-white/90 drop-shadow">#{e.rankPosition}</span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          {/* ===== Thứ hạng từ 4 trở đi — 1 khối card lớn, dòng hover nền ===== */}
          {rest.length > 0 ? (
            <motion.ol
              key={`rest-${snapshot.id}`}
              variants={listVariants}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-40px" }}
              className="mt-8 divide-y divide-slate-100 overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-200"
            >
              {rest.map((e) => {
                const unit = orgById(e.orgUnitId);
                return (
                  <motion.li
                    key={e.id}
                    variants={itemVariants}
                    className="group flex flex-wrap items-center gap-4 px-5 py-4 transition-colors duration-200 hover:bg-slate-50 sm:px-6"
                  >
                    <span className="w-8 text-center text-lg font-black text-slate-300 transition-colors group-hover:text-blue-500">
                      {e.rankPosition}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{orgName(e.orgUnitId)}</p>
                      <p className="truncate text-[11px] font-light text-slate-400">
                        {unit?.shortName}{unit?.schoolTypeName ? ` · ${unit.schoolTypeName}` : ""}
                      </p>
                    </div>
                    <div className="hidden w-44 md:block">
                      <GlowBar value={e.completionRate} />
                      <p className="mt-1 text-right text-[10px] font-light text-slate-400">
                        {e.completedTasks}/{e.totalTasks} nhiệm vụ · {e.activityCount} hoạt động
                      </p>
                    </div>
                    <DeltaChip delta={rankDelta(e)} />
                    <div className="w-16 text-right">
                      <p className="text-base font-black text-slate-900">{e.totalScore}</p>
                      <p className="text-[10px] font-light text-slate-400">điểm</p>
                    </div>
                  </motion.li>
                );
              })}
            </motion.ol>
          ) : null}
        </>
      ) : (
        <div className="mt-10">
          <EmptyState message="Chưa có kỳ xếp hạng nào được công bố." icon={Target} />
        </div>
      )}
    </div>
  );
}
