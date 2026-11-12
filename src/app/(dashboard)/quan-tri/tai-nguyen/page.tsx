"use client";

import { useMemo, useState } from "react";
import { FolderOpen, Plus, Globe, Archive, Download, FileUp, Pencil, Trash2, Loader2, Play } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MultiUploadField } from "@/components/ui/multi-upload";
import { formatDateTime, formatNumber, todayISO } from "@/lib/utils";
import { useMultiUpload } from "@/lib/use-multi-upload";
import { downloadStoredFile, formatSizeKb, isSafeYoutubeUrl, resourceFiles, triggerDownload, ytWatchUrl } from "@/lib/resource-files";
import { resourceTypes } from "@/data/categories";
import type { Resource } from "@/types";

type Form = {
  title: string; description: string; resourceTypeId: string; videoUrl: string;
  isPublic: boolean; status: Resource["status"];
};

const EMPTY_FORM: Form = {
  title: "", description: "", resourceTypeId: "", videoUrl: "", isPublic: true, status: "PUBLISHED",
};

/** Loại "Clip tuyên truyền…" — nhập link YouTube thay cho (hoặc kèm) tệp */
const CLIP_TYPE_CODE = "CLIP_TINH_BAN";

/** Dấu vết nội dung đang soạn — so với lúc mở để biết có thay đổi chưa lưu */
const fingerprint = (f: Form, urls: string[]) => JSON.stringify([f, urls]);

const baseName = (name: string) => name.replace(/\.[^/.]+$/, "");

export default function TaiNguyenAdminPage() {
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();
  const [tab, setTab] = useState("all");
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [openedAs, setOpenedAs] = useState("");
  // Nhiều tệp (≤10, mỗi tệp ≤25MB), tải song song tối đa 3 — lưu trên máy chủ, chỉ giữ đường dẫn /uploads/...
  const upload = useMultiUpload("tai-nguyen", { onReject: (m) => toast(m, "warning") });

  const list = useMemo(
    () =>
      store.resources
        .filter((r) => (tab === "all" ? true : r.status === tab))
        .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")),
    [store.resources, tab]
  );

  const typeName = (id: number) => {
    const t = resourceTypes.find((x) => x.id === id);
    return t?.short ?? t?.name ?? "—";
  };
  const clipTypeId = String(resourceTypes.find((t) => t.code === CLIP_TYPE_CODE)?.id ?? "");

  const openWith = (next: Form, files: Resource["attachments"], id: number | "new") => {
    setForm(next);
    upload.load(files ?? []);
    setOpenedAs(fingerprint(next, (files ?? []).map((f) => f.url)));
    setEditingId(id);
  };

  const openCreate = () => openWith({ ...EMPTY_FORM, resourceTypeId: resourceTypes[0]?.id.toString() ?? "" }, [], "new");

  const openEdit = (r: Resource) =>
    openWith(
      {
        title: r.title, description: r.description, resourceTypeId: r.resourceTypeId.toString(),
        videoUrl: r.videoUrl ?? "", isPublic: r.isPublic, status: r.status,
      },
      resourceFiles(r),
      r.id,
    );

  const dirty = editingId !== null && fingerprint(form, upload.uploaded.map((f) => f.url)) !== openedAs;

  const closeDialog = () => {
    if (dirty && !window.confirm("Bạn có thay đổi chưa lưu. Đóng hộp thoại và bỏ các thay đổi này?")) return;
    upload.reset();
    setEditingId(null);
  };

  const firstFile = upload.uploaded[0];
  const totalKb = upload.uploaded.reduce((sum, f) => sum + f.sizeKb, 0);
  const showVideo = form.resourceTypeId === clipTypeId || form.videoUrl !== "";

  const handleSave = () => {
    if (!session || editingId === null) return;
    if (upload.uploading) {
      toast("Tệp đang được tải lên máy chủ — vui lòng đợi xong rồi lưu.", "warning");
      return;
    }
    if (upload.hasError) {
      toast("Có tệp tải lên bị lỗi — hãy thử lại hoặc xoá tệp đó trước khi lưu.", "warning");
      return;
    }
    const videoUrl = form.videoUrl.trim();
    if (videoUrl && !isSafeYoutubeUrl(videoUrl)) {
      toast("Link clip phải là địa chỉ https của YouTube (youtube.com/watch, youtu.be, shorts hoặc embed).", "warning");
      return;
    }
    if (!firstFile && !videoUrl) {
      toast("Hãy chọn ít nhất một tệp đính kèm hoặc dán link YouTube.", "warning");
      return;
    }
    const title = form.title.trim() || (firstFile ? baseName(firstFile.name) : "");
    if (!title) {
      toast("Vui lòng nhập tên tài nguyên.", "warning");
      return;
    }

    const attachments = upload.uploaded.map((f) => ({ name: f.name, url: f.url, sizeKb: f.sizeKb, mime: f.mime }));
    // Sửa: giữ nguyên ngày đăng, đơn vị đăng, người đóng góp… của dòng cũ; chỉ ghi đè các trường trong hộp thoại
    const old = editingId === "new" ? undefined : store.resources.find((r) => r.id === editingId);
    const { id: _id, downloadCount: _dl, ...kept } = old ?? ({} as Partial<Resource>);
    void _id; void _dl;
    const input: Omit<Resource, "id" | "downloadCount"> = {
      publishedByOrgUnitId: session.orgUnitId,
      publishedAt: todayISO(),
      ...kept,
      resourceTypeId: Number(form.resourceTypeId),
      title,
      description: form.description.trim(),
      fileName: firstFile?.name ?? "",
      fileSizeKb: totalKb,
      fileDataUrl: firstFile?.url,
      attachments,
      videoUrl: videoUrl || undefined,
      isPublic: form.isPublic,
      status: form.status,
    };
    store.saveResource(input, old?.id);
    toast(editingId === "new" ? "Đã thêm tài nguyên vào kho." : "Đã cập nhật tài nguyên.");
    upload.reset();
    setEditingId(null);
  };

  const downloadFiles = (r: Resource) => {
    const files = resourceFiles(r);
    if (files.length > 1) {
      // Máy chủ gói .zip và tự đếm lượt tải
      triggerDownload(`/api/tai-nguyen/${r.id}/zip`);
      toast(`Đang tải gói ${files.length} tệp của "${r.title}".`);
    } else if (files.length === 1 && downloadStoredFile(files[0].url, files[0].name)) {
      void store.downloadResource(r.id);
      toast(`Đã tải "${files[0].name}".`);
    } else {
      toast(`"${r.title}" chưa có tệp — hãy Sửa và thêm tệp thật.`, "warning");
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif-display text-xl font-bold text-stone-900">Tài nguyên</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Quản lý kho tài liệu: biểu mẫu, tài liệu tuyên truyền, hướng dẫn — cấu hình công khai và theo dõi lượt tải.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Thêm tài nguyên
        </Button>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "all", label: "Tất cả", count: store.resources.length },
          { value: "PUBLISHED", label: "Đăng tải", count: store.resources.filter((r) => r.status === "PUBLISHED").length },
          { value: "DRAFT", label: "Nháp", count: store.resources.filter((r) => r.status === "DRAFT").length },
          { value: "ARCHIVED", label: "Lưu trữ", count: store.resources.filter((r) => r.status === "ARCHIVED").length },
        ]}
      />

      <Card>
        <CardBody className="p-0">
          <ul className="divide-y divide-stone-100">
            {list.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-doan-50 text-doan-600">
                  <FileUp className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-stone-800">{r.title}</p>
                  <p className="truncate text-[11px] text-stone-400">
                    {typeName(r.resourceTypeId)}
                    {fileSummary(r)} · {r.publishedAt ? formatDateTime(r.publishedAt) : "—"}
                  </p>
                </div>
                <Badge tone={r.status === "PUBLISHED" ? "green" : r.status === "DRAFT" ? "yellow" : "gray"}>
                  {r.status === "PUBLISHED" ? "Đăng tải" : r.status === "DRAFT" ? "Nháp" : "Lưu trữ"}
                </Badge>
                <Badge tone={r.isPublic ? "blue" : "gray"}>
                  {r.isPublic ? <Globe className="h-3 w-3" /> : null} {r.isPublic ? "Công khai" : "Nội bộ"}
                </Badge>
                <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                  <Download className="h-3.5 w-3.5" /> {formatNumber(r.downloadCount)}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                    <Pencil className="h-3.5 w-3.5" /> Sửa
                  </Button>
                  {resourceFiles(r).length > 0 ? (
                    <Button size="sm" variant="secondary" onClick={() => downloadFiles(r)}>
                      <Download className="h-3.5 w-3.5" /> Tải
                    </Button>
                  ) : r.videoUrl && ytWatchUrl(r.videoUrl) ? (
                    <a
                      href={ytWatchUrl(r.videoUrl)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-stone-100 px-3 text-xs font-medium text-stone-700 hover:bg-stone-200"
                    >
                      <Play className="h-3.5 w-3.5" /> Xem clip
                    </a>
                  ) : null}
                  {r.status === "PUBLISHED" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        store.saveResource({ ...r, status: "ARCHIVED" }, r.id);
                        toast("Đã chuyển tài nguyên vào lưu trữ.");
                      }}
                    >
                      <Archive className="h-3.5 w-3.5" /> Lưu trữ
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      if (window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tài nguyên "${r.title}" không?`)) {
                        store.deleteResource(r.id);
                        toast(`Đã xóa tài nguyên "${r.title}".`, "success");
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Xóa
                  </Button>
                </div>
              </li>
            ))}
            {list.length === 0 ? (
              <li className="flex flex-col items-center py-14">
                <FolderOpen className="h-8 w-8 text-stone-300" />
                <p className="mt-3 text-sm text-stone-400">Chưa có tài nguyên nào ở mục này.</p>
              </li>
            ) : null}
          </ul>
        </CardBody>
      </Card>

      <Modal
        open={editingId !== null}
        onClose={closeDialog}
        wide
        title={editingId === "new" ? "Thêm tài nguyên" : "Cập nhật tài nguyên"}
        footer={
          <>
            <span className="mr-auto self-center text-xs text-stone-500">
              {upload.items.length > 0 ? `${upload.items.length} tệp${totalKb > 0 ? ` · ${formatSizeKb(totalKb)}` : ""}` : "Chưa có tệp"}
              {dirty ? " · có thay đổi chưa lưu" : ""}
            </span>
            <Button variant="secondary" onClick={closeDialog}>Hủy</Button>
            <Button onClick={handleSave} disabled={upload.uploading}>
              {upload.uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {upload.uploading ? "Đang tải tệp…" : "Lưu"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field
            label="Tệp đính kèm"
            required={!showVideo}
            hint="PDF, Word, Excel, PowerPoint, ảnh, video, tệp nén… — tệp đầu tiên là tệp chính. Nhiều tệp vẫn là một tài nguyên, người dùng tải được cả gói .zip."
          >
            <MultiUploadField upload={upload} />
          </Field>
          <Field label="Tên tài nguyên" hint={firstFile ? "Để trống sẽ lấy theo tên tệp đầu tiên." : undefined}>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder={firstFile ? baseName(firstFile.name) : "VD: Mẫu nhật ký hoạt động Đoàn trường"}
            />
          </Field>
          <Field label="Mô tả">
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Loại tài nguyên">
              <Select value={form.resourceTypeId} onChange={(e) => setForm((f) => ({ ...f, resourceTypeId: e.target.value }))}>
                {resourceTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Trạng thái">
              <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Resource["status"] }))}>
                <option value="PUBLISHED">Đăng tải</option>
                <option value="DRAFT">Nháp</option>
                <option value="ARCHIVED">Lưu trữ</option>
              </Select>
            </Field>
          </div>
          {showVideo ? (
            <Field label="Link YouTube" hint="Dán link clip (youtube.com/watch, youtu.be, shorts hoặc danh sách phát nhúng) — người xem phát ngay trên trang. Có thể để trống nếu đã chọn tệp.">
              <Input
                value={form.videoUrl}
                onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
                placeholder="https://www.youtube.com/watch?v=…"
                inputMode="url"
              />
            </Field>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))} className="accent-doan-600" />
            Công khai — hiển thị trên trang Tài nguyên cho khách truy cập
          </label>
        </div>
      </Modal>
    </div>
  );
}

/** " · 3 tệp · 1.5 MB" (hoặc " · Clip YouTube") cho dòng danh sách */
function fileSummary(r: Resource): string {
  const files = resourceFiles(r);
  if (files.length === 0) return r.videoUrl ? " · Clip YouTube" : " · Chưa có tệp";
  const size = formatSizeKb(files.reduce((sum, f) => sum + f.sizeKb, 0));
  return ` · ${files.length === 1 ? files[0].name : `${files.length} tệp`}${size ? ` · ${size}` : ""}`;
}
