"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft, Target, Plus, History, ClipboardCheck, Trash2, Percent, TriangleAlert,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea, Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { TableWrap, THead, Th, Tr, Td, EmptyRow } from "@/components/ui/table";
import { ProgressStatusBadge, ConfirmStatusBadge, DeadlineBadge } from "@/components/dashboard/status-badge";
import { Progress } from "@/components/dashboard/progress-bar";
import { METHOD_LABEL } from "@/components/dashboard/task-tree";
import { formatDateTime, formatPercent, formatDate } from "@/lib/utils";

export default function PhanCongChiTietPage() {
  const params = useParams<{ id: string }>();
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();

  const assignment = useMemo(
    () => store.taskAssignments.find((a) => a.id === Number(params.id)),
    [store.taskAssignments, params.id]
  );

  const [resultValues, setResultValues] = useState<Record<number, string>>({});
  const [resultNote, setResultNote] = useState("");
  const [distributeOpen, setDistributeOpen] = useState(false);
  const [childUnit, setChildUnit] = useState("");
  const [childDue, setChildDue] = useState("");
  const [childTargets, setChildTargets] = useState<Record<number, string>>({});
  const [childNote, setChildNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!assignment) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-stone-500">Không tìm thấy lượt giao nhiệm vụ.</p>
        <Link href="/quan-tri/nhiem-vu" className="mt-2 inline-block text-sm font-medium text-doan-600 hover:underline">Về danh sách</Link>
      </div>
    );
  }

  const task = store.tasks.find((t) => t.id === assignment.taskId);
  const targets = store.targetsOf(assignment.id);
  const results = store.resultsOf(assignment.id).sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
  const reviews = store.reviewsOf(assignment.id).sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));
  const children = store.taskAssignments.filter((a) => a.parentAssignmentId === assignment.id);
  const parent = assignment.parentAssignmentId
    ? store.taskAssignments.find((a) => a.id === assignment.parentAssignmentId)
    : null;

  const isOwner = session?.orgUnitId === assignment.orgUnitId;
  const scope = session ? store.scopeIds(session) : [];
  const isAssigner = session?.orgUnitId === assignment.assignedByOrgUnitId;
  const subordinateUnits = store.orgUnits.filter(
    (u) => session && u.parentId === session.orgUnitId && u.isActive && !store.taskAssignments.some((a) => a.taskId === assignment.taskId && a.orgUnitId === u.id)
  );

  /* Đối chiếu tổng phân bổ với chỉ tiêu nhận */
  const distributeCheck = targets.map((t) => {
    const metric = store.taskMetrics.find((m) => m.id === t.taskMetricId);
    const childSum = children.reduce((sum, c) => {
      const ct = store.targetsOf(c.id).find((x) => x.taskMetricId === t.taskMetricId);
      return sum + (ct?.targetValue ?? 0);
    }, 0);
    return { metric, target: t.targetValue, childSum, diff: t.targetValue - childSum };
  });

  const canUpdate = isOwner && assignment.confirmStatus !== "CONFIRMED" ? true : isOwner && assignment.confirmStatus === "CONFIRMED" ? true : false;

  const submitResult = () => {
    if (!session) return;
    const values = targets
      .map((t) => ({ assignmentTargetId: t.id, reportedValue: Number(resultValues[t.id] ?? "") }))
      .filter((v) => !isNaN(v.reportedValue) && resultValues[v.assignmentTargetId] !== undefined && resultValues[v.assignmentTargetId] !== "");
    if (values.length === 0) {
      toast("Nhập ít nhất một chỉ tiêu cần báo cáo.", "warning");
      return;
    }
    store.updateResult(session, assignment.id, values, resultNote.trim() || undefined);
    toast("Đã ghi nhận kết quả báo cáo. Lịch sử cập nhật được lưu vết, chờ cấp trên xác nhận.");
    setResultValues({});
    setResultNote("");
  };

  const openDistribute = () => {
    if (targets.length === 0) return;
    setChildUnit(subordinateUnits[0]?.id.toString() ?? "");
    setChildDue(assignment.dueDate);
    const half: Record<number, string> = {};
    targets.forEach((t) => {
      const distributed = children.reduce((s, c) => {
        const ct = store.targetsOf(c.id).find((x) => x.taskMetricId === t.taskMetricId);
        return s + (ct?.targetValue ?? 0);
      }, 0);
      half[t.taskMetricId] = String(Math.max(0, t.targetValue - distributed));
    });
    setChildTargets(half);
    setChildNote("");
    setDistributeOpen(true);
  };

  const submitDistribute = () => {
    if (!session || !childUnit) return;
    const values = targets
      .map((t) => ({ taskMetricId: t.taskMetricId, targetValue: Number(childTargets[t.taskMetricId] ?? "0") }))
      .filter((v) => !isNaN(v.targetValue) && v.targetValue >= 0);
    store.distributeAssignment(session, assignment.taskId, assignment.id, Number(childUnit), childDue, values, childNote.trim() || undefined);
    toast("Đã phân bổ nhiệm vụ xuống đơn vị cấp dưới và gửi thông báo.");
    setDistributeOpen(false);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/quan-tri/nhiem-vu" className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-doan-600">
          <ArrowLeft className="h-3.5 w-3.5" /> Nhiệm vụ &amp; chỉ tiêu
        </Link>
        {isAssigner && assignment.parentAssignmentId !== null ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
          >
            <Trash2 className="h-3.5 w-3.5" /> Thu hồi phân bổ (mock)
          </button>
        ) : null}
      </div>

      {/* Header card */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center gap-2">
            <ProgressStatusBadge status={assignment.progressStatus} />
            <ConfirmStatusBadge status={assignment.confirmStatus} />
            <DeadlineBadge dueDate={assignment.dueDate} />
          </div>
          <h1 className="mt-3 font-serif-display text-lg font-bold text-stone-900">{task?.title}</h1>
          <div className="mt-2 grid gap-x-8 gap-y-1 text-xs text-stone-500 sm:grid-cols-2 lg:grid-cols-3">
            <p>Đơn vị nhận: <b className="text-stone-700">{store.orgName(assignment.orgUnitId)}</b></p>
            <p>Đơn vị giao: <b className="text-stone-700">{store.orgName(assignment.assignedByOrgUnitId)}</b></p>
            <p>Phương thức chấm: <b className="text-stone-700">{task ? METHOD_LABEL[task.scoringMethod] : "—"}</b></p>
            <p>Hạn thực hiện: <b className="text-stone-700">{formatDate(assignment.dueDate)}</b></p>
            <p>Giao lúc: <b className="text-stone-700">{formatDateTime(assignment.assignedAt)}</b></p>
            <p>Tiến độ: <b className="text-doan-700">{formatPercent(assignment.completionRate)}</b></p>
          </div>
          {task?.maxPoints ? (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-doan-50 px-2.5 py-1 text-xs font-medium text-doan-700">
              <Percent className="h-3.5 w-3.5" /> Tiêu chí tối đa {task.maxPoints} điểm
            </p>
          ) : null}
          {parent ? (
            <p className="mt-3 text-xs text-stone-500">
              Thuộc lượt giao của{" "}
              <Link href={`/quan-tri/nhiem-vu/phan-cong/${parent.id}`} className="font-medium text-doan-600 hover:underline">
                {store.orgName(parent.assignedByOrgUnitId)} → {store.orgName(parent.orgUnitId)}
              </Link>
            </p>
          ) : null}
        </CardBody>
      </Card>

      {/* Targets */}
      <Card>
        <CardHeader
          title="Chỉ tiêu & kết quả"
          subtitle="achieved_value được cập nhật từ lần báo cáo gần nhất; task_results lưu toàn bộ lịch sử."
        />
        <CardBody className="p-0">
          <TableWrap>
            <THead>
                <Th>Chỉ tiêu</Th>
                <Th>Đơn vị tính</Th>
                <Th>Chỉ tiêu giao</Th>
                <Th>Đã đạt</Th>
                <Th className="w-40">Tiến độ</Th>
            </THead>
            <tbody>
              {targets.map((t) => {
                const m = store.taskMetrics.find((x) => x.id === t.taskMetricId);
                const rate = t.targetValue > 0 ? Math.min(100, (t.achievedValue / t.targetValue) * 100) : 100;
                return (
                  <Tr key={t.id}>
                    <Td className="text-xs font-medium">{m?.name}</Td>
                    <Td className="text-xs text-stone-400">{m?.unitOfMeasure}</Td>
                    <Td className="text-xs">{t.targetValue.toLocaleString("vi-VN")}</Td>
                    <Td className="text-xs font-bold text-doan-700">{t.achievedValue.toLocaleString("vi-VN")}</Td>
                    <Td>
                      <Progress value={rate} />
                      <p className="mt-1 text-[11px] text-stone-500">{formatPercent(rate)}</p>
                    </Td>
                  </Tr>
                );
              })}
              {targets.length === 0 ? <EmptyRow colSpan={5} message="Nhiệm vụ không có chỉ tiêu định lượng." /> : null}
            </tbody>
          </TableWrap>
        </CardBody>
      </Card>

      {isOwner && targets.length > 0 ? (
        <Card>
          <CardHeader
            title="Cập nhật kết quả"
            subtitle="Mỗi lần cập nhật tạo một bản ghi mới trong lịch sử (append-only)."
          />
          <CardBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {targets.map((t) => {
                const m = store.taskMetrics.find((x) => x.id === t.taskMetricId);
                return (
                  <Field key={t.id} label={`${m?.name} (hiện tại ${t.achievedValue.toLocaleString("vi-VN")})`}>
                    <Input
                      type="number"
                      min={0}
                      value={resultValues[t.id] ?? ""}
                      onChange={(e) => setResultValues((v) => ({ ...v, [t.id]: e.target.value }))}
                      placeholder={`Nhập số ${m?.unitOfMeasure}`}
                    />
                  </Field>
                );
              })}
            </div>
            <Field label="Ghi chú báo cáo" hint="VD: Bao gồm 2 hoạt động tháng 9.">
              <Textarea value={resultNote} onChange={(e) => setResultNote(e.target.value)} rows={2} />
            </Field>
            <div className="flex justify-end">
              <Button onClick={submitResult}>
                <ClipboardCheck className="h-4 w-4" /> Gửi báo cáo kết quả
              </Button>
            </div>
          </CardBody>
        </Card>
      ) : null}
      {isOwner && targets.length === 0 && (
        <Card>
          <CardBody className="text-sm text-stone-500">
            Nhiệm vụ này không có chỉ tiêu định lượng — kết quả được xác nhận qua hoạt động minh chứng và chấm điểm của cấp trên.
          </CardBody>
        </Card>
      )}
      {!canUpdate && <span className="hidden">{String(canUpdate)}</span>}

      {/* Assigner: distribute + check */}
      {isAssigner ? (
        <Card>
          <CardHeader
            title="Phân bổ chỉ tiêu xuống cấp dưới"
            subtitle="Tổng chỉ tiêu phân bổ không được vượt chỉ tiêu bạn nhận."
            action={
              subordinateUnits.length > 0 ? (
                <Button size="sm" onClick={openDistribute}>
                  <Plus className="h-3.5 w-3.5" /> Phân bổ thêm
                </Button>
              ) : undefined
            }
          />
          <CardBody className="space-y-4">
            {/* Đối chiếu */}
            <div className="rounded-lg bg-stone-50 p-3.5">
              <p className="mb-2 text-xs font-semibold text-stone-700">Đối chiếu tổng phân bổ</p>
              <div className="space-y-1.5">
                {distributeCheck.map((d, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="min-w-40 text-stone-500">{d.metric?.name}:</span>
                    <span>đã chia <b>{d.childSum.toLocaleString("vi-VN")}</b> / chỉ tiêu <b>{d.target.toLocaleString("vi-VN")}</b></span>
                    {d.diff === 0 ? (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">ĐÃ CHIA HẾT</span>
                    ) : d.diff > 0 ? (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">CÒN LẠI {d.diff.toLocaleString("vi-VN")}</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                        <TriangleAlert className="h-3 w-3" /> VƯỢT {Math.abs(d.diff).toLocaleString("vi-VN")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Children list */}
            {children.length > 0 ? (
              <TableWrap>
                <THead>
                    <Th>Đơn vị nhận</Th>
                    <Th>Chỉ tiêu</Th>
                    <Th>Hạn</Th>
                    <Th>Tiến độ</Th>
                    <Th>Xác nhận</Th>
                    <Th />
                </THead>
                <tbody>
                  {children.map((c) => (
                    <Tr key={c.id}>
                      <Td className="text-xs font-medium">{store.orgName(c.orgUnitId)}</Td>
                      <Td className="text-xs">
                        {store.targetsOf(c.id).map((t) => {
                          const m = store.taskMetrics.find((x) => x.id === t.taskMetricId);
                          return <div key={t.id}>{t.targetValue.toLocaleString("vi-VN")} {m?.unitOfMeasure}</div>;
                        })}
                      </Td>
                      <Td className="text-xs">{formatDate(c.dueDate)}</Td>
                      <Td className="text-xs">{formatPercent(c.completionRate)}</Td>
                      <Td><ConfirmStatusBadge status={c.confirmStatus} /></Td>
                      <Td>
                        <Link href={`/quan-tri/nhiem-vu/phan-cong/${c.id}`} className="text-xs font-medium text-doan-600 hover:underline">
                          Chi tiết
                        </Link>
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </TableWrap>
            ) : (
              <p className="rounded-lg border border-dashed border-stone-300 px-4 py-5 text-center text-xs text-stone-400">
                Chưa phân bổ cho đơn vị nào.
              </p>
            )}
          </CardBody>
        </Card>
      ) : null}

      {/* Result history */}
      <Card>
        <CardHeader title="Lịch sử cập nhật kết quả" subtitle="task_results — append-only" />
        <CardBody className="p-0">
          <ul className="divide-y divide-stone-100">
            {results.map((r) => {
              const t = targets.find((x) => x.id === r.assignmentTargetId);
              const m = store.taskMetrics.find((x) => x.id === t?.taskMetricId);
              const acc = store.accounts.find((a) => a.id === r.reportedByAccountId);
              return (
                <li key={r.id} className="flex items-start gap-3 px-5 py-3">
                  <History className="mt-0.5 h-4 w-4 shrink-0 text-stone-300" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs">
                      <b>{m?.name ?? "—"}</b> = {r.reportedValue.toLocaleString("vi-VN")} {m?.unitOfMeasure}
                      <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500">
                        {r.dataSource === "MANUAL" ? "Thủ công" : "Tự động"}
                      </span>
                    </p>
                    {r.reportNote ? <p className="mt-0.5 text-[11px] text-stone-500">Ghi chú: {r.reportNote}</p> : null}
                    <p className="mt-0.5 text-[10px] text-stone-400">
                      {acc?.username ?? "hệ thống"} · {formatDateTime(r.reportedAt)}
                    </p>
                  </div>
                </li>
              );
            })}
            {results.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-stone-400">Chưa có lịch sử báo cáo.</li>
            ) : null}
          </ul>
        </CardBody>
      </Card>

      {/* Review history */}
      <Card>
        <CardHeader title="Lịch sử xác nhận của cấp trên" subtitle="assignment_reviews" />
        <CardBody className="p-0">
          <ul className="divide-y divide-stone-100">
            {reviews.map((r) => {
              const acc = store.accounts.find((a) => a.id === r.reviewerAccountId);
              return (
                <li key={r.id} className="px-5 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <ConfirmStatusBadge
                      status={r.action === "CONFIRM" ? "CONFIRMED" : r.action === "REQUEST_INFO" ? "NEEDS_INFO" : "REJECTED"}
                    />
                    <span className="text-xs font-medium text-stone-700">{acc?.username ?? "—"}</span>
                    <span className="text-[10px] text-stone-400">{formatDateTime(r.reviewedAt)}</span>
                  </div>
                  {r.note ? <p className="mt-1 text-xs text-stone-600">{r.note}</p> : null}
                </li>
              );
            })}
            {reviews.length === 0 ? (
              <li className="px-5 py-8 text-center text-sm text-stone-400">Chưa có lịch sử xác nhận.</li>
            ) : null}
          </ul>
        </CardBody>
      </Card>

      {/* Distribute modal */}
      <Modal
        open={distributeOpen}
        onClose={() => setDistributeOpen(false)}
        title="Phân bổ nhiệm vụ cho đơn vị cấp dưới"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setDistributeOpen(false)}>Hủy</Button>
            <Button onClick={submitDistribute} disabled={!childUnit}>
              <Target className="h-4 w-4" /> Giao nhiệm vụ
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Đơn vị nhận" required>
            <Select value={childUnit} onChange={(e) => setChildUnit(e.target.value)}>
              <option value="">— Chọn đơn vị —</option>
              {subordinateUnits.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Hạn riêng" hint="Có thể sớm hơn hạn gốc. Quá hạn sẽ thành đèn đỏ ở bảng Trực tiếp.">
            <Input type="date" value={childDue} onChange={(e) => setChildDue(e.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            {targets.map((t) => {
              const m = store.taskMetrics.find((x) => x.id === t.taskMetricId);
              const distributed = children.reduce((s, c) => {
                const ct = store.targetsOf(c.id).find((x) => x.taskMetricId === t.taskMetricId);
                return s + (ct?.targetValue ?? 0);
              }, 0);
              return (
                <Field
                  key={t.taskMetricId}
                  label={`${m?.name} (còn lại: ${(t.targetValue - distributed).toLocaleString("vi-VN")} ${m?.unitOfMeasure})`}
                >
                  <Input
                    type="number"
                    min={0}
                    value={childTargets[t.taskMetricId] ?? ""}
                    onChange={(e) => setChildTargets((v) => ({ ...v, [t.taskMetricId]: e.target.value }))}
                  />
                </Field>
              );
            })}
          </div>
          <Field label="Ghi chú kèm theo">
            <Textarea value={childNote} onChange={(e) => setChildNote(e.target.value)} rows={2} placeholder="Yêu cầu riêng với đơn vị nhận…" />
          </Field>
        </div>
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Thu hồi phân bổ"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Hủy</Button>
            <Button variant="danger" onClick={() => { setConfirmDelete(false); toast("Chức năng thu hồi chỉ mô phỏng trong bản demo.", "info"); }}>
              Xác nhận thu hồi
            </Button>
          </>
        }
      >
        <p className="text-sm text-stone-600">
          Trong hệ thống thật, chỉ lượt giao chưa có dữ liệu con mới được thu hồi. Bản demo chỉ hiển thị cảnh báo.
        </p>
      </Modal>
    </div>
  );
}
