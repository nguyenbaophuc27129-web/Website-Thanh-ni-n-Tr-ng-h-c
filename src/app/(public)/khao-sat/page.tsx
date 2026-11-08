"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import {
  ClipboardList,
  Search,
  Clock,
  Users,
  CheckCircle2,
  Calendar,
  ArrowRight,
  Sparkles,
  Loader2,
  FileQuestion,
} from "lucide-react";
import type { Survey } from "@/types";
import { fetchPublicSurveys } from "@/lib/khao-sat";
import { surveyOpenNow } from "@/lib/server/khao-sat";
import { Button } from "@/components/ui/button";

export default function KhaoSatListPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "LIVE" | "ENDED">("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let ignore = false;
    async function load() {
      setLoading(true);
      setError(null);
      const res = await fetchPublicSurveys();
      if (ignore) return;
      if (!res.ok) {
        setError(res.error ?? "Không thể tải danh sách khảo sát.");
      } else {
        setSurveys(res.surveys ?? []);
      }
      setLoading(false);
    }
    void load();
    return () => {
      ignore = true;
    };
  }, []);

  const filteredSurveys = useMemo(() => {
    return surveys.filter((s) => {
      const isOpen = s.status === "LIVE";
      if (filter === "LIVE" && !isOpen) return false;
      if (filter === "ENDED" && isOpen) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          s.title.toLowerCase().includes(q) ||
          (s.description ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [surveys, filter, search]);

  const liveCount = useMemo(() => surveys.filter((s) => s.status === "LIVE").length, [surveys]);
  const endedCount = useMemo(() => surveys.filter((s) => s.status === "ENDED").length, [surveys]);

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-stone-900 pb-24">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FFF5EB] via-[#FFF9F3] to-[#FFFDF9] border-b border-stone-200/80 pt-16 pb-12 sm:pt-20 sm:pb-16 px-4">
        {/* Glow hạt sáng background */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-br from-[#F26522]/15 to-[#C4161C]/10 blur-3xl" />

        <div className="relative mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#F26522]/30 bg-white/90 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#C4161C] shadow-xs backdrop-blur-xs">
            <Sparkles className="h-3.5 w-3.5 text-[#F26522]" /> Tiếng nói thanh niên trường học
          </div>

          <h1 className="mt-4 font-serif-display text-3xl sm:text-5xl font-black uppercase tracking-tight text-stone-950">
            Khảo sát &amp; Lấy ý kiến xã hội
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-stone-600">
            Không gian lắng nghe tâm tư, nguyện vọng và ý kiến đóng góp của đoàn viên, thanh niên,
            học sinh toàn quốc để nâng cao chất lượng hoạt động Đoàn – Hội.
          </p>

          {/* Ô tìm kiếm & lọc nhanh */}
          <div className="mx-auto mt-8 flex max-w-xl flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Tìm kiếm nội dung khảo sát..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-stone-300 bg-white py-2.5 pl-10 pr-4 text-sm text-stone-900 placeholder-stone-400 shadow-xs focus:border-[#F26522] focus:outline-hidden focus:ring-2 focus:ring-[#F26522]/20"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <button
              onClick={() => setFilter("ALL")}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                filter === "ALL"
                  ? "bg-[#C4161C] text-white shadow-xs"
                  : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
              }`}
            >
              Tất cả ({surveys.length})
            </button>
            <button
              onClick={() => setFilter("LIVE")}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                filter === "LIVE"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
              }`}
            >
              Đang mở ({liveCount})
            </button>
            <button
              onClick={() => setFilter("ENDED")}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                filter === "ENDED"
                  ? "bg-stone-800 text-white shadow-xs"
                  : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-50"
              }`}
            >
              Đã kết thúc ({endedCount})
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="mx-auto max-w-5xl px-4 pt-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-stone-500">
            <Loader2 className="h-8 w-8 animate-spin text-[#F26522] mb-3" />
            <p className="text-sm font-medium">Đang tải danh sách khảo sát...</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : filteredSurveys.length === 0 ? (
          <div className="rounded-3xl border border-stone-200 bg-white p-12 text-center shadow-xs">
            <FileQuestion className="mx-auto h-12 w-12 text-stone-300 mb-3" />
            <h3 className="text-base font-bold text-stone-800">Chưa có khảo sát nào</h3>
            <p className="mt-1 text-xs text-stone-500">
              {search ? "Không tìm thấy khảo sát phù hợp từ khóa." : "Hiện chưa có cuộc khảo sát nào trong mục này."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {filteredSurveys.map((survey) => {
              const isLive = survey.status === "LIVE";
              const qCount = survey.questions?.length ?? 0;
              const respCount = survey.responseCount ?? 0;

              return (
                <div
                  key={survey.id}
                  className="group flex flex-col justify-between rounded-3xl border border-stone-200 bg-white p-6 shadow-xs transition-all duration-200 hover:border-[#F26522]/60 hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div>
                    {/* Status Badge + Question Count */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {isLive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                          Đang mở
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-100 px-2.5 py-0.5 text-[11px] font-semibold text-stone-600">
                          <CheckCircle2 className="h-3 w-3 text-stone-500" />
                          Đã kết thúc
                        </span>
                      )}

                      <span className="text-[11px] font-semibold text-stone-500 flex items-center gap-1">
                        <ClipboardList className="h-3.5 w-3.5 text-stone-400" />
                        {qCount} câu hỏi
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="font-serif-display text-lg sm:text-xl font-bold leading-snug text-stone-900 group-hover:text-[#C4161C] transition-colors">
                      {survey.title}
                    </h2>

                    {/* Description */}
                    {survey.description ? (
                      <p className="mt-2 line-clamp-3 text-xs sm:text-sm leading-relaxed text-stone-600">
                        {survey.description}
                      </p>
                    ) : null}
                  </div>

                  {/* Metadata & Actions */}
                  <div className="mt-6 pt-4 border-t border-stone-100">
                    <div className="flex items-center justify-between text-xs text-stone-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-stone-400" />
                        <strong className="text-stone-800 font-bold">{respCount.toLocaleString("vi-VN")}</strong> lượt tham gia
                      </span>

                      {survey.endsAt ? (
                        <span className="flex items-center gap-1 text-[11px]">
                          <Calendar className="h-3.5 w-3.5 text-stone-400" />
                          Hạn: {new Date(survey.endsAt).toLocaleDateString("vi-VN")}
                        </span>
                      ) : null}
                    </div>

                    <Link
                      href={`/khao-sat/${survey.code}`}
                      className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                        isLive
                          ? "bg-gradient-to-r from-[#F26522] to-[#C4161C] text-white shadow-xs hover:brightness-110"
                          : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                      }`}
                    >
                      {isLive ? (
                        <>
                          Tham gia khảo sát <ArrowRight className="h-4 w-4" />
                        </>
                      ) : (
                        "Xem chi tiết khảo sát"
                      )}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
