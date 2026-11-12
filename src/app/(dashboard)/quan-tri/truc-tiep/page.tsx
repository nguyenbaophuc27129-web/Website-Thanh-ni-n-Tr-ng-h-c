"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  CheckCircle2,
  ClipboardList,
  Target,
  Users,
  FileBarChart,
  LifeBuoy,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Radio,
  Search,
  Filter,
  RefreshCw,
  Building2,
  ChevronRight,
  ShieldAlert,
  Flame,
  Check,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { relTime, cn } from "@/lib/utils";
import type { LiveEventType } from "@/types";

const EVENT_META: Record<LiveEventType, { icon: typeof Activity; label: string; className: string }> = {
  ACTIVITY_SUBMITTED: { icon: Activity, label: "Hoạt động", className: "bg-blue-50 text-blue-600" },
  ACTIVITY_CONFIRMED: { icon: CheckCircle2, label: "Xác nhận", className: "bg-emerald-50 text-emerald-600" },
  TASK_RESULT: { icon: ClipboardList, label: "Báo cáo kết quả", className: "bg-sky-50 text-sky-600" },
  TASK_ASSIGNED: { icon: Target, label: "Giao chỉ tiêu", className: "bg-violet-50 text-violet-600" },
  ATTENDANCE: { icon: Users, label: "Điểm danh số", className: "bg-amber-50 text-amber-600" },
  REPORT_CREATED: { icon: FileBarChart, label: "Báo cáo thi đua", className: "bg-slate-100 text-slate-700" },
  FEEDBACK_NEW: { icon: LifeBuoy, label: "Ý kiến đoàn viên", className: "bg-orange-50 text-orange-600" },
};

type LightTone = "red" | "yellow" | "green";

const FEED_CATS: { key: string; label: string; icon: typeof Activity; types: LiveEventType[] | null }[] = [
  { key: "all", label: "Tất cả", icon: Activity, types: null },
  { key: "activity", label: "Hoạt động & Điểm danh", icon: Activity, types: ["ACTIVITY_SUBMITTED", "ATTENDANCE"] },
  { key: "task", label: "Chỉ tiêu & Nhiệm vụ", icon: Target, types: ["TASK_ASSIGNED"] },
  { key: "result", label: "Kết quả & Báo cáo", icon: FileBarChart, types: ["TASK_RESULT", "REPORT_CREATED"] },
  { key: "social", label: "Ý kiến & Xác nhận", icon: LifeBuoy, types: ["FEEDBACK_NEW", "ACTIVITY_CONFIRMED"] },
];

export default function TrucTiepPage() {
  const { session } = useAuth();
  const store = useStore();

  const [cat, setCat] = useState("all");
  const [unitSearch, setUnitSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | LightTone>("all");
  const [lastTick, setLastTick] = useState(Date.now());

  // Realtime tick: Tự động đếm nhịp và đồng bộ trạng thái realtime toàn hệ thống mỗi 3.5 giây
  useEffect(() => {
    const timer = setInterval(() => {
      setLastTick(Date.now());
    }, 3500);
    return () => clearInterval(timer);
  }, []);

  // Phạm vi dữ liệu theo thẩm quyền
  const scope = useMemo(() => (session ? store.scopeIds(session) : []), [session, store, lastTick]);

  // Toàn bộ sự kiện thời gian thực trong phạm vi
  const scopedEvents = useMemo(() => {
    return store.liveEvents
      .filter((e) => (session?.role === "QUAN_TRI_TW" ? true : scope.includes(e.orgUnitId)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [store.liveEvents, scope, session, lastTick]);

  const feed = useMemo(() => {
    const c = FEED_CATS.find((x) => x.key === cat);
    return scopedEvents.filter((e) => !c?.types || c.types.includes(e.eventType)).slice(0, 30);
  }, [scopedEvents, cat]);

  const catCounts = useMemo(() => {
    return Object.fromEntries(
      FEED_CATS.map((c) => [c.key, scopedEvents.filter((e) => !c.types || c.types.includes(e.eventType)).length])
    ) as Record<string, number>;
  }, [scopedEvents]);

  /**
   * Danh sách đơn vị trực thuộc cần theo dõi:
   * - Trung ương (QUAN_TRI_TW): Theo dõi toàn bộ Tỉnh/Thành đoàn và Đoàn trực thuộc TW đang hoạt động (orgLevel === 2)
   * - Tỉnh/Thành (QUAN_TRI_TINH): Theo dõi các Quận/Huyện/Thị xã, Đoàn trường trực thuộc (cấp dưới)
   * - Cấp 3 / Trường (QUAN_TRI_CAP3 / DON_VI): Theo dõi các chi đoàn lớp / đơn vị cơ sở
   */
  const monitoredUnits = useMemo(() => {
    if (!session) return [];

    let units = store.orgUnits;
    if (session.role === "QUAN_TRI_TW") {
      // Trung ương theo dõi các đơn vị cấp 2 đang hoạt động — khớp danh sách chấm điểm thi đua
      units = store.orgUnits.filter((u) => u.orgLevel === 2 && u.isActive);
    } else if (session.role === "QUAN_TRI_TINH") {
      // Tỉnh/thành theo dõi toàn bộ cấp dưới thuộc cây đơn vị của tỉnh mình
      const provinceDescendants = new Set(store.descendantsOf(session.orgUnitId));
      units = store.orgUnits.filter((u) => provinceDescendants.has(u.id) && u.id !== session.orgUnitId);
    } else {
      // Đơn vị cấp dưới theo dõi con trực tiếp
      units = store.orgUnits.filter((u) => u.parentId === session.orgUnitId);
    }

    return units.map((u) => {
      // 1. Nhiệm vụ quá hạn
      const overdueTasks = store.taskAssignments.filter(
        (a) => a.orgUnitId === u.id && a.progressStatus === "OVERDUE"
      );

      // 2. Hoạt động chờ duyệt quá 3 ngày
      const stalePendingActivities = store.activities.filter((a) => {
        if (a.orgUnitId !== u.id || a.confirmStatus !== "PENDING") return false;
        const base = a.updatedAt ?? a.createdAt;
        return Date.now() - new Date(base).getTime() > 3 * 86400000;
      });

      // 3. Kết quả nhiệm vụ đang chờ phê duyệt
      const pendingReviews = store.taskAssignments.filter(
        (a) => a.orgUnitId === u.id && (a.confirmStatus === "PENDING" || a.confirmStatus === "NEEDS_INFO")
      );

      // 4. Hoạt động đang chờ xác nhận
      const pendingActivities = store.activities.filter(
        (a) => a.orgUnitId === u.id && a.confirmStatus === "PENDING"
      );

      let tone: LightTone = "green";
      if (overdueTasks.length > 0 || stalePendingActivities.length > 0) {
        tone = "red";
      } else if (pendingReviews.length > 0 || pendingActivities.length > 0) {
        tone = "yellow";
      }

      const blockerLink = overdueTasks[0]
        ? `/quan-tri/nhiem-vu/phan-cong/${overdueTasks[0].id}`
        : stalePendingActivities[0]
        ? `/quan-tri/hoat-dong/${stalePendingActivities[0].id}`
        : pendingReviews[0]
        ? `/quan-tri/nhiem-vu/phan-cong/${pendingReviews[0].id}`
        : pendingActivities[0]
        ? `/quan-tri/hoat-dong/${pendingActivities[0].id}`
        : undefined;

      return {
        unit: u,
        tone,
        overdueTasks: overdueTasks.length,
        stalePending: stalePendingActivities.length,
        pendingReviews: pendingReviews.length,
        pendingActivities: pendingActivities.length,
        blockerLink,
      };
    });
  }, [session, store, lastTick]);

  // Bộ lọc tìm kiếm & trạng thái đèn
  const filteredChildUnits = useMemo(() => {
    return monitoredUnits
      .filter((c) => {
        if (statusFilter === "all") return true;
        return c.tone === statusFilter;
      })
      .filter((c) => {
        if (!unitSearch.trim()) return true;
        return c.unit.name.toLowerCase().includes(unitSearch.toLowerCase());
      })
      .sort((a, b) => {
        // Ưu tiên đèn đỏ lên trước, rồi đến vàng, rồi đến xanh
        const priority: Record<LightTone, number> = { red: 0, yellow: 1, green: 2 };
        if (priority[a.tone] !== priority[b.tone]) {
          return priority[a.tone] - priority[b.tone];
        }
        return a.unit.name.localeCompare(b.unit.name, "vi");
      });
  }, [monitoredUnits, statusFilter, unitSearch]);

  const lights = useMemo(() => {
    return {
      total: monitoredUnits.length,
      red: monitoredUnits.filter((c) => c.tone === "red").length,
      yellow: monitoredUnits.filter((c) => c.tone === "yellow").length,
      green: monitoredUnits.filter((c) => c.tone === "green").length,
    };
  }, [monitoredUnits]);

  const isTW = session?.role === "QUAN_TRI_TW";
  const isTinh = session?.role === "QUAN_TRI_TINH";

  // Cơ cấu đơn vị TW đang giám sát: khối vũ trang / cơ quan là Đoàn trực thuộc, còn lại là Tỉnh/Thành đoàn
  const twBreakdown = useMemo(() => {
    const direct = monitoredUnits.filter((c) => c.unit.block === "VU_TRANG" || c.unit.block === "CO_QUAN").length;
    return { provinces: monitoredUnits.length - direct, direct };
  }, [monitoredUnits]);
  const twScopeText = `${lights.total} đơn vị (${twBreakdown.provinces} Tỉnh/Thành đoàn · ${twBreakdown.direct} Đoàn trực thuộc)`;

  return (
    <div className="space-y-6">
      {/* ===== Header Bar Realtime ===== */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-5 text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-400">
              KẾT NỐI REALTIME 24/7 · TOÀN HỆ THỐNG
            </span>
          </div>

          <h1 className="mt-2 text-2xl font-black tracking-tight text-white sm:text-3xl">
            Trực tiếp &amp; Giám sát Cảnh báo
          </h1>

          <p className="mt-1 text-xs text-blue-200">
            {isTW
              ? `Trung ương Đoàn giám sát hoạt động & điểm nghẽn của ${twScopeText} theo thời gian thực.`
              : isTinh
              ? "Tỉnh / Thành đoàn giám sát toàn bộ hoạt động & tiến độ của các đơn vị Quận, Huyện và Đoàn trường trực thuộc."
              : "Giám sát tiến độ nhiệm vụ và hoạt động trực tiếp của đơn vị."}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-white/10 px-4 py-2 text-right backdrop-blur">
            <span className="text-[10px] uppercase tracking-wider text-blue-200">Đơn vị đang giám sát</span>
            <p className="text-xl font-black text-white">{lights.total} <span className="text-xs font-normal text-blue-200">đơn vị</span></p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-400/30">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
        </div>
      </div>

      {/* ===== Layout 2 Cột: Trái (Feed sự kiện) - Phải (Đèn đơn vị giám sát) ===== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* CỘT PHẢI ĐƯA LÊN TRƯỚC HOẶC RỘNG HƠN CHO GIÁM SÁT ĐƠN VỊ (7/12) */}
        <div className="space-y-4 lg:col-span-7">
          <Card>
            <CardHeader
              title={
                isTW
                  ? `Bảng đèn cảnh báo ${twScopeText}`
                  : isTinh
                  ? `Bảng đèn cảnh báo ${lights.total} đơn vị trực thuộc Tỉnh/Thành`
                  : `Bảng đèn cảnh báo ${lights.total} đơn vị trực thuộc`
              }
              subtitle="Tự động phát hiện điểm nghẽn: Đỏ (quá hạn/tồn đọng > 3 ngày) · Vàng (chờ xử lý) · Xanh (hoạt động tốt)"
            />

            <CardBody className="space-y-4">
              {/* Thống kê 3 mức đèn */}
              <div className="grid grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={`flex flex-col rounded-xl border p-2.5 text-left transition ${
                    statusFilter === "all"
                      ? "border-blue-500 bg-blue-50/80 shadow-sm"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase text-slate-500">Tất cả</span>
                  <span className="mt-0.5 text-lg font-black text-slate-800">{lights.total}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter("red")}
                  className={`flex flex-col rounded-xl border p-2.5 text-left transition ${
                    statusFilter === "red"
                      ? "border-rose-500 bg-rose-50/90 shadow-sm ring-2 ring-rose-200"
                      : "border-rose-200 bg-rose-50/40 hover:bg-rose-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-rose-600">
                    <AlertOctagon className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase">Điểm nghẽn</span>
                  </div>
                  <span className="mt-0.5 text-lg font-black text-rose-700">{lights.red}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter("yellow")}
                  className={`flex flex-col rounded-xl border p-2.5 text-left transition ${
                    statusFilter === "yellow"
                      ? "border-amber-500 bg-amber-50/90 shadow-sm ring-2 ring-amber-200"
                      : "border-amber-200 bg-amber-50/40 hover:bg-amber-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-amber-600">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase">Cần đôn đốc</span>
                  </div>
                  <span className="mt-0.5 text-lg font-black text-amber-700">{lights.yellow}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter("green")}
                  className={`flex flex-col rounded-xl border p-2.5 text-left transition ${
                    statusFilter === "green"
                      ? "border-emerald-500 bg-emerald-50/90 shadow-sm ring-2 ring-emerald-200"
                      : "border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase">Tốt</span>
                  </div>
                  <span className="mt-0.5 text-lg font-black text-emerald-700">{lights.green}</span>
                </button>
              </div>

              {/* Ô tìm kiếm đơn vị */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={unitSearch}
                  onChange={(e) => setUnitSearch(e.target.value)}
                  placeholder={
                    isTW
                      ? "Tìm kiếm nhanh theo tên tỉnh/thành (ví dụ: Nghệ An, Hà Nội, TP. Hồ Chí Minh...)"
                      : "Tìm kiếm nhanh đơn vị trực thuộc..."
                  }
                  className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {/* Danh sách đèn các đơn vị */}
              <div className="max-h-[580px] space-y-2 overflow-y-auto pr-1">
                {filteredChildUnits.map((c) => {
                  const isRed = c.tone === "red";
                  const isYellow = c.tone === "yellow";
                  return (
                    <div
                      key={c.unit.id}
                      className={`group flex items-center justify-between gap-3 rounded-xl border p-3 transition ${
                        isRed
                          ? "border-rose-200 bg-rose-50/30 hover:border-rose-300 hover:bg-rose-50/70"
                          : isYellow
                          ? "border-amber-200 bg-amber-50/30 hover:border-amber-300 hover:bg-amber-50/70"
                          : "border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {/* Đèn chỉ thị */}
                        <div className="mt-1 shrink-0">
                          {isRed ? (
                            <span className="relative flex h-3.5 w-3.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-rose-600" />
                            </span>
                          ) : isYellow ? (
                            <span className="inline-flex h-3.5 w-3.5 rounded-full bg-amber-500" />
                          ) : (
                            <span className="inline-flex h-3.5 w-3.5 rounded-full bg-emerald-500" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-xs font-bold text-slate-900 group-hover:text-blue-600">
                              {c.unit.name}
                            </p>
                            <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                              Cấp {c.unit.orgLevel}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                            {c.overdueTasks > 0 ? (
                              <span className="font-semibold text-rose-600">
                                ⚠ {c.overdueTasks} nhiệm vụ quá hạn
                              </span>
                            ) : null}

                            {c.stalePending > 0 ? (
                              <span className="font-semibold text-rose-600">
                                ⌛ {c.stalePending} hoạt động chờ &gt; 3 ngày
                              </span>
                            ) : null}

                            {c.pendingReviews > 0 ? (
                              <span className="font-medium text-amber-600">
                                • {c.pendingReviews} báo cáo chờ duyệt
                              </span>
                            ) : null}

                            {c.pendingActivities > 0 && c.stalePending === 0 ? (
                              <span className="font-medium text-amber-600">
                                • {c.pendingActivities} hoạt động chờ duyệt
                              </span>
                            ) : null}

                            {c.tone === "green" ? (
                              <span className="text-emerald-600">
                                ✓ Hoạt động ổn định, không có điểm nghẽn
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {c.blockerLink ? (
                        <Link
                          href={c.blockerLink}
                          className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-blue-600 shadow-sm transition hover:bg-blue-600 hover:text-white"
                        >
                          Xử lý ngay →
                        </Link>
                      ) : null}
                    </div>
                  );
                })}

                {filteredChildUnits.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    Không tìm thấy đơn vị nào phù hợp với bộ lọc hiện tại.
                  </div>
                ) : null}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* CỘT TRÁI: DÒNG SỰ KIỆN THỜI GIAN THỰC (5/12) */}
        <div className="space-y-4 lg:col-span-5">
          <Card>
            <CardHeader
              title="Dòng sự kiện trực tiếp"
              subtitle="Cập nhật từng giây các hành động gửi báo cáo, điểm danh, tạo hoạt động..."
            />

            <CardBody className="p-0">
              {/* Tab phân loại feed */}
              <div className="flex gap-1 overflow-x-auto border-b border-slate-100 p-2 text-xs scrollbar-hide">
                {FEED_CATS.map((c) => {
                  const active = cat === c.key;
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setCat(c.key)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold transition ${
                        active
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <c.icon className="h-3 w-3" />
                      <span>{c.label}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[9px] ${
                          active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {catCounts[c.key] ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Feed items */}
              <ul className="max-h-[580px] divide-y divide-slate-100 overflow-y-auto">
                {feed.map((e) => {
                  const meta = EVENT_META[e.eventType] || EVENT_META.ACTIVITY_SUBMITTED;
                  return (
                    <li key={e.id} className="flex items-start gap-3 p-3.5 transition hover:bg-slate-50/60">
                      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${meta.className}`}>
                        <meta.icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold leading-snug text-slate-800">{e.title}</p>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-600">
                            {meta.label}
                          </span>
                          <span>{store.orgName(e.orgUnitId)}</span>
                          <span>·</span>
                          <span className="font-medium text-blue-600">{relTime(e.createdAt)}</span>
                        </div>
                      </div>
                    </li>
                  );
                })}

                {feed.length === 0 ? (
                  <li className="p-8 text-center text-xs text-slate-400">
                    Chưa có sự kiện nào thuộc mục này.
                  </li>
                ) : null}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
