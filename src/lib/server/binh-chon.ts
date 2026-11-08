import { query } from "@/lib/db";
import { callAI } from "@/lib/ai-client";
import { ruleModerate } from "@/lib/ai-moderation";
import { hasPerm } from "@/lib/permissions";
import type { SessionDto } from "@/lib/server/auth";
import type { BinhChonStory, ModerationResult, UnitStory, VoteCampaign } from "@/types";

/**
 * Server lib bình chọn HS3T — dùng chung cho các route /api/binh-chon*.
 * Kịch bản: chiến dịch đang LIVE + trong hạn → học sinh đăng bài (1 bài/tài khoản)
 * → AI + quy tắc kiểm duyệt văn bản (ảnh do admin duyệt mắt) → admin duyệt → công khai.
 */

export interface CampaignRow {
  id: number | string;
  code: string;
  title: string;
  year: number;
  starts_at: Date | string;
  ends_at: Date | string;
  status: string;
  campaign_kind: string | null;
  gift_note: string | null;
}

const ISO = (v: Date | string | null): string =>
  v === null ? "" : v instanceof Date ? v.toISOString() : new Date(v).toISOString();

export function toCampaignDto(r: CampaignRow): VoteCampaign {
  return {
    id: Number(r.id),
    code: r.code,
    title: r.title,
    year: Number(r.year),
    startsAt: ISO(r.starts_at),
    endsAt: ISO(r.ends_at),
    status: r.status as VoteCampaign["status"],
    kind: (r.campaign_kind as VoteCampaign["kind"]) ?? "HS3T",
    giftNote: r.gift_note ?? undefined,
  };
}

/**
 * Chiến dịch mới nhất theo loại — MỌI caller phải truyền kind
 * (sau 0028 chiến dịch mới nhất là DOAN-TRUONG-2026, không lọc là đọc nhầm).
 */
export async function getActiveCampaign(kind: "HS3T" | "DOAN_TRUONG" = "HS3T"): Promise<VoteCampaign | null> {
  const rows = await query<CampaignRow>(
    "SELECT id, code, title, year, starts_at, ends_at, status, campaign_kind, gift_note FROM vote_campaigns WHERE campaign_kind = $1 ORDER BY id DESC LIMIT 1",
    [kind]
  );
  return rows[0] ? toCampaignDto(rows[0]) : null;
}

/** Chiến dịch đang mở: LIVE và nằm trong khoảng thời gian */
export function campaignOpenNow(c: VoteCampaign): boolean {
  if (c.status !== "LIVE") return false;
  const now = Date.now();
  return new Date(c.startsAt).getTime() <= now && now <= new Date(c.endsAt).getTime();
}

type StoryRow = {
  id: number | string;
  campaign_id: number | string;
  student_name: string;
  school_org_unit_id: number | string;
  school_name: string | null;
  province_name: string | null;
  ward_name?: string | null;
  class_name: string | null;
  quote: string | null;
  story: string;
  achievements: string | null;
  org_display_name: string | null;
  photo_data_url: string | null;
  photo_thumb_data_url: string | null;
  ai_verdict: string | null;
  ai_reason: string | null;
  status: string | null;
  rejection_reason: string | null;
  vote_count: number | string;
  approved_at: Date | string | null;
  created_at: Date | string;
  honor_level: string | null;
  username?: string | null;
};

/** DTO — pg trả bigint dạng string → Number() MỌI id/count */
export function toStoryDto(r: StoryRow, opts?: { withPhoto?: boolean }): BinhChonStory {
  return {
    id: Number(r.id),
    campaignId: Number(r.campaign_id),
    studentName: r.student_name,
    schoolOrgUnitId: Number(r.school_org_unit_id),
    schoolName: r.school_name ?? "",
    provinceName: r.province_name ?? undefined,
    wardName: r.ward_name ?? undefined,
    className: r.class_name ?? undefined,
    quote: r.quote ?? undefined,
    story: r.story,
    achievements: r.achievements ?? undefined,
    orgDisplayName: r.org_display_name ?? undefined,
    photoThumbDataUrl: r.photo_thumb_data_url ?? "",
    photoDataUrl: opts?.withPhoto ? (r.photo_data_url ?? undefined) : undefined,
    voteCount: Number(r.vote_count),
    approvedAt: r.approved_at ? ISO(r.approved_at) : undefined,
    createdAt: ISO(r.created_at),
    honorLevel: (r.honor_level as BinhChonStory["honorLevel"]) ?? undefined,
    status: (r.status as BinhChonStory["status"]) ?? undefined,
    aiVerdict: (r.ai_verdict as BinhChonStory["aiVerdict"]) ?? undefined,
    aiReason: r.ai_reason ?? undefined,
    rejectionReason: r.rejection_reason ?? undefined,
    accountUsername: r.username ?? undefined,
  };
}

/** SELECT dùng lại cho cả list lẫn detail — join trường + tỉnh + danh hiệu đã đạt (HS tự khai) */
export const STORY_SELECT = `
  SELECT s.id, s.campaign_id, s.student_name, s.school_org_unit_id, s.class_name, s.quote, s.story,
         s.achievements, s.org_display_name,
         s.photo_data_url, s.photo_thumb_data_url, s.ai_verdict, s.ai_reason, s.status,
         s.rejection_reason, s.vote_count, s.approved_at, s.created_at, s.honor_level,
         school.name AS school_name,
         CASE WHEN school.path ~ '^/1/[0-9]+/' THEN split_part(school.path, '/', 3)::bigint END AS province_admin_id,
         s.ward_name,
         COALESCE(s.province_name, prov.name) AS province_name,
         acc.username
    FROM hs3t_stories s
    JOIN org_units school ON school.id = s.school_org_unit_id
    LEFT JOIN accounts acc ON acc.id = s.account_id
    LEFT JOIN LATERAL (
      SELECT au.name FROM org_units pu
        JOIN admin_units au ON au.id = pu.admin_unit_id
       WHERE pu.id = CASE WHEN school.path ~ '^/1/[0-9]+/' THEN split_part(school.path, '/', 3)::bigint ELSE NULL END
       LIMIT 1
    ) prov ON true`;


export type UnitStoryRow = {
  id: number | string;
  campaign_id: number | string;
  org_unit_id: number | string;
  submitted_by_account_id: number | string | null;
  title: string;
  intro: string;
  achievements: string | null;
  photo_data_url: string | null;
  photo_thumb_data_url: string | null;
  ai_verdict: string | null;
  ai_reason: string | null;
  ai_model: string | null;
  status: string | null;
  rejection_reason: string | null;
  approved_by_account_id: number | string | null;
  approved_at: Date | string | null;
  vote_count: number | string;
  created_at: Date | string;
  updated_at: Date | string;
  school_name?: string | null;
  province_name?: string | null;
  account_username?: string | null;
};

export function toUnitStoryDto(r: UnitStoryRow, opts?: { withPhoto?: boolean }): UnitStory {
  return {
    id: Number(r.id),
    campaignId: Number(r.campaign_id),
    orgUnitId: Number(r.org_unit_id),
    schoolName: r.school_name ?? "",
    provinceName: r.province_name ?? undefined,
    title: r.title,
    intro: r.intro,
    achievements: r.achievements ?? undefined,
    photoThumbDataUrl: r.photo_thumb_data_url ?? "",
    photoDataUrl: opts?.withPhoto ? (r.photo_data_url ?? undefined) : undefined,
    voteCount: Number(r.vote_count),
    status: (r.status as UnitStory["status"]) ?? undefined,
    aiVerdict: (r.ai_verdict as UnitStory["aiVerdict"]) ?? undefined,
    aiReason: r.ai_reason ?? undefined,
    rejectionReason: r.rejection_reason ?? undefined,
    approvedAt: r.approved_at ? ISO(r.approved_at) : undefined,
    createdAt: ISO(r.created_at),
    accountUsername: r.account_username ?? undefined,
  };
}

export const UNIT_STORY_SELECT = `
  SELECT u.id, u.campaign_id, u.org_unit_id, u.submitted_by_account_id,
         u.title, u.intro, u.achievements,
         u.photo_data_url, u.photo_thumb_data_url,
         u.ai_verdict, u.ai_reason, u.ai_model,
         u.status, u.rejection_reason, u.approved_by_account_id, u.approved_at,
         u.vote_count, u.created_at, u.updated_at,
         school.name AS school_name,
         school.path AS school_path,
         prov.name AS province_name,
         acc.username AS account_username
    FROM unit_stories u
    JOIN org_units school ON school.id = u.org_unit_id
    LEFT JOIN accounts acc ON acc.id = u.submitted_by_account_id
    LEFT JOIN LATERAL (
      SELECT au.name FROM org_units pu
        JOIN admin_units au ON au.id = pu.admin_unit_id
       WHERE pu.id = CASE WHEN school.path ~ '^/1/[0-9]+/' THEN split_part(school.path, '/', 3)::bigint ELSE NULL END
       LIMIT 1
    ) prov ON true`;

// ═══════════ Kiểm duyệt văn bản: rule trước → AI sau (giữ nguyên khối chống phản động của kiem-duyet) ═══════════

const MODERATE_SYSTEM_PROMPT =
  "Bạn là bộ phận kiểm duyệt nội dung diễn đàn học sinh - sinh viên ẩn danh của Cổng Thanh niên Trường học (TW Đoàn TNCS Hồ Chí Minh). " +
  "Hãy đánh giá văn bản và trả về DUY NHẤT một JSON (không thêm chữ nào khác): " +
  '{"verdict":"CLEAN"|"FLAGGED","reason":"lý do ngắn gọn tiếng Việt"}. ' +
  "FLAGGED khi: ngôn từ thô tục/công kích; nội dung cấm (cờ bạc, ma túy, bạo lực, khiêu dâm); " +
  "lừa đảo/quảng cáo/spam; chia sẻ thông tin cá nhân (số điện thoại, địa chỉ, link lạ); viết hoa hoặc lặp ký tự bất thường. " +
  "QUAN TRỌNG NHẤT — mọi phát ngôn chính trị phản động đều phải FLAGGED, kể cả được viết dưới dạng bàn luận kinh tế - xã hội ôn hòa, học thuật, trung tính: " +
  "xuyên tạc, bôi nhọ Đảng Cộng sản Việt Nam, Nhà nước CHXHCN Việt Nam, Chủ tịch Hồ Chí Minh; " +
  "phủ nhận hoặc đả kích chế độ xã hội chủ nghĩa và đường lối của Đảng (ví dụ: tuyên bố chế độ/cách mạng làm đất nước đói nghèo, thụt lùi, sai trái); " +
  "tung thông tin sai sự thật chính trị; kích động lật đổ, chia rẽ dân tộc - tôn giáo; tuyên truyền lệch lạc tư tưởng. " +
  "ĐẶC BIỆT CẢNH GIÁC lớp phản động NGẦM dưới vỏ 'kinh tế': đề cao cơ chế thị trường tự do, kinh tế tư nhân như 'động lực CHÍNH TRỊ' của xã hội; " +
  "ngầm phủ nhận vai trò kinh tế nhà nước, kinh tế tập thể và định hướng xã hội chủ nghĩa; rặn ra rằng kế hoạch hóa/kinh tế nhà nước chỉ làm xã hội đói nghèo " +
  "(ví dụ: 'Thị trường tự do giúp xã hội phồn vinh, kế hoạch hoá sản xuất chỉ làm xã hội đói nghèo'; 'Tư nhân là động lực kinh tế chính trị quan trọng của xã hội'). " +
  "Đây là phương thức 'diễn biến hòa bình' — NGHIÊM CẤM CLEAN cho lớp nội dung này. " +
  "Khi nghi ngờ văn bản mang lập trường chính trị chống phá → bắt buộc chọn FLAGGED (thà chặn nhầm, không được bỏ sót). " +
  "Nội dung học tập, hoạt động Đoàn, góp ý xây dựng thì CLEAN.";

const VERDICT_SCHEMA = {
  type: "OBJECT",
  properties: {
    verdict: { type: "STRING", enum: ["CLEAN", "FLAGGED"] },
    reason: { type: "STRING" },
  },
  required: ["verdict", "reason"],
  propertyOrdering: ["verdict", "reason"],
};

function parseVerdict(raw: string): { verdict: "CLEAN" | "FLAGGED"; reason?: string } {
  const cleaned = raw.replace(/```json/gi, "```").split("```").join("\n");
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]) as { verdict?: string; reason?: string };
      if (parsed.verdict === "CLEAN" || parsed.verdict === "FLAGGED") {
        return { verdict: parsed.verdict, reason: parsed.reason };
      }
    } catch {
      // rơi xuống heuristic dưới
    }
  }
  return /FLAGGED/i.test(raw)
    ? { verdict: "FLAGGED", reason: "AI phát hiện nội dung không phù hợp" }
    : { verdict: "CLEAN" };
}

/** Rule trước (FLAGGED → không tốn quota AI), CLEAN → AI; AI lỗi → trả kết quả rule */
export async function moderateStoryText(text: string): Promise<ModerationResult> {
  const rule = ruleModerate(text);
  if (rule.verdict === "FLAGGED") return rule;
  try {
    const { text: raw, model } = await callAI({
      system: MODERATE_SYSTEM_PROMPT,
      user: text,
      maxTokens: 300,
      temperature: 0,
      json: true,
      jsonSchema: VERDICT_SCHEMA,
    });
    return { ...parseVerdict(raw), model };
  } catch {
    return rule;
  }
}

// ═══════════ Ảnh dataUrl ═══════════

/** Guard ảnh dataUrl: prefix data:image/(jpeg|png|webp);base64, + dung lượng byte */
export function dataUrlGuard(dataUrl: unknown, maxBytes: number): dataUrl is string {
  if (typeof dataUrl !== "string") return false;
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(dataUrl)) return false;
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  if (!base64 || base64.length > 8_400_000) return false; // ~6MB base64 trước khi decode
  return Buffer.byteLength(base64, "base64") <= maxBytes;
}

// ═══════════ Phạm vi cán bộ (scope theo cây org_units) ═══════════

export interface AdminScope {
  /** TW toàn quốc → true */
  all: boolean;
  /** Tiền tố path đơn vị của admin, ví dụ "/1/100/" — scope = path LIKE prefix || '%' */
  pathPrefix: string | null;
}

/**
 * Phạm vi dữ liệu của session quản trị:
 * - QUAN_TRI_TW → tất cả
 * - Còn lại (Tỉnh/Cấp3/Đơn vị/BTV có perm hs3t) → subtree đơn vị mình theo path
 */
const ADMIN_ROLES = ["QUAN_TRI_TW", "QUAN_TRI_TINH", "QUAN_TRI_CAP3", "DON_VI"];

/** Có được phép xem khu quản trị bình chọn không (khớp gate trang /quan-tri/hs3t: theo vai trò + perm hs3t) */
export function isAdminSession(session: SessionDto, perms: string[]): boolean {
  return ADMIN_ROLES.includes(session.role) || hasPerm(perms, "*") || hasPerm(perms, "hs3t.view") || hasPerm(perms, "hs3t.review");
}

export async function adminScopePaths(session: SessionDto): Promise<AdminScope> {
  if (session.role === "QUAN_TRI_TW") return { all: true, pathPrefix: null };
  const rows = await query<{ path: string }>("SELECT path FROM org_units WHERE id = $1 AND deleted_at IS NULL", [
    session.orgUnitId,
  ]);
  const path = rows[0]?.path ?? `/${session.orgUnitId}/`;
  return { all: false, pathPrefix: path };
}

/** WHERE scope cho path đơn vị — alias tuỳ biến, dùng tham số $n trong mảng params được truyền vào */
export function scopeClause(scope: AdminScope, params: unknown[], alias = "school"): string {
  if (scope.all) return "TRUE";
  params.push(`${scope.pathPrefix}%`);
  return `${alias}.path LIKE $${params.length}`;
}
