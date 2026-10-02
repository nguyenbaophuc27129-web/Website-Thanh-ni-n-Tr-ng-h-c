"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Trash2, Send } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { TableWrap, THead, Th, Tr, Td, EmptyRow } from "@/components/ui/table";
import { ActivityStatusBadge, ConfirmStatusBadge } from "@/components/dashboard/status-badge";
import { PhotoPlaceholder } from "@/components/ui/photo-placeholder";
import { Modal } from "@/components/ui/modal";
import { formatDate, formatNumber } from "@/lib/utils";

export default function HoatDongListPage() {
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);

  const scope = useMemo(() => (session ? store.scopeIds(session) : []), [session, store]);

  const list = useMemo(() => {
    return store.activities
      .filter((a) => (tab === "mine" ? a.orgUnitId === session?.orgUnitId : scope.includes(a.orgUnitId)))
      .filter((a) => (status === "all" ? true : status === "pending" ? a.confirmStatus === "PENDING" || a.confirmStatus === "NEEDS_INFO" : a.status === status))
      .filter((a) => (q.trim() === "" ? true : a.title.toLowerCase().includes(q.toLowerCase())))
      .sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [store.activities, tab, status, q, scope, session]);

  const canCreate = session?.role === "DON_VI" || session?.role === "QUAN_TRI_CAP3" || session?.role === "QUAN_TRI_TINH" || session?.role === "QUAN_TRI_TW";

  const counts = {
    all: store.activities.filter((a) => scope.includes(a.orgUnitId)).length,
    mine: store.activities.filter((a) => a.orgUnitId === session?.orgUnitId).length,
  };

  const handleDelete = () => {
    if (deleting === null) return;
    store.deleteActivity(deleting);
    setDeleting(null);
    toast("Đã xóa hoạt động nháp.");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif-display text-xl font-bold text-stone-900">Quản lý hoạt động</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Phạm vi hiển thị: {tab === "mine" ? "chỉ đơn vị của bạn" : "đơn vị bạn và toàn bộ cấp dưới"}.
          </p>
        </div>
        {canCreate ? (
          <Link href="/quan-tri/hoat-dong/tao-moi">
            <Button><Plus className="h-4 w-4" /> Cập nhật hoạt động</Button>
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "all", label: "Toàn phạm vi", count: counts.all },
            { value: "mine", label: "Đơn vị tôi", count: counts.mine },
          ]}
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-48">
          <option value="all">Mọi trạng thái</option>
          <option value="DRAFT">Nháp</option>
          <option value="SUBMITTED">Đã cập nhật</option>
          <option value="REVISED">Đã điều chỉnh</option>
          <option value="pending">Chờ/cần xác nhận</option>
        </Select>
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên hoạt động…" className="pl-9" />
        </div>
      </div>

      <Card>
        <CardBody className="p-0">
          <TableWrap>
            <THead>
                <Th className="w-14">Ảnh</Th>
                <Th>Hoạt động</Th>
                <Th>Đơn vị</Th>
                <Th>Thời gian</Th>
                <Th>SL tham gia</Th>
                <Th>Trạng thái</Th>
                <Th>Xác nhận</Th>
                <Th className="w-24" />
            </THead>
            <tbody>
              {list.map((a) => (
                <Tr key={a.id}>
                  <Td>
                    <PhotoPlaceholder seed={a.imageSeed} className="h-10 w-14 rounded-md" icon={false} />
                  </Td>
                  <Td>
                    <Link href={`/quan-tri/hoat-dong/${a.id}`} className="line-clamp-2 max-w-md text-sm font-medium text-stone-900 hover:text-doan-700">
                      {a.title}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-stone-400">
                      {a.links.length} link minh chứng · {a.categoryIds.length} nhóm nội dung
                    </p>
                  </Td>
                  <Td className="text-xs">{store.orgName(a.orgUnitId)}</Td>
                  <Td className="whitespace-nowrap text-xs">{formatDate(a.startDate)}</Td>
                  <Td className="text-xs">{formatNumber(a.participantCount)}</Td>
                  <Td><ActivityStatusBadge status={a.status} /></Td>
                  <Td><ConfirmStatusBadge status={a.confirmStatus} /></Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      {a.orgUnitId === session?.orgUnitId && a.status === "DRAFT" ? (
                        <>
                          <button
                            onClick={() => { if (session) { store.submitActivity(session, a.id); toast("Đã nộp hoạt động để cấp trên xác nhận."); } }}
                            className="rounded-md p-1.5 text-stone-400 hover:bg-emerald-50 hover:text-emerald-600"
                            title="Nộp hoạt động"
                          >
                            <Send className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleting(a.id)}
                            className="rounded-md p-1.5 text-stone-400 hover:bg-red-50 hover:text-red-600"
                            title="Xóa nháp"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      ) : null}
                    </div>
                  </Td>
                </Tr>
              ))}
              {list.length === 0 ? <EmptyRow colSpan={8} message="Không có hoạt động phù hợp bộ lọc." /> : null}
            </tbody>
          </TableWrap>
        </CardBody>
      </Card>

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Xóa hoạt động nháp"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>Giữ lại</Button>
            <Button variant="danger" onClick={handleDelete}>Xóa vĩnh viễn</Button>
          </>
        }
      >
        <p className="text-sm text-stone-600">
          Hoạt động đang ở trạng thái nháp sẽ bị xóa và không thể khôi phục. Bạn chắc chắn chứ?
        </p>
      </Modal>
    </div>
  );
}
