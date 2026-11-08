import type { Nomination, NominationStatus } from "@/types";

export const NOMINATION_FIELDS = [
  "Học tập & Nghiên cứu khoa học",
  "Đổi mới sáng tạo & Chuyển đổi số",
  "Văn hóa - Văn nghệ",
  "Thể dục - Thể thao",
  "Hoạt động xã hội & Tình nguyện vì cộng đồng",
  "Khởi nghiệp trẻ & Lao động sáng tạo",
] as const;

export type NominationField = (typeof NOMINATION_FIELDS)[number];

export interface FetchNominationsParams {
  field?: string;
  orgUnitId?: number;
  page?: number;
  limit?: number;
}

export interface FetchNominationsResult {
  ok: boolean;
  nominations: Nomination[];
  total: number;
  totalPages: number;
  page: number;
  error?: string;
}

export async function fetchNominations(params: FetchNominationsParams = {}): Promise<FetchNominationsResult> {
  const sp = new URLSearchParams();
  if (params.field) sp.set("field", params.field);
  if (params.orgUnitId) sp.set("orgUnitId", String(params.orgUnitId));
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));

  try {
    const res = await fetch(`/api/de-cu?${sp.toString()}`, { cache: "no-store" });
    if (!res.ok) return { ok: false, nominations: [], total: 0, totalPages: 1, page: 1, error: `HTTP ${res.status}` };
    return (await res.json()) as FetchNominationsResult;
  } catch (e) {
    return { ok: false, nominations: [], total: 0, totalPages: 1, page: 1, error: (e as Error).message };
  }
}

export async function fetchNominationDetail(id: number): Promise<{ ok: boolean; nomination?: Nomination; error?: string }> {
  try {
    const res = await fetch(`/api/de-cu?id=${id}`, { cache: "no-store" });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    return (await res.json()) as { ok: boolean; nomination?: Nomination; error?: string };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export interface SubmitNominationPayload {
  nomineeName: string;
  nomineePosition?: string;
  orgUnitId: number;
  field: string;
  quote?: string;
  achievements: string;
  evidenceDataUrl: string;
  evidenceThumbDataUrl: string;
}

export async function submitNomination(payload: SubmitNominationPayload): Promise<{ ok: boolean; id?: number; error?: string }> {
  try {
    const res = await fetch("/api/de-cu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => null)) as { ok: boolean; id?: number; error?: string } | null;
    if (!res.ok) return { ok: false, error: data?.error ?? `HTTP ${res.status}` };
    return data ?? { ok: false, error: "Lỗi kết nối máy chủ" };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export interface AdminNominationsResult {
  ok: boolean;
  counts: {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  };
  nominations: Nomination[];
  total: number;
  error?: string;
}

export async function adminGetNominations(params: {
  status?: NominationStatus;
  q?: string;
  page?: number;
  limit?: number;
} = {}): Promise<AdminNominationsResult> {
  const sp = new URLSearchParams();
  if (params.status) sp.set("status", params.status);
  if (params.q) sp.set("q", params.q);
  if (params.page) sp.set("page", String(params.page));
  if (params.limit) sp.set("limit", String(params.limit));

  try {
    const res = await fetch(`/api/de-cu/quan-tri?${sp.toString()}`, { cache: "no-store" });
    if (!res.ok) {
      return {
        ok: false,
        counts: { pending: 0, approved: 0, rejected: 0, total: 0 },
        nominations: [],
        total: 0,
        error: `HTTP ${res.status}`,
      };
    }
    return (await res.json()) as AdminNominationsResult;
  } catch (e) {
    return {
      ok: false,
      counts: { pending: 0, approved: 0, rejected: 0, total: 0 },
      nominations: [],
      total: 0,
      error: (e as Error).message,
    };
  }
}

export async function adminPatchNomination(payload: {
  id: number;
  action: "approve" | "reject";
  reason?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/de-cu/quan-tri", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => null)) as { ok: boolean; error?: string } | null;
    if (!res.ok) return { ok: false, error: data?.error ?? `HTTP ${res.status}` };
    return data ?? { ok: false, error: "Lỗi kết nối máy chủ" };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/**
 * Nén ảnh trên client bằng HTMLCanvasElement:
 * Trả về 2 dataUrl (full tối đa 1200px q0.85, thumb tối đa 480px q0.75)
 */
export async function resizeImageFile(file: File): Promise<{ full: string; thumb: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Không thể đọc tệp ảnh"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Tệp không phải định dạng hình ảnh hợp lệ"));
      img.onload = () => {
        try {
          const createDataUrl = (maxDim: number, quality: number) => {
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas context không khả dụng");
            ctx.drawImage(img, 0, 0, width, height);
            return canvas.toDataURL("image/jpeg", quality);
          };

          const full = createDataUrl(1200, 0.85);
          const thumb = createDataUrl(480, 0.75);
          resolve({ full, thumb });
        } catch (err) {
          reject(err);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
