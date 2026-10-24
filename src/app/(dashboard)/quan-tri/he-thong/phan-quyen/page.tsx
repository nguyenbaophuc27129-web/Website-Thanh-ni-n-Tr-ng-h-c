"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  Search,
  Lock,
  Unlock,
  UserPlus,
  FileUp,
  Download,
  AlertTriangle,
  Loader2,
  CircleCheck,
  CircleX,
  ShieldCheck,
  Check,
  Minus,
  Crown,
  Tag,
  Sparkles,
  Edit3,
  ExternalLink,
  Plus,
  Trash2,
  Settings2,
  KeyRound,
  FileSpreadsheet,
  CheckSquare,
  Award,
  Layers,
  Building2,
  RefreshCw,
  Mail,
  Phone,
  Briefcase,
  HelpCircle,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth, ROLE_LABELS, type Role } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableWrap, THead, Th, Tr, Td, EmptyRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import { roleList, permissionsList } from "@/data/org-units";
import { chucDanhQuyenList } from "@/data/chuc-danh-quyen";
import { DV_HOI_POSITION_GROUPS } from "@/data/positions";
import {
  PERM_CATALOG,
  PERM_SUGGESTIONS,
  permNameOf,
  effectivePermissions,
  hasPerm,
} from "@/lib/permissions";
import type { Account } from "@/types";

/* =====================================================================
 * HELPER: Nametag Badge Styling (Phong cách danh hiệu Game / Nametag)
 * ===================================================================== */
function getNametagStyle(name?: string) {
  if (!name) return null;
  const n = name.toLowerCase();
  if (n.includes("bí thư") || n.includes("thường trực") || n.includes("trưởng ban")) {
    return {
      wrap: "bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white shadow-sm shadow-amber-500/30 ring-1 ring-amber-400/50",
      icon: Crown,
      glow: "text-amber-200",
    };
  }
  if (n.includes("phó trưởng") || n.includes("kiểm tra")) {
    return {
      wrap: "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-sm shadow-indigo-500/30 ring-1 ring-indigo-400/50",
      icon: Award,
      glow: "text-indigo-200",
    };
  }
  if (n.includes("chuyên viên") || n.includes("quản trị")) {
    return {
      wrap: "bg-gradient-to-r from-sky-600 to-blue-700 text-white shadow-sm shadow-blue-500/30 ring-1 ring-blue-400/50",
      icon: Sparkles,
      glow: "text-sky-200",
    };
  }
  if (n.includes("biên tập") || n.includes("xuất bản")) {
    return {
      wrap: "bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-sm shadow-emerald-500/30 ring-1 ring-emerald-400/50",
      icon: Edit3,
      glow: "text-emerald-200",
    };
  }
  if (n.includes("ctv") || n.includes("cộng tác")) {
    return {
      wrap: "bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-sm shadow-rose-500/30 ring-1 ring-rose-300/50",
      icon: Tag,
      glow: "text-rose-200",
    };
  }
  if (n.includes("chuyên gia") || n.includes("khoa học") || n.includes("đồng hành")) {
    return {
      wrap: "bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-sm shadow-fuchsia-500/30 ring-1 ring-fuchsia-300/50",
      icon: Sparkles,
      glow: "text-fuchsia-200",
    };
  }
  return {
    wrap: "bg-stone-100 text-stone-700 border border-stone-200 ring-1 ring-stone-200/50",
    icon: Tag,
    glow: "text-stone-400",
  };
}

/* =====================================================================
 * EXCEL IMPORT: 5 CỘT CHUẨN THEO YÊU CẦU:
 * 1. Tên đăng nhập
 * 2. Họ và tên
 * 3. Chức vụ trong đoàn
 * 4. Chức danh (Nametag)
 * 5. Email
 * ===================================================================== */
interface ExcelImportRow {
  rowNo: number;
  username: string;
  contactPerson: string;
  contactPosition: string;
  chucDanh: string;
  email: string;
  isValid: boolean;
  errors: string[];
  suggestedPermsCount: number;
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

export default function PhanQuyenVaTaiKhoanPage() {
  const store = useStore();
  const { session } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // Tabs
  const [activeTab, setActiveTab] = useState<"accounts" | "matrix" | "nametags">("accounts");

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [nametagFilter, setNametagFilter] = useState<string>("all");
  const [permFilter, setPermFilter] = useState<string>("all");

  // Nametags dynamic list from DB
  const [dbNametags, setDbNametags] = useState<
    { id: number; name: string; description: string; isActive: boolean; accountCount?: number }[]
  >([]);
  const [loadingNametags, setLoadingNametags] = useState(false);

  // Modals state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editForm, setEditForm] = useState({
    contactPerson: "",
    email: "",
    phone: "",
    contactPosition: "",
    chucDanh: "",
    className: "",
    status: "ACTIVE" as Account["status"],
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Create Form state
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
    applyPresetPerms: true,
  });
  const [savingCreate, setSavingCreate] = useState(false);

  // Nametag Manage Modal
  const [nametagModalOpen, setNametagModalOpen] = useState(false);
  const [newNametagForm, setNewNametagForm] = useState({ name: "", description: "" });
  const [savingNametag, setSavingNametag] = useState(false);

  // Excel Import Modal
  const [importOpen, setImportOpen] = useState(false);
  const [importTargetUnitId, setImportTargetUnitId] = useState<string>("");
  const [defaultPassword, setDefaultPassword] = useState("KhoiTao@2026");
  const [autoApplySuggestions, setAutoApplySuggestions] = useState(true);
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
      // offline / DB fallback
    } finally {
      setLoadingNametags(false);
    }
  };

  useEffect(() => {
    loadNametags();
  }, []);

  // Phạm vi quản trị theo tài khoản đăng nhập
  const scope = useMemo(() => (session ? store.scopeIds(session) : []), [session, store]);

  // Kiểm tra quyền hạn cấp trên (Superior)
  const isSuperior = (target: Account): boolean => {
    if (!session) return false;
    if (session.accountId === target.id) return false; // Không tự quản chính mình
    if (session.role === "QUAN_TRI_TW") return true;
    if (session.role === "QUAN_TRI_TINH") {
      const targetUnit = store.orgById(target.orgUnitId);
      return Boolean(targetUnit && targetUnit.orgLevel >= 3 && scope.includes(target.orgUnitId));
    }
    if (session.role === "QUAN_TRI_CAP3") {
      const targetUnit = store.orgById(target.orgUnitId);
      return Boolean(targetUnit && targetUnit.orgLevel >= 4 && scope.includes(target.orgUnitId));
    }
    return false;
  };

  const creatableUnits = useMemo(() => {
    if (!session) return [];
    const minLevel = session.role === "QUAN_TRI_TW" ? 1 : session.role === "QUAN_TRI_TINH" ? 3 : 4;
    return store.orgUnits.filter((u) => scope.includes(u.id) && u.orgLevel >= minLevel && u.isActive);
  }, [session, store.orgUnits, scope]);

  // Thiết lập đơn vị mặc định cho modal import và tạo
  useEffect(() => {
    if (session && !importTargetUnitId) {
      setImportTargetUnitId(String(session.orgUnitId));
    }
    if (session && !createForm.orgUnitId && creatableUnits.length > 0) {
      setCreateForm((prev) => ({ ...prev, orgUnitId: String(creatableUnits[0].id) }));
    }
  }, [session, importTargetUnitId, createForm.orgUnitId, creatableUnits]);

  // Danh sách tài khoản đã lọc
  const filteredAccounts = useMemo(() => {
    return store.accounts
      .filter((a) => scope.includes(a.orgUnitId))
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
  }, [store.accounts, scope, statusFilter, levelFilter, nametagFilter, permFilter, search, store]);

  // Danh sách các Nametag duy nhất đang được dùng
  const availableNametags = useMemo(() => {
    const set = new Set<string>();
    dbNametags.forEach((n) => set.add(n.name));
    store.accounts.forEach((a) => {
      if (a.chucDanh) set.add(a.chucDanh);
    });
    // Thêm các gợi ý từ Copy of Book1.xlsx
    Object.keys(PERM_SUGGESTIONS).forEach((k) => set.add(k));
    return Array.from(set).filter(Boolean);
  }, [dbNametags, store.accounts]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const scoped = store.accounts.filter((a) => scope.includes(a.orgUnitId));
    return {
      total: scoped.length,
      active: scoped.filter((a) => a.status === "ACTIVE").length,
      locked: scoped.filter((a) => a.status === "LOCKED").length,
      customPerms: scoped.filter((a) => a.grantedPerms && a.grantedPerms.length > 0).length,
      withNametag: scoped.filter((a) => Boolean(a.chucDanh)).length,
    };
  }, [store.accounts, scope]);

  /* ================= Xử lý sửa thông tin tài khoản ================= */
  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setEditForm({
      contactPerson: account.contactPerson || "",
      email: account.email || "",
      phone: account.phone || "",
      contactPosition: account.contactPosition || "",
      chucDanh: account.chucDanh || "",
      className: account.className || "",
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
    setSavingEdit(true);
    const res = await store.updateAccount(editingAccount.id, {
      contactPerson: editForm.contactPerson.trim(),
      email: editForm.email.trim(),
      phone: editForm.phone.trim(),
      contactPosition: editForm.contactPosition.trim(),
      chucDanh: editForm.chucDanh.trim(),
      className: editForm.className.trim(),
      status: editForm.status,
    });
    setSavingEdit(false);
    if (!res.ok) {
      toast(res.error ?? "Không thể cập nhật thông tin tài khoản.", "warning");
      return;
    }
    toast(`Đã cập nhật thông tin tài khoản @${editingAccount.username} thành công!`, "success");
    setEditOpen(false);
  };

  /* ================= Xử lý khóa / mở nhanh ================= */
  const toggleAccountStatus = async (account: Account) => {
    if (!isSuperior(account)) {
      toast("Bạn không có quyền thay đổi trạng thái tài khoản này.", "warning");
      return;
    }
    const nextStatus = account.status === "ACTIVE" ? "LOCKED" : "ACTIVE";
    const res = await store.updateAccount(account.id, { status: nextStatus });
    if (!res.ok) {
      toast(res.error ?? "Không thể đổi trạng thái tài khoản.", "warning");
      return;
    }
    toast(
      `Đã ${nextStatus === "ACTIVE" ? "mở khóa" : "khóa"} tài khoản @${account.username}.`,
      "success"
    );
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

    // Phân quyền gợi ý theo chức danh nếu chọn checkbox
    let initialPerms: string[] | undefined = undefined;
    if (createForm.applyPresetPerms && createForm.chucDanh && PERM_SUGGESTIONS[createForm.chucDanh]) {
      initialPerms = PERM_SUGGESTIONS[createForm.chucDanh];
    }

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
      perms: initialPerms,
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
      applyPresetPerms: true,
    });
  };

  /* ================= Xử lý Thêm Nametag ================= */
  const handleCreateNametag = async () => {
    if (!newNametagForm.name.trim()) {
      toast("Vui lòng nhập tên Chức danh (Nametag).", "warning");
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
      toast(`Đã thêm thẻ Chức danh "${newNametagForm.name}" thành công!`, "success");
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
      ];
      const sampleRows = [
        [
          "tw.bt.thuongtruc",
          "Nguyễn Văn An",
          "Ủy viên Ban Thường vụ",
          "Bí thư Thường trực Trung ương Đoàn",
          "thuongtruc@doan.vn",
        ],
        [
          "tw.cv.web",
          "Trần Bảo Phúc",
          "Chuyên viên Ban TNTH",
          "Chuyên viên phụ trách chính Web",
          "cvweb@doan.vn",
        ],
        [
          "tw.ctv.tintuc",
          "Lê Thị Hoa",
          "Cộng tác viên Báo chí",
          "CTV phụ trách chuyên mục Tin tức",
          "ctvtintuc@doan.vn",
        ],
        [
          "bd.thpt.chuyen",
          "Phạm Hoàng Quân",
          "Bí thư Đoàn trường",
          "Bí thư Đoàn trường THPT",
          "doan@thptchuyenbd.edu.vn",
        ],
      ];

      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
      // Cấu hình độ rộng các cột
      ws["!cols"] = [
        { wch: 22 }, // Tên đăng nhập
        { wch: 24 }, // Họ và tên
        { wch: 28 }, // Chức vụ trong đoàn
        { wch: 38 }, // Chức danh (Nametag)
        { wch: 30 }, // Email
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "DanhSachTaiKhoan");
      XLSX.writeFile(wb, "mau_import_tai_khoan_tnth_5_cot.xlsx");
      toast("Đã tải xuống file mẫu Excel 5 cột thành công!", "success");
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

      // Nhận diện vị trí 5 cột chuẩn
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

      // Nếu không khớp theo tên, tự động fallback theo thứ tự 5 cột mặc định (0, 1, 2, 3, 4)
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
          errors.push("Tên đăng nhập đã tồn tại trong hệ thống");
        }

        if (!contactPerson) errors.push("Thiếu họ và tên");
        if (!email) {
          errors.push("Thiếu email");
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push("Email sai định dạng");
        }

        seenUsernames.add(username);

        const suggestedCount =
          chucDanh && PERM_SUGGESTIONS[chucDanh]
            ? PERM_SUGGESTIONS[chucDanh].includes("*")
              ? permissionsList.length
              : PERM_SUGGESTIONS[chucDanh].length
            : 0;

        parsed.push({
          rowNo: i + 1,
          username,
          contactPerson,
          contactPosition,
          chucDanh,
          email,
          isValid: errors.length === 0,
          errors,
          suggestedPermsCount: suggestedCount,
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
      let initialPerms: string[] | undefined = undefined;
      if (autoApplySuggestions && r.chucDanh && PERM_SUGGESTIONS[r.chucDanh]) {
        initialPerms = PERM_SUGGESTIONS[r.chucDanh];
      }

      const res = await store.createAccount({
        orgUnitId: unitId,
        username: r.username,
        password: defaultPassword,
        contactPerson: r.contactPerson,
        email: r.email,
        contactPosition: r.contactPosition,
        chucDanh: r.chucDanh,
        role: derivedRole,
        status: "ACTIVE",
        perms: initialPerms,
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
            Quản lý Tài khoản & Phân quyền nhiệm vụ
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Tích hợp quản lý người dùng, phân quyền theo chức năng nhiệm vụ (tick chọn theo nhu cầu),
            thẻ chức danh động (Nametag) và Import Excel 5 cột.
          </p>
        </div>

        {/* Nút tác vụ nhanh */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDownloadExcelTemplate}
            title="Tải mẫu Excel 5 cột chuẩn: Tên đăng nhập, Họ và tên, Chức vụ trong đoàn, Chức danh, Email"
          >
            <Download className="h-4 w-4" /> Mẫu Excel 5 cột
          </Button>

          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" /> Import Excel
          </Button>

          <Button variant="secondary" size="sm" onClick={() => setNametagModalOpen(true)}>
            <Tag className="h-4 w-4 text-amber-600" /> Quản lý Nametag
          </Button>

          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <UserPlus className="h-4 w-4" /> Thêm tài khoản
          </Button>
        </div>
      </div>

      {/* ===== Thẻ Thống kê nhanh ===== */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
        <Card className="border-l-4 border-l-stone-400">
          <CardBody className="p-3.5">
            <p className="text-xs font-medium text-stone-500">Tổng tài khoản</p>
            <p className="mt-1 text-xl font-bold text-stone-800">{stats.total}</p>
          </CardBody>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardBody className="p-3.5">
            <p className="text-xs font-medium text-emerald-600">Đang hoạt động</p>
            <p className="mt-1 text-xl font-bold text-emerald-700">{stats.active}</p>
          </CardBody>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <CardBody className="p-3.5">
            <p className="text-xs font-medium text-rose-600">Đã khóa</p>
            <p className="mt-1 text-xl font-bold text-rose-700">{stats.locked}</p>
          </CardBody>
        </Card>

        <Card className="border-l-4 border-l-sky-500">
          <CardBody className="p-3.5">
            <p className="text-xs font-medium text-sky-600">Đã phân quyền riêng</p>
            <p className="mt-1 text-xl font-bold text-sky-700">{stats.customPerms}</p>
          </CardBody>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardBody className="p-3.5">
            <p className="text-xs font-medium text-amber-600">Đã gắn Nametag</p>
            <p className="mt-1 text-xl font-bold text-amber-700">{stats.withNametag}</p>
          </CardBody>
        </Card>
      </div>

      {/* ===== Thanh chuyển Tab ===== */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab("accounts")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "accounts"
              ? "border-doan-600 text-doan-700"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <Users className="h-4 w-4" /> Danh sách Tài khoản & Phân quyền ({filteredAccounts.length})
        </button>

        <button
          onClick={() => setActiveTab("nametags")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "nametags"
              ? "border-doan-600 text-doan-700"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <Tag className="h-4 w-4 text-amber-500" /> Thẻ Chức danh / Nametag ({availableNametags.length})
        </button>

        <button
          onClick={() => setActiveTab("matrix")}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
            activeTab === "matrix"
              ? "border-doan-600 text-doan-700"
              : "border-transparent text-stone-500 hover:text-stone-800"
          }`}
        >
          <ShieldCheck className="h-4 w-4 text-sky-600" /> Ma trận quyền & Gợi ý (Copy of Book1.xlsx)
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
                    className="w-full rounded-lg border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm text-stone-800 placeholder-stone-400 focus:border-doan-500 focus:outline-none focus:ring-1 focus:ring-doan-500"
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
                    className="w-full rounded-lg border border-stone-200 bg-white py-2 px-2.5 text-sm text-stone-700 focus:border-doan-500 focus:outline-none"
                  >
                    <option value="all">Tất cả Cấp đơn vị</option>
                    <option value="1">Cấp 1 - Trung ương Đoàn</option>
                    <option value="2">Cấp 2 - Tỉnh / Thành đoàn</option>
                    <option value="3">Cấp 3 - Quận / Huyện / Xã đoàn</option>
                    <option value="4">Cấp 4 - Đoàn trường THPT</option>
                    <option value="doanvien">Tài khoản Đoàn viên</option>
                  </select>
                </div>

                {/* Filter chức danh / nametag */}
                <div>
                  <select
                    value={nametagFilter}
                    onChange={(e) => setNametagFilter(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-white py-2 px-2.5 text-sm text-stone-700 focus:border-doan-500 focus:outline-none"
                  >
                    <option value="all">Tất cả Chức danh (Nametag)</option>
                    <option value="empty">Chưa có Chức danh</option>
                    {availableNametags.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Filter trạng thái */}
                <div>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full rounded-lg border border-stone-200 bg-white py-2 px-2.5 text-sm text-stone-700 focus:border-doan-500 focus:outline-none"
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
                  <Th>Tài khoản & Người đại diện</Th>
                  <Th>Đơn vị trực thuộc</Th>
                  <Th>Chức vụ trong Đoàn</Th>
                  <Th>Chức danh (Nametag)</Th>
                  <Th>Phân quyền nhiệm vụ</Th>
                  <Th className="text-center">Trạng thái</Th>
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
                      const nametagStyle = getNametagStyle(account.chucDanh || account.contactPosition);
                      const hasCustom = Boolean(account.grantedPerms && account.grantedPerms.length > 0);
                      const isAll = account.grantedPerms?.includes("*");

                      return (
                        <Tr key={account.id}>
                          {/* Cột 1: Tài khoản */}
                          <Td>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-doan-500 to-doan-700 text-sm font-bold text-white shadow-sm">
                                {account.contactPerson ? account.contactPerson.charAt(0).toUpperCase() : "U"}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-stone-800">
                                    @{account.username}
                                  </span>
                                  {isOwner && (
                                    <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-semibold text-amber-800">
                                      Bạn
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm font-semibold text-stone-900">{account.contactPerson}</p>
                                <p className="text-xs text-stone-400">{account.email}</p>
                              </div>
                            </div>
                          </Td>

                          {/* Cột 2: Đơn vị & Cấp */}
                          <Td>
                            <span className="block max-w-[200px] truncate text-xs font-medium text-stone-800" title={unit?.name}>
                              {unit?.name ?? `Đơn vị #${account.orgUnitId}`}
                            </span>
                            <span className="mt-0.5 inline-block text-[10px] text-stone-400">
                              {unit?.orgLevel === 1
                                ? "Cấp 1 · Trung ương"
                                : unit?.orgLevel === 2
                                ? "Cấp 2 · Tỉnh / Thành"
                                : unit?.orgLevel === 3
                                ? "Cấp 3 · Quận / Huyện"
                                : "Cấp 4 · Cơ sở"}
                            </span>
                          </Td>

                          {/* Cột 3: Chức vụ trong Đoàn */}
                          <Td>
                            <span className="text-xs text-stone-700">
                              {account.contactPosition || "—"}
                            </span>
                          </Td>

                          {/* Cột 4: Chức danh (Nametag) */}
                          <Td>
                            {account.chucDanh ? (
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  nametagStyle?.wrap ?? "bg-stone-100 text-stone-700"
                                }`}
                                title={account.chucDanh}
                              >
                                {nametagStyle?.icon && (
                                  <nametagStyle.icon className={`h-3.5 w-3.5 ${nametagStyle.glow}`} />
                                )}
                                <span className="max-w-[160px] truncate">{account.chucDanh}</span>
                              </span>
                            ) : (
                              <span className="text-xs text-stone-300 italic">Chưa gán</span>
                            )}
                          </Td>

                          {/* Cột 5: Phân quyền nhiệm vụ */}
                          <Td>
                            {isAll ? (
                              <Badge tone="yellow">
                                <span className="inline-flex items-center gap-1 font-semibold">
                                  <Crown className="h-3 w-3 text-amber-600" /> Toàn quyền (*)
                                </span>
                              </Badge>
                            ) : hasCustom ? (
                              <Badge tone="blue">
                                <span className="inline-flex items-center gap-1 font-semibold">
                                  <ShieldCheck className="h-3 w-3 text-sky-600" />
                                  {account.grantedPerms!.length} quyền được tick
                                </span>
                              </Badge>
                            ) : (
                              <Badge tone="gray">
                                <span className="text-[11px] text-stone-500">Mặc định vai trò</span>
                              </Badge>
                            )}
                          </Td>

                          {/* Cột 6: Trạng thái */}
                          <Td className="text-center">
                            {account.status === "ACTIVE" ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                                <CircleCheck className="h-3.5 w-3.5" /> Hoạt động
                              </span>
                            ) : account.status === "LOCKED" ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
                                <CircleX className="h-3.5 w-3.5" /> Đã khóa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                                <AlertTriangle className="h-3.5 w-3.5" /> Chờ duyệt
                              </span>
                            )}
                          </Td>

                          {/* Cột 7: Thao tác */}
                          <Td className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              {/* Nút Phân quyền -> Ra trang phân quyền riêng */}
                              <Link
                                href={`/quan-tri/he-thong/phan-quyen/${account.id}`}
                                className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-700 shadow-sm transition-colors hover:bg-sky-100"
                                title="Bấm vào để mở trang phân quyền nhiệm vụ riêng cho tài khoản này"
                              >
                                <ShieldCheck className="h-3.5 w-3.5" /> Phân quyền
                              </Link>

                              {/* Nút Sửa thông tin */}
                              <button
                                onClick={() => openEditModal(account)}
                                disabled={!canManage && !isOwner}
                                className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-stone-700 shadow-sm transition-colors hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-40"
                                title="Sửa thông tin tài khoản"
                              >
                                <Edit3 className="h-3.5 w-3.5" /> Sửa
                              </button>

                              {/* Nút Khóa / Mở */}
                              {canManage && (
                                <button
                                  onClick={() => toggleAccountStatus(account)}
                                  className={`inline-flex items-center justify-center rounded-lg border p-1.5 text-xs shadow-sm transition-colors ${
                                    account.status === "ACTIVE"
                                      ? "border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                                      : "border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50"
                                  }`}
                                  title={account.status === "ACTIVE" ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                                >
                                  {account.status === "ACTIVE" ? (
                                    <Lock className="h-3.5 w-3.5" />
                                  ) : (
                                    <Unlock className="h-3.5 w-3.5" />
                                  )}
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
       * TAB 2: DANH MỤC THẺ CHỨC DANH (NAMETAG)
       * ============================================================== */}
      {activeTab === "nametags" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-bold text-stone-900">Danh mục Thẻ Chức danh / Nametag động</h2>
              <p className="text-xs text-stone-500">
                Thẻ chức danh gắn liền với tài khoản theo phong cách danh hiệu (nametag). Không bị cố định quyền,
                linh hoạt thay đổi theo thực tế tổ chức Đoàn.
              </p>
            </div>
            <Button size="sm" onClick={() => setNametagModalOpen(true)}>
              <Plus className="h-4 w-4" /> Thêm Chức danh mới
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {availableNametags.map((tag) => {
              const style = getNametagStyle(tag);
              const accountsWithTag = store.accounts.filter(
                (a) => a.chucDanh === tag || a.contactPosition === tag
              );
              const suggestion = PERM_SUGGESTIONS[tag];

              return (
                <Card key={tag} className="overflow-hidden">
                  <div className={`p-4 ${style?.wrap ?? "bg-stone-50"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {style?.icon && <style.icon className="h-5 w-5 text-white/90" />}
                        <h3 className="font-bold text-white text-sm drop-shadow-sm">{tag}</h3>
                      </div>
                    </div>
                  </div>
                  <CardBody className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-stone-600">
                      <span>Đang gán cho:</span>
                      <span className="font-bold text-doan-700">{accountsWithTag.length} tài khoản</span>
                    </div>

                    <div className="text-xs text-stone-500">
                      {suggestion ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                          <Check className="h-3 w-3" /> Có mẫu phân quyền trong Copy of Book1.xlsx (
                          {suggestion.includes("*") ? "Toàn quyền" : `${suggestion.length} quyền`})
                        </span>
                      ) : (
                        <span className="text-stone-400">Nametag tùy biến theo thực tế</span>
                      )}
                    </div>

                    {accountsWithTag.length > 0 && (
                      <div className="pt-2 border-t border-stone-100 flex flex-wrap gap-1">
                        {accountsWithTag.slice(0, 3).map((a) => (
                          <span
                            key={a.id}
                            className="rounded bg-stone-100 px-2 py-0.5 text-[10px] text-stone-600"
                          >
                            @{a.username} ({a.contactPerson})
                          </span>
                        ))}
                        {accountsWithTag.length > 3 && (
                          <span className="text-[10px] text-stone-400">
                            +{accountsWithTag.length - 3} tài khoản khác
                          </span>
                        )}
                      </div>
                    )}
                  </CardBody>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ==============================================================
       * TAB 3: MA TRẬN PHÂN QUYỀN & CHỨC DANH MẪU (COPY OF BOOK1.XLSX)
       * ============================================================== */}
      {activeTab === "matrix" && (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="8 Phân hệ chức năng nhiệm vụ (Nguồn: Copy of Book1.xlsx)"
              subtitle="Tất cả 31 quyền chức năng chi tiết để cấp trên tick chọn theo nhu cầu từng người"
            />
            <CardBody className="p-0">
              <div className="divide-y divide-stone-100">
                {PERM_CATALOG.map((group, idx) => (
                  <div key={group.module} className="p-4 hover:bg-stone-50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="inline-block rounded-md bg-doan-100 px-2 py-0.5 text-xs font-bold text-doan-800 mr-2">
                          Nhóm {idx + 1}
                        </span>
                        <span className="text-sm font-bold text-stone-900">{group.module}</span>
                      </div>
                      <span className="text-xs text-stone-400">{group.codes.length} quyền</span>
                    </div>
                    <p className="text-xs text-stone-500 mb-3">{group.hint}</p>

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {group.codes.map((code) => {
                        const perm = permissionsList.find((p) => p.code === code);
                        return (
                          <div
                            key={code}
                            className="flex items-start gap-2 rounded-lg border border-stone-200 bg-white p-2.5 shadow-xs"
                          >
                            <ShieldCheck className="h-4 w-4 shrink-0 text-doan-600 mt-0.5" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-stone-800">{perm?.name ?? code}</p>
                              <code className="text-[10px] text-stone-400">{code}</code>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Gợi ý phân quyền theo Chức danh (Copy of Book1.xlsx)"
              subtitle="Áp dụng tự động khi import hoặc bấm 'Áp dụng gợi ý' trên trang phân quyền riêng"
            />
            <CardBody className="p-0">
              <div className="divide-y divide-stone-100">
                {Object.entries(PERM_SUGGESTIONS).map(([title, perms]) => {
                  const isAll = perms.includes("*");
                  return (
                    <div key={title} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-stone-900">{title}</p>
                        <p className="text-xs text-stone-500">
                          {isAll
                            ? "Toàn quyền quản trị hệ thống (*)"
                            : `Bao gồm ${perms.length} quyền chức năng: ${perms.map((p) => permNameOf(p)).join(", ")}`}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {isAll ? (
                          <Badge tone="yellow">Toàn quyền (*)</Badge>
                        ) : (
                          <Badge tone="blue">{perms.length} quyền gợi ý</Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* ==============================================================
       * MODAL 1: SỬA THÔNG TIN TÀI KHOẢN
       * ============================================================== */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Sửa thông tin tài khoản @${editingAccount?.username}`}
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
                placeholder="Nguyễn Văn A"
              />
            </Field>

            <Field label="Email liên hệ *">
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="example@doan.vn"
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
                placeholder="Bí thư, Phó Bí thư, UV BCH..."
              />
            </Field>
          </div>

          <Field label="Chức danh (Thẻ Nametag hiển thị)">
            <div className="space-y-2">
              <select
                value={editForm.chucDanh}
                onChange={(e) => setEditForm((prev) => ({ ...prev, chucDanh: e.target.value }))}
                className="w-full rounded-lg border border-stone-200 bg-white py-2 px-3 text-sm text-stone-800 focus:border-doan-500 focus:outline-none"
              >
                <option value="">-- Không gán chức danh --</option>
                {availableNametags.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <Input
                value={editForm.chucDanh}
                onChange={(e) => setEditForm((prev) => ({ ...prev, chucDanh: e.target.value }))}
                placeholder="Hoặc tự nhập tên Chức danh / Nametag mới..."
                className="text-xs"
              />
            </div>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Trạng thái tài khoản">
              <select
                value={editForm.status}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, status: e.target.value as Account["status"] }))
                }
                className="w-full rounded-lg border border-stone-200 bg-white py-2 px-3 text-sm text-stone-800 focus:border-doan-500 focus:outline-none"
              >
                <option value="ACTIVE">Hoạt động (ACTIVE)</option>
                <option value="LOCKED">Khóa tài khoản (LOCKED)</option>
                <option value="PENDING">Chờ duyệt (PENDING)</option>
              </select>
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
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-stone-100">
            {editingAccount && (
              <Link
                href={`/quan-tri/he-thong/phan-quyen/${editingAccount.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-doan-600 hover:text-doan-800"
              >
                <ShieldCheck className="h-4 w-4" /> Mở trang Phân quyền nhiệm vụ &rarr;
              </Link>
            )}
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setEditOpen(false)}>
                Hủy
              </Button>
              <Button onClick={handleSaveEdit} disabled={savingEdit}>
                {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lưu thay đổi"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* ==============================================================
       * MODAL 2: TẠO TÀI KHOẢN MỚI
       * ============================================================== */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Thêm tài khoản mới">
        <div className="space-y-4">
          <Field label="Đơn vị trực thuộc *">
            <select
              value={createForm.orgUnitId}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, orgUnitId: e.target.value }))}
              className="w-full rounded-lg border border-stone-200 bg-white py-2 px-3 text-sm text-stone-800 focus:border-doan-500 focus:outline-none"
            >
              {creatableUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} (Cấp {u.orgLevel})
                </option>
              ))}
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
              <Input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Tối thiểu 6 ký tự"
              />
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

          <Field label="Chức danh (Thẻ Nametag)">
            <select
              value={createForm.chucDanh}
              onChange={(e) => setCreateForm((prev) => ({ ...prev, chucDanh: e.target.value }))}
              className="w-full rounded-lg border border-stone-200 bg-white py-2 px-3 text-sm text-stone-800 focus:border-doan-500 focus:outline-none"
            >
              <option value="">-- Không gán chức danh --</option>
              {availableNametags.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>

          {createForm.chucDanh && PERM_SUGGESTIONS[createForm.chucDanh] && (
            <label className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 p-2.5 text-xs text-sky-800 cursor-pointer">
              <input
                type="checkbox"
                checked={createForm.applyPresetPerms}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, applyPresetPerms: e.target.checked }))}
                className="h-4 w-4 rounded text-doan-600"
              />
              <span>
                Tự động áp dụng phân quyền theo Chức danh mẫu trong Copy of Book1.xlsx (
                {PERM_SUGGESTIONS[createForm.chucDanh].includes("*")
                  ? "Toàn quyền"
                  : `${PERM_SUGGESTIONS[createForm.chucDanh].length} quyền`}
                )
              </span>
            </label>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-stone-100">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreateAccount} disabled={savingCreate}>
              {savingCreate ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tạo tài khoản"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ==============================================================
       * MODAL 3: IMPORT EXCEL (5 CỘT CHUẨN)
       * ============================================================== */}
      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Import danh sách tài khoản từ Excel (5 cột chuẩn)"
      >
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          {/* Hướng dẫn 5 cột chuẩn */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-900 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-emerald-800">
                <FileSpreadsheet className="h-4 w-4" /> Định dạng file Excel gồm đúng 5 cột:
              </span>
              <Button variant="secondary" size="sm" onClick={handleDownloadExcelTemplate} className="h-7 text-xs">
                <Download className="h-3.5 w-3.5" /> Tải file mẫu .xlsx
              </Button>
            </div>
            <div className="grid grid-cols-5 gap-1.5 text-center font-mono text-[11px] font-semibold">
              <div className="rounded bg-white p-1 border border-emerald-200">1. Tên đăng nhập</div>
              <div className="rounded bg-white p-1 border border-emerald-200">2. Họ và tên</div>
              <div className="rounded bg-white p-1 border border-emerald-200">3. Chức vụ trong đoàn</div>
              <div className="rounded bg-white p-1 border border-emerald-200">4. Chức danh</div>
              <div className="rounded bg-white p-1 border border-emerald-200">5. Email</div>
            </div>
          </div>

          {/* Chọn đơn vị tiếp nhận và mật khẩu khởi tạo */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Đơn vị tiếp nhận tài khoản *">
              <select
                value={importTargetUnitId}
                onChange={(e) => setImportTargetUnitId(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white py-2 px-3 text-sm text-stone-800 focus:border-doan-500 focus:outline-none"
              >
                {creatableUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} (Cấp {u.orgLevel})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Mật khẩu khởi tạo ban đầu">
              <Input
                type="text"
                value={defaultPassword}
                onChange={(e) => setDefaultPassword(e.target.value)}
                placeholder="KhoiTao@2026"
              />
            </Field>
          </div>

          {/* Checkbox tự động gán quyền theo Copy of Book1.xlsx */}
          <label className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer">
            <input
              type="checkbox"
              checked={autoApplySuggestions}
              onChange={(e) => setAutoApplySuggestions(e.target.checked)}
              className="h-4 w-4 rounded text-doan-600"
            />
            <span>
              Tự động phân quyền nhiệm vụ theo Chức danh (Nametag) nếu khớp các mẫu trong Copy of Book1.xlsx
            </span>
          </label>

          {/* Upload input */}
          <div className="rounded-xl border-2 border-dashed border-stone-300 p-6 text-center hover:border-doan-400 transition-colors bg-stone-50/50">
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
              <Loader2 className="h-4 w-4 animate-spin" /> Đang đọc và kiểm tra dữ liệu Excel...
            </div>
          )}

          {/* Bảng xem trước dữ liệu import */}
          {importRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-stone-700">
                  Xem trước dữ liệu ({importRows.length} dòng):
                </span>
                <span className="text-emerald-600 font-semibold">
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
                      <th className="p-2">Chức danh (Nametag)</th>
                      <th className="p-2">Email</th>
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
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800 border border-amber-200">
                              {r.chucDanh}
                            </span>
                          ) : (
                            <span className="text-stone-300 italic">—</span>
                          )}
                        </td>
                        <td className="p-2 text-stone-500">{r.email}</td>
                        <td className="p-2 text-center">
                          {r.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
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
       * MODAL 4: QUẢN LÝ THẺ CHỨC DANH (NAMETAG)
       * ============================================================== */}
      <Modal
        open={nametagModalOpen}
        onClose={() => setNametagModalOpen(false)}
        title="Quản lý Thẻ Chức danh / Nametag động"
      >
        <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          {/* Form thêm mới */}
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wide">
              Thêm Thẻ Chức danh mới
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
                placeholder="Mô tả nhiệm vụ / phụ trách..."
              />
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={handleCreateNametag} disabled={savingNametag}>
                {savingNametag ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Thêm Chức danh"}
              </Button>
            </div>
          </div>

          {/* Danh sách nametags hiện tại */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wide">
              Các Chức danh đang có ({availableNametags.length})
            </h3>
            <div className="divide-y divide-stone-100 rounded-lg border border-stone-200 bg-white">
              {availableNametags.map((tag) => {
                const count = store.accounts.filter(
                  (a) => a.chucDanh === tag || a.contactPosition === tag
                ).length;
                const style = getNametagStyle(tag);

                return (
                  <div key={tag} className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                          style?.wrap ?? "bg-stone-100 text-stone-700"
                        }`}
                      >
                        {style?.icon && <style.icon className="h-3.5 w-3.5" />}
                        {tag}
                      </span>
                    </div>
                    <span className="text-xs text-stone-500 font-medium">
                      {count} tài khoản đang dùng
                    </span>
                  </div>
                );
              })}
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
