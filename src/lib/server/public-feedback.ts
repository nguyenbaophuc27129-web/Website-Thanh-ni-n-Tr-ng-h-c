import { randomBytes, randomInt } from "node:crypto";
import { query, withTransaction } from "@/lib/db";
import type { SessionDto } from "@/lib/server/auth";
import { toObj } from "@/lib/server/store-tables";
import {
  PublicActionError,
  enforceRate,
  insertLiveEvent,
  optionalText,
  readSetting,
  requiredText,
} from "@/lib/server/public-actions";

/**
 * Phản ánh – kiến nghị phía máy chủ (khách & người đã đăng nhập):
 *  - Tạo phản ánh: máy chủ sinh mã tra cứu ngẫu nhiên PA-XXXXX-XXXXX + access_token,
 *    gắn tài khoản nếu đang đăng nhập, ghi tin nhắn đầu + sự kiện Trực tiếp FEEDBACK_NEW.
 *  - Tra cứu / nhắn thêm theo mã: không trả ghi chú nội bộ, access_token, số điện thoại.
 *    Mã kiểu cũ PA-2026-00101 (đánh số tăng dần, đoán được) chỉ mở cho đúng tài khoản đã gửi.
 */

/** Bảng chữ cái mã tra cứu — bỏ I, O, 0, 1 dễ nhầm khi đọc / gõ lại */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
/** Mã kiểu cũ đánh số tăng dần — đoán được nên không cho khách tra cứu */
const LEGACY_CODE_RE = /^PA-\d{4}-\d+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+().\s-]{8,20}$/;

const LOOKUP_WINDOW_MS = 10 * 60_000;

function randomGroup(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return s;
}

/** Mã tra cứu mới: PA-XXXXX-XXXXX (10 ký tự ngẫu nhiên ≈ 50 bit) */
export function newTrackingCode(): string {
  return `PA-${randomGroup(5)}-${randomGroup(5)}`;
}

export function isLegacyTrackingCode(code: string): boolean {
  return LEGACY_CODE_RE.test(code);
}

/** Che bớt email khi trả về trang tra cứu (ai có mã cũng xem được trang) */
function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const shown = user.length <= 2 ? user.slice(0, 1) : user.slice(0, 2);
  return `${shown}***@${domain}`;
}

export interface FeedbackInput {
  senderName?: unknown;
  senderEmail?: unknown;
  senderPhone?: unknown;
  senderOrgText?: unknown;
  senderCommuneUnion?: unknown;
  senderProvinceUnion?: unknown;
  feedbackTopicId?: unknown;
  title?: unknown;
  content?: unknown;
  evidenceNames?: unknown;
}

/** Tạo phản ánh mới — trả dòng feedback + tin nhắn đầu (dạng client) */
export async function createFeedback(
  input: FeedbackInput,
  session: SessionDto | null,
  userAgent: string | null,
): Promise<{ feedback: Record<string, unknown>; messages: Record<string, unknown>[] }> {
  const senderName = requiredText(input.senderName, "họ và tên", 1, 150);
  const senderEmail = requiredText(input.senderEmail, "email nhận kết quả", 1, 254).toLowerCase();
  if (!EMAIL_RE.test(senderEmail)) throw new PublicActionError("Email nhận kết quả không hợp lệ.");
  const senderPhone = optionalText(input.senderPhone, "Số điện thoại", 20);
  if (senderPhone && !PHONE_RE.test(senderPhone)) throw new PublicActionError("Số điện thoại không hợp lệ.");
  const senderOrgText = optionalText(input.senderOrgText, "Trường / đơn vị", 255);
  const senderCommuneUnion = optionalText(input.senderCommuneUnion, "Đoàn xã, phường", 255);
  const senderProvinceUnion = optionalText(input.senderProvinceUnion, "Đoàn cấp tỉnh", 255);
  const title = requiredText(input.title, "Tiêu đề", 5, 255);
  const content = requiredText(input.content, "Nội dung chi tiết", 20, 10_000);
  const topicId = Number(input.feedbackTopicId);
  if (!Number.isInteger(topicId) || topicId <= 0) throw new PublicActionError("Vui lòng chọn lĩnh vực phản ánh.");

  let evidenceNames: string[] = [];
  if (input.evidenceNames !== undefined && input.evidenceNames !== null) {
    if (!Array.isArray(input.evidenceNames)) throw new PublicActionError("Danh sách minh chứng không hợp lệ.");
    evidenceNames = [...new Set(input.evidenceNames.map((n) => String(n ?? "").trim()).filter(Boolean))];
    if (evidenceNames.length > 5) throw new PublicActionError("Tối đa 5 tệp minh chứng cho mỗi phản ánh.");
    evidenceNames = evidenceNames.map((n) => n.slice(0, 255));
  }

  const topic = await query<{ id: number }>("SELECT id FROM feedback_topics WHERE id = $1", [topicId]);
  if (!topic[0]) throw new PublicActionError("Lĩnh vực phản ánh không hợp lệ.");

  // Chống gửi dồn: khoá theo email / số điện thoại / tài khoản (không theo IP)
  const emailKey = `feedback:email:${senderEmail}`;
  enforceRate(emailKey, 3, 60_000, "Bạn thao tác quá nhanh.");
  if (!session) enforceRate("feedback:guest-all", 200, 10 * 60_000, "Hệ thống đang nhận quá nhiều phản ánh.");

  const hours = Number((await readSetting("feedback.rate_limit_hours")) ?? "1");
  const phoneDigits = senderPhone ? senderPhone.replace(/\D/g, "") : null;
  if (Number.isFinite(hours) && hours > 0) {
    const recent = await query<{ wait: string }>(
      `SELECT ceil(extract(epoch FROM (max(submitted_at) + ($4 || ' hours')::interval - now())))::text AS wait
       FROM feedbacks
       WHERE submitted_at > now() - ($4 || ' hours')::interval AND deleted_at IS NULL
         AND (sender_email = $1
              OR ($2::text IS NOT NULL AND regexp_replace(coalesce(sender_phone, ''), '\\D', '', 'g') = $2)
              OR ($3::bigint IS NOT NULL AND sender_account_id = $3))`,
      [senderEmail, phoneDigits, session?.accountId ?? null, String(hours)],
    );
    const wait = Number(recent[0]?.wait ?? 0);
    if (wait > 0) {
      throw new PublicActionError(
        `Bạn vừa gửi phản ánh gần đây — mỗi email, số điện thoại hoặc tài khoản chỉ gửi 1 phản ánh trong ${hours} giờ. Vui lòng thử lại sau ${Math.ceil(wait / 60)} phút.`,
        429,
        wait,
      );
    }
  }

  return withTransaction(async (client) => {
    let fbRow: Record<string, unknown> | undefined;
    for (let attempt = 0; attempt < 5 && !fbRow; attempt++) {
      const r = await client.query(
        `INSERT INTO feedbacks (tracking_code, access_token, sender_name, sender_email, sender_phone,
           sender_org_text, sender_account_id, sender_commune_union, sender_province_union,
           feedback_topic_id, title, content, evidence_names, status, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'NEW', $14)
         ON CONFLICT (tracking_code) DO NOTHING
         RETURNING *`,
        [
          newTrackingCode(), randomBytes(32).toString("hex"), senderName, senderEmail, senderPhone,
          senderOrgText, session?.accountId ?? null, senderCommuneUnion, senderProvinceUnion,
          topicId, title, content, evidenceNames, userAgent ? userAgent.slice(0, 500) : null,
        ],
      );
      fbRow = r.rows[0] as Record<string, unknown> | undefined;
    }
    if (!fbRow) throw new Error("TRACKING_CODE_EXHAUSTED");

    const m = await client.query(
      `INSERT INTO feedback_messages (feedback_id, sender_type, sender_name, content, is_internal_note, sent_at)
       VALUES ($1, 'CITIZEN', $2, $3, false, now()) RETURNING *`,
      [fbRow.id, senderName, content],
    );
    // Sự kiện Trực tiếp: không nêu tên người gửi (feed công khai)
    await insertLiveEvent(
      client,
      session?.orgUnitId ?? 1,
      "FEEDBACK_NEW",
      `Phản ánh mới: "${title.slice(0, 200)}"`,
    );
    return {
      feedback: toObj("feedbacks", fbRow),
      messages: [toObj("feedbackMessages", m.rows[0] as Record<string, unknown>)],
    };
  });
}

interface FeedbackDbRow extends Record<string, unknown> {
  id: string | number;
  tracking_code: string;
  sender_account_id: string | number | null;
  sender_name: string;
  sender_email: string;
  assigned_account_id: string | number | null;
  status: string;
}

/** Chuẩn hoá mã người dùng gõ; mã sai dạng → null (khỏi hỏi DB) */
function normalizeCode(raw: string): string | null {
  let code = raw;
  try {
    code = decodeURIComponent(raw);
  } catch {
    return null;
  }
  code = code.trim().toUpperCase();
  return /^PA-[A-Z0-9-]{4,24}$/.test(code) ? code : null;
}

/**
 * Tìm phản ánh theo mã kèm kiểm tra quyền xem + giới hạn tần suất tra cứu.
 * Mã kiểu cũ chỉ mở cho đúng tài khoản đã gửi. Không thấy / không có quyền → ném lỗi.
 */
async function resolveFeedback(rawCode: string, session: SessionDto | null): Promise<FeedbackDbRow> {
  // Giới hạn tra cứu: theo tài khoản (nếu đăng nhập) + tổng lượt của khách
  if (session) {
    enforceRate(`feedback-lookup:acc:${session.accountId}`, 120, LOOKUP_WINDOW_MS, "Bạn tra cứu quá nhiều lần.");
  } else {
    enforceRate("feedback-lookup:guest-all", 3000, LOOKUP_WINDOW_MS, "Hệ thống tra cứu đang quá tải.");
  }
  const notFound = new PublicActionError("Không tìm thấy phản ánh với mã này.", 404);
  const code = normalizeCode(rawCode);
  if (!code) throw notFound;
  enforceRate(`feedback-lookup:code:${code}`, 120, LOOKUP_WINDOW_MS, "Mã này được tra cứu quá nhiều lần.");

  const legacy = isLegacyTrackingCode(code);
  if (legacy && !session) {
    throw new PublicActionError(
      "Mã tra cứu kiểu cũ chỉ xem được khi đăng nhập đúng tài khoản đã gửi phản ánh.",
      403,
    );
  }
  const rows = await query<FeedbackDbRow>(
    "SELECT * FROM feedbacks WHERE tracking_code = $1 AND deleted_at IS NULL LIMIT 1",
    [code],
  );
  const fb = rows[0];
  if (!fb) {
    // Đếm lượt tra trượt của khách — dò mã hàng loạt sẽ bị chặn sớm
    if (!session) enforceRate("feedback-lookup:guest-miss", 600, LOOKUP_WINDOW_MS, "Bạn tra cứu sai quá nhiều lần.");
    throw notFound;
  }
  if (legacy && Number(fb.sender_account_id) !== session?.accountId) throw notFound;
  return fb;
}

/** Dạng trả cho trang tra cứu: bỏ access_token, số điện thoại, cán bộ được giao; che email */
function publicFeedback(fb: FeedbackDbRow) {
  const obj = toObj("feedbacks", fb);
  delete obj.senderPhone;
  delete obj.assignedAccountId;
  delete obj.senderAccountId;
  obj.senderEmail = maskEmail(String(fb.sender_email));
  return obj;
}

async function publicMessages(feedbackId: number) {
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM feedback_messages WHERE feedback_id = $1 AND is_internal_note = false
     ORDER BY coalesce(sent_at, created_at), id`,
    [feedbackId],
  );
  return rows.map((r) => {
    const m = toObj("feedbackMessages", r);
    // Không lộ tên / tài khoản cán bộ xử lý — trang công khai ghi chung "Ban điều hành"
    if (m.senderType === "STAFF") m.senderName = null;
    delete m.senderAccountId;
    m.sentAt = m.sentAt ?? (r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at);
    return m;
  });
}

/** Tra cứu 1 phản ánh theo mã: phản ánh + tin nhắn công khai + email đã gửi (không kèm nội dung) */
export async function lookupFeedback(rawCode: string, session: SessionDto | null) {
  const fb = await resolveFeedback(rawCode, session);
  const id = Number(fb.id);
  const emails = await query<{ id: string; email_kind: string; subject: string; delivery: string | null; sent_at: Date }>(
    "SELECT id, email_kind, subject, delivery, sent_at FROM email_logs WHERE feedback_id = $1 ORDER BY sent_at DESC",
    [id],
  );
  return {
    feedback: publicFeedback(fb),
    messages: await publicMessages(id),
    emails: emails.map((e) => ({
      id: Number(e.id),
      kind: e.email_kind,
      subject: e.subject,
      delivery: e.delivery ?? undefined,
      sentAt: e.sent_at instanceof Date ? e.sent_at.toISOString() : String(e.sent_at),
    })),
  };
}

/** Người gửi nhắn thêm vào phản ánh (cùng điều kiện truy cập như tra cứu) */
export async function addCitizenMessage(rawCode: string, contentRaw: unknown, session: SessionDto | null) {
  const content = requiredText(contentRaw, "Nội dung tin nhắn", 2, 5000);
  const fb = await resolveFeedback(rawCode, session);
  if (fb.status === "CLOSED") {
    throw new PublicActionError("Phản ánh đã đóng, không nhận thêm tin nhắn.", 409);
  }
  const id = Number(fb.id);
  enforceRate(`feedback-message:${id}`, 10, 60 * 60_000, "Bạn đã nhắn quá nhiều tin cho phản ánh này.");

  const row = await withTransaction(async (client) => {
    const r = await client.query(
      `INSERT INTO feedback_messages (feedback_id, sender_type, sender_name, content, is_internal_note, sent_at)
       VALUES ($1, 'CITIZEN', $2, $3, false, now()) RETURNING *`,
      [id, fb.sender_name, content],
    );
    // Báo cán bộ đang thụ lý (nếu đã có người nhận xử lý)
    if (fb.assigned_account_id) {
      await client.query(
        `INSERT INTO notifications (recipient_account_id, notification_type, title, message, ref_type, ref_id, link_url)
         VALUES ($1, 'SYSTEM', $2, $3, 'FEEDBACK', $4, '/quan-tri/phan-anh')`,
        [
          fb.assigned_account_id,
          "Người gửi nhắn thêm vào phản ánh",
          `Phản ánh ${fb.tracking_code} có tin nhắn mới từ người gửi.`,
          id,
        ],
      );
    }
    return r.rows[0] as Record<string, unknown>;
  });
  return { message: toObj("feedbackMessages", row), messages: await publicMessages(id) };
}

/** Phản ánh của tài khoản đang đăng nhập (trang Tài khoản của tôi) */
export async function listMyFeedbacks(session: SessionDto) {
  const rows = await query<{ id: string; tracking_code: string; title: string; status: string; submitted_at: Date }>(
    `SELECT id, tracking_code, title, status, submitted_at FROM feedbacks
     WHERE sender_account_id = $1 AND deleted_at IS NULL ORDER BY submitted_at DESC LIMIT 200`,
    [session.accountId],
  );
  return rows.map((r) => ({
    id: Number(r.id),
    trackingCode: r.tracking_code,
    title: r.title,
    status: r.status,
    submittedAt: r.submitted_at instanceof Date ? r.submitted_at.toISOString() : String(r.submitted_at),
  }));
}
