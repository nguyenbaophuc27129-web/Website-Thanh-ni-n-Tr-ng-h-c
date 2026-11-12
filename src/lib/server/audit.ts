/**
 * Ghi nhật ký audit_logs — dùng chung cho /api/store và các API ghi riêng của cán bộ
 * (kiểm duyệt diễn đàn, mở/đóng điểm danh…).
 * Gọi TRONG transaction của thao tác chính: lỗi ghi nhật ký (vd. tnth_app thiếu quyền
 * INSERT) chỉ cảnh báo, KHÔNG làm hỏng thao tác — nhờ SAVEPOINT riêng.
 */

export interface AuditEntry {
  accountId: number | null;
  /** Mã hành động, ≤ 50 ký tự (vd. "SYNC_UPDATE", "FORUM_HIDE") */
  action: string;
  /** Tên bảng bị tác động */
  entityType: string;
  entityId: number | null;
  oldValues: unknown;
  newValues: unknown;
  ip: string | null;
  userAgent: string | null;
}

interface Queryable {
  query: (text: string, params?: unknown[]) => Promise<unknown>;
}

const CHUNK = 200;

export async function writeAuditLogs(client: Queryable, entries: AuditEntry[], tag = "AUDIT"): Promise<void> {
  if (entries.length === 0) return;
  await client.query("SAVEPOINT audit_logs_sp");
  try {
    for (let i = 0; i < entries.length; i += CHUNK) {
      const chunk = entries.slice(i, i + CHUNK);
      const values = chunk
        .map(
          (_, r) =>
            `(${[1, 2, 3, 4, 5, 6, 7, 8]
              .map((c) => `$${r * 8 + c}${c === 5 || c === 6 ? "::jsonb" : c === 7 ? "::inet" : ""}`)
              .join(", ")})`,
        )
        .join(", ");
      await client.query(
        `INSERT INTO audit_logs (account_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent) VALUES ${values}`,
        chunk.flatMap((e) => [
          e.accountId,
          e.action,
          e.entityType,
          e.entityId,
          e.oldValues == null ? null : JSON.stringify(e.oldValues),
          e.newValues == null ? null : JSON.stringify(e.newValues),
          e.ip,
          e.userAgent?.slice(0, 500) ?? null,
        ]),
      );
    }
    await client.query("RELEASE SAVEPOINT audit_logs_sp");
  } catch (err) {
    await client.query("ROLLBACK TO SAVEPOINT audit_logs_sp");
    console.warn(`[TNTH][${tag}] Không ghi được nhật ký audit_logs:`, err instanceof Error ? err.message : err);
  }
}
