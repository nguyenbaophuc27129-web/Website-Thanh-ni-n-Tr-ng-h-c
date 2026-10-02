"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Activity, ClipboardList, CheckSquare, Megaphone, AlertTriangle, ArrowRight, CalendarClock, Radio,
  BellRing, FileText, CheckCheck,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { StatCard, SectionTitle } from "@/components/dashboard/stat-card";
import { DeadlineBadge } from "@/components/dashboard/status-badge";
import { SetupChecklist } from "@/components/dashboard/setup-checklist";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActivitiesBarChart, TaskProgressPie, PostViewsAreaChart, ScoresHorizontalBar } from "@/components/charts/charts";
import { postViewDaily } from "@/data/published-posts";
import { formatPercent, relTime } from "@/lib/utils";
import { collectReminders } from "@/lib/use-assignment-reminders";

/* Staggered fade-up — micro-interaction khi load trang */
const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" as const } },
};

export default function TongQuanPage() {
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(
      new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })
    );
  }, []);

  const scope = useMemo(() => (session ? store.scopeIds(session) : []), [session, store]);

  const activities = useMemo(
    () => store.activities.filter((a) => scope.includes(a.orgUnitId)),
    [store.activities, scope]
  );
  const assignments = useMemo(
    () => store.taskAssignments.filter((a) => scope.includes(a.orgUnitId)),
    [store.activities, store.taskAssignments, scope] // eslint-disable-line react-hooks/exhaustive-deps
  );
  const pendingReviews = useMemo(
    () =>
      assignments.filter(
        (a) => a.orgUnitId !== session?.orgUnitId && (a.confirmStatus === "PENDING" || a.confirmStatus === "NEEDS_INFO")
      ),
    [assignments, session]
  );
  const nearDeadline = useMemo(
    () =>
      assignments
        .filter((a) => a.progressStatus !== "COMPLETED" && a.orgUnitId === session?.orgUnitId)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 5),
    [assignments, session]
  );

  const byMonth = useMemo(() => {
    const months = ["Thg7", "Thg8", "Thg9"];
    return months.map((m, i) => ({
      name: m,
      value: activities.filter((a) => new Date(a.startDate).getMonth() === i + 6).length,
    }));
  }, [activities]);

  const progressPie = useMemo(() => {
    const counts = { NOT_STARTED: 0, IN_PROGRESS: 0, COMPLETED: 0, OVERDUE: 0 };
    assignments.forEach((a) => { counts[a.progressStatus]++; });
    const labels: Record<string, string> = {
      NOT_STARTED: "Chưa bắt đầu", IN_PROGRESS: "Đang thực hiện", COMPLETED: "Hoàn thành", OVERDUE: "Quá hạn",
    };
    return Object.entries(counts).filter(([, v]) => v > 0).map(([k, v]) => ({ name: labels[k], value: v }));
  }, [assignments]);

  const topUnits = useMemo(() => {
    const set = store.activeCriteriaSet();
    if (!set) return [];
    return store.orgUnits
      .filter((u) => u.orgLevel === 4 && scope.includes(u.id))
      .map((u) => ({
        name: u.shortName,
        value: Math.round(
          store.scores.filter((s) => s.orgUnitId === u.id && s.criteriaSetId === set.id).reduce((sum, s) => sum + s.points, 0) * 10
        ) / 10,
      }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [store.orgUnits, store.scores, scope]);

  const myTasksRate = useMemo(() => {
    const mine = assignments.filter((a) => a.orgUnitId === session?.orgUnitId);
    if (mine.length === 0) return null;
    return mine.reduce((s, a) => s + a.completionRate, 0) / mine.length;
  }, [assignments, session]);

  const overdueCount = assignments.filter((a) => a.progressStatus === "OVERDUE").length;

  // F1 — Nhắc việc của đơn vị (tới hạn ≤ 3 ngày hoặc quá hạn, chưa hoàn thành)
  const myReminders = useMemo(() => {
    if (!session) return [];
    const titleOf = (id: number) => store.tasks.find((t) => t.id === id)?.title ?? `Nhiệm vụ #${id}`;
    return collectReminders(assignments, session.orgUnitId, titleOf);
  }, [assignments, session, store.tasks]);

  // F2 — Văn bản mới phát hành mà đơn vị bạn chưa đọc
  const unreadDocs = useMemo(() => {
    if (!session) return [];
    return store.documents.filter(
      (d) =>
        d.status === "ISSUED" &&
        store.documentRecipients.some((r) => r.documentId === d.id && r.orgUnitId === session.orgUnitId && !r.readAt)
    );
  }, [store.documents, store.documentRecipients, session]);

  const markDocRead = (docId: number) => {
    if (!session) return;
    store.markDocumentRead(docId, session.orgUnitId);
    toast("Đã đánh dấu văn bản là đã đọc.", "success");
  };
  const markAllDocsRead = () => {
    if (!session) return;
    unreadDocs.forEach((d) => store.markDocumentRead(d.id, session.orgUnitId));
    toast(`Đã đánh dấu ${unreadDocs.length} văn bản là đã đọc.`, "success");
  };

  const showLiveStrip =
    session?.role === "QUAN_TRI_TW" || session?.role === "QUAN_TRI_TINH" || session?.role === "QUAN_TRI_CAP3";
  const scopedLiveEvents = useMemo(
    () => (showLiveStrip ? store.liveEvents.filter((e) => scope.includes(e.orgUnitId)).slice(0, 3) : []),
    [store.liveEvents, scope, showLiveStrip]
  );

  return (
    <div className="space-y-6">
      {/* ===== Hero banner "Xin chào" — gradient nhẹ nhàng ===== */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-cyan-500 p-7 text-white shadow-xl shadow-blue-600/20 sm:p-8"
      >
        <span className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
        <span className="pointer-events-none absolute -bottom-16 left-1/3 h-44 w-44 rounded-full bg-cyan-300/20 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="min-w-0">
            {today ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-100 backdrop-blur">
                {today}
              </span>
            ) : null}
            <h1 className="mt-2.5 text-2xl font-black tracking-tight sm:text-3xl">
              Xin chào, {session?.contactPerson}
            </h1>
            <p className="mt-1.5 text-sm font-light text-blue-100">
              Tổng quan hoạt động và nhiệm vụ thi đua của {session?.orgUnitName}.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden h-13 w-13 items-center justify-center rounded-2xl bg-white/10 text-lg font-black ring-1 ring-white/25 backdrop-blur sm:flex">
              {session?.contactPerson?.charAt(0) ?? "T"}
            </span>
          </div>
        </div>
      </motion.div>

      {/* ===== Banner văn bản mới chưa đọc ===== */}
      {unreadDocs.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-doan-50/70 p-4 ring-1 ring-doan-100"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-doan-100 text-doan-600">
              <FileText className="h-4.5 w-4.5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold text-doan-800">
                Bạn có {unreadDocs.length} văn bản mới chưa đọc
              </p>
              <ul className="mt-1 space-y-0.5">
                {unreadDocs.slice(0, 3).map((d) => (
                  <li key={d.id} className="flex items-center gap-2 text-xs font-light text-doan-700">
                    <span className="truncate">
                      {d.docNumber ? `${d.docNumber} — ` : ""}{d.title}
                    </span>
                    <button
                      onClick={() => markDocRead(d.id)}
                      className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-doan-600 hover:bg-doan-100 hover:underline"
                    >
                      Đánh dấu đã đọc
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex shrink-0 flex-col gap-1.5">
              <button
                onClick={markAllDocsRead}
                className="inline-flex items-center gap-1 rounded-lg bg-doan-600 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-doan-700"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Đánh dấu tất cả
              </button>
              <Link href="/quan-tri/van-ban" className="text-center text-[11px] font-semibold text-doan-600 hover:underline">
                Xem Văn bản
              </Link>
            </div>
          </div>
        </motion.div>
      ) : null}

      <SetupChecklist />

      {showLiveStrip ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <Link
            href="/quan-tri/truc-tiep"
            className="group flex items-center gap-3 rounded-2xl bg-white px-4 py-2.5 shadow-sm shadow-slate-900/[0.04] transition-all hover:shadow-md"
          >
            <span className="flex shrink-0 items-center gap-1.5">
              {store.liveEnabled ? (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
                </span>
              ) : (
                <Radio className="h-3.5 w-3.5 text-slate-400" />
              )}
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Trực tiếp</span>
            </span>
            <p className="min-w-0 flex-1 truncate text-xs text-slate-600">
              {scopedLiveEvents.length > 0
                ? `${scopedLiveEvents[0].title} · ${relTime(scopedLiveEvents[0].createdAt)}`
                : "Chưa có sự kiện trong phạm vi — mở bảng Trực tiếp & cảnh báo."}
            </p>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-500" />
          </Link>
        </motion.div>
      ) : null}

      {/* ===== Stats — số to đậm + icon squircle ===== */}
      <motion.div
        variants={listVariants}
        initial="hidden"
        animate="show"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          <StatCard key="a" label="Hoạt động cập nhật" value={activities.length} sub={`${activities.filter((a) => a.confirmStatus === "CONFIRMED").length} đã xác nhận`} icon={Activity} href="/quan-tri/hoat-dong" tone="red" />,
          <StatCard key="b" label="Nhiệm vụ đang theo dõi" value={assignments.filter((a) => a.orgUnitId === session?.orgUnitId).length} sub={myTasksRate !== null ? `Tiến độ trung bình ${formatPercent(myTasksRate)}` : undefined} icon={ClipboardList} href="/quan-tri/nhiem-vu" tone="blue" />,
          <StatCard key="c" label="Chờ xác nhận của bạn" value={pendingReviews.length} sub="Báo cáo từ cấp dưới" icon={CheckSquare} href="/quan-tri/nhiem-vu/xac-nhan" tone="amber" />,
          <StatCard key="d" label="Tin bài đã xuất bản" value={store.publishedPosts.filter((p) => p.status === "PUBLISHED").length} sub="Toàn hệ thống" icon={Megaphone} href="/quan-tri/xuat-ban" tone="violet" />,
        ].map((card, i) => (
          <motion.div key={i} variants={itemVariants}>{card}</motion.div>
        ))}
      </motion.div>

      {overdueCount > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-2xl bg-rose-50/80 p-4 ring-1 ring-rose-100"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
            <AlertTriangle className="h-4.5 w-4.5" strokeWidth={1.75} />
          </span>
          <div className="text-sm">
            <p className="font-semibold text-rose-800">{overdueCount} nhiệm vụ quá hạn</p>
            <p className="mt-0.5 text-xs font-light text-rose-500">Cần cập nhật kết quả hoặc liên hệ cấp trên để được hướng dẫn xử lý.</p>
          </div>
          <Link href="/quan-tri/nhiem-vu" className="ml-auto inline-flex shrink-0 items-center gap-1 self-center text-xs font-semibold text-rose-600 hover:underline">
            Xem <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
      ) : null}

      {/* ===== Nhắc việc tự động của đơn vị bạn ===== */}
      {myReminders.length > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-amber-50/80 p-4 ring-1 ring-amber-100"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <BellRing className="h-4.5 w-4.5" strokeWidth={1.75} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-800">Nhắc việc của đơn vị bạn ({myReminders.length})</p>
              <p className="mt-0.5 text-[11px] font-light text-amber-600">
                Nhắc việc tự sinh khi nhiệm vụ còn ≤ 3 ngày hoặc quá hạn; thông báo vào chuông chỉ gửi 1 lần.
              </p>
            </div>
          </div>
          <ul className="mt-3 divide-y divide-amber-100/70">
            {myReminders.slice(0, 5).map((r) => (
              <li key={`${r.assignment.id}-${r.kind}`}>
                <Link
                  href={`/quan-tri/nhiem-vu/phan-cong/${r.assignment.id}`}
                  className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-amber-100/50"
                >
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-amber-900">{r.taskTitle}</span>
                  <DeadlineBadge dueDate={r.assignment.dueDate} />
                  <span className="hidden w-16 shrink-0 text-right text-[11px] font-light text-amber-700 sm:block">
                    {formatPercent(r.assignment.completionRate)}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-amber-700 group-hover:underline">
                    Xử lý <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </motion.div>
      ) : null}

      {/* ===== Bento biểu đồ ===== */}
      <motion.div
        variants={listVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        className="grid gap-5 xl:grid-cols-2"
      >
        {[
          { title: "Hoạt động theo tháng", sub: "Nguồn: hoạt động đã cập nhật trong phạm vi của bạn", chart: <ActivitiesBarChart data={byMonth} /> },
          { title: "Tiến độ nhiệm vụ thi đua", sub: "Theo trạng thái của các lượt giao trong phạm vi", chart: <TaskProgressPie data={progressPie} /> },
          { title: "Lượt xem tin bài (tháng 9/2026)", sub: "post_view_daily — tổng hợp theo ngày", chart: <PostViewsAreaChart data={postViewDaily.map((d) => ({ name: d.date, value: d.views }))} /> },
          { title: "Điểm thi đua đơn vị cấp trường", sub: `Bộ tiêu chí ${store.activeCriteriaSet()?.name ?? ""}`, chart: <ScoresHorizontalBar data={topUnits} /> },
        ].map((c) => (
          <motion.div key={c.title} variants={itemVariants}>
            <Card className="h-full overflow-hidden">
              <CardHeader title={c.title} subtitle={c.sub} />
              <CardBody>{c.chart}</CardBody>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div>
        <SectionTitle title="Nhiệm vụ sắp đến hạn của đơn vị bạn" action={{ label: "Tất cả nhiệm vụ", href: "/quan-tri/nhiem-vu" }} />
        <Card>
          <CardBody className="p-0">
            {nearDeadline.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">Không có nhiệm vụ nào đang chờ.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {nearDeadline.map((a) => {
                  const task = store.tasks.find((t) => t.id === a.taskId);
                  return (
                    <li key={a.id}>
                      <Link href={`/quan-tri/nhiem-vu/phan-cong/${a.id}`} className="flex items-center gap-3 rounded-none px-5 py-3 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-slate-50">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                          <CalendarClock className="h-4 w-4" strokeWidth={1.5} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">{task?.title}</p>
                          <p className="text-[11px] font-light text-slate-400">Hạn {a.dueDate} · {formatPercent(a.completionRate)} hoàn thành</p>
                        </div>
                        <DeadlineBadge dueDate={a.dueDate} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
