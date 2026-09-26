"use client";

import { useMemo, useState } from "react";
import { Calculator, Sparkles, Save, RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, Input, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableWrap, THead, Th, Tr, Td, EmptyRow } from "@/components/ui/table";
import { formatPercent } from "@/lib/utils";

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
  const activeSet = store.activeCriteriaSet();

  const scope = useMemo(() => (session ? store.scopeIds(session) : []), [session, store]);
  const scorableUnits = useMemo(
    () => store.orgUnits.filter((u) => scope.includes(u.id) && u.orgLevel >= 3 && u.isActive),
    [store.orgUnits, scope]
  );
  const [unitId, setUnitId] = useState<string>(scorableUnits[0]?.id.toString() ?? "");
  const [points, setPoints] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});

  const criteria = useMemo(
    () =>
      activeSet
        ? store.tasks
            .filter((t) => t.criteriaSetId === activeSet.id && t.taskKind === "CRITERION")
            .sort((a, b) => a.displayOrder - b.displayOrder)
        : [],
    [store.tasks, activeSet]
  );

  const unit = store.orgById(Number(unitId));

  const existingScore = (taskId: number) =>
    store.scores.find((s) => s.criteriaSetId === activeSet?.id && s.taskId === taskId && s.orgUnitId === Number(unitId));

  const autoValue = (taskId: number): number | null => {
    const task = store.tasks.find((t) => t.id === taskId);
    if (!task || task.scoringMethod !== "AUTO_AGGREGATE") return null;
    // Tự động: tỷ lệ đạt chỉ tiêu của đơn vị trong phạm vi (gộp lượt giao của chính đơn vị đó)
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
    return Math.round(((rate / count) * task.maxPoints) * 10) / 10;
  };

  const totalDraft = useMemo(
    () =>
      criteria.reduce((sum, c) => {
        const auto = autoValue(c.id);
        const raw = points[c.id] ?? existingScore(c.id)?.points.toString() ?? "";
        const v = raw !== "" ? Number(raw) : auto ?? null;
        return sum + (v ?? 0);
      }, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [criteria, points, unitId, store.scores, store.taskAssignments, store.assignmentTargets]
  );

  const canManage = session?.role === "QUAN_TRI_TW" || session?.role === "QUAN_TRI_TINH";

  const saveAll = () => {
    if (!session || !activeSet || !unit) return;
    let saved = 0;
    for (const c of criteria) {
      const auto = autoValue(c.id);
      const raw = points[c.id];
      const value = raw !== undefined && raw !== "" ? Number(raw) : auto;
      if (value === null || isNaN(value)) continue;
      store.saveScore(session, {
        criteriaSetId: activeSet.id, taskId: c.id, orgUnitId: unit.id,
        points: Math.max(0, Math.min(value, c.maxPoints)),
        note: notes[c.id] ?? existingScore(c.id)?.note,
      });
      saved++;
    }
    setPoints({});
    toast(saved > 0 ? `Đã lưu điểm cho ${saved} tiêu chí của ${unit.shortName}.` : "Không có tiêu chí nào đủ điều kiện lưu.", saved > 0 ? "success" : "warning");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif-display text-xl font-bold text-stone-900">Chấm điểm thi đua</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Ba phương thức chấm điểm: tự động tổng hợp từ chỉ tiêu, xác nhận thủ công, hội đồng chuyên gia.
        </p>
      </div>

      <Card>
        <CardBody className="flex flex-wrap items-end gap-4">
          <Field label="Bộ tiêu chí" className="min-w-72 flex-1">
            <Select value={activeSet?.id.toString() ?? ""} disabled>
              <option>{activeSet?.name ?? "—"}</option>
            </Select>
          </Field>
          <Field label="Đơn vị được chấm" className="min-w-72 flex-1">
            <Select value={unitId} onChange={(e) => { setUnitId(e.target.value); setPoints({}); }}>
              {scorableUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} (cấp {u.orgLevel})
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { setPoints({}); setNotes({}); }}>
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

      <Card>
        <CardHeader
          title={unit ? `Phiếu điểm — ${unit.name}` : "Phiếu điểm"}
          subtitle="AUTO_AGGREGATE tính từ tỷ lệ đạt chỉ tiêu · MANUAL_CONFIRM và EXPERT_REVIEW nhập tay"
          action={
            <span className="rounded-lg bg-doan-600 px-3 py-1.5 text-sm font-bold text-white">
              Tổng: {Math.round(totalDraft * 10) / 10}/{activeSet?.totalPoints ?? 100} điểm
            </span>
          }
        />
        <CardBody className="p-0">
          <TableWrap>
            <THead>
              <tr>
                <Th>Tiêu chí</Th>
                <Th className="w-40">Phương thức</Th>
                <Th className="w-36">Điểm hiện tại</Th>
                <Th className="w-36">Điểm chấm</Th>
                <Th>Ghi chú</Th>
              </tr>
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
                            <Sparkles className="h-3.5 w-3.5" /> {auto} (tự động)
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
                        <Input
                          value={notes[c.id] ?? existing?.note ?? ""}
                          onChange={(e) => setNotes((n) => ({ ...n, [c.id]: e.target.value }))}
                          placeholder="Ghi chú của người chấm…"
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

      {!canManage ? (
        <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-800">
          <Calculator className="h-4 w-4 shrink-0" />
          Vai trò của bạn chỉ xem được phiếu điểm. Việc chấm chính thức do cấp Tỉnh/Trung ương thực hiện.
        </div>
      ) : null}
    </div>
  );
}
