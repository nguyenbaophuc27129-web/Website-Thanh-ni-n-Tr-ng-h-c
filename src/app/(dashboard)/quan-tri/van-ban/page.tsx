"use client";

import { useMemo, useState } from "react";
import { ScrollText, Plus, Send, Undo2, Eye, Lock, Unlock, Paperclip, Download, X, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DocumentStatusBadge } from "@/components/dashboard/status-badge";
import { formatDateTime, formatDate, todayISO } from "@/lib/utils";
import { documentCategories } from "@/data/categories";
import { uploadFile } from "@/lib/upload-client";

const SCOPE_LABEL: Record<string, string> = {
  ALL_DESCENDANTS: "Toàn bộ cấp dưới",
  DIRECT_CHILDREN: "Trực tiếp cấp dưới",
  SELECTED: "Chọn đơn vị cụ thể",
};

const MAX_DOC_BYTES = 25 * 1024 * 1024;

/** Nút tải tệp đính kèm của văn bản (nếu có) */
function DocFileButton({ doc, size = "sm" }: { doc: { fileName?: string; fileDataUrl?: string }; size?: "sm" | "xs" }) {
  if (!doc.fileDataUrl) return null;
  return (
    <a
      href={doc.fileDataUrl}
      download={doc.fileName ?? "van-ban"}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-doan-200 bg-doan-50/60 font-semibold text-doan-700 transition hover:bg-doan-100 ${
        size === "sm" ? "px-3 py-1.5 text-xs" : "px-2 py-1 text-[11px]"
      }`}
    >
      <Download className="h-3.5 w-3.5" /> Tải tệp {doc.fileName ? `(${doc.fileName})` : "đính kèm"}
    </a>
  );
}

export default function VanBanAdminPage() {
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();
  const [tab, setTab] = useState("issued");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [form, setForm] = useState({
    docNumber: "", title: "", summary: "", documentCategoryId: documentCategories[0]?.id.toString() ?? "",
    effectiveDate: "", recipientScope: "ALL_DESCENDANTS", selectedIds: [] as number[],
    fileName: "", fileDataUrl: "",
  });

  const [uploadingDoc, setUploadingDoc] = useState(false);

  /** Tệp đính kèm lưu trên máy chủ — form chỉ giữ đường dẫn /uploads/... */
  const pickDocFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_DOC_BYTES) {
      toast("Tệp quá lớn — tối đa 25MB.", "warning");
      return;
    }
    setUploadingDoc(true);
    try {
      const uploaded = await uploadFile(file, "van-ban");
      setForm((f) => ({ ...f, fileName: file.name, fileDataUrl: uploaded.url }));
    } catch (e) {
      toast(e instanceof Error ? e.message : "Không tải được tệp lên máy chủ.", "warning");
    } finally {
      setUploadingDoc(false);
    }
  };

  const scope = useMemo(() => (session ? store.scopeIds(session) : []), [session, store]);

  const issuedDocs = useMemo(
    () => store.documents.filter((d) => d.issuingOrgUnitId === session?.orgUnitId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [store.documents, session]
  );
  const receivedDocs = useMemo(
    () =>
      store.documents
        .filter((d) => d.issuingOrgUnitId !== session?.orgUnitId)
        .filter((d) => store.docRecipientsOf(d.id).some((r) => r.orgUnitId === session?.orgUnitId))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [store.documents, session, store.documentRecipients]
  );

  const childUnits = useMemo(
    () => store.orgUnits.filter((u) => u.parentId === session?.orgUnitId && u.isActive),
    [store.orgUnits, session]
  );

  const counts = { issued: issuedDocs.length, received: receivedDocs.length };

  const handleIssue = () => {
    if (!session) return;
    if (!form.docNumber.trim() || !form.title.trim()) {
      toast("Nhập số hiệu và trích yếu văn bản.", "warning");
      return;
    }
    if (form.recipientScope === "SELECTED" && form.selectedIds.length === 0) {
      toast("Chọn ít nhất một đơn vị nhận.", "warning");
      return;
    }
    store.issueDocument(
      session,
      {
        docNumber: form.docNumber.trim(),
        title: form.title.trim(),
        summary: form.summary.trim(),
        documentCategoryId: Number(form.documentCategoryId),
        issuedDate: todayISO(),
        effectiveDate: form.effectiveDate || undefined,
        recipientScope: form.recipientScope as "ALL_DESCENDANTS" | "DIRECT_CHILDREN" | "SELECTED",
        ...(form.fileDataUrl ? { fileName: form.fileName, fileDataUrl: form.fileDataUrl } : {}),
      },
      form.selectedIds
    );
    toast("Đã ban hành văn bản — đơn vị nhận được thông báo kèm theo dõi đã đọc.");
    setCreateOpen(false);
    setForm((f) => ({ ...f, docNumber: "", title: "", summary: "", effectiveDate: "", selectedIds: [], fileName: "", fileDataUrl: "" }));
  };

  const toggleSelected = (id: number) =>
    setForm((f) => ({
      ...f,
      selectedIds: f.selectedIds.includes(id) ? f.selectedIds.filter((x) => x !== id) : [...f.selectedIds, id],
    }));

  const detail = store.documents.find((d) => d.id === detailId) ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif-display text-xl font-bold text-stone-900">Văn bản</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Ban hành văn bản theo phạm vi người nhận, theo dõi trạng thái đã đọc của từng đơn vị.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Ban hành văn bản
        </Button>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "issued", label: "Văn bản tôi ban hành", count: counts.issued },
          { value: "received", label: "Văn bản tôi nhận", count: counts.received },
        ]}
      />

      {tab === "issued" ? (
        <div className="space-y-4">
          {issuedDocs.map((d) => {
            const recs = store.docRecipientsOf(d.id);
            const readCount = recs.filter((r) => r.readAt !== null).length;
            return (
              <Card key={d.id}>
                <CardHeader
                  title={`${d.docNumber} — ${d.title}`}
                  subtitle={`Ban hành ${formatDate(d.issuedDate)}${d.effectiveDate ? ` · Hiệu lực ${formatDate(d.effectiveDate)}` : ""} · ${SCOPE_LABEL[d.recipientScope]}`}
                  action={
                    <div className="flex items-center gap-2">
                      <DocumentStatusBadge status={d.status} />
                      {d.status === "ISSUED" ? (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            store.revokeDocument(d.id);
                            toast("Đã thu hồi văn bản.");
                          }}
                        >
                          <Undo2 className="h-3.5 w-3.5" /> Thu hồi
                        </Button>
                      ) : null}
                    </div>
                  }
                />
                <CardBody className="space-y-3">
                  {d.summary ? <p className="text-sm text-stone-600">{d.summary}</p> : null}
                  <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
                    <Button size="sm" variant="secondary" onClick={() => setDetailId(detailId === d.id ? null : d.id)}>
                      <Eye className="h-3.5 w-3.5" /> {detailId === d.id ? "Ẩn người nhận" : "Theo dõi đã đọc"}
                    </Button>
                    <DocFileButton doc={d} />
                    {recs.length > 0 ? (
                      <Badge tone={readCount === recs.length ? "green" : "yellow"}>
                        {readCount}/{recs.length} đơn vị đã đọc
                      </Badge>
                    ) : (
                      <span className="text-xs text-stone-400">Chưa phát hành đến đơn vị nào</span>
                    )}
                  </div>
                  {detailId === d.id && recs.length > 0 ? (
                    <ul className="divide-y divide-stone-100 rounded-lg border border-stone-100">
                      {recs.map((r) => (
                        <li key={r.orgUnitId} className="flex items-center justify-between px-3.5 py-2.5">
                          <span className="text-sm text-stone-700">{store.orgName(r.orgUnitId)}</span>
                          {r.readAt ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                              <Unlock className="h-3 w-3" /> Đã đọc {formatDateTime(r.readAt)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-stone-400">
                              <Lock className="h-3 w-3" /> Chưa đọc
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </CardBody>
              </Card>
            );
          })}
          {issuedDocs.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-stone-300 bg-white py-14">
              <ScrollText className="h-8 w-8 text-stone-300" />
              <p className="mt-3 text-sm text-stone-400">Đơn vị bạn chưa ban hành văn bản nào.</p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {receivedDocs.map((d) => {
            const rec = store.docRecipientsOf(d.id).find((r) => r.orgUnitId === session?.orgUnitId);
            const isRead = rec?.readAt !== null && rec?.readAt !== undefined;
            return (
              <Card key={d.id}>
                <CardHeader
                  title={`${d.docNumber} — ${d.title}`}
                  subtitle={`Cấp trên: ${store.orgName(d.issuingOrgUnitId)} · Ban hành ${formatDate(d.issuedDate)}`}
                  action={<DocumentStatusBadge status={d.status} />}
                />
                <CardBody className="space-y-3">
                  {d.summary ? <p className="text-sm text-stone-600">{d.summary}</p> : null}
                  <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
                    <DocFileButton doc={d} />
                    {isRead ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                        <Unlock className="h-3.5 w-3.5" /> Bạn đã đọc lúc {formatDateTime(rec!.readAt!)}
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          if (!session) return;
                          store.markDocumentRead(d.id, session.orgUnitId);
                          toast("Đã ghi nhận bạn đã đọc văn bản.");
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" /> Đánh dấu đã đọc
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
          {receivedDocs.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-stone-300 bg-white py-14">
              <ScrollText className="h-8 w-8 text-stone-300" />
              <p className="mt-3 text-sm text-stone-400">Bạn chưa nhận văn bản nào.</p>
            </div>
          ) : null}
        </div>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Ban hành văn bản mới"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Hủy</Button>
            <Button onClick={handleIssue} disabled={uploadingDoc}><Send className="h-4 w-4" /> Ban hành</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Số hiệu" required>
              <Input
                value={form.docNumber}
                onChange={(e) => setForm((f) => ({ ...f, docNumber: e.target.value }))}
                placeholder="VD: 45/TNTH-BTW"
              />
            </Field>
            <Field label="Loại văn bản">
              <Select value={form.documentCategoryId} onChange={(e) => setForm((f) => ({ ...f, documentCategoryId: e.target.value }))}>
                {documentCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Trích yếu" required>
            <Input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="VD: V/v triển khai thi đua Chương trình Thanh niên trường học năm 2026"
            />
          </Field>
          <Field label="Tóm tắt nội dung">
            <Textarea value={form.summary} onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))} rows={3} />
          </Field>
          <Field label="Tệp đính kèm" hint="PDF/DOC/XLS/ảnh — tối đa 25MB. Người nhận tải trực tiếp từ văn bản.">
            {form.fileDataUrl ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-xs font-medium text-emerald-800">
                  <Paperclip className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{form.fileName}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, fileName: "", fileDataUrl: "" }))}
                  className="shrink-0 rounded p-1 text-emerald-700 hover:bg-emerald-100"
                  aria-label="Bỏ tệp"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-stone-300 bg-white px-3 py-3 text-xs font-medium text-stone-500 transition hover:border-doan-400 hover:text-doan-700">
                {uploadingDoc ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                {uploadingDoc ? "Đang tải tệp lên máy chủ…" : "Chọn tệp từ máy"}
                <input
                  type="file"
                  className="hidden"
                  disabled={uploadingDoc}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*"
                  onChange={(e) => {
                    void pickDocFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ngày có hiệu lực">
              <Input type="date" value={form.effectiveDate} onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))} />
            </Field>
            <Field label="Phạm vi nhận">
              <Select value={form.recipientScope} onChange={(e) => setForm((f) => ({ ...f, recipientScope: e.target.value, selectedIds: [] }))}>
                <option value="ALL_DESCENDANTS">Toàn bộ cấp dưới</option>
                <option value="DIRECT_CHILDREN">Trực tiếp cấp dưới</option>
                <option value="SELECTED">Chọn đơn vị cụ thể</option>
              </Select>
            </Field>
          </div>
          {form.recipientScope === "SELECTED" ? (
            <Field label="Chọn đơn vị nhận" required hint="Nhấn để chọn/bỏ chọn.">
              <div className="flex flex-wrap gap-2">
                {childUnits.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleSelected(u.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      form.selectedIds.includes(u.id)
                        ? "border-doan-600 bg-doan-600 text-white"
                        : "border-stone-200 bg-white text-stone-600 hover:border-doan-300"
                    }`}
                  >
                    {u.shortName}
                  </button>
                ))}
              </div>
            </Field>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
