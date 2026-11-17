import { query } from "@/lib/db";
import { donViTuToChuc, type DonViBanHanh, type ToChucDoan } from "@/data/the-thuc-van-ban";

/* Hồ sơ thể thức (29-HD) của một đơn vị — suy từ cây org_units: tên cơ quan 1-2 dòng,
   ký hiệu, địa danh, đề ký, nơi nhận. Dùng cho Trợ lý AI và xuất Word bản nháp. */

type OrgRow = {
  id: string;
  name: string;
  short_name: string | null;
  org_level: number;
  org_block: string | null;
  path: string;
  depth: number;
};

const toChuc = (r: OrgRow): ToChucDoan => ({
  id: r.id,
  name: r.name,
  shortName: r.short_name,
  orgLevel: Number(r.org_level),
  orgBlock: r.org_block,
});

export async function hoSoTheThucDonVi(orgUnitId: number): Promise<{ donVi: DonViBanHanh; canhBao: string[] } | null> {
  const self = (
    await query<OrgRow>(
      "SELECT id, name, short_name, org_level, org_block, path, depth FROM org_units WHERE id = $1 AND deleted_at IS NULL LIMIT 1",
      [orgUnitId],
    )
  )[0];
  if (!self) return null;
  const ids = self.path.split("/").filter(Boolean).map(Number).filter((x) => x && x !== Number(self.id));
  const capTren = ids.length
    ? (
        await query<OrgRow>(
          "SELECT id, name, short_name, org_level, org_block, path, depth FROM org_units WHERE id = ANY($1::bigint[]) AND deleted_at IS NULL",
          [ids],
        )
      )
        .sort((a, b) => Number(b.depth) - Number(a.depth))
        .map(toChuc)
    : [];
  return donViTuToChuc(toChuc(self), capTren);
}

/** Khối văn bản đưa vào prompt AI — AI dùng nguyên văn, không tự đặt tên cơ quan/địa danh */
export function hoSoDonViChoPrompt(donVi: DonViBanHanh): string {
  const nn = donVi.noiNhanTheoLoai?.BAO_CAO ?? [];
  return [
    "[THÔNG TIN ĐƠN VỊ BAN HÀNH — DO HỆ THỐNG CUNG CẤP, DÙNG NGUYÊN VĂN, KHÔNG TỰ ĐẶT]",
    donVi.coQuanCapTren
      ? `- Dòng 1 tên cơ quan (tổ chức Đoàn cấp trên, đứng, không đậm): ${donVi.coQuanCapTren}`
      : "- Tên cơ quan chỉ ghi 1 dòng (không ghi tổ chức cấp trên).",
    `- Dòng tên cơ quan ban hành (đứng, đậm): ${donVi.coQuanBanHanh}`,
    `- Ký hiệu cơ quan trong số - ký hiệu: ${donVi.kyHieuCoQuan} (VD kế hoạch chưa có số: "Số:     -KH/${donVi.kyHieuCoQuan}")`,
    `- Địa danh ghi ngày tháng: ${donVi.diaDanh}`,
    `- Chủ thể trong lời văn: ${donVi.chuTheTrongVanBan}`,
    `- Thể thức đề ký: ${donVi.deKyMacDinh || "(cấp trưởng ký trực tiếp)"}; chức vụ người ký: ${donVi.chucVuKyMacDinh}`,
    nn.length ? `- Nơi nhận khi báo cáo cấp trên: ${nn.join(" ")}` : "",
    `- Dòng lưu cuối Nơi nhận: - ${donVi.noiLuu}`,
  ]
    .filter(Boolean)
    .join("\n");
}
