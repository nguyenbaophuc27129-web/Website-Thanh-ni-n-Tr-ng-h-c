"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ArrowLeft,
  Crown,
  Check,
  RotateCcw,
  Save,
  CheckSquare2,
  Square,
  AlertCircle,
  Building2,
  Mail,
  Briefcase,
  Tag,
  Loader2,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PERM_CATALOG, permNameOf } from "@/lib/permissions";
import { permissionsList } from "@/data/org-units";
import { ROLE_PERMISSIONS } from "@/types";

/* Mô tả chi tiết cho từng quyền chức năng */
const PERM_DESCRIPTIONS: Record<string, string> = {
  "activity.view": "Xem danh sách và chi tiết các hoạt động phong trào Đoàn",
  "activity.create": "Đăng ký, cập nhật hoạt động mới kèm minh chứng hình ảnh/link",
  "activity.review": "Thẩm định, duyệt và xác nhận kết quả hoạt động của đơn vị cấp dưới",
  "task.assign": "Giao nhiệm vụ, chỉ tiêu thi đua và phân bổ cho các đơn vị",
  "task.update": "Báo cáo tiến độ và cập nhật kết quả thực hiện nhiệm vụ",
  "task.review": "Đánh giá, chấm điểm và xác nhận hoàn thành nhiệm vụ",
  "score.view": "Xem bảng điểm thi đua của các đơn vị trực thuộc",
  "score.manage": "Chấm điểm thi đua theo Bộ tiêu chí năm học",
  "report.create": "Lập và nộp báo cáo định kỳ theo mẫu quy định",
  "report.manage": "Thẩm định, quản lý, xuất file báo cáo công tác Đoàn",
  "ranking.manage": "Tổng hợp, chốt kỳ xếp hạng và công bố kết quả thi đua",
  "post.manage": "Đọc, thẩm định và quản lý bài viết trong mục Tin tức",
  "post.publish": "Biên tập, duyệt đăng và xuất bản tin bài lên cổng công khai",
  "document.view": "Xem và tải các văn bản, thông tri chỉ đạo",
  "document.issue": "Soạn thảo, ký số và ban hành văn bản chỉ đạo tới cấp dưới",
  "resource.view": "Xem và tải các tài nguyên, thiết kế, biểu mẫu dùng chung",
  "resource.manage": "Đăng tải và quản lý kho tài nguyên truyền thông Đoàn",
  "forum.interact": "Xem, theo dõi, đăng bài và bình luận tương tác trên Diễn đàn ẩn danh",
  "forum.manage": "Kiểm duyệt, xử lý vi phạm, ẩn/xóa bài trên Diễn đàn ẩn danh",
  "project.manage": 'Đọc, thẩm định, duyệt đăng chuyên mục "Mỗi trường THPT 01 dự án tình nguyện"',
  "contribution.review": "Xem và duyệt bài viết đóng góp từ Đoàn viên",
  "feedback.view": "Xem thông tin chi tiết phản ánh, kiến nghị của Học sinh THPT",
  "feedback.reply": "Soạn và gửi câu trả lời phản ánh (bạo lực học đường, xâm hại, an toàn...)",
  "feedback.manage": "Điều phối, phân công cán bộ xử lý và đóng hồ sơ phản ánh",
  "hs3t.view": "Xem hồ sơ xét chọn danh hiệu Học sinh 3 tốt các cấp",
  "hs3t.review": "Thẩm định, duyệt, đánh giá và công nhận danh hiệu Học sinh 3 tốt",
  "quiz.result": "Xem thống kê và kết quả các kỳ thi trực tuyến của học sinh",
  "quiz.manage": "Tạo ngân hàng câu hỏi và tổ chức các kỳ thi kiến thức trực tuyến",
  "system.orgtree.view": "Xem cây sơ đồ tổ chức Đoàn toàn quốc",
  "system.account.manage": "Tạo, sửa, khóa và phân quyền tài khoản cấp dưới",
  "system.settings": "Cấu hình tham số và thiết lập hệ thống",
};

export default function PhanQuyenTaiKhoanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const accountId = Number(id);
  const router = useRouter();
  const store = useStore();
  const { session, refreshSession } = useAuth();
  const { toast } = useToast();

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  const targetAccount = useMemo(
    () => store.accounts.find((a) => a.id === accountId),
    [store.accounts, accountId]
  );

  const orgUnit = useMemo(
    () => (targetAccount ? store.orgById(targetAccount.orgUnitId) : undefined),
    [store, targetAccount]
  );

  // Tải danh sách quyền hiện tại từ API backend (kèm fallback store/memory)
  useEffect(() => {
    let cancelled = false;
    async function loadPerms() {
      if (!accountId) return;
      try {
        const res = await fetch(`/api/accounts/${accountId}/permissions`);
        const data = await res.json().catch(() => null);
        if (!cancelled && res.ok && data?.ok && Array.isArray(data.perms)) {
          setSelectedPerms(data.perms);
          setLoading(false);
          return;
        }
      } catch {
        // offline fallback
      }
      if (!cancelled) {
        if (targetAccount?.grantedPerms && targetAccount.grantedPerms.length > 0) {
          setSelectedPerms(targetAccount.grantedPerms);
        } else if (targetAccount) {
          const defaultPerms = ROLE_PERMISSIONS[targetAccount.role] ?? [];
          setSelectedPerms(defaultPerms);
        }
        setLoading(false);
      }
    }
    loadPerms();
    return () => {
      cancelled = true;
    };
  }, [accountId, targetAccount]);

  const isAllStar = selectedPerms.includes("*");

  // Kiểm tra 1 mã quyền có được tick hay không
  const isChecked = (code: string) => isAllStar || selectedPerms.includes(code);

  // Toggle tick/untick từng quyền
  const togglePerm = (code: string) => {
    if (isAllStar) {
      const allCodes = permissionsList.map((p) => p.code).filter((c) => c !== code);
      setSelectedPerms(allCodes);
      return;
    }
    if (selectedPerms.includes(code)) {
      setSelectedPerms((prev) => prev.filter((c) => c !== code));
    } else {
      setSelectedPerms((prev) => [...prev, code]);
    }
  };

  // Toggle toàn bộ quyền trong 1 nhóm
  const toggleGroup = (codes: string[]) => {
    if (isAllStar) {
      const allCodes = permissionsList.map((p) => p.code).filter((c) => !codes.includes(c));
      setSelectedPerms(allCodes);
      return;
    }
    const allInGroupChecked = codes.every((c) => selectedPerms.includes(c));
    if (allInGroupChecked) {
      setSelectedPerms((prev) => prev.filter((c) => !codes.includes(c)));
    } else {
      const toAdd = codes.filter((c) => !selectedPerms.includes(c));
      setSelectedPerms((prev) => [...prev, ...toAdd]);
    }
  };

  // Cấp toàn quyền (*)
  const handleGrantSuperadmin = () => {
    setSelectedPerms(["*"]);
    toast("Đã cấp Toàn quyền (*). Tài khoản có thể dùng tất cả phân hệ.", "success");
  };

  // Chọn tất cả 31 quyền
  const handleSelectAll = () => {
    setSelectedPerms(permissionsList.map((p) => p.code));
  };

  // Bỏ chọn tất cả
  const handleClearAll = () => {
    setSelectedPerms([]);
  };

  // Khôi phục quyền mặc định theo vai trò đơn vị
  const handleResetToRoleDefault = () => {
    if (targetAccount) {
      const defaultPerms = ROLE_PERMISSIONS[targetAccount.role] ?? [];
      setSelectedPerms(defaultPerms);
      toast(`Đã khôi phục quyền mặc định theo vai trò "${targetAccount.role}".`);
    }
  };

  // Lưu phân quyền
  const handleSave = async () => {
    if (!targetAccount) return;
    setSaving(true);
    const res = await store.updateAccountPermissions(targetAccount.id, selectedPerms);
    setSaving(false);
    if (!res.ok) {
      toast(res.error ?? "Không lưu được phân quyền.", "warning");
      return;
    }
    if (session?.accountId === targetAccount.id) {
      void refreshSession();
    }
    toast(
      `Đã cập nhật phân quyền thành công cho tài khoản @${targetAccount.username}!`,
      "success"
    );
  };

  if (!targetAccount) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
        <h2 className="mt-3 text-lg font-bold text-stone-800">Không tìm thấy tài khoản</h2>
        <p className="mt-1 text-sm text-stone-500">
          Tài khoản này không tồn tại hoặc đã bị xóa khỏi hệ thống.
        </p>
        <Button className="mt-5" onClick={() => router.push("/quan-tri/he-thong/phan-quyen")}>
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
        </Button>
      </div>
    );
  }

  // Đếm tổng số quyền đang cấp
  const activeCount = isAllStar ? permissionsList.length : selectedPerms.length;

  return (
    <div className="space-y-6 pb-24">
      {/* ===== Breadcrumb & Header ===== */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/quan-tri/he-thong/phan-quyen"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-doan-600 hover:text-doan-700 hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại danh sách phân quyền &amp; tài khoản
          </Link>
          <h1 className="mt-2 font-serif-display text-2xl font-black tracking-tight text-stone-900">
            Phân quyền nhiệm vụ chi tiết
          </h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Cấp trên phân quyền cho cấp dưới: Tích vào mục nào thì tài khoản sẽ được xem và thao tác ở mục đó.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => router.push("/quan-tri/he-thong/phan-quyen")}>
            Hủy bỏ
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-doan-600 hover:bg-doan-700 text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Lưu phân quyền
          </Button>
        </div>
      </div>

      {/* ===== Card Thông tin tài khoản được phân quyền ===== */}
      <Card className="border-stone-200 bg-white">
        <CardBody className="p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-doan-600 text-base font-bold text-white shadow-xs">
                {targetAccount.contactPerson ? targetAccount.contactPerson.slice(0, 1).toUpperCase() : "U"}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-base font-bold text-stone-900">
                    {targetAccount.contactPerson}
                  </h2>
                  <span className="font-mono text-xs text-stone-500">
                    (@{targetAccount.username})
                  </span>
                  {targetAccount.chucDanh ? (
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 border border-blue-200">
                      {targetAccount.chucDanh}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5 text-stone-400" />
                    {orgUnit?.name ?? `Đơn vị #${targetAccount.orgUnitId}`} (Cấp {orgUnit?.orgLevel ?? "—"})
                  </span>
                  {targetAccount.contactPosition ? (
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5 text-stone-400" />
                      {targetAccount.contactPosition}
                    </span>
                  ) : null}
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5 text-stone-400" />
                    {targetAccount.email}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3 sm:border-t-0 sm:pt-0">
              <div className="text-right">
                <p className="text-[11px] font-medium text-stone-400">Trạng thái quyền</p>
                <p className="text-xs font-bold text-stone-800">
                  {isAllStar
                    ? "Toàn quyền hệ thống (*)"
                    : selectedPerms.length > 0
                    ? `Đã tích ${selectedPerms.length}/${permissionsList.length} chức năng`
                    : "Mặc định theo vai trò"}
                </p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ===== Toolbar Thao tác nhanh ===== */}
      <Card>
        <CardBody className="p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-semibold text-stone-600">
              Thao tác nhanh trên danh sách chức năng:
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleGrantSuperadmin} className="border-amber-300 bg-amber-50/50 text-amber-800 hover:bg-amber-100">
                <Crown className="h-3.5 w-3.5 text-amber-600" /> Cấp toàn quyền (*)
              </Button>
              <Button size="sm" variant="secondary" onClick={handleSelectAll}>
                <CheckSquare2 className="h-3.5 w-3.5 text-stone-600" /> Chọn tất cả (31 quyền)
              </Button>
              <Button size="sm" variant="secondary" onClick={handleClearAll}>
                <Square className="h-3.5 w-3.5 text-stone-500" /> Bỏ chọn hết
              </Button>
              <Button size="sm" variant="ghost" onClick={handleResetToRoleDefault}>
                <RotateCcw className="h-3.5 w-3.5 text-stone-500" /> Mặc định vai trò
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ===== Lưới các nhóm chức năng (Checkboxes chi tiết) ===== */}
      {loading ? (
        <div className="py-12 text-center text-stone-400">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-doan-600" />
          <p className="mt-2 text-xs">Đang tải danh mục quyền chức năng…</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {PERM_CATALOG.map((group) => {
            const groupCheckedCount = group.codes.filter(isChecked).length;
            const isAllGroupChecked = group.codes.every(isChecked);

            return (
              <Card key={group.module} className="overflow-hidden border-stone-200">
                <CardHeader
                  title={
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-stone-900">{group.module}</span>
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-600">
                        {groupCheckedCount} / {group.codes.length}
                      </span>
                    </div>
                  }
                  subtitle={group.hint}
                  action={
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleGroup(group.codes)}
                      className="text-xs text-doan-700 hover:text-doan-800"
                    >
                      {isAllGroupChecked ? "Bỏ chọn nhóm" : "Chọn cả nhóm"}
                    </Button>
                  }
                />
                <CardBody className="border-t border-stone-100 bg-stone-50/40 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {group.codes.map((code) => {
                      const checked = isChecked(code);
                      const name = permNameOf(code);
                      const desc = PERM_DESCRIPTIONS[code] ?? "";

                      return (
                        <label
                          key={code}
                          onClick={() => togglePerm(code)}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                            checked
                              ? "border-sky-300 bg-sky-50/60 shadow-xs"
                              : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/60"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {}} // Đã xử lý ở label onClick
                            className="mt-0.5 h-4 w-4 rounded border-stone-300 text-sky-600 focus:ring-sky-500"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <span
                                className={`text-xs font-bold ${
                                  checked ? "text-sky-900" : "text-stone-800"
                                }`}
                              >
                                {name}
                              </span>
                              <code className="rounded bg-stone-100 px-1 py-0.2 font-mono text-[10px] text-stone-500">
                                {code}
                              </code>
                            </div>
                            {desc ? (
                              <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
                                {desc}
                              </p>
                            ) : null}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* ===== Sticky Footer Lưu quyền ===== */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-stone-200 bg-white/95 backdrop-blur-md py-3 shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-doan-600" />
            <span className="text-xs font-semibold text-stone-700">
              {isAllStar
                ? "Tài khoản có Toàn quyền (*)"
                : `Đang chọn: ${activeCount} / ${permissionsList.length} quyền`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push("/quan-tri/he-thong/phan-quyen")}
            >
              Quay lại danh sách
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-doan-600 hover:bg-doan-700 text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Lưu phân quyền
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
