"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, Pencil, ExternalLink, CheckCircle2, Undo2, XCircle, Megaphone } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/input";
import { ActivityStatusBadge, ConfirmStatusBadge } from "@/components/dashboard/status-badge";
import { PhotoPlaceholder } from "@/components/ui/photo-placeholder";
import { ActivityForm } from "@/components/dashboard/activity-form";
import { formatDate, formatNumber, formatDateTime } from "@/lib/utils";

export default function ChiTietHoatDongPage() {
  const params = useParams<{ id: string }>();
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [reviewModal, setReviewModal] = useState<"CONFIRM" | "NEEDS_INFO" | "REJECT" | null>(null);
  const [note, setNote] = useState("");

  const activity = useMemo(
    () => store.activities.find((a) => a.id === Number(params.id)),
    [store.activities, params.id]
  );

  if (!activity) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-stone-500">Không tìm thấy hoạt động.</p>
        <Link href="/quan-tri/hoat-dong" className="mt-2 inline-block text-sm font-medium text-doan-600 hover:underline">
          Về danh sách
        </Link>
      </div>
    );
  }

  const isOwner = session?.orgUnitId === activity.orgUnitId;
  const scope = session ? store.scopeIds(session) : [];
  const isSuperior = scope.includes(activity.orgUnitId) && !isOwner;
  const canReview = isSuperior && (activity.confirmStatus === "PENDING" || activity.confirmStatus === "NEEDS_INFO");
  const canEdit = isOwner && activity.status !== "DRAFT" ? false : isOwner;
  const existingPost = store.publishedPosts.find((p) => p.activityId === activity.id);

  const submitReview = () => {
    if (!reviewModal || !session) return;
    store.reviewActivity(session, activity.id, reviewModal, note.trim() || undefined);
    const msg =
      reviewModal === "CONFIRM"
        ? "Đã xác nhận hoạt động. Đơn vị thực hiện nhận thông báo."
        : reviewModal === "NEEDS_INFO"
          ? "Đã yêu cầu bổ sung thông tin."
          : "Đã trả lại hoạt động.";
    toast(msg);
    setReviewModal(null);
    setNote("");
  };

  if (editing) {
    return (
      <div className="mx-auto max-w-3xl space-y-5">
        <h1 className="font-serif-display text-xl font-bold text-stone-900">Chỉnh sửa hoạt động</h1>
        <ActivityForm activity={activity} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <Link href="/quan-tri/hoat-dong" className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-doan-600">
          <ArrowLeft className="h-3.5 w-3.5" /> Danh sách hoạt động
        </Link>
        <div className="flex gap-2">
          {isOwner ? (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-3.5 w-3.5" /> Chỉnh sửa
            </Button>
          ) : null}
          {isOwner && existingPost === undefined && session?.role !== "DON_VI" ? null : null}
        </div>
      </div>

      <Card>
        <div className="relative">
          <PhotoPlaceholder seed={activity.imageSeed} className="h-48 w-full rounded-t-xl" />
          <div className="absolute left-4 top-4 flex gap-2">
            <span className="rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-bold text-stone-800 backdrop-blur">
              #{activity.id}
            </span>
          </div>
        </div>
        <CardBody>
          <div className="flex flex-wrap items-center gap-2">
            <ActivityStatusBadge status={activity.status} />
            <ConfirmStatusBadge status={activity.confirmStatus} />
            <span className="text-[11px] text-stone-400">
              {activity.activityType === "TASK_BASED" ? "Thực hiện nhiệm vụ" : "Nhóm nội dung chung"}
            </span>
          </div>
          <h1 className="mt-3 font-serif-display text-xl font-bold leading-snug text-stone-900">
            {activity.title}
          </h1>
          <div className="mt-2 grid gap-x-8 gap-y-1.5 text-xs text-stone-500 sm:grid-cols-2">
            <p>Đơn vị thực hiện: <span className="font-medium text-stone-700">{store.orgName(activity.orgUnitId)}</span></p>
            <p>Thời gian: <span className="font-medium text-stone-700">{formatDate(activity.startDate)}{activity.endDate !== activity.startDate ? ` — ${formatDate(activity.endDate)}` : ""}</span></p>
            {activity.location ? <p>Địa điểm: <span className="font-medium text-stone-700">{activity.location}</span></p> : null}
            <p>Tham gia: <span className="font-medium text-stone-700">{formatNumber(activity.participantCount)} đoàn viên</span></p>
            <p>Tạo lúc: <span className="font-medium text-stone-700">{formatDateTime(activity.createdAt)}</span></p>
            {activity.updatedAt ? <p>Cập nhật: <span className="font-medium text-stone-700">{formatDateTime(activity.updatedAt)}</span></p> : null}
          </div>

          <p className="mt-4 text-sm leading-relaxed text-stone-700">{activity.summary}</p>

          {activity.categoryIds.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {activity.categoryIds.map((cid) => (
                <span key={cid} className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-600">
                  {store.contentCategories.find((c) => c.id === cid)?.name ?? `#${cid}`}
                </span>
              ))}
            </div>
          ) : null}
        </CardBody>
      </Card>

      {activity.reviewNote ? (
        <div className={`rounded-xl border p-4 text-sm ${activity.confirmStatus === "REJECTED" ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
          <p className="font-semibold">Ý kiến của cấp trên:</p>
          <p className="mt-1">{activity.reviewNote}</p>
        </div>
      ) : null}

      {activity.links.length > 0 ? (
        <Card>
          <CardHeader title="Link minh chứng truyền thông" subtitle={`${activity.links.length} link`} />
          <CardBody className="space-y-2">
            {activity.links.map((l) => (
              <a
                key={l.id}
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 rounded-lg border border-stone-200 px-3.5 py-2.5 text-sm hover:border-doan-200 hover:bg-doan-50/40"
              >
                <span className="rounded bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">{l.platform}</span>
                <span className="truncate text-xs text-sky-700">{l.url}</span>
                <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-stone-400" />
              </a>
            ))}
          </CardBody>
        </Card>
      ) : null}

      {canReview ? (
        <Card className="border-amber-200">
          <CardHeader
            title="Xác nhận của cấp trên"
            subtitle="Bạn là cấp trên trực tiếp của đơn vị thực hiện hoạt động này."
          />
          <CardBody className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setReviewModal("NEEDS_INFO")}>
              <Undo2 className="h-4 w-4" /> Yêu cầu bổ sung
            </Button>
            <Button variant="danger" onClick={() => setReviewModal("REJECT")}>
              <XCircle className="h-4 w-4" /> Trả lại
            </Button>
            <Button onClick={() => setReviewModal("CONFIRM")}>
              <CheckCircle2 className="h-4 w-4" /> Xác nhận hoạt động
            </Button>
          </CardBody>
        </Card>
      ) : null}

      {isSuperior && activity.confirmStatus === "CONFIRMED" ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4.5 w-4.5" /> Bạn đã xác nhận hoạt động này.
        </div>
      ) : null}

      {/* Review modal */}
      <Modal
        open={reviewModal !== null}
        onClose={() => setReviewModal(null)}
        title={
          reviewModal === "CONFIRM"
            ? "Xác nhận hoạt động"
            : reviewModal === "NEEDS_INFO"
              ? "Yêu cầu bổ sung thông tin"
              : "Trả lại hoạt động"
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setReviewModal(null)}>Hủy</Button>
            <Button
              variant={reviewModal === "CONFIRM" ? "primary" : "danger"}
              onClick={submitReview}
            >
              {reviewModal === "CONFIRM" ? "Xác nhận" : "Gửi phản hồi"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-stone-600">
            {reviewModal === "CONFIRM"
              ? "Xác nhận hoạt động đã diễn ra đúng nội dung cập nhật."
              : "Đơn vị thực hiện sẽ nhận thông báo kèm ý kiến của bạn để chỉnh sửa."}
          </p>
          {reviewModal !== "CONFIRM" ? (
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ý kiến chỉ dẫn (bắt buộc khi trả lại)…"
              rows={3}
            />
          ) : (
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nhận xét thêm (không bắt buộc)…" rows={3} />
          )}
        </div>
      </Modal>
    </div>
  );
}
