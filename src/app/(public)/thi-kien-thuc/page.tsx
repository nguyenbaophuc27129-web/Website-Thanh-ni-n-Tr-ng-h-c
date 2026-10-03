"use client";

import Link from "next/link";
import { useMemo } from "react";
import { MonitorPlay, Timer, ListChecks, Shuffle, Sparkles, ArrowRight, LogIn, Clock3, Award } from "lucide-react";
import { Reveal, CountUp } from "@/components/public/reveal";
import { SponsorStrip } from "@/components/public/sponsor-strip";
import { Badge } from "@/components/ui/badge";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { formatDateTime } from "@/lib/utils";

export default function ThiKienThucPage() {
  const { quizExams, quizAttempts } = useStore();
  const { session } = useAuth();

  const openExams = useMemo(() => quizExams.filter((e) => e.status === "OPEN"), [quizExams]);
  const myAttempts = useMemo(
    () => quizAttempts.filter((a) => a.accountId === session?.accountId),
    [quizAttempts, session]
  );

  return (
    <div>
      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-600 to-orange-700 text-white">
        <span className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-amber-300/25 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-24 left-1/4 h-64 w-64 rounded-full bg-red-400/20 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] ring-1 ring-white/25 backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-200 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-200" />
            </span>
            Đang hoạt động
          </span>
          <h1 className="mt-4 max-w-3xl text-2xl font-black leading-snug sm:text-4xl">
            Thi kiến thức trực tuyến
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-amber-50 sm:text-base">
            Khách có thể nhập tên để thi ngay; đoàn viên đăng nhập để kết quả gắn vào tài khoản và
            tự động tổng hợp vào thi đua của đơn vị.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-14 pt-10">
        {/* ===== Danh sách kỳ thi ===== */}
        <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
          <MonitorPlay className="h-5 w-5 text-orange-500" /> Kỳ thi đang mở ({openExams.length})
        </h2>
        {openExams.length === 0 ? (
          <p className="mt-5 rounded-2xl bg-stone-50 px-5 py-8 text-center text-sm text-stone-500">
            Hiện chưa có kỳ thi nào đang mở — quay lại sau nhé.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {openExams.map((e, i) => (
              <Reveal key={e.id} delay={i * 80}>
                <div className="flex h-full flex-col rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgb(15,23,42,0.05)] ring-1 ring-slate-200 transition-all hover:-translate-y-0.5 hover:ring-amber-300">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-[11px] font-bold text-white">{e.code}</span>
                    {e.adaptive ? (
                      <Badge tone="purple">
                        <Sparkles className="h-3 w-3" /> Đề thích ứng
                      </Badge>
                    ) : null}
                    {e.shuffleQuestions ? (
                      <Badge tone="blue">
                        <Shuffle className="h-3 w-3" /> Trộn câu
                      </Badge>
                    ) : null}
                    {e.shuffleOptions ? <Badge tone="blue">Trộn đáp án</Badge> : null}
                  </div>
                  <h3 className="mt-2.5 text-[15px] font-bold leading-snug text-stone-900">{e.title}</h3>
                  {e.description ? (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-stone-500">{e.description}</p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Timer className="h-3.5 w-3.5 text-orange-500" /> {e.durationMinutes} phút
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ListChecks className="h-3.5 w-3.5 text-orange-500" />{" "}
                      {e.adaptive ? "Thích ứng theo năng lực" : `${e.questionIds.length} câu hỏi`}
                    </span>
                  </div>
                  <div className="mt-auto pt-4">
                    <Link
                      href={`/thi-kien-thuc/${e.code}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 py-2.5 text-sm font-bold text-white shadow-md shadow-orange-500/25 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      Vào thi <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}

        {!session ? (
          <p className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-sky-50 px-4 py-2.5 text-xs text-sky-700">
            <LogIn className="h-3.5 w-3.5" />
            Khách thi được —{" "}
            <Link href="/dang-nhap" className="font-semibold underline hover:no-underline">đăng nhập</Link>{" "}
            để lưu kết quả và nhận điểm vào tài khoản.
          </p>
        ) : null}

        {/* ===== Lượt thi của tôi ===== */}
        {session && myAttempts.length > 0 ? (
          <div className="mt-10">
            <h2 className="inline-flex items-center gap-2 text-lg font-bold text-slate-900">
              <Clock3 className="h-5 w-5 text-orange-500" /> Lượt thi của tôi ({myAttempts.length})
            </h2>
            <div className="mt-4 overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgb(15,23,42,0.04)] ring-1 ring-slate-200">
              <ul className="divide-y divide-stone-100">
                {myAttempts.map((a) => {
                  const exam = quizExams.find((e) => e.id === a.examId);
                  const total = a.manualPoints !== undefined ? a.autoScore + a.manualPoints : a.autoScore;
                  return (
                    <li key={a.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                        <Award className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-stone-800">{exam?.title ?? `Kỳ thi #${a.examId}`}</p>
                        <p className="text-[11px] text-stone-400">
                          {exam?.code} · nộp lúc {a.submittedAt ? formatDateTime(a.submittedAt) : "—"}
                        </p>
                      </div>
                      <span className="text-lg font-black text-stone-900">
                        {total}
                        <span className="text-xs font-medium text-stone-400">/{a.maxScore}</span>
                      </span>
                      {a.status === "GRADED" ? (
                        <Badge tone="green">Đã chấm xong</Badge>
                      ) : a.manualPoints === undefined && a.autoScore < a.maxScore ? (
                        <Badge tone="yellow">Chờ chấm tự luận</Badge>
                      ) : (
                        <Badge tone="blue">Đã nộp</Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ) : null}
      </div>

      <SponsorStrip />
    </div>
  );
}
