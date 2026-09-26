"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Building2, Network, School } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

const LEVEL_LABEL: Record<number, string> = { 1: "Trung ương", 2: "Tỉnh/Thành", 3: "Phường/Xã", 4: "Cơ sở (trường)" };

export default function DonViPage() {
  const store = useStore();
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [selectedId, setSelectedId] = useState<number>(1);

  const roots = useMemo(() => store.orgUnits.filter((u) => u.parentId === null), [store.orgUnits]);
  const childrenOf = (id: number) => store.orgUnits.filter((u) => u.parentId === id);
  const selected = store.orgById(selectedId);

  const toggle = (id: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderNode = (u: (typeof store.orgUnits)[number], depth: number) => {
    const children = childrenOf(u.id);
    const open = !collapsed.has(u.id);
    const accountsHere = store.accounts.filter((a) => a.orgUnitId === u.id);
    return (
      <div key={u.id}>
        <div
          className={`flex flex-wrap items-center gap-2 py-2.5 pr-4 ${depth > 0 ? "border-t border-stone-50" : ""}`}
          style={{ paddingLeft: `${12 + depth * 22}px` }}
        >
          {children.length > 0 ? (
            <button onClick={() => toggle(u.id)} className="rounded p-0.5 text-stone-400 hover:bg-stone-100" aria-label="Mở rộng">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-5" />
          )}
          <button onClick={() => setSelectedId(u.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
            {u.orgLevel === 4 ? <School className="h-4 w-4 shrink-0 text-stone-400" /> : <Building2 className="h-4 w-4 shrink-0 text-doan-500" />}
            <span className={`truncate text-sm ${selectedId === u.id ? "font-bold text-doan-700" : "font-medium text-stone-800"}`}>
              {u.name}
            </span>
            {!u.isActive ? <Badge tone="gray">Ngừng hoạt động</Badge> : null}
          </button>
          <span className="text-[11px] text-stone-400">Cấp {u.orgLevel}</span>
          {accountsHere.length > 0 ? <Badge tone="blue">{accountsHere.length} TK</Badge> : null}
        </div>
        {open && children.length > 0 ? (
          <div style={{ marginLeft: `${10 + depth * 22}px` }} className="border-l-2 border-stone-100">
            {children.map((c) => renderNode(c, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  const accountsOfUnit = store.accounts.filter((a) => a.orgUnitId === selectedId);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif-display text-xl font-bold text-stone-900">Cây đơn vị tổ chức</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Cấu trúc 4 cấp: Ban TNTH Trung ương → Tỉnh/Thành Đoàn → Đoàn Phường/Xã → Đoàn Trường học.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader
            title="Sơ đồ tổ chức"
            subtitle={`${store.orgUnits.length} đơn vị · ${store.orgUnits.filter((u) => u.isActive).length} đang hoạt động`}
          />
          <CardBody className="p-2">
            {roots.map((r) => renderNode(r, 0))}
          </CardBody>
        </Card>

        <div className="space-y-4">
          {selected ? (
            <Card>
              <CardHeader title={selected.shortName} subtitle={selected.name} />
              <CardBody className="space-y-2.5 text-sm">
                {[
                  ["Mã đơn vị", selected.code],
                  ["Cấp", LEVEL_LABEL[selected.orgLevel]],
                  ["Đơn vị hành chính", selected.adminUnitName],
                  ...(selected.schoolTypeName ? [["Loại trường", selected.schoolTypeName]] : []),
                  ...(selected.address ? [["Địa chỉ", selected.address]] : []),
                  ["Đơn vị cấp trên", selected.parentId ? (store.orgName(selected.parentId) ?? "—") : "—"],
                  ["Đơn vị cấp dưới trực tiếp", String(childrenOf(selected.id).length)],
                  ["Trạng thái", selected.isActive ? "Đang hoạt động" : "Ngừng hoạt động"],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between gap-3 border-b border-stone-50 pb-2 last:border-0">
                    <span className="text-stone-400">{k}</span>
                    <span className="text-right font-medium text-stone-700">{v}</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader title="Tài khoản thuộc đơn vị" />
            <CardBody className="p-0">
              {accountsOfUnit.length > 0 ? (
                <ul className="divide-y divide-stone-100">
                  {accountsOfUnit.map((a) => (
                    <li key={a.id} className="px-4 py-2.5">
                      <p className="text-sm font-medium text-stone-800">{a.contactPerson}</p>
                      <p className="text-[11px] text-stone-400">{a.username} · {a.email}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-6 text-center text-xs text-stone-400">Đơn vị chưa có tài khoản.</p>
              )}
            </CardBody>
          </Card>

          <p className="flex items-start gap-1.5 text-[11px] text-stone-400">
            <Network className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Prototype: cây đơn vị đọc từ mock data. Khi tích hợp, bảng org_units dùng materialized path để truy vấn toàn bộ cấp dưới.
          </p>
        </div>
      </div>
    </div>
  );
}
