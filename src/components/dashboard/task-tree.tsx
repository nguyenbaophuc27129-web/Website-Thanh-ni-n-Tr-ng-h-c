"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, Target } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/dashboard/progress-bar";
import type { Task } from "@/types";
import { formatPercent } from "@/lib/utils";

export const METHOD_LABEL: Record<string, string> = {
  AUTO_AGGREGATE: "Tự động tổng hợp",
  MANUAL_CONFIRM: "Xác nhận thủ công",
  EXPERT_REVIEW: "Hội đồng chuyên gia",
  OTHER: "—",
};

/** Cây nhiệm vụ phân cấp I → I.1 kèm thông tin giao trong phạm vi */
export function TaskTree({ criteriaSetId, scope }: { criteriaSetId: number; scope: number[] }) {
  const { tasks, taskAssignments } = useStore();
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());

  const roots = useMemo(
    () => tasks.filter((t) => t.criteriaSetId === criteriaSetId && t.parentTaskId === null).sort((a, b) => a.displayOrder - b.displayOrder),
    [tasks, criteriaSetId]
  );

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
        </div>

        {open && children.length > 0 ? (
          <div className="border-l-2 border-stone-100" style={{ marginLeft: `${24 + depth * 24}px` }}>
            {children.map((c) => renderTask(c, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="divide-y divide-stone-100">
      {roots.map((r) => renderTask(r, 0))}
      {roots.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-stone-400">Bộ tiêu chí chưa có nhiệm vụ.</p>
      ) : null}
    </div>
  );
}

export function TaskMetaLabels({ method }: { method: string }) {
  return <span>{METHOD_LABEL[method] ?? method}</span>;
}
