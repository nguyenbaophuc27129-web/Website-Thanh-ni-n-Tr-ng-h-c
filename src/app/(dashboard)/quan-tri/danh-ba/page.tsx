"use client";

import { useMemo, useState } from "react";
import {
  Search, Phone, Mail, Star, BookOpen, Users, ShieldAlert, Pencil, Plus, BookMarked, MapPin,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import type { OrgDirectory } from "@/types";

type Draft = Pick<OrgDirectory, "secretaryName" | "secretaryPhone" | "email" | "achievements" | "strengths" | "academicResources" | "clubs">;

const emptyDraft: Draft = {
  secretaryName: "", secretaryPhone: "", email: "", achievements: "", strengths: "", academicResources: "", clubs: "",
};

export default function DanhBaAdminPage() {
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();
  const [q, setQ] = useState("");
  const [editOrgId, setEditOrgId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  const scope = useMemo(() => (session ? new Set(store.scopeIds(session)) : new Set<number>()), [store, session]);
  const isTW = session?.role === "QUAN_TRI_TW";
  const isUnit = session?.role === "DON_VI";

  if (!session) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center py-16 text-center">
          <ShieldAlert className="h-10 w-10 text-stone-300" />
          <p className="mt-3 text-sm font-semibold text-stone-700">Vui lòng đăng nhập</p>
        </CardBody>
      </Card>
    );
  }

  const directories = useMemo(() => {
    let list = store.orgDirectories.filter((d) => scope.has(d.orgUnitId));
    const kw = q.trim().toLowerCase();
    if (kw) {
      list = list.filter((d) => {
        const name = store.orgName(d.orgUnitId).toLowerCase();
        return (
          name.includes(kw) ||
          d.secretaryName.toLowerCase().includes(kw) ||
          d.secretaryPhone.includes(kw) ||
          d.email.toLowerCase().includes(kw)
        );
      });
    }
    return list.sort((a, b) => store.orgName(a.orgUnitId).localeCompare(store.orgName(b.orgUnitId), "vi"));
  }, [store, scope, q]);

  const orgsInScope = useMemo(
    () => store.orgUnits.filter((o) => scope.has(o.id)).map((o) => o.id),
    [store, scope]
  );
  const missingCount = useMemo(
    () => orgsInScope.filter((id) => !store.orgDirectories.some((d) => d.orgUnitId === id)).length,
    [store, orgsInScope]
  );

  const openEdit = (orgUnitId: number) => {
    const existing = store.orgDirectories.find((d) => d.orgUnitId === orgUnitId);
    setEditOrgId(orgUnitId);
    setDraft(
      existing
        ? {
            secretaryName: existing.secretaryName, secretaryPhone: existing.secretaryPhone, email: existing.email,
            achievements: existing.achievements, strengths: existing.strengths,
            academicResources: existing.academicResources, clubs: existing.clubs,
          }
        : emptyDraft
    );
  };

  const save = () => {
    if (!editOrgId) return;
    if (draft.secretaryName.trim().length < 2) {
      toast("Nhập tên bí thư.", "warning");
      return;
    }
    store.saveDirectory(session, editOrgId, {
      secretaryName: draft.secretaryName.trim(),
      secretaryPhone: draft.secretaryPhone.trim(),
      email: draft.email.trim(),
      achievements: draft.achievements.trim(),
      strengths: draft.strengths.trim(),
      academicResources: draft.academicResources.trim(),
      clubs: draft.clubs.trim(),
    });
    toast(`Đã lưu danh bạ ${store.orgName(editOrgId)}.`, "success");
    setEditOrgId(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif-display text-xl font-bold text-stone-900">Danh bạ Đoàn trường</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          {isTW
            ? "Toàn quốc — thông tin liên hệ, điểm mạnh và nguồn lực của từng đơn vị Đoàn."
            : isUnit
              ? "Danh bạ đơn vị của bạn — cập nhật để Ban TNTH và cấp trên liên hệ đúng người."
              : "Danh bạ các đơn vị thuộc phạm vi bạn quản lý."}
        </p>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo đơn vị, bí thư, SĐT, email…" className="pl-10" />
      </div>

      <p className="rounded-lg bg-sky-50 px-4 py-2.5 text-xs text-sky-700">
        Danh bạ là nguồn duy nhất để Ban TNTH liên hệ phổ biến nhiệm vụ, mời cử đại biểu — hãy giữ số điện thoại và email luôn đúng.
      </p>

      <div className="grid gap-3 lg:grid-cols-2">
        {directories.length === 0 ? (
          <Card className="lg:col-span-2">
            <CardBody className="py-12 text-center text-sm text-stone-400">
              Không có danh bạ nào khớp tìm kiếm.
            </CardBody>
          </Card>
        ) : null}
        {directories.map((d) => (
          <Card key={d.id}>
            <CardBody className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="inline-flex items-center gap-1.5 text-sm font-bold text-stone-900">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-doan-600" /> {store.orgName(d.orgUnitId)}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    Bí thư: <b className="text-stone-700">{d.secretaryName}</b>
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => openEdit(d.orgUnitId)}>
                  <Pencil className="h-3.5 w-3.5" /> Sửa
                </Button>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
                <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-emerald-500" /> {d.secretaryPhone}</span>
                <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-sky-500" /> {d.email}</span>
              </div>
              <div className="grid gap-2 rounded-xl bg-stone-50 p-3 text-xs text-stone-600 sm:grid-cols-2">
                <p className="line-clamp-2"><b className="text-stone-700">Thành tích:</b> {d.achievements || "—"}</p>
                <p className="line-clamp-2"><b className="text-stone-700">Điểm mạnh:</b> {d.strengths || "—"}</p>
                <p className="line-clamp-2"><b className="text-stone-700">Nguồn học liệu:</b> {d.academicResources || "—"}</p>
                <p className="line-clamp-2"><b className="text-stone-700">Câu lạc bộ:</b> {d.clubs || "—"}</p>
              </div>
              <p className="text-[10px] text-stone-400">Cập nhật {formatDateTime(d.updatedAt)}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {missingCount > 0 ? (
        <p className="rounded-lg bg-amber-50 px-4 py-2.5 text-xs text-amber-700">
          {missingCount} đơn vị trong phạm vi chưa có danh bạ — hãy bổ sung để hệ thống liên hệ được khi phổ biến nhiệm vụ.
        </p>
      ) : null}

      <Modal
        open={editOrgId !== null}
        onClose={() => setEditOrgId(null)}
        wide
        title={editOrgId ? `Danh bạ: ${store.orgName(editOrgId)}` : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditOrgId(null)}>Hủy</Button>
            <Button onClick={save}>Lưu danh bạ</Button>
          </>
        }
      >
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="Bí thư Đoàn trường" required>
            <Input value={draft.secretaryName} onChange={(e) => setDraft({ ...draft, secretaryName: e.target.value })} />
          </Field>
          <Field label="Số điện thoại">
            <Input value={draft.secretaryPhone} onChange={(e) => setDraft({ ...draft, secretaryPhone: e.target.value })} placeholder="09xx.xxx.xxx" />
          </Field>
          <Field label="Email" className="sm:col-span-2">
            <Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} placeholder="doantruong@…" />
          </Field>
          <Field label="Thành tích nổi bật">
            <Textarea rows={2} value={draft.achievements} onChange={(e) => setDraft({ ...draft, achievements: e.target.value })} placeholder="VD: Cờ đỏ đơn vị xuất sắc 3 năm liền" />
          </Field>
          <Field label="Điểm mạnh">
            <Textarea rows={2} value={draft.strengths} onChange={(e) => setDraft({ ...draft, strengths: e.target.value })} placeholder="VD: Phong trào nghệ thuật, STEM" />
          </Field>
          <Field label="Nguồn học liệu">
            <div className="flex items-start gap-2">
              <BookOpen className="mt-2 h-3.5 w-3.5 shrink-0 text-stone-400" />
              <Textarea rows={2} value={draft.academicResources} onChange={(e) => setDraft({ ...draft, academicResources: e.target.value })} placeholder="VD: Thư viện số 2.000 tài liệu" />
            </div>
          </Field>
          <Field label="Câu lạc bộ Đoàn">
            <div className="flex items-start gap-2">
              <Users className="mt-2 h-3.5 w-3.5 shrink-0 text-stone-400" />
              <Textarea rows={2} value={draft.clubs} onChange={(e) => setDraft({ ...draft, clubs: e.target.value })} placeholder="VD: CLB Truyền thông, CLB Hóa học" />
            </div>
          </Field>
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-stone-50 px-3 py-2 text-[11px] text-stone-500">
          <BookMarked className="h-3.5 w-3.5 text-doan-600" /> Mỗi đơn vị chỉ có 1 mục danh bạ — lưu sẽ ghi đè thông tin cũ.
          <Badge tone="blue">Ghi đè an toàn</Badge>
        </p>
      </Modal>
    </div>
  );
}
