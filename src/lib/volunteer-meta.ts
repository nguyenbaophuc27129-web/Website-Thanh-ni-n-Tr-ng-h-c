import type { VolunteerProjectField, VolunteerProjectPhase } from "@/types";

/** Nhãn + màu badge cho lĩnh vực dự án tình nguyện (ngân hàng dự án) */
export const FIELD_META: Record<
  VolunteerProjectField,
  { label: string; tone: "green" | "blue" | "orange" | "purple" | "gray" }
> = {
  MOI_TRUONG: { label: "Môi trường", tone: "green" },
  GIAO_DUC: { label: "Giáo dục", tone: "blue" },
  AN_SINH: { label: "An sinh xã hội", tone: "orange" },
  Y_TE: { label: "Y tế — sức khỏe", tone: "purple" },
  VAN_HOA: { label: "Văn hóa — thể thao", tone: "gray" },
  KHAC: { label: "Lĩnh vực khác", tone: "gray" },
};

/** Nhãn + màu chip cho giai đoạn triển khai */
export const PHASE_META: Record<VolunteerProjectPhase, { label: string; cls: string }> = {
  DANG_TUYEN: { label: "Đang tuyển thành viên", cls: "bg-blue-50 text-blue-700 ring-blue-200" },
  DANG_TRIEN_KHAI: { label: "Đang triển khai", cls: "bg-amber-50 text-amber-700 ring-amber-200" },
  HOAN_THANH: { label: "Hoàn thành", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
};

export const fieldLabel = (f: VolunteerProjectField) => FIELD_META[f]?.label ?? f;
export const phaseLabel = (p: VolunteerProjectPhase) => PHASE_META[p]?.label ?? p;
