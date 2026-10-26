// Phân quyền tài khoản (/api/accounts/[id]/permissions): chặn leo thang quyền — chạy trên web thử (BASE), DB tnth_test.
// Tài khoản thử: 920 t.tw (*), 921 t.tinh (/1/131/), 922 t.tinhkhac (/1/100/), 923 t.cap3, 924 t.donvi (trong cây 131), 927 t.dv1.
import { request } from "playwright";
import { BASE, PW, check, summary } from "./lib.mjs";

const as = async (u) => {
  const ctx = await request.newContext({ baseURL: BASE });
  if (u) { const r = await ctx.post("/api/auth/login", { data: { username: u, password: PW } }); if (!r.ok()) throw new Error("login " + u); }
  return ctx;
};
const put = (ctx, id, perms) => ctx.put(`/api/accounts/${id}/permissions`, { data: { perms } });
const get = async (ctx, id) => { const r = await ctx.get(`/api/accounts/${id}/permissions`); return { status: r.status(), perms: (await r.json().catch(() => ({}))).perms }; };
const expect = async (name, res, status) => {
  const body = await res.text();
  check(name, res.status() === status, res.status() === status ? "" : `HTTP ${res.status()} ${body.slice(0, 160)}`);
};
const DON_VI_DEFAULT = ["activity.create", "activity.view", "task.update", "report.create", "document.view", "resource.view"];

const guest = await as(null), tw = await as("t.tw"), tinh = await as("t.tinh"), cap3 = await as("t.cap3");
const donvi = await as("t.donvi"), btv = await as("t.btv");

// ---------- Lỗ hổng cũ: tỉnh tự gán toàn quyền ----------
await expect("tỉnh tự gán * cho mình → 403", await put(tinh, 921, ["*"]), 403);
await expect("tỉnh tự gán quyền thường cho mình → 403", await put(tinh, 921, ["resource.manage"]), 403);
await expect("tỉnh gán * cho đơn vị trong cây → 403", await put(tinh, 924, ["*"]), 403);
await expect("tỉnh gán quyền mình không có (forum.manage) → 403", await put(tinh, 924, [...DON_VI_DEFAULT, "forum.manage"]), 403);
await expect("tỉnh gán cho tỉnh khác → 403", await put(tinh, 922, ["resource.view"]), 403);
await expect("tỉnh gán cho tài khoản TW → 403", await put(tinh, 920, ["resource.view"]), 403);
check("t.tinh vẫn không có quyền riêng", (await get(tw, 921)).perms?.length === 0);

// ---------- Tỉnh vẫn phân quyền được trong phạm vi ----------
await expect("tỉnh thêm quyền mình có cho đơn vị trong cây → 200", await put(tinh, 924, [...DON_VI_DEFAULT, "resource.manage"]), 200);
check("đơn vị nhận đúng quyền", (await get(tinh, 924)).perms?.includes("resource.manage"));
await expect("tỉnh khôi phục mặc định (rỗng) → 200", await put(tinh, 924, []), 200);
check("đơn vị về mặc định", (await get(tinh, 924)).perms?.length === 0);
check("tỉnh xem quyền của mình → 200", (await get(tinh, 921)).status === 200);
check("tỉnh xem quyền tỉnh khác → 403", (await get(tinh, 922)).status === 403);

// ---------- Không được bớt quyền mình không có do cấp trên gán ----------
await expect("TW gán forum.manage cho đơn vị → 200", await put(tw, 924, [...DON_VI_DEFAULT, "forum.manage"]), 200);
await expect("tỉnh bớt forum.manage (mình không có) → 403", await put(tinh, 924, DON_VI_DEFAULT), 403);
await expect("tỉnh sửa quyền khác, giữ forum.manage → 200", await put(tinh, 924, [...DON_VI_DEFAULT, "forum.manage", "resource.manage"]), 200);
await expect("TW khôi phục mặc định → 200", await put(tw, 924, []), 200);

// ---------- Vai trò khác ----------
await expect("cấp 3 (không có system.account.manage) → 403", await put(cap3, 924, DON_VI_DEFAULT), 403);
await expect("đơn vị phân quyền đoàn viên → 403", await put(donvi, 927, ["forum.interact"]), 403);
await expect("BTV phân quyền đoàn viên → 403", await put(btv, 927, ["forum.interact"]), 403);
await expect("khách → 401", await put(guest, 927, ["*"]), 401);
check("đơn vị xem quyền người khác → 403", (await get(donvi, 927)).status === 403);

// ---------- TW toàn quyền ----------
await expect("TW gán * cho tỉnh → 200", await put(tw, 921, ["*"]), 200);
await expect("TW thu hồi → 200", await put(tw, 921, []), 200);
await expect("mã trùng lặp không lỗi 500", await put(tw, 924, ["resource.view", "resource.view"]), 200);
check("mã trùng được gộp", JSON.stringify((await get(tw, 924)).perms) === '["resource.view"]');
await expect("TW khôi phục mặc định → 200", await put(tw, 924, []), 200);
await expect("mã không hợp lệ → 400", await put(tw, 924, ["hack.all"]), 400);

summary();
