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

  // Modal phân công bổ sung (nhiệm vụ đột xuất dưới 1 tiêu chí)
  const [supCriterion, setSupCriterion] = useState<Task | null>(null);
  const [supTitle, setSupTitle] = useState("");
  const [supDue, setSupDue] = useState("");
  const [supNote, setSupNote] = useState("");
  const [supUnits, setSupUnits] = useState<number[]>([]);
  const [supMetrics, setSupMetrics] = useState<{ name: string; unit: string; value: string }[]>([]);

  const roots = useMemo(
    () => tasks.filter((t) => Number(t.criteriaSetId) === Number(criteriaSetId) && t.parentTaskId === null).sort((a, b) => a.displayOrder - b.displayOrder),
    [tasks, criteriaSetId]
  );

  /** Đơn vị nhận phân công = con trực tiếp của đơn vị tôi (TW→tỉnh, tỉnh→phường, phường→trường) */
  const childUnits = useMemo(
    () => (session ? orgUnits.filter((u) => Number(u.parentId) === Number(session.orgUnitId) && u.isActive) : []),
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
    const mine = taskAssignments.filter(
      (a) => Number(a.taskId) === Number(task.id) && scope.map(Number).includes(Number(a.orgUnitId))
    );
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

  const openSupplement = (criterion: Task) => {
    setSupCriterion(criterion);
    setSupTitle("");
    setSupDue("");
    setSupNote("");
    setSupUnits([]);
    setSupMetrics([]);
  };

  const toggleSupUnit = (id: number) =>
    setSupUnits((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submitSupplement = () => {
    if (!supCriterion || !session) return;
    if (supTitle.trim().length < 5) {
      toast("Nhập tên nhiệm vụ bổ sung (tối thiểu 5 ký tự).", "warning");
      return;
    }
    if (!supDue) {
      toast("Chọn hạn hoàn thành.", "warning");
      return;
    }
    if (supUnits.length === 0) {
      toast("Chọn ít nhất một đơn vị nhận.", "warning");
      return;
    }
    const metrics = supMetrics
      .filter((m) => m.name.trim())
      .map((m) => ({ name: m.name, unit: m.unit, targetValue: Number(m.value || "0") }));
    if (metrics.some((m) => isNaN(m.targetValue) || m.targetValue <= 0)) {
      toast("Chỉ tiêu là số > 0 cho từng đại lượng.", "warning");
      return;
    }
    store.createSupplementaryTask(session, {
      parentTaskId: supCriterion.id,
      title: supTitle,
      note: supNote.trim() || undefined,
      dueDate: supDue,
      targetOrgUnitIds: supUnits,
      metrics,
    });
    toast(
      `Đã bổ sung nhiệm vụ dưới tiêu chí "${supCriterion.title}" và giao cho ${supUnits.length} đơn vị — đơn vị nhận được thông báo ngay.`
    );
    setSupCriterion(null);
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
          {!isGroup && task.criteriaSetId === null ? <Badge tone="blue">Bổ sung</Badge> : null}

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

          {isGroup && canAssign ? (
            <button
              onClick={() => openSupplement(task)}
              className="inline-flex items-center gap-1 rounded-md border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-700 hover:bg-sky-100"
            >
              <Plus className="h-3 w-3" /> Phân công bổ sung
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

      {/* ═══ Modal PHÂN CÔNG BỔ SUNG — nhiệm vụ đột xuất dưới 1 tiêu chí ═══ */}
      <Modal
        open={supCriterion !== null}
        onClose={() => setSupCriterion(null)}
        title={`Phân công bổ sung — ${supCriterion?.title.slice(0, 50) ?? ""}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setSupCriterion(null)}>Hủy</Button>
            <Button onClick={submitSupplement}><Plus className="h-4 w-4" /> Bổ sung &amp; giao</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="rounded-lg bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-800">
            Dành cho hoạt động đột xuất, ngoài kế hoạch nhưng vẫn thuộc tiêu chí này.
            Nhiệm vụ bổ sung không cộng điểm cố định của bộ tiêu chí — đơn vị nhận báo cáo tiến độ và cấp trên xác nhận như nhiệm vụ thường.
          </p>
          <Field label="Tên nhiệm vụ bổ sung" required hint="Ví dụ: Rà soát an toàn trường học sau mưa bão">
            <Input value={supTitle} onChange={(e) => setSupTitle(e.target.value)} placeholder="Nhập tên nhiệm vụ đột xuất…" />
          </Field>
          <Field label="Hạn hoàn thành" required>
            <Input type="date" value={supDue} onChange={(e) => setSupDue(e.target.value)} />
          </Field>
          <Field label="Đơn vị nhận" required hint={`Chọn trong ${childUnits.length} đơn vị cấp dưới trực tiếp — chọn nhiều đơn vị được.`}>
            {childUnits.length === 0 ? (
              <p className="text-xs text-stone-500">Đơn vị của bạn chưa có đơn vị cấp dưới trực tiếp.</p>
            ) : (
              <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-lg border border-stone-200 p-2">
                {childUnits.map((u) => (
                  <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-xs hover:bg-stone-50">
                    <input
                      type="checkbox"
                      checked={supUnits.includes(u.id)}
                      onChange={() => toggleSupUnit(u.id)}
                      className="h-3.5 w-3.5 accent-sky-600"
                    />
                    <span className="text-stone-700">{u.name}</span>
                  </label>
                ))}
              </div>
            )}
          </Field>
          <Field label="Chỉ tiêu cần đạt" hint="Không bắt buộc — nhiệm vụ chỉ cần đánh dấu hoàn thành có thể bỏ trống.">
            <div className="space-y-2">
              {supMetrics.map((m, i) => (
                <div key={i} className="grid grid-cols-[1fr_90px_100px_28px] items-center gap-2">
                  <Input
                    value={m.name}
                    onChange={(e) => setSupMetrics((s) => s.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                    placeholder="Tên đại lượng (VD: Số buổi tuyên truyền)"
                  />
                  <Input
                    value={m.unit}
                    onChange={(e) => setSupMetrics((s) => s.map((x, j) => (j === i ? { ...x, unit: e.target.value } : x)))}
                    placeholder="Đơn vị"
                  />
                  <Input
                    type="number"
                    min={0}
                    value={m.value}
                    onChange={(e) => setSupMetrics((s) => s.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                    placeholder="Chỉ tiêu"
                  />
                  <button
                    type="button"
                    onClick={() => setSupMetrics((s) => s.filter((_, j) => j !== i))}
                    className="rounded p-1 text-stone-400 hover:bg-stone-100 hover:text-red-500"
                    aria-label="Xóa chỉ tiêu"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setSupMetrics((s) => [...s, { name: "", unit: "", value: "" }])}
                className="inline-flex items-center gap-1 rounded-md border border-dashed border-stone-300 px-2.5 py-1.5 text-[11px] font-medium text-stone-600 hover:border-sky-400 hover:text-sky-700"
              >
                <Plus className="h-3 w-3" /> Thêm đại lượng chỉ tiêu
              </button>
            </div>
          </Field>
          <Field label="Ghi chú" hint="Không bắt buộc — yêu cầu riêng, phạm vi, hình thức báo cáo.">
            <Textarea value={supNote} onChange={(e) => setSupNote(e.target.value)} rows={2} />
          </Field>
        </div>
      </Modal>
    </>
  );
}

export function TaskMetaLabels({ method }: { method: string }) {
  return <span>{METHOD_LABEL[method] ?? method}</span>;
}
