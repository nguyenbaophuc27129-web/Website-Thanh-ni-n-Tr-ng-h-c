"use client";

import { useMemo, useState } from "react";
import { Trophy, Plus, Lock, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TableWrap, THead, Th, Tr, Td, EmptyRow } from "@/components/ui/table";
import { MockExportButton } from "@/components/dashboard/mock-export-button";
import { Progress } from "@/components/dashboard/progress-bar";
import { formatDateTime, formatDate } from "@/lib/utils";
import type { RankingSnapshot } from "@/types";

const RANK_TYPE_LABEL: Record<RankingSnapshot["rankingType"], string> = {
  BY_SCORE: "Theo điểm thi đua",
  BY_TASK_RESULT: "Theo kết quả nhiệm vụ",
  BY_ACTIVITY_COUNT: "Theo số hoạt động",
};

export default function BangXepHangAdminPage() {
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();

  const [selectedId, setSelectedId] = useState<number | null>(store.rankingSnapshots[0]?.id ?? null);
  const [createOpen, setCreateOpen] = useState(false);
  const [finalizing, setFinalizing] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "", rankedOrgLevel: "4", rankingType: "BY_SCORE" as RankingSnapshot["rankingType"],
    periodType: "QUARTER", periodStart: "2026-07-01", periodEnd: "2026-09-30",
  });

  const activeSet = store.activeCriteriaSet();
  const snapshots = useMemo(
    () => [...store.rankingSnapshots].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)),
    [store.rankingSnapshots]
  );
  const selected = snapshots.find((s) => s.id === selectedId) ?? snapshots[0] ?? null;
  const entries = useMemo(
    () => store.rankingEntries.filter((e) => e.snapshotId === selected?.id).sort((a, b) => a.rankPosition - b.rankPosition),
    [store.rankingEntries, selected]
  );

  const handleCreate = () => {
    if (!session) return;
    if (!form.name.trim()) {
      toast("Nhập tên kỳ xếp hạng.", "warning");
      return;
    }
    const id = store.createRankingSnapshot(session, {
      name: form.name.trim(),
      criteriaSetId: activeSet?.id ?? null,
      scopeOrgUnitId: session.orgUnitId,
      rankedOrgLevel: Number(form.rankedOrgLevel),
      rankingType: form.rankingType,
      periodType: form.periodType as RankingSnapshot["periodType"],
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      totalUnits: 0,
    });
    setSelectedId(id);
    toast("Đã tổng hợp bảng xếp hạng (bản nháp). Kiểm tra số liệu rồi chốt kỳ.");
    setCreateOpen(false);
    setForm((f) => ({ ...f, name: "" }));
  };

  const finalize = (id: number) => {
    setFinalizing(id);
    setTimeout(() => {
      store.finalizeRanking(id);
      setFinalizing(null);
      toast("Đã chốt kỳ xếp hạng (FINALIZED) — công bố trên trang công khai.");
    }, 900);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif-display text-xl font-bold text-stone-900">Bảng xếp hạng thi đua</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Tổng hợp điểm thi đua thành kỳ xếp hạng, chốt kỳ để công bố công khai.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Tổng hợp kỳ mới
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card className="h-fit">
          <CardHeader title="Các kỳ xếp hạng" />
          <CardBody className="p-0">
            <ul className="divide-y divide-stone-100">
              {snapshots.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setSelectedId(s.id)}
                    className={`w-full px-4 py-3 text-left hover:bg-stone-50 ${selected?.id === s.id ? "bg-doan-50" : ""}`}
                  >
                    <p className="text-sm font-semibold text-stone-800">{s.name}</p>
                    <p className="mt-0.5 text-[11px] text-stone-400">
                      Cấp {s.rankedOrgLevel} · {formatDate(s.periodStart)} — {formatDate(s.periodEnd)}
                    </p>
                    <div className="mt-1.5">
                      {s.status === "FINALIZED" ? <Badge tone="green">Đã chốt</Badge> : <Badge tone="yellow">Nháp</Badge>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        {selected ? (
          <Card>
            <CardHeader
              title={selected.name}
              subtitle={`${RANK_TYPE_LABEL[selected.rankingType]} · ${store.orgName(selected.scopeOrgUnitId)} · Tổng hợp ${formatDateTime(selected.generatedAt)}`}
              action={
                <div className="flex items-center gap-2">
                  <MockExportButton fileName={`bxh-${selected.id}`} format="XLSX" size="sm" />
                  {selected.status === "DRAFT" ? (
                    <Button size="sm" onClick={() => finalize(selected.id)} disabled={finalizing !== null}>
                      {finalizing === selected.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                      Chốt kỳ
                    </Button>
                  ) : null}
                </div>
              }
            />
            <CardBody className="p-0">
              <TableWrap>
                <THead>
                    <Th className="w-16">Hạng</Th>
                    <Th>Đơn vị</Th>
                    <Th className="w-28">Điểm</Th>
                    <Th className="w-44">Tiến độ nhiệm vụ</Th>
                    <Th className="w-28">Hoạt động</Th>
                </THead>
                <tbody>
                  {entries.map((e) => (
                    <Tr key={e.id}>
                      <Td>
                        <span
                          className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                            e.rankPosition === 1
                              ? "bg-vang-300 text-doan-800"
                              : e.rankPosition <= 3
                                ? "bg-doan-100 text-doan-700"
                                : "bg-stone-100 text-stone-500"
                          }`}
                        >
                          {e.rankPosition}
                        </span>
                      </Td>
                      <Td className="text-sm font-medium text-stone-800">{store.orgName(e.orgUnitId)}</Td>
                      <Td>
                        <span className="text-sm font-bold text-doan-700">{e.totalScore}</span>
                        <span className="text-[11px] text-stone-400">/{activeSet?.totalPoints ?? 100}</span>
                      </Td>
                      <Td>
                        <div className="flex items-center gap-2">
                          <Progress value={e.completionRate} />
                          <span className="text-[11px] text-stone-500">{e.completedTasks}/{e.totalTasks} nhiệm vụ</span>
                        </div>
                      </Td>
                      <Td className="text-sm text-stone-600">{e.activityCount}</Td>
                    </Tr>
                  ))}
                  {entries.length === 0 ? <EmptyRow colSpan={5} /> : null}
                </tbody>
              </TableWrap>
            </CardBody>
          </Card>
        ) : (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-stone-300 bg-white py-14">
            <Trophy className="h-8 w-8 text-stone-300" />
            <p className="mt-3 text-sm text-stone-400">Chưa có kỳ xếp hạng nào.</p>
          </div>
        )}
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tổng hợp kỳ xếp hạng mới"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button onClick={handleCreate}><Trophy className="h-4 w-4" /> Tổng hợp</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="rounded-lg bg-sky-50 px-3.5 py-2.5 text-xs text-sky-800">
            Hệ thống tự tính điểm từ phiếu chấm (scores), tiến độ nhiệm vụ và số hoạt động đã xác nhận của các đơn vị
            cấp {form.rankedOrgLevel} thuộc phạm vi của bạn.
          </p>
          <Field label="Tên kỳ xếp hạng" required>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="VD: Xếp hạng Đoàn trường Quý III/2026"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Xếp hạng đơn vị cấp">
              <Select value={form.rankedOrgLevel} onChange={(e) => setForm((f) => ({ ...f, rankedOrgLevel: e.target.value }))}>
                <option value="2">Cấp 2 — Tỉnh Đoàn</option>
                <option value="3">Cấp 3 — Đoàn xã/phường</option>
                <option value="4">Cấp 4 — Đoàn trường</option>
              </Select>
            </Field>
            <Field label="Kiểu xếp hạng">
              <Select value={form.rankingType} onChange={(e) => setForm((f) => ({ ...f, rankingType: e.target.value as RankingSnapshot["rankingType"] }))}>
                <option value="BY_SCORE">Theo điểm thi đua</option>
                <option value="BY_TASK_RESULT">Theo kết quả nhiệm vụ</option>
                <option value="BY_ACTIVITY_COUNT">Theo số hoạt động</option>
              </Select>
            </Field>
            <Field label="Kỳ">
              <Select value={form.periodType} onChange={(e) => setForm((f) => ({ ...f, periodType: e.target.value }))}>
                <option value="MONTH">Tháng</option>
                <option value="QUARTER">Quý</option>
                <option value="YEAR">Năm</option>
                <option value="CUSTOM">Tùy chọn</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Từ ngày">
                <Input type="date" value={form.periodStart} onChange={(e) => setForm((f) => ({ ...f, periodStart: e.target.value }))} />
              </Field>
              <Field label="Đến ngày">
                <Input type="date" value={form.periodEnd} onChange={(e) => setForm((f) => ({ ...f, periodEnd: e.target.value }))} />
              </Field>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
