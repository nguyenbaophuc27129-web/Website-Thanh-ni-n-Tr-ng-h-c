"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Target, Plus } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Progress } from "@/components/dashboard/progress-bar";
import type { Task } from "@/types";
import { formatPercent } from "@/lib/utils";

export const METHOD_LABEL: Record<string, string> = {
  AUTO_AGGREGATE: "Tự động tổng hợp",
  MANUAL_CONFIRM: "Xác nhận thủ công",
  EXPERT_REVIEW: "Hội đồng chuyên gia",
  OTHER: "—",
};

/** Cây nhiệm vụ phân cấp I → I.1 kèm thông tin giao trong phạm vi + nút phân công xuống cấp dưới */
export function TaskTree({ criteriaSetId, scope }: { criteriaSetId: number; scope: number[] }) {
  const store = useStore();
  const { session } = useAuth();
  const { toast } = useToast();
  const { tasks, taskAssignments, orgUnits } = store;
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  // Modal phân công chỉ tiêu
  const [assignTask, setAssignTask] = useState<Task | null>(null);
  const [assignUnit, setAssignUnit] = useState("");
  const [assignDue, setAssignDue] = useState("");
  const [assignValues, setAssignValues] = useState<Record<number, string>>({});
  const [assignNote, setAssignNote] = useState("");

  const roots = useMemo(
    () => tasks.filter((t) => t.criteriaSetId === criteriaSetId && t.parentTaskId === null).sort((a, b) => a.displayOrder - b.displayOrder),
    [tasks, criteriaSetId]
  );

  /** Đơn vị nhận phân công = con trực tiếp của đơn vị tôi (TW→tỉnh, tỉnh→phường, phường→trường) */
  const childUnits = useMemo(
    () => (session ? orgUnits.filter((u) => u.parentId === session.orgUnitId && u.isActive) : []),
    [orgUnits, session]
  );
  const canAssign = Boolean(session && session.role !== "BIEN_TAP_VIEN" && childUnits.length > 0);

  const childrenOf = (parentId: number) =>
    tasks.filter((t) => t.parentTaskId === parentId).sort((a, b) => a.displayOrder - b.displayOrder);

  const toggle = (id: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const assignmentInfo = (task: Task) => {
    const mine = taskAssignments.filter((a) => a.taskId === task.id && scope.includes(a.orgUnitId));
    if (mine.length === 0) return null;
    const avg = mine.reduce((s, a) => s + a.completionRate, 0) / mine.length;
    return { mine, avg };
  };

  const openAssign = (task: Task) => {
    setAssignTask(task);
    setAssignUnit("");
    setAssignDue(task.dueDate ?? "");
    setAssignValues({});
    setAssignNote("");
  };

  const submitAssign = () => {
    if (!assignTask || !session) return;
    if (!assignUnit) {
      toast("Chọn đơn vị nhận chỉ tiêu.", "warning");
      return;
    }
    if (!assignDue) {
      toast("Chọn hạn hoàn thành.", "warning");
      return;
    }
    const metrics = store.taskMetricsOf(assignTask.id);
    const values = metrics
      .map((m) => ({ taskMetricId: m.id, targetValue: Number(assignValues[m.id] ?? "0") }))
      .filter((v) => !isNaN(v.targetValue));
    if (metrics.length > 0 && (values.length === 0 || values.some((v) => v.targetValue <= 0 || isNaN(v.targetValue)))) {
      toast("Nhập chỉ tiêu là số > 0 cho từng đại lượng.", "warning");
      return;
    }
    store.distributeAssignment(
      session, assignTask.id, null, Number(assignUnit), assignDue, values, assignNote.trim() || undefined
    );
    toast(`Đã giao chỉ tiêu cho ${store.orgName(Number(assignUnit))} — đơn vị nhận được thông báo ngay.`);
    setAssignTask(null);
  };

  const renderTask = (task: Task, depth: number) => {
    const children = childrenOf(task.id);
    const info = assignmentInfo(task);
    const isGroup = task.taskKind === "TASK";
    const open = !collapsed.has(task.id);

    return (
      <div key={task.id}>
        <div
          className={`flex flex-wrap items-center gap-2.5 px-4 py-3 ${depth > 0 ? "border-t border-stone-50" : "border-t border-stone-100"}`}
          style={{ paddingLeft: `${16 + depth * 24}px` }}
        >
          {children.length > 0 ? (
            <button onClick={() => toggle(task.id)} className="rounded p-0.5 text-stone-400 hover:bg-stone-100" aria-label="Mở rộng">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-5" />
          )}

          <div className="min-w-0 flex-1">
            <p className={`text-sm ${isGroup ? "font-bold text-stone-900" : "font-medium text-stone-800"}`}>
              {task.title}
            </p>
            {!isGroup ? (
              <p className="mt-0.5 text-[11px] text-stone-400">
                {METHOD_LABEL[task.scoringMethod]} · Hạn {task.dueDate ?? "—"}
              </p>
            ) : null}
          </div>

          {!isGroup ? (
            <Badge tone={task.maxPoints >= 20 ? "red" : task.maxPoints >= 15 ? "yellow" : "gray"}>
              {task.maxPoints} điểm
            </Badge>
          ) : null}

          {info ? (
            <div className="w-40">
              <div className="flex items-center justify-between text-[10px] text-stone-400">
                <span>{info.mine.length} lượt giao</span>
                <span>{formatPercent(info.avg)}</span>
              </div>
              <Progress value={info.avg} className="mt-1" />
            </div>
          ) : null}

          {!isGroup && info && info.mine.length > 0 ? (
            <Link
              href={`/quan-tri/nhiem-vu/phan-cong/${info.mine[0].id}`}
              className="inline-flex items-center gap-1 rounded-md border border-stone-200 px-2 py-1 text-[11px] font-medium text-stone-600 hover:border-doan-200 hover:text-doan-700"
            >
              <Target className="h-3 w-3" /> Chỉ tiêu
            </Link>
          ) : null}

          {!isGroup && canAssign ? (
            <button
              onClick={() => openAssign(task)}
              className="inline-flex items-center gap-1 rounded-md border border-doan-200 px-2 py-1 text-[11px] font-medium text-doan-700 hover:bg-doan-50"
            >
              <Plus className="h-3 w-3" /> Phân công
            </button>
          ) : null}
        </div>

        {open && children.length > 0 ? (
          <div className="border-l-2 border-stone-100" style={{ marginLeft: `${24 + depth * 24}px` }}>
            {children.map((c) => renderTask(c, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  const assignMetrics = assignTask ? store.taskMetricsOf(assignTask.id) : [];

  return (
    <>
      <div className="divide-y divide-stone-100">
        {roots.map((r) => renderTask(r, 0))}
        {roots.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-stone-400">Bộ tiêu chí chưa có nhiệm vụ.</p>
        ) : null}
      </div>

      <Modal
        open={assignTask !== null}
        onClose={() => setAssignTask(null)}
        title={`Phân công chỉ tiêu — ${assignTask?.title.slice(0, 60) ?? ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignTask(null)}>Hủy</Button>
            <Button onClick={submitAssign}><Plus className="h-4 w-4" /> Giao nhiệm vụ</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="rounded-lg bg-doan-50 px-3 py-2 text-xs leading-relaxed text-doan-800">
            Nhiệm vụ chưa có số liệu sẵn — bạn nhập chỉ tiêu và giao thẳng xuống đơn vị cấp dưới.
            Đơn vị nhận được thông báo ngay và báo cáo kết quả theo kỳ.
          </p>
          <Field label="Đơn vị nhận" required>
            <Select value={assignUnit} onChange={(e) => setAssignUnit(e.target.value)}>
              <option value="">— Chọn đơn vị cấp dưới —</option>
              {childUnits.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Hạn hoàn thành" required hint="Quá hạn sẽ thành đèn đỏ ở bảng Trực tiếp & cảnh báo.">
            <Input type="date" value={assignDue} onChange={(e) => setAssignDue(e.target.value)} />
          </Field>
          {assignMetrics.length > 0 ? (
            <Field label="Chỉ tiêu cần đạt" required>
              <div className="space-y-2">
                {assignMetrics.map((m) => (
                  <div key={m.id} className="grid grid-cols-[1fr_130px] items-center gap-2">
                    <span className="text-xs text-stone-600">{m.name} ({m.unitOfMeasure})</span>
                    <Input
                      type="number"
                      min={0}
                      value={assignValues[m.id] ?? ""}
                      onChange={(e) => setAssignValues((s) => ({ ...s, [m.id]: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </Field>
          ) : (
            <p className="text-xs text-stone-500">Nhiệm vụ này chấm bằng duyệt hồ sơ/minh chứng, không có đại lượng chỉ tiêu — chỉ cần chọn đơn vị và hạn.</p>
          )}
          <Field label="Ghi chú" hint="Không bắt buộc — ví dụ ưu tiên địa bàn, yêu cầu riêng.">
            <Textarea value={assignNote} onChange={(e) => setAssignNote(e.target.value)} rows={2} />
          </Field>
        </div>
      </Modal>
    </>
  );
}

export function TaskMetaLabels({ method }: { method: string }) {
  return <span>{METHOD_LABEL[method] ?? method}</span>;
}
