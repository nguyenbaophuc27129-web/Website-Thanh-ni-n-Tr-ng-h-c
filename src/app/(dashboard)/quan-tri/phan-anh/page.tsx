"use client";

import { useMemo, useState } from "react";
import { Mail, MailCheck, MessageSquareText, Paperclip, Search, Send, StickyNote } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { FeedbackStatusBadge } from "@/components/dashboard/status-badge";
import { formatDateTime } from "@/lib/utils";
import { feedbackTopics } from "@/data/categories";
import type { Feedback } from "@/types";

const QUEUE: { value: "ALL" | Feedback["status"]; label: string }[] = [
  { value: "NEW", label: "Mới tiếp nhận" },
  { value: "IN_PROGRESS", label: "Đang xử lý" },
  { value: "RESOLVED", label: "Đã xử lý" },
  { value: "CLOSED", label: "Đã đóng" },
  { value: "ALL", label: "Tất cả" },
];

export default function PhanAnhAdminPage() {
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();
  const [tab, setTab] = useState<string>("NEW");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);

  const list = useMemo(
    () =>
      store.feedbacks
        .filter((f) => (tab === "ALL" ? true : f.status === tab))
        .filter((f) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return (
            f.trackingCode.toLowerCase().includes(q) ||
            f.title.toLowerCase().includes(q) ||
            f.senderName.toLowerCase().includes(q)
          );
        })
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    [store.feedbacks, tab, search]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: store.feedbacks.length };
    for (const q of QUEUE) if (q.value !== "ALL") c[q.value] = store.feedbacks.filter((f) => f.status === q.value).length;
    return c;
  }, [store.feedbacks]);

  const sendReply = (feedbackId: number) => {
    const fb = store.feedbacks.find((f) => f.id === feedbackId);
    if (!fb) return;
    if (!reply.trim()) {
      toast("Nhập nội dung phản hồi.", "warning");
      return;
    }
    store.replyFeedback(session!, feedbackId, reply.trim(), internal);
    setReply("");
    toast(
      internal
        ? "Đã lưu ghi chú nội bộ (không hiển thị với người gửi)."
        : `Đã gửi phản hồi — hệ thống đã gửi email tới ${fb.senderEmail}.`
    );
  };

  const resendResult = (feedbackId: number) => {
    const fb = store.feedbacks.find((f) => f.id === feedbackId);
    if (!fb) return;
    const ok = store.sendFeedbackResultEmail(session!, feedbackId, "RESULT");
    toast(ok ? `Đã gửi lại email kết quả tới ${fb.senderEmail}.` : "Phản ánh này không có địa chỉ email người gửi.", ok ? "success" : "warning");
  };

  const topicName = (id: number) => feedbackTopics.find((t) => t.id === id)?.name ?? "—";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif-display text-xl font-bold text-stone-900">Hộp tiếp nhận phản ánh</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Xử lý phản ánh kiến nghị của người dân: trả lời công khai hoặc ghi chú nội bộ, cập nhật trạng thái.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm mã PA, tiêu đề, người gửi…"
            className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-doan-400"
          />
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={QUEUE.map((q) => ({ value: q.value, label: q.label, count: counts[q.value] ?? 0 }))}
      />

      <div className="space-y-3">
        {list.map((f) => {
          const open = openId === f.id;
          const messages = store.feedbackMessages
            .filter((m) => m.feedbackId === f.id)
            .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
          const emails = store.emailLogs
            .filter((l) => l.feedbackId === f.id)
            .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
          return (
            <Card key={f.id}>
              <CardBody className="p-0">
                <button onClick={() => setOpenId(open ? null : f.id)} className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left hover:bg-stone-50">
                  <span className="rounded bg-stone-100 px-2 py-1 font-mono text-[11px] font-bold text-stone-600">{f.trackingCode}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-stone-800">{f.title}</p>
                    <p className="text-[11px] text-stone-400">
                      {f.senderName} · {topicName(f.feedbackTopicId)} · {formatDateTime(f.submittedAt)}
                    </p>
                  </div>
                  <FeedbackStatusBadge status={f.status} />
                  {messages.length > 0 ? <Badge tone="gray">{messages.length} phản hồi</Badge> : null}
                </button>

                {open ? (
                  <div className="space-y-4 border-t border-stone-100 px-5 py-4">
                    <div className="rounded-lg bg-stone-50 p-3.5">
                      <p className="text-sm leading-relaxed text-stone-700">{f.content}</p>
                      <p className="mt-2 text-[11px] text-stone-400">
                        Liên hệ: {f.senderEmail}{f.senderPhone ? ` · ${f.senderPhone}` : ""}
                        {f.senderOrgText ? ` · ${f.senderOrgText}` : ""}
                      </p>
                      {f.senderCommuneUnion || f.senderProvinceUnion ? (
                        <p className="mt-0.5 text-[11px] text-stone-400">
                          Đoàn xã/phường: {f.senderCommuneUnion ?? "—"} · Đoàn tỉnh/thành: {f.senderProvinceUnion ?? "—"}
                        </p>
                      ) : null}
                      {f.evidenceNames && f.evidenceNames.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {f.evidenceNames.map((name) => (
                            <span key={name} className="inline-flex max-w-60 items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-stone-500 ring-1 ring-stone-200">
                              <Paperclip className="h-2.5 w-2.5 shrink-0 text-stone-400" />
                              <span className="truncate">{name}</span>
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-2.5">
                      {messages.map((m) => (
                        <div key={m.id} className={`rounded-lg p-3 text-sm ${m.isInternalNote ? "border border-amber-200 bg-amber-50" : "border border-sky-100 bg-sky-50"}`}>
                          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-bold text-stone-500">
                            {m.isInternalNote ? <StickyNote className="h-3 w-3" /> : null}
                            {m.isInternalNote ? "Ghi chú nội bộ" : m.senderName} · {formatDateTime(m.sentAt)}
                          </p>
                          <p className="leading-relaxed text-stone-700">{m.content}</p>
                        </div>
                      ))}
                    </div>

                    {emails.length > 0 ? (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                        <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                          <MailCheck className="h-3.5 w-3.5" /> Đã gửi {emails.length} email tới {f.senderEmail}
                        </p>
                        <ul className="mt-2 space-y-1.5">
                          {emails.map((l) => (
                            <li key={l.id} className="rounded-md bg-white px-2.5 py-1.5 text-[11px]">
                              <p className="flex flex-wrap items-center gap-1.5">
                                <Badge tone={l.kind === "RESULT" ? "green" : "blue"}>{l.kind === "RESULT" ? "Kết quả" : "Phản hồi"}</Badge>
                                <span className="font-medium text-stone-700">{l.subject}</span>
                                <span className="text-stone-400">· {formatDateTime(l.sentAt)}</span>
                                {l.delivery ? (
                                  <span className={l.delivery === "SENT" ? "font-medium text-emerald-600" : l.delivery === "FAILED" ? "font-medium text-red-500" : "text-stone-400"}>
                                    · {l.delivery === "SENT" ? "Đã gửi thật qua email" : l.delivery === "FAILED" ? "Gửi thất bại" : "Đang gửi…"}
                                  </span>
                                ) : null}
                              </p>
                              <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-stone-500">{l.body}</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    <div className="space-y-2 border-t border-stone-100 pt-3">
                      <Textarea
                        value={openId === f.id ? reply : ""}
                        onChange={(e) => setReply(e.target.value)}
                        rows={3}
                        placeholder={internal ? "Ghi chú nội bộ cho cán bộ xử lý…" : "Nội dung trả lời người gửi…"}
                      />
                      <div className="flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-1.5 text-xs text-stone-600">
                          <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="accent-doan-600" />
                          Ghi chú nội bộ (người gửi không thấy)
                        </label>
                        <div className="ml-auto flex flex-wrap gap-2">
                          {f.status !== "IN_PROGRESS" && f.status !== "CLOSED" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                store.setFeedbackStatus(session!, f.id, "IN_PROGRESS");
                                toast("Đã chuyển sang Đang xử lý.");
                              }}
                            >
                              Nhận xử lý
                            </Button>
                          ) : null}
                          {f.status !== "RESOLVED" ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                store.setFeedbackStatus(session!, f.id, "RESOLVED");
                                toast(`Đã đánh dấu Đã xử lý — hệ thống gửi email kết quả tới ${f.senderEmail}.`);
                              }}
                            >
                              Đánh dấu đã xử lý
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" onClick={() => resendResult(f.id)}>
                              <Mail className="h-3.5 w-3.5" /> Gửi lại kết quả qua email
                            </Button>
                          )}
                          {f.status !== "CLOSED" ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                store.setFeedbackStatus(session!, f.id, "CLOSED");
                                toast("Đã đóng phản ánh.");
                              }}
                            >
                              Đóng
                            </Button>
                          ) : null}
                          <Button size="sm" onClick={() => sendReply(f.id)}>
                            <Send className="h-3.5 w-3.5" /> {internal ? "Lưu ghi chú" : "Gửi phản hồi"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </CardBody>
            </Card>
          );
        })}
        {list.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-stone-300 bg-white py-14">
            <MessageSquareText className="h-8 w-8 text-stone-300" />
            <p className="mt-3 text-sm text-stone-400">Không có phản ánh nào phù hợp.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
