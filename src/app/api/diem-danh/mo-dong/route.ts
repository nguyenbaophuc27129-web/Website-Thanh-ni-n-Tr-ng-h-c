import { NextResponse, type NextRequest } from "next/server";
import { withTransaction } from "@/lib/db";
import { effectivePermissions, hasPerm } from "@/lib/permissions";
import { toObj } from "@/lib/server/store-tables";
import { writeAuditLogs } from "@/lib/server/audit";
import { clientIpOf } from "@/lib/server/client-ip";
import { fail, json, rateLimit, readBody, requireSession, serverError } from "@/lib/server/member-write";

export const runtime = "nodejs";

const SETTING_KEY = "attendance_open_ids";

/**
 * POST /api/diem-danh/mo-dong — bật / tắt điểm danh cho TỪNG hoạt động
 *   { activityId, open: boolean } → { ok, open, changed, openIds, setting }
 *
 * - Quyền: cán bộ (khác DOAN_VIEN) và hoạt động nằm trong phạm vi quản lý = đơn vị của phiên + mọi
 *   đơn vị cấp dưới (cây org_units.path) — đúng luật ghi attendance_open_ids trước đây ở /api/store.
 *   QUAN_TRI_TW (quyền "*" hoặc system.settings) bật/tắt mọi hoạt động, và gỡ được id hoạt động đã xoá.
 * - Setting lưu chuỗi id phân tách dấu phẩy ("271001,271002"). Mỗi lần gọi khoá dòng setting
 *   (SELECT … FOR UPDATE) rồi thêm / bớt ĐÚNG id của hoạt động này → 2 đơn vị bật 2 hoạt động khác
 *   nhau cùng lúc đều thành công, không đè nhau (khác với cách client gửi cả chuỗi như trước).
 * - Bật/tắt lại hoạt động đã ở trạng thái đó: thành công, `changed: false`, không ghi nhật ký.
 * - Mỗi lần đổi ghi audit_logs (ATTENDANCE_OPEN / ATTENDANCE_CLOSE) cùng transaction.
 * - `setting` là dòng settings (dạng client) để client đưa thẳng vào state.
 */

const parseIds = (raw: unknown): number[] => {
  const seen = new Set<number>();
  for (const x of String(raw ?? "").split(",")) {
    const n = Number(x.trim());
    if (Number.isInteger(n) && n > 0) seen.add(n);
  }
  return [...seen];
};

export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;
  if (session.role === "DOAN_VIEN") return fail("Chỉ cán bộ mới được bật/tắt điểm danh.", 403);

  const body = await readBody(request);
  const activityId = Number(body?.activityId);
  const open = body?.open;
  if (!Number.isSafeInteger(activityId) || activityId <= 0 || typeof open !== "boolean") {
    return fail("Dữ liệu gửi lên không hợp lệ.");
  }

  const limited = rateLimit(`attendance-toggle:${session.accountId}`, 120, 10 * 60_000);
  if (limited) return limited;

  const perms = effectivePermissions(session);
  const unrestricted = session.role === "QUAN_TRI_TW" && (hasPerm(perms, "*") || hasPerm(perms, "system.settings"));

  try {
    const result = await withTransaction(async (client) => {
      // Hoạt động + có nằm trong cây đơn vị của phiên không
      const act = (
        await client.query(
          `SELECT a.id, a.title, (o.id = $2::bigint OR o.path LIKE '%/' || $3::text || '/%') AS in_scope
             FROM activities a JOIN org_units o ON o.id = a.org_unit_id
            WHERE a.id = $1 AND a.deleted_at IS NULL`,
          [activityId, session.orgUnitId, String(session.orgUnitId)],
        )
      ).rows[0] as { id: string; title: string; in_scope: boolean } | undefined;
      // Hoạt động đã xoá: chỉ TW được gỡ khỏi danh sách (tránh id mồ côi nằm lại mãi)
      if (!act && !(unrestricted && !open)) return { denied: { error: "Không tìm thấy hoạt động.", status: 404 } };
      if (act && !unrestricted && !act.in_scope) {
        return { denied: { error: "Chỉ được bật/tắt điểm danh hoạt động thuộc phạm vi quản lý của đơn vị mình.", status: 403 } };
      }

      // Bảo đảm có dòng setting rồi khoá nó
      await client.query(
        `INSERT INTO system_settings (setting_key, value, value_type, group_name, description)
         VALUES ($1, '', 'STRING', 'Hoạt động', 'Danh sách hoạt động đang mở điểm danh (id phân tách bằng dấu phẩy)')
         ON CONFLICT (setting_key) DO NOTHING`,
        [SETTING_KEY],
      );
      const cur = await client.query("SELECT value FROM system_settings WHERE setting_key = $1 FOR UPDATE", [SETTING_KEY]);
      const before = parseIds((cur.rows[0] as { value: string | null }).value);
      const has = before.includes(activityId);
      const after = open ? (has ? before : [...before, activityId]) : before.filter((x) => x !== activityId);
      const changed = has !== open;

      // Không đổi gì thì không UPDATE (tránh nhảy updated_at vô ích)
      const upd = changed
        ? await client.query("UPDATE system_settings SET value = $2 WHERE setting_key = $1 RETURNING *", [SETTING_KEY, after.join(",")])
        : await client.query("SELECT * FROM system_settings WHERE setting_key = $1", [SETTING_KEY]);
      if (changed) {
        await writeAuditLogs(
          client,
          [
            {
              accountId: session.accountId,
              action: open ? "ATTENDANCE_OPEN" : "ATTENDANCE_CLOSE",
              entityType: "activities",
              entityId: activityId,
              oldValues: { [SETTING_KEY]: before.join(",") },
              newValues: { [SETTING_KEY]: after.join(",") },
              ip: clientIpOf(request),
              userAgent: request.headers.get("user-agent"),
            },
          ],
          "DIEM-DANH",
        );
      }
      return { changed, openIds: after, setting: toObj("settings", upd.rows[0] as Record<string, unknown>) };
    });
    if ("denied" in result && result.denied) return fail(result.denied.error, result.denied.status);
    return json({ ok: true, open, changed: result.changed, openIds: result.openIds, setting: result.setting });
  } catch (err) {
    return serverError("DIEM-DANH", err);
  }
}
