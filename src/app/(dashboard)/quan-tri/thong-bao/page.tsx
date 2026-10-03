"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { formatDateTime } from "@/lib/utils";
import type { NotificationType } from "@/types";

const TYPE_META: Record<NotificationType, { label: string; cls: string }> = {
  TASK_ASSIGNED: { label: "Giao nhiệm vụ", cls: "bg-sky-100 text-sky-700" },
  TASK_DUE_SOON: { label: "Sắp đến hạn", cls: "bg-amber-100 text-amber-700" },
  TASK_OVERDUE: { label: "Quá hạn", cls: "bg-red-100 text-red-700" },
  RESULT_CONFIRMED: { label: "Đã xác nhận", cls: "bg-emerald-100 text-emerald-700" },
  RESULT_NEEDS_INFO: { label: "Cần bổ sung", cls: "bg-amber-100 text-amber-700" },
  NEW_DOCUMENT: { label: "Văn bản mới", cls: "bg-violet-100 text-violet-700" },
  FEEDBACK_REPLIED: { label: "Phản ánh có trả lời", cls: "bg-stone-200 text-stone-700" },
  FEEDBACK_STATUS: { label: "Trạng thái phản ánh", cls: "bg-stone-200 text-stone-700" },
  POST_PUBLISHED: { label: "Tin bài mới", cls: "bg-pink-100 text-pink-700" },
  SYSTEM: { label: "Hệ thống", cls: "bg-stone-100 text-stone-600" },
  FORUM_FLAGGED: { label: "Kiểm duyệt diễn đàn", cls: "bg-orange-100 text-orange-700" },
  CONTRIBUTION_APPROVED: { label: "Đóng góp được duyệt", cls: "bg-emerald-100 text-emerald-700" },
  CONTRIBUTION_REJECTED: { label: "Đóng góp bị từ chối", cls: "bg-red-100 text-red-700" },
  PROJECT_APPROVED: { label: "Dự án được duyệt", cls: "bg-emerald-100 text-emerald-700" },
  HS3T_AWARDED: { label: "Danh hiệu 3 tốt", cls: "bg-yellow-100 text-yellow-700" },
};

export default function ThongBaoPage() {
  const { session } = useAuth();
  const store = useStore();
  const [tab, setTab] = useState("all");

  const myNotifications = useMemo(
    () =>
      store.notifications
        .filter((n) => n.recipientAccountId === session?.accountId)
        .filter((n) => (tab === "all" ? true : tab === "unread" ? !n.isRead : n.isRead))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [store.notifications, session, tab]
  );

  const unreadCount = store.notifications.filter((n) => n.recipientAccountId === session?.accountId && !n.isRead).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif-display text-xl font-bold text-stone-900">Thông báo</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Trung tâm thông báo: nhiệm vụ, văn bản, xác nhận kết quả, tin bài và phản ánh.
          </p>
        </div>
        {unreadCount > 0 ? (
          <Button
            variant="secondary"
            onClick={() => {
              if (!session) return;
              store.markAllNotificationsRead(session.accountId);
            }}
          >
            <CheckCheck className="h-4 w-4" /> Đánh dấu tất cả đã đọc
          </Button>
        ) : null}
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "all", label: "Tất cả" },
          { value: "unread", label: "Chưa đọc", count: unreadCount },
          { value: "read", label: "Đã đọc" },
        ]}
      />

      <div className="space-y-2.5">
        {myNotifications.map((n) => {
          const meta = TYPE_META[n.notificationType] ?? TYPE_META.SYSTEM;
          return (
            <Card key={n.id} className={n.isRead ? "opacity-70" : "border-doan-200"}>
              <CardBody className="flex flex-wrap items-start gap-3 p-4">
                <span className={`inline-flex shrink-0 items-center rounded-md px-2 py-1 text-[10px] font-bold ${meta.cls}`}>
                  {meta.label}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${n.isRead ? "font-medium text-stone-600" : "font-bold text-stone-900"}`}>{n.title}</p>
                  <p className="mt-0.5 text-xs text-stone-500">{n.message}</p>
                  {n.linkUrl ? (
                    <Link href={n.linkUrl} className="mt-1 inline-block text-xs font-medium text-sky-700 hover:underline">
                      Mở liên kết →
                    </Link>
                  ) : null}
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-[11px] text-stone-400">{formatDateTime(n.createdAt)}</span>
                  {!n.isRead ? (
                    <button
                      onClick={() => store.markNotificationRead(n.id)}
                      className="text-[11px] font-medium text-doan-600 hover:underline"
                    >
                      Đánh dấu đã đọc
                    </button>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          );
        })}
        {myNotifications.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-stone-300 bg-white py-14">
            <Inbox className="h-8 w-8 text-stone-300" />
            <p className="mt-3 text-sm text-stone-400">Không có thông báo nào ở mục này.</p>
          </div>
        ) : null}
      </div>

      {unreadCount === 0 && myNotifications.length === 0 ? (
        <p className="flex items-center justify-center gap-1.5 text-xs text-stone-400">
          <Bell className="h-3.5 w-3.5" /> Thông báo mới sẽ xuất hiện khi có nhiệm vụ, văn bản hoặc phản hồi.
        </p>
      ) : null}
    </div>
  );
}
