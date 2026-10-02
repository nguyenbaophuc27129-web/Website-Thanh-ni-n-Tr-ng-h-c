"use client";

import { useEffect, useMemo } from "react";
import type { Task, TaskAssignment } from "@/types";
import { daysUntil } from "@/lib/utils";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";

export type ReminderKind = "DUE_SOON" | "OVERDUE";

export interface AssignmentReminder {
  assignment: TaskAssignment;
  kind: ReminderKind;
  daysLeft: number;
  taskTitle: string;
}

/**
 * Thuần: gom các lượt giao của đơn vị đang tới hạn (≤ 3 ngày) hoặc đã quá hạn,
 * chưa hoàn thành. Sắp nhiệm vụ quá hạn lên đầu.
 */
export function collectReminders(
  assignments: TaskAssignment[],
  orgUnitId: number,
  taskTitleOf: (taskId: number) => string
): AssignmentReminder[] {
  const out: AssignmentReminder[] = [];
  for (const a of assignments) {
    if (a.orgUnitId !== orgUnitId || a.progressStatus === "COMPLETED") continue;
    const daysLeft = daysUntil(a.dueDate);
    if (daysLeft < 0) {
      out.push({ assignment: a, kind: "OVERDUE", daysLeft, taskTitle: taskTitleOf(a.taskId) });
    } else if (daysLeft <= 3) {
      out.push({ assignment: a, kind: "DUE_SOON", daysLeft, taskTitle: taskTitleOf(a.taskId) });
    }
  }
  return out.sort((x, y) => (x.kind === y.kind ? x.daysLeft - y.daysLeft : x.kind === "OVERDUE" ? -1 : 1));
}

/**
 * Tự sinh thông báo nhắc việc (TASK_DUE_SOON / TASK_OVERDUE) cho đơn vị của phiên đăng nhập.
 * Mỗi (assignment, kind) chỉ gửi đúng 1 lần — đánh dấu localStorage TRƯỚC khi push thông báo
 * để không lặp vô hạn khi effect chạy lại.
 */
export function useAssignmentReminders() {
  const store = useStore();
  const { session } = useAuth();

  const reminders = useMemo(() => {
    if (!session) return [] as AssignmentReminder[];
    const titleOf = (id: number) => store.tasks.find((t: Task) => t.id === id)?.title ?? `Nhiệm vụ #${id}`;
    return collectReminders(store.taskAssignments, session.orgUnitId, titleOf);
  }, [store.taskAssignments, store.tasks, session]);

  const reminderKey = useMemo(
    () => reminders.map((r) => `${r.assignment.id}:${r.kind}:${r.assignment.dueDate}`).join("|"),
    [reminders]
  );

  useEffect(() => {
    if (!session || reminders.length === 0) return;
    for (const r of reminders) {
      const storageKey = `tnth_reminder_sent_${r.assignment.id}_${r.kind}`;
      try {
        if (window.localStorage.getItem(storageKey) === "1") continue;
        window.localStorage.setItem(storageKey, "1");
      } catch {
        // ignore storage errors — vẫn gửi thông báo như thường
      }
      const isOverdue = r.kind === "OVERDUE";
      store.addNotification({
        recipientAccountId: session.accountId,
        notificationType: isOverdue ? "TASK_OVERDUE" : "TASK_DUE_SOON",
        title: isOverdue ? "Nhiệm vụ đã quá hạn" : "Nhiệm vụ sắp đến hạn",
        message: isOverdue
          ? `"${r.taskTitle}" đã quá hạn ${Math.abs(r.daysLeft)} ngày (hạn ${r.assignment.dueDate}) — cần xử lý ngay.`
          : `"${r.taskTitle}" còn ${r.daysLeft} ngày nữa là đến hạn (hạn ${r.assignment.dueDate}).`,
        refType: "ASSIGNMENT",
        refId: r.assignment.id,
        linkUrl: `/quan-tri/nhiem-vu/phan-cong/${r.assignment.id}`,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminderKey, session?.accountId]);

  return reminders;
}
