"use client";

import { useMemo, useState } from "react";
import {
  GraduationCap, ShieldAlert, Sparkles, UserPlus, Award, Trophy, Loader2, BookOpen, Dumbbell, HeartHandshake, MapPin,
} from "lucide-react";
import { useStore } from "@/lib/store-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select, Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { TableWrap, THead, Th, Tr, Td, EmptyRow } from "@/components/ui/table";
import { ruleEvaluateHs3t, HS3T_CATEGORY_NAMES } from "@/lib/hs3t-evaluate";
import { formatDateTime } from "@/lib/utils";
import type { Hs3tAchievement, Hs3tCategory, Hs3tProfile } from "@/types";

const LEVEL_LABEL: Record<"XA" | "TINH" | "TW", string> = {
  XA: "Cấp Xã/Phường",
  TINH: "Cấp Tỉnh/TP",
  TW: "Cấp Trung ương",
};
const CATEGORIES: Hs3tCategory[] = ["HOC_TAP", "REN_LUYEN", "PHONG_TRAO"];

interface AiResult {
  profileId: number;
  suggestedLevel: "XA" | "TINH" | "TW" | null;
  reasoning?: string;
  missing: string[];
  model?: string;
}

export default function Hs3tAdminPage() {
  const { session } = useAuth();
  const store = useStore();
  const { toast } = useToast();

  const [aiLoadingId, setAiLoadingId] = useState<number | null>(null);
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [addingFor, setAddingFor] = useState<number | null>(null);
  const [achDraft, setAchDraft] = useState<{ title: string; category: Hs3tCategory; achievedAt: string }>({
    title: "", category: "HOC_TAP", achievedAt: new Date().toISOString().slice(0, 10),
  });

  const isTW = session?.role === "QUAN_TRI_TW";
  const isSchool = session?.role === "DON_VI";

  if (!session || (session.role !== "QUAN_TRI_TW" && session.role !== "QUAN_TRI_TINH" && session.role !== "QUAN_TRI_CAP3" && session.role !== "DON_VI")) {
    return (
      <Card>
        <CardBody className="flex flex-col items-center py-16 text-center">
          <ShieldAlert className="h-10 w-10 text-stone-300" />
          <p className="mt-3 text-sm font-semibold text-stone-700">Trang này dành cho cán bộ Đoàn các cấp</p>
          <p className="mt-1 text-xs text-stone-400">Học sinh tự cập nhật hồ sơ tại trang Học sinh 3 tốt công khai.</p>
        </CardBody>
      </Card>
    );
  }

  /** Leo parentId tới đơn vị cấp Tỉnh/Thành (orgLevel 2) */
  const provinceOf = (orgUnitId: number) => {
    let cur = store.orgUnits.find((o) => o.id === orgUnitId);
    while (cur && cur.orgLevel !== 2 && cur.parentId != null) {
      const parentId: number = cur.parentId;
      const next = store.orgUnits.find((o) => o.id === parentId);
      if (!next) break;
      cur = next;
    }
    return cur && cur.orgLevel === 2 ? cur : null;
  };

  const scope = useMemo(() => new Set(store.scopeIds(session)), [store, session]);
  const profiles = useMemo(
    () =>
      store.hs3tProfiles
        .filter((p) => (isTW ? true : scope.has(p.schoolOrgUnitId)))
        .sort((a, b) => a.studentName.localeCompare(b.studentName, "vi")),
    [store, scope, isTW]
  );

  const achievementsOf = (profileId: number): Hs3tAchievement[] =>
    store.hs3tAchievements.filter((a) => a.profileId === profileId);

  // ===== Aggregate theo trường (Tỉnh/CAP3) =====
  const bySchool = useMemo(() => {
    const map = new Map<number, Hs3tProfile[]>();
    for (const p of profiles) {
      const list = map.get(p.schoolOrgUnitId) ?? [];
      list.push(p);
      map.set(p.schoolOrgUnitId, list);
    }
    return Array.from(map.entries()).sort((a, b) => store.orgName(a[0]).localeCompare(store.orgName(b[0]), "vi"));
  }, [profiles, store]);

  // ===== Aggregate theo tỉnh (TW) =====
  const byProvince = useMemo(() => {
    const map = new Map<number, { name: string; profiles: Hs3tProfile[]; schools: Set<number> }>();
    for (const p of profiles) {
      const prov = provinceOf(p.schoolOrgUnitId);
      if (!prov) continue;
      const entry = map.get(prov.id) ?? { name: prov.name, profiles: [], schools: new Set<number>() };
      entry.profiles.push(p);
      entry.schools.add(p.schoolOrgUnitId);
      map.set(prov.id, entry);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].profiles.length - a[1].profiles.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, store]);

  // ===== AI xét =====
  const runAi = async (profileId: number) => {
    const profile = store.hs3tProfiles.find((p) => p.id === profileId);
    if (!profile) return;
    setAiLoadingId(profileId);
    const achs = achievementsOf(profileId);
    try {
      const res = await fetch("/api/ai/xet-hs3t", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, achievements: achs }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { suggestedLevel?: "XA" | "TINH" | "TW" | null; reasoning?: string; missing?: string[]; model?: string };
      setAiResult({
        profileId,
        suggestedLevel: data.suggestedLevel ?? null,
        reasoning: data.reasoning,
        missing: data.missing ?? [],
        model: data.model,
      });
    } catch {
      const fallback = ruleEvaluateHs3t(profile, achs);
      setAiResult({
        profileId,
        suggestedLevel: fallback.suggestedLevel,
        reasoning: "Máy chủ AI không phản hồi — dùng bộ quy tắc ngưỡng cục bộ.",
        missing: fallback.missing,
        model: "tnth-hs3t-rule (cục bộ)",
      });
    } finally {
      setAiLoadingId(null);
    }
  };

  const chotCap = (level: "XA" | "TINH" | "TW") => {
    if (!aiResult) return;
    store.awardHs3tLevel(session, aiResult.profileId, level);
    const profile = store.hs3tProfiles.find((p) => p.id === aiResult.profileId);
    toast(`Đã chốt danh hiệu ${LEVEL_LABEL[level]} cho ${profile?.studentName ?? "học sinh"} — học sinh nhận thông báo.`, "success");
    setAiResult(null);
  };

  const submitSupplement = () => {
    if (!addingFor) return;
    if (achDraft.title.trim().length < 5) {
      toast("Tên thành tích tối thiểu 5 ký tự.", "warning");
      return;
    }
    store.addHs3tAchievement(session, addingFor, {
      title: achDraft.title.trim(),
      category: achDraft.category,
      achievedAt: achDraft.achievedAt,
      asSchool: true,
    });
    const profile = store.hs3tProfiles.find((p) => p.id === addingFor);
    toast(`Đã bổ sung thành tích cho ${profile?.studentName ?? "học sinh"} — ghi nhận nguồn "trường xác nhận".`, "success");
    setAddingFor(null);
    setAchDraft({ title: "", category: "HOC_TAP", achievedAt: new Date().toISOString().slice(0, 10) });
  };

  const countBadge = (n: number, ok: number) => (
    <span className={`inline-flex items-center gap-1 text-xs font-bold ${n >= ok ? "text-emerald-600" : "text-stone-400"}`}>{n}</span>
  );

  const aiTarget = aiResult ? store.hs3tProfiles.find((p) => p.id === aiResult.profileId) : undefined;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-serif-display text-xl font-bold text-stone-900">Hồ sơ Học sinh 3 tốt</h1>
        <p className="mt-0.5 text-sm text-stone-500">
          {isTW
            ? `Toàn quốc — ${profiles.length} hồ sơ học sinh.`
            : isSchool
              ? `Hồ sơ 3 tốt của ${store.orgName(session.orgUnitId)} — xét duyệt và bổ sung minh chứng cho học sinh.`
              : `${profiles.length} hồ sơ thuộc phạm vi quản lý — xem tổng hợp theo ${isTW ? "tỉnh" : "trường"}.`}
        </p>
      </div>

      <p className="rounded-lg bg-sky-50 px-4 py-2.5 text-xs text-sky-700">
        Ngưỡng xét: mỗi nhóm có ≥1 minh chứng → Xã/Phường · ≥2 nhóm → Tỉnh/TP · đủ cả 3 nhóm và tổng ≥10 → Trung ương. Bấm “AI xét” để có nhận định chi tiết trước khi chốt.
      </p>

      {/* ===== Cấp trường: bảng từng học sinh ===== */}
      {isSchool || (!isTW && profiles.length <= 12) ? (
        <div className="space-y-3">
          {profiles.length === 0 ? (
            <Card>
              <CardBody className="py-12 text-center text-sm text-stone-400">Chưa có hồ sơ 3 tốt nào trong phạm vi.</CardBody>
            </Card>
          ) : null}
          {profiles.map((p) => {
            const achs = achievementsOf(p.id);
            const ev = ruleEvaluateHs3t(p, achs);
            return (
              <Card key={p.id}>
                <CardBody className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="inline-flex items-center gap-1.5 text-sm font-bold text-stone-900">
                        <GraduationCap className="h-4 w-4 text-emerald-600" /> {p.studentName}
                        {p.className ? <span className="font-normal text-stone-400"> · {p.className}</span> : null}
                      </p>
                      <p className="mt-0.5 font-mono text-[11px] text-stone-400">{p.code} · {store.orgName(p.schoolOrgUnitId)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setAddingFor(p.id); setAchDraft({ title: "", category: "HOC_TAP", achievedAt: new Date().toISOString().slice(0, 10) }); }}>
                        <UserPlus className="h-3.5 w-3.5" /> Bổ sung hộ
                      </Button>
                      <Button size="sm" onClick={() => runAi(p.id)} disabled={aiLoadingId === p.id}>
                        {aiLoadingId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        {aiLoadingId === p.id ? "Đang xét…" : "AI xét"}
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1 text-sky-700">
                      <BookOpen className="h-3.5 w-3.5" /> {HS3T_CATEGORY_NAMES.HOC_TAP}: <b>{ev.counts.HOC_TAP}</b>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1 text-violet-700">
                      <Dumbbell className="h-3.5 w-3.5" /> {HS3T_CATEGORY_NAMES.REN_LUYEN}: <b>{ev.counts.REN_LUYEN}</b>
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700">
                      <HeartHandshake className="h-3.5 w-3.5" /> {HS3T_CATEGORY_NAMES.PHONG_TRAO}: <b>{ev.counts.PHONG_TRAO}</b>
                    </span>
                    <span className="text-stone-400">— tổng {achs.length} minh chứng</span>
                  </div>

                  {p.awardedLevel ? (
                    <p className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                      <Trophy className="h-3.5 w-3.5" /> Đã chốt: {LEVEL_LABEL[p.awardedLevel]}
                      {p.awardedAt ? <span className="font-normal text-emerald-600"> · {formatDateTime(p.awardedAt)}</span> : null}
                    </p>
                  ) : ev.suggestedLevel ? (
                    <p className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                      <Award className="h-3.5 w-3.5" /> Đạt ngưỡng: {LEVEL_LABEL[ev.suggestedLevel]} — chờ chốt danh hiệu
                    </p>
                  ) : (
                    <p className="text-xs text-stone-400">Chưa đạt ngưỡng danh hiệu.</p>
                  )}

                  {ev.missing.length > 0 ? (
                    <ul className="space-y-0.5">
                      {ev.missing.map((m) => (
                        <li key={m} className="text-[11px] text-stone-500">• {m}</li>
                      ))}
                    </ul>
                  ) : null}
                </CardBody>
              </Card>
            );
          })}
        </div>
      ) : isTW ? (
        /* ===== TW: tổng hợp theo tỉnh ===== */
        <Card>
          <CardBody className="p-0">
            <TableWrap>
              <THead>
                <Th>Tỉnh / Thành phố</Th>
                <Th>Trường</Th>
                <Th>Hồ sơ</Th>
                <Th>Đủ 3 nhóm</Th>
                <Th>Đủ 2 nhóm</Th>
                <Th>Đã chốt danh hiệu</Th>
              </THead>
              <tbody>
                {byProvince.length === 0 ? <EmptyRow colSpan={6} /> : null}
                {byProvince.map(([provId, agg]) => {
                  const full3 = agg.profiles.filter((p) => CATEGORIES.every((c) => achievementsOf(p.id).some((a) => a.category === c))).length;
                  const full2 = agg.profiles.filter((p) => !CATEGORIES.every((c) => achievementsOf(p.id).some((a) => a.category === c)) && CATEGORIES.filter((c) => achievementsOf(p.id).some((a) => a.category === c)).length === 2).length;
                  const awarded = agg.profiles.filter((p) => p.awardedLevel).length;
                  return (
                    <Tr key={provId}>
                      <Td><span className="inline-flex items-center gap-1.5 font-semibold text-stone-800"><MapPin className="h-3.5 w-3.5 text-doan-600" />{agg.name}</span></Td>
                      <Td className="text-xs">{agg.schools.size}</Td>
                      <Td className="font-bold">{agg.profiles.length}</Td>
                      <Td>{countBadge(full3, 3)}</Td>
                      <Td>{countBadge(full2, 2)}</Td>
                      <Td><Badge tone={awarded > 0 ? "green" : "gray"}>{awarded} hồ sơ</Badge></Td>
                    </Tr>
                  );
                })}
              </tbody>
            </TableWrap>
          </CardBody>
        </Card>
      ) : (
        /* ===== Tỉnh/CAP3: tổng hợp theo trường ===== */
        <Card>
          <CardBody className="p-0">
            <TableWrap>
              <THead>
                <Th>Đơn vị trường</Th>
                <Th>Hồ sơ</Th>
                <Th>Đủ 3 nhóm</Th>
                <Th>Đủ 2 nhóm</Th>
                <Th>Đủ 1 nhóm</Th>
                <Th>Đã chốt danh hiệu</Th>
              </THead>
              <tbody>
                {bySchool.length === 0 ? <EmptyRow colSpan={6} /> : null}
                {bySchool.map(([orgId, list]) => {
                  const full3 = list.filter((p) => CATEGORIES.every((c) => achievementsOf(p.id).some((a) => a.category === c))).length;
                  const full2 = list.filter((p) => !CATEGORIES.every((c) => achievementsOf(p.id).some((a) => a.category === c)) && CATEGORIES.filter((c) => achievementsOf(p.id).some((a) => a.category === c)).length === 2).length;
                  const full1 = list.filter((p) => CATEGORIES.filter((c) => achievementsOf(p.id).some((a) => a.category === c)).length === 1).length;
                  const awarded = list.filter((p) => p.awardedLevel).length;
                  return (
                    <Tr key={orgId}>
                      <Td><span className="font-semibold text-stone-800">{store.orgName(orgId)}</span></Td>
                      <Td className="font-bold">{list.length}</Td>
                      <Td>{countBadge(full3, 3)}</Td>
                      <Td>{countBadge(full2, 2)}</Td>
                      <Td>{countBadge(full1, 1)}</Td>
                      <Td><Badge tone={awarded > 0 ? "green" : "gray"}>{awarded} hồ sơ</Badge></Td>
                    </Tr>
                  );
                })}
              </tbody>
            </TableWrap>
          </CardBody>
        </Card>
      )}

      {/* ===== Modal kết quả AI xét ===== */}
      <Modal
        open={aiResult !== null}
        onClose={() => setAiResult(null)}
        title={aiTarget ? `Kết quả xét: ${aiTarget.studentName}` : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAiResult(null)}>Đóng</Button>
            {(["XA", "TINH", "TW"] as const).map((lv) => (
              <Button
                key={lv}
                variant={aiResult?.suggestedLevel === lv ? "primary" : "outline"}
                onClick={() => chotCap(lv)}
              >
                <Trophy className="h-4 w-4" /> Chốt {LEVEL_LABEL[lv]}
              </Button>
            ))}
          </>
        }
      >
        {aiResult ? (
          <div className="space-y-3">
            <div className={`rounded-lg border p-3.5 ${aiResult.suggestedLevel ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
              <p className="text-sm font-bold text-stone-800">
                Đề xuất:{" "}
                {aiResult.suggestedLevel ? (
                  <span className="text-emerald-700">{LEVEL_LABEL[aiResult.suggestedLevel]}</span>
                ) : (
                  <span className="text-amber-700">Chưa đủ điều kiện</span>
                )}
              </p>
              {aiResult.reasoning ? <p className="mt-1 text-xs leading-relaxed text-stone-600">{aiResult.reasoning}</p> : null}
              {aiResult.model ? <p className="mt-1.5 text-[10px] text-stone-400">Nguồn đánh giá: {aiResult.model}</p> : null}
            </div>
            {aiResult.missing.length > 0 ? (
              <div>
                <p className="text-xs font-bold text-stone-600">Còn thiếu:</p>
                <ul className="mt-1 space-y-0.5">
                  {aiResult.missing.map((m) => (
                    <li key={m} className="text-xs text-stone-500">• {m}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <p className="text-[11px] text-stone-400">
              Bạn vẫn có thể chốt cấp khác đề xuất — quyền quyết định thuộc căn cứ minh chứng thực tế. Học sinh nhận thông báo ngay sau khi chốt.
            </p>
          </div>
        ) : null}
      </Modal>

      {/* ===== Modal bổ sung hộ thành tích ===== */}
      <Modal
        open={addingFor !== null}
        onClose={() => setAddingFor(null)}
        title={addingFor ? `Bổ sung thành tích — ${store.hs3tProfiles.find((p) => p.id === addingFor)?.studentName ?? ""}` : ""}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddingFor(null)}>Hủy</Button>
            <Button onClick={submitSupplement}>Thêm vào hồ sơ</Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <Field label="Tên thành tích" required hint='Ghi rõ giải thưởng/hoạt động — học sinh thấy ghi nguồn "trường xác nhận"'>
            <Input value={achDraft.title} onChange={(e) => setAchDraft({ ...achDraft, title: e.target.value })} placeholder="VD: Đạt danh hiệu Lao động tiên phong cuối cấp" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nhóm 3 tốt">
              <Select value={achDraft.category} onChange={(e) => setAchDraft({ ...achDraft, category: e.target.value as Hs3tCategory })}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{HS3T_CATEGORY_NAMES[c]}</option>
                ))}
              </Select>
            </Field>
            <Field label="Ngày đạt">
              <Input type="date" value={achDraft.achievedAt} onChange={(e) => setAchDraft({ ...achDraft, achievedAt: e.target.value })} />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
