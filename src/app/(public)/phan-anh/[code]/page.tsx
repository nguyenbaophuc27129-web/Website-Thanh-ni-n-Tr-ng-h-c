"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { ArrowLeft, SearchCheck, MessageSquare, MailCheck } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { EmptyState } from "@/components/public/empty-state";

const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  NEW: { label: "Chưa phản hồi", tone: "orange" },
  IN_PROGRESS: { label: "Đang xử lý", tone: "blue" },
  RESOLVED: { label: "Đã xử lý", tone: "green" },
  CLOSED: { label: "Đã đóng", tone: "gray" },
};

export default function PhanAnhChiTietPage() {
  const params = useParams<{ code: string }>();
  const { feedbacks, feedbackMessages, feedbackTopics, emailLogs } = useStore();

  const fb = useMemo(
    () => feedbacks.find((f) => f.trackingCode.toLowerCase() === params.code.toLowerCase()),
    [feedbacks, params.code]
  );
  const messages = useMemo(
    () =>
      fb
        ? feedbackMessages.filter((m) => m.feedbackId === fb.id && !m.isInternalNote).sort((a, b) => a.sentAt.localeCompare(b.sentAt))
        : [],
    [feedbackMessages, fb]
  );

  if (!fb) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState message={`Không tìm thấy phản ánh với mã ${params.code}.`} icon={SearchCheck} />
        <div className="mt-4 text-center">
          <Link href="/phan-anh/tra-cuu" className="text-sm font-medium text-doan-600 hover:underline">
            Thử mã khác
          </Link>
        </div>
      </div>
    );
  }

  const meta = STATUS_META[fb.status];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/phan-anh/tra-cuu" className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-doan-600">
        <ArrowLeft className="h-3.5 w-3.5" /> Tra cứu mã khác
      </Link>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="font-serif-display text-xl font-bold text-stone-900">{fb.trackingCode}</span>
        <Badge tone={meta.tone}>{meta.label}</Badge>
      </div>

      <Card className="mt-4">
        <CardHeader
          title={fb.title}
          subtitle={`Lĩnh vực: ${feedbackTopics.find((t) => t.id === fb.feedbackTopicId)?.name} · Gửi lúc ${formatDateTime(fb.submittedAt)} bởi ${fb.senderName}`}
        />
        <CardBody>
          <p className="text-sm leading-relaxed text-stone-700">{fb.content}</p>
          {fb.senderCommuneUnion || fb.senderProvinceUnion || (fb.evidenceNames && fb.evidenceNames.length > 0) ? (
            <div className="mt-3 space-y-1.5 border-t border-stone-100 pt-3 text-[11px] text-stone-400">
              {fb.senderCommuneUnion ? <p>Đoàn xã/phường: {fb.senderCommuneUnion}</p> : null}
              {fb.senderProvinceUnion ? <p>Đoàn tỉnh/thành phố: {fb.senderProvinceUnion}</p> : null}
              {fb.evidenceNames && fb.evidenceNames.length > 0 ? (
                <p>Minh chứng đính kèm: {fb.evidenceNames.join(", ")}</p>
              ) : null}
            </div>
          ) : null}
        </CardBody>
      </Card>

      <h2 className="mt-8 flex items-center gap-2 font-serif-display text-lg font-bold text-stone-900">
        <MessageSquare className="h-4.5 w-4.5 text-doan-600" /> Lịch sử trao đổi
      </h2>

      {(() => {
        const emails = emailLogs
          .filter((l) => l.feedbackId === fb.id)
          .sort((a, b) => b.sentAt.localeCompare(a.sentAt));
        if (emails.length === 0) return null;
        return (
          <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3 text-xs text-emerald-800">
            <p className="flex items-center gap-1.5 font-semibold">
              <MailCheck className="h-3.5 w-3.5" />
              Hệ thống đã gửi {emails.length} email thông báo tới {fb.senderEmail}
              {fb.status === "RESOLVED" ? " (bao gồm kết quả xử lý)" : ""}
            </p>
            <ul className="mt-1.5 space-y-0.5 text-[11px] text-emerald-700">
              {emails.map((l) => (
                <li key={l.id}>
                  - {l.kind === "RESULT" ? "Email kết quả xử lý" : "Email phản hồi"}: {l.subject} · {formatDateTime(l.sentAt)}
                  {l.delivery === "SENT" ? " · Đã gửi thật" : l.delivery === "FAILED" ? " · Gửi thất bại" : ""}
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      <div className="mt-4 space-y-4">
        {messages.length === 0 ? (
          <EmptyState message="Cán bộ phụ trách chưa phản hồi. Kết quả sẽ hiển thị tại đây và gửi qua email của bạn." />
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`rounded-xl border p-4 ${m.senderType === "STAFF" ? "border-doan-100 bg-doan-50/40" : "border-stone-200 bg-white"}`}>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-stone-900">
                  {m.senderType === "STAFF" ? "Ban điều hành Cổng TNTH" : m.senderName}
                </p>
                <span className="text-[11px] text-stone-400">{formatDateTime(m.sentAt)}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-stone-700">{m.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
