import { NextResponse, type NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { toObj } from "@/lib/server/store-tables";
import { moderateServer } from "@/lib/server/moderation";
import {
  UPLOAD_EXTS, fail, isUploadPath, json, notifyAdmin, rateLimit, readBody, requireSession, serverError, str,
} from "@/lib/server/member-write";

export const runtime = "nodejs";

const FIELDS = new Set(["MOI_TRUONG", "GIAO_DUC", "AN_SINH", "Y_TE", "VAN_HOA", "KHAC"]);
const PHASES = new Set(["DANG_TUYEN", "DANG_TRIEN_KHAI", "HOAN_THANH"]);

/**
 * POST /api/du-an — đăng ký dự án tình nguyện vào ngân hàng dự án
 *   { province, projectName, summary, beneficiaries?, participants, field, phase,
 *     reportFile?: { name, dataUrl } } → { ok, row, verdict, reason }
 * - Đơn vị / tên trường lấy theo tài khoản đăng nhập, người gửi = tài khoản đó.
 * - Luôn PENDING chờ cấp trên duyệt; máy chủ tự kiểm duyệt AI, bị gắn cờ → thông báo Quản trị TW.
 * - File báo cáo chỉ nhận đường dẫn /uploads/du-an/... do /api/uploads tạo.
 * - `row` đúng dạng state phía client (reportFile gộp { name, dataUrl }).
 */
export async function POST(request: NextRequest) {
  const session = await requireSession(request);
  if (session instanceof NextResponse) return session;
  const body = await readBody(request);
  if (!body) return fail("Dữ liệu gửi lên không hợp lệ.");

  const province = str(body.province);
  const projectName = str(body.projectName);
  const summary = str(body.summary);
  const beneficiaries = (str(body.beneficiaries) || "Cộng đồng địa phương").slice(0, 500);
  const participants = Math.round(Number(body.participants)) || 1;
  const field = str(body.field);
  const phase = str(body.phase);
  if (!province || province.length > 100) return fail("Tỉnh/thành không hợp lệ.");
  if (projectName.length < 8 || projectName.length > 255) return fail("Tên dự án cần từ 8 đến 255 ký tự.");
  if (summary.length < 20 || summary.length > 10_000) return fail("Tóm tắt cần từ 20 đến 10.000 ký tự.");
  if (!Number.isSafeInteger(participants) || participants < 1 || participants > 1_000_000) {
    return fail("Số người tham gia không hợp lệ.");
  }
  if (!FIELDS.has(field)) return fail("Lĩnh vực không hợp lệ.");
  if (!PHASES.has(phase)) return fail("Giai đoạn không hợp lệ.");

  let reportName: string | null = null;
  let reportPath: string | null = null;
  const rf = body.reportFile as { name?: unknown; dataUrl?: unknown } | null | undefined;
  if (rf !== undefined && rf !== null) {
    if (typeof rf !== "object" || !isUploadPath(rf.dataUrl, "du-an", UPLOAD_EXTS.document)) {
      return fail("File báo cáo phải được tải lên máy chủ qua nút đính kèm.");
    }
    reportPath = rf.dataUrl;
    reportName = str(rf.name).slice(0, 255) || "bao-cao-du-an";
  }

  const unit = (await query<{ name: string }>("SELECT name FROM org_units WHERE id = $1", [session.orgUnitId]))[0];
  if (!unit) return fail("Không xác định được đơn vị của tài khoản.");

  const limited = rateLimit(`du-an:${session.accountId}`, 10, 10 * 60_000);
  if (limited) return limited;

  const mod = await moderateServer(`${projectName}\n${summary}`);
  try {
    const row = await withTransaction(async (client) => {
      const r = await client.query(
        `INSERT INTO volunteer_projects (org_unit_id, school_name, province, project_name, summary, beneficiaries,
           participants, status, submitted_by_account_id, field, phase, ai_verdict, ai_reason, report_file_name, report_file_data)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
        [session.orgUnitId, unit.name.slice(0, 255), province, projectName, summary, beneficiaries, participants,
          session.accountId, field, phase, mod.verdict, mod.reason ?? null, reportName, reportPath],
      );
      const p = r.rows[0] as Record<string, unknown>;
      if (mod.verdict === "FLAGGED") {
        await notifyAdmin(client, {
          type: "FORUM_FLAGGED",
          title: "Dự án tình nguyện chờ kiểm duyệt",
          message: `Dự án "${projectName}" bị AI gắn cờ: ${mod.reason ?? "nội dung đáng ngờ"}.`,
          refType: "VOLUNTEER_PROJECT",
          refId: Number(p.id),
          linkUrl: "/quan-tri/du-an",
        });
      }
      return p;
    });
    // Dạng client: reportFileName/reportFileData → reportFile { name, dataUrl } (như loadStoreSnapshot)
    const { reportFileName, reportFileData, ...rest } = toObj("volunteerProjects", row);
    return json({
      ok: true,
      row: {
        ...rest,
        reportFile: reportFileName ? { name: reportFileName, dataUrl: reportFileData ?? undefined } : undefined,
      },
      verdict: mod.verdict,
      reason: mod.reason ?? null,
    });
  } catch (err) {
    return serverError("DU-AN", err);
  }
}
