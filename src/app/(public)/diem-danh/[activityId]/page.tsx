"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { CheckCircle2, QrCode, XCircle } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

export default function DiemDanhPage() {
  const params = useParams<{ activityId: string }>();
  const activityId = Number(params.activityId);
  const { activities, attendances, attendanceOpenIds, addAttendance } = useStore();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");

  const activity = useMemo(() => activities.find((a) => a.id === activityId), [activities, activityId]);
  const count = attendances.filter((att) => att.activityId === activityId).length;
  const isOpen = attendanceOpenIds.includes(activityId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast("Vui lòng nhập họ tên.", "warning");
      return;
    }
    const ok = addAttendance({ activityId, memberName: name, memberClass: className });
    if (!ok) {
      toast("Điểm danh chưa được mở hoặc hoạt động không tồn tại.", "warning");
      return;
    }
    toast(`Đã điểm danh thành công! Chào ${name.trim()}.`);
    setName("");
    setClassName("");
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <QrCode className="h-4.5 w-4.5 text-doan-600" /> Điểm danh hoạt động
            </span>
          }
          subtitle={activity ? activity.title : `Hoạt động #${params.activityId}`}
        />
        <CardBody className="space-y-4">
          {!activity ? (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <XCircle className="mt-0.5 h-4.5 w-4.5 shrink-0" />
              Không tìm thấy hoạt động. Vui lòng kiểm tra lại mã QR.
            </div>
          ) : !isOpen ? (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <XCircle className="mt-0.5 h-4.5 w-4.5 shrink-0" />
              <div>
                <p className="font-semibold">Điểm danh chưa được mở</p>
                <p className="mt-0.5 text-xs">Ban tổ chức chưa bật điểm danh cho hoạt động này. Vui lòng liên hệ ban tổ chức hoặc thử lại sau.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
                Đang mở điểm danh · <b>{count}</b> lượt đã điểm danh
              </div>
              <form onSubmit={submit} className="space-y-4">
                <Field label="Họ và tên" required>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="VD: Nguyễn Văn A" />
                </Field>
                <Field label="Lớp / chi đoàn">
                  <Input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="VD: 11A2" />
                </Field>
                <Button type="submit" size="lg" className="w-full">
                  <CheckCircle2 className="h-4 w-4" /> Điểm danh
                </Button>
              </form>
            </>
          )}
        </CardBody>
      </Card>
      <p className="mt-4 text-center text-[11px] text-stone-400">
        Trang điểm danh công khai — không cần đăng nhập. Một lượt điểm danh mỗi lần gửi.
      </p>
    </div>
  );
}
