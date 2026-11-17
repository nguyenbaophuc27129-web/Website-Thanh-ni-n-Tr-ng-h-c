import { NextResponse } from "next/server";
import { dbEnabled } from "@/lib/db";
import { sessionOfRequest } from "@/lib/server/require-session";
import { hoSoTheThucDonVi } from "@/lib/server/ho-so-don-vi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/org-units/ho-so-the-thuc — hồ sơ thể thức 29-HD của đơn vị đang đăng nhập (cán bộ) */
export async function GET(request: Request) {
  const session = await sessionOfRequest(request);
  if (!session || session.role === "DOAN_VIEN") {
    return NextResponse.json({ ok: false, error: "Chức năng chỉ dành cho cán bộ." }, { status: 403 });
  }
  if (!dbEnabled()) return NextResponse.json({ ok: false, error: "Chưa kết nối cơ sở dữ liệu." }, { status: 503 });
  try {
    const hs = await hoSoTheThucDonVi(session.orgUnitId);
    if (!hs) return NextResponse.json({ ok: false, error: "Không tìm thấy đơn vị." }, { status: 404 });
    return NextResponse.json({ ok: true, ...hs });
  } catch (err) {
    console.warn("[TNTH][ho-so-the-thuc] Lỗi:", err);
    return NextResponse.json({ ok: false, error: "Không đọc được thông tin đơn vị." }, { status: 503 });
  }
}
