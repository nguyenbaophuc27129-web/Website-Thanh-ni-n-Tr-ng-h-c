"use client";

import { useState } from "react";
import { Database, Tag, FileStack, FolderTree, MessageSquareDashed } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { TableWrap, THead, Th, Tr, Td, EmptyRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function DanhMucPage() {
  const store = useStore();
  const [tab, setTab] = useState("content");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif-display text-xl font-bold text-stone-900">Danh mục dùng chung</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Các bảng danh mục tham chiếu: chủ đề tin bài, loại văn bản, loại tài nguyên, chủ đề phản ánh.
        </p>
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "content", label: "Chủ đề tin bài", count: store.contentCategories.length },
          { value: "document", label: "Loại văn bản", count: store.documentCategories.length },
          { value: "resource", label: "Loại tài nguyên", count: store.resourceTypes.length },
          { value: "feedback", label: "Chủ đề phản ánh", count: store.feedbackTopics.length },
        ]}
      />

      <Card>
        <CardHeader
          title={
            tab === "content" ? "content_categories" : tab === "document" ? "document_categories" : tab === "resource" ? "resource_types" : "feedback_topics"
          }
          subtitle="Prototype: chỉ xem, không chỉnh sửa. Khi tích hợp, quản trị TW được thêm/sửa danh mục."
          action={<Badge tone="gray">Chỉ xem</Badge>}
        />
        <CardBody className="p-0">
          <TableWrap>
            <THead>
              <tr>
                <Th className="w-16">ID</Th>
                <Th>Mã</Th>
                <Th>Tên danh mục</Th>
                <Th className="w-40">Số bản ghi sử dụng</Th>
              </tr>
            </THead>
            <tbody>
              {tab === "content"
                ? store.contentCategories.map((c) => (
                    <Tr key={c.id}>
                      <Td className="text-xs text-stone-400">{c.id}</Td>
                      <Td><code className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px]">{c.code}</code></Td>
                      <Td className="text-sm font-medium text-stone-800">{c.name}</Td>
                      <Td className="text-sm text-stone-600">
                        {store.activities.filter((a) => a.categoryIds.includes(c.id)).length} hoạt động
                      </Td>
                    </Tr>
                  ))
                : null}
              {tab === "document"
                ? store.documentCategories.map((c) => (
                    <Tr key={c.id}>
                      <Td className="text-xs text-stone-400">{c.id}</Td>
                      <Td><code className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px]">{c.code}</code></Td>
                      <Td className="text-sm font-medium text-stone-800">{c.name}</Td>
                      <Td className="text-sm text-stone-600">
                        {store.documents.filter((d) => d.documentCategoryId === c.id).length} văn bản
                      </Td>
                    </Tr>
                  ))
                : null}
              {tab === "resource"
                ? store.resourceTypes.map((t) => (
                    <Tr key={t.id}>
                      <Td className="text-xs text-stone-400">{t.id}</Td>
                      <Td><code className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px]">{t.code}</code></Td>
                      <Td className="text-sm font-medium text-stone-800">{t.name}</Td>
                      <Td className="text-sm text-stone-600">
                        {store.resources.filter((r) => r.resourceTypeId === t.id).length} tài nguyên
                      </Td>
                    </Tr>
                  ))
                : null}
              {tab === "feedback"
                ? store.feedbackTopics.map((t) => (
                    <Tr key={t.id}>
                      <Td className="text-xs text-stone-400">{t.id}</Td>
                      <Td><code className="rounded bg-stone-100 px-1.5 py-0.5 text-[11px]">{t.code}</code></Td>
                      <Td className="text-sm font-medium text-stone-800">{t.name}</Td>
                      <Td className="text-sm text-stone-600">
                        {store.feedbacks.filter((f) => f.feedbackTopicId === t.id).length} phản ánh
                      </Td>
                    </Tr>
                  ))
                : null}
              <EmptyRow colSpan={4} />
            </tbody>
          </TableWrap>
        </CardBody>
      </Card>

      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { icon: Tag, label: "Chủ đề tin bài", value: store.contentCategories.length },
          { icon: FileStack, label: "Loại văn bản", value: store.documentCategories.length },
          { icon: FolderTree, label: "Loại tài nguyên", value: store.resourceTypes.length },
          { icon: MessageSquareDashed, label: "Chủ đề phản ánh", value: store.feedbackTopics.length },
        ].map((s) => (
          <Card key={s.label}>
            <CardBody className="flex items-center gap-3 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-doan-50 text-doan-600">
                <s.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[11px] text-stone-400">{s.label}</p>
                <p className="font-serif-display text-lg font-bold text-stone-800">{s.value}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <p className="flex items-center gap-1.5 text-[11px] text-stone-400">
        <Database className="h-3.5 w-3.5" />
        Danh mục khớp thiết kế CSDL: content_categories, document_categories, resource_types, feedback_topics.
      </p>
    </div>
  );
}
