"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, ClipboardList } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { TableWrap, THead, Th, Tr, Td, EmptyRow } from "@/components/ui/table";
import { TaskTree } from "@/components/dashboard/task-tree";
import { ProgressStatusBadge, ConfirmStatusBadge, DeadlineBadge } from "@/components/dashboard/status-badge";
import { Progress } from "@/components/dashboard/progress-bar";
import { formatPercent } from "@/lib/utils";

export default function NhiemVuPage() {
  const { session } = useAuth();
  const store = useStore();
  const [tab, setTab] = useState<"criterias" | "mine">("criterias");

  const scope = useMemo(() => (session ? store.scopeIds(session) : []), [session, store]);
  const activeSet = store.activeCriteriaSet();

  const myAssignments = useMemo(
    () =>
      store.taskAssignments
        .filter((a) => a.orgUnitId === session?.orgUnitId)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [store.taskAssignments, session]
  );

  const subordinateAssignments = useMemo(
    () =>
      store.taskAssignments.filter(
        (a) => scope.includes(a.orgUnitId) && a.orgUnitId !== session?.orgUnitId
      ),
    [store.taskAssignments, scope, session]
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif-display text-xl font-bold text-stone-900">Nhiệm vụ &amp; chỉ tiêu thi đua</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Bộ tiêu chí do Trung ương ban hành — phân bổ chỉ tiêu nhiều cấp từ tỉnh xuống trường.
        </p>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "criterias", label: "Bộ tiêu chí & cây nhiệm vụ" },
          { value: "mine", label: "Nhiệm vụ của đơn vị tôi", count: myAssignments.length },
        ]}
      />

      {tab === "criterias" ? (
        <>
          {activeSet ? (
            <Card>
              <CardHeader
                title={activeSet.name}
                subtitle={`Mã ${activeSet.code} · Năm ${activeSet.year} · Tổng tối đa ${activeSet.totalPoints} điểm · ${activeSet.status === "ACTIVE" ? "Đang áp dụng" : activeSet.status}`}
                action={<span className="rounded-full bg-doan-50 px-3 py-1 text-xs font-bold text-doan-700">{activeSet.totalPoints} điểm</span>}
              />
              <CardBody className="p-0">
                <TaskTree criteriaSetId={activeSet.id} scope={scope} />
              </CardBody>
            </Card>
          ) : null}

          {subordinateAssignments.length > 0 ? (
            <Card>
              <CardHeader
                title="Chỉ tiêu đã phân bổ cho cấp dưới"
                subtitle="Đối chiếu tổng chỉ tiêu phân bổ với chỉ tiêu được giao"
              />
              <CardBody className="p-0">
                <TableWrap>
                  <THead>
                    <tr>
                      <Th>Nhiệm vụ</Th>
                      <Th>Đơn vị nhận</Th>
                      <Th>Chỉ tiêu</Th>
                      <Th>Đã đạt</Th>
                      <Th>Tiến độ</Th>
                      <Th>Hạn</Th>
                      <Th>Xác nhận</Th>
                      <Th />
                    </tr>
                  </THead>
                  <tbody>
                    {subordinateAssignments.map((a) => {
                      const task = store.tasks.find((t) => t.id === a.taskId);
                      const targets = store.targetsOf(a.id);
                      return (
                        <Tr key={a.id}>
                          <Td className="max-w-56 truncate text-xs font-medium">{task?.title}</Td>
                          <Td className="text-xs">{store.orgName(a.orgUnitId)}</Td>
                          <Td className="text-xs">
                            {targets.map((t) => {
                              const m = store.taskMetrics.find((x) => x.id === t.taskMetricId);
                              return (
                                <div key={t.id}>
                                  {t.targetValue.toLocaleString("vi-VN")} {m?.unitOfMeasure}
                                </div>
                              );
                            })}
                          </Td>
                          <Td className="text-xs font-semibold text-doan-700">
                            {targets.map((t) => (
                              <div key={t.id}>
                                {t.achievedValue.toLocaleString("vi-VN")}
                              </div>
                            ))}
                          </Td>
                          <Td className="w-32">
                            <div className="flex items-center gap-2">
                              <Progress value={a.completionRate} className="w-16" />
                              <span className="text-xs">{formatPercent(a.completionRate)}</span>
                            </div>
                            <ProgressStatusBadge status={a.progressStatus} />
                          </Td>
                          <Td>
                            <DeadlineBadge dueDate={a.dueDate} />
                          </Td>
                          <Td><ConfirmStatusBadge status={a.confirmStatus} /></Td>
                          <Td>
                            <Link
                              href={`/quan-tri/nhiem-vu/phan-cong/${a.id}`}
                              className="text-xs font-medium text-doan-600 hover:underline"
                            >
                              Chi tiết
                            </Link>
                          </Td>
                        </Tr>
                      );
                    })}
                    {subordinateAssignments.length === 0 ? (
                      <EmptyRow colSpan={8} message="Bạn chưa phân bổ nhiệm vụ nào cho cấp dưới." />
                    ) : null}
                  </tbody>
                </TableWrap>
              </CardBody>
            </Card>
          ) : null}
        </>
      ) : (
        <Card>
          <CardHeader
            title="Nhiệm vụ đơn vị bạn nhận"
            subtitle="Cập nhật kết quả định kỳ — lịch sử báo cáo được lưu vết (append-only)"
          />
          <CardBody className="p-0">
            {myAssignments.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <ClipboardList className="h-8 w-8 text-stone-300" />
                <p className="mt-3 text-sm text-stone-400">Đơn vị của bạn chưa nhận nhiệm vụ nào.</p>
              </div>
            ) : (
              <ul className="divide-y divide-stone-100">
                {myAssignments.map((a) => {
                  const task = store.tasks.find((t) => t.id === a.taskId);
                  const targets = store.targetsOf(a.id);
                  return (
                    <li key={a.id}>
                      <Link href={`/quan-tri/nhiem-vu/phan-cong/${a.id}`} className="block px-5 py-4 hover:bg-stone-50">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="flex-1 text-sm font-semibold text-stone-900">{task?.title}</p>
                          <DeadlineBadge dueDate={a.dueDate} />
                          <ProgressStatusBadge status={a.progressStatus} />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-stone-500">
                          <span>Giao bởi: {store.orgName(a.assignedByOrgUnitId)}</span>
                          {targets.map((t) => {
                            const m = store.taskMetrics.find((x) => x.id === t.taskMetricId);
                            return (
                              <span key={t.id}>
                                {m?.name}: <b className="text-stone-700">{t.achievedValue.toLocaleString("vi-VN")}/{t.targetValue.toLocaleString("vi-VN")}</b> {m?.unitOfMeasure}
                              </span>
                            );
                          })}
                        </div>
                        <Progress value={a.completionRate} className="mt-2.5" />
                        <p className="mt-1 text-right text-[11px] font-medium text-stone-500">{formatPercent(a.completionRate)} hoàn thành</p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
