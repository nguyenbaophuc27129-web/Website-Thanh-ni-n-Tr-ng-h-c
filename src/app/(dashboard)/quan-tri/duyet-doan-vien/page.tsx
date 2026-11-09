"use client";

import { useMemo, useState } from "react";
import {
  UserCheck,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  School,
  GraduationCap,
  Mail,
  Phone,
  Calendar,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { TableWrap, THead, Th, Tr, Td, EmptyRow } from "@/components/ui/table";
import type { Account } from "@/types";

export default function DuyetDoanVienPage() {
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterUnitId, setFilterUnitId] = useState<string>("ALL");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [rejectingAccount, setRejectingAccount] = useState<Account | null>(null);

  // Gate vai trò: Chỉ cấp TW, Tỉnh, Cấp 3 (xã/phường) và Đơn vị (Đoàn trường)
  const isAllowedRole =
    session &&
    (session.role === "QUAN_TRI_TW" ||
      session.role === "QUAN_TRI_TINH" ||
      session.role === "QUAN_TRI_CAP3" ||
      session.role === "DON_VI");

  const scopedUnits = useMemo(() => {
    if (!session) return [];
    const scopeIds = store.scopeIds(session);
    return store.orgUnits.filter((u) => scopeIds.includes(u.id));
  }, [store.orgUnits, session, store]);

  const pendingMembers = useMemo(() => {
    if (!session) return [];
    const scopeIds = store.scopeIds(session);
    return store.accounts
      .filter(
        (a) =>
          a.role === "DOAN_VIEN" &&
          a.status === "PENDING" &&
          scopeIds.includes(a.orgUnitId)
      )
      .sort((a, b) => b.id - a.id);
  }, [store.accounts, session, store]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pendingMembers.filter((m) => {
      if (filterUnitId !== "ALL" && m.orgUnitId !== Number(filterUnitId)) {
        return false;
      }
      if (!q) return true;
      const unitName = store.orgName(m.orgUnitId).toLowerCase();
      const name = (m.contactPerson || "").toLowerCase();
      const username = (m.username || "").toLowerCase();
      const email = (m.email || "").toLowerCase();
      const className = (m.className || "").toLowerCase();
      const pos = (m.contactPosition || "").toLowerCase();
      return (
        name.includes(q) ||
        username.includes(q) ||
        email.includes(q) ||
        unitName.includes(q) ||
        className.includes(q) ||
        pos.includes(q)
      );
    });
  }, [pendingMembers, search, filterUnitId, store]);

  if (!isAllowedRole) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-stone-900">
          Không có quyền truy cập
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Chức năng duyệt Đoàn viên chỉ dành cho quản trị viên và Ban Chấp hành Đoàn trường.
        </p>
      </div>
    );
  }

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await store.refreshAccounts();
      toast("Danh sách tài khoản đã được đồng bộ mới nhất.", "success");
    } catch {
      toast("Không thể làm mới danh sách tài khoản.", "warning");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleApprove = async (account: Account) => {
    setActionLoadingId(account.id);
    try {
      const res = await store.updateAccountStatus(account.id, "ACTIVE");
      if (!res.ok) {
        toast(res.error ?? "Không thể cập nhật trạng thái tài khoản.", "warning");
        return;
      }
      // Thông báo cho học sinh biết tài khoản đã được kích hoạt
      store.addNotification({
        recipientAccountId: account.id,
        notificationType: "SYSTEM",
        title: "Tài khoản Đoàn viên đã được kích hoạt",
        message: `Chào ${account.contactPerson || account.username}! Đăng ký của bạn đã được Đoàn trường duyệt — hãy đăng nhập để dùng diễn đàn, bình chọn HS3T và các chức năng thành viên.`,
        refType: "account",
        refId: account.id,
        linkUrl: "/dang-nhap",
      });
      toast(`Tài khoản đoàn viên ${account.contactPerson || account.username} đã được kích hoạt thành công.`, "success");
    } catch {
      toast("Không thể cập nhật trạng thái tài khoản.", "warning");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingAccount) return;
    const account = rejectingAccount;
    setActionLoadingId(account.id);
    try {
      const res = await store.updateAccountStatus(account.id, "DISABLED");
      if (!res.ok) {
        toast(res.error ?? "Không thể từ chối tài khoản này.", "warning");
        return;
      }
      store.addNotification({
        recipientAccountId: account.id,
        notificationType: "SYSTEM",
        title: "Đăng ký tài khoản chưa được duyệt",
        message: "Đăng ký tài khoản của bạn chưa được Đoàn trường xác nhận. Vui lòng liên hệ Đoàn trường của trường bạn hoặc đăng ký lại với thông tin chính xác.",
        refType: "account",
        refId: account.id,
        linkUrl: "/dang-nhap",
      });
      toast(`Đã từ chối kích hoạt tài khoản ${account.contactPerson || account.username}.`, "info");
    } catch {
      toast("Không thể từ chối tài khoản này.", "warning");
    } finally {
      setActionLoadingId(null);
      setRejectingAccount(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Tiêu đề & Tóm tắt */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white shadow-xs">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-stone-900">
                  Duyệt đăng ký Đoàn viên
                </h1>
                {pendingMembers.length > 0 && (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                    {pendingMembers.length} chờ duyệt
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500">
                Phê duyệt tài khoản Đoàn viên mới đăng ký thuộc phạm vi quản lý của Đoàn trường / Đoàn cấp trên.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Tải lại
          </Button>
        </div>
      </div>

      {/* Bộ lọc & Tìm kiếm */}
      <Card>
        <CardBody className="p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input
                placeholder="Tìm theo họ tên, tên đăng nhập, email, lớp, chức vụ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {scopedUnits.length > 1 && (
              <Select
                value={filterUnitId}
                onChange={(e) => setFilterUnitId(e.target.value)}
              >
                <option value="ALL">Tất cả đơn vị trực thuộc ({scopedUnits.length})</option>
                {scopedUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Bảng danh sách chờ duyệt */}
      <Card>
        <TableWrap>
          <THead>
            <Th>Đoàn viên đăng ký</Th>
            <Th>Trường & Lớp</Th>
            <Th>Chức vụ trong Đoàn</Th>
            <Th>Liên hệ</Th>
            <Th>Trạng thái</Th>
            <Th className="text-right">Hành động</Th>
          </THead>
          <tbody>
            {filteredMembers.length === 0 ? (
              <EmptyRow
                colSpan={6}
                message={
                  pendingMembers.length === 0
                    ? "Hiện không có đơn đăng ký Đoàn viên nào đang chờ duyệt."
                    : "Không tìm thấy hồ sơ phù hợp với điều kiện tìm kiếm."
                }
              />
            ) : (
              filteredMembers.map((account) => {
                const schoolName = store.orgName(account.orgUnitId);
                const isLoading = actionLoadingId === account.id;

                return (
                  <Tr key={account.id}>
                    {/* Cột 1: Thông tin cá nhân */}
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-sm font-bold text-blue-700">
                          {account.contactPerson
                            ? account.contactPerson.charAt(0).toUpperCase()
                            : "Đ"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-stone-900">
                            {account.contactPerson || "Chưa cập nhật tên"}
                          </p>
                          <p className="font-mono text-xs font-medium text-stone-500">
                            @{account.username}
                          </p>
                        </div>
                      </div>
                    </Td>

                    {/* Cột 2: Trường & Lớp */}
                    <Td>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5 text-xs font-medium text-stone-800">
                          <School className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                          <span className="truncate max-w-[220px]" title={schoolName}>
                            {schoolName || `Đơn vị #${account.orgUnitId}`}
                          </span>
                        </div>
                        {account.className && (
                          <div className="flex items-center gap-1 text-[11px] text-stone-500">
                            <GraduationCap className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                            <span>Lớp: {account.className}</span>
                          </div>
                        )}
                      </div>
                    </Td>

                    {/* Cột 3: Chức vụ */}
                    <Td>
                      <span className="inline-flex items-center rounded-md bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
                        {account.contactPosition || "Đoàn viên"}
                      </span>
                    </Td>

                    {/* Cột 4: Liên hệ */}
                    <Td>
                      <div className="space-y-0.5 text-xs">
                        <div className="flex items-center gap-1.5 text-stone-600">
                          <Mail className="h-3 w-3 text-stone-400" />
                          <span className="truncate max-w-[180px]">{account.email}</span>
                        </div>
                        {account.phone && (
                          <div className="flex items-center gap-1.5 text-stone-500">
                            <Phone className="h-3 w-3 text-stone-400" />
                            <span>{account.phone}</span>
                          </div>
                        )}
                      </div>
                    </Td>

                    {/* Cột 5: Trạng thái */}
                    <Td>
                      <Badge tone="yellow">
                        <span className="inline-flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Chờ duyệt
                        </span>
                      </Badge>
                    </Td>

                    {/* Cột 6: Hành động */}
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(account)}
                          disabled={isLoading}
                          className="bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                          Duyệt
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejectingAccount(account)}
                          disabled={isLoading}
                          className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <XCircle className="mr-1 h-3.5 w-3.5" />
                          Từ chối
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                );
              })
            )}
          </tbody>
        </TableWrap>
      </Card>

      {/* Modal xác nhận từ chối */}
      <Modal
        open={rejectingAccount !== null}
        onClose={() => setRejectingAccount(null)}
        title="Từ chối đơn đăng ký"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-3.5 text-amber-900 border border-amber-200">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-xs leading-relaxed">
              Bạn có chắc chắn muốn từ chối kích hoạt tài khoản của đoàn viên{" "}
              <strong>
                {rejectingAccount?.contactPerson} (@{rejectingAccount?.username})
              </strong>
              ? Tài khoản này sẽ chuyển sang trạng thái vô hiệu hóa.
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectingAccount(null)}
            >
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmReject}
              className="bg-rose-600 text-white hover:bg-rose-700"
            >
              Xác nhận từ chối
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
