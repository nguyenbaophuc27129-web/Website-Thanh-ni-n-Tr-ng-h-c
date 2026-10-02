"use client";

import { useMemo, useState } from "react";
import { Calculator, Save, RotateCcw, Scale, ClipboardList, ChevronDown } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import type { Task } from "@/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, Input, Field, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableWrap, THead, Th, Tr, Td, EmptyRow } from "@/components/ui/table";

const METHOD_LABEL: Record<string, string> = {
  AUTO_AGGREGATE: "Tự động tổng hợp",
  MANUAL_CONFIRM: "Xác nhận thủ công",
  EXPERT_REVIEW: "Hội đồng chuyên gia",
  OTHER: "—",
};

export default function ChamDiemPage() {
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();

  // Mặc định chấm theo BTS 2027 (thang điểm y chang file Excel TW)
  const [setId, setSetId] = useState<number>(
    () => store.criteriaSets.find((s) => s.year === 2027)?.id ?? store.activeCriteriaSet()?.id ?? store.criteriaSets[0]?.id ?? 1
  );
  const currentSet = store.criteriaSets.find((s) => s.id === setId);

  const scope = useMemo(() => (session ? store.scopeIds(session) : []), [session, store]);
  const scorableUnits = useMemo(
    () => store.orgUnits.filter((u) => scope.includes(u.id) && u.orgLevel >= 3 && u.isActive),
    [store.orgUnits, scope]
  );
  const [unitId, setUnitId] = useState<string>(scorableUnits[0]?.id.toString() ?? "");
  const [points, setPoints] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});

  const groups = useMemo(
    () => store.tasks.filter((t) => t.criteriaSetId === setId && t.parentTaskId === null).sort((a, b) => a.displayOrder - b.displayOrder),
    [store.tasks, setId]
  );
  const criteriaOf = (gid: number) =>
    store.tasks.filter((t) => t.criteriaSetId === setId && t.parentTaskId === gid).sort((a, b) => a.displayOrder - b.displayOrder);
  const metricsOf = (cid: number) => store.taskMetrics.filter((m) => m.taskId === cid).sort((a, b) => a.id - b.id);

  // Chế độ chấm TỪNG ĐIỀU KIỆN (BTS 2027: mỗi điều kiện có điểm tối đa + thang chấm riêng)
  const perMetricMode = useMemo(() => {
    const critIds = new Set(store.tasks.filter((t) => t.criteriaSetId === setId).map((t) => t.id));
    return store.taskMetrics.some((m) => critIds.has(m.taskId) && m.maxPoints != null);
  }, [store.tasks, store.taskMetrics, setId]);

  const unit = store.orgById(Number(unitId));

  const metricValue = (metricId: number): number | null => {
    const raw = points[metricId];
    if (raw !== undefined && raw !== "") return Number(raw);
    return (
      store.scores.find(
        (s) => s.criteriaSetId === setId && (s.metricId ?? null) === metricId && s.orgUnitId === Number(unitId)
      )?.points ?? null
    );
  };

  const critSubtotal = (c: Task) => metricsOf(c.id).reduce((s, m) => s + (metricValue(m.id) ?? 0), 0);
  const groupSubtotal = (gid: number) => criteriaOf(gid).reduce((s, c) => s + critSubtotal(c), 0);
  const totalDraft = groups.reduce((s, g) => s + groupSubtotal(g.id), 0);
  const totalMax = groups.reduce((s, g) => s + g.maxPoints, 0);

  /* ====== Mode 2026: chấm theo tiêu chí (giữ nguyên logic cũ) ====== */
  const criteria = useMemo(
    () => (currentSet ? store.tasks.filter((t) => t.criteriaSetId === setId && t.taskKind === "CRITERION").sort((a, b) => a.displayOrder - b.displayOrder) : []),
    [store.tasks, currentSet, setId]
  );

  const existingScore = (taskId: number) =>
    store.scores.find((s) => s.criteriaSetId === setId && (s.metricId == null) && s.taskId === taskId && s.orgUnitId === Number(unitId));

  const autoValue = (taskId: number): number | null => {
    const task = store.tasks.find((t) => t.id === taskId);
    if (!task || task.scoringMethod !== "AUTO_AGGREGATE") return null;
    const asgs = store.taskAssignments.filter((a) => a.taskId === taskId && a.orgUnitId === Number(unitId));
    if (asgs.length === 0) return null;
    let rate = 0;
    let count = 0;
    for (const a of asgs) {
      const targets = store.targetsOf(a.id);
      if (targets.length === 0) continue;
      rate += targets.reduce((s, t) => s + Math.min(1, t.targetValue > 0 ? t.achievedValue / t.targetValue : 1), 0) / targets.length;
      count++;
    }
    if (count === 0) return null;
    return Math.round((rate / count) * task.maxPoints * 10) / 10;
  };

  const totalDraft2026 = criteria.reduce((sum, c) => {
    const auto = autoValue(c.id);
    const raw = points[c.id] ?? existingScore(c.id)?.points.toString() ?? "";
    const v = raw !== "" ? Number(raw) : (auto ?? null);
    return sum + (v ?? 0);
  }, 0);

  const canManage = session?.role === "QUAN_TRI_TW" || session?.role === "QUAN_TRI_TINH";

  const resetDraft = () => {
    setPoints({});
    setNotes({});
  };

  const saveAll = () => {
    if (!session || !unit || !currentSet) return;
    let saved = 0;
    if (perMetricMode) {
      for (const g of groups) {
        for (const c of criteriaOf(g.id)) {
          for (const m of metricsOf(c.id)) {
            const raw = points[m.id];
            if (raw === undefined || raw === "") continue;
            const v = Number(raw);
            if (isNaN(v)) continue;
            store.saveScore(session, {
              criteriaSetId: currentSet.id, taskId: c.id, orgUnitId: unit.id, metricId: m.id,
              points: Math.max(0, Math.min(v, m.maxPoints ?? 0)),
              note: notes[m.id],
            });
            saved++;
          }
        }
      }
    } else {
      for (const c of criteria) {
        const auto = autoValue(c.id);
        const raw = points[c.id];
        const value = raw !== undefined && raw !== "" ? Number(raw) : auto;
        if (value === null || isNaN(value)) continue;
        store.saveScore(session, {
          criteriaSetId: currentSet.id, taskId: c.id, orgUnitId: unit.id,
          points: Math.max(0, Math.min(value, c.maxPoints)),
          note: notes[c.id],
        });
        saved++;
      }
    }
    resetDraft();
    toast(saved > 0 ? `Đã lưu điểm cho ${saved} mục của ${unit.shortName}.` : "Không có mục nào đủ điều kiện lưu.", saved > 0 ? "success" : "warning");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif-display text-xl font-bold text-stone-900">Chấm điểm thi đua</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Chấm chi tiết <b>từng điều kiện</b> theo thang điểm y chang Bộ Tiêu chí của Trung ương Đoàn — hệ thống tự cộng điểm theo nội dung và Tiêu chí.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-xs text-stone-600">
        <span className="font-semibold text-stone-800">3 bước chấm:</span>
        <span><b>1.</b> Chọn bộ tiêu chí &amp; đơn vị được chấm</span>
        <span><b>2.</b> Từng điều kiện: tick &quot;Hoàn thành&quot; (lấy điểm tối đa) hoặc nhập điểm theo thang</span>
        <span><b>3.</b> Bấm &quot;Lưu điểm&quot; — tổng tự cộng lên phiếu thi đua</span>
      </div>

      <Card>
        <CardBody className="flex flex-wrap items-end gap-4">
          <Field label="Bộ tiêu chí" className="min-w-72 flex-1">
            <Select
              value={setId.toString()}
              onChange={(e) => {
                setSetId(Number(e.target.value));
                resetDraft();
              }}
            >
              {store.criteriaSets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.totalPoints} điểm{s.status === "DRAFT" ? " · dự thảo" : ""})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Đơn vị được chấm" className="min-w-72 flex-1">
            <Select value={unitId} onChange={(e) => { setUnitId(e.target.value); resetDraft(); }}>
              {scorableUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} (cấp {u.orgLevel})
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={resetDraft}>
              <RotateCcw className="h-4 w-4" /> Làm mới
            </Button>
            {canManage ? (
              <Button onClick={saveAll} disabled={!unitId}>
                <Save className="h-4 w-4" /> Lưu điểm
              </Button>
            ) : null}
          </div>
        </CardBody>
      </Card>

      {perMetricMode ? (
        <>
          <div className="flex items-center gap-2 rounded-xl border border-doan-200 bg-doan-50 px-4 py-3 text-xs text-doan-800">
            <Scale className="h-4 w-4 shrink-0" />
            <span>
              Chấm theo từng điều kiện của <b>{currentSet?.name}</b>. Mỗi điều kiện hiển thị đầy đủ thang điểm từ văn bản — nhập điểm trong khoảng cho phép, tổng tự cộng.
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3">
            <p className="text-sm font-semibold text-stone-800">
              Phiếu điểm — {unit?.name ?? "…"} <span className="ml-1 font-normal text-xs text-stone-400">BTS {currentSet?.year}</span>
            </p>
            <span className="rounded-lg bg-doan-600 px-3 py-1.5 text-sm font-bold text-white">
              Tổng: {Math.round(totalDraft * 10) / 10}/{currentSet?.totalPoints ?? totalMax} điểm
            </span>
          </div>

          {groups.map((g) => (
            <Card key={g.id}>
              <CardHeader
                title={g.title}
                subtitle={`Tối đa ${g.maxPoints} điểm`}
                action={
                  <Badge tone={groupSubtotal(g.id) >= g.maxPoints ? "green" : groupSubtotal(g.id) > 0 ? "blue" : "gray"}>
                    Đạt {Math.round(groupSubtotal(g.id) * 10) / 10}/{g.maxPoints}
                  </Badge>
                }
              />
              <CardBody className="space-y-4">
                {criteriaOf(g.id).map((c) => (
                  <div key={c.id} className="rounded-lg border border-stone-200">
                    <div className="flex items-center justify-between gap-3 border-b border-stone-100 bg-stone-50/60 px-4 py-2.5">
                      <p className="text-sm font-semibold text-stone-800">{c.title}</p>
                      <span className="shrink-0 text-xs font-bold text-doan-700">
                        {Math.round(critSubtotal(c) * 10) / 10}/{c.maxPoints} điểm
                      </span>
                    </div>
                    <div className="divide-y divide-stone-100">
                      {metricsOf(c.id).map((m, idx) => {
                        const val = metricValue(m.id);
                        const cur = points[m.id] ?? (val !== null ? String(val) : "");
                        const done = cur !== "" && Number(cur) >= (m.maxPoints ?? 0);
                        const savedRec = store.scores.find(
                          (s) => s.criteriaSetId === setId && (s.metricId ?? null) === m.id && s.orgUnitId === Number(unitId)
                        );
                        return (
                          <div key={m.id} className="px-4 py-3">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <p className="min-w-0 flex-1 text-xs leading-relaxed text-stone-700">
                                <span className="mr-1.5 inline-flex shrink-0 items-center rounded bg-stone-100 px-1.5 py-0.5 text-[10px] font-bold text-stone-500">
                                  {m.code}
                                </span>
                                <b className="text-stone-800">Điều kiện {idx + 1}.</b> {m.name}
                              </p>
                              <div className="flex shrink-0 items-center gap-2">
                                <span className="text-[11px] text-stone-400">tối đa {m.maxPoints}đ</span>
                                {canManage ? (
                                  <label className={`flex cursor-pointer select-none items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-medium ${done ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-stone-200 text-stone-500 hover:bg-stone-50"}`}>
                                    <input
                                      type="checkbox"
                                      className="accent-emerald-600"
                                      checked={done}
                                      onChange={(e) => setPoints((p) => ({ ...p, [m.id]: e.target.checked ? String(m.maxPoints) : "0" }))}
                                    />
                                    Hoàn thành
                                  </label>
                                ) : done ? (
                                  <Badge tone="green">Hoàn thành</Badge>
                                ) : null}
                                {canManage ? (
                                  <Input
                                    type="number"
                                    min={0}
                                    max={m.maxPoints}
                                    step={0.5}
                                    value={cur}
                                    onChange={(e) => setPoints((p) => ({ ...p, [m.id]: e.target.value }))}
                                    className="w-20 text-center text-sm font-semibold"
                                    placeholder="0"
                                  />
                                ) : (
                                  <span className="text-sm font-bold text-doan-700">{val ?? "—"}</span>
                                )}
                              </div>
                            </div>

                            {m.scoringLadder ? (
                              <div className="mt-2 rounded-lg border border-vang-200/70 bg-vang-300/20 px-3 py-2">
                                <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-stone-500">
                                  <Scale className="h-3 w-3" /> Thang điểm
                                </p>
                                <p className="mt-1 whitespace-pre-line text-[11px] leading-relaxed text-stone-700">
                                  {m.scoringLadder.replace(/\*\s*/g, "").replace(/¶/g, "").replace(/^[-–]\s*/gm, "- ")}
                                </p>
                              </div>
                            ) : null}

                            {(m.requirement || m.evidence || m.period || m.dept) ? (
                              <details className="group mt-1.5">
                                <summary className="flex cursor-pointer list-none items-center gap-1 text-[11px] font-medium text-sky-700 hover:text-sky-900">
                                  <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                                  Yêu cầu chấm · minh chứng
                                  {m.period ? <Badge tone="gray">{m.period}</Badge> : null}
                                  {m.dept ? <span className="text-stone-400">· {m.dept}</span> : null}
                                </summary>
                                <div className="mt-2 space-y-2 rounded-lg bg-stone-50 p-3 text-[11px] leading-relaxed text-stone-600">
                                  {m.requirement ? (
                                    <p>
                                      <b className="text-stone-700">Yêu cầu đánh giá: </b>
                                      <span className="whitespace-pre-line">{m.requirement.replace(/¶/g, "\n")}</span>
                                    </p>
                                  ) : null}
                                  {m.evidence ? (
                                    <p>
                                      <b className="text-stone-700">Minh chứng: </b>
                                      <span className="whitespace-pre-line">{m.evidence.replace(/¶/g, "\n")}</span>
                                    </p>
                                  ) : null}
                                </div>
                              </details>
                            ) : null}

                            {savedRec ? (
                              <p className="mt-1 text-[10px] text-stone-400">
                                Đã lưu: {savedRec.points}/{savedRec.maxPoints} điểm
                              </p>
                            ) : null}

                            {canManage ? (
                              <Input
                                value={notes[m.id] ?? ""}
                                onChange={(e) => setNotes((n) => ({ ...n, [m.id]: e.target.value }))}
                                placeholder="Ghi chú của người chấm (tùy chọn)…"
                                className="mt-2 text-xs"
                              />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </CardBody>
            </Card>
          ))}
        </>
      ) : (
        <Card>
          <CardHeader
            title={unit ? `Phiếu điểm — ${unit.name}` : "Phiếu điểm"}
            subtitle="AUTO_AGGREGATE tính từ tỷ lệ đạt chỉ tiêu · MANUAL_CONFIRM và EXPERT_REVIEW nhập tay"
            action={
              <span className="rounded-lg bg-doan-600 px-3 py-1.5 text-sm font-bold text-white">
                Tổng: {Math.round(totalDraft2026 * 10) / 10}/{currentSet?.totalPoints ?? 100} điểm
              </span>
            }
          />
          <CardBody className="p-0">
            <TableWrap>
              <THead>
                  <Th>Tiêu chí</Th>
                  <Th className="w-40">Phương thức</Th>
                  <Th className="w-36">Điểm hiện tại</Th>
                  <Th className="w-36">Điểm chấm</Th>
                  <Th>Ghi chú</Th>
              </THead>
              <tbody>
                {criteria.map((c) => {
                  const existing = existingScore(c.id);
                  const auto = autoValue(c.id);
                  const current = points[c.id] ?? existing?.points.toString() ?? "";
                  return (
                    <Tr key={c.id}>
                      <Td>
                        <p className="text-sm font-medium text-stone-800">{c.title}</p>
                        <p className="mt-0.5 text-[11px] text-stone-400">Tối đa {c.maxPoints} điểm</p>
                      </Td>
                      <Td>
                        <Badge tone={c.scoringMethod === "AUTO_AGGREGATE" ? "blue" : c.scoringMethod === "EXPERT_REVIEW" ? "purple" : "yellow"}>
                          {METHOD_LABEL[c.scoringMethod]}
                        </Badge>
                      </Td>
                      <Td>
                        {existing ? (
                          <span className="text-sm font-bold text-doan-700">{existing.points}</span>
                        ) : auto !== null ? (
                          <span className="text-xs text-stone-500">Chưa lưu (auto: {auto})</span>
                        ) : (
                          <span className="text-xs text-stone-400">Chưa chấm</span>
                        )}
                      </Td>
                      <Td>
                        {c.scoringMethod === "AUTO_AGGREGATE" ? (
                          auto !== null ? (
                            <div className="flex items-center gap-1.5 text-xs text-sky-700">
                              <Calculator className="h-3.5 w-3.5" /> {auto} (tự động)
                            </div>
                          ) : (
                            <span className="text-xs text-stone-400">Chưa có chỉ tiêu</span>
                          )
                        ) : canManage ? (
                          <Input
                            type="number"
                            min={0}
                            max={c.maxPoints}
                            step={0.5}
                            value={current}
                            onChange={(e) => setPoints((p) => ({ ...p, [c.id]: e.target.value }))}
                            placeholder={`0 — ${c.maxPoints}`}
                          />
                        ) : (
                          <span className="text-xs text-stone-400">—</span>
                        )}
                      </Td>
                      <Td>
                        {canManage && c.scoringMethod !== "AUTO_AGGREGATE" ? (
                          <Textarea
                            value={notes[c.id] ?? existing?.note ?? ""}
                            onChange={(e) => setNotes((n) => ({ ...n, [c.id]: e.target.value }))}
                            placeholder="Ghi chú của người chấm…"
                            rows={1}
                            className="text-xs"
                          />
                        ) : (
                          <span className="text-[11px] text-stone-400">{existing?.note ?? "—"}</span>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
                {criteria.length === 0 ? <EmptyRow colSpan={5} /> : null}
              </tbody>
            </TableWrap>
          </CardBody>
        </Card>
      )}

      {!canManage ? (
        <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-800">
          <ClipboardList className="h-4 w-4 shrink-0" />
          Vai trò của bạn chỉ xem được phiếu điểm. Việc chấm chính thức do cấp Tỉnh/Trung ương thực hiện.
        </div>
      ) : null}
    </div>
  );
}
