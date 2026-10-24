"use client";

import { useMemo, useState } from "react";
import { FolderOpen, Plus, Globe, Archive, Download, FileUp, Pencil } from "lucide-react";
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
import { resourceTypes } from "@/data/categories";
import type { Resource } from "@/types";

type Form = {
  title: string; description: string; resourceTypeId: string; fileName: string;
  fileSizeKb: string; isPublic: boolean; status: Resource["status"]; fileDataUrl?: string;
};

const EMPTY_FORM: Form = {
  title: "", description: "", resourceTypeId: "", fileName: "", fileSizeKb: "", isPublic: true, status: "PUBLISHED",
};

/** Đọc tệp thành dataUrl để tải lại được thật (giới hạn 4MB) */
const MAX_RESOURCE_BYTES = 4 * 1024 * 1024;

export default function TaiNguyenAdminPage() {
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();
  const [tab, setTab] = useState("all");
  const [editingId, setEditingId] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);

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
    setEditingId("new");
  };

  const openEdit = (r: Resource) => {
    setForm({
      title: r.title, description: r.description, resourceTypeId: r.resourceTypeId.toString(),
      fileName: r.fileName, fileSizeKb: r.fileSizeKb.toString(), isPublic: r.isPublic, status: r.status,
      fileDataUrl: r.fileDataUrl,
    });
    setEditingId(r.id);
  };

  /** Chọn tệp thật → tự điền tên + dung lượng + nội dung dataUrl */
  const pickFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_RESOURCE_BYTES) {
      toast("Tệp vượt quá 4MB — hãy nén hoặc chọn tệp nhỏ hơn.", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f) => ({
        ...f,
        fileName: file.name,
        fileSizeKb: Math.max(1, Math.round(file.size / 1024)).toString(),
        fileDataUrl: String(reader.result ?? ""),
      }));
      toast(`Đã nạp tệp "${file.name}" — người dùng sẽ tải được tệp thật.`);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!session) return;
    if (!form.title.trim() || !form.fileName.trim()) {
      toast("Nhập tên tài nguyên và tên tệp.", "warning");
      return;
    }
    const input: Omit<Resource, "id" | "downloadCount"> = {
      resourceTypeId: Number(form.resourceTypeId),
      title: form.title.trim(),
      description: form.description.trim(),
      fileName: form.fileName.trim(),
      fileSizeKb: Number(form.fileSizeKb) || 0,
      fileDataUrl: form.fileDataUrl,
      isPublic: form.isPublic,
      publishedByOrgUnitId: session.orgUnitId,
      publishedAt: todayISO(),
      status: form.status,
    };
    store.saveResource(input, editingId === "new" ? undefined : editingId ?? undefined);
    toast(editingId === "new" ? "Đã thêm tài nguyên vào kho." : "Đã cập nhật tài nguyên.");
    setEditingId(null);
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
                      variant="danger"
                      onClick={() => {
                        store.saveResource({ ...r, status: "ARCHIVED" }, r.id);
                        toast("Đã lưu trữ tài nguyên.");
                      }}
                    >
                      <Archive className="h-3.5 w-3.5" /> Lưu trữ
                    </Button>
                  ) : null}
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
            <Field label="Tệp đính kèm" required hint="Chọn tệp để tự điền tên + dung lượng — người dùng sẽ tải được tệp thật (tối đa 4MB).">
              <div className="flex items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50">
                  <FileUp className="h-4 w-4" /> {form.fileDataUrl ? "Đổi tệp khác" : "Chọn tệp…"}
                  <input type="file" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
                </label>
                <Input value={form.fileName} onChange={(e) => setForm((f) => ({ ...f, fileName: e.target.value }))} placeholder="mau-nhat-ky.docx" />
              </div>
              {form.fileDataUrl ? (
                <p className="mt-1 text-[11px] text-emerald-600">✓ Đã nạp nội dung tệp ({form.fileSizeKb || Math.round(form.fileDataUrl.length * 0.75 / 1024)} KB)</p>
              ) : (
                <p className="mt-1 text-[11px] text-amber-600">Chưa nạp tệp — tài nguyên sẽ hiển thị nhưng chưa tải được.</p>
              )}
            </Field>
            <Field label="Dung lượng (KB)">
              <Input type="number" min={0} value={form.fileSizeKb} onChange={(e) => setForm((f) => ({ ...f, fileSizeKb: e.target.value }))} />
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
