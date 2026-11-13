import { NextResponse, type NextRequest } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { toObj } from "@/lib/server/store-tables";
import { moderateServer } from "@/lib/server/moderation";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import { verifyGoogleCredential } from "@/lib/server/google-verify";
import {
  UPLOAD_EXTS, fail, isUploadPath, json, notifyAdmin, rateLimit, readBody, serverError, str,
} from "@/lib/server/member-write";

export const runtime = "nodejs";

const FIELDS = new Set(["MOI_TRUONG", "GIAO_DUC", "AN_SINH", "Y_TE", "VAN_HOA", "KHAC"]);
const PHASES = new Set(["DANG_TUYEN", "DANG_TRIEN_KHAI", "HOAN_THANH"]);

/**
 * POST /api/du-an — đăng ký dự án tình nguyện vào ngân hàng dự án
 *   Hỗ trợ 2 phương thức xác thực:
 *   1) Đăng nhập tài khoản nội bộ (session cookie).
 *   2) Xác thực nhanh bằng Google Gmail (body.credential từ Google Identity Services) — không cần tài khoản.
 *   Khi người dùng đăng ký tài khoản sau này bằng Gmail đó, hệ thống sẽ tự động liên kết dự án đã gửi.
 */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionFromToken(token).catch(() => null) : null;

  const body = await readBody(request);
  if (!body) return fail("Dữ liệu gửi lên không hợp lệ.");

  // Định danh người gửi
  let accountId: number | null = null;
  let orgUnitId: number | null = null;
  let submitterEmail: string | null = null;
  let defaultSchoolName = "Đoàn trường";

  if (session) {
    accountId = session.accountId;
    orgUnitId = session.orgUnitId;
    submitterEmail = session.username;
    const unit = (await query<{ name: string }>("SELECT name FROM org_units WHERE id = $1", [session.orgUnitId]))[0];
    if (unit) defaultSchoolName = unit.name;
  } else {
    const cred = str(body.credential);
    const googleUser = cred ? await verifyGoogleCredential(cred) : null;
    if (!googleUser) {
      return json(
        { ok: false, error: "Cần xác thực Google Gmail để đăng ký dự án — không cần tạo tài khoản.", needAuth: true },
        401
      );
    }
    submitterEmail = googleUser.email;
  }

  const province = str(body.province);
  const projectName = str(body.projectName);
  const summary = str(body.summary);
  const beneficiaries = (str(body.beneficiaries) || "Cộng đồng địa phương").slice(0, 500);
  const participants = Math.round(Number(body.participants)) || 1;
  const field = str(body.field);
  const phase = str(body.phase);
  const schoolName = (str(body.schoolName) || str(body.orgDisplayName) || defaultSchoolName).slice(0, 255);

  if (!province || province.length > 100) return fail("Tỉnh/thành không hợp lệ.");
  if (projectName.length < 8 || projectName.length > 255) return fail("Tên dự án cần từ 8 đến 255 ký tự.");
  if (summary.length < 20 || summary.length > 10_000) return fail("Tóm tắt cần từ 20 đến 10.000 ký tự.");
  if (!Number.isSafeInteger(participants) || participants < 1 || participants > 1_000_000) {
    return fail("Số người tham gia không hợp lệ.");
  }
  if (!FIELDS.has(field)) return fail("Lĩnh vực không hợp lệ.");

  // Form tự khai mở rộng (migration 0033) — các trường tùy chọn, trống → NULL
  const ward = str(body.ward);
  if (!ward || ward.length > 255) return fail("Xã / phường không hợp lệ.");
  const optText = (v: unknown, max: number) => str(v).slice(0, max) || null;
  const objectives = optText(body.objectives, 5000);
  const timeframe = optText(body.timeframe, 255);
  const initialResults = optText(body.initialResults, 5000);
  const direction = optText(body.direction, 5000);
  if (body.phases !== undefined && body.phases !== null && !Array.isArray(body.phases)) return fail("Danh sách giai đoạn không hợp lệ.");
  const phaseList = (Array.isArray(body.phases) ? body.phases : [])
    .map((ph) => {
      const o = (ph && typeof ph === "object" ? ph : {}) as { at?: unknown; content?: unknown };
      return { at: str(o.at).slice(0, 100), content: str(o.content).slice(0, 2000) };
    })
    .filter((ph) => ph.at || ph.content);
  if (phaseList.length > 20) return fail("Tối đa 20 giai đoạn.");
  if (!PHASES.has(phase)) return fail("Giai đoạn không hợp lệ.");

  // Kênh liên hệ (tùy chọn) — mặc định lấy submitterEmail nếu email liên hệ trống
  const optContact = (v: unknown, max: number) => str(v).slice(0, max) || null;
  const contactEmail = optContact(body.contactEmail, 254) || submitterEmail;
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contactEmail)) return fail("Email liên hệ không hợp lệ.");
  const contactPhone = optContact(body.contactPhone, 20);
  if (contactPhone && !/^[0-9+()\s.\-]{8,20}$/.test(contactPhone)) return fail("Số điện thoại liên hệ không hợp lệ.");
  const linkOf = (v: unknown): string | null => {
    let s = str(v).trim();
    if (!s) return null;
    if (/^(https?:\/\/)/i.test(s)) return s.slice(0, 255);
    if (/^(www\.|facebook\.com|fb\.com|m\.facebook\.com)/i.test(s)) return `https://${s}`.slice(0, 255);
    return null;
  };
  const contactFacebook = linkOf(body.contactFacebook);
  const contactWebsite = linkOf(body.contactWebsite);
  if (contactFacebook && !/facebook\.com|fb\.(com|me)/i.test(contactFacebook)) return fail("Link liên hệ Facebook không hợp lệ.");
  if (contactWebsite && !/^https:\/\//i.test(contactWebsite)) return fail("Website phải bắt đầu bằng https://");

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

  const rateLimitKey = accountId ? `du-an:acc:${accountId}` : `du-an:email:${submitterEmail}`;
  const limited = rateLimit(rateLimitKey, 10, 10 * 60_000);
  if (limited) return limited;

  const mod = await moderateServer(
    [projectName, summary, objectives, initialResults, direction, ...phaseList.map((ph) => ph.content)]
      .filter(Boolean)
      .join("\n"),
  );
  try {
    const row = await withTransaction(async (client) => {
      const r = await client.query(
        `INSERT INTO volunteer_projects (org_unit_id, school_name, province, project_name, summary, beneficiaries,
           participants, status, submitted_by_account_id, submitter_email, field, phase, ai_verdict, ai_reason, report_file_name, report_file_data,
           ward, objectives, timeframe, initial_results, direction, phases,
           contact_email, contact_phone, contact_facebook, contact_website)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING', $8, $9, $10, $11, $12, $13, $14,
           $15, $16, $17, $18, $19, $20::jsonb, $21, $22, $23, $24) RETURNING *`,
        [orgUnitId, schoolName, province, projectName, summary, beneficiaries, participants,
          accountId, submitterEmail, field, phase, mod.verdict, mod.reason ?? null, reportName, reportPath,
          ward, objectives, timeframe, initialResults, direction, JSON.stringify(phaseList),
          contactEmail, contactPhone, contactFacebook, contactWebsite],
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
        phases: Array.isArray(rest.phases) ? rest.phases : [],
        reportFile: reportFileName ? { name: reportFileName, dataUrl: reportFileData ?? undefined } : undefined,
      },
      verdict: mod.verdict,
      reason: mod.reason ?? null,
    });
  } catch (err) {
    return serverError("DU-AN", err);
  }
}
