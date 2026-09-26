"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckSquare, CheckCircle2, Undo2, XCircle, ArrowRight } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/input";
import { DeadlineBadge, ConfirmStatusBadge, ProgressStatusBadge } from "@/components/dashboard/status-badge";
import { Progress } from "@/components/dashboard/progress-bar";
import { formatPercent, formatDate } from "@/lib/utils";

type Queue = "PENDING" | "NEEDS_INFO" | "REJECTED" | "CONFIRMED";

export default function XacNhanPage() {
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();
  const [tab, setTab] = useState<Queue>("PENDING");
  const [reviewing, setReviewing] = useState<{ id: number; action: "CONFIRM" | "REQUEST_INFO" | "REJECT" } | null>(null);
  const [note, setNote] = useState("");

  const scope = useMemo(() => (session ? store.scopeIds(session) : []), [session, store]);

  const queue = useMemo(
    () =>
      store.taskAssignments
        .filter((a) => scope.includes(a.orgUnitId) && a.orgUnitId !== session?.orgUnitId)
        .filter((a) => a.confirmStatus === tab)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [store.taskAssignments, scope, session, tab]
  );

  const counts = useMemo(() => {
    const c: Record<Queue, number> = { PENDING: 0, NEEDS_INFO: 0, REJECTED: 0, CONFIRMED: 0 };
    store.taskAssignments
      .filter((a) => scope.includes(a.orgUnitId) && a.orgUnitId !== session?.orgUnitId)
      .forEach((a) => { c[a.confirmStatus]++; });
    return c;
  }, [store.taskAssignments, scope, session]);

  const submitReview = () => {
    if (!reviewing || !session) return;
    const assignment = store.taskAssignments.find((a) => a.id === reviewing.id);
    if (reviewing.action !== "CONFIRM" && !note.trim()) {
      toast("Vui lòng nhập lý do khi yêu cầu bổ sung hoặc trả lại.", "warning");
      return;
    }
    store.reviewAssignment(session, reviewing.id, reviewing.action, note.trim() || undefined);
    toast(
      reviewing.action === "CONFIRM"
        ? "Đã xác nhận báo cáo — đơn vị nhận thông báo."
        : reviewing.action === "REQUEST_INFO"
          ? "Đã yêu cầu bổ sung thông tin."
          : "Đã trả lại báo cáo."
    );
    setReviewing(null);
    setNote("");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif-display text-xl font-bold text-stone-900">Xác nhận báo cáo của cấp dưới</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Hàng chờ các báo cáo kết quả nhiệm vụ cần bạn xử lý. Mỗi thao tác đều ghi vào assignment_reviews và gửi thông báo.
        </p>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "PENDING", label: "Chờ xác nhận", count: counts.PENDING },
          { value: "NEEDS_INFO", label: "Đang yêu cầu bổ sung", count: counts.NEEDS_INFO },
          { value: "REJECTED", label: "Đã trả lại", count: counts.REJECTED },
          { value: "CONFIRMED", label: "Đã xác nhận", count: counts.CONFIRMED },
        ]}
      />

      <div className="space-y-3">
        {queue.map((a) => {
          const task = store.tasks.find((t) => t.id === a.taskId);
          const targets = store.targetsOf(a.id);
          return (
            <Card key={a.id}>
              <CardHeader
                title={task?.title ?? `Nhiệm vụ #${a.taskId}`}
                subtitle={`${store.orgName(a.orgUnitId)} · Hạn ${formatDate(a.dueDate)}`}
                action={<DeadlineBadge dueDate={a.dueDate} />}
              />
              <CardBody className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <ProgressStatusBadge status={a.progressStatus} />
                  <div className="flex min-w-48 flex-1 items-center gap-2">
                    <Progress value={a.completionRate} />
                    <span className="text-xs font-semibold text-stone-600">{formatPercent(a.completionRate)}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-stone-600">
                  {targets.map((t) => {
                    const m = store.taskMetrics.find((x) => x.id === t.taskMetricId);
                    return (
                      <span key={t.id}>
                        {m?.name}: <b>{t.achievedValue.toLocaleString("vi-VN")}/{t.targetValue.toLocaleString("vi-VN")}</b> {m?.unitOfMeasure}
                      </span>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
                  <Link href={`/quan-tri/nhiem-vu/phan-cong/${a.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-doan-600 hover:underline">
                    Xem chi tiết &amp; lịch sử <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  {tab === "PENDING" ? (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => setReviewing({ id: a.id, action: "REQUEST_INFO" })}>
                        <Undo2 className="h-3.5 w-3.5" /> Yêu cầu bổ sung
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setReviewing({ id: a.id, action: "REJECT" })}>
                        <XCircle className="h-3.5 w-3.5" /> Trả lại
                      </Button>
                      <Button size="sm" onClick={() => setReviewing({ id: a.id, action: "CONFIRM" })}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Xác nhận
                      </Button>
                    </div>
                  ) : tab !== "CONFIRMED" ? (
                    <Button size="sm" onClick={() => setReviewing({ id: a.id, action: "CONFIRM" })}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Xác nhận lại
                    </Button>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          );
        })}
        {queue.length === 0 ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-stone-300 bg-white py-14">
            <CheckSquare className="h-8 w-8 text-stone-300" />
            <p className="mt-3 text-sm text-stone-400">Hàng chờ trống.</p>
          </div>
        ) : null}
      </div>

      <Modal
        open={reviewing !== null}
        onClose={() => setReviewing(null)}
        title={
          reviewing?.action === "CONFIRM"
            ? "Xác nhận báo cáo"
            : reviewing?.action === "REQUEST_INFO"
              ? "Yêu cầu bổ sung thông tin"
              : "Trả lại báo cáo"
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setReviewing(null)}>Hủy</Button>
            <Button variant={reviewing?.action === "CONFIRM" ? "primary" : "danger"} onClick={submitReview}>
              Gửi phản hồi
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-stone-600">
            {reviewing?.action === "CONFIRM"
              ? "Kết quả báo cáo sẽ được chốt để phục vụ chấm điểm và xếp hạng."
              : "Đơn vị nhận sẽ nhận thông báo kèm lý do để cập nhật lại báo cáo."}
          </p>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder={
              reviewing?.action === "CONFIRM"
                ? "Nhận xét (không bắt buộc)…"
                : "Lý do yêu cầu bổ sung / trả lại (bắt buộc)…"
            }
          />
        </div>
      </Modal>
    </div>
  );
}
