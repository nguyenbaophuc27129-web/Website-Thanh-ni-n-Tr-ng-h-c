import ExcelJS from "exceljs";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sessionFromToken } from "@/lib/server/auth";

export const runtime = "nodejs";

/**
 * GET /api/quiz-questions/template — file mẫu import câu hỏi thi (.xlsx) có dropdown
 * (Loại câu hỏi / Độ khó) qua Data Validation, sheet DanhMuc chứa danh sách hợp lệ,
 * sheet HuongDan giải thích cách điền đáp án đúng theo từng loại câu hỏi.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await sessionFromToken(token) : null;
  if (!session) return NextResponse.json({ ok: false, error: "YÊU CẦU ĐĂNG NHẬP" }, { status: 401 });

  const wb = new ExcelJS.Workbook();
  wb.creator = "Cổng Thanh niên Trường học";

  const QUESTION_TYPES = ["Một đáp án", "Nhiều đáp án", "Đúng / Sai", "Điền khuyết", "Tự luận ngắn", "Tự luận dài", "Nộp tệp"];
  const DIFFICULTIES = ["Dễ", "Vừa", "Khó"];

  const ws = wb.addWorksheet("CauHoi");
  ws.columns = [
    { header: "Loại câu hỏi *", key: "type", width: 16 },
    { header: "Chuyên mục *", key: "topic", width: 26 },
    { header: "Độ khó *", key: "difficulty", width: 10 },
    { header: "Điểm *", key: "points", width: 8 },
    { header: "Câu hỏi *", key: "stem", width: 60 },
    { header: "Đáp án A", key: "a", width: 30 },
    { header: "Đáp án B", key: "b", width: 30 },
    { header: "Đáp án C", key: "c", width: 30 },
    { header: "Đáp án D", key: "d", width: 30 },
    { header: "Đáp án đúng *", key: "answer", width: 26 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCE7F5" } };

  // 2 dòng ví dụ
  ws.getRow(2).values = [
    "Loại câu hỏi *", "Chuyên mục *", "Độ khó *", "Điểm *", "Câu hỏi *",
    "Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D", "Đáp án đúng *",
  ];
  ws.getRow(3).values = [
    "Một đáp án", "An toàn giao thông", "Dễ", 1,
    "Đi xe đạp điện có phải đội mũ bảo hiểm không?",
    "Có", "Không", "", "", "A",
  ];
  ws.getRow(4).values = [
    "Đúng / Sai", "Đoàn kết", "Vừa", 1,
    "Nhiệm vụ của Đoàn gồm giáo dục, đào tạo, bồi dưỡng thanh niên.",
    "", "", "", "", "Đúng",
  ];
  ws.getRow(5).values = [
    "Tự luận ngắn", "Lịch sử Đoàn", "Khó", 5,
    "Trình bày mốc thành lập Đoàn TNCS Hồ Chí Minh.",
    "", "", "", "", "26/3/1931",
  ];
  [3, 4, 5].forEach((r) => {
    ws.getCell(`E${r}`).font = { italic: true, color: { argb: "FF8A8A8A" } };
  });

  const dm = wb.addWorksheet("DanhMuc");
  dm.getCell("A1").value = "Loại câu hỏi";
  QUESTION_TYPES.forEach((t, i) => (dm.getCell(`A${i + 2}`).value = t));
  dm.getCell("B1").value = "Độ khó";
  DIFFICULTIES.forEach((t, i) => (dm.getCell(`B${i + 2}`).value = t));
  dm.columns = [{ width: 20 }, { width: 12 }];
  dm.getRow(1).font = { bold: true };

  const hd = wb.addWorksheet("HuongDan");
  [
    "HƯỚNG DẪN NHẬP CÂU HỎI THI TỪ FILE EXCEL",
    "1. Điền dữ liệu vào sheet 'CauHoi' — mỗi dòng là 1 câu hỏi (bỏ qua các dòng ví dụ màu xám, hoặc xoá chúng đi).",
    "2. Cột có dấu * là bắt buộc: Loại câu hỏi, Chuyên mục, Độ khó, Điểm, Câu hỏi, Đáp án đúng.",
    "3. Loại câu hỏi / Độ khó có danh sách thả xuống (sheet 'DanhMuc') — chọn thay vì gõ tay.",
    "4. Cách điền 'Đáp án đúng' theo từng loại:",
    "   • Một đáp án / Nhiều đáp án: điền chữ cột (A, B, C hoặc D). Nhiều đáp án cách nhau bằng dấu phẩy, VD: A,C",
    "   • Đúng / Sai: điền 'Đúng' hoặc 'Sai' — không cần điền cột Đáp án A-D.",
    "   • Điền khuyết: điền từ/khai niệm cần điền (VD: 26/3/1931).",
    "   • Tự luận ngắn / Tự luận dài / Nộp tệp: điền đáp án tham khảo — giám khảo chấm tay sau kỳ thi.",
    "5. Chuyên mục tự đặt tên (VD: An toàn giao thông, Lịch sử Đoàn) — khi tạo kỳ thi sẽ chọn đề theo chuyên mục này.",
    "6. Sau khi nhập xong, vào mục 'Ngân hàng câu hỏi' của trang Thi kiến thức → chọn file → 'Lưu bộ câu hỏi vào ngân hàng'.",
  ].forEach((line, i) => {
    hd.getCell(`A${i + 1}`).value = line;
    if (i === 0) hd.getCell(`A${i + 1}`).font = { bold: true, size: 12 };
  });
  hd.getColumn("A").width = 110;

  const addListValidation = (column: string, fromRow: number, toRow: number, colLetter: string, count: number, errorTitle: string, error: string) => {
    for (let r = fromRow; r <= toRow; r++) {
      ws.getCell(`${column}${r}`).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [`=DanhMuc!$${colLetter}$2:$${colLetter}$${count + 1}`],
        showErrorMessage: true,
        errorTitle,
        error,
      };
    }
  };
  const MAX_IMPORT_ROWS = 500;
  addListValidation("A", 2, MAX_IMPORT_ROWS, "A", QUESTION_TYPES.length, "Loại câu hỏi không hợp lệ", "Chọn loại câu hỏi từ danh sách thả xuống (sheet DanhMuc).");
  addListValidation("C", 2, MAX_IMPORT_ROWS, "B", DIFFICULTIES.length, "Độ khó không hợp lệ", "Chọn độ khó từ danh sách thả xuống (sheet DanhMuc).");

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="mau-nhap-cau-hoi-thi.xlsx"',
    },
  });
}
