"use client";

import { useMemo, useState } from "react";
import { Settings, Save } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const GROUP_LABEL: Record<string, string> = {
  general: "Cấu hình chung",
  feature: "Tính năng",
  ai: "Trí tuệ nhân tạo",
  notification: "Thông báo",
};

export default function CaiDatPage() {
  const store = useStore();
  const { toast } = useToast();
  const [draft, setDraft] = useState<Record<string, string>>({});

  const groups = useMemo(() => {
    const map = new Map<string, typeof store.settings>();
    for (const s of store.settings) {
      if (!map.has(s.groupName)) map.set(s.groupName, []);
      map.get(s.groupName)!.push(s);
    }
    return Array.from(map.entries());
  }, [store.settings]);

  const valueOf = (key: string, fallback: string) => draft[key] ?? fallback;

  const setAll = () => {
    let count = 0;
    for (const [key, value] of Object.entries(draft)) {
      store.updateSetting(key, value);
      count++;
    }
    setDraft({});
    toast(count > 0 ? `Đã lưu ${count} cấu hình.` : "Chưa có thay đổi nào để lưu.", count > 0 ? "success" : "warning");
  };

  const dirty = Object.keys(draft).length > 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif-display text-xl font-bold text-stone-900">Cài đặt hệ thống</h1>
          <p className="mt-0.5 text-sm text-stone-500">
            Cấu hình toàn cục (bảng system_settings) — chỉ quản trị Trung ương được chỉnh sửa.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty ? <Badge tone="yellow">{Object.keys(draft).length} thay đổi chưa lưu</Badge> : null}
          <button
            onClick={setAll}
            disabled={!dirty}
            className="inline-flex items-center gap-1.5 rounded-lg bg-doan-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-doan-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="h-4 w-4" /> Lưu cấu hình
          </button>
        </div>
      </div>

      {groups.map(([group, settings]) => (
        <Card key={group}>
          <CardHeader title={GROUP_LABEL[group] ?? group} subtitle={`Nhóm: ${group}`} action={<Settings className="h-4 w-4 text-stone-400" />} />
          <CardBody className="p-0">
            <div className="divide-y divide-stone-100">
              {settings.map((s) => (
                <div key={s.settingKey} className="flex flex-wrap items-end gap-4 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-800">{s.description}</p>
                    <code className="text-[11px] text-stone-400">{s.settingKey}</code>
                    <Badge tone="gray" className="ml-2">{s.valueType}</Badge>
                  </div>
                  <div className="w-full sm:w-72">
                    {s.valueType === "BOOLEAN" ? (
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-stone-600">
                        <input
                          type="checkbox"
                          checked={valueOf(s.settingKey, s.value) === "true"}
                          onChange={(e) => setDraft((d) => ({ ...d, [s.settingKey]: e.target.checked ? "true" : "false" }))}
                          className="accent-doan-600"
                        />
                        {valueOf(s.settingKey, s.value) === "true" ? "Đang bật" : "Đang tắt"}
                      </label>
                    ) : (
                      <Field label="Giá trị">
                        <Input
                          value={valueOf(s.settingKey, s.value)}
                          onChange={(e) => setDraft((d) => ({ ...d, [s.settingKey]: e.target.value }))}
                        />
                      </Field>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
