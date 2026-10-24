import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, pool, query } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import {
  ENTITY_ORDER,
  ENTITY_SPECS,
  PUBLIC_READ_ENTITIES,
  PUBLIC_WRITE_ENTITIES,
  MEMBER_READ_ENTITIES,
  MEMBER_ALLOWED_WRITE_ENTITIES,
  buildDeriveCtx,
  readEntity,
  writeEntity,
  deleteEntityIds,
} from "@/lib/server/store-tables";

export const runtime = "nodejs";

/**
 * API dữ liệu store dùng chung:
 *   GET  /api/store              → { ok, scope, data: {entity: rows[] } }
 *                                  - Khách: chỉ nhận nhóm công khai
 *                                  - Đoàn viên: nhận nhóm công khai + dữ liệu cá nhân (phản ánh của mình)
 *                                  - Cán bộ quản trị: nhận đầy đủ phạm vi
 *   POST /api/store {entities}   → ghi dữ liệu theo cơ chế UPSERT (bảo vệ toàn vẹn dữ liệu,
 *                                  KHÔNG xoá cả bảng):
 *                                  - Khách: chỉ ghi nhóm công khai (phản ánh, điểm danh...)
 *                                  - Đoàn viên: chỉ ghi dữ liệu cá nhân / HS3T / diễn đàn
 *                                  - Cán bộ quản trị: ghi dữ liệu quản lý tương ứng
 */

async function resolveSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    return await sessionFromToken(token);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  if (!dbEnabled() || !pool) {
    return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  }
  const session = await resolveSession(request);
  let entities: string[];
  let scope: "public" | "member" | "full";

  if (!session) {
    scope = "public";
    entities = ENTITY_ORDER.filter((e) => PUBLIC_READ_ENTITIES.has(e));
  } else if (session.role === "DOAN_VIEN") {
    scope = "member";
    entities = ENTITY_ORDER.filter(
      (e) =>
        PUBLIC_READ_ENTITIES.has(e) ||
        MEMBER_READ_ENTITIES.has(e) ||
        e === "feedbacks" ||
        e === "feedbackMessages",
    );
  } else {
    scope = "full";
    entities = ENTITY_ORDER;
  }

  const data: Record<string, unknown[]> = {};
  try {
    for (const entity of entities) {
      if (session?.role === "DOAN_VIEN" && entity === "feedbacks") {
        data[entity] = await readEntity(entity, {
          where: "sender_account_id = $1",
          params: [session.accountId],
        });
      } else if (session?.role === "DOAN_VIEN" && entity === "feedbackMessages") {
        data[entity] = await readEntity(entity, {
          where:
            "feedback_id IN (SELECT id FROM citizen_feedbacks WHERE sender_account_id = $1)",
          params: [session.accountId],
        });
      } else {
        data[entity] = await readEntity(entity);
      }
    }
    return NextResponse.json({ ok: true, scope, data });
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
    | { entities?: Record<string, unknown[]>; deletes?: Record<string, unknown[]> }
    | null;
  const requested = Object.keys(payload?.entities ?? {}).filter(
    (name) => ENTITY_SPECS[name] && Array.isArray(payload?.entities?.[name]),
  );
  const deleteNames = Object.keys(payload?.deletes ?? {}).filter(
    (name) => ENTITY_SPECS[name] && Array.isArray(payload?.deletes?.[name]) && (payload?.deletes?.[name] as unknown[]).length > 0,
  );
  if (requested.length === 0 && deleteNames.length === 0) {
    return NextResponse.json({ ok: false, error: "KHÔNG CÓ ENTITY HỢP LỆ" }, { status: 400 });
  }

  const session = await resolveSession(request);

  // 0) Xoá dữ liệu: chỉ cán bộ quản trị (scope full) được xoá qua sync
  if (deleteNames.length > 0 && (!session || session.role === "DOAN_VIEN")) {
    return NextResponse.json(
      { ok: false, error: "CHỈ CÁN BỘ QUẢN TRỊ MỚI ĐƯỢC XOÁ DỮ LIỆU" },
      { status: 403 },
    );
  }

  // 1) Khách chưa đăng nhập: chỉ được gửi dữ liệu công khai (phản ánh, điểm danh, bài thi...)
  if (!session) {
    if (requested.some((name) => !PUBLIC_WRITE_ENTITIES.has(name))) {
      return NextResponse.json(
        { ok: false, error: "YÊU CẦU ĐĂNG NHẬP ĐỂ GHI DỮ LIỆU NÀY" },
        { status: 401 },
      );
    }
  } else if (session.role === "DOAN_VIEN") {
    // 2) Đoàn viên: chỉ được gửi dữ liệu cá nhân (HS3T, điểm danh, diễn đàn...)
    // Chặn hoàn toàn việc can thiệp vào các bảng quản trị: tasks, scores, criteriaSets, publishedPosts, documents...
    if (requested.some((name) => !MEMBER_ALLOWED_WRITE_ENTITIES.has(name))) {
      return NextResponse.json(
        { ok: false, error: "ĐOÀN VIÊN KHÔNG CÓ QUYỀN GHI DỮ LIỆU QUẢN TRỊ NÀY" },
        { status: 403 },
      );
    }
  }

  // Hoạt động còn bài xuất bản → chặn xoá sớm để báo lỗi rõ ràng cho client
  const activityDeleteIds = ((payload?.deletes?.activities ?? []) as unknown[]).map(Number).filter(Number.isFinite);
  if (activityDeleteIds.length > 0) {
    const r = await query<{ n: string }>(
      "SELECT count(*)::text AS n FROM published_posts WHERE activity_id = ANY($1::bigint[])",
      [activityDeleteIds],
    );
    if (Number(r[0]?.n ?? "0") > 0) {
      return NextResponse.json(
        { ok: false, error: "KHÔNG XOÁ ĐƯỢC: hoạt động đang có bài viết đã xuất bản — hãy xử lý bài viết trước" },
        { status: 409 },
      );
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const ctx = await buildDeriveCtx();

    // KHÔNG XOÁ CẢ BẢNG — writeEntity sử dụng UPSERT bảo vệ toàn bộ dữ liệu hiện có
    const counts: Record<string, number> = {};
    for (const entity of ENTITY_ORDER.filter((e) => requested.includes(e))) {
      counts[entity] = await writeEntity(
        client,
        entity,
        (payload?.entities?.[entity] ?? []) as Record<string, unknown>[],
        ctx,
      );
    }
    // Xoá theo tombstone client gửi kèm — NGƯỢC ENTITY_ORDER (con trước, cha sau)
    const deleteCounts: Record<string, number> = {};
    for (const entity of [...ENTITY_ORDER].reverse().filter((e) => deleteNames.includes(e))) {
      const n = await deleteEntityIds(client, entity, (payload?.deletes?.[entity] ?? []) as number[]);
      if (n > 0) deleteCounts[entity] = n;
    }
    await client.query("COMMIT");
    return NextResponse.json({ ok: true, counts, deletes: deleteCounts });
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
