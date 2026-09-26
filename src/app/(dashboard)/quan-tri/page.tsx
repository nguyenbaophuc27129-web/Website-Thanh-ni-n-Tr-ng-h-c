"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Activity, ClipboardList, CheckSquare, Megaphone, AlertTriangle, ArrowRight, CalendarClock,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { StatCard, SectionTitle } from "@/components/dashboard/stat-card";
import { DeadlineBadge } from "@/components/dashboard/status-badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ActivitiesBarChart, TaskProgressPie, PostViewsAreaChart, ScoresHorizontalBar } from "@/components/charts/charts";
import { postViewDaily } from "@/data/published-posts";
import { formatPercent } from "@/lib/utils";

export default function TongQuanPage() {
  const { session } = useAuth();
  const store = useStore();

  const scope = useMemo(() => (session ? store.scopeIds(session) : []), [session, store]);

  const activities = useMemo(
    () => store.activities.filter((a) => scope.includes(a.orgUnitId)),
    [store.activities, scope]
  );
  const assignments = useMemo(
    () => store.taskAssignments.filter((a) => scope.includes(a.orgUnitId)),
    [store.taskAssignments, scope]
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif-display text-xl font-bold text-stone-900">Xin chào, {session?.contactPerson}</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Tổng quan hoạt động và nhiệm vụ thi đua của {session?.orgUnitName}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Hoạt động cập nhật" value={activities.length} sub={`${activities.filter((a) => a.confirmStatus === "CONFIRMED").length} đã xác nhận`} icon={Activity} href="/quan-tri/hoat-dong" tone="red" />
        <StatCard label="Nhiệm vụ đang theo dõi" value={assignments.filter((a) => a.orgUnitId === session?.orgUnitId).length} sub={myTasksRate !== null ? `Tiến độ trung bình ${formatPercent(myTasksRate)}` : undefined} icon={ClipboardList} href="/quan-tri/nhiem-vu" tone="blue" />
        <StatCard label="Chờ xác nhận của bạn" value={pendingReviews.length} sub="Báo cáo từ cấp dưới" icon={CheckSquare} href="/quan-tri/nhiem-vu/xac-nhan" tone="amber" />
        <StatCard label="Tin bài đã xuất bản" value={store.publishedPosts.filter((p) => p.status === "PUBLISHED").length} sub="Toàn hệ thống" icon={Megaphone} href="/quan-tri/xuat-ban" tone="violet" />
      </div>

      {overdueCount > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div className="text-sm">
            <p className="font-semibold text-red-800">{overdueCount} nhiệm vụ quá hạn</p>
            <p className="text-xs text-red-600">Cần cập nhật kết quả hoặc liên hệ cấp trên để được hướng dẫn xử lý.</p>
          </div>
          <Link href="/quan-tri/nhiem-vu" className="ml-auto inline-flex shrink-0 items-center gap-1 self-center text-xs font-semibold text-red-700 hover:underline">
            Xem <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader title="Hoạt động theo tháng" subtitle="Nguồn: hoạt động đã cập nhật trong phạm vi của bạn" />
          <CardBody><ActivitiesBarChart data={byMonth} /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Tiến độ nhiệm vụ thi đua" subtitle="Theo trạng thái của các lượt giao trong phạm vi" />
          <CardBody><TaskProgressPie data={progressPie} /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Lượt xem tin bài (tháng 9/2026)" subtitle="post_view_daily — tổng hợp theo ngày" />
          <CardBody><PostViewsAreaChart data={postViewDaily.map((d) => ({ name: d.date, value: d.views }))} /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Điểm thi đua đơn vị cấp trường" subtitle={`Bộ tiêu chí ${store.activeCriteriaSet()?.name ?? ""}`} />
          <CardBody><ScoresHorizontalBar data={topUnits} /></CardBody>
        </Card>
      </div>

      <div>
        <SectionTitle title="Nhiệm vụ sắp đến hạn của đơn vị bạn" action={{ label: "Tất cả nhiệm vụ", href: "/quan-tri/nhiem-vu" }} />
        <Card>
          <CardBody className="p-0">
            {nearDeadline.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-stone-400">Không có nhiệm vụ nào đang chờ.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {nearDeadline.map((a) => {
                  const task = store.tasks.find((t) => t.id === a.taskId);
                  return (
                    <li key={a.id}>
                      <Link href={`/quan-tri/nhiem-vu/phan-cong/${a.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-stone-50">
                        <CalendarClock className="h-4 w-4 shrink-0 text-stone-400" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-stone-800">{task?.title}</p>
                          <p className="text-[11px] text-stone-400">Hạn {a.dueDate} · {formatPercent(a.completionRate)} hoàn thành</p>
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
