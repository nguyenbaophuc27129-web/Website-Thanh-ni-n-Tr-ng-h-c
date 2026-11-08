"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Vote,
  Clock,
  Heart,
  Search,
  Filter,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Sparkles,
  ArrowRight,
  Undo2,
  Award,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { resizeImageFile } from "@/lib/de-cu";
import { countdownParts } from "@/lib/binh-chon";
import { StoryContent } from "@/components/public/binh-chon/story-content";
import type { UnitStory, VoteCampaign } from "@/types";
import { cn } from "@/lib/utils";

export default function BinhChonDoanTruongPage() {
  const { session, ready } = useAuth();
  const { toast } = useToast();

  const [campaign, setCampaign] = useState<VoteCampaign | null>(null);
  const [stats, setStats] = useState({ approvedStories: 0, totalVotes: 0 });
  const [stories, setStories] = useState<UnitStory[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [myVoteStoryId, setMyVoteStoryId] = useState<number | null>(null);
  const [myUnitStory, setMyUnitStory] = useState<UnitStory | null>(null);

  const [q, setQ] = useState("");
  const [qDeb, setQDeb] = useState("");
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [provinces, setProvinces] = useState<{ id: number; name: string }[]>([]);
  const [sort, setSort] = useState<"hot" | "new">("hot");
  const [loading, setLoading] = useState(true);

  const [detailStory, setDetailStory] = useState<UnitStory | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  // Form submit state
  const [subTitle, setSubTitle] = useState("");
  const [subIntro, setSubIntro] = useState("");
  const [subAchievements, setSubAchievements] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [photoThumbDataUrl, setPhotoThumbDataUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [subError, setSubError] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQDeb(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Load provinces
  useEffect(() => {
    fetch("/api/org-units")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok && Array.isArray(d.units)) {
          setProvinces(
            (d.units as { id: number; name: string; orgLevel: number }[])
              .filter((u) => u.orgLevel === 2)
              .map((u) => ({ id: u.id, name: u.name.replace(/^Đoàn TNCS Hồ Chí Minh\s+/, "") }))
          );
        }
      })
      .catch(() => undefined);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    const sp = new URLSearchParams();
    if (page > 1) sp.set("page", String(page));
    if (qDeb) sp.set("q", qDeb);
    if (provinceId) sp.set("provinceId", String(provinceId));
    if (sort) sp.set("sort", sort);

    try {
      const res = await fetch(`/api/binh-chon-doan-truong?${sp.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data?.ok) {
        setCampaign(data.campaign);
        setStats(data.stats);
        setStories(data.stories || []);
        setTotalPages(data.totalPages || 1);
        setMyVoteStoryId(data.myVoteStoryId || null);
        setMyUnitStory(data.myUnitStory || null);
      }
    } catch (e) {
      console.warn("Lỗi tải bình chọn đoàn trường:", e);
    } finally {
      setLoading(false);
    }
  }, [page, qDeb, provinceId, sort]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleVote = async (story: UnitStory) => {
    if (!session) {
      toast("Vui lòng đăng nhập tài khoản để tham gia bình chọn.", "warning");
      return;
    }

    if (myVoteStoryId === story.id) {
      toast("Bạn đã bình chọn cho hồ sơ này rồi.", "info");
      return;
    }

    if (myVoteStoryId !== null) {
      if (!window.confirm("Mỗi tài khoản chỉ sở hữu duy nhất 1 phiếu. Bạn có chắc chắn muốn chuyển phiếu bình chọn sang Đoàn trường này không?")) {
        return;
      }
    }

    // Optimistic update
    const prevVoteId = myVoteStoryId;
    setMyVoteStoryId(story.id);
    setStories((prev) =>
      prev.map((s) => {
        if (s.id === story.id) return { ...s, voteCount: s.voteCount + 1 };
        if (s.id === prevVoteId) return { ...s, voteCount: Math.max(0, s.voteCount - 1) };
        return s;
      })
    );

    try {
      const res = await fetch("/api/binh-chon-doan-truong/bau", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyId: story.id }),
      });
      const data = await res.json();
      if (data?.ok) {
        toast(`Đã bình chọn thành công cho ${story.schoolName}!`, "success");
        void loadData();
      } else {
        // Revert
        setMyVoteStoryId(prevVoteId);
        toast(data?.error || "Không thể ghi nhận phiếu bầu.", "warning");
        void loadData();
      }
    } catch {
      setMyVoteStoryId(prevVoteId);
      toast("Lỗi kết nối máy chủ.", "warning");
      void loadData();
    }
  };

  const handleWithdraw = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn rút hồ sơ dự thi của trường mình không?")) return;
    setWithdrawing(true);
    try {
      const res = await fetch("/api/binh-chon-doan-truong", { method: "DELETE" });
      const data = await res.json();
      if (data?.ok) {
        toast("Đã rút hồ sơ dự thi thành công.", "success");
        setMyUnitStory(null);
        void loadData();
      } else {
        toast(data?.error || "Không thể rút hồ sơ.", "warning");
      }
    } catch {
      toast("Lỗi kết nối máy chủ.", "warning");
    } finally {
      setWithdrawing(false);
    }
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (subTitle.trim().length < 2) {
      setSubError("Tiêu đề hồ sơ tối thiểu 2 ký tự.");
      return;
    }
    if (subIntro.trim().length < 30) {
      setSubError("Lời giới thiệu hồ sơ tối thiểu 30 ký tự.");
      return;
    }
    if (!photoDataUrl || !photoThumbDataUrl) {
      setSubError("Vui lòng tải lên ảnh hồ sơ hoạt động của Đoàn trường.");
      return;
    }

    setSubmitting(true);
    setSubError("");

    try {
      const res = await fetch("/api/binh-chon-doan-truong", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: subTitle.trim(),
          intro: subIntro.trim(),
          achievements: subAchievements.trim() || undefined,
          photoDataUrl,
          photoThumbDataUrl,
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        toast("Đã gửi hồ sơ Đoàn trường thành công! Ban biên tập sẽ đối chiếu và duyệt trong 24h.", "success");
        setSubmitOpen(false);
        setSubTitle("");
        setSubIntro("");
        setSubAchievements("");
        setPhotoDataUrl("");
        setPhotoThumbDataUrl("");
        void loadData();
      } else {
        setSubError(data?.error || "Không thể nộp hồ sơ.");
      }
    } catch {
      setSubError("Lỗi kết nối máy chủ.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { full, thumb } = await resizeImageFile(file);
      setPhotoDataUrl(full);
      setPhotoThumbDataUrl(thumb);
    } catch (err) {
      setSubError((err as Error).message || "Không thể xử lý ảnh.");
    }
  };

  const cd = countdownParts(campaign?.endsAt);

  return (
    <div className="min-h-screen bg-[#FFFBF6] pb-24 text-[#3D1A0E]">
      {/* ===== HERO SECTION TÔNG CAM RỰC RỠ ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#F26522] via-[#E04A1F] to-[#C4161C] text-white">
        <div className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-1/4 h-80 w-80 rounded-full bg-[#FFDF7E]/20 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-20 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] backdrop-blur-md">
            <Building2 className="h-4 w-4 text-[#FFDF7E]" /> Cổng Thanh niên Trường học phát động
          </div>

          <h1 className="mt-4 font-serif-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white whitespace-nowrap">
            Bình chọn Đoàn trường tiêu biểu
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-xs sm:text-sm text-white/90 leading-relaxed">
            Tôn vinh các cơ sở Đoàn trường THPT có mô hình sáng tạo, phong trào thanh niên xuất sắc
            và thành tích nổi bật toàn quốc năm {campaign?.year ?? 2026}.
          </p>

          {/* Countdown & Stats bar */}
          <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-4 rounded-2xl border border-white/25 bg-black/20 p-4 backdrop-blur-md">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Clock className="h-4 w-4 text-[#FFDF7E]" />
              <span>Thời gian còn lại:</span>
              <span className="font-mono text-sm font-black text-[#FFDF7E]">
                {String(cd.days).padStart(2, "0")} ngày {String(cd.hours).padStart(2, "0")} giờ {String(cd.minutes).padStart(2, "0")} phút
              </span>
            </div>
            <span className="text-white/40">•</span>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Building2 className="h-4 w-4 text-[#FFDF7E]" />
              <span>{stats.approvedStories} Đoàn trường tham gia</span>
            </div>
            <span className="text-white/40">•</span>
            <div className="flex items-center gap-2 text-xs font-semibold">
              <Heart className="h-4 w-4 text-[#FFDF7E] fill-[#FFDF7E]" />
              <span>{stats.totalVotes.toLocaleString("vi-VN")} lượt bình chọn</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== KHỐI HỒ SƠ CỦA TRƯỜNG TÔI (CHO DON_VI) ===== */}
      <section className="mx-auto -mt-6 max-w-6xl px-4 relative z-10">
        <div className="rounded-3xl border border-[#F26522]/30 bg-white p-5 sm:p-7 shadow-[0_12px_36px_rgba(242,101,34,0.12)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#F26522]">
                Dành cho Ban Chấp hành Đoàn trường
              </span>
              <h2 className="font-serif-display text-lg sm:text-xl font-black text-[#C4161C]">
                Hồ sơ tham gia bình chọn của trường bạn
              </h2>
            </div>

            {ready && session?.role === "DON_VI" && !myUnitStory && (
              <Button
                onClick={() => setSubmitOpen(true)}
                className="bg-gradient-to-r from-[#F26522] to-[#C4161C] text-white font-bold hover:brightness-110 shadow-md"
              >
                <Plus className="mr-1.5 h-4 w-4" /> Nộp hồ sơ Đoàn trường
              </Button>
            )}

            {ready && !session && (
              <Link
                href="/dang-nhap"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#F26522]/40 bg-[#FFF1E4] px-4 py-2 text-xs font-bold text-[#C4161C] hover:bg-[#FFE3CF]"
              >
                Đăng nhập tài khoản trường để nộp hồ sơ
              </Link>
            )}
          </div>

          {/* Trạng thái hồ sơ trường mình */}
          {myUnitStory && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-[#FFF8F0] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={myUnitStory.photoThumbDataUrl}
                  alt=""
                  className="h-16 w-24 shrink-0 rounded-xl object-cover border border-[#F26522]/30"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900">{myUnitStory.title}</h3>
                    {myUnitStory.status === "PENDING" && <Badge tone="yellow">Chờ duyệt</Badge>}
                    {myUnitStory.status === "APPROVED" && <Badge tone="green">Đã duyệt ({myUnitStory.voteCount} phiếu)</Badge>}
                    {myUnitStory.status === "REJECTED" && <Badge tone="red">Cần chỉnh sửa</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-1">{myUnitStory.intro}</p>
                  {myUnitStory.rejectionReason && (
                    <p className="mt-1 text-xs text-red-600 font-medium">Lý do: {myUnitStory.rejectionReason}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailStory(myUnitStory)}
                  className="text-xs"
                >
                  Xem trước
                </Button>
                {myUnitStory.status === "PENDING" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={withdrawing}
                    onClick={handleWithdraw}
                    className="border-red-300 text-red-700 hover:bg-red-50 text-xs"
                  >
                    <Undo2 className="h-3.5 w-3.5 mr-1" /> Rút hồ sơ
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===== DANH SÁCH BÌNH CHỌN ===== */}
      <section className="mx-auto mt-12 max-w-6xl px-4">
        {/* Thanh lọc & tìm kiếm */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#F26522]/20 bg-white p-4 shadow-xs">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tên trường, chủ đề..."
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Select
              value={provinceId ?? ""}
              onChange={(e) => setProvinceId(Number(e.target.value) || null)}
              className="!w-auto text-xs"
            >
              <option value="">-- Tất cả tỉnh/thành --</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>

            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setSort("hot")}
                className={cn(
                  "rounded-lg px-3 py-1 transition-all",
                  sort === "hot" ? "bg-white text-[#C4161C] shadow-xs" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Nhiều phiếu nhất
              </button>
              <button
                type="button"
                onClick={() => setSort("new")}
                className={cn(
                  "rounded-lg px-3 py-1 transition-all",
                  sort === "new" ? "bg-white text-[#C4161C] shadow-xs" : "text-slate-500 hover:text-slate-800"
                )}
              >
                Mới nhất
              </button>
            </div>
          </div>
        </div>

        {/* Grid thẻ các trường */}
        <div className="mt-8">
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#F26522]" />
              <p className="mt-2 text-xs font-semibold">Đang tải danh sách hồ sơ Đoàn trường...</p>
            </div>
          ) : stories.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-[#F26522]/50 mb-2" />
              <h3 className="text-base font-bold text-slate-800">Chưa có hồ sơ Đoàn trường nào</h3>
              <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
                Các trường THPT có thể đăng ký tham gia bằng nút &ldquo;Nộp hồ sơ Đoàn trường&rdquo; ở phía trên.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {stories.map((s) => {
                const isVoted = myVoteStoryId === s.id;
                return (
                  <div
                    key={s.id}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-[#F26522]/25 bg-white shadow-xs transition-all hover:-translate-y-1 hover:border-[#F26522] hover:shadow-lg"
                  >
                    <div
                      onClick={() => setDetailStory(s)}
                      className="relative aspect-16/9 w-full cursor-pointer overflow-hidden bg-slate-100"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={s.photoThumbDataUrl}
                        alt={s.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-0.5 text-[10px] font-bold text-[#FFDF7E] backdrop-blur-sm border border-[#FFDF7E]/30">
                        <MapPin className="h-3 w-3" /> {s.provinceName ?? "Toàn quốc"}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#F26522]">
                        {s.schoolName}
                      </p>
                      <h3
                        onClick={() => setDetailStory(s)}
                        className="mt-1 font-serif-display text-base font-bold text-slate-900 group-hover:text-[#C4161C] transition-colors cursor-pointer line-clamp-2"
                      >
                        {s.title}
                      </h3>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600 line-clamp-3 flex-1">
                        {s.intro}
                      </p>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">Số phiếu:</span>
                          <p className="font-mono text-base font-black text-[#C4161C]">
                            {s.voteCount.toLocaleString("vi-VN")}
                          </p>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => handleVote(s)}
                          className={cn(
                            "text-xs font-bold transition-all shadow-xs",
                            isVoted
                              ? "border border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200"
                              : "bg-gradient-to-r from-[#F26522] to-[#C4161C] text-white hover:brightness-110"
                          )}
                        >
                          <Heart className={cn("h-3.5 w-3.5 mr-1", isVoted ? "fill-amber-700 text-amber-700" : "fill-white")} />
                          {isVoted ? "Đã bình chọn" : "Bình chọn"}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Trước
              </Button>
              <span className="px-3 py-1.5 text-xs font-bold text-slate-600">
                Trang {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Sau <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Modal chi tiết hồ sơ Đoàn trường */}
      <Modal
        open={!!detailStory}
        onClose={() => setDetailStory(null)}
        title={detailStory ? detailStory.schoolName : ""}
        wide
      >
        {detailStory ? (
          <div className="space-y-5">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={detailStory.photoDataUrl || detailStory.photoThumbDataUrl}
                alt={detailStory.title}
                className="w-full max-h-80 object-cover"
              />
            </div>

            <div>
              <span className="text-[11px] font-bold text-[#F26522] uppercase tracking-wider">
                {detailStory.provinceName ? `Tỉnh/Thành: ${detailStory.provinceName}` : "Hồ sơ dự thi"}
              </span>
              <h2 className="mt-1 font-serif-display text-xl font-bold text-slate-900">
                {detailStory.title}
              </h2>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700 whitespace-pre-line">
              {detailStory.intro}
            </div>

            {detailStory.achievements && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-2 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-amber-600" /> Thành tích &amp; Mô hình tiêu biểu
                </h4>
                <div className="rounded-2xl border border-amber-200 bg-[#FFFDF6] p-4 text-xs leading-relaxed text-slate-800 whitespace-pre-line">
                  {detailStory.achievements}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500">Tổng số phiếu:</span>
                <p className="font-mono text-lg font-black text-[#C4161C]">
                  {detailStory.voteCount.toLocaleString("vi-VN")} phiếu
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setDetailStory(null)}>
                  Đóng
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    void handleVote(detailStory);
                    setDetailStory(null);
                  }}
                  className="bg-gradient-to-r from-[#F26522] to-[#C4161C] text-white font-bold"
                >
                  <Heart className="h-3.5 w-3.5 mr-1 fill-white" />
                  Bình chọn cho trường
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Modal nộp hồ sơ Đoàn trường */}
      <Modal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        title="Nộp hồ sơ Đoàn trường tham gia bình chọn"
        wide
      >
        <form onSubmit={handleSubmitProfile} className="space-y-4">
          {subError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-700 font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{subError}</span>
            </div>
          )}

          <Field label="Tiêu đề hồ sơ" required hint="Ví dụ: Tuổi trẻ trường THPT Chu Văn An — Tiên phong đổi mới sáng tạo">
            <Input
              value={subTitle}
              onChange={(e) => setSubTitle(e.target.value)}
              placeholder="Nhập tiêu đề hồ sơ của trường"
              required
            />
          </Field>

          <Field label="Giới thiệu phong trào & Hoạt động Đoàn trường" required hint="Từ 30 đến 2000 ký tự">
            <Textarea
              rows={5}
              value={subIntro}
              onChange={(e) => setSubIntro(e.target.value)}
              placeholder="Tóm tắt các phong trào nổi bật, câu lạc bộ học đường, công tác bồi dưỡng đoàn viên..."
              required
            />
          </Field>

          <Field label="Thành tích, giải thưởng & Mô hình sáng tạo (nếu có)" hint="Mỗi dòng một thành tích">
            <Textarea
              rows={4}
              value={subAchievements}
              onChange={(e) => setSubAchievements(e.target.value)}
              placeholder="- Cờ thi đua đơn vị xuất sắc cấp Tỉnh năm 2026&#10;- Bằng khen Trung ương Đoàn về phong trào tình nguyện&#10;- Mô hình không gian sáng chế STEM học đường..."
            />
          </Field>

          <div>
            <label className="block text-xs font-bold text-slate-800">
              Ảnh tập thể / Hoạt động tiêu biểu <span className="text-red-500">*</span>
            </label>
            <p className="text-[11px] text-slate-500 mb-2">
              Ảnh ngang tỷ lệ 16:9 chất lượng cao chụp Ban Chấp hành Đoàn hoặc hoạt động toàn trường.
            </p>

            {photoThumbDataUrl ? (
              <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photoThumbDataUrl}
                  alt=""
                  className="h-16 w-28 rounded-lg object-cover border border-slate-200"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPhotoDataUrl("");
                    setPhotoThumbDataUrl("");
                  }}
                  className="text-xs text-red-600 font-bold hover:underline"
                >
                  Xóa và chọn ảnh khác
                </button>
              </div>
            ) : (
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="text-xs text-slate-600"
                required
              />
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setSubmitOpen(false)}>
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-gradient-to-r from-[#F26522] to-[#C4161C] text-white font-bold"
            >
              {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Gửi hồ sơ tham gia
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
