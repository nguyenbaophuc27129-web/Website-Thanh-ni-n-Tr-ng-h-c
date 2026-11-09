import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query, withTransaction } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import { writeAuditLogs } from "@/lib/server/audit";
import { clientIpOf } from "@/lib/server/client-ip";
import {
  tallyResults,
  toSurveyDto,
  validateQuestions,
  type SurveyRow,
} from "@/lib/server/khao-sat";
import { slugify } from "@/lib/khao-sat";
import type { SurveyQuestion, SurveyStatus } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function twSessionOf(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await sessionFromToken(token);
  if (!s || s.role !== "QUAN_TRI_TW") return null;
  return s;
}

/**
 * GET /api/khao-sat/quan-tri — TW xem danh sách tất cả khảo sát (gồm DRAFT) hoặc chi tiết + tallies theo ?id=
 */
export async function GET(request: NextRequest) {
  const session = await twSessionOf(request);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Chỉ Quản trị viên Trung ương mới có quyền truy cập." },
      { status: 403 }
    );
  }

  if (!dbEnabled()) {
    return NextResponse.json({ ok: true, surveys: [] });
  }

  const sp = new URL(request.url).searchParams;
  const id = Number(sp.get("id")) || 0;

  try {
    if (id > 0) {
      const rows = await query<SurveyRow>(
        `SELECT id, code, title, description, status, starts_at, ends_at, questions, created_at, updated_at
         FROM surveys
         WHERE id = $1
         LIMIT 1`,
        [id]
      );

      const r = rows[0];
      if (!r) {
        return NextResponse.json(
          { ok: false, error: "Không tìm thấy khảo sát." },
          { status: 404 }
        );
      }

      // Lấy toàn bộ câu trả lời để tổng hợp biểu đồ
      const respRows = await query<{ answers: unknown }>(
        `SELECT answers FROM survey_responses WHERE survey_id = $1 ORDER BY submitted_at ASC`,
        [id]
      );

      const surveyDto = toSurveyDto({ ...r, response_count: respRows.length });
      const tallies = tallyResults(surveyDto.questions, respRows);

      return NextResponse.json({
        ok: true,
        survey: surveyDto,
        tallies,
        responseCount: respRows.length,
      });
    }

    // Danh sách toàn bộ khảo sát
    const rows = await query<SurveyRow>(
      `SELECT s.id, s.code, s.title, s.description, s.status, s.starts_at, s.ends_at, s.questions,
              s.created_at, s.updated_at, count(r.id)::int AS response_count
       FROM surveys s
       LEFT JOIN survey_responses r ON r.survey_id = s.id
       GROUP BY s.id
       ORDER BY s.created_at DESC`
    );

    return NextResponse.json({
      ok: true,
      surveys: rows.map(toSurveyDto),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/khao-sat/quan-tri — Tạo khảo sát mới
 */
export async function POST(request: NextRequest) {
  const session = await twSessionOf(request);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Chỉ Quản trị viên Trung ương mới có quyền tạo khảo sát." },
      { status: 403 }
    );
  }

  if (!dbEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Cơ sở dữ liệu chưa sẵn sàng." },
      { status: 503 }
    );
  }

  let body: {
    title?: string;
    code?: string;
    description?: string;
    status?: SurveyStatus;
    startsAt?: string;
    endsAt?: string;
    questions?: SurveyQuestion[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON không hợp lệ." }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title || title.length < 5 || title.length > 200) {
    return NextResponse.json(
      { ok: false, error: "Tiêu đề khảo sát phải từ 5 đến 200 ký tự." },
      { status: 400 }
    );
  }

  let code = body.code?.trim().toLowerCase();
  if (!code) {
    const slug = slugify(title);
    code = `${slug || "ks"}-${Date.now().toString(36)}`;
  }
  if (!/^[a-z0-9-]+$/.test(code) || code.length > 40) {
    return NextResponse.json(
      { ok: false, error: "Mã khảo sát (code) chỉ gồm chữ thường, số, dấu gạch ngang (tối đa 40 ký tự)." },
      { status: 400 }
    );
  }

  const qCheck = validateQuestions(body.questions);
  if (!qCheck.ok || !qCheck.cleanQuestions) {
    return NextResponse.json({ ok: false, error: qCheck.error }, { status: 400 });
  }

  const status = body.status && ["DRAFT", "LIVE", "ENDED"].includes(body.status) ? body.status : "DRAFT";
  const startsAt = body.startsAt ? new Date(body.startsAt) : null;
  const endsAt = body.endsAt ? new Date(body.endsAt) : null;

  if (startsAt && endsAt && endsAt <= startsAt) {
    return NextResponse.json(
      { ok: false, error: "Thời gian kết thúc phải sau thời gian bắt đầu." },
      { status: 400 }
    );
  }

  try {
    const ins = await query<SurveyRow>(
      `INSERT INTO surveys (code, title, description, status, starts_at, ends_at, questions, created_by_account_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, now(), now())
       RETURNING *`,
      [
        code,
        title,
        body.description?.trim() || null,
        status,
        startsAt,
        endsAt,
        JSON.stringify(qCheck.cleanQuestions),
        session.accountId,
      ]
    );

    return NextResponse.json({
      ok: true,
      survey: toSurveyDto(ins[0]),
    });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === "23505") {
      return NextResponse.json(
        { ok: false, error: `Mã khảo sát "${code}" đã tồn tại. Vui lòng chọn mã khác.` },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { ok: false, error: err.message ?? "Lỗi máy chủ khi tạo khảo sát." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/khao-sat/quan-tri — Cập nhật khảo sát
 */
export async function PATCH(request: NextRequest) {
  const session = await twSessionOf(request);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Chỉ Quản trị viên Trung ương mới có quyền sửa khảo sát." },
      { status: 403 }
    );
  }

  if (!dbEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Cơ sở dữ liệu chưa sẵn sàng." },
      { status: 503 }
    );
  }

  let body: {
    id: number;
    title?: string;
    code?: string;
    description?: string;
    status?: SurveyStatus;
    startsAt?: string | null;
    endsAt?: string | null;
    questions?: SurveyQuestion[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "JSON không hợp lệ." }, { status: 400 });
  }

  const id = Number(body.id);
  if (!id || id <= 0) {
    return NextResponse.json({ ok: false, error: "Thiếu ID khảo sát." }, { status: 400 });
  }

  try {
    const existingRows = await query<SurveyRow>(`SELECT * FROM surveys WHERE id = $1 LIMIT 1`, [id]);
    const existing = existingRows[0];
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Không tìm thấy khảo sát." }, { status: 404 });
    }

    const updates: string[] = ["updated_at = now()"];
    const params: unknown[] = [id];

    if (body.title !== undefined) {
      const t = body.title.trim();
      if (t.length < 5 || t.length > 200) {
        return NextResponse.json(
          { ok: false, error: "Tiêu đề khảo sát phải từ 5 đến 200 ký tự." },
          { status: 400 }
        );
      }
      params.push(t);
      updates.push(`title = $${params.length}`);
    }

    if (body.code !== undefined) {
      const c = body.code.trim().toLowerCase();
      if (!/^[a-z0-9-]+$/.test(c) || c.length > 40) {
        return NextResponse.json(
          { ok: false, error: "Mã khảo sát chỉ gồm chữ thường, số, dấu gạch ngang (tối đa 40 ký tự)." },
          { status: 400 }
        );
      }
      params.push(c);
      updates.push(`code = $${params.length}`);
    }

    if (body.description !== undefined) {
      params.push(body.description?.trim() || null);
      updates.push(`description = $${params.length}`);
    }

    if (body.status !== undefined) {
      if (!["DRAFT", "LIVE", "ENDED"].includes(body.status)) {
        return NextResponse.json({ ok: false, error: "Trạng thái không hợp lệ." }, { status: 400 });
      }
      params.push(body.status);
      updates.push(`status = $${params.length}`);
    }

    if (body.startsAt !== undefined) {
      params.push(body.startsAt ? new Date(body.startsAt) : null);
      updates.push(`starts_at = $${params.length}`);
    }

    if (body.endsAt !== undefined) {
      params.push(body.endsAt ? new Date(body.endsAt) : null);
      updates.push(`ends_at = $${params.length}`);
    }

    if (body.questions !== undefined) {
      const qCheck = validateQuestions(body.questions);
      if (!qCheck.ok || !qCheck.cleanQuestions) {
        return NextResponse.json({ ok: false, error: qCheck.error }, { status: 400 });
      }
      params.push(JSON.stringify(qCheck.cleanQuestions));
      updates.push(`questions = $${params.length}::jsonb`);
    }

    const updated = await query<SurveyRow>(
      `UPDATE surveys SET ${updates.join(", ")} WHERE id = $1 RETURNING *`,
      params
    );

    return NextResponse.json({
      ok: true,
      survey: toSurveyDto(updated[0]),
    });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === "23505") {
      return NextResponse.json(
        { ok: false, error: "Mã khảo sát (code) đã bị trùng với khảo sát khác." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { ok: false, error: err.message ?? "Lỗi máy chủ khi cập nhật." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/khao-sat/quan-tri — Xóa khảo sát Bản nháp hoặc Đã kết thúc (kèm toàn bộ câu trả lời —
 * survey_responses ON DELETE CASCADE). Khảo sát đang mở (LIVE) phải đóng trước. Ghi audit_logs.
 */
export async function DELETE(request: NextRequest) {
  const session = await twSessionOf(request);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Chỉ Quản trị viên Trung ương mới có quyền xóa khảo sát." },
      { status: 403 }
    );
  }

  if (!dbEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Cơ sở dữ liệu chưa sẵn sàng." },
      { status: 503 }
    );
  }

  const sp = new URL(request.url).searchParams;
  const id = Number(sp.get("id")) || 0;
  if (!id || id <= 0) {
    return NextResponse.json({ ok: false, error: "Thiếu ID khảo sát cần xóa." }, { status: 400 });
  }

  try {
    const result = await withTransaction(async (client) => {
      // Khoá dòng để không ai mở lại khảo sát giữa lúc kiểm tra và xóa
      const existing = (
        await client.query(
          `SELECT id, code, title, status,
                  (SELECT count(*)::int FROM survey_responses WHERE survey_id = s.id) AS response_count
             FROM surveys s WHERE id = $1 FOR UPDATE`,
          [id]
        )
      ).rows[0] as { id: string; code: string; title: string; status: string; response_count: number } | undefined;
      if (!existing) return { error: "Không tìm thấy khảo sát.", status: 404 };
      if (existing.status === "LIVE") {
        return {
          error: "Khảo sát đang mở nhận ý kiến — vui lòng Đóng khảo sát trước khi xóa.",
          status: 400,
        };
      }

      await client.query(`DELETE FROM surveys WHERE id = $1`, [id]);
      await writeAuditLogs(
        client,
        [
          {
            accountId: session.accountId,
            action: "SURVEY_DELETE",
            entityType: "surveys",
            entityId: id,
            oldValues: {
              code: existing.code,
              title: existing.title,
              status: existing.status,
              responseCount: existing.response_count,
            },
            newValues: null,
            ip: clientIpOf(request),
            userAgent: request.headers.get("user-agent"),
          },
        ],
        "KHAO-SAT"
      );
      return null;
    });

    if (result) {
      return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message },
      { status: 500 }
    );
  }
}
