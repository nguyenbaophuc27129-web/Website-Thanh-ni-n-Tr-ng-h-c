import type { BinhChonStory, VoteCampaign } from "@/types";

/**
 * Client lib bình chọn HS3T — fetcher typed cho API /api/binh-chon*.
 * Dữ liệu KHÔNG đi qua store-context sync (ảnh dataUrl phình snapshot).
 */

export const PAGE_SIZE = 12;
export const FULL_PHOTO_MAX_BYTES = 2 * 1024 * 1024; // 2MB — ảnh full 640x853
export const THUMB_PHOTO_MAX_BYTES = 400 * 1024; // 400KB — thumb 320x427

export interface BinhChonStats {
  approvedStories: number;
  totalVotes: number;
}

export interface StoryListResult {
  ok: boolean;
  error?: string;
  campaign?: VoteCampaign;
  stats?: BinhChonStats;
  stories?: BinhChonStory[];
  page?: number;
  totalPages?: number;
  total?: number;
  myVoteStoryId?: number | null;
  /** Danh sách gương định danh này đã bình chọn (phiếu hợp lệ) — chặn bấm lần 2 */
  myVotedStoryIds?: number[];
  /** Bài của tài khoản hiện tại (mọi trạng thái — chủ bài được xem để sửa lại lần sau) */
  myStory?: BinhChonStory | null;
  /** Top 5 mỗi nhóm danh hiệu (?withBoard=1) — HonorBoard */
  topByHonor?: Partial<Record<"TRUONG" | "TINH" | "TW_DE_CU", BinhChonStory[]>>;
}

export interface AdminBinhChonResult {
  ok: boolean;
  error?: string;
  campaign?: VoteCampaign;
  counts?: Record<"PENDING" | "APPROVED" | "REJECTED", number>;
  stories?: BinhChonStory[];
  stats?: {
    totalVotes: number;
    voterAccounts: number;
    topStories: { id: number; studentName: string; schoolName: string; votes: number }[];
    bySchool: { schoolName: string; stories: number; votes: number }[];
    byProvince: { provinceName: string; stories: number; votes: number }[];
  };
}

export interface SubmitStoryInput {
  studentName: string;
  className?: string;
  quote?: string;
  story: string;
  /** Thành tích nổi bật — ô riêng, optional */
  achievements?: string;
  /** Đơn vị tự nhập (hiện trên khung ảnh + card); trống → server dùng tên đơn vị tài khoản */
  orgDisplayName?: string;
  wardName?: string;
  provinceName?: string;
  /** Danh hiệu đã đạt (HS tự khai — admin chỉnh được khi duyệt) */
  honorLevel?: "TRUONG" | "TINH" | "TW_DE_CU";
  photoDataUrl: string;
  photoThumbDataUrl: string;
  /** Tối đa 3 ảnh kèm caption tự do (client nén sẵn, mỗi ảnh ≤ ~1.5MB) */
  gallery?: { dataUrl: string; caption?: string }[];
  /** Google ID token đã xác thực — bắt buộc khi gửi bài KHÔNG qua tài khoản */
  credential?: string;
}

async function jsonOf<T>(res: Response): Promise<T> {
  try {
    const data = await res.json();
    return (data ?? { ok: false, error: "Empty response" }) as T;
  } catch {
    return { ok: false, error: "Network or JSON error" } as unknown as T;
  }
}

/** GET /api/binh-chon — list bài APPROVED (khách xem được); withBoard → topByHonor cho HonorBoard */
export async function fetchStories(params: {
  page?: number;
  q?: string;
  provinceId?: number | null;
  sort?: "hot" | "new";
  storyId?: number | null;
  withBoard?: boolean;
  /** Lọc theo hạng mục danh hiệu (3 bảng tách biệt) */
  honorLevel?: "TRUONG" | "TINH" | "TW_DE_CU";
}): Promise<StoryListResult> {
  const sp = new URLSearchParams();
  if (params.page && params.page > 1) sp.set("page", String(params.page));
  if (params.q?.trim()) sp.set("q", params.q.trim());
  if (params.provinceId) sp.set("provinceId", String(params.provinceId));
  if (params.sort) sp.set("sort", params.sort);
  if (params.storyId) sp.set("storyId", String(params.storyId));
  if (params.withBoard) sp.set("withBoard", "1");
  if (params.honorLevel) sp.set("honorLevel", params.honorLevel);
  const qs = sp.toString();
  const res = await fetch(`/api/binh-chon${qs ? `?${qs}` : ""}`);
  return jsonOf<StoryListResult>(res);
}

/** POST /api/binh-chon — đăng bài (xác thực Gmail là đủ; có TK Đoàn viên thì nộp theo TK) */
export async function submitStory(
  input: SubmitStoryInput
): Promise<{ ok: boolean; error?: string; needAuth?: boolean }> {
  const res = await fetch("/api/binh-chon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return jsonOf<{ ok: boolean; error?: string; needAuth?: boolean }>(res);
}

/** DELETE /api/binh-chon — hủy bài của mình đang chờ duyệt */
export async function withdrawStory(): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/binh-chon", { method: "DELETE" });
  return jsonOf<{ ok: boolean; error?: string }>(res);
}

/** POST /api/binh-chon/bau — bỏ phiếu (khách gửi kèm credential Google đã xác thực) */
export async function voteStory(
  storyId: number,
  credential?: string
): Promise<{ ok: boolean; error?: string; invalid?: boolean; message?: string; needAuth?: boolean; newCount?: number }> {
  const res = await fetch("/api/binh-chon/bau", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storyId, credential: credential || undefined }),
  });
  return jsonOf<{ ok: boolean; error?: string; invalid?: boolean; message?: string; needAuth?: boolean; newCount?: number }>(res);
}

/** GET /api/binh-chon/quan-tri — dữ liệu duyệt + thống kê (theo scope, ?kind=HS3T|DOAN_TRUONG) */
export async function adminGet(kind: "HS3T" | "DOAN_TRUONG" = "HS3T"): Promise<AdminBinhChonResult> {
  const res = await fetch(`/api/binh-chon/quan-tri?kind=${kind}`);
  return jsonOf<AdminBinhChonResult>(res);
}

export type AdminPatchAction =
  | { action: "approve"; id: number; honorLevel?: "TRUONG" | "TINH" | "TW_DE_CU" }
  | { action: "honor"; id: number; honorLevel: "TRUONG" | "TINH" | "TW_DE_CU" }
  | { action: "reject"; id: number; reason: string }
  | { action: "delete"; id: number }
  | {
      action: "campaign";
      /** Loại chiến dịch — mặc định HS3T */
      kind?: "HS3T" | "DOAN_TRUONG";
      title?: string;
      startsAt?: string;
      endsAt?: string;
      status?: "DRAFT" | "LIVE" | "ENDED";
      giftNote?: string;
    };

/** PATCH /api/binh-chon/quan-tri — duyệt / từ chối / xóa bài / sửa chiến dịch */
export async function adminPatch(body: AdminPatchAction): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/binh-chon/quan-tri", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return jsonOf<{ ok: boolean; error?: string }>(res);
}

/** Đếm ngược từ ISO — dừng ở 0 khi hết hạn hoặc không có ngày */
export function countdownParts(iso?: string): { days: number; hours: number; minutes: number; ended: boolean } {
  if (!iso) return { days: 0, hours: 0, minutes: 0, ended: true };
  const diff = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(diff) || diff <= 0) return { days: 0, hours: 0, minutes: 0, ended: true };
  const minutes = Math.floor(diff / 60_000);
  return {
    days: Math.floor(minutes / 1440),
    hours: Math.floor((minutes % 1440) / 60),
    minutes: minutes % 60,
    ended: false,
  };
}
