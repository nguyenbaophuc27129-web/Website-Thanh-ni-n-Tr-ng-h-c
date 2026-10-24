"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ChevronDown, ChevronRight, Building2, Network, School, Search, Plus, Upload,
  Download, Pencil, Trash2, Loader2, Landmark, ShieldCheck, RefreshCw,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select } from "@/components/ui/input";
import { TableWrap, THead, Th, Tr, Td, EmptyRow } from "@/components/ui/table";
import { effectivePermissions, hasPerm } from "@/lib/permissions";
import { ORG_BLOCKS, ORG_BLOCK_LABEL, ORG_LEVEL_SHORT, schoolTypes } from "@/data/org-units";
import type { OrgBlock, OrgUnit } from "@/types";

const BLOCK_ICON: Record<string, typeof Building2> = {
  DAN_CU: Landmark,
  TRUONG_HOC: School,
  CO_QUAN: Building2,
  VU_TRANG: ShieldCheck,
};

/** Bỏ hoa thường + dấu để so khớp tìm kiếm / import */
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .trim();
}

interface UnitForm {
  parentId: string;
  name: string;
  shortName: string;
  block: string; // "" = chưa phân khối
  adminUnitName: string;
  schoolTypeName: string;
  address: string;
  isActive: boolean;
}

const EMPTY_FORM: UnitForm = {
  parentId: "", name: "", shortName: "", block: "", adminUnitName: "", schoolTypeName: "", address: "", isActive: true,
};

interface ImportRow {
  name: string;
  block: string;
  parentName: string;
  shortName: string;
  adminUnitName: string;
  schoolTypeName: string;
  address: string;
  error?: string;
}

export default function DonViPage() {
  const store = useStore();
  const { session } = useAuth();
  const { toast } = useToast();

  const perms = useMemo(
    () => (session ? effectivePermissions({ role: session.role, contactPosition: session.contactPosition }) : []),
    [session]
  );
  const canManage = !!session && session.role === "QUAN_TRI_TW" && hasPerm(perms, "*");

  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [selectedId, setSelectedId] = useState<number>(1);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<OrgUnit | null>(null);
  const [form, setForm] = useState<UnitForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);

  /* Nạp cây mới nhất từ DB (ghi đè seed trong store — mọi trang cùng thấy) */
  const refresh = useCallback(
    async (silent = false) => {
      setRefreshing(true);
      try {
        const res = await fetch("/api/org-units");
        const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; units?: OrgUnit[] } | null;
        if (!res.ok || !data?.ok || !data.units) throw new Error(data?.error ?? `HTTP ${res.status}`);
        store.setOrgUnits(data.units);
      } catch {
        if (!silent) toast("Không nạp được cây đơn vị từ máy chủ — đang dùng dữ liệu nền.", "warning");
      } finally {
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    if (canManage) void refresh(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage]);

  const units = store.orgUnits;
  const childrenOf = useCallback((id: number) => units.filter((u) => u.parentId === id), [units]);

  const selected = store.orgById(selectedId);
  const toggle = (id: number) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const expandAncestors = useCallback(
    (id: number) => {
      setCollapsed((prev) => {
        const next = new Set(prev);
        let cur = units.find((u) => u.id === id);
        while (cur?.parentId != null) {
          next.delete(cur.parentId);
          cur = units.find((u) => u.id === cur!.parentId);
        }
        return next;
      });
    },
    [units]
  );

  const selectUnit = (id: number) => {
    setSelectedId(id);
    expandAncestors(id);
  };

  /* Bảng: khi có từ khoá thì tìm toàn cây, không thì hiển thị con trực tiếp của đơn vị đang chọn */
  const tableRows: { unit: OrgUnit; parentName?: string }[] = useMemo(() => {
    const q = norm(query);
    if (q) {
      return units
        .filter((u) => norm(`${u.name} ${u.shortName} ${u.code}`).includes(q))
        .map((unit) => ({ unit, parentName: unit.parentId ? store.orgName(unit.parentId) : "—" }));
    }
    return childrenOf(selectedId).map((unit) => ({ unit }));
  }, [query, units, childrenOf, selectedId, store]);

  /* Đơn vị cha khả dụng cho form: mọi đơn vị đang hoạt động, sắp theo cấp */
  const parentOptions = useMemo(
    () => [...units].filter((u) => u.isActive).sort((a, b) => a.orgLevel - b.orgLevel || a.name.localeCompare(b.name, "vi")),
    [units]
  );

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, parentId: String(selectedId) });
    setCreateOpen(true);
  };

  const openEdit = (u: OrgUnit) => {
    setEditTarget(u);
    setForm({
      parentId: String(u.parentId ?? ""),
      name: u.name,
      shortName: u.shortName,
      block: u.block ?? "",
      adminUnitName: u.adminUnitName ?? "",
      schoolTypeName: u.schoolTypeName ?? "",
      address: u.address ?? "",
      isActive: u.isActive,
    });
  };

  const formParentLevel = units.find((u) => u.id === Number(form.parentId))?.orgLevel ?? 0;
  const formLevel = Math.min(formParentLevel + 1, 5) as 1 | 2 | 3 | 4 | 5;

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast("Nhập tên tổ chức.", "warning");
      return;
    }
    if (!form.parentId) {
      toast("Chọn đơn vị cấp trên.", "warning");
      return;
    }
    setSaving(true);
    try {
      if (editTarget) {
        const res = await fetch("/api/org-units", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editTarget.id,
            name: form.name,
            shortName: form.shortName,
            block: form.block || null,
            adminUnitName: form.adminUnitName,
            schoolTypeName: form.block === "TRUONG_HOC" ? form.schoolTypeName : null,
            address: form.address,
            isActive: form.isActive,
          }),
        });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
        if (!res.ok || !data?.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        toast("Đã cập nhật thông tin đơn vị.");
      } else {
        const parent = units.find((u) => u.id === Number(form.parentId));
        const res = await fetch("/api/org-units", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parentId: Number(form.parentId),
            name: form.name,
            shortName: form.shortName,
            orgLevel: Math.min((parent?.orgLevel ?? 1) + 1, 5),
            block: form.block || null,
            adminUnitName: form.adminUnitName,
            schoolTypeName: form.block === "TRUONG_HOC" ? form.schoolTypeName : undefined,
            address: form.address,
          }),
        });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; id?: number; error?: string } | null;
        if (!res.ok || !data?.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
        if (data.id) selectUnit(data.id);
        toast("Đã thêm đơn vị mới vào cây tổ chức.");
      }
      setCreateOpen(false);
      setEditTarget(null);
      await refresh(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Không lưu được đơn vị.", "warning");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/org-units?id=${id}`, { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      toast("Đã xoá đơn vị khỏi cây tổ chức.");
      if (selectedId === id) setSelectedId(1);
      await refresh(true);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Không xoá được đơn vị.", "warning");
    } finally {
      setConfirmDeleteId(null);
    }
  };

  /* ============ Import Excel ============ */

  const downloadTemplate = async () => {
    try {
      const res = await fetch("/api/org-units/template");
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mau-nhap-don-vi.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast("Không tải được file mẫu — thử lại sau.", "warning");
    }
  };

  const parseImportFile = async (file: File | undefined) => {
    if (!file) return;
    setParsing(true);
    try {
      let rows: string[][] = [];
      if (/\.(xlsx|xls)$/i.test(file.name)) {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false }) as unknown as string[][];
      } else {
        rows = (await file.text())
          .replace(/^\uFEFF/, "")
          .split(/\r?\n/)
          .filter((line) => line.trim().length > 0)
          .map((line) => line.split(","));
      }
      // Dò dòng tiêu đề
      const headerIdx = rows.findIndex((r) => r.some((c) => norm(String(c)).includes("ten to chuc")));
      if (headerIdx === -1) throw new Error("Thiếu cột 'Tên tổ chức' trong dòng tiêu đề.");
      const header = rows[headerIdx].map((c) => norm(String(c)));
      const col = (kw: string) => header.findIndex((h) => h.includes(kw));
      const iName = col("ten to chuc");
      const iBlock = col("loai to chuc");
      const iParent = col("cap tren") !== -1 ? col("cap tren") : col("don vi cap tren");
      const iShort = col("viet tat");
      const iAdmin = col("hanh chinh");
      const iSchool = col("loai truong");
      const iAddr = col("dia chi");

      const unitByName = new Map<string, OrgUnit>();
      for (const u of units) unitByName.set(norm(u.name), u);
      const blockByLabel = new Map<string, OrgBlock>(ORG_BLOCKS.map((b) => [norm(b.label), b.value]));
      const schoolNames = new Set(schoolTypes.map((s) => norm(s.name)));

      const parsed: ImportRow[] = [];
      for (const r of rows.slice(headerIdx + 1)) {
        const get = (i: number) => (i >= 0 ? String(r[i] ?? "").trim() : "");
        const name = get(iName);
        if (!name) continue;
        const blockLabel = get(iBlock);
        const parentName = get(iParent);
        const schoolTypeName = get(iSchool);
        let error: string | undefined;
        const block = blockByLabel.get(norm(blockLabel));
        if (!block) error = `Loại tổ chức "${blockLabel}" không hợp lệ — chọn trong sheet DanhMuc.`;
        else if (!parentName) error = "Thiếu đơn vị cấp trên.";
        else if (!unitByName.has(norm(parentName))) error = `Đơn vị cấp trên "${parentName}" không tồn tại trên hệ thống.`;
        else if (schoolTypeName && !schoolNames.has(norm(schoolTypeName))) error = `Loại trường "${schoolTypeName}" không có trong danh mục.`;
        parsed.push({
          name,
          block: blockLabel,
          parentName,
          shortName: get(iShort),
          adminUnitName: get(iAdmin),
          schoolTypeName,
          address: get(iAddr),
          error,
        });
      }
      if (parsed.length === 0) throw new Error("File không có dòng dữ liệu nào.");
      setImportRows(parsed);
    } catch (err) {
      toast(err instanceof Error ? err.message : "Không đọc được file. Hãy dùng file .xlsx theo mẫu.", "warning");
    } finally {
      setParsing(false);
    }
  };

  const doImport = async () => {
    const valid = importRows.filter((r) => !r.error);
    if (valid.length === 0) return;
    setImporting(true);
    let okCount = 0;
    const failures: string[] = [];
    // Bản đồ tên → đơn vị, cập nhật dần để hỗ trợ chuỗi lồng nhau trong cùng file
    const unitByName = new Map<string, { id: number; name: string; orgLevel: number }>();
    for (const u of units) unitByName.set(norm(u.name), { id: u.id, name: u.name, orgLevel: u.orgLevel });
    for (const row of valid) {
      const parent = unitByName.get(norm(row.parentName));
      if (!parent) {
        failures.push(`${row.name}: mất đơn vị cấp trên "${row.parentName}"`);
        continue;
      }
      try {
        const res = await fetch("/api/org-units", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parentId: parent.id,
            name: row.name,
            shortName: row.shortName,
            orgLevel: Math.min(parent.orgLevel + 1, 5),
            block: row.block,
            adminUnitName: row.adminUnitName,
            schoolTypeName: row.schoolTypeName || undefined,
            address: row.address,
          }),
        });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; id?: number; error?: string } | null;
        if (!res.ok || !data?.ok || !data.id) throw new Error(data?.error ?? `HTTP ${res.status}`);
        okCount += 1;
        unitByName.set(norm(row.name), { id: data.id, name: row.name, orgLevel: Math.min(parent.orgLevel + 1, 5) });
      } catch (err) {
        failures.push(`${row.name}: ${err instanceof Error ? err.message : "lỗi không rõ"}`);
      }
    }
    setImporting(false);
    await refresh(true);
    setImportOpen(false);
    setImportRows([]);
    if (failures.length === 0) toast(`Đã nhập thành công ${okCount} đơn vị.`);
    else toast(`Nhập được ${okCount}/${valid.length} dòng. Lỗi: ${failures.slice(0, 3).join("; ")}${failures.length > 3 ? "…" : ""}`, "warning");
  };

  /* ============ Cây đơn vị ============ */

  const renderNode = (u: OrgUnit, depth: number) => {
    const children = childrenOf(u.id);
    const open = !collapsed.has(u.id);
    const BlockIcon = (u.block && BLOCK_ICON[u.block]) || (u.orgLevel >= 3 ? Building2 : Network);
    const accountsHere = store.accounts.filter((a) => a.orgUnitId === u.id).length;
    return (
      <div key={u.id}>
        <div
          className={`flex items-center gap-2 py-2.5 pr-3 ${depth > 0 ? "border-t border-stone-50" : ""}`}
          style={{ paddingLeft: `${8 + depth * 18}px` }}
        >
          {children.length > 0 ? (
            <button onClick={() => toggle(u.id)} className="rounded p-0.5 text-stone-400 hover:bg-stone-100" aria-label="Mở rộng">
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          ) : (
            <span className="w-5" />
          )}
          <button onClick={() => selectUnit(u.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
            <BlockIcon className={`h-4 w-4 shrink-0 ${selectedId === u.id ? "text-doan-600" : "text-stone-400"}`} />
            <span className={`truncate text-sm ${selectedId === u.id ? "font-bold text-doan-700" : "font-medium text-stone-800"}`}>
              {u.shortName || u.name}
            </span>
            {!u.isActive ? <Badge tone="gray">Ngừng</Badge> : null}
          </button>
          {accountsHere > 0 ? <Badge tone="blue">{accountsHere} TK</Badge> : null}
        </div>
        {open && children.length > 0 ? (
          <div style={{ marginLeft: `${8 + depth * 18}px` }} className="border-l-2 border-stone-100">
            {children.map((c) => renderNode(c, depth + 1))}
          </div>
        ) : null}
      </div>
    );
  };

  if (session && !canManage) {
    return (
      <Card>
        <CardBody className="py-14 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-stone-300" />
          <p className="mt-3 text-sm font-medium text-stone-600">Chỉ Quản trị Trung ương (toàn quyền) mới quản lý cây đơn vị tổ chức.</p>
        </CardBody>
      </Card>
    );
  }

  const roots = units.filter((u) => u.parentId === null);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif-display text-xl font-bold text-stone-900">Cây đơn vị tổ chức</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            TW Đoàn → 34 tỉnh/thành + đoàn trực thuộc TW → các cấp dưới do tỉnh/thành đoàn tự tạo. Bấm vào đơn vị để xem cấp dưới.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void refresh()} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Làm mới
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        {/* Cây bên trái */}
        <Card className="self-start">
          <CardHeader
            title="Sơ đồ tổ chức"
            subtitle={`${units.length} đơn vị · ${units.filter((u) => u.isActive).length} đang hoạt động`}
          />
          <CardBody className="thin-scrollbar max-h-[calc(100dvh-14rem)] overflow-y-auto p-2">
            {roots.map((r) => renderNode(r, 0))}
          </CardBody>
        </Card>

        {/* Bảng tổng quan bên phải */}
        <div className="space-y-4">
          <Card>
            <CardBody className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-stone-900">{selected?.name ?? "—"}</p>
                <p className="mt-0.5 text-xs text-stone-500">
                  {selected ? `Cấp ${ORG_LEVEL_SHORT[selected.orgLevel] ?? selected.orgLevel} · Mã ${selected.code} · ${childrenOf(selectedId).length} đơn vị cấp dưới trực tiếp` : ""}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Tìm toàn cây theo tên, mã…"
                    className="w-56 pl-8"
                  />
                </div>
                <Button variant="secondary" onClick={() => setImportOpen(true)}>
                  <Upload className="h-4 w-4" /> Import Excel
                </Button>
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4" /> Thêm mới
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-0">
              <TableWrap>
                <table className="w-full">
                  <THead>
                    <tr>
                      <Th className="w-14">STT</Th>
                      <Th>Tên tổ chức</Th>
                      <Th>Loại tổ chức</Th>
                      <Th>Cấp tổ chức</Th>
                      <Th className="text-right">Thao tác</Th>
                    </tr>
                  </THead>
                  <tbody>
                    {tableRows.map(({ unit, parentName }, i) => (
                      <Tr key={unit.id} className="cursor-pointer" onClick={() => selectUnit(unit.id)}>
                        <Td className="text-stone-400">{i + 1}</Td>
                        <Td>
                          <p className="font-medium text-stone-800">
                            {unit.name} {!unit.isActive ? <Badge tone="gray">Ngừng hoạt động</Badge> : null}
                          </p>
                          <p className="text-[11px] text-stone-400">
                            {unit.code}
                            {query ? ` · Cấp trên: ${parentName}` : ""}
                          </p>
                        </Td>
                        <Td className="text-xs">{unit.block ? ORG_BLOCK_LABEL[unit.block] : "—"}</Td>
                        <Td>
                          <Badge tone={unit.orgLevel === 2 ? "blue" : unit.orgLevel === 3 ? "yellow" : unit.orgLevel >= 4 ? "green" : "purple"}>
                            {ORG_LEVEL_SHORT[unit.orgLevel] ?? `Cấp ${unit.orgLevel}`}
                          </Badge>
                        </Td>
                        <Td className="text-right">
                          <span className="inline-flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button size="sm" variant="secondary" onClick={() => openEdit(unit)} title="Sửa thông tin">
                              <Pencil className="h-3.5 w-3.5" /> Sửa
                            </Button>
                            {confirmDeleteId === unit.id ? (
                              <Button size="sm" variant="danger" onClick={() => void handleDelete(unit.id)}>
                                Xác nhận xoá?
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                title={childrenOf(unit.id).length > 0 ? "Đơn vị còn cấp dưới — không xoá được" : "Xoá đơn vị"}
                                disabled={childrenOf(unit.id).length > 0}
                                onClick={() => {
                                  setConfirmDeleteId(unit.id);
                                  setTimeout(() => setConfirmDeleteId((cur) => (cur === unit.id ? null : cur)), 3000);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Xoá
                              </Button>
                            )}
                          </span>
                        </Td>
                      </Tr>
                    ))}
                    {tableRows.length === 0 ? (
                      <EmptyRow colSpan={5} message={query ? "Không tìm thấy đơn vị nào khớp từ khoá." : "Đơn vị này chưa có cấp dưới — bấm 'Thêm mới' để tạo."} />
                    ) : null}
                  </tbody>
                </table>
              </TableWrap>
            </CardBody>
          </Card>

          <p className="flex items-start gap-1.5 text-[11px] text-stone-400">
            <Network className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Cây đơn vị lưu tại bảng org_units (materialized path, 5 cấp: TW → Tỉnh/Thành → Cấp trên cơ sở → Cơ sở → Dưới cơ sở). Mọi thay đổi đồng bộ ngay lên máy chủ.
          </p>
        </div>
      </div>

      {/* Modal Thêm mới / Sửa */}
      <Modal
        open={createOpen || editTarget !== null}
        onClose={() => {
          setCreateOpen(false);
          setEditTarget(null);
        }}
        title={editTarget ? `Sửa thông tin: ${editTarget.shortName || editTarget.name}` : "Thêm đơn vị tổ chức mới"}
        wide
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setCreateOpen(false);
                setEditTarget(null);
              }}
            >
              Hủy
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {editTarget ? "Lưu thay đổi" : "Thêm mới"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Tên tổ chức" required hint="Ví dụ: Đoàn Phường Tân Định · Đoàn Trường THPT Chuyên Tuyên Quang">
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tên viết tắt">
              <Input value={form.shortName} onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value }))} placeholder="VD: Đoàn P. Tân Định" />
            </Field>
            <Field label="Loại tổ chức" required hint={ORG_BLOCKS.find((b) => String(b.value) === form.block)?.hint ?? "Chọn 1 trong 4 khối tổ chức Đoàn"}>
              <Select value={form.block} onChange={(e) => setForm((f) => ({ ...f, block: e.target.value }))}>
                <option value="">— Chọn khối tổ chức —</option>
                {ORG_BLOCKS.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Đơn vị cấp trên" required hint="Đơn vị mới sẽ là cấp dưới trực tiếp của đơn vị này">
              <Select value={form.parentId} onChange={(e) => setForm((f) => ({ ...f, parentId: e.target.value }))} disabled={!!editTarget}>
                <option value="">— Chọn đơn vị cấp trên —</option>
                {parentOptions.map((u) => (
                  <option key={u.id} value={u.id}>
                    {"—".repeat(Math.max(u.orgLevel - 1, 0))} {u.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cấp tổ chức" hint="Tự xếp theo cấp dưới trực tiếp của đơn vị cấp trên">
              <Input value={ORG_LEVEL_SHORT[formLevel] ?? ""} disabled />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Đơn vị hành chính" hint="Ví dụ: Tỉnh Lào Cai · Phường Tân Định">
              <Input value={form.adminUnitName} onChange={(e) => setForm((f) => ({ ...f, adminUnitName: e.target.value }))} />
            </Field>
            {form.block === "TRUONG_HOC" ? (
              <Field label="Loại trường" hint="Chỉ áp dụng khi tổ chức là trường học cấp cơ sở">
                <Select value={form.schoolTypeName} onChange={(e) => setForm((f) => ({ ...f, schoolTypeName: e.target.value }))}>
                  <option value="">— Chọn loại trường —</option>
                  {schoolTypes.map((s) => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </Select>
              </Field>
            ) : null}
          </div>
          <Field label="Địa chỉ">
            <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
          </Field>
          {editTarget ? (
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input
                type="checkbox"
                className="accent-doan-600"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Đơn vị đang hoạt động
            </label>
          ) : null}
        </div>
      </Modal>

      {/* Modal Import Excel */}
      <Modal
        open={importOpen}
        onClose={() => {
          setImportOpen(false);
          setImportRows([]);
        }}
        title="Nhập cây đơn vị từ file Excel"
        wide
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setImportOpen(false);
                setImportRows([]);
              }}
            >
              Hủy
            </Button>
            <Button onClick={doImport} disabled={importing || importRows.filter((r) => !r.error).length === 0}>
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Nhập {importRows.filter((r) => !r.error).length} dòng hợp lệ
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            File mẫu đã có <b>danh sách thả xuống</b> cho Loại tổ chức, Đơn vị cấp trên (cập nhật theo cây hiện tại) và Loại trường — chọn thay vì gõ tay.
            Cấp tổ chức tự xếp theo đơn vị cấp trên.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-3.5 w-3.5" /> Tải file mẫu (.xlsx)
            </Button>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-500 transition hover:border-doan-400 hover:text-doan-700">
              {parsing ? "Đang đọc file…" : "Chọn file (.xlsx)"}
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv,.txt"
                onChange={(e) => void parseImportFile(e.target.files?.[0])}
              />
            </label>
          </div>
          {importRows.length > 0 ? (
            <div className="thin-scrollbar max-h-80 overflow-y-auto rounded-lg border border-stone-100">
              <TableWrap>
                <table className="w-full">
                  <THead>
                    <tr>
                      <Th className="w-10">#</Th>
                      <Th>Tên tổ chức</Th>
                      <Th>Loại tổ chức</Th>
                      <Th>Đơn vị cấp trên</Th>
                      <Th>Kết quả đọc</Th>
                    </tr>
                  </THead>
                  <tbody>
                    {importRows.map((r, i) => (
                      <Tr key={i}>
                        <Td className="text-stone-400">{i + 1}</Td>
                        <Td className="font-medium">{r.name}</Td>
                        <Td className="text-xs">{r.block}</Td>
                        <Td className="text-xs">{r.parentName}</Td>
                        <Td>
                          {r.error ? (
                            <span className="text-xs font-medium text-red-600">{r.error}</span>
                          ) : (
                            <span className="text-xs font-medium text-emerald-600">Hợp lệ</span>
                          )}
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
