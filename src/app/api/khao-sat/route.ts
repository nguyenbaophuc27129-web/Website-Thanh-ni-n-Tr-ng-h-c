import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";
import { ruleModerate } from "@/lib/ai-moderation";
import {
  surveyOpenNow,
  toSurveyDto,
  type SurveyRow,
} from "@/lib/server/khao-sat";
import type { SurveyAnswer, SurveyQuestion } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function sessionOf(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  return token ? await sessionFromToken(token) : null;
}

/**
 * GET /api/khao-sat — danh sách khảo sát công khai (LIVE/ENDED) hoặc chi tiết theo ?code=
 */
export async function GET(request: NextRequest) {
  const sp = new URL(request.url).searchParams;
  const code = sp.get("code")?.trim() || "";
  const guestToken = sp.get("guestToken")?.trim() || "";

  if (!dbEnabled()) {
    return NextResponse.json({
      ok: true,
      surveys: [],
    });
  }

  try {
    // Chi tiết 1 khảo sát
    if (code) {
      const rows = await query<SurveyRow>(
        `SELECT id, code, title, description, status, starts_at, ends_at, questions, created_at, updated_at
         FROM surveys
         WHERE code = $1
         LIMIT 1`,
        [code]
      );

      const r = rows[0];
      if (!r) {
        return NextResponse.json(
          { ok: false, error: "Không tìm thấy khảo sát." },
          { status: 404 }
        );
      }

      const session = await sessionOf(request);
      if (r.status === "DRAFT" && session?.role !== "QUAN_TRI_TW") {
        return NextResponse.json(
          { ok: false, error: "Khảo sát này chưa được công bố." },
          { status: 404 }
        );
      }

      // Đếm số lượt phản hồi
      const countRes = await query<{ count: number | string }>(
        `SELECT count(*)::int AS count FROM survey_responses WHERE survey_id = $1`,
        [r.id]
      );
      const responseCount = Number(countRes[0]?.count ?? 0);

      // Kiểm tra người dùng đã tham gia chưa
      let myResponse: { id: number; answers: SurveyAnswer[]; submittedAt: string } | null = null;
      if (session?.accountId) {
        const respRows = await query<{ id: number | string; answers: unknown; submitted_at: Date | string }>(
          `SELECT id, answers, submitted_at FROM survey_responses WHERE survey_id = $1 AND account_id = $2 LIMIT 1`,
          [r.id, session.accountId]
        );
        if (respRows[0]) {
          myResponse = {
            id: Number(respRows[0].id),
            answers: (typeof respRows[0].answers === "string"
              ? JSON.parse(respRows[0].answers)
              : respRows[0].answers) as SurveyAnswer[],
            submittedAt: new Date(respRows[0].submitted_at).toISOString(),
          };
        }
      } else if (guestToken && guestToken.length >= 16) {
        const respRows = await query<{ id: number | string; answers: unknown; submitted_at: Date | string }>(
          `SELECT id, answers, submitted_at FROM survey_responses WHERE survey_id = $1 AND guest_token = $2 LIMIT 1`,
          [r.id, guestToken]
        );
        if (respRows[0]) {
          myResponse = {
            id: Number(respRows[0].id),
            answers: (typeof respRows[0].answers === "string"
              ? JSON.parse(respRows[0].answers)
              : respRows[0].answers) as SurveyAnswer[],
            submittedAt: new Date(respRows[0].submitted_at).toISOString(),
          };
        }
      }

      const dto = toSurveyDto({ ...r, response_count: responseCount });
      return NextResponse.json({
        ok: true,
        survey: dto,
        myResponse,
      });
    }

    // Danh sách khảo sát công khai
    const rows = await query<SurveyRow>(
      `SELECT s.id, s.code, s.title, s.description, s.status, s.starts_at, s.ends_at, s.questions,
              s.created_at, s.updated_at, count(r.id)::int AS response_count
       FROM surveys s
       LEFT JOIN survey_responses r ON r.survey_id = s.id
       WHERE s.status IN ('LIVE', 'ENDED')
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
 * POST /api/khao-sat — nộp câu trả lời (học sinh đăng nhập HOẶC khách qua guestToken)
 */
export async function POST(request: NextRequest) {
  if (!dbEnabled()) {
    return NextResponse.json(
      { ok: false, error: "Chức năng chưa sẵn sàng (DB disabled)." },
      { status: 503 }
    );
  }

  let body: {
    code?: string;
    answers?: SurveyAnswer[];
    guestToken?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Dữ liệu JSON không hợp lệ." },
      { status: 400 }
    );
  }

  const code = body.code?.trim();
  if (!code) {
    return NextResponse.json(
      { ok: false, error: "Thiếu mã khảo sát (code)." },
      { status: 400 }
    );
  }

  try {
    const sRows = await query<SurveyRow>(
      `SELECT id, code, title, description, status, starts_at, ends_at, questions, created_at, updated_at
       FROM surveys
       WHERE code = $1
       LIMIT 1`,
      [code]
    );

    const sRow = sRows[0];
    if (!sRow) {
      return NextResponse.json(
        { ok: false, error: "Không tìm thấy khảo sát." },
        { status: 404 }
      );
    }

    const survey = toSurveyDto(sRow);
    if (!surveyOpenNow(survey)) {
      return NextResponse.json(
        { ok: false, error: "Khảo sát hiện không mở nhận câu trả lời hoặc đã kết thúc." },
        { status: 400 }
      );
    }

    // Nhận diện người tham gia: account hoặc guestToken
    const session = await sessionOf(request);
    let accountId: number | null = session?.accountId ? Number(session.accountId) : null;
    let guestToken: string | null = null;

    if (!accountId) {
      const g = body.guestToken?.trim();
      if (!g || g.length < 16 || g.length > 64) {
        return NextResponse.json(
          { ok: false, error: "Vui lòng đăng nhập hoặc cung cấp mã thiết bị khách hợp lệ." },
          { status: 400 }
        );
      }
      guestToken = g;
    }

    // Kiểm tra câu trả lời
    const rawAnswers = body.answers;
    if (!Array.isArray(rawAnswers) || rawAnswers.length === 0) {
      return NextResponse.json(
        { ok: false, error: "Vui lòng trả lời các câu hỏi trong khảo sát." },
        { status: 400 }
      );
    }

    const answerMap = new Map<string, unknown>();
    for (const a of rawAnswers) {
      if (a && typeof a.questionId === "string") {
        answerMap.set(a.questionId, a.value);
      }
    }

    const questions: SurveyQuestion[] = survey.questions ?? [];
    const cleanAnswers: SurveyAnswer[] = [];

    for (const q of questions) {
      const val = answerMap.get(q.id);

      if (q.required) {
        if (
          val === undefined ||
          val === null ||
          (typeof val === "string" && !val.trim()) ||
          (Array.isArray(val) && val.length === 0)
        ) {
          return NextResponse.json(
            { ok: false, error: `Vui lòng trả lời câu hỏi bắt buộc: "${q.text.slice(0, 60)}..."` },
            { status: 400 }
          );
        }
      }

      if (val !== undefined && val !== null && val !== "") {
        if (q.type === "TEXT") {
          const strVal = String(val).trim();
          if (strVal.length > 2000) {
            return NextResponse.json(
              { ok: false, error: `Câu trả lời quá dài (tối đa 2000 ký tự).` },
              { status: 400 }
            );
          }
          // Kiểm duyệt ngôn từ độc hại / chống phá
          const mod = ruleModerate(strVal);
          if (mod.verdict === "FLAGGED") {
            return NextResponse.json(
              {
                ok: false,
                error: `Nội dung câu trả lời chưa phù hợp tiêu chuẩn văn minh (${mod.reason ?? "vi phạm từ khóa"}).`,
              },
              { status: 400 }
            );
          }
          cleanAnswers.push({ questionId: q.id, value: strVal });
        } else if (q.type === "SINGLE") {
          const strVal = String(val).trim();
          if (q.options && !q.options.includes(strVal)) {
            return NextResponse.json(
              { ok: false, error: `Đáp án không hợp lệ cho câu hỏi: "${q.text.slice(0, 40)}..."` },
              { status: 400 }
            );
          }
          cleanAnswers.push({ questionId: q.id, value: strVal });
        } else if (q.type === "MULTI") {
          if (!Array.isArray(val)) {
            return NextResponse.json(
              { ok: false, error: `Câu trả lời dạng nhiều lựa chọn không hợp lệ.` },
              { status: 400 }
            );
          }
          const validOpts = val.map((v) => String(v).trim()).filter(Boolean);
          for (const opt of validOpts) {
            if (q.options && !q.options.includes(opt)) {
              return NextResponse.json(
                { ok: false, error: `Đáp án "${opt}" không có trong danh sách lựa chọn.` },
                { status: 400 }
              );
            }
          }
          cleanAnswers.push({ questionId: q.id, value: validOpts });
        }
      }
    }

    // Lưu vào database
    const ins = await query<{ id: number | string; submitted_at: Date | string }>(
      `INSERT INTO survey_responses (survey_id, account_id, guest_token, answers, submitted_at)
       VALUES ($1, $2, $3, $4::jsonb, now())
       RETURNING id, submitted_at`,
      [survey.id, accountId, guestToken, JSON.stringify(cleanAnswers)]
    );

    return NextResponse.json({
      ok: true,
      responseId: Number(ins[0].id),
      submittedAt: new Date(ins[0].submitted_at).toISOString(),
    });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err.code === "23505") {
      return NextResponse.json(
        { ok: false, error: "Bạn đã tham gia khảo sát này rồi (mỗi tài khoản/thiết bị chỉ được gửi 1 lần)." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { ok: false, error: err.message ?? "Lỗi máy chủ khi nộp khảo sát." },
      { status: 500 }
    );
  }
}
