import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, pool, query } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import {
  ENTITY_ORDER,
  ENTITY_SPECS,
  PUBLIC_WRITE_ENTITIES,
  MEMBER_ALLOWED_WRITE_ENTITIES,
  buildDeriveCtx,
  writeEntity,
  deleteEntityIds,
  rowKeyOf,
  loadRowsByKeys,
  loadRowsWhere,
  planRowWrite,
  type DeriveCtx,
} from "@/lib/server/store-tables";
import { externalizeDataUrls } from "@/lib/server/media";
import { writeAuditLogs, type AuditEntry } from "@/lib/server/audit";
import { clientIpOf } from "@/lib/server/client-ip";
import { buildReadViewer, readSnapshot } from "@/lib/server/store-read-policy";
import { auditStorePolicies } from "@/lib/server/store-policy-audit";
import {
  API_ONLY_ENTITIES,
  WRITE_POLICIES,
  buildWriteSubject,
  type PolicyEnv,
  type Row,
  type RowChange,
  type WriteSubject,
} from "@/lib/server/store-write-policy";

export const runtime = "nodejs";

// Chốt chặn: entity mới thiếu luật đọc/ghi thì cảnh báo một lần khi nạp module (cán bộ cấp dưới
// sẽ không đọc/ghi được entity đó). Kiểm tra đầy đủ: scripts/kiem-thu/kiem-chinh-sach.mts
for (const msg of auditStorePolicies()) console.warn("[TNTH][STORE] Thiếu chính sách:", msg);

/**
 * API dữ liệu store dùng chung:
 *   GET  /api/store              → { ok, scope, data: {entity: rows[] } } — theo chính sách đọc
 *                                  (src/lib/server/store-read-policy.ts):
 *                                  - Khách: chỉ dữ liệu công khai đã duyệt (không đáp án đề thi,
 *                                    không id người viết diễn đàn ẩn danh…)
 *                                  - Đoàn viên: nhóm công khai + dữ liệu của chính mình
 *                                  - QUAN_TRI_TW: toàn bộ; cán bộ khác: dữ liệu nội bộ trong cây đơn vị
 *                                  - Entity người xem không được đọc thì vắng mặt trong data
 *   POST /api/store {entities}   → ghi dữ liệu theo cơ chế UPSERT (bảo vệ toàn vẹn dữ liệu,
 *                                  KHÔNG xoá cả bảng):
 *                                  - Khách / đoàn viên: KHÔNG ghi qua đây (401/403) — dùng API riêng
 *                                  - Cán bộ: từng dòng được kiểm quyền + phạm vi đơn vị theo
 *                                    store-write-policy (cả dòng cũ trong DB lẫn dòng mới);
 *                                    dòng không đổi bị bỏ qua; có dòng vi phạm → 403 cả lô;
 *                                    mỗi dòng thêm/sửa/xoá ghi nhật ký audit_logs
 *                                  - Diễn đàn (forumThreads/forumComments) KHÔNG ghi qua đây (403, kể cả
 *                                    TW): dùng /api/dien-dan/* (đăng, thích, kiem-duyet)
 *                                  - Cột "người tạo" của dòng mới điền theo tài khoản của phiên (derive),
 *                                    dòng đã có giữ nguyên người tạo (insertOnlyCols)
 *                                  - Tệp base64 (data:) lọt vào cột tệp được chuyển thành tệp
 *                                    trên ổ đĩa (/uploads/...) trước khi ghi DB
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
  try {
    // Lọc dòng + che cột theo người xem — xem src/lib/server/store-read-policy.ts
    const viewer = await buildReadViewer(session);
    const data = await readSnapshot(viewer);
    return NextResponse.json({ ok: true, scope: viewer.scope, data });
  } catch (err) {
    console.warn("[TNTH][STORE] Lỗi đọc snapshot:", err instanceof Error ? err.message : err);
    return NextResponse.json({ ok: false, error: "STORE_READ_FAILED" }, { status: 500 });
  }
}

type Obj = Record<string, unknown>;
type DbClient = { query: (text: string, params?: unknown[]) => Promise<{ rows: Obj[]; rowCount?: number | null }> };

/** 1 dòng cán bộ gửi lên sau khi đối chiếu với DB */
interface PlannedRow extends RowChange {
  key: string | null;
  /** Object client gửi (để writeEntity ghi) — null khi xoá */
  obj: Obj | null;
  /** Cột server tự điền (khi thêm) / giữ nguyên (khi sửa) — writeEntity ghi thẳng trong câu UPSERT */
  fix: Obj;
  /** Ghi chú thêm cho nhật ký (bảng con của hoạt động) */
  auditOld?: Obj;
  auditNew?: Obj;
}

/** Bảng con gửi kèm hoạt động (server thay toàn bộ theo hoạt động) */
const ACTIVITY_CHILDREN = new Set(["activityCategories", "activityLinks"]);

/** Đơn vị của phiên + mọi đơn vị con (cột path dạng "/1/131/13101/") */
async function scopeIdsOf(client: DbClient, orgUnitId: number): Promise<number[]> {
  const r = await client.query("SELECT id FROM org_units WHERE path LIKE $1", [`%/${orgUnitId}/%`]);
  const ids = r.rows.map((row) => Number(row.id));
  if (!ids.includes(orgUnitId)) ids.push(orgUnitId);
  return ids;
}

/** Chuẩn hoá khoá tra cứu: settings theo setting_key, còn lại theo id số */
const lookupKey = (entity: string, key: unknown) => (entity === "settings" ? String(key) : String(Number(key)));

/** Rút gọn giá trị dài khi ghi nhật ký (nội dung bài, base64 còn sót…) */
function auditValue(v: unknown): unknown {
  if (typeof v === "string" && v.length > 2000) return `${v.slice(0, 2000)}…(${v.length} ký tự)`;
  return v instanceof Date ? v.toISOString() : v;
}
function pickAudit(row: Obj | null | undefined, cols?: string[]): Obj | null {
  if (!row) return null;
  const out: Obj = {};
  for (const c of cols ?? Object.keys(row)) if (c in row) out[c] = auditValue(row[c]);
  return out;
}

/**
 * Đối chiếu các dòng gửi lên với DB: nạp dòng hiện có theo khoá, tính dòng sau ghi +
 * cột thay đổi, BỎ dòng không đổi (client hay gửi lại y hệt). Hoạt động tính cả bảng
 * con (chuyên mục, liên kết) — chỉ hoạt động có đổi mới được thay bảng con.
 */
async function planWrites(
  client: DbClient,
  entitiesIn: Record<string, unknown[]>,
  requested: string[],
  ctx: DeriveCtx,
  cache: Map<string, Map<string, Row | null>>,
): Promise<{ plans: PlannedRow[]; skipped: number; changedActivityIds: Set<number> }> {
  const plans: PlannedRow[] = [];
  let skipped = 0;
  const objsOf = (entity: string) =>
    ((entitiesIn[entity] ?? []) as unknown[]).filter((o): o is Obj => !!o && typeof o === "object" && !Array.isArray(o));
  const sentActivityIds = new Set(objsOf("activities").map((a) => Number(a.id)).filter(Number.isFinite));

  for (const entity of ENTITY_ORDER.filter((e) => requested.includes(e))) {
    let objs = objsOf(entity);
    // Bảng con của hoạt động có trong lô → xét cùng hoạt động cha bên dưới
    if (ACTIVITY_CHILDREN.has(entity)) objs = objs.filter((o) => !sentActivityIds.has(Number(o.activityId)));
    const keys = objs.map((o) => rowKeyOf(entity, o));
    const existing = await loadRowsByKeys(client, entity, keys.filter((k): k is string => k !== null));
    const entityCache = cache.get(entity) ?? new Map<string, Row | null>();
    cache.set(entity, entityCache);
    for (const [k, row] of existing) entityCache.set(k, row);
    for (let i = 0; i < objs.length; i++) {
      const key = keys[i];
      const old = key !== null ? (existing.get(key) ?? null) : null;
      const { next, changed } = await planRowWrite(client, entity, objs[i], ctx, old);
      if (old && changed.length === 0 && entity !== "activities") {
        skipped++;
        continue;
      }
      plans.push({ entity, key, obj: objs[i], op: old ? "update" : "insert", old, next, changed, fix: {} });
    }
  }

  // Hoạt động: so thêm bảng con với DB
  const changedActivityIds = new Set<number>();
  const actPlans = plans.filter((p) => p.entity === "activities");
  if (actPlans.length > 0) {
    const ids = actPlans.map((p) => Number(p.obj!.id)).filter(Number.isFinite);
    const catsIn = Array.isArray(entitiesIn.activityCategories) ? objsOf("activityCategories") : null;
    const linksIn = Array.isArray(entitiesIn.activityLinks) ? objsOf("activityLinks") : null;
    const dbCats = catsIn ? await loadRowsWhere(client, "activityCategories", "activity_id", ids) : [];
    const dbLinks = linksIn ? await loadRowsWhere(client, "activityLinks", "activity_id", ids) : [];
    const catList = (rows: Obj[], idField: string, actField: string, actId: number) =>
      rows.filter((r) => Number(r[actField]) === actId).map((r) => Number(r[idField])).sort((a, b) => a - b);
    for (const p of actPlans) {
      const id = Number(p.obj!.id);
      if (catsIn) {
        const before = catList(dbCats, "content_category_id", "activity_id", id);
        const after = catList(catsIn, "categoryId", "activityId", id);
        if (before.join(",") !== after.join(",")) {
          p.changed.push("#categories");
          (p.auditOld ??= {})["#categories"] = before;
          (p.auditNew ??= {})["#categories"] = after;
        }
      }
      if (linksIn) {
        const before = dbLinks.filter((l) => Number(l.activity_id) === id);
        const after = linksIn.filter((l) => Number(l.activityId) === id);
        let differs = before.length !== after.length;
        for (const l of after) {
          if (differs) break;
          const old = before.find((b) => Number(b.id) === Number(l.id)) ?? null;
          differs = !old || (await planRowWrite(client, "activityLinks", l, ctx, old)).changed.length > 0;
        }
        if (differs) {
          p.changed.push("#links");
          (p.auditOld ??= {})["#links"] = before.map((l) => l.url);
          (p.auditNew ??= {})["#links"] = after.map((l) => l.url);
        }
      }
      if (p.old && p.changed.length === 0) skipped++;
      else if (Number.isFinite(id)) changedActivityIds.add(id);
    }
  }
  return {
    plans: plans.filter((p) => !(p.entity === "activities" && p.old && p.changed.length === 0)),
    skipped,
    changedActivityIds,
  };
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

  // 1) Khách chưa đăng nhập: không còn entity nào được ghi qua sync (dùng API riêng)
  if (!session) {
    if (requested.some((name) => !PUBLIC_WRITE_ENTITIES.has(name))) {
      return NextResponse.json(
        { ok: false, error: "YÊU CẦU ĐĂNG NHẬP ĐỂ GHI DỮ LIỆU NÀY" },
        { status: 401 },
      );
    }
  } else if (session.role === "DOAN_VIEN") {
    // 2) Đoàn viên: không ghi qua sync — diễn đàn, HS3T, đóng góp… đi qua API riêng
    if (requested.some((name) => !MEMBER_ALLOWED_WRITE_ENTITIES.has(name))) {
      return NextResponse.json(
        { ok: false, error: "ĐOÀN VIÊN KHÔNG CÓ QUYỀN GHI DỮ LIỆU QUẢN TRỊ NÀY" },
        { status: 403 },
      );
    }
  }
  // Từ đây chỉ còn cán bộ (tập ghi của khách/đoàn viên rỗng)
  if (!session || session.role === "DOAN_VIEN") {
    return NextResponse.json({ ok: false, error: "KHÔNG CÓ QUYỀN GHI DỮ LIỆU" }, { status: 403 });
  }

  // Diễn đàn: chỉ ghi qua /api/dien-dan/* (dòng đã che theo người xem — UPSERT cả dòng sẽ đè mất cột thật)
  const apiOnly = requested.find((name) => API_ONLY_ENTITIES.has(name));
  if (apiOnly) {
    return NextResponse.json(
      { ok: false, error: `${WRITE_POLICIES[apiOnly]?.label ?? apiOnly} chỉ được ghi qua API riêng (/api/dien-dan/*), không ghi qua đồng bộ.` },
      { status: 403 },
    );
  }

  // Bảng khoá tự nhiên không xoá theo id được
  const badDelete = deleteNames.find((name) => ENTITY_SPECS[name].noIdentity);
  if (badDelete) {
    return NextResponse.json(
      { ok: false, error: `Không hỗ trợ xoá ${WRITE_POLICIES[badDelete]?.label ?? badDelete} qua đồng bộ` },
      { status: 400 },
    );
  }

  const entitiesIn = (payload?.entities ?? {}) as Record<string, unknown[]>;
  const client = (await pool.connect()) as unknown as DbClient & { release: () => void };
  try {
    await client.query("BEGIN");
    // Người ghi = tài khoản của phiên: cột "người tạo" của dòng mới (tasks/reports/documents…) điền theo đây
    const ctx = await buildDeriveCtx({ accountId: Number(session.accountId), orgUnitId: Number(session.orgUnitId) });
    const subject: WriteSubject = buildWriteSubject(session, await scopeIdsOf(client, Number(session.orgUnitId)));

    // a) Đối chiếu với DB — dòng hiện có (cache dùng chung cho tra cứu bảng cha)
    const cache = new Map<string, Map<string, Row | null>>();
    const { plans, skipped, changedActivityIds } = await planWrites(client, entitiesIn, requested, ctx, cache);
    for (const entity of [...ENTITY_ORDER].reverse().filter((e) => deleteNames.includes(e))) {
      const ids = ((payload?.deletes?.[entity] ?? []) as unknown[]).map(Number).filter(Number.isFinite);
      const existing = await loadRowsByKeys(client, entity, ids.map(String));
      // id không còn trong DB → không có gì để xoá
      for (const [key, old] of existing) plans.push({ entity, key, obj: null, op: "delete", old, next: null, changed: [], fix: {} });
    }

    // b) Cột server tự điền (người tạo) / giữ nguyên khi sửa — áp vào dòng mới trước khi kiểm quyền
    for (const p of plans) {
      const policy = WRITE_POLICIES[p.entity];
      if (p.op === "insert" && policy?.setOnInsert) {
        for (const [col, fn] of Object.entries(policy.setOnInsert)) {
          const v = fn(subject, p.next!);
          if (v !== undefined) p.fix[col] = p.next![col] = v;
        }
      }
      if (p.op === "update" && policy?.keepOnUpdate) {
        for (const col of policy.keepOnUpdate) {
          if (!(col in p.old!)) continue;
          p.fix[col] = p.next![col] = p.old![col];
          p.changed = p.changed.filter((c) => c !== col);
        }
      }
    }
    const active = plans.filter((p) => p.op !== "update" || p.changed.length > 0);
    const skippedTotal = skipped + (plans.length - active.length);

    // c) Kiểm quyền từng dòng (QUAN_TRI_TW toàn quyền)
    const batchNext = new Map<string, Map<string, Row>>();
    const inserted = new Map<string, Set<string>>();
    for (const p of active) {
      if (p.op === "delete" || p.key === null) continue;
      if (!batchNext.has(p.entity)) batchNext.set(p.entity, new Map());
      batchNext.get(p.entity)!.set(p.key, p.next!);
      if (p.op === "insert") {
        if (!inserted.has(p.entity)) inserted.set(p.entity, new Set());
        inserted.get(p.entity)!.add(p.key);
      }
    }
    const accountOrgCache = new Map<number, number | null>();
    const env: PolicyEnv = {
      subject,
      async row(entity, key) {
        if (key === null || key === undefined || key === "") return null;
        const k = lookupKey(entity, key);
        const fromBatch = batchNext.get(entity)?.get(k);
        if (fromBatch) return fromBatch;
        const entityCache = cache.get(entity) ?? new Map<string, Row | null>();
        cache.set(entity, entityCache);
        if (!entityCache.has(k)) {
          const found = entity === "settings" || !k.includes("NaN") ? await loadRowsByKeys(client, entity, [k]) : new Map();
          entityCache.set(k, found.get(k) ?? null);
        }
        return entityCache.get(k) ?? null;
      },
      isNew: (entity, key) => inserted.get(entity)?.has(lookupKey(entity, key)) ?? false,
      async accountOrg(accountId) {
        const id = Number(accountId);
        if (!Number.isFinite(id)) return null;
        if (!accountOrgCache.has(id)) {
          const r = await client.query("SELECT org_unit_id FROM accounts WHERE id = $1", [id]);
          accountOrgCache.set(id, r.rows[0] ? Number(r.rows[0].org_unit_id) : null);
        }
        return accountOrgCache.get(id) ?? null;
      },
    };
    const denied: { entity: string; key: string | null; reason: string }[] = [];
    // Nội dung cột (đường dẫn tệp, liên kết…) chống XSS: kiểm cho MỌI cán bộ, kể cả QUAN_TRI_TW
    for (const p of active) {
      if (p.op === "delete" || !p.next) continue;
      const reason = WRITE_POLICIES[p.entity]?.content?.(p);
      if (reason) denied.push({ entity: p.entity, key: p.key, reason });
    }
    if (!subject.superAdmin) {
      // Liên kết gửi kèm hoạt động mang id của liên kết thuộc hoạt động KHÁC → UPSERT sẽ chiếm dòng đó
      const childLinkKeys = ((entitiesIn.activityLinks ?? []) as Obj[])
        .filter((o) => o && typeof o === "object" && changedActivityIds.has(Number(o.activityId)))
        .map((o) => rowKeyOf("activityLinks", o))
        .filter((k): k is string => k !== null);
      for (const [key, row] of await loadRowsByKeys(client, "activityLinks", childLinkKeys)) {
        if (!changedActivityIds.has(Number(row.activity_id))) {
          denied.push({ entity: "activityLinks", key, reason: "liên kết thuộc hoạt động khác" });
        }
      }
      for (const p of active) {
        const policy = WRITE_POLICIES[p.entity];
        const reason = !policy
          ? "chưa có chính sách ghi cho loại dữ liệu này"
          : p.key === null
            ? "dòng thiếu mã định danh"
            : await policy.check(p, env);
        if (reason) denied.push({ entity: p.entity, key: p.key, reason });
      }
    }
    if (denied.length > 0) {
      await client.query("ROLLBACK");
      const labels = Array.from(new Set(denied.map((d) => WRITE_POLICIES[d.entity]?.label ?? d.entity)));
      console.warn(
        `[TNTH][STORE] Chặn ghi của tài khoản #${subject.accountId} (${subject.role}, đơn vị ${subject.orgUnitId}):`,
        denied.slice(0, 5).map((d) => `${d.entity}#${d.key}: ${d.reason}`).join("; "),
      );
      return NextResponse.json(
        {
          ok: false,
          error: `Không có quyền lưu ${labels.join(", ")}: ${denied[0].reason}.`,
          denied: denied.slice(0, 20),
        },
        { status: 403 },
      );
    }

    // Hoạt động còn bài xuất bản → chặn xoá để báo lỗi rõ ràng cho client
    const activityDeleteIds = active.filter((p) => p.entity === "activities" && p.op === "delete").map((p) => Number(p.key));
    if (activityDeleteIds.length > 0) {
      const r = await client.query(
        "SELECT count(*)::text AS n FROM published_posts WHERE activity_id = ANY($1::bigint[])",
        [activityDeleteIds],
      );
      if (Number(r.rows[0]?.n ?? "0") > 0) {
        await client.query("ROLLBACK");
        return NextResponse.json(
          { ok: false, error: "KHÔNG XOÁ ĐƯỢC: hoạt động đang có bài viết đã xuất bản — hãy xử lý bài viết trước" },
          { status: 409 },
        );
      }
    }

    // d) Ghi — KHÔNG XOÁ CẢ BẢNG, writeEntity UPSERT từng dòng đã đổi
    const counts: Record<string, number> = {};
    const writes = active.filter((p) => p.op !== "delete");
    for (const entity of ENTITY_ORDER) {
      const objs = writes.filter((p) => p.entity === entity).map((p) => p.obj!);
      if (ACTIVITY_CHILDREN.has(entity)) {
        // Bảng con của hoạt động có đổi: gửi kèm là bản ĐẦY ĐỦ → ghi lại sau khi đã xoá bản cũ
        for (const o of (entitiesIn[entity] ?? []) as Obj[]) {
          if (o && typeof o === "object" && changedActivityIds.has(Number(o.activityId))) objs.push(o);
        }
      }
      if (objs.length === 0) continue;
      await externalizeDataUrls(entity, objs, subject.accountId);
      // Cột server quyết định: dòng MỚI nhận giá trị p.fix (người tạo…); cột keepOnUpdate không bao giờ
      // nằm trong vế DO UPDATE SET nên dòng đã có giữ nguyên giá trị DB — không cần UPDATE vá sau khi ghi
      const colOverrides = new Map<Obj, Obj>();
      for (const p of writes) if (p.entity === entity && p.op === "insert" && Object.keys(p.fix).length > 0) colOverrides.set(p.obj!, p.fix);
      counts[entity] = await writeEntity(client, entity, objs, ctx, {
        insertOnlyCols: WRITE_POLICIES[entity]?.keepOnUpdate,
        colOverrides,
      });
      if (entity === "activities" && changedActivityIds.size > 0) {
        // Danh mục + liên kết của hoạt động gửi kèm là bản ĐẦY ĐỦ → thay hết bản cũ
        // (nếu chỉ UPSERT thì mục người dùng đã bỏ vẫn nằm lại trong DB)
        const ids = [...changedActivityIds];
        if (Array.isArray(entitiesIn.activityCategories)) {
          await client.query("DELETE FROM activity_categories WHERE activity_id = ANY($1::bigint[])", [ids]);
        }
        if (Array.isArray(entitiesIn.activityLinks)) {
          await client.query("DELETE FROM activity_links WHERE activity_id = ANY($1::bigint[])", [ids]);
        }
      }
      for (const p of writes.filter((w) => w.entity === entity)) {
        // UPSERT nơi nhận văn bản là DO NOTHING → cập nhật (đánh dấu đã đọc) ghi riêng
        if (entity === "documentRecipients" && p.op === "update") {
          await client.query(
            "UPDATE document_recipients SET read_at = $1 WHERE document_id = $2 AND org_unit_id = $3",
            [p.next!.read_at ?? null, p.next!.document_id, p.next!.org_unit_id],
          );
        }
      }
    }
    // Xoá theo tombstone — NGƯỢC ENTITY_ORDER (con trước, cha sau), chỉ dòng đã kiểm quyền
    const deleteCounts: Record<string, number> = {};
    for (const entity of [...ENTITY_ORDER].reverse().filter((e) => deleteNames.includes(e))) {
      const ids = active.filter((p) => p.entity === entity && p.op === "delete").map((p) => Number(p.key));
      const n = await deleteEntityIds(client, entity, ids);
      if (n > 0) deleteCounts[entity] = n;
    }

    // e) Nhật ký audit_logs cho mỗi dòng thêm/sửa/xoá — lỗi nhật ký không làm hỏng lần lưu
    const ip = clientIpOf(request);
    const ua = request.headers.get("user-agent");
    const audit: AuditEntry[] = active.map((p) => {
      const cols = p.op === "update" ? p.changed.filter((c) => !c.startsWith("#")) : undefined;
      const oldValues = p.op === "insert" ? null : { ...pickAudit(p.old, cols), ...p.auditOld };
      const newValues = p.op === "delete" ? null : { ...pickAudit(p.next, cols), ...p.auditNew };
      const id = Number((p.old ?? p.next)?.id);
      const withKey = (v: Obj | null) => (v && ENTITY_SPECS[p.entity].noIdentity ? { key: p.key, ...v } : v);
      return {
        accountId: subject.accountId,
        action: `SYNC_${p.op.toUpperCase()}`,
        entityType: ENTITY_SPECS[p.entity].table,
        entityId: Number.isFinite(id) ? id : null,
        oldValues: withKey(oldValues),
        newValues: withKey(newValues),
        ip,
        userAgent: ua,
      };
    });
    await writeAuditLogs(client, audit, "STORE");

    await client.query("COMMIT");
    return NextResponse.json({ ok: true, counts, deletes: deleteCounts, skipped: skippedTotal });
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
