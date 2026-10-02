"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Megaphone, Plus, Eye, Star, Trash2, Send, Globe, Sparkles, ImagePlus, X, Pencil, Link2, Loader2 } from "lucide-react";
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
    // URL đã được kiểm tra hợp lệ trước khi gọi — bỏ qua
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

/** Chọn từ khóa sự kiện + chuyên mục trang chủ từ danh mục cố định — thống nhất thẻ (#) trên trang tin tức */
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
      {/* Chuyên mục trang chủ — gắn tag để bài TỰ ĐỘNG xuất hiện ở khu vực tương ứng */}
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
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ activityId: "", title: "", excerpt: "" });
  const [keywords, setKeywords] = useState<string[]>([]);
  const [coverDataUrl, setCoverDataUrl] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  // Chỉnh sửa bài đã có
  const [editing, setEditing] = useState<PublishedPost | null>(null);
  const [editForm, setEditForm] = useState({ title: "", excerpt: "", content: "" });
  const [editKeywords, setEditKeywords] = useState<string[]>([]);
  const [editCover, setEditCover] = useState<string | null | undefined>(undefined);
  const editCoverInputRef = useRef<HTMLInputElement>(null);
  // Nhập tin từ đường link
  const [importOpen, setImportOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState<ImportedArticle | null>(null);

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

  const handleCreate = () => {
    if (!session) return;
    if (!form.activityId || !form.title.trim()) {
      toast("Chọn hoạt động và nhập tiêu đề bài viết.", "warning");
      return;
    }
    const act = store.activities.find((a) => a.id === Number(form.activityId));
    const excerpt = form.excerpt.trim() || (act?.summary.slice(0, 200) ?? "");
    const derived = act?.categoryIds.map((cid) => store.contentCategories.find((c) => c.id === cid)?.name ?? "").filter(Boolean) ?? [];
    const categoryNames = Array.from(new Set([...derived, ...keywords]));
    store.createPostFromActivity(session, Number(form.activityId), form.title.trim(), excerpt, {
      categoryNames,
      metaDescription: excerpt.slice(0, 160),
      coverDataUrl: coverDataUrl ?? undefined,
    });
    toast("Đã tạo bản nháp từ hoạt động. Bạn biên tập và đăng công khai khi sẵn sàng.");
    setCreateOpen(false);
    setForm({ activityId: "", title: "", excerpt: "" });
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
      // Trang chặn bot / hỏng → dựng bản mô phỏng từ slug để vẫn có bản nháp
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
    setEditForm({ title: p.title, excerpt: p.excerpt, content: p.content });
    setEditKeywords(p.categoryNames);
    setEditCover(undefined);
  };

  const saveEdit = () => {
    if (!editing) return;
    if (!editForm.title.trim()) {
      toast("Tiêu đề bài viết không được để trống.", "warning");
      return;
    }
    store.savePost({
      ...editing,
      title: editForm.title.trim(),
      excerpt: editForm.excerpt.trim(),
      content: editForm.content,
      categoryNames: editKeywords,
      metaDescription: editForm.excerpt.trim().slice(0, 160),
      coverDataUrl: editCover === undefined ? editing.coverDataUrl : (editCover ?? undefined),
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
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif-display text-xl font-bold text-stone-900">Xuất bản tin bài</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Mọi đơn vị tự biên tập tin từ hoạt động của mình và đăng công khai — Ban Thanh niên Trường học giám sát, gỡ bài nếu không phù hợp.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Link2 className="h-4 w-4" /> Nhập tin từ đường link
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Tạo bài từ hoạt động
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
              <div className="absolute left-2 top-2"><PostStatusBadge status={p.status} /></div>
              {p.isFeatured ? (
                <div className="absolute right-2 top-2">
                  <span className="rounded bg-vang-300 px-1.5 py-0.5 text-[10px] font-bold text-doan-800">NỔI BẬT</span>
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
              ) : null}
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
                {session && (p.editorAccountId === session.accountId || session.role === "QUAN_TRI_TW" || session.role === "BIEN_TAP_VIEN") ? (
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" /> Sửa
                  </Button>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    store.savePost({ ...p, isFeatured: !p.isFeatured });
                    toast(p.isFeatured ? "Đã bỏ nổi bật." : "Đã đặt làm bài nổi bật trang chủ.");
                  }}
                >
                  <Star className={`h-3.5 w-3.5 ${p.isFeatured ? "fill-amber-400 text-amber-400" : ""}`} />
                  {p.isFeatured ? "Bỏ nổi bật" : "Nổi bật"}
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Tạo bài viết từ hoạt động"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button onClick={handleCreate}><Megaphone className="h-4 w-4" /> Tạo bản nháp</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Chọn hoạt động đã xác nhận" required hint="Chỉ hiển thị hoạt động trong phạm vi của bạn đã được cấp trên xác nhận.">
            <Select value={form.activityId} onChange={(e) => setForm((f) => ({ ...f, activityId: e.target.value }))}>
              <option value="">— Chọn hoạt động —</option>
              {confirmedActivities.map((a) => (
                <option key={a.id} value={a.id}>
                  #{a.id} — {a.title.slice(0, 70)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tiêu đề bài viết" required>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Tiêu đề hấp dẫn, đúng chuẩn báo chí…"
            />
          </Field>
          {form.title.trim() ? (
            <p className="text-[11px] text-stone-400">
              Đường dẫn: <code className="rounded bg-stone-100 px-1">/tin-tuc/{slugify(form.title)}</code>
            </p>
          ) : null}
          <Field label="Tóm tắt (lead)" hint="Để trống sẽ lấy tóm tắt hoạt động.">
            <Textarea
              value={form.excerpt}
              onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
              rows={3}
            />
          </Field>
          <Field label="Từ khóa sự kiện" hint="Chọn từ danh mục cố định — thống nhất thẻ (#) và bộ lọc trên trang tin tức.">
            <KeywordPicker value={keywords} onChange={setKeywords} />
          </Field>
          <Field label="Ảnh bìa" hint="JPG/PNG tối đa 2MB — hiển thị thay ảnh minh họa mặc định ở trang tin tức.">
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
            {coverDataUrl ? (
              <div className="flex items-start gap-3">
                <img src={coverDataUrl} alt="Ảnh bìa" className="h-24 w-40 rounded-lg border border-stone-200 object-cover" />
                <div className="space-y-2">
                  <Button size="sm" variant="outline" onClick={() => coverInputRef.current?.click()}>
                    <ImagePlus className="h-3.5 w-3.5" /> Đổi ảnh khác
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setCoverDataUrl(null)}>
                    <X className="h-3.5 w-3.5" /> Bỏ ảnh
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => coverInputRef.current?.click()}>
                <ImagePlus className="h-4 w-4" /> Tải hình lên
              </Button>
            )}
          </Field>
        </div>
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Nhập tin từ đường link"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setImportOpen(false)}>Hủy</Button>
            <Button onClick={saveImported} disabled={!imported || importing}>
              <Megaphone className="h-4 w-4" /> Tạo bản nháp
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Đường dẫn bài viết" hint="Dán link bài báo / bài đăng chính thống — hệ thống tự đọc tiêu đề, mô tả, ảnh và nội dung.">
            <div className="flex gap-2">
              <Input
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
                placeholder="https://baochinhphu.vn/..."
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
                  Bản nháp mô phỏng — trang gốc không đọc được, bạn cần dán nội dung thật vào ô bên dưới.
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
                  rows={3}
                />
              </Field>
              <Field label="Nội dung" hint="Các đoạn văn cách nhau bởi một dòng trống.">
                <Textarea
                  value={imported.content}
                  onChange={(e) => setImported((prev) => (prev ? { ...prev, content: e.target.value } : prev))}
                  rows={9}
                />
              </Field>
              {imported.imageUrl ? (
                <Field label="Ảnh bìa từ nguồn">
                  <div className="flex items-start gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imported.imageUrl}
                      alt="Ảnh bìa từ nguồn"
                      className="h-24 w-40 rounded-lg border border-stone-200 object-cover"
                    />
                    <Button size="sm" variant="danger" onClick={() => setImported((prev) => (prev ? { ...prev, imageUrl: undefined } : prev))}>
                      <X className="h-3.5 w-3.5" /> Bỏ ảnh
                    </Button>
                  </div>
                </Field>
              ) : null}
            </div>
          ) : (
            <p className="text-[11px] text-stone-400">
              Chưa có nội dung — dán đường dẫn rồi bấm "Trích xuất".
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`Chỉnh sửa bài viết${editing ? ` — ${editing.title.slice(0, 40)}` : ""}`}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Hủy</Button>
            <Button onClick={saveEdit}><Pencil className="h-4 w-4" /> Lưu thay đổi</Button>
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
              rows={3}
            />
          </Field>
          <Field label="Nội dung" hint="Các đoạn văn cách nhau bởi một dòng trống.">
            <Textarea
              value={editForm.content}
              onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))}
              rows={9}
            />
          </Field>
          <Field label="Từ khóa sự kiện" hint="Chọn từ danh mục cố định — thống nhất thẻ (#) và bộ lọc trên trang tin tức.">
            <KeywordPicker value={editKeywords} onChange={setEditKeywords} />
          </Field>
          <Field label="Ảnh bìa" hint="Giữ nguyên nếu không thao tác; JPG/PNG tối đa 2MB.">
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
            {(() => {
              const preview = editCover === undefined ? (editing?.coverDataUrl ?? null) : editCover;
              if (preview) {
                return (
                  <div className="flex items-start gap-3">
                    <img src={preview} alt="Ảnh bìa" className="h-24 w-40 rounded-lg border border-stone-200 object-cover" />
                    <div className="space-y-2">
                      <Button size="sm" variant="outline" onClick={() => editCoverInputRef.current?.click()}>
                        <ImagePlus className="h-3.5 w-3.5" /> Đổi ảnh khác
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => setEditCover(null)}>
                        <X className="h-3.5 w-3.5" /> Bỏ ảnh
                      </Button>
                    </div>
                  </div>
                );
              }
              return (
                <Button variant="outline" onClick={() => editCoverInputRef.current?.click()}>
                  <ImagePlus className="h-4 w-4" /> Tải hình lên
                </Button>
              );
            })()}
          </Field>
        </div>
      </Modal>
    </div>
  );
}
