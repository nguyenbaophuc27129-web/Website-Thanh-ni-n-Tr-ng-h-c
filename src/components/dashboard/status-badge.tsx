import { Badge, type Tone } from "@/components/ui/badge";
import { deadlineLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** Trạng thái hoạt động: DRAFT / SUBMITTED / REVISED */
export function ActivityStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: Tone }> = {
    DRAFT: { label: "Nháp", tone: "gray" },
    SUBMITTED: { label: "Đã cập nhật", tone: "blue" },
    REVISED: { label: "Đã điều chỉnh", tone: "orange" },
  };
  const m = map[status] ?? { label: status, tone: "gray" as Tone };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

/** Trạng thái xác nhận (hoạt động & nhiệm vụ) */
export function ConfirmStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: Tone }> = {
    NOT_REQUIRED: { label: "Không cần xác nhận", tone: "gray" },
    PENDING: { label: "Chờ xác nhận", tone: "yellow" },
    CONFIRMED: { label: "Đã xác nhận", tone: "green" },
    NEEDS_INFO: { label: "Cần bổ sung", tone: "orange" },
    REJECTED: { label: "Bị trả lại", tone: "red" },
  };
  const m = map[status] ?? { label: status, tone: "gray" as Tone };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

/** Tiến độ nhiệm vụ */
export function ProgressStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: Tone }> = {
    NOT_STARTED: { label: "Chưa bắt đầu", tone: "gray" },
    IN_PROGRESS: { label: "Đang thực hiện", tone: "blue" },
    COMPLETED: { label: "Hoàn thành", tone: "green" },
    OVERDUE: { label: "Quá hạn", tone: "red" },
  };
  const m = map[status] ?? { label: status, tone: "gray" as Tone };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function FeedbackStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: Tone }> = {
    NEW: { label: "Chưa phản hồi", tone: "orange" },
    IN_PROGRESS: { label: "Đang xử lý", tone: "blue" },
    RESOLVED: { label: "Đã xử lý", tone: "green" },
    CLOSED: { label: "Đã đóng", tone: "gray" },
  };
  const m = map[status] ?? { label: status, tone: "gray" as Tone };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

export function PostStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: Tone }> = {
    DRAFT: { label: "Bản nháp", tone: "gray" },
    SCHEDULED: { label: "Hẹn giờ đăng", tone: "blue" },
    PUBLISHED: { label: "Đã đăng", tone: "green" },
    UNPUBLISHED: { label: "Đã gỡ", tone: "red" },
  };
  const m = map[status] ?? { label: status, tone: "gray" as Tone };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

/** Nhãn deadline D-7 / D-3 / QUÁ HẠN */
export function DeadlineBadge({ dueDate, className }: { dueDate?: string | null; className?: string }) {
  const { label, tone } = deadlineLabel(dueDate);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        tone === "danger"
          ? "border-red-200 bg-red-50 text-red-700"
          : tone === "warn"
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : tone === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-stone-200 bg-stone-100 text-stone-500",
        className
      )}
    >
      {label}
    </span>
  );
}

export function DocumentStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; tone: Tone }> = {
    DRAFT: { label: "Dự thảo", tone: "gray" },
    ISSUED: { label: "Đã ban hành", tone: "green" },
    REVOKED: { label: "Đã thu hồi", tone: "red" },
  };
  const m = map[status] ?? { label: status, tone: "gray" as Tone };
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
