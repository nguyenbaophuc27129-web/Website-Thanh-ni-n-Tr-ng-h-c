"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, SearchCheck, MessageSquare, MailCheck, Send, Lock } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { callPublicApi } from "@/lib/public-api-client";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, type Tone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import { EmptyState } from "@/components/public/empty-state";
import type { EmailLog, Feedback, FeedbackMessage } from "@/types";

const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  NEW: { label: "Chưa phản hồi", tone: "orange" },
  IN_PROGRESS: { label: "Đang xử lý", tone: "blue" },
  RESOLVED: { label: "Đã xử lý", tone: "green" },
  CLOSED: { label: "Đã đóng", tone: "gray" },
};

/** Dữ liệu tra cứu do máy chủ trả (GET /api/phan-anh/[code]) — email người gửi đã được che bớt */
interface LookupData {
  feedback: Feedback;
  messages: FeedbackMessage[];
  emails: Pick<EmailLog, "id" | "kind" | "subject" | "delivery" | "sentAt">[];
}

export default function PhanAnhChiTietPage() {
  const params = useParams<{ code: string }>();
  const { feedbackTopics } = useStore();
  const { session } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<LookupData | null>(null);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  // Nạp lại khi đăng nhập / đăng xuất (mã kiểu cũ chỉ xem được khi đăng nhập đúng tài khoản)
  const accountId = session?.accountId;
  useEffect(() => {
    let alive = true;
    void callPublicApi<LookupData>(`/api/phan-anh/${encodeURIComponent(params.code)}`).then((r) => {
      if (!alive) return;
      if (r.ok) {
        setData({ feedback: r.feedback, messages: r.messages, emails: r.emails });
        setError(null);
      } else {
        setData(null);
        setError({ status: r.status, message: r.error });
      }
    });
    return () => {
      alive = false;
    };
  }, [params.code, accountId]);

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = reply.trim();
    if (content.length < 2 || sending) return;
    setSending(true);
    const r = await callPublicApi<{ messages: FeedbackMessage[] }>(
      `/api/phan-anh/${encodeURIComponent(params.code)}/tin-nhan`,
      { content },
    );
    setSending(false);
    if (!r.ok) {
      toast(r.error, "warning");
      return;
    }
    setReply("");
    setData((d) => (d ? { ...d, messages: r.messages } : d));
    toast("Đã gửi tin nhắn tới cán bộ xử lý.");
  };

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        {error ? (
          error.status === 403 ? (
            <EmptyState message={error.message} icon={Lock} />
          ) : (
            <EmptyState message={error.status === 404 ? `Không tìm thấy phản ánh với mã ${params.code}.` : error.message} icon={SearchCheck} />
          )
        ) : (
          <p className="text-center text-sm text-stone-400">Đang tải phản ánh…</p>
        )}
        {error ? (
          <div className="mt-4 flex justify-center gap-4 text-center">
            <Link href="/phan-anh/tra-cuu" className="text-sm font-medium text-doan-600 hover:underline">
              Thử mã khác
            </Link>
            {error.status === 403 && !session ? (
              <Link href="/dang-nhap" className="text-sm font-medium text-doan-600 hover:underline">
                Đăng nhập
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  const { feedback: fb, messages, emails } = data;
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
          subtitle={`Lĩnh vực: ${feedbackTopics.find((t) => t.id === fb.feedbackTopicId)?.name ?? "—"} · Gửi lúc ${formatDateTime(fb.submittedAt)} bởi ${fb.senderName}`}
        />
        <CardBody>
          <p className="whitespace-pre-line text-sm leading-relaxed text-stone-700">{fb.content}</p>
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

      {emails.length > 0 ? (
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
      ) : null}

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
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-stone-700">{m.content}</p>
            </div>
          ))
        )}
      </div>

      {/* ===== Người gửi nhắn thêm (bổ sung thông tin / hỏi tiến độ) ===== */}
      {fb.status !== "CLOSED" ? (
        <form onSubmit={sendReply} className="mt-6 rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs font-semibold text-stone-900">Nhắn thêm cho cán bộ xử lý</p>
          <p className="mt-0.5 text-[11px] text-stone-400">Bổ sung thông tin hoặc hỏi tiến độ — tin nhắn hiện trong lịch sử trao đổi ở trên.</p>
          <Textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={3}
            maxLength={5000}
            placeholder="Nhập nội dung…"
            className="mt-3"
          />
          <div className="mt-3 flex justify-end">
            <Button type="submit" size="sm" disabled={sending || reply.trim().length < 2}>
              <Send className="h-3.5 w-3.5" /> {sending ? "Đang gửi…" : "Gửi tin nhắn"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
