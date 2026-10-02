"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity, CheckCircle2, ClipboardList, Target, Users, FileBarChart, LifeBuoy,
  AlertOctagon, AlertTriangle, ArrowRight,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { relTime, cn } from "@/lib/utils";
import type { LiveEventType } from "@/types";

const EVENT_META: Record<LiveEventType, { icon: typeof Activity; label: string; className: string }> = {
  ACTIVITY_SUBMITTED: { icon: Activity, label: "Hoạt động", className: "bg-doan-50 text-doan-600" },
  ACTIVITY_CONFIRMED: { icon: CheckCircle2, label: "Xác nhận", className: "bg-emerald-50 text-emerald-600" },
  TASK_RESULT: { icon: ClipboardList, label: "Kết quả", className: "bg-sky-50 text-sky-600" },
  TASK_ASSIGNED: { icon: Target, label: "Giao việc", className: "bg-violet-50 text-violet-600" },
  ATTENDANCE: { icon: Users, label: "Điểm danh", className: "bg-amber-50 text-amber-600" },
  REPORT_CREATED: { icon: FileBarChart, label: "Báo cáo", className: "bg-stone-100 text-stone-600" },
  FEEDBACK_NEW: { icon: LifeBuoy, label: "Phản ánh", className: "bg-orange-50 text-orange-600" },
};

type LightTone = "red" | "yellow" | "green";

/** Nhóm feed theo mục để dễ theo dõi — mỗi mục gộp các loại sự kiện liên quan */
const FEED_CATS: { key: string; label: string; icon: typeof Activity; types: LiveEventType[] | null }[] = [
  { key: "all", label: "Tất cả", icon: Activity, types: null },
  { key: "activity", label: "Hoạt động & Đăng nhập", icon: Activity, types: ["ACTIVITY_SUBMITTED", "ATTENDANCE"] },
  { key: "task", label: "Giao việc", icon: Target, types: ["TASK_ASSIGNED"] },
  { key: "result", label: "Kết quả", icon: FileBarChart, types: ["TASK_RESULT", "REPORT_CREATED"] },
  { key: "social", label: "Phản ánh & Xác nhận", icon: LifeBuoy, types: ["FEEDBACK_NEW", "ACTIVITY_CONFIRMED"] },
];

export default function TrucTiepPage() {
  const { session } = useAuth();
  const store = useStore();

  const scope = useMemo(() => (session ? store.scopeIds(session) : []), [session, store]);

  const [cat, setCat] = useState("all");

  /** Toàn bộ sự kiện trong phạm vi, mới nhất trước */
  const scoped = useMemo(
    () =>
      store.liveEvents
        .filter((e) => scope.includes(e.orgUnitId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [store.liveEvents, scope]
  );

  const feed = useMemo(() => {
    const c = FEED_CATS.find((x) => x.key === cat);
    return scoped.filter((e) => !c?.types || c.types.includes(e.eventType)).slice(0, 25);
  }, [scoped, cat]);

  /** Số sự kiện từng mục (trên toàn bộ phạm vi, chưa cắt 25) */
  const catCounts = useMemo(
    () =>
      Object.fromEntries(
        FEED_CATS.map((c) => [c.key, scoped.filter((e) => !c.types || c.types.includes(e.eventType)).length])
      ) as Record<string, number>,
    [scoped]
  );

  /** Đơn vị con trực tiếp + trạng thái đèn điểm nghẽn */
  const childUnits = useMemo(() => {
    if (!session) return [];
    return store.orgUnits
      .filter((u) => u.parentId === session.orgUnitId)
      .map((u) => {
        const overdueTasks = store.taskAssignments.filter(
          (a) => a.orgUnitId === u.id && a.progressStatus === "OVERDUE"
        );
        const stalePendingActivities = store.activities.filter((a) => {
          if (a.orgUnitId !== u.id || a.confirmStatus !== "PENDING") return false;
          const base = a.updatedAt ?? a.createdAt;
          return Date.now() - new Date(base).getTime() > 3 * 86400000;
        });
        const pendingReviews = store.taskAssignments.filter(
          (a) => a.orgUnitId === u.id && (a.confirmStatus === "PENDING" || a.confirmStatus === "NEEDS_INFO")
        );
        const pendingActivities = store.activities.filter((a) => a.orgUnitId === u.id && a.confirmStatus === "PENDING");

        let tone: LightTone = "green";
        if (overdueTasks.length > 0 || stalePendingActivities.length > 0) tone = "red";
        else if (pendingReviews.length > 0 || pendingActivities.length > 0) tone = "yellow";

        const blockerLink =
          overdueTasks[0]
            ? `/quan-tri/nhiem-vu/phan-cong/${overdueTasks[0].id}`
            : stalePendingActivities[0]
              ? `/quan-tri/hoat-dong/${stalePendingActivities[0].id}`
              : pendingReviews[0]
                ? `/quan-tri/nhiem-vu/phan-cong/${pendingReviews[0].id}`
                : pendingActivities[0]
                  ? `/quan-tri/hoat-dong/${pendingActivities[0].id}`
                  : undefined;

        return { unit: u, tone, overdueTasks: overdueTasks.length, stalePending: stalePendingActivities.length, pendingReviews: pendingReviews.length, pendingActivities: pendingActivities.length, blockerLink };
      });
  }, [session, store.orgUnits, store.taskAssignments, store.activities]);

  const lights = useMemo(
    () => ({
      red: childUnits.filter((c) => c.tone === "red").length,
      yellow: childUnits.filter((c) => c.tone === "yellow").length,
      green: childUnits.filter((c) => c.tone === "green").length,
    }),
    [childUnits]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif-display text-xl font-bold text-stone-900">Trực tiếp &amp; cảnh báo</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Dòng sự kiện thời gian thực và đèn cảnh báo điểm nghẽn của các đơn vị trực thuộc.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-stone-200 bg-white px-4 py-2.5">
          <input
            type="checkbox"
            checked={store.liveEnabled}
            onChange={(e) => store.setLiveEnabled(e.target.checked)}
            className="h-4 w-4 accent-doan-600"
          />
          <span className="text-sm font-medium text-stone-700">Mô phỏng realtime</span>
          {store.liveEnabled ? (
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-doan-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-doan-600" />
            </span>
          ) : null}
        </label>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Cột trái — live feed */}
        <Card>
          <CardHeader
            title="Dòng sự kiện trực tiếp"
            subtitle={
              store.liveEnabled
                ? "Đang mô phỏng — sự kiện mới xuất hiện mỗi 8–15 giây."
                : "Đang hiển thị dữ liệu gần nhất. Bật mô phỏng realtime để xem trực tiếp."
            }
          />
          <CardBody className="p-0">
            {/* Tab phân loại feed — đếm trên toàn phạm vi */}
            <div className="thin-scrollbar flex gap-1.5 overflow-x-auto border-b border-stone-100 px-4 py-3">
              {FEED_CATS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCat(c.key)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    cat === c.key
                      ? "bg-doan-600 text-white shadow-sm shadow-doan-600/25"
                      : "bg-stone-100 text-stone-500 hover:bg-stone-200"
                  )}
                >
                  <c.icon className="h-3 w-3" strokeWidth={1.75} />
                  {c.label}
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      cat === c.key ? "bg-white/20 text-white" : "bg-white text-stone-400"
                    )}
                  >
                    {catCounts[c.key] ?? 0}
                  </span>
                </button>
              ))}
            </div>
            <ul className="thin-scrollbar max-h-[560px] divide-y divide-stone-100 overflow-y-auto">
              {feed.map((e) => {
                const meta = EVENT_META[e.eventType];
                return (
                  <li key={e.id} className="flex items-start gap-3 px-5 py-3">
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${meta.className}`}>
                      <meta.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug text-stone-700">{e.title}</p>
                      <p className="mt-0.5 text-[11px] text-stone-400">
                        <Badge tone="gray" className="mr-1.5">{meta.label}</Badge>
                        {store.orgName(e.orgUnitId)} · {relTime(e.createdAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
              {feed.length === 0 ? (
                <li className="px-5 py-10 text-center text-sm text-stone-400">
                  {cat === "all" ? "Chưa có sự kiện trong phạm vi của bạn." : "Chưa có sự kiện thuộc mục này."}
                </li>
              ) : null}
            </ul>
          </CardBody>
        </Card>

        {/* Cột phải — đèn đơn vị */}
        <Card>
          <CardHeader
            title="Đèn cảnh báo đơn vị trực thuộc"
            subtitle="Đỏ: quá hạn / chờ xác nhận quá 3 ngày · Vàng: có pending · Xanh: bình thường"
          />
          <CardBody className="space-y-4">
            <div className="flex gap-3">
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-doan-200 bg-doan-50 px-3 py-2">
                <AlertOctagon className="h-4 w-4 text-doan-600" />
                <span className="text-sm font-bold text-doan-700">{lights.red}</span>
                <span className="text-[11px] text-doan-600">đỏ</span>
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-bold text-amber-700">{lights.yellow}</span>
                <span className="text-[11px] text-amber-600">vàng</span>
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-700">{lights.green}</span>
                <span className="text-[11px] text-emerald-600">xanh</span>
              </div>
            </div>

            <ul className="space-y-2">
              {childUnits.map((c) => {
                const row = (
                  <>
                    <span
                      className={`h-3 w-3 shrink-0 rounded-full ${
                        c.tone === "red" ? "bg-doan-600" : c.tone === "yellow" ? "bg-amber-400" : "bg-emerald-500"
                      }`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-stone-800">{c.unit.name}</p>
                      <p className="text-[11px] text-stone-400">
                        {c.overdueTasks > 0 ? `${c.overdueTasks} nhiệm vụ quá hạn` : ""}
                        {c.stalePending > 0 ? `${c.overdueTasks > 0 ? " · " : ""}${c.stalePending} hoạt động chờ quá 3 ngày` : ""}
                        {c.overdueTasks === 0 && c.stalePending === 0
                          ? c.pendingReviews > 0
                            ? `${c.pendingReviews} báo cáo chờ xác nhận`
                            : c.pendingActivities > 0
                              ? `${c.pendingActivities} hoạt động chờ xác nhận`
                              : "Không có điểm nghẽn"
                          : ""}
                      </p>
                    </div>
                    {c.blockerLink ? <ArrowRight className="h-4 w-4 shrink-0 text-stone-300" /> : null}
                  </>
                );
                return (
                  <li key={c.unit.id}>
                    {c.blockerLink ? (
                      <Link href={c.blockerLink} className="flex items-center gap-3 rounded-lg border border-stone-100 px-3.5 py-2.5 hover:border-doan-200 hover:bg-doan-50/30">
                        {row}
                      </Link>
                    ) : (
                      <div className="flex items-center gap-3 rounded-lg border border-stone-100 px-3.5 py-2.5">{row}</div>
                    )}
                  </li>
                );
              })}
              {childUnits.length === 0 ? (
                <li className="rounded-lg border border-dashed border-stone-200 px-4 py-8 text-center text-sm text-stone-400">
                  Đơn vị của bạn không có đơn vị con trực thuộc.
                </li>
              ) : null}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
