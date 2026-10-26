import { query, withTransaction } from "@/lib/db";
import type { SessionDto } from "@/lib/server/auth";
import { toObj } from "@/lib/server/store-tables";
import {
  PublicActionError,
  attendanceOpenIds,
  enforceRate,
  insertLiveEvent,
  optionalText,
  requiredText,
} from "@/lib/server/public-actions";

/**
 * Điểm danh hoạt động qua mã QR (trang công khai, không cần đăng nhập):
 * chỉ nhận khi hoạt động tồn tại và đang mở điểm danh (setting attendance_open_ids),
 * chặn điểm danh trùng (cùng họ tên + lớp trong 1 hoạt động), sinh sự kiện Trực tiếp ATTENDANCE.
 */

const WINDOW_MS = 10 * 60_000;
/** Sự kiện Trực tiếp gộp theo hoạt động — tối đa 1 dòng / phút, tránh lũ feed khi cả trường quét QR */
const LIVE_EVENT_GAP_MS = 60_000;
const lastLiveEventAt = new Map<number, number>();

const normSpaces = (s: string) => s.replace(/\s+/g, " ");

interface ActivityRow {
  id: string;
  org_unit_id: string;
  title: string;
}

async function findActivity(activityId: number): Promise<ActivityRow | undefined> {
  const rows = await query<ActivityRow>(
    "SELECT id, org_unit_id, title FROM activities WHERE id = $1 AND deleted_at IS NULL",
    [activityId],
  );
  return rows[0];
}

/** Trạng thái điểm danh của 1 hoạt động: có mở không + số lượt đã điểm danh */
export async function attendanceStatus(activityId: number) {
  if (!Number.isInteger(activityId) || activityId <= 0) return { exists: false, open: false, count: 0 };
  const activity = await findActivity(activityId);
  if (!activity) return { exists: false, open: false, count: 0 };
  const open = (await attendanceOpenIds()).includes(activityId);
  const c = await query<{ n: string }>("SELECT count(*)::text AS n FROM attendances WHERE activity_id = $1", [activityId]);
  return { exists: true, open, count: Number(c[0]?.n ?? 0) };
}

export async function addAttendance(
  input: { activityId?: unknown; memberName?: unknown; memberClass?: unknown },
  session: SessionDto | null,
) {
  const activityId = Number(input.activityId);
  if (!Number.isInteger(activityId) || activityId <= 0) throw new PublicActionError("Hoạt động không hợp lệ.");
  const memberName = normSpaces(requiredText(input.memberName, "họ tên", 2, 150));
  const memberClassRaw = optionalText(input.memberClass, "Lớp / chi đoàn", 100);
  const memberClass = memberClassRaw ? normSpaces(memberClassRaw) : null;

  if (session) enforceRate(`attendance:acc:${session.accountId}`, 30, WINDOW_MS, "Bạn điểm danh quá nhiều lần.");
  enforceRate(`attendance:activity:${activityId}`, 2000, WINDOW_MS, "Hoạt động đang nhận quá nhiều lượt điểm danh.");

  const activity = await findActivity(activityId);
  if (!activity) throw new PublicActionError("Không tìm thấy hoạt động.", 404);
  if (!(await attendanceOpenIds()).includes(activityId)) {
    throw new PublicActionError("Điểm danh chưa được mở cho hoạt động này.", 409);
  }

  const { row, count } = await withTransaction(async (client) => {
    // Khoá theo hoạt động để 2 lượt cùng tên gửi đồng thời không lọt qua kiểm tra trùng
    await client.query("SELECT pg_advisory_xact_lock(hashtext('attendance:' || $1::text))", [activityId]);
    const dup = await client.query(
      `SELECT 1 FROM attendances
       WHERE activity_id = $1
         AND lower(regexp_replace(btrim(member_name), '\\s+', ' ', 'g')) = lower($2)
         AND lower(regexp_replace(btrim(coalesce(member_class, '')), '\\s+', ' ', 'g')) = lower($3)
       LIMIT 1`,
      [activityId, memberName, memberClass ?? ""],
    );
    if (dup.rows.length > 0) {
      throw new PublicActionError(`"${memberName}"${memberClass ? ` (${memberClass})` : ""} đã điểm danh hoạt động này rồi.`, 409);
    }
    const r = await client.query(
      `INSERT INTO attendances (activity_id, org_unit_id, member_name, member_class)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [activityId, activity.org_unit_id, memberName, memberClass],
    );
    const c = await client.query("SELECT count(*)::text AS n FROM attendances WHERE activity_id = $1", [activityId]);
    const total = Number((c.rows[0] as { n: string }).n);
    const now = Date.now();
    if (now - (lastLiveEventAt.get(activityId) ?? 0) >= LIVE_EVENT_GAP_MS) {
      lastLiveEventAt.set(activityId, now);
      await insertLiveEvent(
        client,
        Number(activity.org_unit_id),
        "ATTENDANCE",
        `Điểm danh hoạt động "${activity.title.slice(0, 200)}" — ${total} lượt`,
      );
    }
    return { row: r.rows[0] as Record<string, unknown>, count: total };
  });
  return { attendance: toObj("attendances", row), count };
}
