"use client";

import { useMemo, useRef, useState } from "react";
import {
  Users, Search, Lock, Unlock, CheckCircle2, UserPlus, FileUp,
  Download, AlertTriangle, Loader2, CircleCheck, CircleX,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";
import { useAuth, ROLE_LABELS, type Role } from "@/lib/auth-context";
import { Card, CardBody } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TableWrap, THead, Th, Tr, Td, EmptyRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import { roleList } from "@/data/org-units";
import { chucDanhQuyenList } from "@/data/chuc-danh-quyen";
import { chucDanhOf, effectivePermissions, hasPerm } from "@/lib/permissions";
import type { Account } from "@/types";

/* ================= File import helpers ================= */

/**
 * Cột file khớp Y CHANG schema 5.2 `accounts` + `account_roles`:
 * username · email · phone · password (hash thành password_hash) ·
 * org_unit_code (FK→org_units.code, schema ghi "dùng khi import Excel") ·
 * contact_person · contact_position · role_code (account_roles) · status
 */
const REQUIRED_COLS = ["username", "email", "password", "org_unit_code"] as const;
const OPTIONAL_COLS = ["phone", "contact_person", "contact_position", "role_code", "status"] as const;

/** Chuẩn hóa chữ: bỏ dấu tiếng Việt, thường, thay khoảng cách bằng _ */
function normText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const HEADER_ALIAS: Record<string, string> = {
  /* Tên cột theo schema */
  username: "username",
  email: "email",
  phone: "phone", so_dien_thoai: "phone", dien_thoai: "phone",
  password: "password",
  org_unit_code: "org_unit_code", ma_don_vi: "org_unit_code",
  contact_person: "contact_person", nguoi_dai_dien: "contact_person",
  contact_position: "contact_position", chuc_vu: "contact_position",
  role_code: "role_code", ma_vai_tro: "role_code",
  status: "status",
  /* Biệt danh tiếng Việt thân thiện (tùy chọn) */
  ten_dang_nhap: "username", tai_khoan: "username",
  ho_ten: "contact_person", ten: "contact_person",
  don_vi: "org_unit_code", truong: "org_unit_code",
  mat_khau: "password",
  vai_tro: "role_code", quyen: "role_code",
  trang_thai: "status",
};

function parseCsv(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const sample = lines[0] ?? "";
  const delim = ([[";", 0], [",", 0], ["\t", 0]] as [string, number][])
    .map(([d]) => [d, sample.split(d).length - 1] as [string, number])
    .sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;
  const push = () => { row.push(cur); cur = ""; };
  const endRow = () => { push(); if (row.some((c) => c.trim())) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delim) push();
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; endRow(); }
    else cur += ch;
  }
  if (cur !== "" || row.length > 0) endRow();
  return rows;
}

async function parseSpreadsheet(file: File): Promise<string[][]> {
  if (/\.(xlsx|xls)$/i.test(file.name)) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", blankrows: false }) as unknown as string[][];
  }
  return parseCsv((await file.text()).replace(/^\uFEFF/, ""));
}

const TEMPLATE_CSV =
  "\uFEFFusername,email,phone,password,org_unit_code,contact_person,contact_position,role_code,status\n" +
  "thpt.chuyenbd,chuyenbd@bd.edu.vn,0918000111,demo123,BD-THPT-CHUYEN,Trần Đăng Khoa,Bí thư Đoàn Trường,DON_VI,ACTIVE\n" +
  "thcs.kimdong,kimdong@bd.edu.vn,0918000222,demo123,BD-HT-TH-KD,Lý Thị Hoa,Tổng phụ trách Đội,DON_VI,ACTIVE\n";

const LEVEL_ROLE: Record<number, Role> = { 2: "QUAN_TRI_TINH", 3: "QUAN_TRI_CAP3", 4: "DON_VI" };

/* ================= Page ================= */

const STATUS_META: Record<Account["status"], { label: string; tone: "green" | "yellow" | "red" | "gray" }> = {
  ACTIVE: { label: "Hoạt động", tone: "green" },
  PENDING: { label: "Chờ duyệt", tone: "yellow" },
  LOCKED: { label: "Đã khóa", tone: "red" },
  DISABLED: { label: "Vô hiệu hóa", tone: "gray" },
};

interface ImportRow {
  rowNo: number;
  data: Record<string, string>;
  unitName: string;
  roleName: string;
  error?: string;
}

export default function TaiKhoanPage() {
  const store = useStore();
  const { session } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    orgUnitId: "", username: "", password: "demo123", hoTen: "", email: "", phone: "", chucVu: "", status: "ACTIVE",
  });
  const [customPos, setCustomPos] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [missingCols, setMissingCols] = useState<string[]>([]);
  const [parsing, setParsing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const canManage = session?.role === "QUAN_TRI_TW" || session?.role === "QUAN_TRI_TINH" || session?.role === "QUAN_TRI_CAP3";
  const scope = useMemo(() => (session ? store.scopeIds(session) : []), [session, store]);

  /** Đơn vị được phép tạo TK: TW → từ cấp Tỉnh trở xuống · Tỉnh → Phường/Trường · Cấp 3 → Trường */
  const creatableUnits = useMemo(() => {
    if (!session) return [];
    const minLevel = session.role === "QUAN_TRI_TW" ? 2 : session.role === "QUAN_TRI_TINH" ? 3 : 4;
    return store.orgUnits.filter((u) => scope.includes(u.id) && u.id !== session.orgUnitId && u.orgLevel >= minLevel && u.isActive);
  }, [session, store.orgUnits, scope]);

  const list = useMemo(
    () =>
      store.accounts
        .filter((a) => scope.includes(a.orgUnitId))
        .filter((a) => (tab === "all" ? true : a.status === tab))
        .filter((a) => {
          const q = search.trim().toLowerCase();
          if (!q) return true;
          return a.username.includes(q) || a.contactPerson.toLowerCase().includes(q) || a.email.toLowerCase().includes(q);
        }),
    [store.accounts, scope, tab, search]
  );

  const counts = useMemo(() => {
    const scoped = store.accounts.filter((a) => scope.includes(a.orgUnitId));
    return {
      all: scoped.length,
      PENDING: scoped.filter((a) => a.status === "PENDING").length,
      ACTIVE: scoped.filter((a) => a.status === "ACTIVE").length,
      LOCKED: scoped.filter((a) => a.status === "LOCKED").length,
    };
  }, [store.accounts, scope]);

  const derivedRole = (unitId: number): Role | null => {
    const u = store.orgById(unitId);
    return u ? LEVEL_ROLE[u.orgLevel] ?? null : null;
  };

  const setStatus = (a: Account, status: Account["status"]) => {
    store.updateAccountStatus(a.id, status);
    toast(`Đã ${status === "ACTIVE" ? "kích hoạt" : status === "LOCKED" ? "khóa" : status === "PENDING" ? "đưa về chờ duyệt" : "vô hiệu hóa"} tài khoản ${a.username}.`);
  };

  /* ---------- Tạo đơn lẻ ---------- */

  const handleCreate = () => {
    if (!form.orgUnitId) {
      toast("Chọn đơn vị cho tài khoản.", "warning");
      return;
    }
    if (!/^[a-z0-9._-]{3,}$/i.test(form.username.trim())) {
      toast("Tên đăng nhập tối thiểu 3 ký tự (chữ, số, dấu chấm, gạch).", "warning");
      return;
    }
    if (!form.hoTen.trim() || !form.email.trim()) {
      toast("Nhập họ tên người đại diện và email.", "warning");
      return;
    }
    const res = store.createAccount({
      orgUnitId: Number(form.orgUnitId),
      username: form.username,
      email: form.email,
      phone: form.phone,
      contactPerson: form.hoTen,
      contactPosition: form.chucVu,
      role: derivedRole(Number(form.orgUnitId)) ?? "DON_VI",
      status: form.status as Account["status"],
      password: form.password,
    });
    if (!res.ok) {
      toast(res.error ?? "Không tạo được tài khoản.", "warning");
      return;
    }
    toast(`Đã tạo tài khoản ${form.username} — mật khẩu ${form.password || "demo123"}, có thể đăng nhập ngay.`);
    setCreateOpen(false);
    setCustomPos(false);
    setForm({ orgUnitId: "", username: "", password: "demo123", hoTen: "", email: "", phone: "", chucVu: "", status: "ACTIVE" });
  };

  /* ---------- Nhập từ file ---------- */

  const resolveUnit = (val: string) => {
    const v = val.trim().toLowerCase();
    return (
      creatableUnits.find((u) => u.code.toLowerCase() === v) ??
      creatableUnits.find((u) => u.shortName.toLowerCase() === v) ??
      creatableUnits.find((u) => u.name.toLowerCase() === v) ??
      (/^\d+$/.test(val) ? creatableUnits.find((u) => u.id === Number(val)) : undefined)
    );
  };

  const resolveRole = (val: string): Role | null => {
    const v = normText(val);
    for (const r of roleList) {
      if (normText(r.code) === v || normText(r.name) === v) return r.code;
    }
    return null;
  };

  const handleFile = async (file: File) => {
    setParsing(true);
    setImportRows([]);
    setMissingCols([]);
    try {
      const grid = await parseSpreadsheet(file);
      if (grid.length < 2) {
        toast("File trống hoặc không có dòng dữ liệu nào.", "warning");
        return;
      }
      const headers = (grid[0] as unknown[]).map((h) => HEADER_ALIAS[normText(String(h))] ?? normText(String(h)));
      const missing = REQUIRED_COLS.filter((c) => !headers.includes(c));
      if (missing.length > 0) {
        setMissingCols(missing);
        return;
      }
      const results: ImportRow[] = [];
      const seenUsernames = new Set(store.accounts.map((a) => a.username.toLowerCase()));
      const seenEmails = new Set(store.accounts.map((a) => a.email.toLowerCase()));
      for (let i = 1; i < grid.length; i++) {
        const raw = grid[i] as unknown[];
        const data: Record<string, string> = {};
        headers.forEach((h, ci) => {
          if (h) data[h] = String(raw[ci] ?? "").trim();
        });
        const rowNo = i + 1;
        const username = data.username ?? "";
        let error: string | undefined;
        const unit = data.org_unit_code ? resolveUnit(data.org_unit_code) : undefined;

        if (!username) error = "Thiếu username";
        else if (!/^[a-z0-9._-]{3,}$/i.test(username)) error = "username không hợp lệ (≥3 ký tự: chữ, số, ., _, -)";
        else if (seenUsernames.has(username.toLowerCase())) error = "username đã tồn tại (UQ)";
        else if (!/^\S+@\S+\.\S+$/.test(data.email ?? "")) error = "email thiếu hoặc không hợp lệ";
        else if (seenEmails.has((data.email ?? "").toLowerCase())) error = "email đã tồn tại (UQ)";
        else if (!data.password) error = "Thiếu password";
        else if (!data.org_unit_code) error = "Thiếu org_unit_code";
        else if (!unit) error = `Không tìm thấy đơn vị mã "${data.org_unit_code}" trong phạm vi của bạn`;
        else if (store.accounts.some((a) => a.orgUnitId === unit.id)) error = `Đơn vị ${unit.shortName} đã có tài khoản (1 đơn vị = 1 tài khoản)`;

        const roleName = unit ? ROLE_LABELS[LEVEL_ROLE[unit.orgLevel]] : (data.role_code ?? "");
        if (!error && data.role_code) {
          const r = resolveRole(data.role_code);
          if (!r) error = `role_code "${data.role_code}" không hợp lệ`;
          else if (unit && r !== LEVEL_ROLE[unit.orgLevel]) error = `Đơn vị cấp ${unit.orgLevel} chỉ nhận vai trò ${ROLE_LABELS[LEVEL_ROLE[unit.orgLevel]]}`;
        }
        if (!error && data.status && !["ACTIVE", "PENDING", "LOCKED", "DISABLED"].includes(data.status.toUpperCase())) {
          error = "status chỉ nhận ACTIVE / PENDING / LOCKED / DISABLED";
        }
        if (!error) {
          seenUsernames.add(username.toLowerCase());
          seenEmails.add((data.email ?? "").toLowerCase());
        }
        results.push({ rowNo, data, unitName: unit?.shortName ?? data.org_unit_code ?? "—", roleName, error });
      }
      setImportRows(results);
    } catch {
      toast("Không đọc được file. Hãy dùng file .xlsx hoặc .csv theo mẫu.", "warning");
    } finally {
      setParsing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const validRows = importRows.filter((r) => !r.error);
  const doImport = () => {
    let ok = 0;
    for (const r of validRows) {
      const unit = resolveUnit(r.data.org_unit_code);
      if (!unit) continue;
      const res = store.createAccount({
        orgUnitId: unit.id,
        username: r.data.username,
        email: r.data.email,
        phone: r.data.phone,
        contactPerson: r.data.contact_person ?? "",
        contactPosition: r.data.contact_position ?? "",
        role: LEVEL_ROLE[unit.orgLevel] ?? "DON_VI",
        status: (r.data.status?.toUpperCase() || "ACTIVE") as Account["status"],
        password: r.data.password || "demo123",
      });
      if (res.ok) ok++;
    }
    toast(`Đã nhập ${ok}/${validRows.length} tài khoản theo cấu trúc schema (accounts + account_roles) — đăng nhập được bằng password trong file.`);
    setImportOpen(false);
    setImportRows([]);
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mau-nhap-tai-khoan.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif-display text-xl font-bold text-stone-900">Tài khoản</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Tạo tài khoản cho đơn vị trong phạm vi (phường/xã, trường — kể cả trường trực thuộc tỉnh), nhập hàng loạt từ file Excel/CSV.
          </p>
        </div>
        {canManage ? (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { setImportRows([]); setMissingCols([]); setImportOpen(true); }}>
              <FileUp className="h-4 w-4" /> Nhập từ file
            </Button>
            <Button onClick={() => { setForm((f) => ({ ...f, orgUnitId: creatableUnits[0]?.id.toString() ?? "" })); setCreateOpen(true); }}>
              <UserPlus className="h-4 w-4" /> Thêm tài khoản
            </Button>
          </div>
        ) : null}
      </div>

      <div className="relative w-full sm:w-72">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm tên đăng nhập, người đại diện, email…"
          className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-doan-400"
        />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "all", label: "Tất cả", count: counts.all },
          { value: "PENDING", label: "Chờ duyệt", count: counts.PENDING },
          { value: "ACTIVE", label: "Hoạt động", count: counts.ACTIVE },
          { value: "LOCKED", label: "Đã khóa", count: counts.LOCKED },
        ]}
      />

      <Card>
        <CardBody className="p-0">
          <TableWrap>
            <THead>
                <Th>Tài khoản</Th>
                <Th>Đơn vị</Th>
                <Th>Vai trò</Th>
                <Th className="w-28">Trạng thái</Th>
                <Th className="w-40">Đăng nhập cuối</Th>
                <Th className="w-44">Thao tác</Th>
            </THead>
            <tbody>
              {list.map((a) => (
                <Tr key={a.id}>
                  <Td>
                    <p className="text-sm font-semibold text-stone-800">{a.username}</p>
                    <p className="text-[11px] text-stone-400">{a.contactPerson} · {a.email}{a.phone ? ` · ${a.phone}` : ""}</p>
                  </Td>
                  <Td className="text-sm text-stone-600">{store.orgName(a.orgUnitId)}</Td>
                  <Td><Badge tone="blue">{ROLE_LABELS[a.role]}</Badge></Td>
                  <Td>
                    <Badge tone={STATUS_META[a.status].tone}>{STATUS_META[a.status].label}</Badge>
                  </Td>
                  <Td className="text-xs text-stone-500">{a.lastLoginAt ? formatDateTime(a.lastLoginAt) : "—"}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      {a.status === "PENDING" ? (
                        <Button size="sm" onClick={() => setStatus(a, "ACTIVE")}>
                          <CheckCircle2 className="h-3.5 w-3.5" /> Duyệt
                        </Button>
                      ) : null}
                      {a.status === "ACTIVE" ? (
                        <Button size="sm" variant="danger" onClick={() => setStatus(a, "LOCKED")}>
                          <Lock className="h-3.5 w-3.5" /> Khóa
                        </Button>
                      ) : null}
                      {a.status === "LOCKED" ? (
                        <Button size="sm" variant="secondary" onClick={() => setStatus(a, "ACTIVE")}>
                          <Unlock className="h-3.5 w-3.5" /> Mở khóa
                        </Button>
                      ) : null}
                    </div>
                  </Td>
                </Tr>
              ))}
              {list.length === 0 ? <EmptyRow colSpan={6} /> : null}
            </tbody>
          </TableWrap>
        </CardBody>
      </Card>

      <p className="flex items-center gap-1.5 text-[11px] text-stone-400">
        <Users className="h-3.5 w-3.5" />
        Tài khoản tạo mới lưu trong localStorage của trình duyệt (prototype) — đăng nhập được bằng mật khẩu đã đặt, mặc định demo123.
      </p>

      {/* ---------- Modal tạo đơn lẻ ---------- */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Thêm tài khoản mới"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setCreateOpen(false); setCustomPos(false); }}>Hủy</Button>
            <Button onClick={handleCreate}><UserPlus className="h-4 w-4" /> Tạo tài khoản</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Đơn vị" required hint="Vai trò tự theo cấp đơn vị: Tỉnh → Quản trị Tỉnh · Phường/Xã → Quản trị cấp 3 · Trường → Đơn vị cơ sở.">
            <Select
              value={form.orgUnitId}
              onChange={(e) => setForm((f) => ({ ...f, orgUnitId: e.target.value }))}
            >
              <option value="">— Chọn đơn vị —</option>
              {creatableUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} (cấp {u.orgLevel})
                </option>
              ))}
            </Select>
          </Field>
          {form.orgUnitId ? (
            <p className="rounded-lg bg-sky-50 px-3.5 py-2 text-xs text-sky-800">
              Vai trò cấp: <b>{ROLE_LABELS[derivedRole(Number(form.orgUnitId)) ?? "DON_VI"]}</b>
            </p>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tên đăng nhập" required>
              <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="vd: thpt.chuyenbd" />
            </Field>
            <Field label="Mật khẩu" hint="Mặc định demo123">
              <Input value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </Field>
            <Field label="Họ tên người đại diện" required>
              <Input value={form.hoTen} onChange={(e) => setForm((f) => ({ ...f, hoTen: e.target.value }))} placeholder="VD: Nguyễn Văn A" />
            </Field>
            <Field label="Email" required>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="doantruong@bd.edu.vn" />
            </Field>
            <Field label="Số điện thoại" hint="Cột phone trong schema accounts">
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="09xx xxx xxx" />
            </Field>
            <Field
              label="Chức danh / chức vụ"
              hint="Chọn chức danh TW — quyền của tài khoản tự theo bảng phân quyền chức danh, xem trước bên dưới."
            >
              <Select
                value={customPos ? "__custom" : form.chucVu}
                onChange={(e) => {
                  const v = e.target.value;
                  setCustomPos(v === "__custom");
                  setForm((f) => ({ ...f, chucVu: v === "__custom" ? "" : v }));
                }}
              >
                <option value="">— Chức vụ khác (không trong danh sách) —</option>
                <optgroup label="Chức danh TW — toàn quyền">
                  {chucDanhQuyenList.filter((c) => c.toanQuyen).map((c) => (
                    <option key={c.id} value={c.ten}>{c.ten}</option>
                  ))}
                </optgroup>
                <optgroup label="Chức danh TW — quyền giới hạn">
                  {chucDanhQuyenList.filter((c) => !c.toanQuyen).map((c) => (
                    <option key={c.id} value={c.ten}>{c.ten}</option>
                  ))}
                </optgroup>
              </Select>
            </Field>
            {customPos ? (
              <Field label="Nhập chức vụ" hint="Ví dụ: Bí thư Đoàn Trường — quyền theo vai trò đơn vị">
                <Input value={form.chucVu} onChange={(e) => setForm((f) => ({ ...f, chucVu: e.target.value }))} placeholder="Bí thư Đoàn Trường" />
              </Field>
            ) : null}
            {(() => {
              const cd = chucDanhOf(form.chucVu);
              if (cd) {
                return cd.toanQuyen ? (
                  <p className="col-span-2 rounded-lg bg-emerald-50 px-3.5 py-2.5 text-xs leading-relaxed text-emerald-800">
                    <b>{cd.ten}</b> — <b>toàn quyền hệ thống</b> (Tất cả chức năng hiện nay).
                  </p>
                ) : (
                  <div className="col-span-2 rounded-lg bg-amber-50 px-3.5 py-2.5 text-xs leading-relaxed text-amber-900">
                    <p><b>Quyền giới hạn</b> — tài khoản này CHỈ có:</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4">
                      {cd.quyen.map((q) => <li key={q.code}>{q.ten}</li>)}
                    </ul>
                  </div>
                );
              }
              const role0 = form.orgUnitId ? derivedRole(Number(form.orgUnitId)) ?? "DON_VI" : "DON_VI";
              if (hasPerm(effectivePermissions({ role: role0 }), "*")) {
                return (
                  <p className="col-span-2 rounded-lg bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-800">
                    Quyền theo vai trò đơn vị — <b>{ROLE_LABELS[role0]}</b> (toàn quyền trong phạm vi).
                  </p>
                );
              }
              return null;
            })()}
            <Field label="Trạng thái">
              <Select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                <option value="ACTIVE">Kích hoạt ngay</option>
                <option value="PENDING">Chờ duyệt</option>
              </Select>
            </Field>
          </div>
        </div>
      </Modal>

      {/* ---------- Modal nhập từ file ---------- */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Nhập tài khoản từ file Excel/CSV"
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setImportOpen(false)}>Hủy</Button>
            <Button onClick={doImport} disabled={validRows.length === 0}>
              <UserPlus className="h-4 w-4" /> Nhập {validRows.length} tài khoản hợp lệ
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4">
            <div className="text-xs text-stone-600">
              <p className="font-semibold text-stone-800">1. Tải file mẫu · 2. Điền dữ liệu · 3. Upload để kiểm tra</p>
              <p className="mt-1">
                Cột bắt buộc (schema 5.2): <code className="rounded bg-stone-200 px-1">username</code>{" "}
                <code className="rounded bg-stone-200 px-1">email</code>{" "}
                <code className="rounded bg-stone-200 px-1">password</code>{" "}
                <code className="rounded bg-stone-200 px-1">org_unit_code</code> — tùy chọn:{" "}
                <code className="rounded bg-stone-200 px-1">phone</code>{" "}
                <code className="rounded bg-stone-200 px-1">contact_person</code>{" "}
                <code className="rounded bg-stone-200 px-1">contact_position</code>{" "}
                <code className="rounded bg-stone-200 px-1">role_code</code>{" "}
                <code className="rounded bg-stone-200 px-1">status</code>
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={downloadTemplate}>
                <Download className="h-3.5 w-3.5" /> Tải file mẫu
              </Button>
              <Button size="sm" onClick={() => fileRef.current?.click()} disabled={parsing}>
                {parsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
                {parsing ? "Đang đọc file…" : "Chọn file (.xlsx, .csv)"}
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv,.txt"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
            </div>
          </div>

          {missingCols.length > 0 ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                File thiếu cột bắt buộc: <b>{missingCols.join(", ")}</b>. Hãy bổ sung theo tên cột trong file mẫu rồi tải lên lại.
              </span>
            </div>
          ) : null}

          {importRows.length > 0 ? (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                  <CircleCheck className="h-3.5 w-3.5" /> {validRows.length} dòng hợp lệ
                </span>
                <span className="inline-flex items-center gap-1 font-semibold text-red-700">
                  <CircleX className="h-3.5 w-3.5" /> {importRows.length - validRows.length} dòng lỗi
                </span>
                <span className="text-stone-400">Dòng lỗi sẽ được bỏ qua khi nhập.</span>
              </div>
              <div className="thin-scrollbar max-h-80 overflow-y-auto rounded-lg border border-stone-200">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-stone-50">
                    <tr>
                      <th className="w-12 px-3 py-2 font-semibold text-stone-500">#</th>
                      <th className="px-3 py-2 font-semibold text-stone-500">username</th>
                      <th className="px-3 py-2 font-semibold text-stone-500">contact_person</th>
                      <th className="px-3 py-2 font-semibold text-stone-500">Đơn vị</th>
                      <th className="px-3 py-2 font-semibold text-stone-500">Vai trò</th>
                      <th className="px-3 py-2 font-semibold text-stone-500">Kết quả kiểm tra</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {importRows.map((r) => (
                      <tr key={r.rowNo} className={r.error ? "bg-red-50/50" : ""}>
                        <td className="px-3 py-2 text-stone-400">{r.rowNo}</td>
                        <td className="px-3 py-2 font-medium text-stone-800">{r.data.username || "—"}</td>
                        <td className="px-3 py-2 text-stone-600">{r.data.contact_person || "—"}</td>
                        <td className="px-3 py-2 text-stone-600">{r.unitName}</td>
                        <td className="px-3 py-2 text-stone-600">{r.roleName}</td>
                        <td className="px-3 py-2">
                          {r.error ? (
                            <span className="font-medium text-red-700">{r.error}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
                              <CircleCheck className="h-3.5 w-3.5" /> Hợp lệ
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-stone-400">
                org_unit_code khớp mã đơn vị (org_units.code — VD BD-PH) hoặc tên ngắn/tên đầy đủ. role_code để trống sẽ tự theo cấp đơn vị.
                contact_position ghi ĐÚNG tên chức danh trong bảng phân quyền TW thì quyền tự giới hạn theo chức danh đó.
                Trạng thái để trống mặc định ACTIVE. Schema không cho phép trùng username/email (UQ) và 1 đơn vị chỉ 1 tài khoản.
              </p>
            </div>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
