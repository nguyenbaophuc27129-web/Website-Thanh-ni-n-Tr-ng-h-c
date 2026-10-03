"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, X, ShieldAlert, ShieldCheck, MapPinned, Users, ExternalLink, Paperclip } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";

type Tab = "PENDING" | "APPROVED" | "REJECTED" | "ALL";

export default function DuAnAdminPage() {
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("PENDING");
  const [openId, setOpenId] = useState<number | null>(null);
  const [note, setNote] = useState("");

  const scope = useMemo(() => (session ? new Set(store.scopeIds(session)) : new Set<number>()), [store, session]);

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

  const all = useMemo(
    () => store.volunteerProjects.filter((p) => scope.has(p.orgUnitId)),
    [store, scope]
  );
  const pendingCount = all.filter((p) => p.status === "PENDING").length;

  const projects = useMemo(
    () =>
      all
        .filter((p) => (tab === "ALL" ? true : p.status === tab))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [all, tab]
  );

  const moderate = (id: number, action: "APPROVE" | "REJECT") => {
    store.moderateVolunteerProject(session, id, action, action === "REJECT" ? note.trim() || undefined : undefined);
    toast(
      action === "APPROVE"
        ? "Đã duyệt dự án — pin hiển thị trên bản đồ tình nguyện, đơn vị gửi được +20 điểm."
        : "Đã từ chối dự án — đơn vị gửi nhận thông báo lý do.",
      action === "APPROVE" ? "success" : "warning"
    );
    setOpenId(null);
    setNote("");
  };

  const contributorName = (id?: number) =>
    id ? store.accounts.find((a) => a.id === id)?.contactPerson ?? "Đoàn viên" : "Cán bộ Đoàn";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-serif-display text-xl font-bold text-stone-900">Duyệt dự án tình nguyện</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Duyệt xong dự án tự động ghim lên bản đồ 34 tỉnh ở chuyên trang Dự án tình nguyện.
          </p>
        </div>
        <Link href="/du-an-tinh-nguyen" className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-3.5 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50">
          <MapPinned className="h-3.5 w-3.5 text-doan-600" /> Xem bản đồ công khai <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "PENDING", label: "Chờ duyệt", count: pendingCount },
          { value: "APPROVED", label: "Đã duyệt", count: all.filter((p) => p.status === "APPROVED").length },
          { value: "REJECTED", label: "Đã từ chối", count: all.filter((p) => p.status === "REJECTED").length },
          { value: "ALL", label: "Tất cả", count: all.length },
        ]}
      />

      <div className="space-y-3">
        {projects.length === 0 ? (
          <Card>
            <CardBody className="py-12 text-center text-sm text-stone-400">Không có dự án nào ở trạng thái này.</CardBody>
          </Card>
        ) : null}
        {projects.map((p) => {
          const open = openId === p.id;
          return (
            <Card key={p.id}>
              <CardBody className="p-0">
                <button
                  onClick={() => { setOpenId(open ? null : p.id); setNote(""); }}
                  className="flex w-full flex-wrap items-center gap-3 px-5 py-4 text-left hover:bg-stone-50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                    <MapPinned className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-stone-800">{p.projectName}</p>
                    <p className="text-[11px] text-stone-400">
                      {p.schoolName} · {p.province} · {contributorName(p.submittedByAccountId)} · {formatDateTime(p.createdAt)}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[11px] text-stone-400">
                    <Users className="h-3 w-3" /> {p.participants}
                  </span>
                  {p.status === "PENDING" ? <Badge tone="yellow">Chờ duyệt</Badge>
                    : p.status === "APPROVED" ? <Badge tone="green">Đã ghim bản đồ</Badge>
                    : <Badge tone="red">Đã từ chối</Badge>}
                </button>

                {open ? (
                  <div className="space-y-4 border-t border-stone-100 px-5 py-4">
                    <div className="rounded-lg bg-stone-50 p-3.5">
                      <p className="mb-1 text-sm font-semibold text-stone-800">{p.projectName}</p>
                      <p className="mb-2 text-xs text-stone-500">
                        Đơn vị: {p.schoolName} ({store.orgName(p.orgUnitId)}) · Tỉnh: {p.province}
                      </p>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-stone-700">{p.summary}</p>
                      <p className="mt-2 text-xs text-stone-500">
                        Người thụ hưởng: <b className="text-stone-700">{p.beneficiaries}</b> · Tham gia: {p.participants} đoàn viên
                      </p>
                      {p.reportFile?.name ? (
                        <p className="mt-2 text-xs">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 py-1 pl-2.5 pr-3 font-medium text-slate-600">
                            <Paperclip className="h-3 w-3 text-slate-400" />
                            {p.reportFile.dataUrl ? (
                              <a href={p.reportFile.dataUrl} download={p.reportFile.name} className="max-w-56 truncate text-blue-600 hover:underline" title={`Tải ${p.reportFile.name}`}>
                                {p.reportFile.name}
                              </a>
                            ) : (
                              <span className="max-w-56 truncate">{p.reportFile.name}</span>
                            )}
                          </span>
                        </p>
                      ) : null}
                    </div>

                    {/* Strip kết quả kiểm duyệt AI */}
                    <div className={p.aiVerdict === "FLAGGED" ? "rounded-lg border border-red-200 bg-red-50 p-3" : "rounded-lg border border-emerald-200 bg-emerald-50 p-3"}>
                      <p className="flex items-center gap-1.5 text-xs font-bold">
                        {p.aiVerdict === "FLAGGED" ? (
                          <>
                            <ShieldAlert className="h-4 w-4 text-red-600" />
                            <span className="text-red-700">AI gắn cờ nội dung này</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                            <span className="text-emerald-700">AI đánh giá sạch</span>
                          </>
                        )}
                      </p>
                      {p.aiReason ? <p className="mt-1 text-xs text-stone-600">Lý do: {p.aiReason}</p> : null}
                    </div>

                    {p.status === "APPROVED" ? (
                      <Link href="/du-an-tinh-nguyen" className="inline-flex items-center gap-1 text-[11px] font-semibold text-doan-600 hover:underline">
                        <MapPinned className="h-3.5 w-3.5" /> Xem pin trên bản đồ →
                      </Link>
                    ) : null}

                    {p.status !== "APPROVED" ? (
                      <div className="space-y-2 border-t border-stone-100 pt-3">
                        <Textarea
                          value={open ? note : ""}
                          onChange={(e) => setNote(e.target.value)}
                          rows={2}
                          placeholder="Lý do từ chối (gửi về cho đơn vị tiếp nhận)…"
                        />
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => moderate(p.id, "REJECT")}>
                            <X className="h-3.5 w-3.5" /> Từ chối
                          </Button>
                          <Button size="sm" onClick={() => moderate(p.id, "APPROVE")}>
                            <Check className="h-3.5 w-3.5" /> Duyệt & ghim bản đồ
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
