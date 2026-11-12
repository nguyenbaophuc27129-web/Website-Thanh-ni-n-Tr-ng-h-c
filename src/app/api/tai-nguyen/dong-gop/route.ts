import { stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { toObj } from "@/lib/server/store-tables";
import { KIND_RULES, UPLOAD_DIR, UPLOAD_URL_PREFIX } from "@/lib/server/media";
import {
  fail, isUploadPath, json, notifyAdmin, rateLimit, readBody, requireSession, serverError, str,
} from "@/lib/server/member-write";
import { RESOURCE_EXTS } from "@/lib/server/upload-path";
import { RESOURCE_MAX_FILES, nameWithStoredExt } from "@/lib/resource-files";
import type { ResourceAttachment } from "@/types";

export const runtime = "nodejs";

/** Dung lượng tối đa 1 tệp (KB) theo KIND_RULES["tai-nguyen"], cộng dư 1KB làm tròn */
const MAX_FILE_KB = Math.ceil(KIND_RULES["tai-nguyen"].maxBytes / 1024) + 1;

/**
 * Danh sách tệp gửi lên: `attachments` (1–10 tệp) hoặc kiểu cũ 1 tệp {fileName, fileSizeKb, fileDataUrl}.
 * Mỗi url phải là đường dẫn do /api/uploads tạo (phân hệ tai-nguyen) VÀ tệp phải đang có trên đĩa;
 * dung lượng lấy theo tệp thật, không tin số client gửi (chỉ kiểm số đó hợp lệ).
 */
async function parseAttachments(body: Record<string, unknown>): Promise<{ list: ResourceAttachment[] } | { error: string }> {
  let raw: unknown[];
  if (body.attachments !== undefined && body.attachments !== null) {
    if (!Array.isArray(body.attachments)) return { error: "Danh sách tệp không hợp lệ." };
    raw = body.attachments;
  } else {
    // Kiểu cũ: 1 tệp
    raw = [{ name: body.fileName, url: body.fileDataUrl, sizeKb: body.fileSizeKb }];
  }
  if (raw.length === 0) return { error: "Cần đính kèm ít nhất 1 tệp." };
  if (raw.length > RESOURCE_MAX_FILES) return { error: `Mỗi tài nguyên tối đa ${RESOURCE_MAX_FILES} tệp.` };

  const list: ResourceAttachment[] = [];
  const seen = new Set<string>();
  const root = path.resolve(UPLOAD_DIR);
  for (const item of raw) {
    if (!item || typeof item !== "object") return { error: "Danh sách tệp không hợp lệ." };
    const a = item as Record<string, unknown>;
    if (!isUploadPath(a.url, "tai-nguyen", RESOURCE_EXTS)) {
      return { error: "Tệp tài nguyên phải được tải lên máy chủ qua nút chọn tệp." };
    }
    const name = str(a.name) || "tai-lieu";
    if (name.length > 255) return { error: "Tên tệp tối đa 255 ký tự." };
    const claimed = Number(a.sizeKb);
    if (!Number.isSafeInteger(claimed) || claimed <= 0 || claimed > MAX_FILE_KB) {
      return { error: `Dung lượng tệp "${name}" không hợp lệ.` };
    }
    if (seen.has(a.url)) continue; // cùng nội dung → cùng đường dẫn, chỉ giữ một
    seen.add(a.url);

    // Tệp phải tồn tại thật trong thư mục tải lên (chặn đường dẫn đúng dạng nhưng chưa từng được tải lên)
    const abs = path.resolve(root, a.url.slice(UPLOAD_URL_PREFIX.length));
    const st = abs.startsWith(root + path.sep) ? await stat(abs).catch(() => null) : null;
    if (!st?.isFile()) return { error: `Tệp "${name}" chưa có trên máy chủ — hãy tải lên lại.` };

    list.push({
      name: nameWithStoredExt(name, a.url),
      url: a.url,
      sizeKb: Math.max(1, Math.ceil(st.size / 1024)),
      ...(typeof a.mime === "string" && a.mime.length <= 100 ? { mime: a.mime } : {}),
    });
  }
  return { list };
}

/**
 * POST /api/tai-nguyen/dong-gop — đoàn viên đóng góp tài nguyên
 *   { resourceTypeId, title, description?, attachments: [{name, url, sizeKb, mime?}] (1–10 tệp) } → { ok, row }
 *   (vẫn nhận kiểu cũ 1 tệp: fileName, fileSizeKb, fileDataUrl)
 * - Luôn tạo bản nháp (DRAFT, không công khai), người gửi = tài khoản đăng nhập;
 *   Ban biên tập duyệt công khai + cộng điểm ở khu quản trị.
 * - file_name / file_data_url = tệp đầu (tệp chính), file_size_kb = tổng dung lượng, contributor_name = tên người gửi.
 * - Tệp chỉ nhận đường dẫn /uploads/tai-nguyen/... do /api/uploads tạo.
 */
export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;
  const body = await readBody(request);
  if (!body) return fail("Dữ liệu gửi lên không hợp lệ.");

  const resourceTypeId = Number(body.resourceTypeId);
  const title = str(body.title);
  const description = str(body.description) || "Tài nguyên do đoàn viên đóng góp, chờ Ban Biên tập duyệt.";
  if (!Number.isSafeInteger(resourceTypeId) || resourceTypeId <= 0) return fail("Loại tài nguyên không hợp lệ.");
  if (title.length < 6 || title.length > 255) return fail("Tên tài nguyên cần từ 6 đến 255 ký tự.");
  if (description.length > 5000) return fail("Mô tả tối đa 5.000 ký tự.");

  const parsed = await parseAttachments(body);
  if ("error" in parsed) return fail(parsed.error);
  const attachments = parsed.list;
  const main = attachments[0];
  const totalKb = attachments.reduce((s, a) => s + a.sizeKb, 0);

  const types = await query("SELECT 1 FROM resource_types WHERE id = $1", [resourceTypeId]);
  if (types.length === 0) return fail("Loại tài nguyên không hợp lệ.");

  const limited = rateLimit(`tai-nguyen:${session.accountId}`, 10, 10 * 60_000);
  if (limited) return limited;

  try {
    const row = await withTransaction(async (client) => {
      const r = await client.query(
        `INSERT INTO resources (resource_type_id, title, description, file_name, file_size_kb, file_data_url,
           attachments, contributor_name, is_public, download_count, published_by_org_unit_id, published_at,
           submitted_by_account_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, false, 0, $9, now(), $10, 'DRAFT') RETURNING *`,
        [resourceTypeId, title, description, main.name.slice(0, 255), totalKb, main.url,
          JSON.stringify(attachments), session.contactPerson.slice(0, 255), session.orgUnitId, session.accountId],
      );
      const res = r.rows[0] as Record<string, unknown>;
      await notifyAdmin(client, {
        type: "SYSTEM",
        title: "Tài nguyên chờ duyệt từ đoàn viên",
        message: `${session.contactPerson} đóng góp tài nguyên "${title}" (${attachments.length} tệp) — chờ Ban Biên tập duyệt.`,
        refType: "RESOURCE",
        refId: Number(res.id),
        linkUrl: "/quan-tri/dong-gop",
      });
      return res;
    });
    return json({ ok: true, row: toObj("resources", row) });
  } catch (err) {
    return serverError("TAI-NGUYEN", err);
  }
}
