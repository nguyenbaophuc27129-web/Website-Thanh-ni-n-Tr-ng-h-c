"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Users,
  Send,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import type { Survey, SurveyAnswer, SurveyQuestion } from "@/types";
import {
  fetchSurveyDetail,
  getGuestToken,
  submitSurveyAnswers,
} from "@/lib/khao-sat";
import { surveyOpenNow } from "@/lib/server/khao-sat";
import { Button } from "@/components/ui/button";

export default function KhaoSatDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myResponse, setMyResponse] = useState<{
    id: number;
    answers: SurveyAnswer[];
    submittedAt: string;
  } | null>(null);

  // Form state
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      const guestToken = getGuestToken();
      const res = await fetchSurveyDetail(code, guestToken);
      if (ignore) return;
      if (!res.ok || !res.survey) {
        setError(res.error ?? "Không thể tải nội dung khảo sát.");
      } else {
        setSurvey(res.survey);
        if (res.myResponse) {
          setMyResponse(res.myResponse);
          // Điền lại câu trả lời đã gửi nếu có
          const map: Record<string, string | string[]> = {};
          for (const a of res.myResponse.answers) {
            map[a.questionId] = a.value;
          }
          setAnswers(map);
        }
      }
      setLoading(false);
    }
    void load();
    return () => {
      ignore = true;
    };
  }, [code]);

  const handleSingleSelect = (questionId: string, option: string) => {
    if (myResponse || submitSuccess) return;
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleMultiToggle = (questionId: string, option: string) => {
    if (myResponse || submitSuccess) return;
    setAnswers((prev) => {
      const current = Array.isArray(prev[questionId]) ? (prev[questionId] as string[]) : [];
      const next = current.includes(option)
        ? current.filter((o) => o !== option)
        : [...current, option];
      return { ...prev, [questionId]: next };
    });
  };

  const handleTextChange = (questionId: string, text: string) => {
    if (myResponse || submitSuccess) return;
    setAnswers((prev) => ({ ...prev, [questionId]: text }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey || submitting) return;

    setSubmitError(null);

    // Kiểm tra câu hỏi bắt buộc
    for (const q of survey.questions ?? []) {
      if (q.required) {
        const val = answers[q.id];
        if (
          val === undefined ||
          val === null ||
          (typeof val === "string" && !val.trim()) ||
          (Array.isArray(val) && val.length === 0)
        ) {
          setSubmitError(`Vui lòng trả lời câu hỏi bắt buộc: "${q.text}"`);
          return;
        }
      }
    }

    const payloadAnswers: SurveyAnswer[] = Object.entries(answers).map(([questionId, value]) => ({
      questionId,
      value,
    }));

    setSubmitting(true);
    const guestToken = getGuestToken();
    const res = await submitSurveyAnswers(code, payloadAnswers, guestToken);
    setSubmitting(false);

    if (!res.ok) {
      setSubmitError(res.error ?? "Không thể gửi câu trả lời. Vui lòng thử lại.");
    } else {
      setSubmitSuccess(true);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FFFDF9]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-[#F26522]" />
          <p className="text-sm font-medium text-stone-500">Đang tải nội dung khảo sát...</p>
        </div>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div className="mx-auto min-h-screen max-w-3xl px-4 py-20 text-center">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700">
          <AlertCircle className="mx-auto h-12 w-12 mb-3 text-red-500" />
          <h2 className="text-lg font-bold">Không tìm thấy khảo sát</h2>
          <p className="mt-1 text-sm text-red-600">{error ?? "Khảo sát không tồn tại hoặc đã bị gỡ bỏ."}</p>
          <div className="mt-6">
            <Link
              href="/khao-sat"
              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-4 py-2 text-xs font-bold text-white hover:bg-stone-800"
            >
              <ArrowLeft className="h-4 w-4" /> Về danh sách khảo sát
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isOpen = surveyOpenNow(survey);
  const isCompleted = !!myResponse || submitSuccess;

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-stone-900 pb-24">
      {/* Header bar */}
      <div className="border-b border-stone-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link
            href="/khao-sat"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-[#C4161C] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Danh sách khảo sát
          </Link>
          <span className="text-xs font-medium text-stone-500">
            {survey.questions?.length ?? 0} câu hỏi
          </span>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 pt-8">
        {/* Card thông tin khảo sát */}
        <div className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {isOpen ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Đang mở nhận ý kiến
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-600">
                <CheckCircle2 className="h-3 w-3 text-stone-500" />
                Đã kết thúc
              </span>
            )}

            {isCompleted && (
              <span className="inline-flex items-center gap-1 rounded-full border border-sky-300 bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-sky-700">
                <CheckCircle2 className="h-3 w-3 text-sky-600" />
                Bạn đã tham gia khảo sát này
              </span>
            )}
          </div>

          <h1 className="font-serif-display text-2xl sm:text-3xl font-black leading-snug text-stone-950">
            {survey.title}
          </h1>

          {survey.description && (
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-stone-600">
              {survey.description}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4 pt-4 border-t border-stone-100 text-xs text-stone-500">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4 text-stone-400" />
              <strong>{survey.responseCount ?? 0}</strong> lượt đã tham gia
            </span>

            {survey.endsAt && (
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-stone-400" />
                Hạn chót: {new Date(survey.endsAt).toLocaleDateString("vi-VN")}
              </span>
            )}
          </div>
        </div>

        {/* Thông báo đã nộp thành công */}
        {isCompleted && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-5 text-emerald-800 shadow-xs">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Cảm ơn bạn đã tham gia khảo sát!</h4>
                <p className="text-xs text-emerald-700 mt-1">
                  Ý kiến của bạn đã được hệ thống ghi nhận thành công. Những đóng góp này sẽ giúp ích rất nhiều trong việc hoàn thiện công tác Đoàn – Hội trường học.
                </p>
                {myResponse?.submittedAt && (
                  <p className="text-[11px] text-emerald-600 mt-2">
                    Thời gian gửi: {new Date(myResponse.submittedAt).toLocaleString("vi-VN")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Form trả lời câu hỏi */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {survey.questions?.map((q, idx) => {
            const currentVal = answers[q.id];
            const isSingle = q.type === "SINGLE";
            const isMulti = q.type === "MULTI";
            const isText = q.type === "TEXT";

            return (
              <div
                key={q.id}
                className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-orange-50 font-bold text-xs text-[#C4161C] border border-[#F26522]/20">
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <h3 className="text-sm sm:text-base font-bold text-stone-900 leading-snug">
                      {q.text}
                      {q.required && <span className="ml-1 text-red-500">*</span>}
                    </h3>

                    {/* Hướng dẫn loại câu hỏi */}
                    <p className="mt-1 text-[11px] text-stone-500 font-medium">
                      {isSingle && "Chọn 1 đáp án phù hợp nhất"}
                      {isMulti && "Có thể chọn nhiều đáp án"}
                      {isText && "Nhập ý kiến đóng góp của bạn"}
                    </p>

                    {/* Đáp án SINGLE */}
                    {isSingle && q.options && (
                      <div className="mt-4 space-y-2">
                        {q.options.map((opt) => {
                          const selected = currentVal === opt;
                          return (
                            <label
                              key={opt}
                              onClick={() => handleSingleSelect(q.id, opt)}
                              className={`flex items-center gap-3 rounded-2xl border p-3 text-xs sm:text-sm font-medium transition-all ${
                                isCompleted
                                  ? selected
                                    ? "border-[#F26522] bg-orange-50/60 text-stone-900 font-bold"
                                    : "border-stone-200 bg-stone-50/50 text-stone-500 opacity-70"
                                  : selected
                                  ? "border-[#F26522] bg-orange-50/80 text-stone-900 shadow-xs cursor-pointer font-bold"
                                  : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/60 cursor-pointer text-stone-700"
                              }`}
                            >
                              <input
                                type="radio"
                                name={q.id}
                                value={opt}
                                checked={selected}
                                onChange={() => {}}
                                disabled={isCompleted}
                                className="h-4 w-4 text-[#C4161C] focus:ring-[#F26522]"
                              />
                              <span className="flex-1">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Đáp án MULTI */}
                    {isMulti && q.options && (
                      <div className="mt-4 space-y-2">
                        {q.options.map((opt) => {
                          const selected = Array.isArray(currentVal) && currentVal.includes(opt);
                          return (
                            <label
                              key={opt}
                              onClick={() => handleMultiToggle(q.id, opt)}
                              className={`flex items-center gap-3 rounded-2xl border p-3 text-xs sm:text-sm font-medium transition-all ${
                                isCompleted
                                  ? selected
                                    ? "border-[#F26522] bg-orange-50/60 text-stone-900 font-bold"
                                    : "border-stone-200 bg-stone-50/50 text-stone-500 opacity-70"
                                  : selected
                                  ? "border-[#F26522] bg-orange-50/80 text-stone-900 shadow-xs cursor-pointer font-bold"
                                  : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/60 cursor-pointer text-stone-700"
                              }`}
                            >
                              <input
                                type="checkbox"
                                value={opt}
                                checked={selected}
                                onChange={() => {}}
                                disabled={isCompleted}
                                className="h-4 w-4 rounded-sm text-[#C4161C] focus:ring-[#F26522]"
                              />
                              <span className="flex-1">{opt}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Đáp án TEXT */}
                    {isText && (
                      <div className="mt-4">
                        <textarea
                          rows={4}
                          value={typeof currentVal === "string" ? currentVal : ""}
                          onChange={(e) => handleTextChange(q.id, e.target.value)}
                          disabled={isCompleted}
                          placeholder={isCompleted ? "" : "Nhập câu trả lời của bạn tại đây..."}
                          className="w-full rounded-2xl border border-stone-200 bg-stone-50/40 p-3 text-xs sm:text-sm text-stone-800 placeholder-stone-400 focus:border-[#F26522] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#F26522]/20 disabled:cursor-not-allowed disabled:bg-stone-100/60"
                        />
                        <div className="mt-1 text-right text-[11px] text-stone-400">
                          {typeof currentVal === "string" ? currentVal.length : 0} / 2000 ký tự
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Lỗi submit nếu có */}
          {submitError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Action Footer */}
          {!isCompleted && (
            <div className="pt-4">
              {isOpen ? (
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F26522] to-[#C4161C] py-3.5 text-sm font-bold text-white shadow-md hover:brightness-110 disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Đang gửi câu trả lời...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Gửi câu trả lời khảo sát
                    </>
                  )}
                </Button>
              ) : (
                <div className="rounded-2xl border border-stone-200 bg-stone-100 p-4 text-center text-xs font-semibold text-stone-600">
                  Khảo sát này hiện đã đóng nhận câu trả lời.
                </div>
              )}
            </div>
          )}
        </form>
      </main>
    </div>
  );
}
