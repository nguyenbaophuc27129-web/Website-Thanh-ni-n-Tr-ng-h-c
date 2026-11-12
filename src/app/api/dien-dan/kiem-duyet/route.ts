import { NextResponse, type NextRequest } from "next/server";
import { withTransaction } from "@/lib/db";
import { toObj } from "@/lib/server/store-tables";
import { writeAuditLogs } from "@/lib/server/audit";
import { clientIpOf } from "@/lib/server/client-ip";
import { viewForumRow } from "@/lib/server/forum-view";
import { canModerateForum, forumViewerOf } from "@/lib/server/forum-write";
import { fail, json, rateLimit, readBody, requireSession, serverError, str } from "@/lib/server/member-write";

export const runtime = "nodejs";

/**
 * POST /api/dien-dan/kiem-duyet — cán bộ duyệt / từ chối / ẩn bài viết hoặc bình luận diễn đàn
 *   { kind: "THREAD" | "COMMENT", id, action: "APPROVE" | "REJECT" | "HIDE", reason? }
 *   → { ok, row } — `row` đã che theo người xem (forum-view.ts), client đưa thẳng vào state.
 *
 * - Quyền: cán bộ (khác DOAN_VIEN) có mã quyền forum.manage — đúng luật ghi diễn đàn trước đây ở
 *   /api/store (mặc định chỉ QUAN_TRI_TW). Diễn đàn toàn quốc, dòng không có cột đơn vị nên không
 *   có phạm vi theo đơn vị; ai có quyền thì duyệt được mọi dòng.
 * - CHỈ đổi các cột kiểm duyệt: status, moderated_by_account_id, moderated_at, rejection_reason
 *   (+ updated_at của bài). Không động tới nội dung, tác giả, lượt thích → cán bộ không cần (và
 *   không được) ghi cả dòng diễn đàn qua /api/store.
 * - Bài: APPROVE → PUBLISHED; REJECT → HIDDEN + lý do; HIDE → HIDDEN (không lý do).
 *   Bình luận: APPROVE → PUBLISHED; REJECT / HIDE → REJECTED (bảng không có cột lý do).
 * - Khoá dòng (FOR UPDATE) → 2 cán bộ duyệt cùng lúc không đè lẫn nhau; ghi audit_logs
 *   (FORUM_APPROVE / FORUM_REJECT / FORUM_HIDE) cùng transaction.
 */

const ACTIONS = ["APPROVE", "REJECT", "HIDE"] as const;
type Action = (typeof ACTIONS)[number];

const DEFAULT_REJECT_REASON = "Không phù hợp với quy tắc diễn đàn";

/** Cột kiểm duyệt ghi nhật ký (trước/sau) */
const MOD_COLS = ["status", "moderated_by_account_id", "moderated_at", "rejection_reason"] as const;

function pickMod(row: Record<string, unknown> | null, withReason: boolean): Record<string, unknown> | null {
  if (!row) return null;
  const out: Record<string, unknown> = {};
  for (const c of MOD_COLS) if (c in row && (withReason || c !== "rejection_reason")) out[c] = row[c] instanceof Date ? (row[c] as Date).toISOString() : row[c];
  return out;
}

export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;
  if (!canModerateForum(session)) {
    return fail("Tài khoản chưa được phân quyền kiểm duyệt diễn đàn.", 403);
  }

  const body = await readBody(request);
  const kind = body?.kind;
  const id = Number(body?.id);
  const action = body?.action as Action;
  if (
    (kind !== "THREAD" && kind !== "COMMENT") ||
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    !ACTIONS.includes(action)
  ) {
    return fail("Dữ liệu gửi lên không hợp lệ.");
  }
  const reason = str(body?.reason);
  if (reason.length > 1000) return fail("Lý do tối đa 1000 ký tự.");

  const limited = rateLimit(`forum-moderate:${session.accountId}`, 600, 10 * 60_000);
  if (limited) return limited;

  const isThread = kind === "THREAD";
  const entity = isThread ? "forumThreads" : "forumComments";
  const table = isThread ? "forum_threads" : "forum_comments";
  const status = action === "APPROVE" ? "PUBLISHED" : isThread ? "HIDDEN" : "REJECTED";
  // Chỉ bài viết có cột lý do từ chối; duyệt / ẩn xoá lý do cũ
  const rejection = isThread ? (action === "REJECT" ? reason || DEFAULT_REJECT_REASON : null) : undefined;

  try {
    const row = await withTransaction(async (client) => {
      const cur = await client.query(`SELECT * FROM ${table} WHERE id = $1 FOR UPDATE`, [id]);
      const old = (cur.rows[0] as Record<string, unknown> | undefined) ?? null;
      if (!old) return null;

      const sets = ["status = $2", "moderated_by_account_id = $3", "moderated_at = now()"];
      const params: unknown[] = [id, status, session.accountId];
      if (isThread) {
        params.push(rejection);
        sets.push(`rejection_reason = $${params.length}`, "updated_at = now()");
      }
      const upd = await client.query(`UPDATE ${table} SET ${sets.join(", ")} WHERE id = $1 RETURNING *`, params);
      const next = upd.rows[0] as Record<string, unknown>;

      await writeAuditLogs(
        client,
        [
          {
            accountId: session.accountId,
            action: `FORUM_${action}`,
            entityType: table,
            entityId: id,
            oldValues: pickMod(old, isThread),
            newValues: pickMod(next, isThread),
            ip: clientIpOf(request),
            userAgent: request.headers.get("user-agent"),
          },
        ],
        "FORUM",
      );
      return next;
    });
    if (!row) return fail("Không tìm thấy nội dung cần kiểm duyệt.", 404);
    return json({ ok: true, row: viewForumRow(toObj(entity, row), forumViewerOf(session)) });
  } catch (err) {
    return serverError("FORUM", err);
  }
}
