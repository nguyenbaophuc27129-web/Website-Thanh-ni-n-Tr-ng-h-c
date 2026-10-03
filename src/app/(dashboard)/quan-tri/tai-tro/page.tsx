"use client";

import { useState } from "react";
import { Handshake, ShieldAlert, Pencil, Plus, Globe, Megaphone, LayoutDashboard, Newspaper } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { TableWrap, THead, Th, Tr, Td, EmptyRow } from "@/components/ui/table";
import type { Sponsor } from "@/types";

type SponsorTier = Sponsor["tier"];
const TIER_LABEL: Record<SponsorTier, string> = { GOLD: "Vàng", SILVER: "Bạc", BRONZE: "Đồng" };
const TIER_TONE: Record<SponsorTier, "yellow" | "gray" | "orange"> = {
  GOLD: "yellow",
  SILVER: "gray",
  BRONZE: "orange",
};
const TIER_PERK: Record<SponsorTier, string> = {
  GOLD: "Banner trang chủ + logo đầu danh sách",
  SILVER: "Logo trong dải tài trợ trang chủ",
  BRONZE: "Logo trong dải tài trợ chuyên trang",
};

/** Các vị trí hiển thị tài trợ đang hoạt động trên hệ thống */
const PLACEMENTS = [
  { icon: LayoutDashboard, title: "Dải tài trợ trang chủ", desc: "Section “Nhà tài trợ đồng hành” cuối trang chủ — hiển thị đầy đủ 3 tier, GOLD xếp trước." },
  { icon: Newspaper, title: "Strip chuyên trang", desc: "Các trang Thi kiến thức, Dự án tình nguyện… có dải logo tài trợ cuối trang." },
  { icon: Megaphone, title: "Banner trang chủ (GOLD)", desc: "Quyền lợi GOLD: logo đặt vị trí nổi bật nhất, xếp đầu dải." },
  { icon: Globe, title: "Liên kết website", desc: "Mỗi tài trợ có websiteUrl — bấm logo mở trang nhà tài trợ trong tab mới." },
];

type Draft = Omit<Sponsor, "id">;

const emptyDraft: Draft = { name: "", tier: "SILVER", websiteUrl: "", note: "", sinceYear: 2026, isActive: true };

export default function TaiTroAdminPage() {
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Sponsor | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  if (!session || session.role !== "QUAN_TRI_TW") {
    return (
      <Card>
        <CardBody className="flex flex-col items-center py-16 text-center">
          <ShieldAlert className="h-10 w-10 text-stone-300" />
          <p className="mt-3 text-sm font-semibold text-stone-700">Trang này chỉ dành cho Ban TNTH Trung ương</p>
          <p className="mt-1 text-xs text-stone-400">Thông tin nhà tài trợ do TW quản lý tập trung.</p>
        </CardBody>
      </Card>
    );
  }

  const openEdit = (s: Sponsor) => {
    setEditing(s);
    setDraft({ name: s.name, tier: s.tier, websiteUrl: s.websiteUrl ?? "", note: s.note ?? "", sinceYear: s.sinceYear, isActive: s.isActive });
  };

  const openCreate = () => {
    setCreating(true);
    setDraft({ ...emptyDraft, sinceYear: new Date().getFullYear() });
  };

  const save = () => {
    if (draft.name.trim().length < 2) {
      toast("Nhập tên nhà tài trợ.", "warning");
      return;
    }
    store.saveSponsor(
      { ...draft, name: draft.name.trim(), websiteUrl: (draft.websiteUrl ?? "").trim() || undefined, note: (draft.note ?? "").trim() || undefined },
      editing?.id
    );
    toast(editing ? `Đã cập nhật nhà tài trợ ${draft.name}.` : `Đã thêm nhà tài trợ ${draft.name}.`, "success");
    setEditing(null);
    setCreating(false);
  };

  const activeCount = store.sponsors.filter((s) => s.isActive).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif-display text-xl font-bold text-stone-900">Nhà tài trợ</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            {store.sponsors.length} tài trợ ({activeCount} đang hiển thị) — sửa thông tin sẽ cập nhật ngay dải tài trợ công khai.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Thêm tài trợ
        </Button>
      </div>

      <Card>
        <CardBody className="p-0">
          <TableWrap>
            <THead>
              <Th>Tổ chức</Th>
              <Th>Cấp tài trợ</Th>
              <Th>Website</Th>
              <Th>Từ năm</Th>
              <Th>Ghi chú vị trí</Th>
              <Th>Trạng thái</Th>
              <Th className="text-right">Sửa</Th>
            </THead>
            <tbody>
              {store.sponsors.length === 0 ? <EmptyRow colSpan={7} /> : null}
              {store.sponsors.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <span className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
                        <Handshake className="h-4 w-4" />
                      </span>
                      <span className="font-semibold text-stone-800">{s.name}</span>
                    </span>
                  </Td>
                  <Td><Badge tone={TIER_TONE[s.tier]}>{TIER_LABEL[s.tier]}</Badge></Td>
                  <Td>
                    {s.websiteUrl ? (
                      <a href={s.websiteUrl} target="_blank" rel="noreferrer" className="text-xs text-doan-600 hover:underline">
                        {s.websiteUrl.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      <span className="text-xs text-stone-300">—</span>
                    )}
                  </Td>
                  <Td className="text-xs">{s.sinceYear}</Td>
                  <Td className="max-w-56 text-xs text-stone-500"><span className="line-clamp-1">{s.note ?? "—"}</span></Td>
                  <Td>{s.isActive ? <Badge tone="green">Đang hiển thị</Badge> : <Badge tone="gray">Tạm ẩn</Badge>}</Td>
                  <Td className="text-right">
                    <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                      <Pencil className="h-3.5 w-3.5" /> Sửa
                    </Button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableWrap>
        </CardBody>
      </Card>

      {/* ===== Các vị trí đặt tài trợ ===== */}
      <Card>
        <CardBody>
          <p className="text-sm font-bold text-stone-900">Các vị trí đặt tài trợ</p>
          <p className="mt-0.5 text-xs text-stone-400">Quyền lợi tương ứng từng cấp — dùng khi làm hồ sơ tài trợ gửi đối tác.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {PLACEMENTS.map((p) => (
              <div key={p.title} className="rounded-xl border border-stone-100 bg-stone-50/60 p-3.5">
                <p className="inline-flex items-center gap-2 text-xs font-bold text-stone-800">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-doan-50 text-doan-600">
                    <p.icon className="h-3.5 w-3.5" />
                  </span>
                  {p.title}
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-stone-500">{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-2 rounded-xl bg-amber-50 p-3.5 sm:grid-cols-3">
            {(["GOLD", "SILVER", "BRONZE"] as SponsorTier[]).map((t) => (
              <p key={t} className="text-xs text-stone-600">
                <Badge tone={TIER_TONE[t]}>{TIER_LABEL[t]}</Badge>{" "}
                <span className="mt-1 block text-stone-500">{TIER_PERK[t]}</span>
              </p>
            ))}
          </div>
        </CardBody>
      </Card>

      <Modal
        open={creating || editing !== null}
        onClose={() => { setCreating(false); setEditing(null); }}
        title={editing ? `Sửa tài trợ: ${editing.name}` : "Thêm nhà tài trợ mới"}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setCreating(false); setEditing(null); }}>Hủy</Button>
            <Button onClick={save}>Lưu</Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Field label="Tên tổ chức" required>
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="VD: Ngân hàng TMCP Đầu tư và Phát triển" />
          </Field>
          <Field label="Cấp tài trợ" hint={TIER_PERK[draft.tier]}>
            <div className="flex gap-2">
              {(["GOLD", "SILVER", "BRONZE"] as SponsorTier[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDraft({ ...draft, tier: t })}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                    draft.tier === t ? "border-doan-500 bg-doan-50 text-doan-700" : "border-stone-200 text-stone-500 hover:bg-stone-50"
                  }`}
                >
                  {TIER_LABEL[t]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Website (không bắt buộc)">
            <Input value={draft.websiteUrl} onChange={(e) => setDraft({ ...draft, websiteUrl: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label="Ghi chú vị trí đặt">
            <Input value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder="VD: Banner cổng cổ động hội trại" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tài trợ từ năm">
              <Input type="number" value={draft.sinceYear} onChange={(e) => setDraft({ ...draft, sinceYear: Number(e.target.value) || new Date().getFullYear() })} />
            </Field>
            <Field label="Hiển thị công khai">
              <button
                type="button"
                onClick={() => setDraft({ ...draft, isActive: !draft.isActive })}
                className={`w-full rounded-lg border px-3 py-2 text-xs font-semibold ${
                  draft.isActive ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-stone-200 bg-stone-50 text-stone-500"
                }`}
              >
                {draft.isActive ? "Đang hiển thị" : "Tạm ẩn"}
              </button>
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
