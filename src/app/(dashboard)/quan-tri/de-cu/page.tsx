"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Award,
  Search,
  Check,
  X,
  AlertTriangle,
  Eye,
  Loader2,
  Calendar,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/lib/toast-context";
import { adminGetNominations, adminPatchNomination } from "@/lib/de-cu";
import type { Nomination, NominationStatus } from "@/types";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { StatCard } from "@/components/dashboard/stat-card";
import { TableWrap, THead, Th, Tr, Td } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Tab = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

export default function QuanTriDeCuPage() {
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>("PENDING");
  const [q, setQ] = useState("");
  const [qDeb, setQDeb] = useState("");
  const [loading, setLoading] = useState(true);

  const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [total, setTotal] = useState(0);

  const [viewNomination, setViewNomination] = useState<Nomination | null>(null);
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQDeb(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await adminGetNominations({
      status: tab === "ALL" ? undefined : (tab as NominationStatus),
      q: qDeb,
      limit: 50,
    });
    if (res.ok) {
      setCounts(res.counts);
      setNominations(res.nominations);
      setTotal(res.total);
    } else {
      toast(res.error || "Không thể tải danh sách hồ sơ", "warning");
    }
    setLoading(false);
  }, [tab, qDeb, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleModerate = async (nomination: Nomination, action: "approve" | "reject", reason?: string) => {
    setBusyId(nomination.id);
    const res = await adminPatchNomination({
      id: nomination.id,
      action,
      reason,
    });
    setBusyId(null);

    if (res.ok) {
      toast(
        action === "approve"
          ? `Đã phê duyệt hồ sơ đề cử của ${nomination.nomineeName}`
          : `Đã từ chối hồ sơ đề cử của ${nomination.nomineeName}`,
        "success"
      );
      if (viewNomination?.id === nomination.id) setViewNomination(null);
      if (rejectingId === nomination.id) {
        setRejectingId(null);
        setRejectReason("");
      }
      void load();
    } else {
      toast(res.error || "Thao tác không thành công", "warning");
    }
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif-display text-xl font-black text-stone-900 sm:text-2xl">
            Quản lý đề cử nhân tài trẻ
          </h1>
          <p className="mt-0.5 text-xs text-stone-500">
            Tiếp nhận, kiểm duyệt và phê duyệt hồ sơ đề cử nhân tài từ các tổ chức Đoàn trường
          </p>
        </div>
      </div>

      {/* 4 thẻ thống kê */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Tổng hồ sơ đề cử"
          value={counts.total}
          icon={Award}
          tone="blue"
        />
        <StatCard
          label="Chờ kiểm duyệt"
          value={counts.pending}
          icon={AlertTriangle}
          tone="amber"
        />
        <StatCard
          label="Đã phê duyệt vinh danh"
          value={counts.approved}
          icon={Check}
          tone="green"
        />
        <StatCard
          label="Đã từ chối"
          value={counts.rejected}
          icon={X}
          tone="red"
        />
      </div>

      {/* Tabs & Search */}
      <Card>
        <CardHeader
          title={
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <div className="flex flex-wrap gap-1 border-b border-stone-200">
                {(
                  [
                    { key: "PENDING", label: "Chờ duyệt", count: counts.pending },
                    { key: "APPROVED", label: "Đã duyệt", count: counts.approved },
                    { key: "REJECTED", label: "Từ chối", count: counts.rejected },
                    { key: "ALL", label: "Tất cả", count: counts.total },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "flex items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-bold transition-colors",
                      tab === t.key
                        ? "border-doan-600 text-doan-700"
                        : "border-transparent text-stone-500 hover:text-stone-800"
                    )}
                  >
                    <span>{t.label}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        tab === t.key ? "bg-doan-100 text-doan-800" : "bg-stone-100 text-stone-600"
                      )}
                    >
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Tìm theo tên học sinh, trường..."
                  className="pl-9 text-xs"
                />
              </div>
            </div>
          }
        />

        <CardBody className="p-0">
          <TableWrap>
            <THead>
              <Th className="w-12">#</Th>
              <Th>Gương mặt được đề cử</Th>
              <Th>Đơn vị / Trường học</Th>
              <Th>Lĩnh vực</Th>
              <Th>Kiểm duyệt AI</Th>
              <Th>Trạng thái</Th>
              <Th className="text-right">Thao tác</Th>
            </THead>
            <tbody>
                {loading ? (
                  <Tr>
                    <Td colSpan={7} className="py-8 text-center text-stone-400">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      <p className="mt-1">Đang tải danh sách hồ sơ...</p>
                    </Td>
                  </Tr>
                ) : nominations.length === 0 ? (
                  <Tr>
                    <Td colSpan={7} className="py-8 text-center text-stone-500">
                      Không có hồ sơ nào trong mục này.
                    </Td>
                  </Tr>
                ) : (
                  nominations.map((n, idx) => {
                    const isBusy = busyId === n.id;
                    return (
                      <Tr key={n.id} className="hover:bg-slate-50/70">
                        <Td className="font-mono text-[11px] text-stone-400">{idx + 1}</Td>
                        <Td>
                          <div className="flex items-center gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={n.evidenceThumbDataUrl}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-lg object-cover border border-slate-200"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-stone-900">{n.nomineeName}</p>
                              {n.nomineePosition && (
                                <p className="text-[11px] text-stone-500">{n.nomineePosition}</p>
                              )}
                            </div>
                          </div>
                        </Td>
                        <Td>
                          <p className="font-medium text-stone-800">{n.orgUnitName}</p>
                          {n.provinceName && (
                            <p className="text-[11px] text-stone-400">{n.provinceName}</p>
                          )}
                        </Td>
                        <Td>
                          <span className="inline-block rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900 border border-amber-200">
                            {n.field}
                          </span>
                        </Td>
                        <Td>
                          {n.aiVerdict === "FLAGGED" ? (
                            <Badge tone="red" className="!py-0.5 text-[10px]">
                              Cảnh báo AI
                            </Badge>
                          ) : (
                            <Badge tone="green" className="!py-0.5 text-[10px]">
                              Hợp lệ AI
                            </Badge>
                          )}
                        </Td>
                        <Td>
                          {n.status === "PENDING" && <Badge tone="yellow">Chờ duyệt</Badge>}
                          {n.status === "APPROVED" && <Badge tone="green">Đã duyệt</Badge>}
                          {n.status === "REJECTED" && (
                            <div className="space-y-0.5">
                              <Badge tone="red">Từ chối</Badge>
                              {n.rejectionReason && (
                                <p className="text-[10px] text-red-600 line-clamp-1">
                                  {n.rejectionReason}
                                </p>
                              )}
                            </div>
                          )}
                        </Td>
                        <Td className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewNomination(n)}
                              className="h-7 px-2 text-[11px]"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" /> Chi tiết
                            </Button>

                            {n.status === "PENDING" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleModerate(n, "approve")}
                                  disabled={isBusy}
                                  className="h-7 bg-emerald-600 hover:bg-emerald-700 text-white px-2 text-[11px]"
                                >
                                  {isBusy ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="h-3 w-3 mr-0.5" />
                                  )}
                                  Duyệt
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setRejectingId(n.id);
                                    setRejectReason("");
                                  }}
                                  disabled={isBusy}
                                  className="h-7 border-rose-300 text-rose-700 hover:bg-rose-50 px-2 text-[11px]"
                                >
                                  <X className="h-3 w-3 mr-0.5" /> Từ chối
                                </Button>
                              </>
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

      {/* Modal xem chi tiết */}
      <Modal
        open={!!viewNomination}
        onClose={() => setViewNomination(null)}
        title={viewNomination ? `Hồ sơ đề cử: ${viewNomination.nomineeName}` : ""}
        wide
      >
        {viewNomination ? (
          <div className="space-y-5">
            <div className="grid gap-5 md:grid-cols-[200px_1fr] items-start">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={viewNomination.evidenceDataUrl || viewNomination.evidenceThumbDataUrl}
                  alt={viewNomination.nomineeName}
                  className="w-full rounded-lg object-contain max-h-64"
                />
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <h3 className="font-serif-display text-lg font-bold text-slate-900">
                    {viewNomination.nomineeName}
                  </h3>
                  <p className="text-slate-500">
                    {viewNomination.nomineePosition ? `${viewNomination.nomineePosition} · ` : ""}
                    {viewNomination.orgUnitName}
                    {viewNomination.provinceName ? ` · ${viewNomination.provinceName}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 font-bold text-amber-900 border border-amber-300">
                    Lĩnh vực: {viewNomination.field}
                  </span>
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-slate-600">
                    Tài khoản gửi: @{viewNomination.submitterUsername ?? "cán bộ"}
                  </span>
                </div>

                {viewNomination.aiVerdict === "FLAGGED" && (
                  <div className="rounded-lg border border-red-300 bg-red-50 p-2 text-red-800">
                    <p className="font-bold flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5 text-red-600" /> Cảnh báo kiểm duyệt AI
                    </p>
                    <p className="mt-0.5 text-[11px]">{viewNomination.aiReason}</p>
                  </div>
                )}

                {viewNomination.quote && (
                  <div className="rounded-lg border-l-3 border-amber-400 bg-amber-50 p-2.5 italic text-slate-700">
                    &ldquo;{viewNomination.quote}&rdquo;
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
                Quá trình phấn đấu &amp; Thành tích nổi bật
              </h4>
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs leading-relaxed text-slate-800 whitespace-pre-line max-h-60 overflow-y-auto">
                {viewNomination.achievements}
              </div>
            </div>

            {viewNomination.status === "PENDING" && (
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setRejectingId(viewNomination.id);
                    setRejectReason("");
                  }}
                  className="border-rose-300 text-rose-700 hover:bg-rose-50"
                >
                  <X className="h-4 w-4 mr-1" /> Từ chối
                </Button>
                <Button
                  onClick={() => handleModerate(viewNomination, "approve")}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Check className="h-4 w-4 mr-1" /> Phê duyệt vinh danh
                </Button>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Modal từ chối (nhập lý do) */}
      <Modal
        open={rejectingId !== null}
        onClose={() => setRejectingId(null)}
        title="Từ chối hồ sơ đề cử"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Vui lòng nhập lý do từ chối để đơn vị đề cử nắm được thông tin và hoàn thiện lại hồ sơ:
          </p>
          <Field label="Lý do từ chối" required hint="Tối thiểu 3 ký tự">
            <Textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ví dụ: Thiếu minh chứng giải thưởng cấp tỉnh; hoặc hồ sơ chưa đủ tiêu chuẩn quy định..."
              className="text-xs"
            />
          </Field>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setRejectingId(null)}>
              Hủy
            </Button>
            <Button
              size="sm"
              disabled={rejectReason.trim().length < 3 || busyId !== null}
              onClick={() => {
                const n = nominations.find((item) => item.id === rejectingId);
                if (n) void handleModerate(n, "reject", rejectReason.trim());
              }}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {busyId !== null ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
              Xác nhận từ chối
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
