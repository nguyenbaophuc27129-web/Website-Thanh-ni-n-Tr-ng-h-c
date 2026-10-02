"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X, Rocket } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { Card, CardBody } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Dữ liệu seed có id < 900000 — hoạt động tạo mới trong demo có id >= 900001 */
const isNew = (id: number) => id >= 900000;
/** Mốc tách seed (2026-09-25) — xác nhận hoạt động sau mốc này coi là do người dùng thực hiện */
const SEED_CUTOFF = "2026-09-25T00:00:00Z";

interface ChecklistItem {
  key: string;
  label: string;
  href: string;
  done: boolean;
}

export function SetupChecklist() {
  const { session } = useAuth();
  const store = useStore();
  const [dismissed, setDismissed] = useState(false);

  const storageKey = session ? `tnth_onboarding_dismissed_${session.accountId}` : null;

  useEffect(() => {
    if (!storageKey) return;
    try {
      setDismissed(window.localStorage.getItem(storageKey) === "1");
    } catch {
      // ignore storage errors
    }
  }, [storageKey]);

  const items: ChecklistItem[] = useMemo(() => {
    if (!session) return [];
    const scope = store.scopeIds(session);
    const role = session.role;

    if (role === "QUAN_TRI_TW") {
      return [
        { key: "task", label: "Giao nhiệm vụ cho đơn vị cấp dưới", href: "/quan-tri/nhiem-vu", done: store.taskAssignments.some((a) => isNew(a.id)) },
        { key: "doc", label: "Phát hành văn bản chỉ đạo", href: "/quan-tri/van-ban", done: store.documents.some((d) => isNew(d.id)) },
        { key: "post", label: "Xuất bản tin bài truyền thông", href: "/quan-tri/xuat-ban", done: store.publishedPosts.some((p) => isNew(p.id)) },
      ];
    }
    if (role === "QUAN_TRI_TINH" || role === "QUAN_TRI_CAP3") {
      return [
        { key: "acc", label: "Tạo tài khoản cho đơn vị con", href: "/quan-tri/he-thong/tai-khoan", done: store.accounts.some((a) => isNew(a.id) && scope.includes(a.orgUnitId)) },
        { key: "task", label: "Giao nhiệm vụ cho đơn vị cấp dưới", href: "/quan-tri/nhiem-vu", done: store.taskAssignments.some((a) => isNew(a.id)) },
        { key: "review", label: "Xác nhận hoạt động của cấp dưới", href: "/quan-tri/hoat-dong", done: store.activities.some((a) => scope.includes(a.orgUnitId) && a.orgUnitId !== session.orgUnitId && a.confirmStatus === "CONFIRMED" && !!a.updatedAt && a.updatedAt > SEED_CUTOFF) },
      ];
    }
    if (role === "DON_VI") {
      return [
        { key: "act", label: "Tạo hoạt động đầu tiên", href: "/quan-tri/hoat-dong", done: store.activities.some((a) => isNew(a.id)) },
        { key: "result", label: "Cập nhật kết quả nhiệm vụ", href: "/quan-tri/nhiem-vu", done: store.taskResults.some((r) => isNew(r.id)) },
        { key: "report", label: "Lập báo cáo định kỳ", href: "/quan-tri/bao-cao", done: store.reports.some((r) => isNew(r.id)) },
      ];
    }
    // BIEN_TAP_VIEN
    return [
      { key: "post", label: "Xuất bản tin bài", href: "/quan-tri/xuat-ban", done: store.publishedPosts.some((p) => isNew(p.id) && p.status === "PUBLISHED") },
      { key: "res", label: "Đăng tài nguyên dùng chung", href: "/quan-tri/tai-nguyen", done: store.resources.some((r) => isNew(r.id)) },
    ];
  }, [session, store]);

  const doneCount = items.filter((i) => i.done).length;
  const allDone = items.length > 0 && doneCount === items.length;

  if (!session || items.length === 0 || allDone || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    if (storageKey) {
      try {
        window.localStorage.setItem(storageKey, "1");
      } catch {
        // ignore storage errors
      }
    }
  };

  return (
    <Card className="border-doan-100">
      <CardBody className="p-0">
        <div className="flex items-center gap-2.5 px-5 pt-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-doan-50 text-doan-600">
            <Rocket className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-stone-900">Bắt đầu với Cổng TNTH</p>
            <p className="text-[11px] text-stone-400">
              Hoàn thành {doneCount}/{items.length} việc để làm quen phân hệ của bạn.
            </p>
          </div>
          <button onClick={dismiss} className="rounded-md p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600" aria-label="Ẩn gợi ý">
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="grid gap-x-6 gap-y-1 px-5 pb-4 pt-3 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.key}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors hover:bg-stone-50",
                  item.done ? "text-stone-400 line-through" : "font-medium text-stone-700"
                )}
              >
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-stone-300" />
                )}
                <span className="flex-1">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
