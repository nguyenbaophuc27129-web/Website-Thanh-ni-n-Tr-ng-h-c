"use client";

import { useEffect, useRef, useState } from "react";
import {
  ImagePlus,
  Loader2,
  Trash2,
  Bold,
  Italic,
  List,
  Heading1,
  Heading2,
  Sparkles,
  Eye,
  Edit3,
  HelpCircle,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { submitStory } from "@/lib/binh-chon";
import { useAuth } from "@/lib/auth-context";
import { useStore } from "@/lib/store-context";
import { PhotoStudio } from "./photo-studio";
import { StoryContent } from "./story-content";
import { HONOR_LEVEL_LABEL } from "./palette";
import type { HonorLevel } from "@/types";

const kb = (dataUrl: string) => Math.round((dataUrl.length * 0.75) / 1024);

/** Nén ảnh thư viện: co về tối đa 1400px cạnh dài, JPEG 0.82 (~150-300KB) */
async function compressGalleryImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("Không đọc được tệp ảnh"));
    r.readAsDataURL(file);
  });
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Tệp không phải ảnh hợp lệ"));
    img.src = dataUrl;
  });
  const ratio = Math.min(1, 1400 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * ratio));
  canvas.height = Math.max(1, Math.round(img.height * ratio));
  canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
  let out = canvas.toDataURL("image/jpeg", 0.82);
  // Vẫn nặng → hạ chất dần
  let q = 0.7;
  while (kb(out) > 1450 && q >= 0.4) {
    out = canvas.toDataURL("image/jpeg", q);
    q -= 0.15;
  }
  return out;
}

export const GUIDED_QUESTIONS = [
  {
    num: "1",
    short: "Hành trình gắn bó phong trào",
    question: "Bạn có thể giới thiệu hành trình gắn bó với phong trào “Học sinh 3 tốt”?",
  },
  {
    num: "2",
    short: "Người động viên, khích lệ",
    question: "Ai là người đầu tiên động viên, khích lệ bạn trên hành trình này?",
  },
  {
    num: "3",
    short: "Kỷ niệm đáng nhớ và Tự hào nhất",
    question: "Trong chuyến hành trình phấn đấu đạt danh hiệu \"Học sinh 3 tốt\", bạn có kỷ niệm gì đáng nhớ nhất không? Điều gì là điều tự hào nhất?",
  },
  {
    num: "4",
    short: "Khó khăn đã đối diện và vượt qua",
    question: "Trong chuyến hành trình phấn đấu đạt danh hiệu \"Học sinh 3 tốt\", bạn có đối diện với khó khăn gì không?",
  },
  {
    num: "5",
    short: "Hình mẫu trong tương lai",
    question: "Trong những năm tới, bạn muốn mình trở thành người như thế nào?",
  },
  {
    num: "6",
    short: "Thông điệp gửi các bạn học sinh 2026 - 2027",
    question: "Thông điệp của bạn dành cho các bạn học sinh đang trên hành trình phấn đấu đạt đến danh hiệu \"Học sinh 3 tốt\" năm học 2026 - 2027.",
  },
];

const STORY_TEMPLATE = `1. Quá trình phấn đấu của bản thân:
Hành trình tuổi trẻ của tôi luôn gắn liền với lý tưởng cống hiến, không ngừng nỗ lực học tập và noi theo tư tưởng, đạo đức, phong cách Hồ Chí Minh.

a. Hành trình gắn bó với phong trào “Học sinh 3 tốt”:
- Tôi bắt đầu biết đến phong trào từ khi bước chân vào trường THPT...

b. Người đầu tiên động viên, khích lệ:
- Thầy cô và gia đình luôn là điểm tựa lớn nhất giúp tôi kiên định theo đuổi mục tiêu...

c. Kỷ niệm đáng nhớ nhất & Điều tự hào nhất:
- Kỷ niệm đáng nhớ nhất trong quá trình phấn đấu của tôi là...

d. Những khó khăn đã đối diện & Cách vượt qua:
- Đã có những thời điểm cân bằng giữa học tập văn hóa và hoạt động phong trào là thử thách lớn...

e. Người tôi muốn trở thành trong những năm tới:
- Trong những năm tới, tôi muốn trở thành một công dân trẻ giàu tri thức và khát vọng cống hiến...

f. Thông điệp dành cho các bạn học sinh năm học 2026 - 2027:
- "Thông điệp của tôi dành cho các bạn học sinh đang trên hành trình phấn đấu đạt đến danh hiệu 'Học sinh 3 tốt' năm học 2026 - 2027: Hãy luôn giữ vững niềm tin, dám bước ra khỏi vùng an toàn và rèn luyện không ngừng!"`;

const ACHIEVEMENTS_TEMPLATE = `Thành tích nổi bật:
- Đạt danh hiệu Học sinh Xuất sắc / Học sinh Giỏi liên tục các năm học.
- Đạt giải thưởng trong các kỳ thi học sinh giỏi các cấp và các cuộc thi sáng tạo khoa học kỹ thuật dành cho thanh thiếu niên.
- Tiên phong tham gia các chiến dịch tình nguyện: Hoa phượng đỏ, Tiếp sức mùa thi, Ngày Chủ nhật xanh.
- Đạt danh hiệu Học sinh 3 tốt và tích cực tham gia các hoạt động Đoàn, Hội tại trường học.`;

export function SubmitModal({
  open,
  onClose,
  onSubmitted,
  credentialRef,
}: {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  /** Google ID token đã xác thực — dùng khi người gửi KHÔNG đăng nhập tài khoản */
  credentialRef?: { current: string };
}) {
  const { session } = useAuth();
  const { orgUnits } = useStore();
  const sessionOrgName = orgUnits.find((u) => u.id === session?.orgUnitId)?.name ?? "";
  const [studentName, setStudentName] = useState("");
  const [className, setClassName] = useState("");
  const [quote, setQuote] = useState("");
  const [story, setStory] = useState("");
  const [achievements, setAchievements] = useState("");
  /** Danh hiệu đã đạt — HS tự khai, admin chỉnh được khi duyệt */
  const [honor, setHonor] = useState<HonorLevel>("TRUONG");
  /** Đơn vị tự nhập — prefill theo tài khoản, chỉ đè khi học sinh chưa tự sửa */
  const [orgName, setOrgName] = useState("");
  const [wardName, setWardName] = useState("");
  const [provinceName, setProvinceName] = useState("");
  const orgTouchedRef = useRef(false);
  const [full, setFull] = useState("");
  const [thumb, setThumb] = useState("");
  /** Thư viện tối đa 3 ảnh kèm caption tự do theo sở thích HS (YCCN 12/11/2026) */
  const [galleryItems, setGalleryItems] = useState<{ dataUrl: string; caption: string }[]>([]);
  const galleryPickRef = useRef<HTMLInputElement>(null);
  const gallerySlotRef = useRef<number>(0);
  const [studioOpen, setStudioOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) {
      setError("");
      setSending(false);
      setActiveTab("edit");
      setAchievements("");
      setWardName("");
      setProvinceName("");
      setGalleryItems([]);
      orgTouchedRef.current = false;
    }
  }, [open]);

  // Prefill đơn vị theo tài khoản (cho tới khi học sinh tự sửa ô này)
  useEffect(() => {
    if (open && !orgTouchedRef.current && !orgName) setOrgName(sessionOrgName);
  }, [open, sessionOrgName, orgName]);

  const insertFormat = (before: string, after: string = "", placeholder: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const val = textarea.value;
    const selected = val.substring(start, end) || placeholder;
    const next = val.substring(0, start) + before + selected + after + val.substring(end);
    setStory(next);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  const applyTemplate = () => {
    if (story.trim().length > 30 || achievements.trim().length > 30) {
      if (!window.confirm("Thao tác này sẽ thay thế nội dung hiện tại bằng mẫu sườn chuẩn cho cả 2 ô. Bạn có chắc không?")) {
        return;
      }
    }
    setStory(STORY_TEMPLATE);
    setAchievements(ACHIEVEMENTS_TEMPLATE);
    if (textareaRef.current) textareaRef.current.focus();
  };

  const valid =
    studentName.trim().length >= 2 &&
    story.trim().length >= 30 &&
    Boolean(full) &&
    Boolean(thumb);

  const send = async () => {
    if (!valid || sending) return;
    setSending(true);
    setError("");
    const res = await submitStory({
      studentName: studentName.trim(),
      className: className.trim() || undefined,
      quote: quote.trim() || undefined,
      story: story.trim(),
      achievements: achievements.trim() || undefined,
      orgDisplayName: orgName.trim() || undefined,
      wardName: wardName.trim() || undefined,
      provinceName: provinceName.trim() || undefined,
      honorLevel: honor,
      photoDataUrl: full,
      photoThumbDataUrl: thumb,
      gallery: galleryItems.filter((g) => g.dataUrl).length > 0
        ? galleryItems
            .filter((g) => g.dataUrl)
            .slice(0, 3)
            .map((g) => ({ dataUrl: g.dataUrl, caption: g.caption.trim() || undefined }))
        : undefined,
      credential: session ? undefined : credentialRef?.current || undefined,
    });
    setSending(false);
    if (!res.ok) {
      setError(res.error ?? "Không gửi được bài — thử lại.");
      return;
    }
    // Gửi thành công — xoá trắng form để lần đăng sau không dính nội dung cũ (mỗi TK 1 bài)
    setStudentName("");
    setClassName("");
    setQuote("");
    setStory("");
    setAchievements("");
    setHonor("TRUONG");
    setOrgName("");
    setWardName("");
    setProvinceName("");
    setFull("");
    setThumb("");
    setGalleryItems([]);
    orgTouchedRef.current = false;
    onSubmitted();
    onClose();
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Đăng câu chuyện & Thành tích Học sinh 3 tốt"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Huỷ
            </Button>
            <Button onClick={send} disabled={!valid || sending}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {sending ? "Đang gửi…" : "Gửi bài dự thi"}
            </Button>
          </>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Họ và tên học sinh" required>
            <Input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Nguyễn Văn A"
              maxLength={120}
            />
          </Field>
          <Field label="Lớp">
            <Input
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="12A1"
              maxLength={60}
            />
          </Field>
          <Field
            label="Trường / Đơn vị"
            hint="In trên khối thông tin khung ảnh (Đoàn trường) — có thể sửa theo ý bạn"
          >
            <Input
              value={orgName}
              onChange={(e) => {
                orgTouchedRef.current = true;
                setOrgName(e.target.value);
              }}
              placeholder={sessionOrgName || "THPT Marie Curie"}
              maxLength={120}
            />
          </Field>
          <Field label="Phường / Xã" hint="Địa bàn trường hoặc nơi cư trú">
            <Input
              value={wardName}
              onChange={(e) => setWardName(e.target.value)}
              placeholder="Phường Võ Thị Sáu"
              maxLength={120}
            />
          </Field>
          <Field label="Tỉnh / Thành phố" hint="Tỉnh hoặc Thành phố trực thuộc Trung ương">
            <Input
              value={provinceName}
              onChange={(e) => setProvinceName(e.target.value)}
              placeholder="Thành phố Hồ Chí Minh"
              maxLength={120}
            />
          </Field>
          <Field
            label="Danh hiệu đã đạt"
            required
            hint="Em tự khai theo hồ sơ đã được công nhận — Ban biên tập sẽ đối chiếu khi duyệt"
          >
            <Select value={honor} onChange={(e) => setHonor(e.target.value as HonorLevel)}>
              {(Object.keys(HONOR_LEVEL_LABEL) as HonorLevel[]).map((k) => (
                <option key={k} value={k}>
                  {HONOR_LEVEL_LABEL[k]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Châm ngôn sống"
            hint="Hiển thị trên khung ảnh (tối đa 300 ký tự)"
            className="sm:col-span-2"
          >
            <Input
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="Khát vọng kiến tạo trong kỷ nguyên vươn mình của dân tộc..."
              maxLength={300}
            />
          </Field>

          {/* KHUNG SOẠN THẢO QUÁ TRÌNH PHẤN ĐẤU & THÀNH TÍCH VỚI BỘ CÔNG CỤ ĐỊNH DẠNG */}
          <div className="sm:col-span-2 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-stone-800">
                Quá trình phấn đấu của bản thân <span className="text-red-500">*</span>
              </label>

              {/* Tab chuyển đổi Soạn thảo / Xem trước */}
              <div className="flex items-center rounded-lg border border-stone-200 bg-stone-100 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("edit")}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
                    activeTab === "edit"
                      ? "bg-white text-stone-900 shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  <Edit3 className="h-3 w-3" /> Soạn thảo
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 font-medium transition-colors ${
                    activeTab === "preview"
                      ? "bg-white text-[#C81E1E] shadow-xs"
                      : "text-stone-600 hover:text-stone-900"
                  }`}
                >
                  <Eye className="h-3 w-3" /> Xem trước hiển thị
                </button>
              </div>
            </div>

            {/* HỘP CÂU HỎI GỢI Ý ĐỊNH HƯỚNG BÀI VIẾT */}
            <div className="rounded-xl border border-amber-300/80 bg-gradient-to-br from-[#FFFDF0] via-amber-50/80 to-yellow-50/70 p-3 shadow-2xs">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-950">
                  <HelpCircle className="h-4 w-4 text-amber-600" />
                  <span>Câu hỏi gợi ý để hoàn thiện bài viết:</span>
                </div>
                <span className="text-[10px] text-amber-800/80 italic font-medium">Bấm vào câu hỏi để chèn vào bài</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {GUIDED_QUESTIONS.map((q) => (
                  <button
                    key={q.num}
                    type="button"
                    onClick={() => insertFormat(`\n**${q.num}. ${q.question}**\n- `, "\n", "Trả lời của bạn...")}
                    className="group flex items-start gap-2 rounded-lg border border-amber-200/90 bg-white/90 p-2 text-left hover:border-amber-400 hover:bg-white hover:shadow-xs transition-all text-xs"
                    title="Bấm để chèn câu hỏi này vào ô soạn thảo"
                  >
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F26522] to-[#C4161C] text-[10px] font-black text-white shadow-2xs">
                      {q.num}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-stone-800 group-hover:text-[#C4161C] line-clamp-2 leading-snug">
                        {q.question}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* THANH CÔNG CỤ ĐỊNH DẠNG (TOOLBAR) */}
            {activeTab === "edit" ? (
              <div className="rounded-xl border border-stone-200 bg-white overflow-hidden focus-within:border-[#F26522] focus-within:ring-1 focus-within:ring-[#F26522] transition-all">
                <div className="flex flex-wrap items-center gap-1 border-b border-stone-200 bg-stone-50 px-2 py-1.5 text-xs text-stone-700">
                  <span className="text-[11px] font-semibold text-stone-500 mr-1 select-none">Công cụ:</span>
                  <button
                    type="button"
                    onClick={() => insertFormat("**", "**", "tiêu đề in đậm")}
                    className="inline-flex h-7 items-center gap-1 rounded px-2 font-bold hover:bg-stone-200 active:scale-95 transition-colors"
                    title="In đậm chữ (**nội dung**)"
                  >
                    <Bold className="h-3.5 w-3.5" />
                    <span>In đậm</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormat("*", "*", "chữ in nghiêng")}
                    className="inline-flex h-7 items-center gap-1 rounded px-2 italic hover:bg-stone-200 active:scale-95 transition-colors"
                    title="In nghiêng chữ (*nội dung*)"
                  >
                    <Italic className="h-3.5 w-3.5" />
                    <span>Nghiêng</span>
                  </button>
                  <span className="h-4 w-px bg-stone-200 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => insertFormat("\n1. ", ":\n", "Quá trình phấn đấu")}
                    className="inline-flex h-7 items-center gap-1 rounded px-2 font-semibold hover:bg-stone-200 active:scale-95 transition-colors"
                    title="Tạo mục lớn (1., 2., 3.)"
                  >
                    <Heading1 className="h-3.5 w-3.5 text-[#C81E1E]" />
                    <span>Mục lớn (1.)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormat("\na. ", ":\n", "Bản lĩnh chính trị vững vàng")}
                    className="inline-flex h-7 items-center gap-1 rounded px-2 font-semibold hover:bg-stone-200 active:scale-95 transition-colors"
                    title="Tạo tiểu mục (a., b., c.)"
                  >
                    <Heading2 className="h-3.5 w-3.5 text-[#E04A1F]" />
                    <span>Tiểu mục (a.)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormat("\n- ", "", "Thành tích nổi bật")}
                    className="inline-flex h-7 items-center gap-1 rounded px-2 hover:bg-stone-200 active:scale-95 transition-colors"
                    title="Danh sách gạch đầu dòng (- )"
                  >
                    <List className="h-3.5 w-3.5" />
                    <span>Gạch đầu dòng</span>
                  </button>
                  <div className="ml-auto">
                    <button
                      type="button"
                      onClick={applyTemplate}
                      className="inline-flex h-7 items-center gap-1 rounded-md bg-amber-100 px-2.5 text-xs font-semibold text-amber-900 hover:bg-amber-200 active:scale-95 transition-colors"
                      title="Chèn khung sườn bài mẫu chuẩn Học sinh 3 tốt"
                    >
                      <Sparkles className="h-3 w-3 text-amber-700" />
                      <span>Dùng mẫu gợi ý</span>
                    </button>
                  </div>
                </div>

                <textarea
                  ref={textareaRef}
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  placeholder="Kể câu chuyện phấn đấu, thành tích học tập, rèn luyện, tình nguyện của bạn... Có thể dùng các nút bên trên để tạo tiêu đề in đậm (1., 2., a., b.)."
                  className="w-full min-h-48 p-3 text-xs sm:text-sm text-stone-800 outline-none leading-relaxed resize-y"
                />
              </div>
            ) : (
              /* TAB XEM TRƯỚC HIỂN THỊ CHUẨN ĐẸP */
              <div className="rounded-xl border border-stone-200 bg-white p-4 min-h-48 max-h-72 overflow-y-auto">
                {story.trim() || achievements.trim() ? (
                  <div>
                    <p className="text-[11px] font-semibold text-emerald-700 mb-2 pb-1.5 border-b border-stone-100 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Xem trước định dạng hiển thị:
                    </p>
                    {story.trim() ? (
                      <>
                        <p className="text-[11px] font-semibold text-[#C81E1E] mt-2 mb-1">Quá trình phấn đấu:</p>
                        <StoryContent content={story} />
                      </>
                    ) : null}
                    {achievements.trim() ? (
                      <>
                        <p className="text-[11px] font-semibold text-[#C81E1E] mt-4 mb-1">Thành tích nổi bật:</p>
                        <StoryContent content={achievements} />
                      </>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs text-stone-400 italic text-center py-10">
                    Chưa có nội dung. Chuyển sang tab "Soạn thảo" hoặc bấm "Dùng mẫu gợi ý" để bắt đầu viết.
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between text-[11px] text-stone-500 px-1">
              <span>Tối thiểu 30 ký tự · đã nhập: {story.trim().length} ký tự (không giới hạn dung lượng)</span>
              <span>Nội dung được AI kiểm duyệt tự động</span>
            </div>
          </div>

          {/* Ô THÀNH TÍCH NỔI BẬT — nhập riêng, gạch đầu dòng tự hiển thị thành ô vàng vinh danh */}
          <div className="sm:col-span-2 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-stone-800">
                Thành tích nổi bật <span className="text-stone-400 font-normal">(không bắt buộc)</span>
              </label>
              <span className="text-[11px] text-stone-400">
                {achievements.trim().length} ký tự
              </span>
            </div>
            <div className="rounded-xl border border-stone-200 bg-white overflow-hidden focus-within:border-[#F26522] focus-within:ring-1 focus-within:ring-[#F26522] transition-all">
              <textarea
                value={achievements}
                onChange={(e) => setAchievements(e.target.value)}
                placeholder={'Liệt kê từng dòng một thành tích (mỗi dòng sẽ thành 1 ô vàng vinh danh), ví dụ:\n- Giải Nhất Học sinh giỏi Tin học cấp tỉnh (2025)\n- Học sinh Xuất sắc 3 năm liên tiếp\n- Đội trưởng đội bóng đá trường tham gia giải cấp thành phố'}
                className="w-full min-h-32 p-3 text-xs sm:text-sm text-stone-800 outline-none leading-relaxed resize-y"
              />
            </div>
          </div>

          {/* 3 ẢNH KÈM CAPTION TỰ DO — YCCN 12/11/2026: "kế bên cột thành tích cho nộp câu
              chuyện HS3T cho đăng thêm 3 tấm hình của HS và ghi caption tuỳ ý theo sở thích" */}
          <div className="sm:col-span-2 space-y-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-semibold text-stone-800">
                Bộ sưu tập ảnh của bạn{" "}
                <span className="text-stone-400 font-normal">(tối đa 3 tấm · caption viết gì cũng được)</span>
              </label>
              {galleryItems.length > 0 ? (
                <span className="text-[11px] text-stone-400">{galleryItems.filter((g) => g.dataUrl).length}/3 ảnh · {galleryItems.filter((g) => g.dataUrl).reduce((n, g) => n + kb(g.dataUrl), 0)} KB</span>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {[0, 1, 2].map((slot) => {
                const item = galleryItems[slot];
                if (!item) {
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => {
                        gallerySlotRef.current = slot;
                        galleryPickRef.current?.click();
                      }}
                      className="flex min-h-28 flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-2 py-3 text-center transition-all hover:border-[#F26522]/60 hover:bg-[#FFF6EE]"
                    >
                      <ImagePlus className="h-5 w-5 text-stone-400" />
                      <span className="text-[11px] font-medium text-stone-400">Chọn ảnh {slot + 1}</span>
                    </button>
                  );
                }
                return (
                  <div key={slot} className="space-y-1.5 rounded-xl border border-stone-200 bg-white p-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.dataUrl}
                      alt={`Ảnh ${slot + 1}`}
                      className="h-24 w-full rounded-lg border border-stone-100 object-cover"
                    />
                    <input
                      value={item.caption}
                      onChange={(e) =>
                        setGalleryItems((list) =>
                          list.map((g, gi) => (gi === slot ? { ...g, caption: e.target.value.slice(0, 300) } : g))
                        )
                      }
                      placeholder="Caption tuỳ ý..."
                      maxLength={300}
                      className="w-full rounded-md border border-stone-200 px-2 py-1 text-[11px] text-stone-700 outline-none focus:border-[#F26522]"
                    />
                    <div className="flex items-center justify-between px-0.5">
                      <span className="text-[10px] text-stone-400">{kb(item.dataUrl)} KB</span>
                      <button
                        type="button"
                        onClick={() =>
                          setGalleryItems((list) =>
                            list.map((g, gi) => (gi === slot ? { dataUrl: "", caption: "" } : g))
                          )
                        }
                        className="text-[10px] font-semibold text-rose-500 hover:text-rose-700"
                      >
                        Xoá
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <input
              ref={galleryPickRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                compressGalleryImage(f)
                  .then((dataUrl) => {
                    setGalleryItems((list) => {
                      if (list.some((g) => g.dataUrl === dataUrl)) return list;
                      const slot = gallerySlotRef.current;
                      const next = [...list];
                      while (next.length <= slot) next.push({ dataUrl: "", caption: "" });
                      next[slot] = { dataUrl, caption: "" };
                      return next;
                    });
                  })
                  .catch(() => setError("Không đọc được ảnh — chọn tệp ảnh khác nhé."));
              }}
            />
          </div>

          <Field
            label="Ảnh chân dung cắt nền"
            required
            hint={'Dùng xưởng ảnh để cắt nền bằng AI và đóng khung "Rực rỡ tuổi học sinh" đẹp chuẩn.'}
            className="sm:col-span-2"
          >
            {full ? (
              <div className="flex items-center gap-3 rounded-lg border border-stone-200 bg-stone-50 p-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumb}
                  alt="Ảnh dự thi"
                  className="h-20 w-16 rounded-md bg-gradient-to-b from-[#FFDF7E] via-[#F26522] to-[#C4161C] object-contain p-0.5"
                />
                <div className="text-xs text-stone-500">
                  <p className="font-medium text-stone-700">Đã sẵn sàng</p>
                  <p>Full {kb(full)} KB · Thu nhỏ {kb(thumb)} KB</p>
                </div>
                <div className="ml-auto flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setStudioOpen(true)}>
                    Sửa ảnh
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFull("");
                      setThumb("");
                    }}
                    aria-label="Bỏ ảnh"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setStudioOpen(true)}
                className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-doan-400 bg-doan-50 px-4 py-6 text-sm font-medium text-doan-700 hover:bg-doan-100"
              >
                <ImagePlus className="h-5 w-5" /> Mở xưởng ảnh — chọn ảnh, cắt nền AI, chọn nền &amp; bộ lọc
              </button>
            )}
          </Field>
        </div>

        {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p> : null}
      </Modal>

      <PhotoStudio
        open={studioOpen}
        onClose={() => setStudioOpen(false)}
        onDone={(f, t) => {
          setFull(f);
          setThumb(t);
          setStudioOpen(false);
        }}
        studentName={studentName}
        orgName={orgName}
        wardName={wardName}
        provinceName={provinceName}
      />
      {/* Loader AI gửi bài */}
      {sending ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-900/40">
          <div className="flex items-center gap-2 rounded-xl bg-white px-5 py-3.5 text-sm text-stone-700 shadow-xl">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang gửi bài và kiểm duyệt…
          </div>
        </div>
      ) : null}
      <button type="button" data-submit-valid={valid ? "1" : "0"} onClick={send} className="hidden" aria-hidden />
    </>
  );
}
