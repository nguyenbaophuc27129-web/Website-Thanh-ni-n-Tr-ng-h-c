import type {
  QuizAnswer, QuizDifficulty, QuizExam, QuizQuestion,
} from "@/types";

/**
 * Tiện ích thi trực tuyến — tất cả hàm thuần (pure), KHÔNG gọi ở lúc render
 * để tránh lệch hydration; chỉ gọi bên trong event handler.
 * Dùng chung trình duyệt + máy chủ: chấm điểm (isAnswerCorrect / autoScoreAnswer) và
 * chọn câu thích ứng chạy ở máy chủ (src/lib/server/public-quiz.ts) vì cần đáp án đúng.
 */

/** PRNG mulberry32 — sinh chuỗi số giả ngẫu nhiên tái lập được từ seed */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Trộn mảng với seed — kết quả giống nhau cho cùng seed */
export function shuffleWithSeed<T>(arr: readonly T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Sinh đề theo chuyên mục (topics) + ma trận độ khó — chọn ngẫu nhiên đúng số câu mỗi mức.
 * topics rỗng/không truyền = lấy cả ngân hàng. Trả về id câu hỏi; thiếu câu báo qua shortfall.
 */
export function pickExamQuestions(
  bank: QuizQuestion[],
  matrix: { easy: number; medium: number; hard: number },
  seed = Date.now(),
  topics?: string[]
): { ids: number[]; shortfall: number } {
  let shortfall = 0;
  const ids: number[] = [];
  const inScope = (q: QuizQuestion) => !topics?.length || topics.includes(q.topic);
  const take = (difficulty: QuizDifficulty, n: number) => {
    const pool = shuffleWithSeed(
      bank.filter((q) => q.difficulty === difficulty && inScope(q)),
      seed + difficulty.length * 7
    );
    if (pool.length < n) shortfall += n - pool.length;
    ids.push(...pool.slice(0, n).map((q) => q.id));
  };
  take("EASY", matrix.easy);
  take("MEDIUM", matrix.medium);
  take("HARD", matrix.hard);
  return { ids, shortfall };
}

export interface PaperItem {
  q: QuizQuestion;
  /**
   * Thứ tự hiển thị đáp án khi đề trộn đáp án: `perm[i]` = chỉ số GỐC của đáp án
   * đứng ở vị trí i. Câu trả lời luôn lưu theo chỉ số gốc (máy chủ chấm theo chỉ số gốc).
   * Không trộn → undefined.
   */
  perm?: number[];
}

const isChoiceType = (q: QuizQuestion) =>
  q.type === "MCQ_SINGLE" || q.type === "MCQ_MULTI" || q.type === "TRUE_FALSE";

/**
 * Dựng đề làm bài cho 1 thí sinh: đảo câu hỏi và/hoặc đảo đáp án theo seed.
 * Seed dùng `attempt.id * 1000 + exam.id` để mỗi lượt thi một đề khác nhau.
 * Không cần đáp án đúng (khách / đoàn viên không nhận correctIndexes) — chỉ đảo vị trí hiển thị.
 */
export function buildPaper(
  exam: QuizExam,
  bank: QuizQuestion[],
  seed: number
): PaperItem[] {
  const byId = new Map(bank.map((q) => [q.id, q]));
  let questions = exam.questionIds.map((id) => byId.get(id)).filter((q): q is QuizQuestion => !!q);
  if (exam.shuffleQuestions) questions = shuffleWithSeed(questions, seed);
  return questions.map((q) => {
    if (exam.shuffleOptions && isChoiceType(q) && q.options && q.options.length > 1) {
      return { q, perm: shuffleWithSeed(q.options.map((_, i) => i), seed + q.id) };
    }
    return { q };
  });
}

/**
 * Đúng/sai của 1 câu (chấm ở máy chủ — cần đáp án đúng trong DB).
 * Tự luận / tải tệp → null (chờ giám khảo chấm tay).
 */
export function isAnswerCorrect(q: QuizQuestion, a?: QuizAnswer): boolean | null {
  if (isChoiceType(q)) {
    const correct = [...new Set(q.correctIndexes ?? [])].sort((x, y) => x - y).join(",");
    const chosen = [...new Set(a?.selected ?? [])].sort((x, y) => x - y).join(",");
    return chosen !== "" && correct !== "" && chosen === correct;
  }
  if (q.type === "FILL") {
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
    return !!(a?.text && q.correctText && norm(a.text) === norm(q.correctText));
  }
  return null;
}

/** Chấm tự động 1 câu — tự luận/file trả 0, chờ giám khảo */
export function autoScoreAnswer(q: QuizQuestion, a?: QuizAnswer): number {
  return isAnswerCorrect(q, a) === true ? q.points : 0;
}

/** Ngưỡng "đã trả lời câu này" để hiện trạng thái trên lưới số câu */
export function isAnswered(q: QuizQuestion, a?: QuizAnswer): boolean {
  if (isChoiceType(q)) return (a?.selected?.length ?? 0) > 0;
  if (q.type === "FILE_UPLOAD") return !!a?.fileName;
  return !!a?.text?.trim();
}

/**
 * Adaptive: chọn câu tiếp theo theo đáp án gần nhất —
 * đúng → độ khó +1 bậc, sai → -1 bậc. Loại câu đã gặp; hết pool → null (hết đề).
 * Bắt đầu ở MEDIUM nếu có, không thì mức cao nhất còn lại.
 */
export function pickNextAdaptive(
  pools: Record<QuizDifficulty, QuizQuestion[]>,
  trail: { questionId: number; difficulty: QuizDifficulty; correct: boolean }[]
): QuizQuestion | null {
  const ORDER: QuizDifficulty[] = ["EASY", "MEDIUM", "HARD"];
  const used = new Set(trail.map((s) => s.questionId));
  const avail = (d: QuizDifficulty) => pools[d].filter((q) => !used.has(q.id));

  let target: QuizDifficulty = "MEDIUM";
  if (trail.length > 0) {
    const last = trail[trail.length - 1];
    const idx = ORDER.indexOf(last.difficulty);
    target = last.correct
      ? ORDER[Math.min(ORDER.length - 1, idx + 1)]
      : ORDER[Math.max(0, idx - 1)];
  }

  // Tìm từ mức mục tiêu mở rộng ra hai phía
  const ti = ORDER.indexOf(target);
  const tryOrder = [ORDER[ti], ...ORDER.filter((d) => d !== target)];
  for (const d of tryOrder) {
    const q = avail(d)[0];
    if (q) return q;
  }
  return null;
}
