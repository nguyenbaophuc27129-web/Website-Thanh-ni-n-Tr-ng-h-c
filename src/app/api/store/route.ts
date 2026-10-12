import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, pool, query } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import {
  ENTITY_ORDER,
  ENTITY_SPECS,
  PUBLIC_READ_ENTITIES,
  PUBLIC_WRITE_ENTITIES,
  buildDeriveCtx,
  readEntity,
  writeEntity,
} from "@/lib/server/store-tables";

export const runtime = "nodejs";

/**
 * API dữ liệu store dùng chung:
 *   GET  /api/store              → { ok, data: {entity: rows[] } } (khách chỉ nhận nhóm công khai)
 *   POST /api/store {entities}   → ghi đè toàn bộ các entity gửi lên (transaction),
 *                                  khách chưa đăng nhập chỉ được ghi nhóm công khai
 *                                  (phản ánh, điểm danh, sự kiện, bài thi vãng lai).
 *
 * Lưu ý triển khai: đây là lớp đồng bộ theo entity để web chạy được ngay với DB
 * thật; bước kế là tách từng nghiệp vụ thành API riêng có kiểm tra quyền sâu
 * hơn ở phía server (roadmap ghi trong db/DEPLOY-PROD.md).
 */

async function resolveAccountId(request: NextRequest): Promise<number | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const session = await sessionFromToken(token);
    return session?.accountId ?? null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  if (!dbEnabled() || !pool) {
    return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  }
  const accountId = await resolveAccountId(request);
  const entities = accountId
    ? ENTITY_ORDER
    : ENTITY_ORDER.filter((e) => PUBLIC_READ_ENTITIES.has(e));
  const data: Record<string, unknown[]> = {};
  try {
    for (const entity of entities) {
      data[entity] = await readEntity(entity);
    }
    return NextResponse.json({ ok: true, scope: accountId ? "full" : "public", data });
  } catch (err) {
    console.warn("[TNTH][STORE] Lỗi đọc snapshot:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: "STORE_READ_FAILED" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!dbEnabled() || !pool) {
    return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  }
  const payload = (await request.json().catch(() => null)) as
    | { entities?: Record<string, unknown[]> }
    | null;
  const requested = Object.keys(payload?.entities ?? {}).filter(
    (name) => ENTITY_SPECS[name] && Array.isArray(payload?.entities?.[name]),
  );
  if (requested.length === 0) {
    return NextResponse.json({ ok: false, error: "KHÔNG CÓ ENTITY HỢP LỆ" }, { status: 400 });
  }
  const accountId = await resolveAccountId(request);
  if (!accountId && requested.some((name) => !PUBLIC_WRITE_ENTITIES.has(name))) {
    return NextResponse.json(
      { ok: false, error: "YÊU CẦU ĐĂNG NHẬP ĐỂ GHI DỮ LIỆU NÀY" },
      { status: 401 },
    );
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ctx = await buildDeriveCtx();
    // Xoá theo thứ tự ngược phụ thuộc FK (chỉ các entity được gửi), rồi insert xuôi
    const reverse = [...ENTITY_ORDER].reverse().filter((e) => requested.includes(e));
    for (const entity of reverse) {
      await client.query(`DELETE FROM ${ENTITY_SPECS[entity].table}`);
    }
    const counts: Record<string, number> = {};
    for (const entity of ENTITY_ORDER.filter((e) => requested.includes(e))) {
      counts[entity] = await writeEntity(
        client,
        entity,
        (payload?.entities?.[entity] ?? []) as Record<string, unknown>[],
        ctx,
      );
    }
    await client.query("COMMIT");
    return NextResponse.json({ ok: true, counts });
  } catch (err) {
    await client.query("ROLLBACK");
    const message = err instanceof Error ? err.message : "STORE_SYNC_FAILED";
    console.warn("[TNTH][STORE] Lỗi sync:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  } finally {
    client.release();
  }
}

/** Dùng cho kiểm tra nội bộ — đếm nhanh số dòng của một bảng */
export async function HEAD(request: NextRequest) {
  if (!dbEnabled()) return new Response(null, { status: 503 });
  try {
    const rows = await query<{ n: string }>(
      "SELECT count(*)::text AS n FROM information_schema.tables WHERE table_schema = 'public'",
    );
    return new Response(null, { status: 200, headers: { "x-tables": rows[0]?.n ?? "0" } });
  } catch {
    return new Response(null, { status: 500 });
  }
}
