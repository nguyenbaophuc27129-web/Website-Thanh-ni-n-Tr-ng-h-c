"use client";

import { useMemo, useState } from "react";
import { Trophy, Medal, Crown } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatPercent, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function BangXepHangPage() {
  const { rankingSnapshots, rankingEntries, orgName, orgById } = useStore();
  const finalized = useMemo(
    () => rankingSnapshots.filter((s) => s.status === "FINALIZED").sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)),
    [rankingSnapshots]
  );
  const [snapshotId, setSnapshotId] = useState<string>(finalized[0]?.id.toString() ?? "");

  const snapshot = finalized.find((s) => s.id.toString() === snapshotId) ?? finalized[0];
  const entries = useMemo(
    () =>
      snapshot
        ? rankingEntries.filter((e) => e.snapshotId === snapshot.id).sort((a, b) => a.rankPosition - b.rankPosition)
        : [],
    [rankingEntries, snapshot]
  );

  const rankIcon = (pos: number) => {
    if (pos === 1) return <Crown className="h-4.5 w-4.5 text-vang-500" />;
    if (pos === 2) return <Medal className="h-4.5 w-4.5 text-stone-400" />;
    if (pos === 3) return <Medal className="h-4.5 w-4.5 text-orange-400" />;
    return <span className="text-xs font-bold text-stone-500">{pos}</span>;
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Trophy className="h-5.5 w-5.5" />
          </div>
          <div>
            <h1 className="font-serif-display text-2xl font-bold text-stone-900">Bảng xếp hạng thi đua</h1>
            <p className="text-sm text-stone-500">Kết quả các kỳ đã chốt — số liệu công bố giữ nguyên trạng (snapshot).</p>
          </div>
        </div>
        <Select
          value={snapshot?.id.toString()}
          onChange={(e) => setSnapshotId(e.target.value)}
          className="w-full sm:w-96"
        >
          {finalized.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
      </div>

      {snapshot ? (
        <>
          <div className="mt-5 flex flex-wrap gap-2 text-xs text-stone-500">
            <Badge tone="yellow">{snapshot.periodType === "QUARTER" ? "Quý" : snapshot.periodType === "MONTH" ? "Tháng" : "Theo giai đoạn"}</Badge>
            <span>Kỳ: {formatDate(snapshot.periodStart)} — {formatDate(snapshot.periodEnd)}</span>
            <span>·</span>
            <span>Phạm vi: {orgName(snapshot.scopeOrgUnitId)}</span>
            <span>·</span>
            <span>Xếp hạng đơn vị cấp {snapshot.rankedOrgLevel} · {snapshot.totalUnits} đơn vị</span>
          </div>

          <Card className="mt-5">
            <CardHeader title="Thứ hạng chi tiết" subtitle="Điểm theo bộ tiêu chí thi đua Thanh niên Trường học" />
            <CardBody className="p-0">
              <ol className="divide-y divide-stone-100">
                {entries.map((e) => {
                  const unit = orgById(e.orgUnitId);
                  return (
                    <li key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                      <div className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        e.rankPosition <= 3 ? "bg-vang-50" : "bg-stone-100"
                      )}>
                        {rankIcon(e.rankPosition)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-stone-900">{orgName(e.orgUnitId)}</p>
                        <p className="text-[11px] text-stone-400">
                          {unit?.shortName}
                          {unit?.schoolTypeName ? ` · ${unit.schoolTypeName}` : ""}
                        </p>
                      </div>
                      <div className="hidden text-right sm:block">
                        <p className="text-xs font-medium text-stone-700">{e.completedTasks}/{e.totalTasks} nhiệm vụ</p>
                        <p className="text-[11px] text-stone-400">{e.activityCount} hoạt động</p>
                      </div>
                      <div className="w-20 text-right">
                        <p className="text-xs text-stone-500">{formatPercent(e.completionRate)}</p>
                        <p className="text-[11px] text-stone-400">hoàn thành</p>
                      </div>
                      <div className="w-16 text-right">
                        <p className="text-base font-bold text-doan-700">{e.totalScore}</p>
                        <p className="text-[11px] text-stone-400">điểm</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </CardBody>
          </Card>
        </>
      ) : (
        <p className="mt-10 text-center text-sm text-stone-400">Chưa có kỳ xếp hạng nào được công bố.</p>
      )}
    </div>
  );
}
