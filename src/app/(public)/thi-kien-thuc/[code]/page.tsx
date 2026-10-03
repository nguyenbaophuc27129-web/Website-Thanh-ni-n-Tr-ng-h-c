"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { QuizRunner } from "@/components/public/quiz-runner";

/** Màn làm bài theo mã kỳ thi — /thi-kien-thuc/KT-2026-001 */
export default function LamBaiThiPage() {
  const params = useParams<{ code: string }>();
  const { quizExams } = useStore();
  const exam = quizExams.find((e) => e.code === decodeURIComponent(params.code) && e.status === "OPEN");

  if (!exam) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <AlertTriangle className="mx-auto h-9 w-9 text-amber-500" />
        <h1 className="mt-4 text-xl font-bold text-stone-900">Không tìm thấy kỳ thi đang mở</h1>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">
          Mã kỳ thi <b>{params.code}</b> không tồn tại, đã đóng hoặc chưa mở.
        </p>
        <Link
          href="/thi-kien-thuc"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Xem các kỳ thi đang mở
        </Link>
      </div>
    );
  }

  return <QuizRunner exam={exam} />;
}
