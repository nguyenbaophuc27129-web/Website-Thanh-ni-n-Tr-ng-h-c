"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Trash2,
  KeyRound,
  UserPlus,
  FileUp,
  Download,
  AlertTriangle,
  Loader2,
  CircleCheck,
  CircleX,
  ShieldCheck,
  Edit3,
  Plus,
  FileSpreadsheet,
  Eye,
  EyeOff,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth, type Role } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableWrap, THead, Th, Tr, Td, EmptyRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input } from "@/components/ui/input";
import type { Account } from "@/types";

/* =====================================================================
 * EXCEL IMPORT: 6 CỘT CHUẨN:
 * 1. Tên đăng nhập
 * 2. Họ và tên
 * 3. Chức vụ trong đoàn
 * 4. Chức danh
 * 5. Email
 * 6. Mật khẩu
 * ===================================================================== */
interface ExcelImportRow {
  rowNo: number;
  username: string;
  contactPerson: string;
  contactPosition: string;
  chucDanh: string;
  email: string;
  password?: string;
  isValid: boolean;
  errors: string[];
}

function normalizeHeaderKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "");
}

const LEVEL_ROLE: Record<number, Role> = {
  1: "QUAN_TRI_TW",
  2: "QUAN_TRI_TINH",
  3: "QUAN_TRI_CAP3",
  4: "DON_VI",
};

interface DbNametag {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  displayOrder?: number;
  accountCount?: number;
}

export default function PhanQuyenVaTaiKhoanPage() {
  const store = useStore();
  const { session, updateProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // 2 tab chuẩn: Danh sách tài khoản & Danh mục chức danh
  const [activeTab, setActiveTab] = useState<"accounts" | "nametags">("accounts");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [nametagFilter, setNametagFilter] = useState<string>("all");
  const [permFilter, setPermFilter] = useState<string>("all");

  // Nametags dynamic list from DB
  const [dbNametags, setDbNametags] = useState<DbNametag[]>([]);
  const [loadingNametags, setLoadingNametags] = useState(false);

  // Modal Sửa Chức danh
  const [editNametagOpen, setEditNametagOpen] = useState(false);
  const [editingNametag, setEditingNametag] = useState<DbNametag | null>(null);
  const [nametagEditForm, setNametagEditForm] = useState({ name: "", description: "", isActive: true });
  const [savingNametagEdit, setSavingNametagEdit] = useState(false);

  // Modal Sửa Tài khoản
  const [editOpen, setEditOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editForm, setEditForm] = useState({
    contactPerson: "",
    email: "",
    phone: "",
    contactPosition: "",
    chucDanh: "",
    className: "",
    password: "",
    status: "ACTIVE" as Account["status"],
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Modal Tạo Tài khoản mới
  const [createOpen, setCreateOpen] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createForm, setCreateForm] = useState({
    orgUnitId: "",
    username: "",
    password: "",
    contactPerson: "",
    email: "",
    phone: "",
    contactPosition: "",
    chucDanh: "",
    className: "",
    accType: "canbo" as "canbo" | "doanvien",
  });
  const [savingCreate, setSavingCreate] = useState(false);

  // Modal Xóa Tài khoản (Đoàn cấp trên xóa cấp dưới)
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [savingDelete, setSavingDelete] = useState(false);

  // Modal Đặt lại Mật khẩu (Đoàn cấp trên đổi mật khẩu cho cấp dưới)
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
  const [resetTargetAccount, setResetTargetAccount] = useState<Account | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [savingResetPassword, setSavingResetPassword] = useState(false);

  // Modal Quản lý Chức danh
  const [nametagModalOpen, setNametagModalOpen] = useState(false);
  const [newNametagForm, setNewNametagForm] = useState({ name: "", description: "" });
  const [savingNametag, setSavingNametag] = useState(false);

  // Modal Import Excel 5 cột
  const [importOpen, setImportOpen] = useState(false);
  const [importTargetUnitId, setImportTargetUnitId] = useState<string>("");
  const [defaultPassword, setDefaultPassword] = useState("");
  const [importRows, setImportRows] = useState<ExcelImportRow[]>([]);
  const [parsingExcel, setParsingExcel] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tải danh mục Chức danh động từ backend
  const loadNametags = async () => {
    setLoadingNametags(true);
    try {
      const res = await fetch("/api/chuc-danh");
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok && Array.isArray(data.items)) {
        setDbNametags(data.items);
      }
    } catch {
      // offline fallback
    } finally {
      setLoadingNametags(false);
    }
  };

  useEffect(() => {
    loadNametags();
    void store.refreshAccounts();
  }, []);

  // Phạm vi quản trị theo tài khoản đăng nhập
  const scope = useMemo(() => (session ? store.scopeIds(session) : []), [session, store]);

  // Kiểm tra quyền hạn cấp trên (Superior)
  const isSuperior = (target: Account): boolean => {
    if (!session) return false;
    if (session.accountId === target.id) return false; // Không tự khóa/phân quyền chính mình
    if (session.role === "QUAN_TRI_TW") return true;
    if (session.role === "QUAN_TRI_TINH") {
      return target.orgUnitId === session.orgUnitId || scope.includes(target.orgUnitId);
    }
    if (session.role === "QUAN_TRI_CAP3") {
      return target.orgUnitId === session.orgUnitId || scope.includes(target.orgUnitId);
    }
    return false;
  };

  const creatableUnits = useMemo(() => {
    if (!session) return [];
    if (session.role === "QUAN_TRI_TW") {
      // TW Đoàn được quyền cấp tài khoản cho tất cả các đơn vị
      return store.orgUnits.filter((u) => u.isActive);
    }
    if (session.role === "QUAN_TRI_TINH") {
      // Tỉnh Đoàn quản lý tài khoản của chính Tỉnh đoàn mình và tất cả các đơn vị trực thuộc
      return store.orgUnits.filter((u) => (u.id === session.orgUnitId || scope.includes(u.id)) && u.isActive);
    }
    if (session.role === "QUAN_TRI_CAP3") {
      return store.orgUnits.filter((u) => (u.id === session.orgUnitId || scope.includes(u.id)) && u.isActive);
    }
    return store.orgUnits.filter((u) => u.id === session.orgUnitId && u.isActive);
  }, [session, store.orgUnits, scope]);

  useEffect(() => {
    if (session && !importTargetUnitId) {
      setImportTargetUnitId(String(session.orgUnitId));
    }
    if (session && !createForm.orgUnitId) {
      const defaultId = creatableUnits.find((u) => u.id === session.orgUnitId)?.id ?? creatableUnits[0]?.id ?? session.orgUnitId;
      setCreateForm((prev) => ({ ...prev, orgUnitId: String(defaultId) }));
    }
  }, [session, importTargetUnitId, createForm.orgUnitId, creatableUnits]);

  // Danh sách tài khoản đã lọc
  const filteredAccounts = useMemo(() => {
    return store.accounts
      .filter((a) => (session?.role === "QUAN_TRI_TW" ? true : scope.includes(a.orgUnitId)))
      .filter((a) => {
        if (statusFilter !== "all" && a.status !== statusFilter) return false;
        if (levelFilter !== "all") {
          const u = store.orgById(a.orgUnitId);
          if (levelFilter === "1" && u?.orgLevel !== 1) return false;
          if (levelFilter === "2" && u?.orgLevel !== 2) return false;
          if (levelFilter === "3" && u?.orgLevel !== 3) return false;
          if (levelFilter === "4" && u?.orgLevel !== 4) return false;
          if (levelFilter === "doanvien" && a.role !== "DOAN_VIEN") return false;
        }
        if (nametagFilter !== "all") {
          if (nametagFilter === "empty" && (a.chucDanh || a.contactPosition)) return false;
          if (nametagFilter !== "empty" && a.chucDanh !== nametagFilter) return false;
        }
        if (permFilter !== "all") {
          const hasCustom = Boolean(a.grantedPerms && a.grantedPerms.length > 0);
          if (permFilter === "custom" && !hasCustom) return false;
          if (permFilter === "superadmin" && !a.grantedPerms?.includes("*")) return false;
          if (permFilter === "default" && hasCustom) return false;
        }
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return (
          a.username.toLowerCase().includes(q) ||
          a.contactPerson.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          (a.chucDanh && a.chucDanh.toLowerCase().includes(q)) ||
          (a.contactPosition && a.contactPosition.toLowerCase().includes(q))
        );
      });
  }, [store.accounts, scope, session, statusFilter, levelFilter, nametagFilter, permFilter, search, store]);

  // Danh sách chức danh duy nhất (sắp xếp ngay ngắn)
  const availableNametags = useMemo(() => {
    const map = new Map<string, { id?: number; name: string; description?: string; isActive?: boolean }>();
    dbNametags.forEach((n) => map.set(n.name, n));
    store.accounts.forEach((a) => {
      if (a.chucDanh && !map.has(a.chucDanh)) {
        map.set(a.chucDanh, { name: a.chucDanh, description: "", isActive: true });
      }
    });
    return Array.from(map.values()).filter((v) => Boolean(v.name));
  }, [dbNametags, store.accounts]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const scoped = store.accounts.filter((a) => (session?.role === "QUAN_TRI_TW" ? true : scope.includes(a.orgUnitId)));
    return {
      total: scoped.length,
      active: scoped.filter((a) => a.status === "ACTIVE").length,
      locked: scoped.filter((a) => a.status === "LOCKED").length,
      customPerms: scoped.filter((a) => a.grantedPerms && a.grantedPerms.length > 0).length,
      withNametag: scoped.filter((a) => Boolean(a.chucDanh)).length,
    };
  }, [store.accounts, scope, session]);

  /* ================= Xử lý sửa Chức danh (Nametag) ================= */
  const openEditNametagModal = (item: { id?: number; name: string; description?: string }) => {
    const found = dbNametags.find((d) => d.name === item.name);
    setEditingNametag(
      found ?? {
        id: item.id || 0,
        name: item.name,
        description: item.description || "",
        isActive: true,
      }
    );
    setNametagEditForm({
      name: item.name,
      description: found?.description || item.description || "",
      isActive: found ? found.isActive : true,
    });
    setEditNametagOpen(true);
  };

  const handleSaveNametagEdit = async () => {
    if (!editingNametag || !nametagEditForm.name.trim()) {
      toast("Vui lòng nhập tên chức danh.", "warning");
      return;
    }
    setSavingNametagEdit(true);

    try {
      if (editingNametag.id && editingNametag.id > 0) {
        const res = await fetch("/api/chuc-danh", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingNametag.id,
            name: nametagEditForm.name.trim(),
            description: nametagEditForm.description.trim(),
            isActive: nametagEditForm.isActive,
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          toast(data?.error ?? "Không thể cập nhật chức danh.", "warning");
          setSavingNametagEdit(false);
          return;
        }
      } else {
        const res = await fetch("/api/chuc-danh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nametagEditForm.name.trim(),
            description: nametagEditForm.description.trim(),
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          toast(data?.error ?? "Không thể lưu chức danh.", "warning");
          setSavingNametagEdit(false);
          return;
        }
      }

      // Cập nhật tên chức danh trong các tài khoản đang giữ nếu có đổi tên
      const oldName = editingNametag.name;
      const newName = nametagEditForm.name.trim();
      if (oldName !== newName) {
        for (const acc of store.accounts) {
          if (acc.chucDanh === oldName) {
            await store.updateAccount(acc.id, { chucDanh: newName });
          }
        }
      }

      toast(`Đã cập nhật Chức danh "${newName}" thành công!`, "success");
      setEditNametagOpen(false);
      loadNametags();
    } catch {
      toast("Lỗi kết nối khi cập nhật chức danh.", "warning");
    } finally {
      setSavingNametagEdit(false);
    }
  };

  /* ================= Xử lý sửa thông tin tài khoản ================= */
  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setShowEditPassword(false);
    setEditForm({
      contactPerson: account.contactPerson || "",
      email: account.email || "",
      phone: account.phone || "",
      contactPosition: account.contactPosition || "",
      chucDanh: account.chucDanh || "",
      className: account.className || "",
      password: "",
      status: account.status,
    });
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingAccount) return;
    if (!editForm.contactPerson.trim()) {
      toast("Vui lòng nhập họ và tên.", "warning");
      return;
    }
    if (!editForm.email.trim()) {
      toast("Vui lòng nhập địa chỉ email.", "warning");
      return;
    }
    if (editForm.password.trim() && editForm.password.trim().length < 6) {
      toast("Mật khẩu mới cần ít nhất 6 ký tự.", "warning");
      return;
    }
    setSavingEdit(true);
    const res = await store.updateAccount(editingAccount.id, {
      contactPerson: editForm.contactPerson.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.trim(),
      contactPosition: editForm.contactPosition.trim(),
      chucDanh: editForm.chucDanh.trim(),
      className: editForm.className.trim(),
      password: editForm.password.trim() || undefined,
      // Người dùng thông thường sửa tài khoản chính mình không thể tự đổi status; riêng admin (QUAN_TRI_TW) được phép
      status:
        session?.accountId === editingAccount.id && session?.role !== "QUAN_TRI_TW"
          ? editingAccount.status
          : editForm.status,
    });
    setSavingEdit(false);
    if (!res.ok) {
      toast(res.error ?? "Không thể cập nhật thông tin tài khoản.", "warning");
      return;
    }
    if (session?.accountId === editingAccount.id) {
      updateProfile({
        contactPerson: editForm.contactPerson.trim(),
        email: editForm.email.trim(),
        contactPosition: editForm.contactPosition.trim(),
      });
    }
    void store.refreshAccounts();
    toast(`Đã cập nhật thông tin tài khoản @${editingAccount.username} thành công!`, "success");
    setEditOpen(false);
  };

  /* ================= Xử lý Đoàn cấp trên Xóa tài khoản cấp dưới ================= */
  const handleDeleteAccount = async () => {
    if (!deletingAccount) return;
    setSavingDelete(true);
    const res = await store.deleteAccount(deletingAccount.id);
    setSavingDelete(false);
    if (!res.ok) {
      toast(res.error ?? "Không thể xóa tài khoản.", "warning");
      return;
    }
    void store.refreshAccounts();
    toast(`Đã xóa tài khoản @${deletingAccount.username} thành công!`, "success");
    setDeleteOpen(false);
    setDeletingAccount(null);
  };

  /* ================= Xử lý Đoàn cấp trên Đặt lại Mật khẩu cấp dưới ================= */
  const handleResetPassword = async () => {
    if (!resetTargetAccount) return;
    if (!resetPasswordInput.trim() || resetPasswordInput.trim().length < 6) {
      toast("Mật khẩu mới cần tối thiểu 6 ký tự.", "warning");
      return;
    }
    setSavingResetPassword(true);
    const res = await store.updateAccount(resetTargetAccount.id, {
      password: resetPasswordInput.trim(),
    });
    setSavingResetPassword(false);
    if (!res.ok) {
      toast(res.error ?? "Không thể đặt lại mật khẩu.", "warning");
      return;
    }
    toast(`Đã đổi mật khẩu cho tài khoản @${resetTargetAccount.username} thành công!`, "success");
    setResetPasswordOpen(false);
    setResetTargetAccount(null);
  };

  /* ================= Xử lý tạo tài khoản mới ================= */
  const handleCreateAccount = async () => {
    if (!createForm.password || createForm.password.trim().length < 6) {
      toast("Mật khẩu khởi tạo cần ít nhất 6 ký tự.", "warning");
      return;
    }
    if (!createForm.orgUnitId) {
      toast("Vui lòng chọn đơn vị cho tài khoản.", "warning");
      return;
    }
    if (!/^[a-z0-9._-]{3,}$/i.test(createForm.username.trim())) {
      toast("Tên đăng nhập tối thiểu 3 ký tự (chữ cái, chữ số, dấu chấm hoặc gạch).", "warning");
      return;
    }
    if (!createForm.contactPerson.trim() || !createForm.email.trim()) {
      toast("Vui lòng nhập đầy đủ Họ và tên và Email.", "warning");
      return;
    }

    setSavingCreate(true);
    const unitId = Number(createForm.orgUnitId);
    const targetUnit = store.orgById(unitId);
    const isDv = createForm.accType === "doanvien";
    const derivedRole: Role = isDv ? "DOAN_VIEN" : targetUnit ? LEVEL_ROLE[targetUnit.orgLevel] ?? "DON_VI" : "DON_VI";

    const res = await store.createAccount({
      orgUnitId: unitId,
      username: createForm.username.trim().toLowerCase(),
      password: createForm.password,
      contactPerson: createForm.contactPerson.trim(),
      email: createForm.email.trim().toLowerCase(),
      phone: createForm.phone.trim(),
      contactPosition: createForm.contactPosition.trim(),
      chucDanh: createForm.chucDanh.trim(),
      className: isDv ? createForm.className.trim() : undefined,
      role: derivedRole,
      status: "ACTIVE",
    });

    setSavingCreate(false);
    if (!res.ok) {
      toast(res.error ?? "Không tạo được tài khoản.", "warning");
      return;
    }

    toast(`Tạo tài khoản @${createForm.username} thành công!`, "success");
    setCreateOpen(false);
    setCreateForm({
      orgUnitId: String(unitId),
      username: "",
      password: "",
      contactPerson: "",
      email: "",
      phone: "",
      contactPosition: "",
      chucDanh: "",
      className: "",
      accType: "canbo",
    });
  };

  /* ================= Xử lý Thêm Chức danh ================= */
  const handleCreateNametag = async () => {
    if (!newNametagForm.name.trim()) {
      toast("Vui lòng nhập tên Chức danh.", "warning");
      return;
    }
    setSavingNametag(true);
    try {
      const res = await fetch("/api/chuc-danh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newNametagForm),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        toast(data?.error ?? "Không tạo được Chức danh mới.", "warning");
        return;
      }
      toast(`Đã thêm Chức danh "${newNametagForm.name}" thành công!`, "success");
      setNewNametagForm({ name: "", description: "" });
      loadNametags();
    } catch {
      toast("Lỗi kết nối khi tạo Chức danh.", "warning");
    } finally {
      setSavingNametag(false);
    }
  };

  /* ================= Xử lý Tải File Mẫu Excel 5 Cột ================= */
  const handleDownloadExcelTemplate = async () => {
    try {
      const XLSX = await import("xlsx");
      const headers = [
        "Tên đăng nhập",
        "Họ và tên",
        "Chức vụ trong đoàn",
        "Chức danh",
        "Email",
        "Mật khẩu",
      ];
      const sampleRows = [
        [
          "tw.bt.thuongtruc",
          "Nguyễn Văn An",
          "Ủy viên Ban Thường vụ",
          "Bí thư Thường trực Trung ương Đoàn",
          "thuongtruc@doan.vn",
          "KhoiTao@2026",
        ],
        [
          "tw.cv.web",
          "Trần Bảo Phúc",
          "Chuyên viên Ban TNTH",
          "Chuyên viên phụ trách Web",
          "cvweb@doan.vn",
          "KhoiTao@2026",
        ],
        [
          "bd.province",
          "Trần Thị Mai",
          "Phó Bí thư Tỉnh đoàn",
          "Phó Bí thư Tỉnh đoàn Bình Dương",
          "bandoan@binhduong.doan.vn",
          "KhoiTao@2026",
        ],
        [
          "bd.thpt.chuyen",
          "Phạm Hoàng Quân",
          "Bí thư Đoàn trường",
          "Bí thư Đoàn trường THPT",
          "doan@thptchuyenbd.edu.vn",
          "KhoiTao@2026",
        ],
      ];

      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
      ws["!cols"] = [
        { wch: 22 },
        { wch: 24 },
        { wch: 28 },
        { wch: 38 },
        { wch: 30 },
        { wch: 20 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "DanhSachTaiKhoan");
      XLSX.writeFile(wb, "mau_import_tai_khoan_tnth_6_cot.xlsx");
      toast("Đã tải xuống file mẫu Excel 6 cột (kèm mật khẩu) thành công!", "success");
    } catch (e) {
      console.error(e);
      toast("Không tạo được file mẫu Excel.", "warning");
    }
  };

  /* ================= Xử lý Đọc & Parse Excel 5 Cột ================= */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParsingExcel(true);
    setImportRows([]);

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: "",
        blankrows: false,
      }) as unknown[][];

      if (!rawData || rawData.length < 2) {
        toast("File Excel không có dữ liệu hoặc thiếu dòng tiêu đề.", "warning");
        setParsingExcel(false);
        return;
      }

      const headerRow = (rawData[0] as string[]).map((c) => normalizeHeaderKey(String(c)));
      let colUser = -1;
      let colName = -1;
      let colPos = -1;
      let colTitle = -1;
      let colEmail = -1;

      headerRow.forEach((h, idx) => {
        if (h.includes("tendangnhap") || h.includes("username") || h.includes("taikhoan")) colUser = idx;
        else if (h.includes("hovaten") || h.includes("hoten") || h.includes("nguoidaidien") || h.includes("ten")) colName = idx;
        else if (h.includes("chucvutrongdoan") || h.includes("chucvudoan") || h.includes("chucvu")) colPos = idx;
        else if (h.includes("chucdanh") || h.includes("nametag") || h.includes("danhhieu") || h.includes("vitri")) colTitle = idx;
        else if (h.includes("email") || h.includes("thu")) colEmail = idx;
      });

      if (colUser === -1 && headerRow.length >= 5) {
        colUser = 0;
        colName = 1;
        colPos = 2;
        colTitle = 3;
        colEmail = 4;
      }

      if (colUser === -1 || colName === -1 || colEmail === -1) {
        toast("Không tìm thấy đủ 5 cột bắt buộc: Tên đăng nhập, Họ và tên, Chức vụ trong đoàn, Chức danh, Email.", "warning");
        setParsingExcel(false);
        return;
      }

      const parsed: ExcelImportRow[] = [];
      const seenUsernames = new Set<string>();

      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i] as string[];
        if (!row || row.every((c) => String(c).trim() === "")) continue;

        const username = String(row[colUser] ?? "").trim().toLowerCase();
        const contactPerson = String(row[colName] ?? "").trim();
        const contactPosition = colPos !== -1 ? String(row[colPos] ?? "").trim() : "";
        const chucDanh = colTitle !== -1 ? String(row[colTitle] ?? "").trim() : "";
        const email = String(row[colEmail] ?? "").trim().toLowerCase();

        const errors: string[] = [];
        if (!username) {
          errors.push("Thiếu tên đăng nhập");
        } else if (!/^[a-z0-9._-]{3,}$/i.test(username)) {
          errors.push("Tên đăng nhập không hợp lệ (tối thiểu 3 ký tự)");
        } else if (seenUsernames.has(username)) {
          errors.push("Trùng tên đăng nhập trong file");
        } else if (store.accounts.some((a) => a.username.toLowerCase() === username)) {
          errors.push("Tên đăng nhập đã tồn tại");
        }

        if (!contactPerson) errors.push("Thiếu họ và tên");
        if (!email) {
          errors.push("Thiếu email");
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push("Email sai định dạng");
        }

        seenUsernames.add(username);

        parsed.push({
          rowNo: i + 1,
          username,
          contactPerson,
          contactPosition,
          chucDanh,
          email,
          isValid: errors.length === 0,
          errors,
        });
      }

      setImportRows(parsed);
      toast(`Đã đọc ${parsed.length} dòng từ file Excel.`, "info");
    } catch (e) {
      console.error(e);
      toast("Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng file.", "warning");
    } finally {
      setParsingExcel(false);
    }
  };

  /* ================= Xử lý Lưu Import ================= */
  const handleExecuteImport = async () => {
    if (!importTargetUnitId) {
      toast("Vui lòng chọn Đơn vị gán cho danh sách tài khoản import.", "warning");
      return;
    }
    const validRows = importRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      toast("Không có dòng hợp lệ nào để import.", "warning");
      return;
    }

    setImporting(true);
    const unitId = Number(importTargetUnitId);
    const targetUnit = store.orgById(unitId);
    const derivedRole: Role = targetUnit ? LEVEL_ROLE[targetUnit.orgLevel] ?? "DON_VI" : "DON_VI";

    let successCount = 0;
    let failCount = 0;

    for (const r of validRows) {
      const res = await store.createAccount({
        orgUnitId: unitId,
        username: r.username,
        password: r.password?.trim() || defaultPassword,
        contactPerson: r.contactPerson,
        email: r.email,
        contactPosition: r.contactPosition,
        chucDanh: r.chucDanh,
        role: derivedRole,
        status: "ACTIVE",
      });

      if (res.ok) successCount++;
      else failCount++;
    }

    setImporting(false);
    toast(
      `Đã import thành công ${successCount} tài khoản!${failCount > 0 ? ` (${failCount} lỗi)` : ""}`,
      successCount > 0 ? "success" : "warning"
    );
    setImportOpen(false);
    setImportRows([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      {/* ===== Header Trang ===== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif-display text-2xl font-bold text-stone-900">
            Quản lý Tài khoản &amp; Phân quyền nhiệm vụ
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Quản trị viên Trung ương Đoàn phân quyền và cấp tài khoản cho các cấp dưới thuộc TW Đoàn,
            các Tỉnh / Thành đoàn và các Đoàn trực thuộc.
          </p>
        </div>

        {/* Nút tác vụ nhanh */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadExcelTemplate}
            title="Tải mẫu Excel 6 cột chuẩn: Tên đăng nhập, Họ và tên, Chức vụ trong đoàn, Chức danh, Email, Mật khẩu"
          >
            <Download className="h-4 w-4 text-stone-600" /> Mẫu Excel 6 cột
          </Button>

          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 text-blue-700" /> Import Excel
          </Button>

          <Button variant="secondary" size="sm" onClick={() => setNametagModalOpen(true)}>
            Quản lý Chức danh ({availableNametags.length})
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setCreateForm((prev) => ({
                ...prev,
                orgUnitId: prev.orgUnitId || String(session?.orgUnitId || creatableUnits[0]?.id || ""),
                password: "",
              }));
              setCreateOpen(true);
            }}
            className="bg-blue-700 hover:bg-blue-800 text-white"
          >
            <UserPlus className="h-4 w-4" /> Thêm tài khoản
          </Button>
        </div>
      </div>

      {/* ===== Thẻ Thống kê nhanh ===== */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card className="border-stone-200">
          <CardBody className="p-3.5">
            <p className="text-xs font-medium text-stone-500">Tổng tài khoản</p>
            <p className="mt-1 text-xl font-bold text-stone-900">{stats.total}</p>
          </CardBody>
        </Card>

        <Card className="border-stone-200">
          <CardBody className="p-3.5">
            <p className="text-xs font-medium text-blue-700">Đang hoạt động</p>
            <p className="mt-1 text-xl font-bold text-blue-700">{stats.active}</p>
          </CardBody>
        </Card>

        <Card className="border-stone-200">
          <CardBody className="p-3.5">
            <p className="text-xs font-medium text-blue-700">Đã cấp quyền riêng</p>
            <p className="mt-1 text-xl font-bold text-blue-800">{stats.customPerms}</p>
          </CardBody>
        </Card>

        <Card className="border-stone-200">
          <CardBody className="p-3.5">
            <p className="text-xs font-medium text-stone-600">Chức danh hiện có</p>
            <p className="mt-1 text-xl font-bold text-stone-900">{availableNametags.length}</p>
          </CardBody>
        </Card>
      </div>

      {/* ===== Thanh chuyển Tab ===== */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab("accounts")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "accounts"
              ? "border-blue-700 text-blue-800"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <Users className="h-4 w-4" /> Danh sách Tài khoản &amp; Phân quyền ({filteredAccounts.length})
        </button>

        <button
          onClick={() => setActiveTab("nametags")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "nametags"
              ? "border-blue-700 text-blue-800"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          Danh mục Chức danh ({availableNametags.length})
        </button>
      </div>

      {/* ==============================================================
       * TAB 1: DANH SÁCH TÀI KHOẢN & PHÂN QUYỀN
       * ============================================================== */}
      {activeTab === "accounts" && (
        <div className="space-y-4">
          {/* Thanh công cụ tìm kiếm & bộ lọc */}
          <Card>
            <CardBody className="p-3.5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {/* Search */}
                <div className="relative lg:col-span-2">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm theo username, họ tên, email, chức danh..."
                    className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm text-stone-800 placeholder-stone-400 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-2.5 text-xs text-stone-400 hover:text-stone-600"
                    >
                      Xóa
                    </button>
                  )}
                </div>

                {/* Filter cấp đơn vị */}
                <div>
                  <select
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-white py-2 px-2.5 text-sm text-stone-700 focus:border-blue-600 focus:outline-none"
                  >
                    <option value="all">Tất cả Cấp đơn vị</option>
                    <option value="1">Thuộc Trung ương Đoàn (Cấp 1)</option>
                    <option value="2">Tỉnh / Thành đoàn &amp; Trực thuộc (Cấp 2)</option>
                    <option value="3">Cấp trên cơ sở (Cấp 3)</option>
                    <option value="4">Đoàn trường THPT &amp; Cơ sở (Cấp 4)</option>
                    <option value="doanvien">Tài khoản Đoàn viên</option>
                  </select>
                </div>

                {/* Filter chức danh */}
                <div>
                  <select
                    value={nametagFilter}
                    onChange={(e) => setNametagFilter(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-white py-2 px-2.5 text-sm text-stone-700 focus:border-blue-600 focus:outline-none"
                  >
                    <option value="all">Tất cả Chức danh</option>
                    <option value="empty">Chưa có Chức danh</option>
                    {availableNametags.map((n) => (
                      <option key={n.name} value={n.name}>
                        {n.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter trạng thái */}
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-white py-2 px-2.5 text-sm text-stone-700 focus:border-blue-600 focus:outline-none"
                  >
                    <option value="all">Tất cả Trạng thái</option>
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="LOCKED">Đã khóa</option>
                    <option value="PENDING">Chờ duyệt</option>
                  </select>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Bảng danh sách tài khoản */}
          <Card>
            <CardBody className="p-0">
              <TableWrap>
                <THead>
                  <Th>Tài khoản &amp; Người đại diện</Th>
                  <Th>Đơn vị trực thuộc</Th>
                  <Th>Chức vụ trong Đoàn</Th>
                  <Th>Chức danh</Th>
                  <Th>Phân quyền nhiệm vụ</Th>
                  <Th className="text-right">Thao tác</Th>
                </THead>
                <tbody>
                  {filteredAccounts.length === 0 ? (
                    <EmptyRow colSpan={7} message="Không tìm thấy tài khoản nào khớp với điều kiện lọc." />
                  ) : (
                    filteredAccounts.map((account) => {
                      const unit = store.orgById(account.orgUnitId);
                      const isOwner = session?.accountId === account.id;
                      const canManage = isSuperior(account);
                      const hasCustom = Boolean(account.grantedPerms && account.grantedPerms.length > 0);
                      const isAll = account.grantedPerms?.includes("*");

                      return (
                        <Tr key={account.id}>
                          {/* Cột 1: Tài khoản */}
                          <Td>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-700 text-xs font-bold text-white shadow-xs">
                                {account.contactPerson ? account.contactPerson.charAt(0).toUpperCase() : "U"}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-stone-900">
                                    @{account.username}
                                  </span>
                                  {isOwner && (
                                    <span className="rounded bg-blue-100 px-1.5 py-0.2 text-[10px] font-semibold text-blue-800">
                                      Tài khoản của bạn
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-stone-900">{account.contactPerson}</p>
                                <p className="text-[11px] text-stone-500">{account.email}</p>
                              </div>
                            </div>
                          </Td>

                          {/* Cột 2: Đơn vị & Cấp */}
                          <Td>
                            <span className="block max-w-[200px] truncate text-xs font-medium text-stone-900" title={unit?.name}>
                              {unit?.name ?? `Đơn vị #${account.orgUnitId}`}
                            </span>
                            <span className="mt-0.5 inline-block text-[10px] text-stone-500">
                              {unit?.orgLevel === 1
                                ? "Cấp 1 · Trung ương"
                                : unit?.orgLevel === 2
                                ? "Cấp 2 · Tỉnh / Thành / Trực thuộc"
                                : unit?.orgLevel === 3
                                ? "Cấp 3 · Quận / Huyện"
                                : "Cấp 4 · Cơ sở"}
                            </span>
                          </Td>

                          {/* Cột 3: Chức vụ trong Đoàn */}
                          <Td>
                            <span className="text-xs text-stone-800 font-medium">
                              {account.contactPosition || "—"}
                            </span>
                          </Td>

                          {/* Cột 4: Chức danh — MỘT MÀU XANH DƯƠNG DUY NHẤT, KHÔNG ICON */}
                          <Td>
                            {account.chucDanh ? (
                              <span
                                className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 border border-blue-200"
                                title={account.chucDanh}
                              >
                                <span className="max-w-[160px] truncate">{account.chucDanh}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-stone-400 italic">Chưa gán</span>
                            )}
                          </Td>

                          {/* Cột 5: Phân quyền nhiệm vụ */}
                          <Td>
                            {isAll ? (
                              <Badge tone="blue">
                                <span className="font-semibold text-blue-800">Toàn quyền hệ thống (*)</span>
                              </Badge>
                            ) : hasCustom ? (
                              <Badge tone="blue">
                                <span className="font-semibold text-blue-800">
                                  {account.grantedPerms!.length} quyền được tick
                                </span>
                              </Badge>
                            ) : (
                              <Badge tone="gray">
                                <span className="text-[11px] text-stone-600">Mặc định vai trò</span>
                              </Badge>
                            )}
                          </Td>

                          {/* Cột Thao tác: Phân quyền, Sửa, Đổi MK, Xóa */}
                          <Td className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Nút Phân quyền */}
                              <Link
                                href={`/quan-tri/he-thong/phan-quyen/${account.id}`}
                                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-700 px-3 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-800 active:scale-95"
                                title="Mở trang phân quyền nhiệm vụ cho tài khoản này"
                              >
                                <ShieldCheck className="h-3.5 w-3.5" /> Phân quyền
                              </Link>

                              {/* Nút Sửa thông tin — Người dùng sửa của mình hoặc cấp trên sửa cấp dưới */}
                              <button
                                onClick={() => openEditModal(account)}
                                disabled={!canManage && !isOwner}
                                className="inline-flex h-8 items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-700 shadow-xs transition-colors hover:border-stone-300 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                                title={isOwner ? "Sửa thông tin tài khoản của bạn" : "Đoàn cấp trên sửa thông tin tài khoản cấp dưới"}
                              >
                                <Edit3 className="h-3.5 w-3.5 text-stone-500" /> Sửa
                              </button>

                              {/* Nút Đổi MK — Cấp trên đổi mật khẩu cho cấp dưới */}
                              {canManage && (
                                <button
                                  onClick={() => {
                                    setResetTargetAccount(account);
                                    setResetPasswordInput("");
                                    setShowResetPassword(false);
                                    setResetPasswordOpen(true);
                                  }}
                                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-amber-200 bg-amber-50/50 px-2.5 text-xs font-medium text-amber-800 shadow-xs transition-colors hover:bg-amber-100/70"
                                  title="Đoàn cấp trên đặt lại mật khẩu cho tài khoản cấp dưới"
                                >
                                  <KeyRound className="h-3.5 w-3.5 text-amber-600" /> Đổi MK
                                </button>
                              )}

                              {/* Nút Xóa tài khoản — Cấp trên xóa tài khoản cấp dưới */}
                              {canManage && !isOwner && account.id !== 1 && (
                                <button
                                  onClick={() => {
                                    setDeletingAccount(account);
                                    setDeleteOpen(true);
                                  }}
                                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50/50 px-2.5 text-xs font-medium text-rose-700 shadow-xs transition-colors hover:bg-rose-100/70"
                                  title="Đoàn cấp trên xóa tài khoản cấp dưới"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-rose-600" /> Xóa
                                </button>
                              )}
                            </div>
                          </Td>
                        </Tr>
                      );
                    })
                  )}
                </tbody>
              </TableWrap>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ==============================================================
       * TAB 2: DANH MỤC CHỨC DANH (19) — ĐỒNG BỘ CỘT THẲNG HÀNG, MÀU XANH DƯƠNG, BỎ ICON
       * ============================================================== */}
      {activeTab === "nametags" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-900">
                Các Chức danh hiện có ({availableNametags.length})
              </h2>
              <p className="text-xs text-stone-500">
                Danh mục chức danh phục vụ phân công và phân quyền theo nhiệm vụ. Bảng đồng bộ thẳng hàng,
                có thể chỉnh sửa tên và nội dung phân công.
              </p>
            </div>
            <Button size="sm" onClick={() => setNametagModalOpen(true)} className="bg-blue-700 hover:bg-blue-800 text-white">
              <Plus className="h-4 w-4" /> Thêm Chức danh mới
            </Button>
          </div>

          {/* BẢNG ĐỒNG BỘ CỘT THẲNG HÀNG */}
          <Card>
            <CardBody className="p-0">
              <TableWrap>
                <THead>
                  <Th className="w-12 text-center">STT</Th>
                  <Th className="w-72">Tên chức danh</Th>
                  <Th>Mô tả nhiệm vụ / phân công</Th>
                  <Th className="w-40 text-center">Tài khoản đang giữ</Th>
                  <Th className="w-28 text-center">Trạng thái</Th>
                  <Th className="w-24 text-right">Thao tác</Th>
                </THead>
                <tbody>
                  {availableNametags.length === 0 ? (
                    <EmptyRow colSpan={6} message="Chưa có chức danh nào trong hệ thống." />
                  ) : (
                    availableNametags.map((tag, idx) => {
                      const accountsWithTag = store.accounts.filter(
                        (a) => a.chucDanh === tag.name || a.contactPosition === tag.name
                      );

                      return (
                        <Tr key={tag.name}>
                          {/* Cột 1: STT */}
                          <Td className="text-center font-mono text-xs text-stone-400">
                            {idx + 1}
                          </Td>

                          {/* Cột 2: Tên chức danh — MỘT MÀU XANH DƯƠNG DUY NHẤT, KHÔNG ICON */}
                          <Td>
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800 border border-blue-200">
                              {tag.name}
                            </span>
                          </Td>

                          {/* Cột 3: Mô tả nhiệm vụ */}
                          <Td>
                            {tag.description ? (
                              <p className="text-xs text-stone-700 leading-relaxed">
                                {tag.description}
                              </p>
                            ) : (
                              <span className="text-xs text-stone-400 italic">Chưa có mô tả chi tiết.</span>
                            )}
                          </Td>

                          {/* Cột 4: Số tài khoản đang giữ */}
                          <Td className="text-center">
                            <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                              {accountsWithTag.length} tài khoản
                            </span>
                          </Td>

                          {/* Cột 5: Trạng thái */}
                          <Td className="text-center">
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700">
                              <CircleCheck className="h-3 w-3 text-blue-600" /> Hoạt động
                            </span>
                          </Td>

                          {/* Cột 6: Thao tác sửa */}
                          <Td className="text-right">
                            <button
                              onClick={() => openEditNametagModal(tag)}
                              className="inline-flex h-7 items-center gap-1 rounded-md border border-stone-200 bg-white px-2.5 text-xs font-medium text-stone-700 shadow-xs hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                              title={`Sửa chức danh "${tag.name}"`}
                            >
                              <Edit3 className="h-3 w-3 text-stone-500" /> Sửa
                            </button>
                          </Td>
                        </Tr>
                      );
                    })
                  )}
                </tbody>
              </TableWrap>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ==============================================================
       * MODAL SỬA CHỨC DANH
       * ============================================================== */}
      <Modal
        open={editNametagOpen}
        onClose={() => setEditNametagOpen(false)}
        title={`Chỉnh sửa Chức danh: ${editingNametag?.name}`}
      >
        <div className="space-y-4">
          <Field label="Tên chức danh *">
            <Input
              value={nametagEditForm.name}
              onChange={(e) => setNametagEditForm((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Nhập tên chức danh..."
            />
          </Field>

          <Field label="Mô tả phân công / nhiệm vụ">
            <textarea
              value={nametagEditForm.description}
              onChange={(e) => setNametagEditForm((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Mô tả chức năng nhiệm vụ đảm nhận..."
              className="w-full rounded-lg border border-stone-200 bg-white p-2.5 text-xs text-stone-800 placeholder-stone-400 focus:border-blue-600 focus:outline-none"
              rows={3}
            />
          </Field>

          <label className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
            <input
              type="checkbox"
              checked={nametagEditForm.isActive}
              onChange={(e) => setNametagEditForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              className="h-4 w-4 rounded text-blue-700"
            />
            <span>Kích hoạt sử dụng chức danh này</span>
          </label>

          <div className="flex justify-end gap-2 pt-4 border-t border-stone-100">
            <Button variant="secondary" onClick={() => setEditNametagOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSaveNametagEdit} disabled={savingNametagEdit} className="bg-blue-700 hover:bg-blue-800 text-white">
              {savingNametagEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lưu thay đổi"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ==============================================================
       * MODAL SỬA THÔNG TIN TÀI KHOẢN (NGƯỜI DÙNG ĐƯỢC QUYỀN SỬA CỦA MÌNH)
       * ============================================================== */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={
          session?.accountId === editingAccount?.id
            ? `Chỉnh sửa thông tin tài khoản của bạn (@${editingAccount?.username})`
            : `Sửa thông tin tài khoản @${editingAccount?.username}`
        }
      >
        <div className="space-y-4">
          <Field label="Tên đăng nhập (không thể đổi)">
            <Input value={editingAccount?.username || ""} disabled className="bg-stone-50" />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Họ và tên người đại diện *">
              <Input
                value={editForm.contactPerson}
                onChange={(e) => setEditForm((prev) => ({ ...prev, contactPerson: e.target.value }))}
                placeholder="Nguyễn Văn Toàn"
              />
            </Field>

            <Field label="Email liên hệ *">
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="tnth@doanthanhnienvn.vn"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Số điện thoại">
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="0912345678"
              />
            </Field>

            <Field label="Chức vụ trong Đoàn">
              <Input
                value={editForm.contactPosition}
                onChange={(e) => setEditForm((prev) => ({ ...prev, contactPosition: e.target.value }))}
                placeholder="Phó Trưởng Ban Công tác Thanh Thiếu Nhi..."
              />
            </Field>
          </div>

          <Field label="Chức danh đảm nhận">
            <div className="space-y-2">
              <select
                value={editForm.chucDanh}
                onChange={(e) => setEditForm((prev) => ({ ...prev, chucDanh: e.target.value }))}
                className="w-full rounded-lg border border-stone-200 bg-white py-2 px-3 text-sm text-stone-800 focus:border-blue-600 focus:outline-none"
              >
                <option value="">-- Không gán chức danh --</option>
                {availableNametags.map((n) => (
                  <option key={n.name} value={n.name}>
                    {n.name}
                  </option>
                ))}
              </select>
              <Input
                value={editForm.chucDanh}
                onChange={(e) => setEditForm((prev) => ({ ...prev, chucDanh: e.target.value }))}
                placeholder="Hoặc tự nhập tên Chức danh..."
                className="text-xs"
              />
            </div>
          </Field>

          {editingAccount?.role === "DOAN_VIEN" && (
            <Field label="Lớp / Chi đoàn">
              <Input
                value={editForm.className}
                onChange={(e) => setEditForm((prev) => ({ ...prev, className: e.target.value }))}
                placeholder="12A1"
              />
            </Field>
          )}

          <Field label="Đặt lại mật khẩu mới (để trống nếu giữ nguyên)">
            <div className="relative">
              <Input
                type={showEditPassword ? "text" : "password"}
                value={editForm.password}
                onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Nhập mật khẩu mới nếu muốn đổi (tối thiểu 6 ký tự)"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowEditPassword(!showEditPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>

          <div className="flex items-center justify-between pt-4 border-t border-stone-100">
            {editingAccount && (
              <Link
                href={`/quan-tri/he-thong/phan-quyen/${editingAccount.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900"
              >
                <ShieldCheck className="h-4 w-4" /> Mở trang Phân quyền nhiệm vụ &rarr;
              </Link>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleSaveEdit} disabled={savingEdit} className="bg-blue-700 hover:bg-blue-800 text-white">
                {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lưu thay đổi"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ==============================================================
       * MODAL TẠO TÀI KHOẢN MỚI
       * ============================================================== */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Thêm tài khoản mới">
        <div className="space-y-4">
          <Field label="Đơn vị trực thuộc * (Thuộc TW Đoàn, Tỉnh/Thành hoặc Đoàn trực thuộc)">
            <select
              value={createForm.orgUnitId}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, orgUnitId: e.target.value }))}
              className="w-full rounded-lg border border-stone-200 bg-white py-2 px-3 text-sm text-stone-800 focus:border-blue-600 focus:outline-none"
            >
              <option value="">-- Chọn đơn vị trực thuộc --</option>
              {creatableUnits.filter((u) => u.orgLevel === 1).length > 0 && (
                <optgroup label="Cấp 1 — Ban / Đơn vị thuộc Trung ương Đoàn">
                  {creatableUnits.filter((u) => u.orgLevel === 1).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {creatableUnits.filter((u) => u.orgLevel === 2).length > 0 && (
                <optgroup label="Cấp 2 — Tỉnh / Thành đoàn & Đoàn trực thuộc TW">
                  {creatableUnits.filter((u) => u.orgLevel === 2).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {creatableUnits.filter((u) => u.orgLevel === 3).length > 0 && (
                <optgroup label="Cấp 3 — Cấp trên cơ sở (Quận, Huyện, Khối…)">
                  {creatableUnits.filter((u) => u.orgLevel === 3).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {creatableUnits.filter((u) => u.orgLevel === 4).length > 0 && (
                <optgroup label="Cấp 4 — Đoàn trường THPT & Cơ sở">
                  {creatableUnits.filter((u) => u.orgLevel === 4).map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tên đăng nhập *">
              <Input
                value={createForm.username}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="tw.cv.nam"
              />
            </Field>

            <Field label="Mật khẩu khởi tạo *">
              <div className="relative">
                <Input
                  type={showCreatePassword ? "text" : "password"}
                  value={createForm.password}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Tối thiểu 6 ký tự"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePassword(!showCreatePassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Họ và tên người đại diện *">
              <Input
                value={createForm.contactPerson}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, contactPerson: e.target.value }))}
                placeholder="Nguyễn Văn A"
              />
            </Field>

            <Field label="Email *">
              <Input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="a@doan.vn"
              />
            </Field>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Số điện thoại">
              <Input
                value={createForm.phone}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="0912345678"
              />
            </Field>

            <Field label="Chức vụ trong Đoàn">
              <Input
                value={createForm.contactPosition}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, contactPosition: e.target.value }))}
                placeholder="Bí thư, Phó Bí thư, UV BCH..."
              />
            </Field>
          </div>

          <Field label="Chức danh đảm nhận">
            <select
              value={createForm.chucDanh}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, chucDanh: e.target.value }))}
              className="w-full rounded-lg border border-stone-200 bg-white py-2 px-3 text-sm text-stone-800 focus:border-blue-600 focus:outline-none"
            >
              <option value="">-- Không gán chức danh --</option>
              {availableNametags.map((n) => (
                <option key={n.name} value={n.name}>
                  {n.name}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex justify-end gap-2 pt-4 border-t border-stone-100">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreateAccount} disabled={savingCreate} className="bg-blue-700 hover:bg-blue-800 text-white">
              {savingCreate ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tạo tài khoản"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ==============================================================
       * MODAL XÁC NHẬN XÓA TÀI KHOẢN (ĐOÀN CẤP TRÊN XÓA CẤP DƯỚI)
       * ============================================================== */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Xác nhận xóa tài khoản"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 space-y-1.5">
            <p className="font-bold text-sm text-rose-900">Bạn có chắc chắn muốn xóa tài khoản này không?</p>
            <p>
              Tài khoản <strong>@{deletingAccount?.username}</strong> ({deletingAccount?.contactPerson}) sẽ bị xóa khỏi hệ thống và phiên đăng nhập sẽ bị thu hồi.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Hủy</Button>
            <Button
              className="bg-rose-600 hover:bg-rose-700 text-white"
              disabled={savingDelete}
              onClick={handleDeleteAccount}
            >
              {savingDelete ? <Loader2 className="h-4 w-4 animate-spin" /> : "Xác nhận xóa"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ==============================================================
       * MODAL ĐẶT LẠI MẬT KHẨU (ĐOÀN CẤP TRÊN ĐỔI CHO CẤP DƯỚI)
       * ============================================================== */}
      <Modal
        open={resetPasswordOpen}
        onClose={() => setResetPasswordOpen(false)}
        title={`Đặt lại mật khẩu: @${resetTargetAccount?.username}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-stone-600">
            Đoàn cấp trên đặt lại mật khẩu cho tài khoản <strong>@{resetTargetAccount?.username}</strong> ({resetTargetAccount?.contactPerson}):
          </p>
          <Field label="Mật khẩu mới *">
            <div className="relative">
              <Input
                type={showResetPassword ? "text" : "password"}
                value={resetPasswordInput}
                onChange={(e) => setResetPasswordInput(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowResetPassword(!showResetPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
          <div className="flex justify-end gap-2 pt-2 border-t border-stone-100">
            <Button variant="secondary" onClick={() => setResetPasswordOpen(false)}>Hủy</Button>
            <Button
              className="bg-blue-700 hover:bg-blue-800 text-white"
              disabled={savingResetPassword}
              onClick={handleResetPassword}
            >
              {savingResetPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lưu mật khẩu mới"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ==============================================================
       * MODAL IMPORT EXCEL (6 CỘT CHUẨN: KÈM MẬT KHẨU)
       * ============================================================== */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import danh sách tài khoản từ Excel (kèm cột Mật khẩu)"
      >
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          {/* Hướng dẫn 6 cột chuẩn */}
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5 text-xs text-stone-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-stone-900">
                <FileSpreadsheet className="h-4 w-4 text-blue-700" /> Định dạng file Excel gồm 6 cột:
              </span>
              <Button variant="secondary" size="sm" onClick={handleDownloadExcelTemplate} className="h-7 text-xs">
                <Download className="h-3.5 w-3.5" /> Tải file mẫu .xlsx
              </Button>
            </div>
            <div className="grid grid-cols-6 gap-1.5 text-center font-mono text-[11px] font-semibold">
              <div className="rounded bg-white p-1 border border-stone-200">1. Tên đăng nhập</div>
              <div className="rounded bg-white p-1 border border-stone-200">2. Họ và tên</div>
              <div className="rounded bg-white p-1 border border-stone-200">3. Chức vụ trong đoàn</div>
              <div className="rounded bg-white p-1 border border-stone-200">4. Chức danh</div>
              <div className="rounded bg-white p-1 border border-stone-200">5. Email</div>
              <div className="rounded bg-white p-1 border border-stone-200">6. Mật khẩu</div>
            </div>
          </div>

          {/* Chọn đơn vị tiếp nhận và mật khẩu khởi tạo */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Đơn vị tiếp nhận tài khoản *">
              <select
                value={importTargetUnitId}
                onChange={(e) => setImportTargetUnitId(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white py-2 px-3 text-sm text-stone-800 focus:border-blue-600 focus:outline-none"
              >
                <option value="">-- Chọn đơn vị tiếp nhận --</option>
                {creatableUnits.filter((u) => u.orgLevel === 1).length > 0 && (
                  <optgroup label="Cấp 1 — Ban / Đơn vị thuộc Trung ương Đoàn">
                    {creatableUnits.filter((u) => u.orgLevel === 1).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {creatableUnits.filter((u) => u.orgLevel === 2).length > 0 && (
                  <optgroup label="Cấp 2 — Tỉnh / Thành đoàn & Đoàn trực thuộc TW">
                    {creatableUnits.filter((u) => u.orgLevel === 2).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {creatableUnits.filter((u) => u.orgLevel === 3).length > 0 && (
                  <optgroup label="Cấp 3 — Cấp trên cơ sở (Quận, Huyện, Khối…)">
                    {creatableUnits.filter((u) => u.orgLevel === 3).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {creatableUnits.filter((u) => u.orgLevel === 4).length > 0 && (
                  <optgroup label="Cấp 4 — Đoàn trường THPT & Cơ sở">
                    {creatableUnits.filter((u) => u.orgLevel === 4).map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </Field>

            <Field label="Mật khẩu khởi tạo ban đầu">
              <Input
                type="text"
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                placeholder="Nhập mật khẩu khởi tạo (nếu file Excel trống)"
              />
            </Field>
          </div>

          {/* Upload input */}
          <div className="rounded-xl border-2 border-dashed border-stone-300 p-6 text-center hover:border-blue-500 transition-colors bg-stone-50/50">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="hidden"
              id="excel-file-input"
            />
            <label htmlFor="excel-file-input" className="cursor-pointer block">
              <FileUp className="mx-auto h-8 w-8 text-stone-400 mb-2" />
              <p className="text-sm font-semibold text-stone-800">
                Nhấp để chọn file Excel (.xlsx, .xls, .csv)
              </p>
              <p className="text-xs text-stone-400 mt-1">Dung lượng tối đa 10MB</p>
            </label>
          </div>

          {parsingExcel && (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-stone-500">
              <Loader2 className="h-4 w-4 animate-spin text-blue-700" /> Đang đọc và kiểm tra dữ liệu Excel...
            </div>
          )}

          {/* Bảng xem trước dữ liệu import */}
          {importRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-700">
                  Xem trước dữ liệu ({importRows.length} dòng):
                </span>
                <span className="text-blue-700 font-semibold">
                  Hợp lệ: {importRows.filter((r) => r.isValid).length} / {importRows.length}
                </span>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-lg border border-stone-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 font-semibold text-stone-700 sticky top-0">
                    <tr>
                      <th className="p-2">Dòng</th>
                      <th className="p-2">Username</th>
                      <th className="p-2">Họ và tên</th>
                      <th className="p-2">Chức vụ Đoàn</th>
                      <th className="p-2">Chức danh</th>
                      <th className="p-2">Email</th>
                      <th className="p-2">Mật khẩu</th>
                      <th className="p-2 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {importRows.map((r) => (
                      <tr key={r.rowNo} className={r.isValid ? "bg-white" : "bg-rose-50/50"}>
                        <td className="p-2 font-mono text-stone-400">{r.rowNo}</td>
                        <td className="p-2 font-mono font-bold text-stone-800">{r.username}</td>
                        <td className="p-2 text-stone-900">{r.contactPerson}</td>
                        <td className="p-2 text-stone-600">{r.contactPosition || "—"}</td>
                        <td className="p-2">
                          {r.chucDanh ? (
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-800 border border-blue-200">
                              {r.chucDanh}
                            </span>
                          ) : (
                            <span className="text-stone-300 italic">—</span>
                          )}
                        </td>
                        <td className="p-2 text-stone-500">{r.email}</td>
                        <td className="p-2 font-mono text-stone-600">
                          {r.password ? (
                            <span className="text-stone-800 font-semibold">{r.password}</span>
                          ) : (
                            <span className="text-stone-400 italic">{defaultPassword}</span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {r.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700">
                              <CircleCheck className="h-3 w-3" /> Hợp lệ
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600"
                              title={r.errors.join(", ")}
                            >
                              <CircleX className="h-3 w-3" /> {r.errors[0]}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Nút hành động */}
          <div className="flex justify-end gap-2 pt-4 border-t border-stone-100">
            <Button variant="secondary" onClick={() => setImportOpen(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleExecuteImport}
              disabled={importing || importRows.filter((r) => r.isValid).length === 0}
              className="bg-blue-700 hover:bg-blue-800 text-white"
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Tiến hành Import (${importRows.filter((r) => r.isValid).length} tài khoản)`
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ==============================================================
       * MODAL QUẢN LÝ CHỨC DANH — BẢNG ĐỒNG BỘ CỘT THẲNG HÀNG, MỘT MÀU XANH DƯƠNG
       * ============================================================== */}
      <Modal
        open={nametagModalOpen}
        onClose={() => setNametagModalOpen(false)}
        title="Quản lý Danh mục Chức danh"
      >
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          {/* Form thêm mới */}
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wide">
              Thêm Chức danh mới
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={newNametagForm.name}
                onChange={(e) => setNewNametagForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Tên chức danh (ví dụ: Chuyên viên phụ trách Web)"
              />
              <Input
                value={newNametagForm.description}
                onChange={(e) => setNewNametagForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Mô tả nhiệm vụ / phân công..."
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleCreateNametag} disabled={savingNametag} className="bg-blue-700 hover:bg-blue-800 text-white">
                {savingNametag ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Thêm Chức danh"}
              </Button>
            </div>
          </div>

          {/* BẢNG CÁC CHỨC DANH HIỆN CÓ — ĐỒNG BỘ CỘT THẲNG HÀNG */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wide">
              Các Chức danh hiện có ({availableNametags.length})
            </h3>
            <div className="overflow-x-auto rounded-lg border border-stone-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 font-semibold text-stone-700 border-b border-stone-200">
                  <tr>
                    <th className="p-2.5 w-10 text-center">STT</th>
                    <th className="p-2.5 w-56">Tên chức danh</th>
                    <th className="p-2.5">Mô tả phân công</th>
                    <th className="p-2.5 w-24 text-center">Tài khoản</th>
                    <th className="p-2.5 w-16 text-right">Sửa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {availableNametags.map((tag, idx) => {
                    const count = store.accounts.filter(
                      (a) => a.chucDanh === tag.name || a.contactPosition === tag.name
                    ).length;

                    return (
                      <tr key={tag.name} className="hover:bg-stone-50/60">
                        <td className="p-2.5 text-center font-mono text-stone-400">
                          {idx + 1}
                        </td>
                        <td className="p-2.5">
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-800 border border-blue-200">
                            {tag.name}
                          </span>
                        </td>
                        <td className="p-2.5 text-stone-600 line-clamp-1">
                          {tag.description || <span className="text-stone-400 italic">—</span>}
                        </td>
                        <td className="p-2.5 text-center font-semibold text-blue-800">
                          {count}
                        </td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={() => {
                              setNametagModalOpen(false);
                              openEditNametagModal(tag);
                            }}
                            className="inline-flex h-6 items-center gap-1 rounded border border-stone-200 bg-white px-2 text-[11px] font-medium text-stone-700 shadow-xs hover:border-blue-300 hover:text-blue-700"
                          >
                            <Edit3 className="h-3 w-3 text-stone-500" /> Sửa
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-stone-100">
            <Button variant="secondary" onClick={() => setNametagModalOpen(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
