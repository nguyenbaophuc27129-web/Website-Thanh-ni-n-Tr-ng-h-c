"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { useStore } from "@/lib/store-context";
import { useToast } from "@/lib/toast-context";

export default function TraCuuPage() {
  const { feedbacks } = useStore();
  const { toast } = useToast();
  const router = useRouter();
  const [code, setCode] = useState("");

  const lookup = (e: React.FormEvent) => {
    e.preventDefault();
    const found = feedbacks.find((f) => f.trackingCode.toLowerCase() === code.trim().toLowerCase());
    if (!found) {
      toast(`Không tìm thấy phản ánh với mã "${code.trim()}".`, "warning");
      return;
    }
    router.push(`/phan-anh/${found.trackingCode}`);
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <SearchCheck className="h-4.5 w-4.5 text-doan-600" /> Tra cứu phản ánh
            </span>
          }
          subtitle="Nhập mã tra cứu bạn nhận được khi gửi phản ánh."
        />
        <CardBody>
          <form onSubmit={lookup} className="space-y-4">
            <Field label="Mã tra cứu" required hint="Ví dụ: PA-2026-000101">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="PA-2026-XXXXX" />
            </Field>
            <Button type="submit" className="w-full">
              Tra cứu <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          <p className="mt-4 rounded-lg bg-stone-50 px-3 py-2 text-[11px] leading-relaxed text-stone-500">
            Demo: bạn có thể thử các mã sẵn có như PA-2026-000101, PA-2026-000102, PA-2026-000103…
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
