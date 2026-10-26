import { NextResponse, type NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { toObj } from "@/lib/server/store-tables";
import {
  UPLOAD_EXTS, fail, isUploadPath, json, notifyAdmin, rateLimit, readBody, requireSession, serverError, str,
} from "@/lib/server/member-write";

export const runtime = "nodejs";

/** Kho tài nguyên nhận văn bản, ảnh (đã chuyển WebP) và video — như KIND_RULES["tai-nguyen"] */
const RESOURCE_EXTS = [...UPLOAD_EXTS.document, ...UPLOAD_EXTS.image, ...UPLOAD_EXTS.video];

/**
 * POST /api/tai-nguyen/dong-gop — đoàn viên đóng góp tài nguyên
 *   { resourceTypeId, title, description?, fileName, fileSizeKb, fileDataUrl } → { ok, row }
 * - Luôn tạo bản nháp (DRAFT, không công khai), người gửi = tài khoản đăng nhập;
 *   Ban biên tập duyệt công khai + cộng điểm ở khu quản trị.
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
  const fileName = str(body.fileName).slice(0, 255) || "tai-lieu.pdf";
  const fileSizeKb = Math.round(Number(body.fileSizeKb));
  if (!Number.isSafeInteger(resourceTypeId) || resourceTypeId <= 0) return fail("Loại tài nguyên không hợp lệ.");
  if (title.length < 6 || title.length > 255) return fail("Tên tài nguyên cần từ 6 đến 255 ký tự.");
  if (description.length > 5000) return fail("Mô tả tối đa 5.000 ký tự.");
  if (!isUploadPath(body.fileDataUrl, "tai-nguyen", RESOURCE_EXTS)) {
    return fail("Tệp tài nguyên phải được tải lên máy chủ qua nút chọn tệp.");
  }
  const fileDataUrl = body.fileDataUrl;

  const types = await query("SELECT 1 FROM resource_types WHERE id = $1", [resourceTypeId]);
  if (types.length === 0) return fail("Loại tài nguyên không hợp lệ.");

  const limited = rateLimit(`tai-nguyen:${session.accountId}`, 10, 10 * 60_000);
  if (limited) return limited;

  try {
    const row = await withTransaction(async (client) => {
      const r = await client.query(
        `INSERT INTO resources (resource_type_id, title, description, file_name, file_size_kb, file_data_url,
           is_public, download_count, published_by_org_unit_id, published_at, submitted_by_account_id, status)
         VALUES ($1, $2, $3, $4, $5, $6, false, 0, $7, now(), $8, 'DRAFT') RETURNING *`,
        [resourceTypeId, title, description, fileName,
          Number.isSafeInteger(fileSizeKb) && fileSizeKb > 0 ? Math.min(fileSizeKb, 30 * 1024) : 1,
          fileDataUrl, session.orgUnitId, session.accountId],
      );
      const res = r.rows[0] as Record<string, unknown>;
      await notifyAdmin(client, {
        type: "SYSTEM",
        title: "Tài nguyên chờ duyệt từ đoàn viên",
        message: `${session.contactPerson} đóng góp tài nguyên "${title}" — chờ Ban Biên tập duyệt.`,
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
