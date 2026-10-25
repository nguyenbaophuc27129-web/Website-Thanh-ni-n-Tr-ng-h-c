"use client";

import { useMemo, useState } from "react";
import { FolderOpen, Plus, Globe, Archive, Download, FileUp, Pencil, Trash2, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, formatNumber, todayISO } from "@/lib/utils";
import { uploadFile } from "@/lib/upload-client";
import { resourceTypes } from "@/data/categories";
import type { Resource } from "@/types";

type Form = {
  title: string; description: string; resourceTypeId: string; fileName: string;
  fileSizeKb: string; isPublic: boolean; status: Resource["status"]; fileDataUrl?: string;
};

type UploadedFileItem = {
  name: string;
  sizeKb: number;
  fileDataUrl: string;
};

const EMPTY_FORM: Form = {
  title: "", description: "", resourceTypeId: "", fileName: "", fileSizeKb: "", isPublic: true, status: "PUBLISHED",
};

/** Giới hạn dung lượng mỗi tệp tài nguyên (tệp lưu trên máy chủ, không lưu base64) */
const MAX_RESOURCE_BYTES = 25 * 1024 * 1024;

export default function TaiNguyenAdminPage() {
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();
  const [tab, setTab] = useState("all");
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [selectedFiles, setSelectedFiles] = useState<UploadedFileItem[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);

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

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, resourceTypeId: resourceTypes[0]?.id.toString() ?? "" });
    setSelectedFiles([]);
    setEditingId("new");
  };

  const openEdit = (r: Resource) => {
    setForm({
      title: r.title, description: r.description, resourceTypeId: r.resourceTypeId.toString(),
      fileName: r.fileName, fileSizeKb: r.fileSizeKb.toString(), isPublic: r.isPublic, status: r.status,
      fileDataUrl: r.fileDataUrl,
    });
    if (r.fileDataUrl) {
      setSelectedFiles([{ name: r.fileName, sizeKb: r.fileSizeKb, fileDataUrl: r.fileDataUrl }]);
    } else {
      setSelectedFiles([]);
    }
    setEditingId(r.id);
  };

  /** Chọn tệp thật (hỗ trợ chọn nhiều tệp tối đa 5 tệp khi thêm mới) */
  const pickFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const incoming = Array.from(files);

    let base = editingId === "new" ? [...selectedFiles] : [];
    if (base.length + incoming.length > 5) {
      toast("Chỉ được chọn tối đa 5 tệp mỗi lần tải lên.", "warning");
    }

    const availableSlots = Math.max(0, 5 - base.length);
    const toProcess = incoming.slice(0, availableSlots);

    toProcess.forEach((file) => {
      if (file.size > MAX_RESOURCE_BYTES) {
        toast(`Tệp "${file.name}" vượt quá 25MB — đã bỏ qua.`, "warning");
        return;
      }
      // Tệp lưu trên máy chủ — chỉ giữ đường dẫn /uploads/... trong dữ liệu
      setUploadingCount((n) => n + 1);
      uploadFile(file, "tai-nguyen")
        .then((uploaded) => {
        const item: UploadedFileItem = {
          name: file.name,
          sizeKb: Math.max(1, Math.round(file.size / 1024)),
          fileDataUrl: uploaded.url,
        };
        setSelectedFiles((prev) => {
          const next = editingId === "new" ? [...prev, item].slice(0, 5) : [item];
          setForm((f) => ({
            ...f,
            title: f.title || file.name.replace(/\.[^/.]+$/, ""),
            fileName: next[0]?.name ?? "",
            fileSizeKb: String(next[0]?.sizeKb ?? ""),
            fileDataUrl: next[0]?.fileDataUrl ?? "",
          }));
          return next;
        });
        })
        .catch((e: unknown) => toast(e instanceof Error ? e.message : `Không tải được tệp "${file.name}" lên máy chủ.`, "warning"))
        .finally(() => setUploadingCount((n) => n - 1));
    });
  };

  const removeSelectedFile = (idx: number) => {
    setSelectedFiles((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length > 0) {
        setForm((f) => ({
          ...f,
          fileName: next[0].name,
          fileSizeKb: String(next[0].sizeKb),
          fileDataUrl: next[0].fileDataUrl,
        }));
      } else {
        setForm((f) => ({
          ...f,
          fileName: "",
          fileSizeKb: "",
          fileDataUrl: undefined,
        }));
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!session) return;
    if (uploadingCount > 0) {
      toast("Tệp đang được tải lên máy chủ — vui lòng đợi xong rồi lưu.", "warning");
      return;
    }
    if (editingId === "new" && selectedFiles.length > 1) {
      // Lưu hàng loạt nhiều tệp (tối đa 5)
      for (const f of selectedFiles) {
        const fileTitle = form.title.trim()
          ? `${form.title.trim()} - ${f.name}`
          : f.name.replace(/\.[^/.]+$/, "");
        const input: Omit<Resource, "id" | "downloadCount"> = {
          resourceTypeId: Number(form.resourceTypeId),
          title: fileTitle,
          description: form.description.trim(),
          fileName: f.name,
          fileSizeKb: f.sizeKb,
          fileDataUrl: f.fileDataUrl,
          isPublic: form.isPublic,
          publishedByOrgUnitId: session.orgUnitId,
          publishedAt: todayISO(),
          status: form.status,
        };
        store.saveResource(input);
      }
      toast(`Đã thêm ${selectedFiles.length} tài nguyên vào kho.`);
      setEditingId(null);
      setSelectedFiles([]);
      return;
    }

    const firstFile = selectedFiles[0];
    const targetTitle = form.title.trim() || firstFile?.name?.replace(/\.[^/.]+$/, "") || "";
    const targetFileName = firstFile?.name || form.fileName.trim();

    if (!targetTitle || !targetFileName) {
      toast("Vui lòng nhập tên tài nguyên hoặc chọn tệp.", "warning");
      return;
    }

    const input: Omit<Resource, "id" | "downloadCount"> = {
      resourceTypeId: Number(form.resourceTypeId),
      title: targetTitle,
      description: form.description.trim(),
      fileName: targetFileName,
      fileSizeKb: firstFile?.sizeKb || Number(form.fileSizeKb) || 0,
      fileDataUrl: firstFile?.fileDataUrl || form.fileDataUrl,
      isPublic: form.isPublic,
      publishedByOrgUnitId: session.orgUnitId,
      publishedAt: todayISO(),
      status: form.status,
    };
    store.saveResource(input, editingId === "new" ? undefined : editingId ?? undefined);
    toast(editingId === "new" ? "Đã thêm tài nguyên vào kho." : "Đã cập nhật tài nguyên.");
    setEditingId(null);
    setSelectedFiles([]);
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
                    {typeName(r.resourceTypeId)} · {r.fileName}
                    {r.fileSizeKb > 0 ? ` · ${r.fileSizeKb} KB` : ""} · {r.publishedAt ? formatDateTime(r.publishedAt) : "—"}
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
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (r.fileDataUrl) {
                        const a = document.createElement("a");
                        a.href = r.fileDataUrl;
                        a.download = r.fileName || `tai-nguyen-${r.id}`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        store.downloadResource(r.id);
                        toast(`Đã tải "${r.fileName}".`);
                      } else {
                        toast(`"${r.fileName}" chưa có nội dung tệp — hãy Sửa và nạp tệp thật.`, "warning");
                      }
                    }}
                  >
                    <Download className="h-3.5 w-3.5" /> Tải
                  </Button>
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
                        toast(`Đã xóa tài nguyên "${r.fileName || r.title}".`, "success");
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
        onClose={() => setEditingId(null)}
        title={editingId === "new" ? "Thêm tài nguyên" : "Cập nhật tài nguyên"}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingId(null)}>Hủy</Button>
            <Button onClick={handleSave}>Lưu</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Tên tài nguyên" required>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="VD: Mẫu nhật ký hoạt động Đoàn trường" />
          </Field>
          <Field label="Mô tả">
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
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
            <Field
              label={editingId === "new" ? "Tệp đính kèm (chọn tối đa 5 tệp)" : "Tệp đính kèm"}
              required
              hint="Chọn tệp để tự động lấy tên và dung lượng — người dùng sẽ tải được tệp thật (tối đa 25MB/tệp, tối đa 5 tệp mỗi lần)."
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50">
                    {uploadingCount > 0 ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}{" "}
                    {uploadingCount > 0 ? "Đang tải lên máy chủ…" : selectedFiles.length > 0 ? "Chọn thêm tệp…" : "Chọn tệp (tối đa 5 tệp)…"}
                    <input
                      type="file"
                      multiple={editingId === "new"}
                      className="hidden"
                      onChange={(e) => {
                        pickFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {selectedFiles.length <= 1 && (
                    <Input
                      value={form.fileName}
                      onChange={(e) => setForm((f) => ({ ...f, fileName: e.target.value }))}
                      placeholder="mau-nhat-ky.docx"
                    />
                  )}
                </div>

                {selectedFiles.length > 0 ? (
                  <div className="space-y-1.5 rounded-lg border border-stone-200 bg-stone-50 p-2.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
                      <span>Danh sách tệp ({selectedFiles.length}/5):</span>
                      {selectedFiles.length >= 5 && (
                        <span className="font-normal text-amber-600">Đã đạt tối đa 5 tệp</span>
                      )}
                    </div>
                    <div className="divide-y divide-stone-200/60">
                      {selectedFiles.map((f, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1 text-xs text-stone-700">
                          <span className="truncate pr-2 font-mono text-[11px] text-blue-700">
                            {idx + 1}. {f.name} <span className="text-stone-400">({f.sizeKb} KB)</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => removeSelectedFile(idx)}
                            className="rounded p-1 text-stone-400 hover:bg-stone-200 hover:text-rose-600"
                            title="Xóa tệp này"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-1 text-[11px] text-amber-600">Chưa nạp tệp — bạn có thể bấm &quot;Chọn tệp&quot; để chọn tối đa 5 tệp.</p>
                )}
              </div>
            </Field>
            <Field label="Dung lượng (KB)">
              <Input
                type="number"
                min={0}
                value={form.fileSizeKb}
                onChange={(e) => setForm((f) => ({ ...f, fileSizeKb: e.target.value }))}
                disabled={selectedFiles.length > 1}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))} className="accent-doan-600" />
            Công khai — hiển thị trên trang Tài nguyên cho khách truy cập
          </label>
        </div>
      </Modal>
    </div>
  );
}
