import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { query, withTransaction } from "@/lib/db";
import type { SessionDto } from "@/lib/server/auth";
import { toObj } from "@/lib/server/store-tables";
import { PublicActionError, enforceRate, optionalText, requiredText, type Queryable } from "@/lib/server/public-actions";
import { autoScoreAnswer, isAnswerCorrect, pickNextAdaptive } from "@/lib/quiz";
import type { AdaptiveStep, QuizAnswer, QuizDifficulty, QuizQuestion } from "@/types";

/**
 * Thi trực tuyến phía máy chủ — trình duyệt KHÔNG còn đáp án đúng và không gửi điểm:
 *  - bat-dau: tạo lượt thi, trả mã bí mật của lượt (DB chỉ lưu SHA-256 ở quiz_attempts.access_token).
 *  - tra-loi: chỉ đề thích ứng — chấm từng câu, ghi lộ trình (trail) ở DB, chọn câu kế tiếp.
 *  - nop: chấm điểm bằng đáp án trong DB, lưu answers/trail/auto_score/max_score.
 * Tự luận / tải tệp vẫn chờ cán bộ chấm tay (gradeQuizAttempt qua đồng bộ, không đổi).
 */

const WINDOW_MS = 10 * 60_000;
/** Thời gian bù trễ mạng sau khi hết giờ — quá mức này đáp án gửi kèm lúc nộp bị bỏ qua */
const GRACE_SECONDS = 120;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Truy vấn ngoài transaction, cùng dạng client của withTransaction */
const direct: Queryable = { query: async (text, params) => ({ rows: await query(text, params) }) };

interface ExamRow {
  id: string;
  code: string;
  status: string;
  adaptive: boolean;
  duration_minutes: number;
  question_ids: (string | number)[];
}

interface AttemptRow extends Record<string, unknown> {
  id: string;
  exam_id: string;
  access_token: string | null;
  status: string;
  started_at: Date;
  answers: Record<string, QuizAnswer> | null;
  trail: AdaptiveStep[] | null;
}

async function examQuestions(db: Queryable, exam: ExamRow): Promise<QuizQuestion[]> {
  const ids = (exam.question_ids ?? []).map(Number);
  if (ids.length === 0) return [];
  const r = (await db.query("SELECT * FROM quiz_questions WHERE id = ANY($1::bigint[]) ORDER BY id", [ids])) as {
    rows: Record<string, unknown>[];
  };
  const byId = new Map(r.rows.map((row) => {
    const q = toObj("quizQuestions", row) as unknown as QuizQuestion;
    return [q.id, q] as const;
  }));
  // Giữ đúng thứ tự câu trong đề
  return ids.map((id) => byId.get(id)).filter((q): q is QuizQuestion => !!q);
}

/** Ngân hàng câu theo độ khó cho đề thích ứng — thứ tự theo id, khớp phía trình duyệt */
function adaptivePools(questions: QuizQuestion[]): Record<QuizDifficulty, QuizQuestion[]> {
  const sorted = [...questions].sort((a, b) => a.id - b.id);
  return {
    EASY: sorted.filter((q) => q.difficulty === "EASY"),
    MEDIUM: sorted.filter((q) => q.difficulty === "MEDIUM"),
    HARD: sorted.filter((q) => q.difficulty === "HARD"),
  };
}

/** Làm sạch 1 câu trả lời theo dạng câu hỏi — dữ liệu lạ bị bỏ, rỗng → null */
function sanitizeAnswer(q: QuizQuestion, raw: unknown): QuizAnswer | null {
  if (!raw || typeof raw !== "object") return null;
  const a = raw as { selected?: unknown; text?: unknown; fileName?: unknown };
  if (q.type === "MCQ_SINGLE" || q.type === "MCQ_MULTI" || q.type === "TRUE_FALSE") {
    if (!Array.isArray(a.selected)) return null;
    const n = q.options?.length ?? 0;
    const selected = [...new Set(a.selected.map(Number))].filter((i) => Number.isInteger(i) && i >= 0 && i < n);
    return selected.length > 0 ? { selected } : null;
  }
  if (q.type === "FILE_UPLOAD") {
    const fileName = typeof a.fileName === "string" ? a.fileName.trim().slice(0, 255) : "";
    return fileName ? { fileName } : null;
  }
  const text = typeof a.text === "string" ? a.text.slice(0, q.type === "LONG_ANSWER" ? 20_000 : 5_000) : "";
  return text.trim() ? { text } : null;
}

const round2 = (x: number) => Math.round(x * 100) / 100;

/** Nạp + khoá lượt thi, kiểm tra mã bí mật; sai mã hoặc không có lượt → cùng 1 lỗi 403 */
async function lockAttempt(db: Queryable, attemptId: unknown, accessToken: unknown) {
  const id = Number(attemptId);
  const token = typeof accessToken === "string" ? accessToken : "";
  const denied = new PublicActionError("Mã lượt thi không hợp lệ — chỉ người đã bắt đầu lượt thi mới nộp được bài.", 403);
  if (!Number.isInteger(id) || id <= 0 || !token) throw denied;
  const r = (await db.query("SELECT * FROM quiz_attempts WHERE id = $1 FOR UPDATE", [id])) as { rows: AttemptRow[] };
  const attempt = r.rows[0];
  if (!attempt?.access_token) throw denied;
  const a = Buffer.from(sha256(token));
  const b = Buffer.from(attempt.access_token);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw denied;
  if (attempt.status !== "IN_PROGRESS") throw new PublicActionError("Lượt thi này đã được nộp.", 409);
  const e = (await db.query("SELECT * FROM quiz_exams WHERE id = $1", [attempt.exam_id])) as { rows: ExamRow[] };
  const exam = e.rows[0];
  if (!exam) throw new PublicActionError("Không tìm thấy kỳ thi.", 404);
  const deadline = new Date(attempt.started_at).getTime() + (Number(exam.duration_minutes) * 60 + GRACE_SECONDS) * 1000;
  return { attempt, exam, late: Date.now() > deadline };
}

/** Bắt đầu lượt thi — chỉ kỳ thi đang mở */
export async function startAttempt(
  input: { examId?: unknown; examineeName?: unknown; examineeOrgText?: unknown },
  session: SessionDto | null,
) {
  const examId = Number(input.examId);
  if (!Number.isInteger(examId) || examId <= 0) throw new PublicActionError("Kỳ thi không hợp lệ.");
  const name = requiredText(input.examineeName, "Họ tên thí sinh", 2, 150);
  const orgText = optionalText(input.examineeOrgText, "Trường / đơn vị", 255) ?? "—";

  if (session) {
    enforceRate(`quiz-start:acc:${session.accountId}`, 20, WINDOW_MS, "Bạn bắt đầu thi quá nhiều lần.");
  } else {
    enforceRate(`quiz-start:name:${examId}:${name.toLowerCase()}`, 10, WINDOW_MS, "Thí sinh này bắt đầu thi quá nhiều lần.");
    enforceRate(`quiz-start:exam:${examId}`, 3000, WINDOW_MS, "Kỳ thi đang quá tải.");
  }

  const exams = await query<ExamRow>("SELECT * FROM quiz_exams WHERE id = $1 AND status = 'OPEN'", [examId]);
  const exam = exams[0];
  if (!exam) throw new PublicActionError("Kỳ thi không tồn tại hoặc chưa mở.", 404);
  const questions = await examQuestions(direct, exam);
  if (questions.length === 0) throw new PublicActionError("Đề thi chưa có câu hỏi hợp lệ — vui lòng liên hệ Ban Biên tập.", 409);
  const first = exam.adaptive ? pickNextAdaptive(adaptivePools(questions), []) : null;

  const accessToken = randomBytes(24).toString("base64url");
  const rows = await query<Record<string, unknown>>(
    `INSERT INTO quiz_attempts (exam_id, account_id, examinee_name, examinee_org_text, status, access_token)
     VALUES ($1, $2, $3, $4, 'IN_PROGRESS', $5) RETURNING *`,
    [examId, session?.accountId ?? null, name, orgText, sha256(accessToken)],
  );
  return {
    attempt: toObj("quizAttempts", rows[0]),
    accessToken,
    firstQuestionId: first?.id ?? null,
  };
}

/** Đề thích ứng: chấm 1 câu, ghi lộ trình, trả câu kế tiếp do máy chủ chọn */
export async function answerAdaptive(input: {
  attemptId?: unknown; accessToken?: unknown; questionId?: unknown; answer?: unknown;
}) {
  return withTransaction(async (client) => {
    const { attempt, exam, late } = await lockAttempt(client, input.attemptId, input.accessToken);
    if (!exam.adaptive) throw new PublicActionError("Chỉ đề thích ứng mới chấm từng câu.", 400);
    if (late) throw new PublicActionError("Đã hết giờ làm bài.", 409);
    const questions = await examQuestions(client, exam);
    const pools = adaptivePools(questions);
    const trail: AdaptiveStep[] = Array.isArray(attempt.trail) ? attempt.trail : [];
    const expected = pickNextAdaptive(pools, trail);
    if (!expected) throw new PublicActionError("Đề thi đã hết câu phù hợp — vui lòng nộp bài.", 409);
    if (Number(input.questionId) !== expected.id) {
      throw new PublicActionError("Câu hỏi không khớp lượt thi (có thể bạn đang làm ở tab khác).", 409);
    }
    const answer = sanitizeAnswer(expected, input.answer);
    const correct = isAnswerCorrect(expected, answer ?? undefined) === true;
    const nextTrail: AdaptiveStep[] = [...trail, { questionId: expected.id, difficulty: expected.difficulty, correct }];
    const answers = { ...(attempt.answers ?? {}) };
    if (answer) answers[String(expected.id)] = answer;
    await client.query("UPDATE quiz_attempts SET trail = $2::jsonb, answers = $3::jsonb WHERE id = $1", [
      attempt.id, JSON.stringify(nextTrail), JSON.stringify(answers),
    ]);
    const next = pickNextAdaptive(pools, nextTrail);
    return { correct, nextQuestionId: next?.id ?? null, trail: nextTrail };
  });
}

/** Nộp bài — máy chủ chấm điểm; điểm / lộ trình trình duyệt gửi kèm đều bị bỏ qua */
export async function submitAttempt(input: { attemptId?: unknown; accessToken?: unknown; answers?: unknown }) {
  return withTransaction(async (client) => {
    const { attempt, exam, late } = await lockAttempt(client, input.attemptId, input.accessToken);
    const questions = await examQuestions(client, exam);
    const byId = new Map(questions.map((q) => [q.id, q]));
    const stored = attempt.answers ?? {};
    const trail: AdaptiveStep[] = exam.adaptive && Array.isArray(attempt.trail) ? attempt.trail : [];

    let asked: QuizQuestion[];
    const answers: Record<string, QuizAnswer> = {};
    if (exam.adaptive) {
      // Đề thích ứng: chỉ tính các câu đã trả lời qua tra-loi (đã ghi ở DB)
      asked = trail.map((s) => byId.get(Number(s.questionId))).filter((q): q is QuizQuestion => !!q);
      for (const q of asked) if (stored[String(q.id)]) answers[String(q.id)] = stored[String(q.id)];
    } else {
      asked = questions;
      // Nộp quá hạn → bỏ đáp án gửi kèm (chặn xem đáp án ở nơi khác rồi nộp muộn)
      const raw = !late && input.answers && typeof input.answers === "object" ? (input.answers as Record<string, unknown>) : {};
      for (const q of asked) {
        const a = sanitizeAnswer(q, raw[String(q.id)]);
        if (a) answers[String(q.id)] = a;
      }
    }

    let autoScore = 0;
    let maxScore = 0;
    const perQuestion = asked.map((q) => {
      const a = answers[String(q.id)];
      const points = autoScoreAnswer(q, a);
      autoScore += points;
      maxScore += q.points;
      return { questionId: q.id, points, maxPoints: q.points, correct: isAnswerCorrect(q, a) };
    });

    const r = await client.query(
      `UPDATE quiz_attempts SET answers = $2::jsonb, trail = $3::jsonb, auto_score = $4, max_score = $5,
         status = 'SUBMITTED', submitted_at = now()
       WHERE id = $1 RETURNING *`,
      [attempt.id, JSON.stringify(answers), JSON.stringify(trail), round2(autoScore), round2(maxScore)],
    );
    return {
      attempt: toObj("quizAttempts", r.rows[0] as Record<string, unknown>),
      perQuestion,
      late,
    };
  });
}
