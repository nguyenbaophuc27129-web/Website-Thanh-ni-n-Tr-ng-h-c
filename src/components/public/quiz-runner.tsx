"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Timer, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock3, Upload, Award, LogIn, AlertTriangle,
} from "lucide-react";
import type { AdaptiveStep, QuizAnswer, QuizDifficulty, QuizExam, QuizQuestion } from "@/types";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { autoScoreAnswer, buildPaper, isAnswered, pickNextAdaptive, type PaperItem } from "@/lib/quiz";
import { cn } from "@/lib/utils";

type Screen = "intro" | "running" | "done";

const DIFF_LABEL: Record<QuizDifficulty, string> = { EASY: "Dễ", MEDIUM: "Vừa", HARD: "Khó" };
const TYPE_LABEL: Record<QuizQuestion["type"], string> = {
  MCQ_SINGLE: "Một đáp án",
  MCQ_MULTI: "Nhiều đáp án",
  TRUE_FALSE: "Đúng / Sai",
  FILL: "Điền khuyết",
  SHORT_ANSWER: "Tự luận ngắn",
  LONG_ANSWER: "Tự luận",
  FILE_UPLOAD: "Tải minh chứng",
};

const mmss = (sec: number) =>
  `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

/**
 * Máy làm bài thi — 3 màn: chào → thi → kết quả.
 * Timer/shuffle/chấm điểm chỉ chạy trong event handler và effect có cleanup,
 * không tính toán ngẫu nhiên lúc render (tránh lệch hydration).
 */
export function QuizRunner({ exam }: { exam: QuizExam }) {
  const { quizQuestions, startQuizAttempt, submitQuizAttempt } = useStore();
  const { session } = useAuth();
  const { toast } = useToast();

  const [screen, setScreen] = useState<Screen>("intro");
  const [name, setName] = useState("");
  const [orgText, setOrgText] = useState("");
  const [attemptId, setAttemptId] = useState(0);
  const [paper, setPaper] = useState<PaperItem[]>([]);
  const [answers, setAnswers] = useState<Record<number, QuizAnswer>>({});
  const [trail, setTrail] = useState<AdaptiveStep[]>([]);
  const [current, setCurrent] = useState(0); // đề thường: index vào paper; adaptive: bỏ qua
  const [remaining, setRemaining] = useState(0); // giây còn lại
  const [result, setResult] = useState<{
    autoScore: number;
    maxScore: number;
    perQuestion: { q: QuizQuestion; pts: number }[];
  } | null>(null);

  // Adaptive: câu hiện tại (state — ref không gây re-render)
  const [adaptiveQ, setAdaptiveQ] = useState<QuizQuestion | null>(null);
  const finishedRef = useRef(false);

  // Đăng nhập → tự điền thí sinh
  useEffect(() => {
    if (session) {
      setName(session.contactPerson);
      setOrgText(session.orgUnitName);
    }
  }, [session]);

  /* ===== Đồng hồ đếm ngược — cleanup clearInterval khi rời màn running ===== */
  useEffect(() => {
    if (screen !== "running") return;
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [screen]);

  /* ===== Hết giờ → tự động nộp (guard 1 lần bằng finishedRef) ===== */
  useEffect(() => {
    if (screen === "running" && remaining === 0 && paper.length + trail.length > 0) {
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, screen]);

  const start = () => {
    if (name.trim().length < 2) {
      toast("Vui lòng nhập họ tên thí sinh.", "warning");
      return;
    }
    const id = startQuizAttempt(exam.id, { name, orgText: orgText || "—", accountId: session?.accountId });
    const seed = id * 1000 + exam.id;
    const built = buildPaper(exam, quizQuestions, seed);
    finishedRef.current = false;
    setAttemptId(id);
    setRemaining(exam.durationMinutes * 60);
    setAnswers({});
    setTrail([]);
    setResult(null);
    if (exam.adaptive) {
      const pools: Record<QuizDifficulty, QuizQuestion[]> = {
        EASY: quizQuestions.filter((q) => exam.questionIds.includes(q.id) && q.difficulty === "EASY"),
        MEDIUM: quizQuestions.filter((q) => exam.questionIds.includes(q.id) && q.difficulty === "MEDIUM"),
        HARD: quizQuestions.filter((q) => exam.questionIds.includes(q.id) && q.difficulty === "HARD"),
      };
      const first = pickNextAdaptive(pools, []);
      setAdaptiveQ(first);
      setPaper(built); // đề gốc (dự phòng hiển thị số câu tối đa)
      if (!first) {
        toast("Đề thi chưa có câu hỏi hợp lệ — vui lòng liên hệ Ban Biên tập.", "warning");
        return;
      }
      setCurrent(0);
    } else {
      setPaper(built);
      setCurrent(0);
    }
    setScreen("running");
  };

  /** Nộp bài — chấm tự động các câu trắc nghiệm/điền, tự luận chờ giám khảo */
  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    let autoScore = 0;
    let maxScore = 0;
    const asked: PaperItem[] = exam.adaptive
      ? trail.map((s) => {
          const q = quizQuestions.find((x) => x.id === s.questionId);
          return q ? { q } : null;
        }).filter((x): x is PaperItem => !!x)
      : paper;
    const perQuestion = asked.map(({ q }) => {
      const pts = autoScoreAnswer(q, answers[q.id]);
      autoScore += pts;
      maxScore += q.points;
      return { q, pts };
    });
    submitQuizAttempt(attemptId, answers, autoScore, maxScore, exam.adaptive ? trail : undefined);
    setResult({ autoScore, maxScore, perQuestion });
    setScreen("done");
  };

  /* ===== Adaptive: trả lời → ghi trail → chọn câu kế tiếp ===== */
  const nextAdaptive = () => {
    const q = adaptiveQ;
    if (!q) return;
    const pools: Record<QuizDifficulty, QuizQuestion[]> = {
      EASY: quizQuestions.filter((x) => exam.questionIds.includes(x.id) && x.difficulty === "EASY"),
      MEDIUM: quizQuestions.filter((x) => exam.questionIds.includes(x.id) && x.difficulty === "MEDIUM"),
      HARD: quizQuestions.filter((x) => exam.questionIds.includes(x.id) && x.difficulty === "HARD"),
    };
    const step: AdaptiveStep = {
      questionId: q.id,
      difficulty: q.difficulty,
      correct: isChoiceCorrect(q, answers[q.id]),
    };
    const nextTrail = [...trail, step];
    setTrail(nextTrail);
    const next = pickNextAdaptive(pools, nextTrail);
    setAdaptiveQ(next);
    setCurrent((c) => c + 1);
    if (!next) finish();
  };

  const isChoiceCorrect = (q: QuizQuestion, a?: QuizAnswer): boolean => {
    const correct = [...(q.correctIndexes ?? [])].sort().join(",");
    const chosen = [...(a?.selected ?? [])].sort().join(",");
    return chosen !== "" && chosen === correct;
  };

  /* ================= MÀN 1: CHÀO ================= */
  if (screen === "intro") {
    return (
      <div className="mx-auto max-w-xl px-4 py-14">
        <div className="rounded-3xl bg-white p-7 shadow-[0_8px_30px_rgb(15,23,42,0.06)] ring-1 ring-slate-200">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700">
            <Award className="h-3.5 w-3.5" /> {exam.code}
          </span>
          <h1 className="mt-3 text-xl font-bold leading-snug text-stone-900">{exam.title}</h1>
          {exam.description ? (
            <p className="mt-2 text-sm leading-relaxed text-stone-500">{exam.description}</p>
          ) : null}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-stone-50 px-2 py-3">
              <p className="text-lg font-black text-stone-900">{exam.durationMinutes}&apos;</p>
              <p className="text-[11px] text-stone-500">Thời gian</p>
            </div>
            <div className="rounded-xl bg-stone-50 px-2 py-3">
              <p className="text-lg font-black text-stone-900">
                {exam.adaptive ? "6" : exam.questionIds.length}
              </p>
              <p className="text-[11px] text-stone-500">{exam.adaptive ? "Câu thích ứng" : "Câu hỏi"}</p>
            </div>
            <div className="rounded-xl bg-stone-50 px-2 py-3">
              <p className="text-lg font-black text-stone-900">
                {exam.adaptive ? "Thông minh" : exam.shuffleQuestions ? "Trộn đề" : "Cố định"}
              </p>
              <p className="text-[11px] text-stone-500">Cơ chế đề</p>
            </div>
          </div>
          {exam.adaptive ? (
            <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-[11px] leading-relaxed text-sky-700">
              Đề thích ứng: trả lời đúng → câu khó hơn, sai → câu dễ hơn. Bạn làm đến khi hết câu phù hợp hoặc hết giờ.
            </p>
          ) : null}
          <div className="mt-5 space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-600">Họ tên thí sinh *</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="VD: Nguyễn Văn A"
                className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-600">Trường / đơn vị</span>
              <input
                value={orgText}
                onChange={(e) => setOrgText(e.target.value)}
                placeholder="VD: THPT Chánh Phú Hưng"
                className="mt-1 w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
              />
            </label>
            {session ? (
              <p className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Đã đăng nhập — kết quả sẽ gắn vào tài khoản của bạn.
              </p>
            ) : (
              <p className="inline-flex items-center gap-1.5 text-[11px] text-stone-400">
                <LogIn className="h-3.5 w-3.5" /> Khách vãng lai —{" "}
                <a href="/dang-nhap" className="text-blue-600 hover:underline">đăng nhập</a>{" "}
                để lưu kết quả vào tài khoản.
              </p>
            )}
            <button
              type="button"
              onClick={start}
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl"
            >
              Vào thi ngay
            </button>
            <p className="text-center text-[11px] text-stone-400">
              Bấm &quot;Vào thi ngay&quot; là đồng hồ bắt đầu chạy — hết giờ hệ thống tự nộp bài.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ================= MÀN 3: KẾT QUẢ ================= */
  if (screen === "done" && result) {
    const essayCount = result.perQuestion.filter(
      (x) => !["MCQ_SINGLE", "MCQ_MULTI", "TRUE_FALSE", "FILL"].includes(x.q.type)
    ).length;
    return (
      <div className="mx-auto max-w-2xl px-4 py-14">
        <div className="rounded-3xl bg-white p-7 text-center shadow-[0_8px_30px_rgb(15,23,42,0.06)] ring-1 ring-slate-200">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
            <Award className="h-7 w-7" />
          </span>
          <h1 className="mt-3 text-xl font-bold text-stone-900">Đã nộp bài thành công!</h1>
          <p className="mt-1 text-sm text-stone-500">
            {name} · {orgText} · {exam.code}
          </p>
          <div className="mt-5 flex items-center justify-center gap-6">
            <div>
              <p className="text-4xl font-black text-emerald-600">
                {result.autoScore}
                <span className="text-lg text-stone-400">/{result.maxScore}</span>
              </p>
              <p className="text-[11px] text-stone-500">Điểm tự động</p>
            </div>
            {essayCount > 0 ? (
              <div>
                <p className="text-4xl font-black text-amber-500">{essayCount}</p>
                <p className="text-[11px] text-stone-500">Câu chờ giám khảo chấm</p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgb(15,23,42,0.04)] ring-1 ring-slate-200">
          <p className="border-b border-stone-100 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-stone-400">
            Kết quả từng câu
          </p>
          <ul className="divide-y divide-stone-100">
            {result.perQuestion.map(({ q, pts }, i) => {
              const isEssay = !["MCQ_SINGLE", "MCQ_MULTI", "TRUE_FALSE", "FILL"].includes(q.type);
              return (
                <li key={q.id} className="flex items-start gap-3 px-5 py-3">
                  {isEssay ? (
                    <Clock3 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-amber-500" />
                  ) : pts > 0 ? (
                    <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="mt-0.5 h-4.5 w-4.5 shrink-0 text-red-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug text-stone-800">
                      Câu {i + 1}. {q.stem}
                    </p>
                    <p className="mt-0.5 text-[11px] text-stone-400">
                      {TYPE_LABEL[q.type]} · {DIFF_LABEL[q.difficulty]}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold",
                      isEssay ? "bg-amber-50 text-amber-600" : pts > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                    )}
                  >
                    {isEssay ? "Chờ giám khảo chấm" : `${pts}/${q.points} điểm`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <a
            href="/thi-kien-thuc"
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Về danh sách kỳ thi
          </a>
          <a
            href="/"
            className="rounded-xl border border-stone-200 px-5 py-2.5 text-sm font-semibold text-stone-600 hover:bg-stone-50"
          >
            Về trang chủ
          </a>
        </div>
      </div>
    );
  }

  /* ================= MÀN 2: THI ================= */
  const q = exam.adaptive ? adaptiveQ : paper[current]?.q;
  if (!q) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center text-sm text-stone-500">
        <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
        <p className="mt-3">Không tải được câu hỏi của kỳ thi này.</p>
      </div>
    );
  }
  const answer = answers[q.id] ?? {};
  const setAnswer = (patch: Partial<QuizAnswer>) =>
    setAnswers((prev) => ({ ...prev, [q.id]: { ...prev[q.id], ...patch } }));
  const toggleChoice = (idx: number, multi: boolean) => {
    const sel = answer.selected ?? [];
    if (multi) {
      setAnswer({ selected: sel.includes(idx) ? sel.filter((i) => i !== idx) : [...sel, idx] });
    } else {
      setAnswer({ selected: [idx] });
    }
  };
  const totalAsked = exam.adaptive ? trail.length + 1 : paper.length;
  const answeredCount = exam.adaptive
    ? trail.length
    : paper.filter(({ q: pq }) => isAnswered(pq, answers[pq.id])).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* ===== Thanh trạng thái ===== */}
      <div className="sticky top-20 z-30 flex items-center gap-3 rounded-2xl bg-white/90 px-5 py-3 shadow-md ring-1 ring-slate-200 backdrop-blur">
        <span className="hidden min-w-0 flex-1 truncate text-sm font-semibold text-stone-800 sm:block">{exam.title}</span>
        <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-500">
          Câu {exam.adaptive ? trail.length + 1 : current + 1}/{exam.adaptive ? "?" : paper.length} · đã trả lời {answeredCount}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-sm font-bold",
            remaining < 60 ? "animate-pulse bg-red-50 text-red-600" : "bg-blue-50 text-blue-700"
          )}
        >
          <Timer className="h-4 w-4" /> {mmss(remaining)}
        </span>
        <button
          type="button"
          onClick={finish}
          className="rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-700"
        >
          Nộp bài
        </button>
      </div>

      {/* ===== Thẻ câu hỏi ===== */}
      <div className="mt-6 rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(15,23,42,0.06)] ring-1 ring-slate-200 sm:p-8">
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
          <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{TYPE_LABEL[q.type]}</span>
          <span
            className={cn(
              "rounded-full px-2.5 py-1",
              q.difficulty === "EASY" ? "bg-emerald-50 text-emerald-600"
                : q.difficulty === "MEDIUM" ? "bg-amber-50 text-amber-600"
                : "bg-red-50 text-red-600"
            )}
          >
            {DIFF_LABEL[q.difficulty]}
          </span>
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-stone-500">{q.topic}</span>
          <span className="ml-auto text-stone-400">{q.points} điểm</span>
        </div>
        <p className="mt-4 text-[15px] font-semibold leading-relaxed text-stone-900">{q.stem}</p>

        {/* --- Trắc nghiệm 1 đáp án + Đúng/Sai --- */}
        {(q.type === "MCQ_SINGLE" || q.type === "TRUE_FALSE") && q.options ? (
          <div className="mt-5 space-y-2.5">
            {q.options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => toggleChoice(idx, false)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all",
                  answer.selected?.includes(idx)
                    ? "border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20"
                    : "border-stone-200 hover:border-blue-300 hover:bg-blue-50/40"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                    answer.selected?.includes(idx) ? "border-blue-600 bg-blue-600" : "border-stone-300"
                  )}
                >
                  {answer.selected?.includes(idx) ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
                </span>
                {opt}
              </button>
            ))}
          </div>
        ) : null}

        {/* --- Trắc nghiệm nhiều đáp án --- */}
        {q.type === "MCQ_MULTI" && q.options ? (
          <div className="mt-5 space-y-2.5">
            <p className="text-[11px] text-stone-400">Chọn tất cả đáp án đúng.</p>
            {q.options.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => toggleChoice(idx, true)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all",
                  answer.selected?.includes(idx)
                    ? "border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/20"
                    : "border-stone-200 hover:border-blue-300 hover:bg-blue-50/40"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2",
                    answer.selected?.includes(idx) ? "border-blue-600 bg-blue-600 text-white" : "border-stone-300"
                  )}
                >
                  {answer.selected?.includes(idx) ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
                </span>
                {opt}
              </button>
            ))}
          </div>
        ) : null}

        {/* --- Điền khuyết --- */}
        {q.type === "FILL" ? (
          <input
            value={answer.text ?? ""}
            onChange={(e) => setAnswer({ text: e.target.value })}
            placeholder="Nhập đáp án…"
            className="mt-5 w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
          />
        ) : null}

        {/* --- Tự luận ngắn / dài --- */}
        {(q.type === "SHORT_ANSWER" || q.type === "LONG_ANSWER") ? (
          <textarea
            value={answer.text ?? ""}
            onChange={(e) => setAnswer({ text: e.target.value })}
            rows={q.type === "LONG_ANSWER" ? 7 : 3}
            placeholder="Trình bày ý kiến của bạn…"
            className="mt-5 w-full rounded-xl border border-stone-300 px-4 py-3 text-sm leading-relaxed outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15"
          />
        ) : null}

        {/* --- Tải file --- */}
        {q.type === "FILE_UPLOAD" ? (
          <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 px-4 py-6 text-sm text-stone-500 hover:border-blue-400 hover:text-blue-600">
            <Upload className="h-4 w-4" />
            {answer.fileName ? `Đã chọn: ${answer.fileName}` : "Chọn tệp minh chứng (tên tệp được ghi nhận cho demo)"}
            <input
              type="file"
              className="hidden"
              onChange={(e) => setAnswer({ fileName: e.target.files?.[0]?.name })}
            />
          </label>
        ) : null}

        {/* ===== Điều hướng ===== */}
        <div className="mt-7 flex items-center justify-between gap-3 border-t border-stone-100 pt-5">
          {!exam.adaptive ? (
            <button
              type="button"
              disabled={current === 0}
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              className="inline-flex items-center gap-1 rounded-xl border border-stone-200 px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Câu trước
            </button>
          ) : (
            <span className="text-[11px] leading-relaxed text-stone-400">
              Đề thích ứng — không thể quay lại câu trước
            </span>
          )}

          {!exam.adaptive ? (
            current < paper.length - 1 ? (
              <button
                type="button"
                onClick={() => setCurrent((c) => Math.min(paper.length - 1, c + 1))}
                className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Câu tiếp <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={finish}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700"
              >
                Nộp bài
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={nextAdaptive}
              className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Câu tiếp theo <ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* --- Lưới số câu (đề thường) --- */}
        {!exam.adaptive && paper.length > 1 ? (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {paper.map(({ q: pq }, i) => (
              <button
                key={pq.id}
                type="button"
                onClick={() => setCurrent(i)}
                className={cn(
                  "h-7 w-7 rounded-lg text-[11px] font-bold transition-colors",
                  i === current ? "bg-slate-900 text-white"
                    : isAnswered(pq, answers[pq.id]) ? "bg-emerald-100 text-emerald-700"
                    : "bg-stone-100 text-stone-400 hover:bg-stone-200"
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <p className="mt-4 text-center text-[11px] text-stone-400">
        Thí sinh: <b className="text-stone-600">{name}</b> · {orgText} · bài thi tự nộp khi hết giờ ·
        {totalAsked > 0 ? ` đã gặp ${totalAsked} câu` : ""}
      </p>
    </div>
  );
}
