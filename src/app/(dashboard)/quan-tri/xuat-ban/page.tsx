"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Megaphone,
  Plus,
  Eye,
  Star,
  Trash2,
  Send,
  Globe,
  Sparkles,
  ImagePlus,
  X,
  Pencil,
  Link2,
  Loader2,
  PenSquare,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { PostStatusBadge } from "@/components/dashboard/status-badge";
import { PhotoPlaceholder } from "@/components/ui/photo-placeholder";
import { EVENT_KEYWORDS, SECTION_TAGS } from "@/data/categories";
import type { PublishedPost } from "@/types";
import { formatNumber, formatDateTime, slugify } from "@/lib/utils";

/** Kết quả trích xuất từ đường link (thật hoặc mô phỏng dự phòng) */
interface ImportedArticle {
  title: string;
  excerpt: string;
  content: string;
  imageUrl?: string;
  sourceUrl: string;
  mock: boolean;
}

/** Fallback khi trang chặn bot / hỏng: dựng bài mô phỏng từ slug của đường link */
function mockFromUrl(url: string): ImportedArticle {
  let host = "";
  let words = "Bài viết nhập từ đường link";
  try {
    const u = new URL(url);
    host = u.hostname.replace(/^www\./, "");
    const seg = u.pathname.split("/").filter(Boolean).pop() ?? "";
    const decoded = decodeURIComponent(seg).replace(/[-_]+/g, " ").replace(/\.(html?|php|aspx)$/i, "").trim();
    if (decoded.length >= 8) {
      words = decoded
        .split(" ")
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
        .join(" ");
    }
  } catch {
    // URL đã được kiểm tra hợp lệ trước khi gọi
  }
  const title = `Bài viết từ ${host}: ${words}`.slice(0, 120);
  return {
    title,
    excerpt: `Nội dung tóm tắt mô phỏng cho bài viết "${words}" lấy từ ${host} — hệ thống chưa đọc được trang gốc.`,
    content: [
      `Đây là bản nháp MÔ PHỎNG được tạo tự động từ đường link bạn nhập (nguồn: ${url}).`,
      `Trang gốc không cho phép trích xuất tự động (bị chặn bot, yêu cầu JavaScript hoặc trả về lỗi) nên hệ thống dựng khung bài viết để bạn biên tập tiếp.`,
      `Bạn hãy dán nội dung thật của bài báo vào ô bên dưới, sửa tiêu đề và tóm tắt rồi đăng công khai khi sẵn sàng.`,
    ].join("\n\n"),
    sourceUrl: url,
    mock: true,
  };
}

/** Thanh công cụ soạn thảo phong phú: In đậm, In nghiêng, H2, H3, Chèn ảnh, Chèn link, Trích dẫn, Đếm từ & ký tự */
function EditorToolbar({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (val: string) => void;
}) {
  const insertText = (before: string, after: string = "", placeholder: string = "") => {
    const el = textareaRef.current;
    if (!el) {
      onChange(value + before + placeholder + after);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + before + selected + after + value.slice(end);
    onChange(next);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 40);
  };

  const insertImage = () => {
    const url = window.prompt("Nhập đường dẫn hình ảnh (URL bắt đầu bằng https://):", "https://");
    if (!url || url === "https://") return;
    const caption = window.prompt("Nhập chú thích ảnh (tùy chọn):", "") || "";
    insertText(`\n\n![${caption}](${url})` + (caption ? `\n*${caption}*\n\n` : "\n\n"));
  };

  const insertLink = () => {
    const url = window.prompt("Nhập địa chỉ liên kết (URL):", "https://");
    if (!url || url === "https://") return;
    const label = window.prompt("Nhập tên hiển thị cho liên kết:", "Xem chi tiết") || "Liên kết";
    insertText(`[${label}](${url})`);
  };

  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  const chars = value.length;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-xl border border-b-0 border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-600">
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => insertText("**", "**", "chữ đậm")}
          title="In đậm (Bold)"
          className="flex h-7 w-7 items-center justify-center rounded font-bold hover:bg-stone-200 text-stone-800"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => insertText("*", "*", "chữ nghiêng")}
          title="In nghiêng (Italic)"
          className="flex h-7 w-7 items-center justify-center rounded italic font-serif hover:bg-stone-200 text-stone-800"
        >
          I
        </button>
        <span className="mx-1 h-4 w-px bg-stone-300" />
        <button
          type="button"
          onClick={() => insertText("\n## ", "\n", "Tiêu đề mục lớn")}
          title="Tiêu đề mục lớn (H2)"
          className="rounded px-2 py-1 font-bold text-[11px] hover:bg-stone-200 text-stone-800"
        >
          H2
        </button>
        <button
          type="button"
          onClick={() => insertText("\n### ", "\n", "Tiêu đề phụ")}
          title="Tiêu đề phụ (H3)"
          className="rounded px-2 py-1 font-bold text-[11px] hover:bg-stone-200 text-stone-800"
        >
          H3
        </button>
        <span className="mx-1 h-4 w-px bg-stone-300" />
        <button
          type="button"
          onClick={insertImage}
          title="Chèn hình ảnh từ URL"
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium hover:bg-stone-200 text-stone-800"
        >
          <ImagePlus className="h-3.5 w-3.5" /> Chèn ảnh
        </button>
        <button
          type="button"
          onClick={insertLink}
          title="Chèn liên kết"
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium hover:bg-stone-200 text-stone-800"
        >
          <Link2 className="h-3.5 w-3.5" /> Chèn link
        </button>
        <button
          type="button"
          onClick={() => insertText("\n> ", "\n", "Nội dung trích dẫn")}
          title="Trích dẫn (Quote)"
          className="rounded px-2 py-1 font-mono text-[11px] hover:bg-stone-200 text-stone-800"
        >
          “ ”
        </button>
      </div>

      <div className="font-mono text-[11px] text-stone-500">
        Từ: <strong className="text-stone-800">{words}</strong> · Ký tự:{" "}
        <strong className="text-stone-800">{chars}</strong>
      </div>
    </div>
  );
}

/** Chọn từ khóa sự kiện + chuyên mục trang chủ từ danh mục cố định */
function KeywordPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {EVENT_KEYWORDS.map((k) => {
          const active = value.includes(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => onChange(active ? value.filter((x) => x !== k) : [...value, k])}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                active
                  ? "border-doan-600 bg-doan-600 text-white"
                  : "border-stone-200 bg-white text-stone-600 hover:border-doan-300 hover:text-doan-700"
              }`}
            >
              #{k}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.12em] text-cyan-600">
          Chuyên mục trang chủ
        </span>
        {SECTION_TAGS.map((k) => {
          const active = value.includes(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => onChange(active ? value.filter((x) => x !== k) : [...value, k])}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                active
                  ? "border-cyan-600 bg-cyan-600 text-white"
                  : "border-cyan-200 bg-cyan-50/60 text-cyan-700 hover:border-cyan-400"
              }`}
            >
              {k}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function XuatBanPage() {
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();
  const [tab, setTab] = useState("all");

  // Tạo bài viết (thủ công hoặc từ hoạt động)
  const [createOpen, setCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState<"manual" | "activity">("manual");
  const [form, setForm] = useState({
    activityId: "",
    title: "",
    excerpt: "",
    content: "",
    coverUrl: "",
  });
  const [keywords, setKeywords] = useState<string[]>([]);
  const [coverDataUrl, setCoverDataUrl] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const createTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Chỉnh sửa bài đã có
  const [editing, setEditing] = useState<PublishedPost | null>(null);
  const [editForm, setEditForm] = useState({ title: "", excerpt: "", content: "", coverUrl: "" });
  const [editKeywords, setEditKeywords] = useState<string[]>([]);
  const [editCover, setEditCover] = useState<string | null | undefined>(undefined);
  const editCoverInputRef = useRef<HTMLInputElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Nhập tin từ đường link
  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<ImportedArticle | null>(null);
  const importTextareaRef = useRef<HTMLTextAreaElement>(null);

  const readCover = (file: File | undefined, setter: (v: string | null) => void) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Tệp không phải là hình ảnh.", "warning");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast("Ảnh bìa tối đa 2MB. Vui lòng chọn ảnh nhỏ hơn.", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setter(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const pickCover = (file: File | undefined) => readCover(file, setCoverDataUrl);
  const pickEditCover = (file: File | undefined) => readCover(file, setEditCover);

  const scope = useMemo(() => (session ? store.scopeIds(session) : []), [session, store]);

  const posts = useMemo(() => {
    return store.publishedPosts
      .filter((p) => (tab === "all" ? true : p.status === tab))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [store.publishedPosts, tab]);

  const confirmedActivities = useMemo(
    () => store.activities.filter((a) => scope.includes(a.orgUnitId) && a.confirmStatus === "CONFIRMED"),
    [store.activities, scope]
  );

  const counts = {
    all: store.publishedPosts.length,
    DRAFT: store.publishedPosts.filter((p) => p.status === "DRAFT").length,
    SCHEDULED: store.publishedPosts.filter((p) => p.status === "SCHEDULED").length,
    PUBLISHED: store.publishedPosts.filter((p) => p.status === "PUBLISHED").length,
    UNPUBLISHED: store.publishedPosts.filter((p) => p.status === "UNPUBLISHED").length,
  };

  const openManualCreate = () => {
    setCreateMode("manual");
    setForm({ activityId: "", title: "", excerpt: "", content: "", coverUrl: "" });
    setKeywords([]);
    setCoverDataUrl(null);
    setCreateOpen(true);
  };

  const openActivityCreate = () => {
    setCreateMode("activity");
    setForm({ activityId: "", title: "", excerpt: "", content: "", coverUrl: "" });
    setKeywords([]);
    setCoverDataUrl(null);
    setCreateOpen(true);
  };

  const handleCreate = () => {
    if (!session) return;
    if (!form.title.trim()) {
      toast("Vui lòng nhập tiêu đề bài viết.", "warning");
      return;
    }

    const actId = form.activityId ? Number(form.activityId) : null;
    const act = actId ? store.activities.find((a) => a.id === actId) : undefined;
    const excerpt =
      form.excerpt.trim() ||
      act?.summary.slice(0, 200) ||
      form.content.trim().slice(0, 180) ||
      form.title.trim();

    const derived = act?.categoryIds.map((cid) => store.contentCategories.find((c) => c.id === cid)?.name ?? "").filter(Boolean) ?? [];
    const categoryNames = Array.from(new Set([...derived, ...keywords]));

    const finalCover = form.coverUrl.trim() || coverDataUrl || undefined;

    store.createPostFromActivity(session, actId, form.title.trim(), excerpt, {
      content: form.content.trim() || act?.summary || "",
      categoryNames,
      metaDescription: excerpt.slice(0, 160),
      coverDataUrl: finalCover,
    });

    toast(actId ? "Đã tạo bản nháp từ hoạt động." : "Đã tạo bài viết thủ công mới thành công!");
    setCreateOpen(false);
    setForm({ activityId: "", title: "", excerpt: "", content: "", coverUrl: "" });
    setKeywords([]);
    setCoverDataUrl(null);
  };

  const runExtract = async () => {
    const url = importUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      toast("Nhập đường dẫn bắt đầu bằng http:// hoặc https://", "warning");
      return;
    }
    setImporting(true);
    setImported(null);
    try {
      const res = await fetch("/api/fetch-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; title?: string; excerpt?: string; content?: string; imageUrl?: string; error?: string }
        | null;
      if (!res.ok || !data?.ok || (!data.title && !data.content)) {
        throw new Error(data?.error ?? `HTTP ${res.status}`);
      }
      setImported({
        title: data.title?.trim() || "Bài viết nhập từ đường link",
        excerpt: data.excerpt?.trim() ?? "",
        content: data.content?.trim() ?? "",
        imageUrl: data.imageUrl,
        sourceUrl: url,
        mock: false,
      });
    } catch {
      setImported(mockFromUrl(url));
      toast("Không trích xuất được trang thật — hệ thống tạo bản nháp mô phỏng từ đường link.", "info");
    } finally {
      setImporting(false);
    }
  };

  const saveImported = () => {
    if (!session || !imported) return;
    const id = Date.now();
    store.savePost({
      id,
      activityId: null,
      slug: slugify(imported.title) || `bai-nhap-${id}`,
      title: imported.title.trim(),
      excerpt: imported.excerpt.trim(),
      content: imported.content,
      coverSeed: 1,
      coverDataUrl: imported.imageUrl ?? undefined,
      status: "DRAFT",
      isFeatured: false,
      viewCount: 0,
      authorOrgUnitName: store.orgName(session.orgUnitId),
      editorAccountId: session.accountId,
      categoryNames: [],
      metaDescription: imported.excerpt.trim().slice(0, 160),
      createdAt: new Date().toISOString(),
    });
    toast("Đã tạo bản nháp từ đường link. Bạn biên tập và đăng công khai khi sẵn sàng.");
    setImportOpen(false);
    setImported(null);
    setImportUrl("");
  };

  const openEdit = (p: PublishedPost) => {
    setEditing(p);
    setEditForm({
      title: p.title,
      excerpt: p.excerpt,
      content: p.content,
      coverUrl: p.coverDataUrl?.startsWith("http") ? p.coverDataUrl : "",
    });
    setEditKeywords(p.categoryNames);
    setEditCover(undefined);
  };

  const saveEdit = () => {
    if (!editing) return;
    if (!editForm.title.trim()) {
      toast("Tiêu đề bài viết không được để trống.", "warning");
      return;
    }

    let finalCover: string | undefined = undefined;
    if (editForm.coverUrl.trim()) {
      finalCover = editForm.coverUrl.trim();
    } else if (editCover === undefined) {
      finalCover = editing.coverDataUrl;
    } else {
      finalCover = editCover ?? undefined;
    }

    store.savePost({
      ...editing,
      title: editForm.title.trim(),
      excerpt: editForm.excerpt.trim(),
      content: editForm.content,
      categoryNames: editKeywords,
      metaDescription: editForm.excerpt.trim().slice(0, 160),
      coverDataUrl: finalCover,
    });
    toast("Đã cập nhật bài viết.");
    setEditing(null);
  };

  const changeStatus = (id: number, status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "UNPUBLISHED") => {
    store.setPostStatus(id, status);
    if (status === "PUBLISHED") {
      const post = store.publishedPosts.find((p) => p.id === id);
      toast(`Đã đăng "${post?.title.slice(0, 40)}…" — bài xuất hiện ngay trên trang Tin tức công khai.`);
    } else {
      toast("Đã cập nhật trạng thái bài viết.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-display text-2xl font-black tracking-tight text-stone-900">
            Biên tập &amp; Xuất bản tin bài
          </h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Biên tập tin bài thủ công hoặc liên kết từ hoạt động — Ban Công tác Thanh Thiếu Nhi giám sát, xuất bản công khai.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Link2 className="h-4 w-4" /> Nhập tin từ đường link
          </Button>
          <Button variant="secondary" onClick={openActivityCreate}>
            <Sparkles className="h-4 w-4" /> Tạo bài từ hoạt động
          </Button>
          <Button onClick={openManualCreate}>
            <PenSquare className="h-4 w-4" /> Viết bài mới (thủ công)
          </Button>
        </div>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "all", label: "Tất cả", count: counts.all },
          { value: "DRAFT", label: "Bản nháp", count: counts.DRAFT },
          { value: "SCHEDULED", label: "Hẹn giờ", count: counts.SCHEDULED },
          { value: "PUBLISHED", label: "Đã đăng", count: counts.PUBLISHED },
          { value: "UNPUBLISHED", label: "Đã gỡ", count: counts.UNPUBLISHED },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((p) => (
          <Card key={p.id} className="overflow-hidden">
            <div className="relative">
              <PhotoPlaceholder seed={p.coverSeed} src={p.coverDataUrl} className="h-32 w-full" />
              <div className="absolute left-2 top-2">
                <PostStatusBadge status={p.status} />
              </div>
              {p.isFeatured ? (
                <div className="absolute right-2 top-2">
                  <span className="rounded bg-vang-300 px-1.5 py-0.5 text-[10px] font-bold text-doan-800">
                    NỔI BẬT
                  </span>
                </div>
              ) : null}
            </div>
            <CardBody className="space-y-2.5">
              <p className="line-clamp-2 font-serif-display text-sm font-bold leading-snug text-stone-900">
                {p.title}
              </p>
              <p className="text-[11px] text-stone-400">
                {p.authorOrgUnitName} · {formatDateTime(p.publishedAt ?? p.createdAt)}
                {p.viewCount > 0 ? ` · ${formatNumber(p.viewCount)} xem` : ""}
              </p>
              {p.activityId ? (
                <Link
                  href={`/quan-tri/hoat-dong/${p.activityId}`}
                  className="inline-flex items-center gap-1 text-[11px] text-sky-700 hover:underline"
                >
                  <Sparkles className="h-3 w-3" /> Gắn với hoạt động #{p.activityId}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                  <PenSquare className="h-3 w-3 text-slate-400" /> Bài viết độc lập
                </span>
              )}
              <div className="flex flex-wrap gap-1.5 border-t border-stone-100 pt-2.5">
                {p.status === "DRAFT" || p.status === "UNPUBLISHED" ? (
                  <Button size="sm" variant="secondary" onClick={() => changeStatus(p.id, "PUBLISHED")}>
                    <Send className="h-3.5 w-3.5" /> Đăng bài
                  </Button>
                ) : null}
                {p.status === "PUBLISHED" ? (
                  <>
                    <Link href={`/tin-tuc/${p.slug}`} target="_blank">
                      <Button size="sm" variant="secondary">
                        <Globe className="h-3.5 w-3.5" /> Xem trên web
                      </Button>
                    </Link>
                    <Button size="sm" variant="danger" onClick={() => changeStatus(p.id, "UNPUBLISHED")}>
                      <Trash2 className="h-3.5 w-3.5" /> Gỡ bài
                    </Button>
                  </>
                ) : null}
                {session &&
                (p.editorAccountId === session.accountId ||
                  session.role === "QUAN_TRI_TW" ||
                  session.role === "BIEN_TAP_VIEN") ? (
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" /> Sửa
                  </Button>
                ) : null}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Modal Soạn tin / Tạo bài viết (Thủ công hoặc Hoạt động) */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={createMode === "manual" ? "Viết bài mới (thủ công)" : "Tạo bài viết từ hoạt động"}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreate}>
              <Megaphone className="h-4 w-4" /> Tạo bản nháp
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {createMode === "activity" ? (
            <Field
              label="Chọn hoạt động đã xác nhận"
              required
              hint="Chỉ hiển thị hoạt động trong phạm vi của bạn đã được cấp trên xác nhận."
            >
              <Select
                value={form.activityId}
                onChange={(e) => setForm((f) => ({ ...f, activityId: e.target.value }))}
              >
                <option value="">— Chọn hoạt động —</option>
                {confirmedActivities.map((a) => (
                  <option key={a.id} value={a.id}>
                    #{a.id} — {a.title.slice(0, 70)}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field
              label="Hoạt động liên quan (tùy chọn)"
              hint="Có thể để trống nếu đây là tin bài thông báo, nghiên cứu, kỹ năng hoặc bài viết tự do."
            >
              <Select
                value={form.activityId}
                onChange={(e) => setForm((f) => ({ ...f, activityId: e.target.value }))}
              >
                <option value="">— Bài viết độc lập (không gắn hoạt động) —</option>
                {confirmedActivities.map((a) => (
                  <option key={a.id} value={a.id}>
                    #{a.id} — {a.title.slice(0, 70)}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Tiêu đề bài viết" required>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Tiêu đề hấp dẫn, đúng chuẩn báo chí…"
            />
          </Field>
          {form.title.trim() ? (
            <p className="text-[11px] text-stone-400">
              Đường dẫn dự kiến:{" "}
              <code className="rounded bg-stone-100 px-1 text-slate-600">/tin-tuc/{slugify(form.title)}</code>
            </p>
          ) : null}

          <Field label="Tóm tắt (lead)" hint="Đoạn mở đầu nổi bật hiển thị in nghiêng ở đầu bài viết và thẻ xem trước.">
            <Textarea
              value={form.excerpt}
              onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
              rows={2}
              placeholder="Tóm tắt ngắn gọn 1-2 câu nội dung chính của bài viết…"
            />
          </Field>

          <div>
            <label className="text-xs font-medium text-stone-600">
              Nội dung bài viết <span className="text-rose-500">*</span>
            </label>
            <div className="mt-1">
              <EditorToolbar
                textareaRef={createTextareaRef}
                value={form.content}
                onChange={(content) => setForm((f) => ({ ...f, content }))}
              />
              <textarea
                ref={createTextareaRef}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                rows={10}
                placeholder="Nhập nội dung bài viết. Bạn có thể sử dụng thanh công cụ bên trên để in đậm, in nghiêng, chèn ảnh, chèn liên kết, tiêu đề mục H2/H3..."
                className="w-full rounded-b-xl border border-stone-200 bg-white p-3 text-sm text-stone-800 outline-none transition-all placeholder:text-stone-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
              />
            </div>
            <p className="mt-1 text-[11px] text-stone-400">
              * Hỗ trợ định dạng Markdown, chèn ảnh bằng cú pháp ![chú thích](url), tiêu đề ## mục lớn.
            </p>
          </div>

          <Field label="Từ khóa &amp; chuyên mục trang chủ" hint="Chọn để bài viết hiển thị ở chuyên mục tương ứng trên website.">
            <KeywordPicker value={keywords} onChange={setKeywords} />
          </Field>

          <Field label="Ảnh bìa (Đại diện bài viết)" hint="Tải tệp lên (JPG/PNG tối đa 2MB) hoặc dán trực tiếp đường dẫn ảnh (URL).">
            <div className="space-y-3">
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  pickCover(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <div className="flex gap-2">
                <Input
                  value={form.coverUrl}
                  onChange={(e) => setForm((f) => ({ ...f, coverUrl: e.target.value }))}
                  placeholder="https://... dán link ảnh trực tuyến"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => coverInputRef.current?.click()}
                  className="shrink-0"
                >
                  <ImagePlus className="h-4 w-4" /> Tải tệp lên
                </Button>
              </div>

              {form.coverUrl.trim() || coverDataUrl ? (
                <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.coverUrl.trim() || coverDataUrl || ""}
                    alt="Xem trước ảnh bìa"
                    className="h-24 w-40 rounded-lg border border-stone-200 object-cover"
                  />
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-stone-700">Xem trước ảnh bìa</p>
                    <p className="text-[11px] text-stone-500">Kích thước khuyến nghị: 1200 x 630 hoặc 600 x 315</p>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        setCoverDataUrl(null);
                        setForm((f) => ({ ...f, coverUrl: "" }));
                      }}
                    >
                      <X className="h-3.5 w-3.5" /> Bỏ ảnh
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </Field>
        </div>
      </Modal>

      {/* Modal Nhập tin từ đường link */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Nhập tin từ đường link"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setImportOpen(false)}>
              Hủy
            </Button>
            <Button onClick={saveImported} disabled={!imported || importing}>
              <Megaphone className="h-4 w-4" /> Tạo bản nháp
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field
            label="Đường dẫn bài viết"
            hint="Dán link bài báo / bài đăng Facebook — hệ thống tự đọc tiêu đề, tóm tắt, ảnh và nội dung có định dạng."
          >
            <div className="flex gap-2">
              <Input
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://baochinhphu.vn/... hoặc https://facebook.com/..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") runExtract();
                }}
              />
              <Button onClick={runExtract} disabled={importing || !importUrl.trim()} className="shrink-0">
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                {importing ? "Đang đọc…" : "Trích xuất"}
              </Button>
            </div>
          </Field>

          {imported ? (
            <div className="space-y-3 rounded-xl bg-stone-50 p-4 ring-1 ring-stone-200">
              {imported.mock ? (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700 ring-1 ring-amber-100">
                  Bản nháp mô phỏng — trang gốc bị hạn chế truy cập trực tiếp, bạn hãy kiểm tra và hoàn thiện nội dung.
                </p>
              ) : (
                <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-100">
                  Đã đọc xong từ nguồn {new URL(imported.sourceUrl).hostname} — kiểm tra và sửa lại trước khi tạo bản nháp.
                </p>
              )}
              <Field label="Tiêu đề">
                <Input
                  value={imported.title}
                  onChange={(e) => setImported((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
                />
              </Field>
              <Field label="Tóm tắt (lead)">
                <Textarea
                  value={imported.excerpt}
                  onChange={(e) => setImported((prev) => (prev ? { ...prev, excerpt: e.target.value } : prev))}
                  rows={2}
                />
              </Field>
              <div>
                <label className="text-xs font-medium text-stone-600">Nội dung bài viết</label>
                <div className="mt-1">
                  <EditorToolbar
                    textareaRef={importTextareaRef}
                    value={imported.content}
                    onChange={(content) => setImported((prev) => (prev ? { ...prev, content } : prev))}
                  />
                  <textarea
                    ref={importTextareaRef}
                    value={imported.content}
                    onChange={(e) => setImported((prev) => (prev ? { ...prev, content: e.target.value } : prev))}
                    rows={10}
                    className="w-full rounded-b-xl border border-stone-200 bg-white p-3 text-sm text-stone-800 outline-none transition-all focus:border-cyan-400"
                  />
                </div>
              </div>
              {imported.imageUrl ? (
                <Field label="Ảnh bìa từ nguồn">
                  <div className="flex items-start gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imported.imageUrl}
                      alt="Ảnh bìa từ nguồn"
                      className="h-24 w-40 rounded-lg border border-stone-200 object-cover"
                    />
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setImported((prev) => (prev ? { ...prev, imageUrl: undefined } : prev))}
                    >
                      <X className="h-3.5 w-3.5" /> Bỏ ảnh
                    </Button>
                  </div>
                </Field>
              ) : null}
            </div>
          ) : (
            <p className="text-[11px] text-stone-400">Chưa có nội dung — dán đường dẫn rồi bấm "Trích xuất".</p>
          )}
        </div>
      </Modal>

      {/* Modal Chỉnh sửa bài viết */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`Chỉnh sửa bài viết${editing ? ` — ${editing.title.slice(0, 40)}` : ""}`}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Hủy
            </Button>
            <Button onClick={saveEdit}>
              <Pencil className="h-4 w-4" /> Lưu thay đổi
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Tiêu đề bài viết" required hint="Đổi tiêu đề không làm thay đổi đường dẫn đã đăng.">
            <Input
              value={editForm.title}
              onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
            />
          </Field>
          <Field label="Tóm tắt (lead)">
            <Textarea
              value={editForm.excerpt}
              onChange={(e) => setEditForm((f) => ({ ...f, excerpt: e.target.value }))}
              rows={2}
            />
          </Field>

          <div>
            <label className="text-xs font-medium text-stone-600">Nội dung bài viết</label>
            <div className="mt-1">
              <EditorToolbar
                textareaRef={editTextareaRef}
                value={editForm.content}
                onChange={(content) => setEditForm((f) => ({ ...f, content }))}
              />
              <textarea
                ref={editTextareaRef}
                value={editForm.content}
                onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))}
                rows={10}
                className="w-full rounded-b-xl border border-stone-200 bg-white p-3 text-sm text-stone-800 outline-none transition-all focus:border-cyan-400"
              />
            </div>
          </div>

          <Field
            label="Từ khóa &amp; chuyên mục"
            hint="Chọn từ danh mục cố định — thống nhất thẻ (#) và bộ lọc trên trang tin tức."
          >
            <KeywordPicker value={editKeywords} onChange={setEditKeywords} />
          </Field>

          <Field label="Ảnh bìa" hint="Dán đường dẫn ảnh trực tuyến hoặc tải tệp lên (JPG/PNG tối đa 2MB).">
            <input
              ref={editCoverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                pickEditCover(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={editForm.coverUrl}
                  onChange={(e) => setEditForm((f) => ({ ...f, coverUrl: e.target.value }))}
                  placeholder="https://... dán link ảnh mới"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => editCoverInputRef.current?.click()}
                  className="shrink-0"
                >
                  <ImagePlus className="h-4 w-4" /> Tải tệp lên
                </Button>
              </div>

              {(() => {
                const preview =
                  editForm.coverUrl.trim() ||
                  (editCover === undefined ? (editing?.coverDataUrl ?? null) : editCover);
                if (preview) {
                  return (
                    <div className="flex items-start gap-3 rounded-xl border border-stone-200 bg-stone-50 p-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preview}
                        alt="Ảnh bìa"
                        className="h-24 w-40 rounded-lg border border-stone-200 object-cover"
                      />
                      <div className="space-y-1.5">
                        <Button size="sm" variant="outline" onClick={() => editCoverInputRef.current?.click()}>
                          <ImagePlus className="h-3.5 w-3.5" /> Đổi ảnh
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            setEditCover(null);
                            setEditForm((f) => ({ ...f, coverUrl: "" }));
                          }}
                        >
                          <X className="h-3.5 w-3.5" /> Bỏ ảnh
                        </Button>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
