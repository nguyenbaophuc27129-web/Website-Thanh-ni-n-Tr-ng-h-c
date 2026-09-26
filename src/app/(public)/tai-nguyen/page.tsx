"use client";

import { useMemo, useState } from "react";
import { Download, FolderOpen, FileArchive } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/lib/toast-context";
import { formatNumber, formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/public/empty-state";

export default function TaiNguyenPage() {
  const { resources, resourceTypes, orgName, downloadResource } = useStore();
  const { toast } = useToast();
  const [type, setType] = useState<string>("all");

  const list = useMemo(
    () =>
      resources
        .filter((r) => r.status === "PUBLISHED" && r.isPublic)
        .filter((r) => (type === "all" ? true : r.resourceTypeId === Number(type)))
        .sort((a, b) => b.downloadCount - a.downloadCount),
    [resources, type]
  );

  const handleDownload = (id: number, title: string) => {
    downloadResource(id);
    toast(`Đang tải xuống "${title}" — tệp giả lập cho bản demo.`);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <FolderOpen className="h-5.5 w-5.5" />
        </div>
        <div>
          <h1 className="font-serif-display text-2xl font-bold text-stone-900">Kho tài nguyên</h1>
          <p className="text-sm text-stone-500">Tài liệu hướng dẫn, biểu mẫu nghiệp vụ và sản phẩm truyền thông.</p>
        </div>
      </div>

      <div className="mt-6">
        <Tabs
          value={type}
          onChange={(v) => setType(v as string)}
          tabs={[
            { value: "all", label: "Tất cả", count: resources.filter((r) => r.status === "PUBLISHED" && r.isPublic).length },
            ...resourceTypes.map((t) => ({
              value: String(t.id),
              label: t.name,
              count: resources.filter((r) => r.status === "PUBLISHED" && r.isPublic && r.resourceTypeId === t.id).length,
            })),
          ]}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {list.map((r) => (
          <Card key={r.id}>
            <CardHeader
              title={r.title}
              subtitle={`${resourceTypes.find((t) => t.id === r.resourceTypeId)?.name} · ${orgName(r.publishedByOrgUnitId)} · ${formatDate(r.publishedAt)}`}
            />
            <CardBody>
              <p className="text-xs leading-relaxed text-stone-600">{r.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] text-stone-400">
                  <FileArchive className="h-3.5 w-3.5" />
                  <span>{r.fileName} · {(r.fileSizeKb / 1024).toFixed(1)} MB</span>
                  <Badge tone="gray">{formatNumber(r.downloadCount)} lượt tải</Badge>
                </div>
                <button
                  onClick={() => handleDownload(r.id, r.title)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-doan-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-doan-700"
                >
                  <Download className="h-3.5 w-3.5" /> Tải xuống
                </button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
      {list.length === 0 ? (
        <div className="mt-6"><EmptyState message="Chưa có tài nguyên công khai ở danh mục này." icon={FolderOpen} /></div>
      ) : null}
    </div>
  );
}
