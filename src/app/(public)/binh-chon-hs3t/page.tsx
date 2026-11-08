"use client";

/**
 * Cổng bình chọn "Hành trình 3 tốt" — tông cam "Rực rỡ tuổi học sinh" (góp ý chị Ngọc Anh):
 * 1. HERO gradient cam #F26522→#C4161C, chữ hiệu "HÀNH TRÌNH 3 TỐT" (bỏ nhắc Trung ương Đoàn).
 * 2. HonorBoard thay ô trống đồng — 3 khối gương theo danh hiệu (cấp trường / cấp tỉnh / đề cử TW).
 * 3. BentoGrid: tiêu chí theo đúng Quy chế 317/QĐ (không "ấn tín" tự chế), countdown + thống kê.
 * 4. Bảng vàng: chia 3 nhóm theo danh hiệu HS tự khai (admin chỉnh khi duyệt).
 * 5. Section "Giới thiệu về danh hiệu" — hình ảnh + thuyết minh quy chế + link web xét chọn của TW
 *    (ghi chú đã hết thời hạn nộp hồ sơ).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Swiper, SwiperSlide } from "swiper/react";
import { FreeMode } from "swiper/modules";
import type { Swiper as SwiperClass } from "swiper";
import "swiper/css";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Sparkles,
  PenLine,
  Award,
  AlertTriangle,
  Loader2,
  Undo2,
  Flame,
  Search,
  Check,
  Medal,
  ScrollText,
  ExternalLink,
  ShieldCheck,
  Clock3,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { fetchStories, voteStory, withdrawStory, type BinhChonStats } from "@/lib/binh-chon";
import type { BinhChonStory, VoteCampaign } from "@/types";
import { CdttbCard } from "@/components/public/binh-chon/cdttb-card";
import { BentoGrid } from "@/components/public/binh-chon/bento-grid";
import { HonorBoard } from "@/components/public/binh-chon/honor-board";
import { GoldenDust, GoldenThread, RadialHUDCountdown } from "@/components/public/binh-chon/dong-son";
import { SubmitModal } from "@/components/public/binh-chon/submit-modal";
import {
  StoryContent,
  GoldenAchievementColumn,
  parseStoryAndAchievements,
  parseAchievementsText,
} from "@/components/public/binh-chon/story-content";
import { HONOR_LEVEL_LABEL } from "@/components/public/binh-chon/palette";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const HONOR_GROUPS = ["TRUONG", "TINH", "TW_DE_CU"] as const;

/** Thông tin xét chọn danh hiệu cấp TW — từ công văn CV/TWĐTN-CTTTN 10/2026 */
const TW_SELECTION = {
  url: "https://khenthuong.doanthanhnien.vn/login",
  guideUrl: "https://263.org.vn/huongdankhenthuong",
  deadline: "31/10/2026",
  confirmDeadline: "10/11/2026",
  steps: [
    "Học sinh nộp hồ sơ trên hệ thống xét chọn khen thưởng của TW Đoàn (10/10 – 31/10/2026)",
    "Tỉnh, thành đoàn xác nhận, xét chọn hồ sơ hợp lệ trước 10/11/2026",
    "Ban Công tác Thanh thiếu nhi rà soát hồ sơ trình Hội đồng xét chọn cấp TW",
    "Hội đồng xét chọn cấp TW xét, đề xuất Ban Bí thư TW Đoàn trao danh hiệu",
  ],
};

export default function BinhChonHs3tPage() {
  const { session } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [campaign, setCampaign] = useState<VoteCampaign | null>(null);
  const [stats, setStats] = useState<BinhChonStats>({ approvedStories: 0, totalVotes: 0 });
  const [stories, setStories] = useState<BinhChonStory[]>([]);
  const [topByHonor, setTopByHonor] = useState<Partial<Record<(typeof HONOR_GROUPS)[number], BinhChonStory[]>>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [myVoteStoryId, setMyVoteStoryId] = useState<number | null>(null);
  const [myStory, setMyStory] = useState<BinhChonStory | null>(null);
  const [sort, setSort] = useState<"hot" | "new">("hot");
  const [q, setQ] = useState("");
  const [qDeb, setQDeb] = useState("");
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [provinces, setProvinces] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [detail, setDetail] = useState<BinhChonStory | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cd, setCd] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    ended: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, ended: true });
  const [topPage, setTopPage] = useState(1);
  const [withdrawing, setWithdrawing] = useState(false);

  const swiperRef = useRef<SwiperClass | null>(null);
  const [perView, setPerView] = useState(4);
  const ended = cd.ended || campaign?.status === "ENDED" || campaign?.status === "DRAFT";

  // Debounce search 350ms
  useEffect(() => {
    const t = setTimeout(() => setQDeb(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchStories({ page, q: qDeb, provinceId, sort, withBoard: true });
    if (res.ok) {
      setCampaign(res.campaign ?? null);
      setStats(res.stats ?? { approvedStories: 0, totalVotes: 0 });
      setStories(res.stories ?? []);
      setTopByHonor(res.topByHonor ?? {});
      setTotalPages(res.totalPages ?? 1);
      setMyVoteStoryId(res.myVoteStoryId ?? null);
      setMyStory(res.myStory ?? null);
    }
    setLoading(false);
  }, [page, qDeb, provinceId, sort]);

  useEffect(() => {
    void load();
  }, [load]);

  // Danh sách tỉnh (org_units cấp 2)
  useEffect(() => {
    fetch("/api/org-units")
      .then((r) => r.json())
      .then((d) => {
        if (d?.ok) {
          setProvinces(
            (d.units as { id: number; name: string; orgLevel: number }[])
              .filter((u) => u.orgLevel === 2)
              .map((u) => ({ id: u.id, name: u.name.replace(/^Đoàn TNCS Hồ Chí Minh /, "") }))
          );
        }
      })
      .catch(() => undefined);
  }, []);

  // Đếm ngược chính xác từng giây
  useEffect(() => {
    const tick = () => {
      if (!campaign?.endsAt) {
        setCd({ days: 0, hours: 0, minutes: 0, seconds: 0, ended: true });
        return;
      }
      const diff = new Date(campaign.endsAt).getTime() - Date.now();
      if (isNaN(diff) || diff <= 0) {
        setCd({ days: 0, hours: 0, minutes: 0, seconds: 0, ended: true });
        return;
      }
      const totalSecs = Math.floor(diff / 1000);
      const days = Math.floor(totalSecs / 86400);
      const hours = Math.floor((totalSecs % 86400) / 3600);
      const minutes = Math.floor((totalSecs % 3600) / 60);
      const seconds = totalSecs % 60;
      setCd({ days, hours, minutes, seconds, ended: false });
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [campaign?.endsAt]);

  // Responsive per-view Swiper
  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      setPerView(w < 640 ? 1 : w < 768 ? 2 : w < 1024 ? 3 : 4);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const topStories = stories.slice(0, 12);
  const topTotalPages = Math.max(1, Math.ceil(topStories.length / perView));

  const handleVote = async (s: BinhChonStory) => {
    if (ended) return;
    if (!session) {
      toast("Cần đăng nhập để bình chọn", "info");
      router.push("/dang-nhap");
      return;
    }
    if (myVoteStoryId === s.id) return;
    if (myVoteStoryId) {
      const prev = stories.find((x) => x.id === myVoteStoryId)?.studentName ?? "bài khác";
      if (!window.confirm(`Bạn đang bình chọn cho "${prev}". Đổi phiếu sang "${s.studentName}"?`)) return;
    }
    // Optimistic update
    const prevId = myVoteStoryId;
    const prevList = stories;
    setMyVoteStoryId(s.id);
    setStories((list) =>
      list.map((x) =>
        x.id === s.id ? { ...x, voteCount: x.voteCount + 1 } : prevId && x.id === prevId ? { ...x, voteCount: Math.max(0, x.voteCount - 1) } : x
      )
    );
    const res = await voteStory(s.id);
    if (!res.ok) {
      setStories(prevList);
      setMyVoteStoryId(prevId);
      toast(res.error ?? "Không bình chọn được — thử lại.", "warning");
      return;
    }
    if (typeof res.newCount === "number") {
      setStories((list) => list.map((x) => (x.id === s.id ? { ...x, voteCount: res.newCount! } : x)));
    }
    if (prevId && prevId !== s.id) {
      toast("Đã tiếp lửa vinh quang thành công!", "success");
    }
  };

  const handleWithdraw = async () => {
    if (!myStory || (myStory.status !== "PENDING" && myStory.status !== "REJECTED")) return;
    const msg =
      myStory.status === "PENDING"
        ? "Hủy bài đang chờ duyệt? Sau khi hủy bạn có thể đăng lại bằng bài mới."
        : "Xóa bài bị từ chối để đăng lại bài mới?";
    if (!window.confirm(msg)) return;
    setWithdrawing(true);
    const res = await withdrawStory();
    setWithdrawing(false);
    if (res.ok) {
      toast("Đã hủy bài — bạn có thể đăng lại bài mới.", "success");
      setMyStory(null);
      void load();
    } else {
      toast(res.error ?? "Không hủy được bài — thử lại.", "warning");
    }
  };

  const openDetail = async (s: BinhChonStory) => {
    setDetail(s);
    setDetailLoading(true);
    const detailRes = await fetch(`/api/binh-chon?storyId=${s.id}`).then((r) => r.json());
    if (detailRes?.ok && detailRes.story) setDetail(detailRes.story as BinhChonStory);
    setDetailLoading(false);
  };

  const canSubmit = session?.role === "DOAN_VIEN";
  const rankOf = (id: number) => {
    const sorted = [...stories].sort((a, b) => b.voteCount - a.voteCount || a.id - b.id);
    const idx = sorted.findIndex((x) => x.id === id);
    return idx >= 0 && idx < 3 ? idx + 1 : undefined;
  };

  return (
    <div className="relative min-h-screen bg-[#FFF7EE] text-[#3D1A0E] selection:bg-[#F26522]/25 selection:text-[#C4161C] overflow-hidden">
      {/* ═══════════ VỆT SÁNG CAM NỀN TRANG ═══════════ */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 select-none opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 900px 480px at 50% -100px, rgba(242,101,34,0.16), transparent 72%), " +
            "radial-gradient(circle 620px at 8% 42%, rgba(255,223,126,0.20), transparent 62%), " +
            "radial-gradient(circle 560px at 92% 74%, rgba(196,22,28,0.08), transparent 60%)",
        }}
      />
      <GoldenDust className="fixed inset-0 z-0 pointer-events-none" count={22} />

      {/* ═══════════ 1. HERO GRADIENT CAM — CHỮ HIỆU HÀNH TRÌNH 3 TỐT ═══════════ */}
      <section
        className="relative z-10 overflow-hidden pt-12 pb-12 sm:pt-16 sm:pb-16 text-white"
        style={{ background: "linear-gradient(140deg, #F26522 0%, #DE3A12 55%, #C4161C 100%)" }}
      >
        {/* Tia sáng + hoa văn trang trí nhẹ */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            background: "repeating-conic-gradient(from 0deg at 82% 18%, rgba(255,255,255,0.35) 0deg 2.2deg, transparent 2.2deg 14deg)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -bottom-32 h-96 w-96 rounded-full opacity-30 blur-3xl"
          style={{ background: "radial-gradient(circle, #FFDF7E 0%, transparent 70%)" }}
        />

        <div className="relative mx-auto max-w-6xl px-4 text-center">
          {/* Nhãn cổng */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-white/12 px-4 py-1.5 backdrop-blur-md"
          >
            <span className="h-2 w-2 rounded-full bg-[#FFDF7E] animate-ping" />
            <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.22em] text-white">
              Cổng Thanh niên Trường học
            </span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 text-xs sm:text-sm font-black uppercase tracking-[0.35em] text-[#FFDF7E]"
          >
            Ban Thanh niên Trường học
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-2 font-serif-display text-5xl sm:text-7xl md:text-8xl lg:text-[96px] font-black leading-none tracking-tight uppercase text-white"
            style={{ textShadow: "0 8px 28px rgba(122,18,8,0.45)" }}
          >
            HÀNH TRÌNH 3 TỐT
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="mx-auto mt-5 max-w-2xl text-xs sm:text-base leading-relaxed text-white/90"
          >
            Bình chọn những gương mặt rực rỡ nhất của tuổi trẻ học đường — nơi bản lĩnh Đạo đức, khát vọng Học tập
            và sức sống Thể lực cùng thăng hoa trong Kỷ nguyên vươn mình của dân tộc.
          </motion.p>

          {/* HÀNG NÚT CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-4"
          >
            {!session ? (
              <Button
                size="lg"
                className="h-12 border border-white/60 bg-white text-[#C4161C] font-black px-8 rounded-2xl shadow-[0_10px_30px_rgba(122,18,8,0.35)] hover:bg-[#FFF7EE] transition-all"
                onClick={() => router.push("/dang-nhap")}
              >
                <PenLine className="h-4.5 w-4.5" /> Đăng nhập để tiếp lửa
              </Button>
            ) : canSubmit ? (
              <Button
                size="lg"
                className="h-12 border border-white/60 bg-white text-[#C4161C] font-black px-8 rounded-2xl shadow-[0_10px_30px_rgba(122,18,8,0.35)] hover:bg-[#FFF7EE] transition-all"
                onClick={() => setSubmitOpen(true)}
              >
                <Sparkles className="h-4.5 w-4.5" /> Gửi câu chuyện vinh danh của bạn
              </Button>
            ) : (
              <span className="rounded-2xl border border-white/35 bg-white/12 px-5 py-3 text-xs text-white backdrop-blur-md">
                Tài khoản Cán bộ có thể bình chọn — Bài dự thi dành cho Đoàn viên - Hội viên.
              </span>
            )}

            <div className="flex items-center gap-2 text-xs text-white/90 font-medium">
              <Check className="h-3.5 w-3.5 text-[#FFDF7E]" /> 1 tài khoản = 1 bài dự thi · 1 phiếu bình chọn
            </div>
          </motion.div>

          {/* Countdown nổi trên hero */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-9 flex justify-center"
          >
            <RadialHUDCountdown days={cd.days} hours={cd.hours} minutes={cd.minutes} seconds={cd.seconds} />
          </motion.div>
        </div>
      </section>

      <GoldenThread className="mx-auto max-w-5xl px-4" />

      {/* ═══════════ HONORBOARD — BẢNG GƯƠNG THEO DANH HIỆU (THAY TRỐNG ĐỒNG) ═══════════ */}
      <HonorBoard topByHonor={topByHonor} onOpen={openDetail} />

      {/* ═══════════ BÀI DỰ THI CỦA TÔI (NẾU CÓ) ═══════════ */}
      {myStory ? (
        <section className="relative z-10 mx-auto max-w-6xl px-4 pb-4">
          <div
            className={cn(
              "flex flex-wrap items-center gap-3 rounded-2xl border px-5 py-4 shadow-sm",
              myStory.status === "APPROVED" && "border-emerald-300 bg-emerald-50 text-emerald-800",
              myStory.status === "PENDING" && "border-amber-300 bg-amber-50 text-amber-800",
              myStory.status === "REJECTED" && "border-rose-300 bg-rose-50 text-rose-800"
            )}
          >
            {myStory.status === "APPROVED" ? (
              <>
                <Award className="h-5 w-5 text-emerald-600" />
                <p className="text-sm">
                  Bài dự thi của bạn đã được duyệt và đang trong danh sách bình chọn — <strong>{myStory.voteCount} phiếu</strong>.
                </p>
              </>
            ) : myStory.status === "PENDING" ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                <p className="text-sm">Bài của bạn đang chờ Ban biên tập phê duyệt — thường hoàn thành trong vòng 24 giờ.</p>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                <p className="text-sm">
                  Bài của bạn bị từ chối: <strong>{myStory.rejectionReason ?? "không rõ lý do"}</strong>
                </p>
              </>
            )}
            {myStory.status !== "APPROVED" ? (
              <div className="ml-auto flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-rose-300 bg-white text-rose-700 hover:bg-rose-100"
                  disabled={withdrawing}
                  onClick={() => void handleWithdraw()}
                >
                  {withdrawing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5" />}
                  {myStory.status === "REJECTED" ? "Hủy để đăng lại" : "Hủy đăng bài"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#F26522]/40 bg-white text-[#C4161C] hover:bg-[#FFF1E4]"
                  onClick={() => setSubmitOpen(true)}
                >
                  Xem lại bài đăng
                </Button>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* ═══════════ 2. BENTO GRID — TIÊU CHÍ QUY CHẾ + THỐNG KÊ ═══════════ */}
      <BentoGrid cd={cd} stats={stats} giftNote={campaign?.giftNote} year={campaign?.year ?? 2026} />

      <GoldenThread className="mx-auto max-w-5xl px-4 py-8" />

      {/* ═══════════ 3. TOP GƯƠNG MẶT VINH DANH (CAROUSEL) ═══════════ */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pt-4">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#F26522]/30 bg-[#FFF1E4] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#C4161C]">
              <Flame className="h-3 w-3 text-[#F26522]" /> Dẫn đầu vinh danh toàn quốc
            </div>
            <h2 className="mt-2 font-serif-display text-2xl sm:text-4xl font-black text-[#C4161C]">
              Những gương danh hiệu tiêu biểu
            </h2>
            <p className="mt-1 text-xs text-[#7A4A33]">
              Kéo ngang hoặc dùng phím điều hướng để chiêm ngưỡng những bài dự thi nhận được sự tiếp lửa nhiều nhất
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-xl border border-[#F26522]/25 bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#C4161C]">
              TRANG {Math.min(topPage, topTotalPages)} / {topTotalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                aria-label="Trang trước"
                onClick={() => swiperRef.current?.slidePrev()}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#F26522]/30 bg-white text-[#C4161C] shadow-sm hover:border-[#F26522] hover:bg-[#FFF1E4] transition-all"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="Trang sau"
                onClick={() => swiperRef.current?.slideNext()}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#F26522]/30 bg-white text-[#C4161C] shadow-sm hover:border-[#F26522] hover:bg-[#FFF1E4] transition-all"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {loading && stories.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-sm text-[#F26522]/70">
            <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#F26522]" /> Đang tải danh sách vinh danh…
          </div>
        ) : topStories.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-[#F26522]/30 bg-white/70 px-6 py-16 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-[#F26522]" />
            <p className="mt-3 font-semibold text-[#C4161C]">Chưa có câu chuyện nào được duyệt</p>
            <p className="mt-1 text-xs text-[#7A4A33]">Hãy là người đầu tiên đăng câu chuyện phấn đấu của bạn!</p>
          </div>
        ) : (
          <Swiper
            onSwiper={(s) => (swiperRef.current = s)}
            modules={[FreeMode]}
            freeMode={{ enabled: true, momentumBounce: false }}
            grabCursor
            slidesPerView={1.15}
            spaceBetween={20}
            breakpoints={{
              640: { slidesPerView: 2.2 },
              768: { slidesPerView: 3.25 },
              1024: { slidesPerView: 4.2 },
            }}
            loop={topStories.length > perView}
            onRealIndexChange={(s) => setTopPage(Math.min(topTotalPages, Math.floor(s.realIndex / perView) + 1))}
            className="!px-1 !py-4"
          >
            {topStories.map((s) => (
              <SwiperSlide key={s.id} className="!w-auto">
                <div className="w-[250px] sm:w-[268px]">
                  <CdttbCard
                    story={s}
                    year={campaign?.year ?? 2026}
                    rank={rankOf(s.id)}
                    voted={myVoteStoryId === s.id}
                    canVote={!ended}
                    onVote={handleVote}
                    onOpen={openDetail}
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        )}
      </section>

      {/* ═══════════ 4. BẢNG VÀNG — CHIA 3 NHÓM DANH HIỆU ═══════════ */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-16">
        <div className="border-t border-[#F26522]/20 pt-10">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#C4161C]">
                <Award className="h-4 w-4" /> Bảng vàng bình chọn toàn quốc
              </p>
              <h2 className="mt-2 font-serif-display text-2xl sm:text-4xl font-black text-[#C4161C]">
                Tất cả hành trình phấn đấu
              </h2>
            </div>
            <p className="text-xs text-[#F26522]/90 font-medium">
              Hiển thị {stats.approvedStories} câu chuyện · {stats.totalVotes} lượt tiếp lửa
            </p>
          </div>

          {/* BỘ LỌC VÀ TÌM KIẾM */}
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[#F26522]/25 bg-white p-3 shadow-sm">
            <div className="flex rounded-xl border border-[#F26522]/25 bg-[#FFF6EE] p-1">
              {(
                [
                  { key: "hot", label: "Nhiều phiếu nhất 🔥" },
                  { key: "new", label: "Mới nhất ✨" },
                ] as { key: "hot" | "new"; label: string }[]
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setSort(t.key);
                    setPage(1);
                  }}
                  className={cn(
                    "rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all",
                    sort === t.key
                      ? "bg-gradient-to-r from-[#F26522] to-[#C4161C] text-white shadow-sm"
                      : "text-[#7A4A33]/70 hover:text-[#C4161C]"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#F26522]/60" />
              <input
                type="text"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm theo tên học sinh hoặc trường…"
                className="w-full rounded-xl border border-[#F26522]/25 bg-[#FFFDF9] pl-9 pr-3 py-2 text-xs text-[#3D1A0E] placeholder-stone-400 focus:border-[#F26522] focus:outline-none focus:ring-1 focus:ring-[#F26522]/40 transition-colors"
              />
            </div>

            <div className="w-full sm:w-auto min-w-[200px]">
              <select
                value={provinceId ?? ""}
                onChange={(e) => {
                  setProvinceId(e.target.value ? Number(e.target.value) : null);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-[#F26522]/25 bg-[#FFFDF9] px-3 py-2 text-xs text-[#C4161C] focus:border-[#F26522] focus:outline-none transition-colors"
              >
                <option value="">Tất cả tỉnh, thành phố</option>
                {provinces.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* DANH SÁCH CHIA THEO NHÓM DANH HIỆU */}
          {loading ? (
            <div className="flex h-64 items-center justify-center text-sm text-[#F26522]/70">
              <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#F26522]" /> Đang tải dữ liệu bình chọn…
            </div>
          ) : stories.length === 0 ? (
            <div className="mt-8 rounded-3xl border border-dashed border-[#F26522]/30 bg-white/70 px-6 py-20 text-center">
              <p className="text-base font-semibold text-[#C4161C]">Không tìm thấy câu chuyện nào khớp bộ lọc</p>
              <p className="mt-1 text-xs text-[#7A4A33]/80">Hãy thử đổi từ khóa tìm kiếm hoặc lọc theo tỉnh thành khác.</p>
            </div>
          ) : (
            <>
              {HONOR_GROUPS.map((honor) => {
                const groupStories = stories.filter((s) => (s.honorLevel ?? "TRUONG") === honor);
                if (groupStories.length === 0) return null;
                return (
                  <div key={honor} className="mt-9">
                    <div className="mb-4 flex items-center gap-2.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#F26522] to-[#C4161C] px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-white shadow-sm">
                        <Medal className="h-3.5 w-3.5" /> {HONOR_LEVEL_LABEL[honor]}
                      </span>
                      <span className="text-[11px] font-semibold text-stone-500">{groupStories.length} bài dự thi</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 sm:gap-x-6 sm:gap-y-10">
                      {groupStories.map((s, i) => (
                        <CdttbCard
                          key={s.id}
                          story={s}
                          year={campaign?.year ?? 2026}
                          rank={sort === "hot" ? (page === 1 && i < 3 ? i + 1 : undefined) : undefined}
                          voted={myVoteStoryId === s.id}
                          canVote={!ended}
                          onVote={handleVote}
                          onOpen={openDetail}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}

              {totalPages > 1 ? (
                <div className="mt-12 flex items-center justify-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="border-[#F26522]/30 bg-white text-[#C4161C] hover:bg-[#FFF1E4] disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" /> Trước
                  </Button>
                  <span className="rounded-xl border border-[#F26522]/25 bg-white px-3.5 py-1.5 text-xs font-bold text-[#C4161C]">
                    Trang {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="border-[#F26522]/30 bg-white text-[#C4161C] hover:bg-[#FFF1E4] disabled:opacity-40"
                  >
                    Sau <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      {/* ═══════════ 5. GIỚI THIỆU VỀ DANH HIỆU — QUY CHẾ + LINK XÉT CHỌN CỦA TW ═══════════ */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-20">
        <div className="overflow-hidden rounded-[28px] border border-[#F26522]/25 bg-white shadow-[0_14px_45px_rgba(193,73,26,0.10)]">
          {/* Đầu section */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F26522]/15 bg-[#FFF6EE] px-6 py-5 sm:px-8">
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#C4161C]">
                <ScrollText className="h-4 w-4" /> Giới thiệu về danh hiệu
              </p>
              <h2 className="mt-1.5 font-serif-display text-xl sm:text-3xl font-black text-[#3D1A0E]">
                "Học sinh 3 tốt" &amp; "Học sinh 3 rèn luyện"
              </h2>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-hs3t.png" alt="Logo Học sinh 3 tốt" className="h-16 w-auto sm:h-20" loading="lazy" />
          </div>

          <div className="grid gap-6 px-6 py-7 sm:px-8 lg:grid-cols-[1.15fr_0.85fr]">
            {/* Cột trái: thuyết minh quy chế */}
            <div>
              <p className="text-sm leading-relaxed text-[#5B3A2A]">
                Danh hiệu <strong className="text-[#C4161C]">"Học sinh 3 tốt"</strong> (Đạo đức tốt · Học tập tốt · Thể lực tốt)
                được Ban Bí thư TW Đoàn ban hành theo <strong>Quyết định số 317-QĐ/TWĐTN-TNTH ngày 09/11/2023</strong>, áp dụng
                giai đoạn 2023 – 2027. Danh hiệu <strong className="text-[#C4161C]">"Học sinh 3 rèn luyện"</strong> ban hành theo{" "}
                <strong>Quyết định số 633-QĐ/TWĐTN-TNTH ngày 15/3/2024</strong>. Tiêu chí xét chọn theo Điều 4 Quy chế,
                đã hợp nhất điều chỉnh tại Thông báo số 630-TB/TWĐTN-CTTTN ngày 10/10/2025:
              </p>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
                {[
                  { icon: "🤝", name: "Đạo đức tốt", note: "6 tiêu chí — hạnh kiểm, công tác Đoàn - Đội, tình nguyện…" },
                  { icon: "📚", name: "Học tập tốt", note: "3 tiêu chí — học lực, giải học sinh giỏi, khoa học kỹ thuật" },
                  { icon: "🏅", name: "Thể lực tốt", note: "3 tiêu chí — chuẩn thể lực, Thanh niên khỏe, giải TDTT" },
                ].map((g) => (
                  <div key={g.name} className="rounded-2xl border border-[#F26522]/20 bg-[#FFF9F2] p-3.5">
                    <p className="text-sm font-black text-[#C4161C]">
                      {g.icon} {g.name}
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-[#7A4A33]">{g.note}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#F26522]/40 bg-white text-[#C4161C] hover:bg-[#FFF1E4]"
                  onClick={() => router.push("/hoc-sinh-3-tot/quy-che")}
                >
                  <ScrollText className="h-3.5 w-3.5" /> Toàn văn quy chế
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#F26522]/40 bg-white text-[#C4161C] hover:bg-[#FFF1E4]"
                  onClick={() => router.push("/hoc-sinh-3-tot")}
                >
                  <Medal className="h-3.5 w-3.5" /> Hồ sơ &amp; theo dõi tiêu chí
                </Button>
              </div>
            </div>

            {/* Cột phải: quy trình xét chọn cấp TW */}
            <div className="rounded-2xl border border-[#F26522]/20 bg-[#FFF9F2] p-5">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-[#C4161C]">
                <ShieldCheck className="h-3.5 w-3.5" /> Quy trình xét chọn cấp Trung ương
              </p>
              <ol className="mt-3 space-y-2.5">
                {TW_SELECTION.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs leading-relaxed text-[#5B3A2A]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F26522] to-[#C4161C] text-[10px] font-black text-white">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>

              <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800">
                  <Clock3 className="h-3.5 w-3.5" /> Đã hết thời hạn nộp hồ sơ năm học 2025 – 2026
                </p>
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-amber-700/90">
                  Hệ thống xét chọn nhận hồ sơ từ 10/10 đến {TW_SELECTION.deadline}; tỉnh, thành đoàn xác nhận trước{" "}
                  {TW_SELECTION.confirmDeadline}. Hẹn gặp các em ở kỳ xét chọn năm học tới!
                </p>
              </div>

              <div className="mt-4 flex flex-col gap-2">
                <Button
                  className="h-10 w-full rounded-xl bg-gradient-to-r from-[#F26522] to-[#C4161C] text-xs font-black text-white shadow-md hover:brightness-110"
                  onClick={() => window.open(TW_SELECTION.url, "_blank", "noopener")}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Web xét chọn của TW Đoàn
                </Button>
                <button
                  type="button"
                  onClick={() => window.open(TW_SELECTION.guideUrl, "_blank", "noopener")}
                  className="text-center text-[11px] font-semibold text-[#F26522] underline-offset-2 hover:underline"
                >
                  Hướng dẫn sử dụng hệ thống xét chọn →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MODAL GỬI BÀI THI */}
      <SubmitModal
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onSubmitted={() => {
          toast("Đã gửi bài — chờ duyệt trong 24 giờ nhé!", "success");
          void load();
        }}
      />

      {/* ═══════════ MODAL CHI TIẾT 3 CỘT ═══════════ */}
      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Câu chuyện của ${detail.studentName}` : ""}
        wide
        className="max-w-6xl xl:max-w-7xl border-2 border-[#F26522]/50 bg-[#FFFDF9] text-stone-900 shadow-[0_25px_80px_rgba(0,0,0,0.4)]"
        footer={
          detail ? (
            <div className="flex w-full items-center justify-between">
              <span className="text-xs font-semibold text-stone-700">
                Tổng cộng <strong className="text-[#C4161C] font-black text-sm sm:text-base">{detail.voteCount}</strong> phiếu bình chọn
              </span>
              <Button
                onClick={() => {
                  const s = detail;
                  void handleVote(s);
                }}
                disabled={ended || myVoteStoryId === detail.id}
                className={cn(
                  "flex items-center gap-1.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all px-4 py-2",
                  myVoteStoryId === detail.id
                    ? "border border-amber-300 bg-amber-100/90 text-amber-950 cursor-default"
                    : "border border-[#F26522] bg-gradient-to-r from-[#F26522] to-[#C4161C] text-white hover:brightness-110 hover:shadow-lg active:scale-[0.98]"
                )}
              >
                <Heart className={cn("h-4 w-4", myVoteStoryId === detail.id ? "fill-amber-600 text-amber-600" : "fill-white text-white")} />
                {myVoteStoryId === detail.id ? "Đã bình chọn" : `Bình chọn cho ${detail.studentName}`}
              </Button>
            </div>
          ) : null
        }
      >
        {detail ? (() => {
          const parsed = parseStoryAndAchievements(detail.story);
          const achievements = detail.achievements?.trim()
            ? parseAchievementsText(detail.achievements)
            : parsed.achievements;
          const striveText = parsed.striveText;

          return (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              {/* CỘT 1 (TRÁI): BỨC HÌNH + THÔNG TIN CÁ NHÂN NGAY DƯỚI HÌNH */}
              <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-3">
                <div className="relative overflow-hidden rounded-2xl border-2 border-[#F26522]/50 bg-gradient-to-b from-[#FFF3E2] to-[#FFE8D6] p-1.5 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={detail.photoDataUrl ?? detail.photoThumbDataUrl}
                    alt={`Ảnh của ${detail.studentName}`}
                    className="max-h-72 w-full rounded-xl object-contain bg-stone-900/5 mx-auto"
                  />
                </div>

                {/* THÔNG TIN CÁ NHÂN NGAY DƯỚI HÌNH — chuẩn theo ảnh thực tế */}
                <div className="space-y-1.5 px-0.5">
                  <h3 className="font-serif-display text-xl sm:text-2xl font-black uppercase tracking-wide text-[#C4161C]">
                    {detail.studentName}
                  </h3>
                  <p className="text-xs sm:text-sm font-semibold leading-relaxed text-stone-700">
                    {detail.className ? `Lớp ${detail.className} · ` : ""}
                    {detail.orgDisplayName || detail.schoolName}
                    {detail.wardName ? ` · ${detail.wardName}` : ""}
                    {detail.provinceName ? ` · ${detail.provinceName}` : ""}
                  </p>

                  {detail.honorLevel ? (
                    <div className="pt-1">
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#F26522]/35 bg-[#FFF1E4] px-2.5 py-1 text-[11px] font-bold text-[#C4161C]">
                        <Award className="h-3.5 w-3.5 text-[#F26522]" />
                        {HONOR_LEVEL_LABEL[detail.honorLevel] ?? "Danh hiệu đã đạt"}
                      </span>
                    </div>
                  ) : null}

                  {detail.quote ? (
                    <div className="mt-2 rounded-lg border-l-3 border-[#F26522]/60 bg-[#FFF6EE] p-2.5 text-xs italic text-stone-700 shadow-2xs">
                      &ldquo;{detail.quote}&rdquo;
                    </div>
                  ) : null}
                </div>
              </div>

              {/* CỘT 2 (GIỮA): QUÁ TRÌNH PHẤN ĐẤU */}
              <div className="md:col-span-4 lg:col-span-5 flex flex-col max-h-[68vh] overflow-y-auto thin-scrollbar rounded-2xl border border-stone-200/90 bg-white p-4 sm:p-5 shadow-xs">
                <div className="sticky top-0 -mt-1 mb-3 bg-white/95 backdrop-blur-xs pb-2.5 border-b border-stone-200 flex items-center justify-between z-10">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#C4161C] flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-[#F26522]" /> Quá trình phấn đấu
                  </span>
                  <span className="text-[11px] text-stone-500 font-medium">
                    Cập nhật {new Date(detail.createdAt).toLocaleDateString("vi-VN")}
                  </span>
                </div>
                <div className="flex-1 text-stone-800">
                  <StoryContent content={striveText} />
                </div>
              </div>

              {/* CỘT 3 (PHẢI): CỘT MÀU VÀNG CHỨA CÁC Ô VÀNG VINH DANH THÀNH TÍCH NỔI BẬT KẾ BÊN QUÁ TRÌNH PHẤN ĐẤU */}
              <div className="md:col-span-4 lg:col-span-4 flex flex-col max-h-[68vh] overflow-y-auto thin-scrollbar">
                <GoldenAchievementColumn achievements={achievements} studentName={detail.studentName} />
              </div>
            </div>
          );
        })() : null}
      </Modal>

      {/* Overlay chi tiết đang tải ảnh full */}
      {detailLoading ? (
        <div className="pointer-events-none fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-[#F26522]/35 bg-white/95 px-4 py-2 text-xs font-bold text-[#C4161C] shadow-xl backdrop-blur-md">
          <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin text-[#F26522]" /> Đang tải ảnh độ nét cao…
        </div>
      ) : null}
    </div>
  );
}
