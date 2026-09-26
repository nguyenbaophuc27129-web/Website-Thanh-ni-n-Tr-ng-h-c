"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Megaphone, Plus, Eye, Star, Trash2, Send, Globe, Sparkles } from "lucide-react";
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
import { formatNumber, formatDateTime, slugify } from "@/lib/utils";

export default function XuatBanPage() {
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();
  const [tab, setTab] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ activityId: "", title: "", excerpt: "" });

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
    const id = store.createPostFromActivity(session, Number(form.activityId), form.title.trim(), excerpt);
    const post = store.publishedPosts.find((p) => p.id === id);
    if (post && act) {
      store.savePost({
        ...post,
        categoryNames: act.categoryIds.map((cid) => store.contentCategories.find((c) => c.id === cid)?.name ?? "").filter(Boolean),
        metaDescription: excerpt.slice(0, 160),
      });
    }
    toast("Đã tạo bản nháp từ hoạt động. Bạn biên tập và đăng công khai khi sẵn sàng.");
    setCreateOpen(false);
    setForm({ activityId: "", title: "", excerpt: "" });
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
            Biên tập từ hoạt động đã xác nhận thành bài viết và đăng lên website công khai.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Tạo bài từ hoạt động
        </Button>
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
              <PhotoPlaceholder seed={p.coverSeed} className="h-32 w-full" />
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
        </div>
      </Modal>
    </div>
  );
}
