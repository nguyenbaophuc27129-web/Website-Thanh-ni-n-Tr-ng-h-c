"use client";

import { useMemo, useState } from "react";
import { BarChart3, Filter } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select, Field } from "@/components/ui/input";
import { MockExportButton } from "@/components/dashboard/mock-export-button";
import { SectionTitle } from "@/components/dashboard/stat-card";
import {
  ActivitiesBarChart, TaskProgressPie, PostViewsAreaChart, ScoresHorizontalBar, TrendLineChart,
} from "@/components/charts/charts";
import { postViewDaily } from "@/data/published-posts";

const MONTHS = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"];

export default function ThongKePage() {
  const { session } = useAuth();
  const store = useStore();
  const scope = useMemo(() => (session ? store.scopeIds(session) : []), [session, store]);
  const [year, setYear] = useState("2026");
  const [quarter, setQuarter] = useState("all");

  const scopeUnits = useMemo(
    () => store.orgUnits.filter((u) => scope.includes(u.id) && u.orgLevel >= 3),
    [store.orgUnits, scope]
  );

  const inPeriod = (iso: string) => {
    if (!iso.startsWith(year)) return false;
    if (quarter === "all") return true;
    const month = Number(iso.slice(5, 7));
    return month >= (Number(quarter) - 1) * 3 + 1 && month <= Number(quarter) * 3;
  };

  const activitiesByUnit = useMemo(
    () =>
      scopeUnits.map((u) => ({
        name: u.shortName,
        value: store.activities.filter((a) => a.orgUnitId === u.id && inPeriod(a.startDate)).length,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scopeUnits, store.activities, year, quarter]
  );

  const activityTrend = useMemo(() => {
    const months = quarter === "all" ? MONTHS : MONTHS.slice((Number(quarter) - 1) * 3, Number(quarter) * 3);
    return months.map((m, i) => {
      const monthNo = quarter === "all" ? i + 1 : (Number(quarter) - 1) * 3 + i + 1;
      const mm = monthNo.toString().padStart(2, "0");
      return {
        name: m,
        value: store.activities.filter((a) => a.startDate.startsWith(`${year}-${mm}`)).length,
      };
    });
  }, [store.activities, year, quarter]);

  const progressPie = useMemo(() => {
    const asgs = store.taskAssignments.filter((a) => scope.includes(a.orgUnitId));
    return (["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "OVERDUE"] as const).map((s) => ({
      name: { NOT_STARTED: "Chưa bắt đầu", IN_PROGRESS: "Đang làm", COMPLETED: "Hoàn thành", OVERDUE: "Quá hạn" }[s],
      value: asgs.filter((a) => a.progressStatus === s).length,
    }));
  }, [store.taskAssignments, scope]);

  const scoresByUnit = useMemo(
    () =>
      scopeUnits
        .map((u) => {
          const list = store.scores.filter((s) => s.orgUnitId === u.id);
          const avg = list.length > 0 ? list.reduce((sum, s) => sum + s.points, 0) / list.length : 0;
          return { name: u.shortName, value: Math.round(avg * 10) / 10 };
        })
        .filter((d) => d.value > 0)
        .sort((a, b) => b.value - a.value),
    [scopeUnits, store.scores]
  );

  const totals = useMemo(() => {
    const acts = store.activities.filter((a) => scope.includes(a.orgUnitId) && inPeriod(a.startDate));
    return {
      activities: acts.length,
      participants: acts.reduce((s, a) => s + (a.participantCount ?? 0), 0),
      posts: store.publishedPosts.filter((p) => p.status === "PUBLISHED").length,
      views: store.publishedPosts.reduce((s, p) => s + p.viewCount, 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.activities, store.publishedPosts, scope, year, quarter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif-display text-xl font-bold text-stone-900">Thống kê báo cáo</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Số liệu tổng hợp trong phạm vi của bạn theo kỳ, có thể xuất Excel phục vụ lãnh đạo.
          </p>
        </div>
        <MockExportButton fileName={`thong-ke-${year}`} format="XLSX" />
      </div>

      <Card>
        <CardBody className="flex flex-wrap items-end gap-4">
          <Field label="Năm" className="w-32">
            <Select value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </Select>
          </Field>
          <Field label="Kỳ" className="w-44">
            <Select value={quarter} onChange={(e) => setQuarter(e.target.value)}>
              <option value="all">Cả năm</option>
              <option value="1">Quý I</option>
              <option value="2">Quý II</option>
              <option value="3">Quý III</option>
              <option value="4">Quý IV</option>
            </Select>
          </Field>
          <p className="flex items-center gap-1.5 pb-2 text-xs text-stone-400">
            <Filter className="h-3.5 w-3.5" /> Phạm vi: {session ? store.orgName(session.orgUnitId) : ""} và cấp dưới
          </p>
        </CardBody>
      </Card>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "Hoạt động trong kỳ", value: totals.activities },
          { label: "Lượt tham gia", value: totals.participants.toLocaleString("vi-VN") },
          { label: "Tin bài đã đăng", value: totals.posts },
          { label: "Lượt xem tin bài", value: totals.views.toLocaleString("vi-VN") },
        ].map((s) => (
          <Card key={s.label}>
            <CardBody className="p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{s.label}</p>
              <p className="mt-1 font-serif-display text-2xl font-bold text-doan-700">{s.value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Hoạt động theo đơn vị" subtitle={`${year}${quarter !== "all" ? ` · Quý ${quarter}` : ""}`} />
          <CardBody>
            <ActivitiesBarChart data={activitiesByUnit} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Xu hướng hoạt động theo tháng" />
          <CardBody>
            <TrendLineChart data={activityTrend} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Trạng thái nhiệm vụ trong phạm vi" />
          <CardBody>
            <TaskProgressPie data={progressPie} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Điểm trung bình theo đơn vị" subtitle="Trung bình điểm các tiêu chí đã chấm" />
          <CardBody>
            <ScoresHorizontalBar data={scoresByUnit} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Lượt xem tin bài (tháng 9/2026)" />
        <CardBody>
          <PostViewsAreaChart data={postViewDaily.map((d) => ({ name: d.date, value: d.views }))} />
        </CardBody>
      </Card>

      <p className="flex items-center gap-1.5 text-[11px] text-stone-400">
        <BarChart3 className="h-3.5 w-3.5" />
        Số liệu sinh từ mock data của prototype — khi tích hợp CSDL sẽ truy vấn trực tiếp từ bảng activities, task_assignments, scores, published_posts.
      </p>
    </div>
  );
}
