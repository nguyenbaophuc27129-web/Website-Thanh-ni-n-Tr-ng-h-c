"use client";

import { Fragment, useMemo } from "react";
import { ShieldCheck, Check, Minus, UserCog, Crown, CircleCheck } from "lucide-react";
import { useStore } from "@/lib/store-context";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TableWrap, THead, Th, Tr, Td } from "@/components/ui/table";
import { ROLE_PERMISSIONS } from "@/types";
import { roleList, permissionsList } from "@/data/org-units";
import { chucDanhQuyenList } from "@/data/chuc-danh-quyen";

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
                <Th>Quyền chức năng</Th>
                {roleList.map((r) => (
                  <Th key={r.id} className="text-center">
                    <span className="block whitespace-normal text-[11px] leading-tight">{r.name}</span>
                  </Th>
                ))}
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

      <Card>
        <CardHeader
          title="Phân quyền theo chức danh Ban Thường vụ Trung ương Đoàn"
          subtitle={`Theo file "quyền của từng người trong các chức vụ" — áp dụng NGAY khi đăng nhập: ${chucDanhQuyenList.filter((c) => c.toanQuyen).length} chức danh toàn quyền, ${chucDanhQuyenList.filter((c) => !c.toanQuyen).length} chức danh chỉ thấy đúng phân hệ được giao`}
        />
        <CardBody className="p-0">
          <div className="divide-y divide-stone-100">
            {chucDanhQuyenList.map((cd) => (
              <div key={cd.id} className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span
                    className={
                      cd.toanQuyen
                        ? "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600"
                        : "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500"
                    }
                  >
                    {cd.toanQuyen ? <Crown className="h-4 w-4" strokeWidth={1.75} /> : <UserCog className="h-4 w-4" strokeWidth={1.75} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-stone-800">{cd.ten}</p>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-stone-400">{cd.moTa}</p>
                  </div>
                </div>
                <div className="shrink-0 sm:max-w-md">
                  {cd.toanQuyen ? (
                    <Badge tone="green">
                      <span className="inline-flex items-center gap-1">
                        <CircleCheck className="h-3 w-3" /> Toàn quyền
                      </span>
                    </Badge>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {cd.quyen.map((q) => (
                        <span
                          key={q.code}
                          title={q.code}
                          className="inline-flex items-center rounded-full bg-doan-50 px-2.5 py-1 text-[11px] font-medium text-doan-700 ring-1 ring-inset ring-doan-200"
                        >
                          {q.ten}
                        </span>
                      ))}
                      {cd.demoUser ? (
                        <code className="rounded bg-stone-100 px-1.5 py-0.5 text-[10px] text-stone-500">
                          Thử: {cd.demoUser} / demo123
                        </code>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-800">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        Quyết định quyền: chức danh khớp bảng trên → chỉ có đúng quyền liệt kê (menu và đường dẫn đều bị chặn); không khớp → quyền theo vai trò đơn vị trong ma trận bên trên.
        Khi tích hợp backend, 2 ma trận này ánh xạ bảng role_permissions + account_permission và được kiểm tra ở tầng API.
      </div>
    </div>
  );
}
