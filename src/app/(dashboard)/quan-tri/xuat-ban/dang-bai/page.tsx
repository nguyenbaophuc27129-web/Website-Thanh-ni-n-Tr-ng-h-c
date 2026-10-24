"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  Trash2,
  ImagePlus,
  Link2,
  X,
  Plus,
  Sparkles,
  Calendar,
  DollarSign,
  Tag,
  FileText,
  Bookmark,
  Check,
  Globe,
  Upload,
  AlertCircle,
  HelpCircle,
  Clock,
  ShieldCheck,
  Layers,
  Search,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { EVENT_KEYWORDS, SECTION_TAGS } from "@/data/categories";
import type { PublishedPost } from "@/types";
import { slugify, formatDateTime, formatNumber } from "@/lib/utils";

const STANDARD_CATEGORIES = [
  "Thời sự",
  "Thanh niên trường học",
  "Hoạt động Đoàn - Hội",
  "Chuyển đổi số & Đổi mới sáng tạo",
  "Khen thưởng - Gương sáng",
  "Học sinh 3 tốt",
  "Khoa học trẻ",
  "Đảng viên trẻ",
  "Kỹ năng & Hướng nghiệp",
  "Văn bản - Chỉ đạo",
];

const PREDEFINED_ATTRIBUTES = [
  { key: "TIEU_DIEM", label: "Tin tiêu điểm (Hero spotlight)" },
  { key: "NOI_BAT", label: "Tin nổi bật" },
  { key: "TIN_NONG", label: "Tin nóng (Hot news)" },
  { key: "GHIM_DAU_TRANG", label: "Ghim đầu trang" },
  { key: "KHONG_BINH_LUAN", label: "Tắt bình luận" },
];

function DangBaiInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id") ? Number(searchParams.get("id")) : null;

  const { publishedPosts, savePost, setPostStatus } = useStore();
  const { session } = useAuth();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Form State
  const [postId, setPostId] = useState<number | null>(editId);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [content, setContent] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [coverDataUrl, setCoverDataUrl] = useState<string | null>(null);
  const [imageCaption, setImageCaption] = useState("");
  const [status, setStatus] = useState<PublishedPost["status"]>("DRAFT");
  const [isFeatured, setIsFeatured] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string>("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(["Thanh niên trường học"]);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [postAttributes, setPostAttributes] = useState<string[]>([]);
  const [customAttributeInput, setCustomAttributeInput] = useState("");
  const [relatedPosts, setRelatedPosts] = useState<string[]>([]);
  const [relatedTopics, setRelatedTopics] = useState<string[]>([]);
  const [customTopicInput, setCustomTopicInput] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [royaltyAmount, setRoyaltyAmount] = useState<number>(0);
  const [royaltyNotes, setRoyaltyNotes] = useState("");

  // SEO State
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoKeywords, setSeoKeywords] = useState("");

  // Modals & previews
  const [previewOpen, setPreviewOpen] = useState(false);
  const [relatedPostModalOpen, setRelatedPostModalOpen] = useState(false);
  const [relatedSearch, setRelatedSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Load existing post if editing
  useEffect(() => {
    if (editId) {
      const existing = publishedPosts.find((p) => p.id === editId);
      if (existing) {
        setPostId(existing.id);
        setTitle(existing.title || "");
        setSubtitle(existing.subtitle || existing.excerpt || "");
        setContent(existing.content || "");
        setCoverUrl(existing.coverUrl || "");
        setCoverDataUrl(existing.coverDataUrl || null);
        setImageCaption(existing.imageCaption || "");
        setStatus(existing.status);
        setIsFeatured(existing.isFeatured);
        setPublishedAt(existing.publishedAt ? existing.publishedAt.slice(0, 16) : "");
        setSelectedCategories(existing.categoryNames || ["Thanh niên trường học"]);
        setPostAttributes(existing.postAttributes || (existing.isFeatured ? ["TIEU_DIEM"] : []));
        setRelatedPosts(existing.relatedPosts || []);
        setRelatedTopics(existing.relatedTopics || []);
        setInternalNotes(existing.internalNotes || "");
        setRoyaltyAmount(existing.royaltyAmount || 0);
        setRoyaltyNotes(existing.royaltyNotes || "");
        setSeoTitle(existing.seoTitle || existing.title || "");
        setSeoDescription(existing.metaDescription || existing.excerpt || "");
        setSeoKeywords(existing.seoKeywords || "");
      }
    }
  }, [editId, publishedPosts]);

  // Handle Cover File Upload
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Vui lòng chọn tệp định dạng hình ảnh (PNG, JPG, WebP).", "warning");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast("Dung lượng ảnh tối đa là 10MB.", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCoverDataUrl(reader.result as string);
      toast("Đã tải ảnh đại diện bài viết thành công!", "success");
    };
    reader.readAsDataURL(file);
  };

  // Editor toolbar helper
  const insertText = (before: string, after: string = "", placeholder: string = "") => {
    const el = textareaRef.current;
    if (!el) {
      setContent((prev) => prev + before + placeholder + after);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = content.slice(start, end) || placeholder;
    const next = content.slice(0, start) + before + selected + after + content.slice(end);
    setContent(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 40);
  };

  const insertImage = () => {
    const url = window.prompt("Nhập đường dẫn hình ảnh chèn vào bài (URL https://):", "https://");
    if (!url || url === "https://") return;
    const caption = window.prompt("Nhập chú thích ảnh (tùy chọn):", "") || "";
    insertText(`\n\n![${caption}](${url})` + (caption ? `\n*${caption}*\n\n` : "\n\n"));
  };

  const insertLink = () => {
    const url = window.prompt("Nhập địa chỉ liên kết (URL):", "https://");
    if (!url || url === "https://") return;
    const label = window.prompt("Nhập tên hiển thị cho liên kết:", "Xem thêm thông tin") || "Liên kết";
    insertText(`[${label}](${url})`);
  };

  // Character and word counts
  const wordCount = useMemo(() => {
    return content.trim() ? content.trim().split(/\s+/).length : 0;
  }, [content]);

  const charCount = useMemo(() => content.length, [content]);

  // Toggle category
  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const addCustomCategory = () => {
    const trimmed = customCategoryInput.trim();
    if (!trimmed) return;
    if (!selectedCategories.includes(trimmed)) {
      setSelectedCategories((prev) => [...prev, trimmed]);
    }
    setCustomCategoryInput("");
  };

  // Toggle attribute
  const toggleAttribute = (attr: string) => {
    setPostAttributes((prev) => {
      const next = prev.includes(attr) ? prev.filter((a) => a !== attr) : [...prev, attr];
      if (attr === "TIEU_DIEM") {
        setIsFeatured(next.includes("TIEU_DIEM"));
      }
      return next;
    });
  };

  const addCustomAttribute = () => {
    const trimmed = customAttributeInput.trim();
    if (!trimmed) return;
    if (!postAttributes.includes(trimmed)) {
      setPostAttributes((prev) => [...prev, trimmed]);
    }
    setCustomAttributeInput("");
  };

  // Related topics
  const addRelatedTopic = () => {
    const trimmed = customTopicInput.trim();
    if (!trimmed) return;
    if (!relatedTopics.includes(trimmed)) {
      setRelatedTopics((prev) => [...prev, trimmed]);
    }
    setCustomTopicInput("");
  };

  const removeRelatedTopic = (topic: string) => {
    setRelatedTopics((prev) => prev.filter((t) => t !== topic));
  };

  // Save / Publish logic
  const handleSave = async (targetStatus?: PublishedPost["status"]) => {
    if (!title.trim()) {
      toast("Vui lòng nhập tiêu đề chính của bài viết!", "warning");
      return;
    }
    if (!content.trim()) {
      toast("Nội dung bài viết không được để trống!", "warning");
      return;
    }

    setSaving(true);
    try {
      const finalStatus = targetStatus ?? status;
      const id = postId ?? Date.now();
      const generatedSlug = slugify(title) || `bai-viet-${id}`;

      const postToSave: PublishedPost = {
        id,
        activityId: null,
        slug: generatedSlug,
        title: title.trim(),
        subtitle: subtitle.trim(),
        excerpt: subtitle.trim() || content.trim().slice(0, 200),
        content: content.trim(),
        coverSeed: (id % 9) + 1,
        coverDataUrl: coverDataUrl || undefined,
        coverUrl: coverUrl.trim() || undefined,
        imageCaption: imageCaption.trim() || undefined,
        status: finalStatus,
        isFeatured: postAttributes.includes("TIEU_DIEM") || isFeatured,
        publishedAt:
          finalStatus === "PUBLISHED"
            ? (publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString())
            : undefined,
        viewCount: 0,
        authorOrgUnitName: session?.orgUnitName || "Ban Công tác Thanh Thiếu Nhi",
        editorAccountId: session?.accountId || 1,
        categoryNames: selectedCategories.length > 0 ? selectedCategories : ["Thanh niên trường học"],
        postAttributes,
        relatedPosts,
        relatedTopics,
        internalNotes: internalNotes.trim() || undefined,
        royaltyAmount: Number(royaltyAmount) || 0,
        royaltyNotes: royaltyNotes.trim() || undefined,
        seoTitle: seoTitle.trim() || title.trim(),
        metaDescription: seoDescription.trim() || subtitle.trim(),
        seoKeywords: seoKeywords.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      savePost(postToSave);
      setPostId(id);
      setStatus(finalStatus);

      if (finalStatus === "PUBLISHED") {
        toast(`Đã xuất bản bài viết "${title}" lên Cổng thông tin thành công!`, "success");
      } else if (finalStatus === "UNPUBLISHED") {
        toast("Đã gỡ bài viết xuống (chuyển về bản lưu trữ).", "success");
      } else {
        toast("Đã lưu bản nháp bài viết vào hệ thống!", "success");
      }

      // Update URL query id without full reload
      router.replace(`/quan-tri/xuat-ban/dang-bai?id=${id}`);
    } catch {
      toast("Có lỗi xảy ra khi lưu bài viết. Vui lòng kiểm tra lại.", "warning");
    } finally {
      setSaving(false);
    }
  };

  const effectiveCover = coverDataUrl || coverUrl.trim() || "";

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20">
      {/* Top Header sticky */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/quan-tri/xuat-ban"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              title="Quay lại danh sách tin bài"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 sm:text-lg">
                  {postId ? "Chỉnh sửa bài viết" : "Đăng bài viết mới"}
                </h1>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    status === "PUBLISHED"
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : status === "UNPUBLISHED"
                      ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                      : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                  }`}
                >
                  {status === "PUBLISHED" ? "Đã xuất bản" : status === "UNPUBLISHED" ? "Đã gỡ bài" : "Bản nháp"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Giao diện xuất bản chuyên nghiệp chuẩn toà soạn · Tự động đồng bộ máy chủ
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-4 w-4" /> Xem trước
            </Button>
            <Button variant="secondary" size="sm" onClick={() => handleSave("DRAFT")} disabled={saving}>
              <Save className="h-4 w-4" /> Lưu nháp
            </Button>
            {status === "PUBLISHED" ? (
              <Button variant="danger" size="sm" onClick={() => handleSave("UNPUBLISHED")} disabled={saving}>
                <Trash2 className="h-4 w-4" /> Gỡ bài
              </Button>
            ) : null}
            <Button size="sm" onClick={() => handleSave("PUBLISHED")} disabled={saving}>
              <Send className="h-4 w-4" /> {status === "PUBLISHED" ? "Cập nhật bài" : "Xuất bản ngay"}
            </Button>
          </div>
        </div>
      </header>

      {/* Main 2-column layout */}
      <main className="mx-auto mt-6 max-w-7xl px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* CỘT TRÁI: Nội dung chính & Tối ưu SEO (8 cột) */}
          <div className="space-y-6 lg:col-span-8">
            {/* Khối soạn thảo chính */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              {/* Tiêu đề chính */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Tiêu đề chính <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] font-medium text-slate-400">{title.length} ký tự</span>
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Nhập tiêu đề chính bài viết (VD: Khai mạc Hội thi Tin học trẻ toàn quốc 2026...)"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-base font-semibold text-slate-900 outline-none transition placeholder:font-normal placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50"
                />
              </div>

              {/* Tiêu đề phụ / Sa-pô */}
              <div className="mt-5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Tiêu đề phụ / Sa-pô tóm tắt
                  </label>
                  <span className="text-[11px] font-medium text-slate-400">{subtitle.length} ký tự</span>
                </div>
                <textarea
                  rows={3}
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="Đoạn văn mở đầu tóm tắt ngắn gọn tinh thần hoặc điểm nhấn quan trọng nhất của bài viết..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100/50"
                />
              </div>

              {/* Trình soạn thảo văn bản phong phú */}
              <div className="mt-6 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Nội dung bài viết <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>
                      Số từ: <strong className="text-slate-800">{wordCount}</strong>
                    </span>
                    <span>·</span>
                    <span>
                      Ký tự: <strong className="text-slate-800">{charCount}</strong>
                    </span>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-slate-200">
                  {/* Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => insertText("**", "**", "chữ in đậm")}
                        title="In đậm (Bold)"
                        className="flex h-7 w-7 items-center justify-center rounded font-bold text-slate-700 hover:bg-slate-200"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => insertText("*", "*", "chữ in nghiêng")}
                        title="In nghiêng (Italic)"
                        className="flex h-7 w-7 items-center justify-center rounded font-serif italic text-slate-700 hover:bg-slate-200"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => insertText("<u>", "</u>", "chữ gạch chân")}
                        title="Gạch chân (Underline)"
                        className="flex h-7 w-7 items-center justify-center rounded underline text-slate-700 hover:bg-slate-200"
                      >
                        U
                      </button>
                      <button
                        type="button"
                        onClick={() => insertText("~~", "~~", "chữ gạch ngang")}
                        title="Gạch ngang (Strikethrough)"
                        className="flex h-7 w-7 items-center justify-center rounded line-through text-slate-700 hover:bg-slate-200"
                      >
                        S
                      </button>

                      <span className="mx-1 h-4 w-px bg-slate-300" />

                      <button
                        type="button"
                        onClick={() => insertText("\n## ", "\n", "Tiêu đề đoạn chính")}
                        title="Tiêu đề mục lớn (Heading 2)"
                        className="rounded px-2 py-1 font-bold text-slate-700 hover:bg-slate-200 text-[11px]"
                      >
                        H2
                      </button>
                      <button
                        type="button"
                        onClick={() => insertText("\n### ", "\n", "Tiêu đề mục nhỏ")}
                        title="Tiêu đề đoạn nhỏ (Heading 3)"
                        className="rounded px-2 py-1 font-bold text-slate-700 hover:bg-slate-200 text-[11px]"
                      >
                        H3
                      </button>

                      <span className="mx-1 h-4 w-px bg-slate-300" />

                      <button
                        type="button"
                        onClick={() => insertText("\n- ", "\n", "Nội dung danh sách")}
                        title="Danh sách gạch đầu dòng"
                        className="rounded px-2 py-1 text-slate-700 hover:bg-slate-200 text-[11px]"
                      >
                        • Danh sách
                      </button>
                      <button
                        type="button"
                        onClick={() => insertText("\n1. ", "\n", "Nội dung bước 1")}
                        title="Danh sách đánh số"
                        className="rounded px-2 py-1 text-slate-700 hover:bg-slate-200 text-[11px]"
                      >
                        1. Số thứ tự
                      </button>
                      <button
                        type="button"
                        onClick={() => insertText("\n> ", "\n", "Nội dung câu trích dẫn")}
                        title="Khối trích dẫn (Blockquote)"
                        className="rounded px-2 py-1 font-mono text-slate-700 hover:bg-slate-200 text-[11px]"
                      >
                        “ ” Trích dẫn
                      </button>

                      <span className="mx-1 h-4 w-px bg-slate-300" />

                      <button
                        type="button"
                        onClick={insertImage}
                        title="Chèn hình ảnh vào bài viết"
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-50"
                      >
                        <ImagePlus className="h-3.5 w-3.5" /> Chèn ảnh
                      </button>
                      <button
                        type="button"
                        onClick={insertLink}
                        title="Chèn liên kết đường dẫn"
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-blue-700 hover:bg-blue-50"
                      >
                        <Link2 className="h-3.5 w-3.5" /> Chèn link
                      </button>
                    </div>
                  </div>

                  <textarea
                    ref={textareaRef}
                    rows={16}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Viết hoặc dán nội dung chi tiết của bài viết tại đây. Hỗ trợ định dạng in đậm, in nghiêng, tiêu đề đoạn H2/H3, danh sách và hình ảnh minh họa..."
                    className="w-full bg-white p-4 text-sm leading-relaxed text-slate-800 outline-none transition focus:bg-slate-50/30"
                  />
                </div>
              </div>
            </div>

            {/* Khối Tối ưu SEO & Tìm kiếm */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-800">Tối ưu SEO &amp; Máy tìm kiếm</h3>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Tít hấp dẫn (SEO Title)</label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    placeholder={title || "Tiêu đề hiển thị trên kết quả tìm kiếm Google (tối đa 65 ký tự)"}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Giới thiệu ngắn (Meta Description)</label>
                  <textarea
                    rows={2}
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                    placeholder={subtitle || "Mô tả ngắn gọn xuất hiện dưới kết quả tìm kiếm (120 - 160 ký tự)"}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Từ khóa SEO (Keywords)</label>
                  <input
                    type="text"
                    value={seoKeywords}
                    onChange={(e) => setSeoKeywords(e.target.value)}
                    placeholder="thanh niên trường học, đoàn trường, học sinh 3 tốt, chuyển đổi số"
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>

            {/* Thanh tác vụ dưới cùng (Bottom action bar) */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => router.push("/quan-tri/xuat-ban")}>
                  Đóng
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setPreviewOpen(true)}>
                  <Eye className="h-4 w-4" /> Xem trước
                </Button>
              </div>

              <div className="flex items-center gap-2">
                {status === "PUBLISHED" ? (
                  <Button variant="danger" size="sm" onClick={() => handleSave("UNPUBLISHED")} disabled={saving}>
                    Gỡ tin
                  </Button>
                ) : null}
                <Button variant="secondary" size="sm" onClick={() => handleSave("DRAFT")} disabled={saving}>
                  <Save className="h-4 w-4" /> Lưu tin nháp
                </Button>
                <Button size="sm" onClick={() => handleSave("PUBLISHED")} disabled={saving}>
                  <Send className="h-4 w-4" /> {status === "PUBLISHED" ? "Cập nhật" : "Xuất bản"}
                </Button>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: Thuộc tính, Ảnh đại diện, Chuyên mục, Tin liên quan, Nhuận bút (4 cột) */}
          <div className="space-y-6 lg:col-span-4">
            {/* 1. Thuộc tính bài viết */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Bookmark className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800">Thuộc tính bài viết</h3>
                </div>
              </div>

              <div className="mt-3.5 space-y-2.5">
                {PREDEFINED_ATTRIBUTES.map((attr) => {
                  const checked = postAttributes.includes(attr.key);
                  return (
                    <label
                      key={attr.key}
                      className="flex cursor-pointer items-center gap-2.5 text-xs text-slate-700 hover:text-slate-900"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAttribute(attr.key)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={checked ? "font-semibold text-blue-700" : ""}>{attr.label}</span>
                    </label>
                  );
                })}

                {/* Thuộc tính tùy chỉnh */}
                {postAttributes
                  .filter((a) => !PREDEFINED_ATTRIBUTES.some((p) => p.key === a))
                  .map((customAttr) => (
                    <div
                      key={customAttr}
                      className="flex items-center justify-between rounded-lg bg-blue-50 px-2.5 py-1 text-xs text-blue-700"
                    >
                      <span>{customAttr}</span>
                      <button
                        type="button"
                        onClick={() => toggleAttribute(customAttr)}
                        className="text-blue-500 hover:text-rose-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                {/* Thêm thuộc tính */}
                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    value={customAttributeInput}
                    onChange={(e) => setCustomAttributeInput(e.target.value)}
                    placeholder="+ Thêm thuộc tính khác"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomAttribute();
                      }
                    }}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400"
                  />
                  <button
                    type="button"
                    onClick={addCustomAttribute}
                    className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-blue-100 hover:text-blue-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Ảnh đại diện (Chuẩn 470x250) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ImagePlus className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800">Ảnh đại diện bài viết</h3>
                </div>
                <span className="text-[10px] font-semibold text-slate-400">Chuẩn 470 × 250</span>
              </div>

              <div className="mt-3.5 space-y-3">
                {/* Khung preview */}
                <div className="relative aspect-[470/250] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  {effectiveCover ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={effectiveCover}
                        alt="Ảnh đại diện bài viết"
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCoverDataUrl(null);
                          setCoverUrl("");
                        }}
                        className="absolute right-2 top-2 rounded-lg bg-black/60 p-1 text-white hover:bg-black/80"
                        title="Bỏ ảnh"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-4 text-center text-slate-400">
                      <ImagePlus className="h-8 w-8 text-slate-300" />
                      <p className="mt-1 text-xs">Chưa có ảnh đại diện</p>
                      <p className="text-[10px] text-slate-400">Kích thước chuẩn: 470 × 250 px</p>
                    </div>
                  )}
                </div>

                {/* Nút upload hoặc URL */}
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleCoverUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" /> Tải ảnh từ máy
                  </Button>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-600">Hoặc nhập URL ảnh:</label>
                  <input
                    type="text"
                    value={coverUrl}
                    onChange={(e) => setCoverUrl(e.target.value)}
                    placeholder="https://... ảnh trực tiếp"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-600">Mô tả / Chú thích ảnh:</label>
                  <input
                    type="text"
                    value={imageCaption}
                    onChange={(e) => setImageCaption(e.target.value)}
                    placeholder="Ảnh: Ban Tổ chức trao thưởng cho các tập thể xuất sắc..."
                    className="mt-1 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-400"
                  />
                </div>
              </div>
            </div>

            {/* 3. Chuyên mục */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800">Chuyên mục</h3>
                </div>
              </div>

              <div className="mt-3.5 space-y-2">
                <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                  {STANDARD_CATEGORIES.map((cat) => {
                    const checked = selectedCategories.includes(cat);
                    return (
                      <label
                        key={cat}
                        className="flex cursor-pointer items-center gap-2.5 text-xs text-slate-700 hover:text-slate-900"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCategory(cat)}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className={checked ? "font-semibold text-blue-700" : ""}>{cat}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Thêm chuyên mục khác */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100">
                  <input
                    type="text"
                    value={customCategoryInput}
                    onChange={(e) => setCustomCategoryInput(e.target.value)}
                    placeholder="+ Thêm chuyên mục khác"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomCategory();
                      }
                    }}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400"
                  />
                  <button
                    type="button"
                    onClick={addCustomCategory}
                    className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-blue-100 hover:text-blue-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Tin liên quan */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800">Tin liên quan</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRelatedPostModalOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Thêm tin
                </button>
              </div>

              <div className="mt-3 space-y-2">
                {relatedPosts.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Chưa có tin liên quan nào được gắn.</p>
                ) : (
                  relatedPosts.map((titleStr, idx) => (
                    <div
                      key={idx}
                      className="flex items-start justify-between gap-2 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-700"
                    >
                      <span className="line-clamp-2">{titleStr}</span>
                      <button
                        type="button"
                        onClick={() => setRelatedPosts((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 5. Chủ đề liên quan */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Bookmark className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-800">Chủ đề liên quan</h3>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {relatedTopics.map((top) => (
                    <span
                      key={top}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700"
                    >
                      #{top}
                      <button
                        type="button"
                        onClick={() => removeRelatedTopic(top)}
                        className="hover:text-rose-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <input
                    type="text"
                    value={customTopicInput}
                    onChange={(e) => setCustomTopicInput(e.target.value)}
                    placeholder="+ Thêm chủ đề liên quan"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addRelatedTopic();
                      }
                    }}
                    className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-blue-400"
                  />
                  <button
                    type="button"
                    onClick={addRelatedTopic}
                    className="rounded-lg bg-slate-100 p-1.5 text-slate-600 hover:bg-blue-100 hover:text-blue-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 6. Ghi chú bài viết */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">Ghi chú bài viết</h3>
              </div>
              <textarea
                rows={3}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Ghi chú nội bộ cho ban biên tập hoặc nhắc nhở chỉnh sửa..."
                className="mt-3 w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-700 outline-none focus:border-blue-400"
              />
            </div>

            {/* 7. Ngày giờ đăng */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <Calendar className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-800">Ngày giờ đăng</h3>
              </div>
              <div className="mt-3 space-y-1.5">
                <input
                  type="datetime-local"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400"
                />
                <p className="text-[11px] text-slate-400">
                  Để trống để tự động lấy thời điểm xuất bản hiện tại.
                </p>
              </div>
            </div>

            {/* 8. Nhuận bút */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-800">Nhuận bút</h3>
              </div>

              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600">Số tiền nhuận bút (VNĐ):</label>
                  <input
                    type="number"
                    value={royaltyAmount || ""}
                    onChange={(e) => setRoyaltyAmount(Number(e.target.value))}
                    placeholder="Ví dụ: 300000"
                    step={50000}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-400"
                  />
                  {royaltyAmount > 0 ? (
                    <p className="mt-1 text-[11px] font-medium text-emerald-600">
                      Định mức: {formatNumber(royaltyAmount)} đ
                    </p>
                  ) : null}
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-600">Ghi chú nhuận bút:</label>
                  <input
                    type="text"
                    value={royaltyNotes}
                    onChange={(e) => setRoyaltyNotes(e.target.value)}
                    placeholder="Chuyển khoản theo số TK tác giả hoặc đoàn trường..."
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Chọn tin liên quan */}
      <Modal
        open={relatedPostModalOpen}
        onClose={() => setRelatedPostModalOpen(false)}
        title="Chọn tin bài liên quan"
        wide
      >
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={relatedSearch}
              onChange={(e) => setRelatedSearch(e.target.value)}
              placeholder="Tìm kiếm bài viết theo tiêu đề..."
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-4 text-xs text-slate-800 outline-none focus:border-blue-400"
            />
          </div>

          <div className="max-h-72 space-y-1.5 overflow-y-auto">
            {publishedPosts
              .filter((p) => p.id !== postId)
              .filter((p) =>
                relatedSearch.trim()
                  ? p.title.toLowerCase().includes(relatedSearch.toLowerCase())
                  : true
              )
              .map((p) => {
                const isSelected = relatedPosts.includes(p.title);
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (isSelected) {
                        setRelatedPosts((prev) => prev.filter((t) => t !== p.title));
                      } else {
                        setRelatedPosts((prev) => [...prev, p.title]);
                      }
                    }}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border p-2.5 text-xs transition ${
                      isSelected
                        ? "border-blue-300 bg-blue-50/70 text-blue-900"
                        : "border-slate-100 hover:border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <div className="pr-3">
                      <p className="font-semibold">{p.title}</p>
                      <p className="text-[10px] text-slate-400">{p.authorOrgUnitName} · {p.categoryNames?.join(", ")}</p>
                    </div>
                    {isSelected ? (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    ) : (
                      <span className="h-5 w-5 shrink-0 rounded-full border border-slate-200" />
                    )}
                  </div>
                );
              })}
          </div>

          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={() => setRelatedPostModalOpen(false)}>
              Hoàn tất
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Xem trước bài viết */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Xem trước bài viết trên giao diện Cổng thông tin"
        wide
      >
        <article className="space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {selectedCategories.map((cat) => (
              <span
                key={cat}
                className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-blue-700"
              >
                {cat}
              </span>
            ))}
          </div>

          <h1 className="text-xl font-black leading-tight text-slate-900 sm:text-2xl">
            {title || "Tiêu đề bài viết sẽ hiển thị tại đây"}
          </h1>

          <div className="flex items-center gap-3 border-y border-slate-100 py-2 text-xs text-slate-500">
            <span>{session?.orgUnitName || "Ban Công tác Thanh Thiếu Nhi"}</span>
            <span>·</span>
            <span>{formatDateTime(new Date().toISOString())}</span>
          </div>

          {subtitle ? (
            <p className="font-serif text-sm font-semibold italic leading-relaxed text-slate-700">
              {subtitle}
            </p>
          ) : null}

          {effectiveCover ? (
            <figure className="space-y-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={effectiveCover}
                alt={title}
                className="aspect-[470/250] w-full rounded-2xl object-cover shadow-sm"
              />
              {imageCaption ? (
                <figcaption className="text-center font-serif text-xs italic text-slate-500">
                  {imageCaption}
                </figcaption>
              ) : null}
            </figure>
          ) : null}

          <div className="whitespace-pre-line text-sm leading-relaxed text-slate-800">
            {content || "Nội dung bài viết sẽ xuất hiện tại đây..."}
          </div>

          {relatedPosts.length > 0 ? (
            <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-800">Tin liên quan</h4>
              <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-blue-700">
                {relatedPosts.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </article>
      </Modal>
    </div>
  );
}

export default function DangBaiPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-sm text-slate-500">Đang tải trang đăng bài...</div>}>
      <DangBaiInner />
    </Suspense>
  );
}
