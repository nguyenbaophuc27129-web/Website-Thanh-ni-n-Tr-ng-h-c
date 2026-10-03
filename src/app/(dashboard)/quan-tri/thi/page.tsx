"use client";

import { useMemo, useState } from "react";
import {
  ShieldAlert, Plus, Wand2, Timer, ListChecks, Shuffle, Sparkles, Play, Square,
  ClipboardCheck, MonitorPlay, FileUp,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { TableWrap, THead, Th, Tr, Td, EmptyRow } from "@/components/ui/table";
import { pickExamQuestions } from "@/lib/quiz";
import { quizQuestions as quizBank } from "@/data/quiz-bank";
import { formatDateTime } from "@/lib/utils";
import type { QuizDifficulty, QuizQuestionType } from "@/types";

const DIFF_LABEL: Record<QuizDifficulty, string> = { EASY: "Dễ", MEDIUM: "Vừa", HARD: "Khó" };
const DIFF_TONE: Record<QuizDifficulty, "green" | "yellow" | "red"> = { EASY: "green", MEDIUM: "yellow", HARD: "red" };
const TYPE_LABEL: Record<QuizQuestionType, string> = {
  MCQ_SINGLE: "Một đáp án",
  MCQ_MULTI: "Nhiều đáp án",
  TRUE_FALSE: "Đúng / Sai",
  FILL: "Điền khuyết",
  SHORT_ANSWER: "Tự luận ngắn",
  LONG_ANSWER: "Tự luận dài",
  FILE_UPLOAD: "Nộp tệp",
};
/** Các loại câu hỏi máy không chấm được — cần giám khảo chấm tay */
const isEssay = (t: QuizQuestionType) => t === "SHORT_ANSWER" || t === "LONG_ANSWER" || t === "FILE_UPLOAD";

/** Danh sách chuyên mục trong ngân hàng câu hỏi — sắp xếp alphabet tiếng Việt */
const TOPIC_LIST = Array.from(new Set(quizBank.map((q) => q.topic))).sort((a, b) => a.localeCompare(b, "vi"));

type View = "EXAMS" | "ATTEMPTS";

export default function ThiAdminPage() {
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();
  const [view, setView] = useState<View>("EXAMS");

  // ===== Form tạo kỳ thi =====
  const nextCode = () => {
    let max = 0;
    for (const e of store.quizExams) {
      const m = /-(\d+)$/.exec(e.code);
      if (m) max = Math.max(max, Number(m[1]));
    }
    return `KT-2026-${String(max + 1).padStart(3, "0")}`;
  };
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState(() => nextCode());
  const [duration, setDuration] = useState(15);
  const [shuffleQ, setShuffleQ] = useState(true);
  const [shuffleO, setShuffleO] = useState(false);
  const [adaptive, setAdaptive] = useState(false);
  const [matrix, setMatrix] = useState<Record<QuizDifficulty, number>>({ EASY: 2, MEDIUM: 2, HARD: 2 });
  const [topics, setTopics] = useState<string[]>([]);
  const [picked, setPicked] = useState<number[] | null>(null);
  const [shortfall, setShortfall] = useState(0);

  /** Ngân hàng thu hẹp theo chuyên mục đang chọn (rỗng = tất cả) */
  const scopedBank = useMemo(
    () => store.quizQuestions.filter((q) => !topics.length || topics.includes(q.topic)),
    [store.quizQuestions, topics]
  );

  // ===== Chấm tay =====
  const [gradingId, setGradingId] = useState<number | null>(null);
  const [gradeInputs, setGradeInputs] = useState<Record<number, number>>({});

  if (!session || (session.role !== "QUAN_TRI_TW" && session.role !== "QUAN_TRI_TINH" && session.role !== "QUAN_TRI_CAP3" && session.role !== "DON_VI")) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center py-16 text-center">
          <ShieldAlert className="h-10 w-10 text-stone-300" />
          <p className="mt-3 text-sm font-semibold text-stone-700">Trang này dành cho cán bộ Đoàn</p>
          <p className="mt-1 text-xs text-stone-400">Chỉ cán bộ các cấp tạo kỳ thi và chấm bài; đoàn viên thi tại chuyên trang công khai.</p>
        </CardBody>
      </Card>
    );
  }

  const generate = () => {
    const r = pickExamQuestions(
      store.quizQuestions,
      { easy: matrix.EASY, medium: matrix.MEDIUM, hard: matrix.HARD },
      Date.now(),
      topics.length ? topics : undefined
    );
    setPicked(r.ids);
    setShortfall(r.shortfall);
    if (r.shortfall > 0) {
      toast(
        `Chuyên mục "${topics.join(", ") || "Tất cả"}" chưa đủ câu — thiếu ${r.shortfall} câu so với ma trận.`,
        "warning"
      );
    } else {
      toast(`Đã sinh đề ${r.ids.length} câu từ ${topics.length ? `chuyên mục ${topics.join(", ")}` : "toàn bộ ngân hàng"}.`, "success");
    }
  };

  const saveExam = () => {
    if (title.trim().length < 6) {
      toast("Tên kỳ thi tối thiểu 6 ký tự.", "warning");
      return;
    }
    if (!picked || picked.length === 0) {
      toast("Bấm “Sinh đề từ ngân hàng” trước khi lưu.", "warning");
      return;
    }
    if (shortfall > 0) {
      toast("Vẫn thiếu câu so với ma trận — giảm số lượng rồi sinh lại.", "warning");
      return;
    }
    store.saveQuizExam(
      session,
      {
        code: code.trim(),
        title: title.trim(),
        description: description.trim() || undefined,
        durationMinutes: duration,
        shuffleQuestions: shuffleQ,
        shuffleOptions: shuffleO,
        adaptive,
        topics: topics.length ? topics : undefined,
        status: "OPEN",
      },
      picked
    );
    toast(`Đã mở kỳ thi ${code} — thí sinh vào thi tại /thi-kien-thuc/${code}.`, "success");
    setTitle(""); setDescription(""); setPicked(null); setShortfall(0);
    setTopics([]);
    setCode(nextCode());
  };

  const toggleStatus = (id: number, status: string) => {
    store.setQuizExamStatus(id, status === "OPEN" ? "CLOSED" : "OPEN");
    toast(status === "OPEN" ? "Đã đóng kỳ thi — thí sinh không vào được nữa." : "Đã mở kỳ thi — mã kỳ thi có hiệu lực.", "info");
  };

  const pickedQuestions = useMemo(
    () => (picked ? picked.map((id) => store.quizQuestions.find((q) => q.id === id)).filter((q) => q !== undefined) : []),
    [picked, store.quizQuestions]
  );

  const attemptsNeedingGrade = store.quizAttempts.filter(
    (a) => a.status === "SUBMITTED" && store.quizQuestions.some((q) => isEssay(q.type) && a.answers[q.id])
  );

  const openGrading = (attemptId: number) => {
    const a = store.quizAttempts.find((x) => x.id === attemptId);
    if (!a) return;
    const init: Record<number, number> = {};
    for (const q of store.quizQuestions) {
      if (isEssay(q.type) && a.answers[q.id]) init[q.id] = 0;
    }
    setGradeInputs(init);
    setGradingId(attemptId);
  };

  const gradingAttempt = gradingId !== null ? store.quizAttempts.find((x) => x.id === gradingId) : undefined;
  const gradingEssays = useMemo(() => {
    if (!gradingAttempt) return [];
    return store.quizQuestions.filter((q) => isEssay(q.type) && gradingAttempt.answers[q.id]);
  }, [gradingAttempt, store.quizQuestions]);
  const gradingTotal = Object.values(gradeInputs).reduce((s, v) => s + (Number(v) || 0), 0);

  const saveGrades = () => {
    if (!gradingAttempt) return;
    for (const q of gradingEssays) {
      const v = Number(gradeInputs[q.id]) || 0;
      if (v < 0 || v > q.points) {
        toast(`Điểm câu "${q.stem.slice(0, 24)}…" phải từ 0 đến ${q.points}.`, "warning");
        return;
      }
    }
    store.gradeQuizAttempt(session, gradingAttempt.id, gradingTotal);
    toast(`Đã chấm xong — thí sinh nhận tổng ${gradingAttempt.autoScore + gradingTotal}/${gradingAttempt.maxScore} điểm.`, "success");
    setGradingId(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif-display text-xl font-bold text-stone-900">Thi kiến thức trực tuyến</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Sinh đề từ ngân hàng câu hỏi, mở kỳ thi theo mã — máy chấm tự động phần trắc nghiệm, giám khảo chấm tay phần tự luận.
        </p>
      </div>

      <Tabs
        value={view}
        onChange={setView}
        tabs={[
          { value: "EXAMS", label: "Kỳ thi", count: store.quizExams.length },
          { value: "ATTEMPTS", label: "Bài thi & chấm", count: store.quizAttempts.length },
        ]}
      />

      {view === "EXAMS" ? (
        <>
          {/* ===== Form tạo kỳ thi ===== */}
          <Card>
            <CardBody className="space-y-4">
              <p className="inline-flex items-center gap-2 text-sm font-bold text-stone-900">
                <Plus className="h-4 w-4 text-doan-600" /> Tạo kỳ thi mới
              </p>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Tên kỳ thi" required className="sm:col-span-2" hint="Hiển thị công khai cho thí sinh">
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="VD: Thi tìm hiểu An toàn giao thông 2026" />
                </Field>
                <Field label="Mã kỳ thi" hint="Thí sinh truy cập /thi-kien-thuc/<mã>">
                  <Input value={code} onChange={(e) => setCode(e.target.value)} className="font-mono" />
                </Field>
                <Field label="Thời lượng (phút)">
                  <Input type="number" min={1} max={180} value={duration} onChange={(e) => setDuration(Math.max(1, Number(e.target.value) || 15))} />
                </Field>
                <Field label="Mô tả ngắn (không bắt buộc)" className="sm:col-span-2">
                  <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Nêu phạm vi nội dung, đối tượng dự thi…" />
                </Field>
              </div>

              <div className="flex flex-wrap gap-4 rounded-xl bg-stone-50 px-4 py-3">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-stone-700">
                  <input type="checkbox" checked={shuffleQ} onChange={(e) => setShuffleQ(e.target.checked)} className="h-4 w-4 accent-doan-600" /> Đảo thứ tự câu hỏi
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-stone-700">
                  <input type="checkbox" checked={shuffleO} onChange={(e) => setShuffleO(e.target.checked)} className="h-4 w-4 accent-doan-600" /> Đảo thứ tự đáp án
                </label>
                <label className="inline-flex items-center gap-2 text-xs font-medium text-stone-700">
                  <input type="checkbox" checked={adaptive} onChange={(e) => setAdaptive(e.target.checked)} className="h-4 w-4 accent-doan-600" /> Đề thích ứng (đúng → khó hơn, sai → dễ hơn)
                </label>
              </div>

              {/* Ma trận độ khó */}
              <div>
                <p className="text-xs font-semibold text-stone-600">Ma trận đề — số câu mỗi mức độ khó</p>
                <div className="mt-2 grid max-w-md grid-cols-3 gap-3">
                  {(["EASY", "MEDIUM", "HARD"] as QuizDifficulty[]).map((d) => (
                    <Field key={d} label={`Số câu mức ${DIFF_LABEL[d]}`}>
                      <Input
                        type="number" min={0} max={20}
                        value={matrix[d]}
                        onChange={(e) => setMatrix({ ...matrix, [d]: Math.max(0, Number(e.target.value) || 0) })}
                      />
                    </Field>
                  ))}
                </div>
              </div>

              {/* Chuyên mục nội dung câu hỏi */}
              <div>
                <p className="text-xs font-semibold text-stone-600">
                  Nhóm nội dung câu hỏi{" "}
                  <span className="font-normal text-stone-400">— bỏ chọn hết để lấy tất cả chuyên mục</span>
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {TOPIC_LIST.map((t) => {
                    const on = topics.includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTopics(on ? topics.filter((x) => x !== t) : [...topics, t])}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                          on
                            ? "bg-doan-600 text-white shadow-md shadow-doan-600/20"
                            : "bg-stone-100 text-stone-500 hover:bg-stone-200 hover:text-stone-700"
                        }`}
                      >
                        {t}
                      </button>
                    );
                  })}
                  <span className="self-center text-[11px] text-stone-400">
                    Đang chọn: {topics.length ? topics.join(", ") : "Tất cả chuyên mục"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={generate}>
                  <Wand2 className="h-4 w-4" /> Sinh đề từ ngân hàng
                </Button>
                <Button onClick={saveExam} disabled={!picked || shortfall > 0}>
                  <Play className="h-4 w-4" /> Lưu &amp; mở thi
                </Button>
                <span className="text-[11px] text-stone-400">
                  Ngân hàng khả dụng {scopedBank.length}/{store.quizQuestions.length} câu
                  {topics.length ? ` (chuyên mục ${topics.join(", ")})` : " (tất cả chuyên mục)"} — Dễ {scopedBank.filter((q) => q.difficulty === "EASY").length} · Vừa {scopedBank.filter((q) => q.difficulty === "MEDIUM").length} · Khó {scopedBank.filter((q) => q.difficulty === "HARD").length}
                </span>
              </div>

              {shortfall > 0 ? (
                <p className="rounded-lg bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
                  Thiếu {shortfall} câu trong chuyên mục đang chọn ({topics.join(", ") || "Tất cả chuyên mục"}) so với ma trận — giảm số lượng, bỏ bớt chuyên mục hoặc bổ sung câu hỏi rồi bấm “Sinh đề” lại.
                </p>
              ) : null}

              {pickedQuestions.length > 0 ? (
                <div className="rounded-xl border border-stone-100">
                  <p className="border-b border-stone-100 px-4 py-2.5 text-xs font-bold text-stone-700">
                    Xem trước đề ({pickedQuestions.length} câu · tổng {pickedQuestions.reduce((s, q) => s + q.points, 0)} điểm)
                  </p>
                  <ul className="divide-y divide-stone-50">
                    {pickedQuestions.map((q, i) => (
                      <li key={q.id} className="flex items-center gap-3 px-4 py-2 text-xs">
                        <span className="w-6 shrink-0 text-stone-400">{i + 1}.</span>
                        <span className="min-w-0 flex-1 truncate text-stone-700">{q.stem}</span>
                        <Badge tone={DIFF_TONE[q.difficulty]}>{DIFF_LABEL[q.difficulty]}</Badge>
                        <span className="hidden w-24 shrink-0 text-right text-stone-400 sm:block">{TYPE_LABEL[q.type]}</span>
                        <span className="w-10 shrink-0 text-right font-bold text-stone-600">{q.points}đ</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardBody>
          </Card>

          {/* ===== Bảng kỳ thi ===== */}
          <Card>
            <CardBody className="p-0">
              <TableWrap>
                <THead>
                  <Th>Mã</Th>
                  <Th>Tên kỳ thi</Th>
                  <Th>Thời lượng</Th>
                  <Th>Số câu</Th>
                  <Th>Tùy chọn</Th>
                  <Th>Trạng thái</Th>
                  <Th className="text-right">Thao tác</Th>
                </THead>
                <tbody>
                  {store.quizExams.length === 0 ? <EmptyRow colSpan={7} /> : null}
                  {store.quizExams.map((e) => (
                    <Tr key={e.id}>
                      <Td><span className="rounded-md bg-stone-900 px-2 py-0.5 font-mono text-[11px] font-bold text-white">{e.code}</span></Td>
                      <Td>
                        <p className="max-w-64 truncate font-semibold text-stone-800">{e.title}</p>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {e.adaptive ? <Badge tone="purple"><Sparkles className="h-3 w-3" /> Thích ứng</Badge> : null}
                          {(e.topics?.length ? e.topics : []).map((t) => (
                            <Badge key={t} tone="blue">{t}</Badge>
                          ))}
                          {!e.topics?.length ? <Badge tone="gray">Tất cả chuyên mục</Badge> : null}
                        </div>
                      </Td>
                      <Td className="text-xs"><Timer className="mr-1 inline h-3.5 w-3.5 text-orange-500" />{e.durationMinutes} phút</Td>
                      <Td className="text-xs">{e.questionIds.length} câu</Td>
                      <Td className="text-xs text-stone-500">
                        {[e.shuffleQuestions ? "Đảo câu" : null, e.shuffleOptions ? "Đảo đáp án" : null].filter(Boolean).join(" · ") || "—"}
                      </Td>
                      <Td>
                        {e.status === "OPEN" ? <Badge tone="green">Đang mở</Badge>
                          : e.status === "CLOSED" ? <Badge tone="gray">Đã đóng</Badge>
                          : <Badge tone="yellow">Nháp</Badge>}
                      </Td>
                      <Td className="text-right">
                        {e.status === "OPEN" ? (
                          <Button size="sm" variant="outline" onClick={() => toggleStatus(e.id, "OPEN")}>
                            <Square className="h-3.5 w-3.5" /> Đóng thi
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => toggleStatus(e.id, "CLOSED")}>
                            <Play className="h-3.5 w-3.5" /> Mở lại
                          </Button>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </TableWrap>
            </CardBody>
          </Card>
        </>
      ) : (
        /* ===== Bảng bài thi ===== */
        <Card>
          <CardBody className="p-0">
            <div className="border-b border-stone-100 px-5 py-3">
              <p className="inline-flex items-center gap-2 text-xs font-bold text-stone-600">
                <MonitorPlay className="h-3.5 w-3.5 text-doan-600" /> {store.quizAttempts.length} lượt thi ·{" "}
                <span className="text-amber-600">{attemptsNeedingGrade.length} bài chờ chấm tự luận</span>
              </p>
            </div>
            <TableWrap>
              <THead>
                <Th>Thí sinh</Th>
                <Th>Kỳ thi</Th>
                <Th>Nộp lúc</Th>
                <Th>Điểm</Th>
                <Th>Trạng thái</Th>
                <Th className="text-right">Chấm</Th>
              </THead>
              <tbody>
                {store.quizAttempts.length === 0 ? <EmptyRow colSpan={6} /> : null}
                {store.quizAttempts.map((a) => {
                  const exam = store.quizExams.find((e) => e.id === a.examId);
                  const needGrade = a.status === "SUBMITTED" && store.quizQuestions.some((q) => isEssay(q.type) && a.answers[q.id]);
                  const total = a.manualPoints !== undefined ? a.autoScore + a.manualPoints : a.autoScore;
                  return (
                    <Tr key={a.id}>
                      <Td>
                        <p className="font-semibold text-stone-800">{a.examineeName}</p>
                        <p className="text-[11px] text-stone-400">{a.examineeOrgText}{a.accountId ? " · đoàn viên" : " · khách"}</p>
                      </Td>
                      <Td className="text-xs">
                        <span className="font-mono text-stone-500">{exam?.code}</span>
                        <p className="max-w-52 truncate text-stone-700">{exam?.title}</p>
                      </Td>
                      <Td className="text-xs text-stone-500">{a.submittedAt ? formatDateTime(a.submittedAt) : "—"}</Td>
                      <Td>
                        <span className="text-base font-black text-stone-900">
                          {total}<span className="text-xs font-medium text-stone-400">/{a.maxScore}</span>
                        </span>
                        {a.manualPoints !== undefined ? <p className="text-[10px] text-stone-400">máy {a.autoScore} + tay {a.manualPoints}</p> : null}
                      </Td>
                      <Td>
                        {a.status === "GRADED" ? <Badge tone="green">Đã chấm xong</Badge>
                          : a.status === "SUBMITTED" ? <Badge tone="yellow">{needGrade ? "Chờ chấm tay" : "Đã nộp"}</Badge>
                          : <Badge tone="blue">Đang làm</Badge>}
                      </Td>
                      <Td className="text-right">
                        {needGrade ? (
                          <Button size="sm" onClick={() => openGrading(a.id)}>
                            <ClipboardCheck className="h-3.5 w-3.5" /> Chấm tay
                          </Button>
                        ) : (
                          <span className="text-xs text-stone-300">—</span>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </TableWrap>
          </CardBody>
        </Card>
      )}

      {/* ===== Modal chấm tay ===== */}
      <Modal
        open={gradingAttempt !== undefined}
        onClose={() => setGradingId(null)}
        wide
        title={gradingAttempt ? `Chấm tự luận — ${gradingAttempt.examineeName}` : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setGradingId(null)}>Hủy</Button>
            <Button onClick={saveGrades}>
              <ClipboardCheck className="h-4 w-4" /> Chốt điểm ({gradingTotal} điểm tự luận)
            </Button>
          </>
        }
      >
        {gradingAttempt ? (
          <div className="space-y-3">
            <p className="rounded-lg bg-sky-50 px-3.5 py-2.5 text-xs text-sky-700">
              Phần máy chấm: <b>{gradingAttempt.autoScore}/{gradingAttempt.maxScore}</b> — chỉ chấm các câu tự luận dưới đây (thang điểm mỗi câu ghi bên phải).
            </p>
            {gradingEssays.map((q) => (
              <div key={q.id} className="rounded-xl border border-stone-100 p-3.5">
                <p className="flex items-start justify-between gap-3 text-xs font-semibold text-stone-800">
                  <span>{q.stem}</span>
                  <span className="shrink-0 text-stone-400">/{q.points}đ</span>
                </p>
                <p className="mt-2 whitespace-pre-line rounded-lg bg-stone-50 p-2.5 text-xs leading-relaxed text-stone-700">
                  {gradingAttempt.answers[q.id]?.text || <span className="italic text-stone-400">(chỉ nộp tệp) {gradingAttempt.answers[q.id]?.fileName}</span>}
                </p>
                <div className="mt-2.5 flex items-center gap-3">
                  <label className="text-xs font-medium text-stone-500">Cho điểm:</label>
                  <Input
                    type="number" min={0} max={q.points}
                    value={gradeInputs[q.id] ?? 0}
                    onChange={(e) => setGradeInputs({ ...gradeInputs, [q.id]: Math.min(q.points, Math.max(0, Number(e.target.value) || 0)) })}
                    className="w-24"
                  />
                  {isEssay(q.type) && gradingAttempt.answers[q.id]?.fileName ? <FileUp className="h-3.5 w-3.5 text-stone-400" /> : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
