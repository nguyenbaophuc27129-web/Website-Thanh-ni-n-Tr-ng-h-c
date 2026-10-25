import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";
import { dbEnabled, query } from "@/lib/db";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";

export const runtime = "nodejs";

/**
 * GET /api/org-units/template — file mẫu import đơn vị (.xlsx) có dropdown chọn
 * (Đơn vị cấp trên / Loại trường) qua Data Validation, sheet DanhMuc
 * chứa danh sách hợp lệ được nạp NGAY LÚC TẢI (đơn vị cấp trên = cây hiện tại).
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionFromToken(token) : null;
  if (!dbEnabled()) return NextResponse.json({ ok: false, error: "DB_UNAVAILABLE" }, { status: 503 });
  if (!session) return NextResponse.json({ ok: false, error: "YÊU CẦU ĐĂNG NHẬP" }, { status: 401 });

  const units = await query<{ name: string; org_level: number }>(
    "SELECT name, org_level FROM org_units WHERE deleted_at IS NULL AND is_active ORDER BY path"
  );
  const schoolTypes = await query<{ name: string }>("SELECT name FROM school_types WHERE is_active ORDER BY display_order, id");

  const wb = new ExcelJS.Workbook();
  wb.creator = "Cổng Thanh niên Trường học";

  const ws = wb.addWorksheet("DonVi");
  ws.columns = [
    { header: "Tên tổ chức *", key: "name", width: 42 },
    { header: "Đơn vị cấp trên *", key: "parent", width: 42 },
    { header: "Tên viết tắt", key: "shortName", width: 26 },
    { header: "Đơn vị hành chính", key: "adminUnit", width: 26 },
    { header: "Loại trường (nếu trường học)", key: "schoolType", width: 24 },
    { header: "Địa chỉ", key: "address", width: 32 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCE7F5" } };

  const dm = wb.addWorksheet("DanhMuc");
  dm.getCell("A1").value = "Đơn vị cấp trên";
  units.forEach((u, i) => (dm.getCell(`A${i + 2}`).value = u.name));
  dm.getCell("B1").value = "Loại trường";
  schoolTypes.forEach((s, i) => (dm.getCell(`B${i + 2}`).value = s.name));
  dm.columns = [{ width: 46 }, { width: 26 }];
  dm.getRow(1).font = { bold: true };

  const hd = wb.addWorksheet("HuongDan");
  [
    "HƯỚNG DẪN NHẬP CÂY ĐƠN VỊ TỔ CHỨC TỪ FILE EXCEL",
    "1. Điền dữ liệu vào sheet 'DonVi' — mỗi dòng là 1 đơn vị mới (dòng đầu tiên là tiêu đề, không sửa).",
    "2. Cột có dấu * là bắt buộc: Tên tổ chức, Đơn vị cấp trên.",
    "3. Cấp tổ chức KHÔNG cần điền — hệ thống tự xếp cấp bằng cấp dưới trực tiếp của 'Đơn vị cấp trên'.",
    "4. Các cột Đơn vị cấp trên / Loại trường đã có danh sách thả xuống (sheet 'DanhMuc') — chọn thay vì gõ tay.",
    "5. 'Đơn vị cấp trên' phải là đơn vị ĐANG TỒN TẠI trên hệ thống; muốn tạo chuỗi cấp lồng nhau thì tạo theo thứ tự từ trên xuống.",
    "6. Ví dụ: Tên 'Đoàn Trường THPT Chuyên Lào Cai' · Cấp trên 'Đoàn TNCS Hồ Chí Minh Tỉnh Lào Cai'.",
  ].forEach((line, i) => {
    hd.getCell(`A${i + 1}`).value = line;
    if (i === 0) hd.getCell(`A${i + 1}`).font = { bold: true, size: 12 };
  });
  hd.getColumn("A").width = 110;

  /** Gán dropdown (Data Validation) cho từng ô trong vùng cột */
  const addListValidation = (
    column: string,
    fromRow: number,
    toRow: number,
    formula: string,
    errorTitle: string,
    error: string,
    allowBlank = false
  ) => {
    for (let r = fromRow; r <= toRow; r++) {
      ws.getCell(`${column}${r}`).dataValidation = {
        type: "list",
        allowBlank,
        formulae: [formula],
        showErrorMessage: true,
        errorTitle,
        error,
      };
    }
  };

  const MAX_IMPORT_ROWS = 200;
  addListValidation(
    "B",
    2,
    MAX_IMPORT_ROWS,
    `=DanhMuc!$A$2:$A$${units.length + 1}`,
    "Đơn vị cấp trên không hợp lệ",
    "Hãy chọn đơn vị cấp trên từ danh sách thả xuống (sheet DanhMuc)."
  );
  addListValidation(
    "E",
    2,
    MAX_IMPORT_ROWS,
    `=DanhMuc!$B$2:$B$${schoolTypes.length + 1}`,
    "Loại trường không hợp lệ",
    "Hãy chọn loại trường từ danh sách thả xuống hoặc để trống.",
    true
  );

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="mau-nhap-don-vi.xlsx"',
    },
  });
}
