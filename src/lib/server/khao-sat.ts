import type { Survey, SurveyQuestion, SurveyTally } from "@/types";

const ISO = (v: Date | string | null): string =>
  v === null ? "" : v instanceof Date ? v.toISOString() : new Date(v).toISOString();

export interface SurveyRow {
  id: number | string;
  code: string;
  title: string;
  description: string | null;
  status: string;
  starts_at: Date | string | null;
  ends_at: Date | string | null;
  questions: unknown;
  response_count?: number | string;
  created_at: Date | string;
  updated_at: Date | string;
}

export function toSurveyDto(r: SurveyRow): Survey {
  let questions: SurveyQuestion[] = [];
  if (Array.isArray(r.questions)) {
    questions = r.questions as SurveyQuestion[];
  } else if (typeof r.questions === "string") {
    try {
      questions = JSON.parse(r.questions) as SurveyQuestion[];
    } catch {
      questions = [];
    }
  }

  return {
    id: Number(r.id),
    code: r.code,
    title: r.title,
    description: r.description ?? undefined,
    status: r.status as Survey["status"],
    startsAt: r.starts_at ? ISO(r.starts_at) : undefined,
    endsAt: r.ends_at ? ISO(r.ends_at) : undefined,
    questions,
    responseCount: r.response_count !== undefined ? Number(r.response_count) : undefined,
    createdAt: ISO(r.created_at),
    updatedAt: ISO(r.updated_at),
  };
}

export function surveyOpenNow(s: Survey): boolean {
  if (s.status !== "LIVE") return false;
  const now = Date.now();
  if (s.startsAt && new Date(s.startsAt).getTime() > now) return false;
  if (s.endsAt && new Date(s.endsAt).getTime() < now) return false;
  return true;
}

export function validateQuestions(questions: unknown): { ok: boolean; error?: string; cleanQuestions?: SurveyQuestion[] } {
  if (!Array.isArray(questions) || questions.length === 0) {
    return { ok: false, error: "Khảo sát phải có ít nhất 1 câu hỏi." };
  }
  if (questions.length > 20) {
    return { ok: false, error: "Khảo sát tối đa 20 câu hỏi." };
  }

  const clean: SurveyQuestion[] = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i] as Partial<SurveyQuestion> | null;
    if (!q || typeof q !== "object") {
      return { ok: false, error: `Câu hỏi số ${i + 1} không hợp lệ.` };
    }

    const id = (q.id ?? `q_${i + 1}`).trim();
    const text = (q.text ?? "").trim();
    const type = q.type;

    if (text.length < 5 || text.length > 500) {
      return { ok: false, error: `Nội dung câu hỏi ${i + 1} phải từ 5 đến 500 ký tự.` };
    }

    if (!type || !["SINGLE", "MULTI", "TEXT"].includes(type)) {
      return { ok: false, error: `Loại câu hỏi ${i + 1} không hợp lệ (SINGLE | MULTI | TEXT).` };
    }

    if (type === "SINGLE" || type === "MULTI") {
      if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 10) {
        return { ok: false, error: `Câu hỏi ${i + 1} dạng chọn đáp án phải có từ 2 đến 10 lựa chọn.` };
      }
      const cleanOpts = q.options.map((o) => String(o).trim()).filter(Boolean);
      if (cleanOpts.length < 2) {
        return { ok: false, error: `Các lựa chọn của câu ${i + 1} không được để trống.` };
      }
      clean.push({
        id,
        text,
        type,
        options: cleanOpts,
        required: q.required !== false,
      });
    } else {
      clean.push({
        id,
        text,
        type: "TEXT",
        required: q.required !== false,
      });
    }
  }

  return { ok: true, cleanQuestions: clean };
}

export function tallyResults(
  questions: SurveyQuestion[],
  responses: { answers: unknown }[]
): SurveyTally[] {
  const tallies: Record<string, SurveyTally> = {};

  for (const q of questions) {
    tallies[q.id] = {
      questionId: q.id,
      optionCounts: {},
      textResponses: [],
      totalAnswered: 0,
    };
    if (q.options) {
      for (const opt of q.options) {
        tallies[q.id].optionCounts[opt] = 0;
      }
    }
  }

  for (const resp of responses) {
    let answers: { questionId: string; value: unknown }[] = [];
    if (Array.isArray(resp.answers)) {
      answers = resp.answers as { questionId: string; value: unknown }[];
    } else if (typeof resp.answers === "string") {
      try {
        answers = JSON.parse(resp.answers) as { questionId: string; value: unknown }[];
      } catch {
        answers = [];
      }
    }

    for (const a of answers) {
      const t = tallies[a.questionId];
      if (!t) continue;
      t.totalAnswered += 1;

      if (Array.isArray(a.value)) {
        for (const v of a.value) {
          const str = String(v);
          t.optionCounts[str] = (t.optionCounts[str] ?? 0) + 1;
        }
      } else if (typeof a.value === "string" && a.value.trim()) {
        const val = a.value.trim();
        if (t.optionCounts[val] !== undefined) {
          t.optionCounts[val] += 1;
        } else {
          t.textResponses.push(val);
        }
      }
    }
  }

  return Object.values(tallies);
}
