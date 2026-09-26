"use client";

import { Fragment, useMemo } from "react";
import { ShieldCheck, Check, Minus } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableWrap, THead, Th, Tr, Td } from "@/components/ui/table";
import { ROLE_PERMISSIONS } from "@/types";
import { roleList, permissionsList } from "@/data/org-units";

export default function PhanQuyenPage() {
  const store = useStore();

  const modules = useMemo(() => {
    const map = new Map<string, typeof permissionsList>();
    for (const p of permissionsList) {
      if (!map.has(p.module)) map.set(p.module, []);
      map.get(p.module)!.push(p);
    }
    return Array.from(map.entries());
  }, []);

  const can = (role: string, perm: string) => {
    const perms = ROLE_PERMISSIONS[role] ?? [];
    return perms.includes("*") || perms.includes(perm);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif-display text-xl font-bold text-stone-900">Phân quyền theo vai trò</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          Ma trận quyền chức năng × vai trò. Quyền thực tế còn bị giới hạn bởi phạm vi đơn vị (scope) của tài khoản.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {roleList.map((r) => (
          <Card key={r.id}>
            <CardBody className="p-4">
              <p className="text-sm font-bold text-stone-800">{r.name}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-stone-400">{r.description}</p>
              <p className="mt-2 text-[11px] font-semibold text-doan-600">
                {store.accounts.filter((a) => a.role === r.code).length} tài khoản
              </p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Ma trận phân quyền"
          subtitle="QUAN_TRI_TW có toàn quyền (*) · DOAN_VI chỉ thao tác trên đơn vị của mình"
        />
        <CardBody className="p-0">
          <TableWrap>
            <THead>
              <tr>
                <Th>Quyền chức năng</Th>
                {roleList.map((r) => (
                  <Th key={r.id} className="text-center">
                    <span className="block whitespace-normal text-[11px] leading-tight">{r.name}</span>
                  </Th>
                ))}
              </tr>
            </THead>
            <tbody>
              {modules.map(([module, perms]) => (
                <Fragment key={module}>
                  <Tr className="bg-stone-50">
                    <Td colSpan={roleList.length + 1}>
                      <span className="text-xs font-bold uppercase tracking-wide text-stone-500">{module}</span>
                    </Td>
                  </Tr>
                  {perms.map((p) => (
                    <Tr key={p.id}>
                      <Td>
                        <span className="text-sm text-stone-700">{p.name}</span>
                        <code className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500">{p.code}</code>
                      </Td>
                      {roleList.map((r) => (
                        <Td key={r.id} className="text-center">
                          {can(r.code, p.code) ? (
                            <Check className="mx-auto h-4 w-4 text-emerald-600" />
                          ) : (
                            <Minus className="mx-auto h-4 w-4 text-stone-300" />
                          )}
                        </Td>
                      ))}
                    </Tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </TableWrap>
        </CardBody>
      </Card>

      <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-800">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        Phân quyền trong prototype là tĩnh (đọc từ cấu hình mock). Khi tích hợp backend, ma trận này ánh xạ bảng role_permissions và được kiểm tra ở tầng API.
      </div>
    </div>
  );
}
