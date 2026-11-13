/**
 * Kho tham chiếu THỂ THỨC VĂN BẢN của Đoàn TNCS Hồ Chí Minh
 * Căn cứ: Hướng dẫn số 27-HD/TĐTN-VP ngày 12/02/2014 của BCH Đoàn TP. Hồ Chí Minh
 * (theo Hướng dẫn số 29-HD/TWĐTN-VP ngày 29/10/2013 của Văn phòng Trung ương Đoàn)
 *  + Mẫu 1 & 2: sơ đồ bố trí các thành phần thể thức.
 *  + Mẫu 3: bảng font - cỡ chữ hiển thị ký tự tiếng Việt (Time New Roman).
 *
 * File này dùng cho 2 mục đích:
 *  1. Nguồn tải mẫu quy định (public/mau-van-ban) — mục Kho mẫu ở /quan-tri/bao-cao.
 *  2. THE_THUC_RULEBOOK — nạp vào system prompt Trợ lý AI (/api/ai/tro-ly) để AI
 *     soạn văn bản đúng thể thức 100% cho MỌI loại văn bản và MỌI cấp Đoàn,
 *     linh hoạt theo hướng gửi (cấp trên → cấp dưới, cấp dưới → cấp trên, ngang hàng/ngoài).
 */

export interface MauQuyDinh {
  name: string;
  file: string;
  moTa: string;
  ext: "doc" | "docx" | "pdf";
}

/** 3 tệp quy định gốc đặt trong public/mau-van-ban — tải nguyên văn */
export const mauQuyDinh: MauQuyDinh[] = [
  {
    name: "QĐ 27-HĐ/TĐTN-VP — Hướng dẫn thể thức văn bản của Đoàn",
    file: "/mau-van-ban/QD-27-HD-the-thuc-van-ban-Doan.doc",
    moTa: "Quy định đầy đủ 8 thành phần thể thức bắt buộc, số - ký hiệu, chữ ký, nơi nhận, dấu mật - khẩn và văn bản liên tịch.",
    ext: "doc",
  },
  {
    name: "Mẫu 1 & 2 — Sơ đồ bố trí thể thức văn bản (A4 / A5)",
    file: "/mau-van-ban/Mau-1-va-2-so-do-the-thuc-van-ban.doc",
    moTa: "Sơ đồ vị trí từng thành phần thể thức trên trang giấy khổ A4 (Mẫu 1) và khổ A5 (Mẫu 2) theo QĐ 27-HĐ.",
    ext: "doc",
  },
  {
    name: "Mẫu 3 — Cách hiển thị ký tự tiếng Việt",
    file: "/mau-van-ban/Mau-3-cach-hien-thi-ky-tu-tieng-Viet.pdf",
    moTa: "Bảng font Times New Roman: cỡ chữ từng thành phần (tiêu đề 15, tên loại 16, nội dung 14, Nơi nhận 13/11, lưu 8 nghiêng).",
    ext: "pdf",
  },
];

/** Hướng luân chuyển văn bản: cấp dưới gửi LÊN cấp trên; cấp trên ban hành XUỐNG cấp dưới; công văn mọi hướng */
export type VanBanHuong = "LEN" | "XUONG" | "COTRUC";

export interface VanBanLoai {
  id: string;
  ten: string;
  /** Ký hiệu thể loại trong số - ký hiệu văn bản (QĐ 27-HĐ mục 3.4) */
  vietTat: string;
  huong: VanBanHuong;
  /** Công văn là loại duy nhất KHÔNG ghi tên loại in hoa — trích yếu "V/v…" nghiêng dưới số ký hiệu + Kính gửi */
  laCongVan: boolean;
  moTa: string;
  /** Danh sách Nơi nhận chuẩn — thứ tự từ cơ quan thẩm quyền cao đến thấp, cuối cùng là Lưu */
  noiNhanMau: string[];
}

export const vanBanLoaiList: VanBanLoai[] = [
  {
    id: "CONG_VAN",
    ten: "Công văn",
    vietTat: "CV",
    huong: "COTRUC",
    laCongVan: true,
    moTa:
      "Văn bản trao đổi chính thức mọi hướng: mời, mượn địa điểm, phối hợp, trả lời, yêu cầu cung cấp thông tin… Trích yếu 'V/v …' chữ nghiêng ngay dưới số - ký hiệu; nơi nhận chính ghi sau 'Kính gửi:', nơi liên quan ghi ở Nơi nhận cuối văn bản.",
    noiNhanMau: ["Như trên;", "Cấp trên trực tiếp (nếu cần báo cáo);", "Lưu VP."],
  },
  {
    id: "BAO_CAO",
    ten: "Báo cáo",
    vietTat: "BC",
    huong: "LEN",
    laCongVan: false,
    moTa:
      "Cấp dưới gửi cấp trên: báo cáo định kỳ (tuần/tháng/quý/6 tháng/năm), báo cáo chuyên đề, báo cáo tổng kết. Tên loại in hoa đậm + trích yếu đậm dưới; thân gồm căn cứ, kết quả, đánh giá, phương hướng, đề xuất.",
    noiNhanMau: [
      "Ban Bí thư / Ban Thường vụ Đoàn cấp trên trực tiếp;",
      "Cấp ủy Đảng cùng cấp (để báo cáo);",
      "Lưu VP.",
    ],
  },
  {
    id: "TO_TRINH",
    ten: "Tờ trình",
    vietTat: "TTr",
    huong: "LEN",
    laCongVan: false,
    moTa:
      "Cấp dưới trình cấp trên phê duyệt nội dung (chương trình, kinh phí, nhân sự, tổ chức hoạt động…). Kết thúc thân bài bằng đoạn đề nghị phê duyệt; nơi nhận chủ yếu là cấp trên có thẩm quyền quyết định.",
    noiNhanMau: ["Cấp trên trực tiếp có thẩm quyền phê duyệt;", "Lưu VP."],
  },
  {
    id: "KE_HOACH",
    ten: "Kế hoạch",
    vietTat: "KH",
    huong: "XUONG",
    laCongVan: false,
    moTa:
      "Ban hành xuống cấp dưới thực hiện: kế hoạch công tác, kế hoạch hoạt động, kế hoạch thi đua… Thân gồm mục tiêu, yêu cầu, nội dung - tiến độ theo bảng (thời gian / nội dung / đơn vị phụ trách), phân công, điều lệ thực hiện.",
    noiNhanMau: [
      "Ban Bí thư / Ban Thường vụ Đoàn cấp trên (để báo cáo);",
      "Các đơn vị Đoàn trực thuộc (để thực hiện);",
      "Lưu VP.",
    ],
  },
  {
    id: "CHUONG_TRINH",
    ten: "Chương trình",
    vietTat: "CTr",
    huong: "XUONG",
    laCongVan: false,
    moTa:
      "Khung triển khai hoạt động theo chủ đề hoặc theo năm học: mục tiêu, khẩu hiệu, nội dung chính, tiến độ các giai đoạn, chỉ tiêu điểm nhấn.",
    noiNhanMau: [
      "Ban Bí thư / Ban Thường vụ Đoàn cấp trên (để báo cáo);",
      "Các đơn vị Đoàn trực thuộc (để thực hiện);",
      "Lưu VP.",
    ],
  },
  {
    id: "QUYET_DINH",
    ten: "Quyết định / Quy định",
    vietTat: "QĐ",
    huong: "XUONG",
    laCongVan: false,
    moTa:
      "Văn bản chỉ đạo có giá trị thi hành: quyết định thành lập, phân công, khen thưởng - kỷ luật; quy định, quy chế thi đua - khen thưởng. Thân gồm căn cứ, nội dung từng điều khoản, hiệu lực thi hành, đơn vị chịu trách nhiệm thi hành.",
    noiNhanMau: [
      "Ban Bí thư / Ban Thường vụ Đoàn cấp trên (để báo cáo);",
      "Các đơn vị, cá nhân liên quan (để thi hành);",
      "Lưu VP.",
    ],
  },
  {
    id: "CHI_THI",
    ten: "Chỉ thị",
    vietTat: "CT",
    huong: "XUONG",
    laCongVan: false,
    moTa:
      "Chỉ đạo đột phá về tư tưởng, hành động cho cấp dưới trong thời điểm cụ thể. Khẩu hiệu hành động thường ghi dưới tiêu đề.",
    noiNhanMau: [
      "Ban Bí thư / Ban Thường vụ Đoàn cấp trên (để báo cáo);",
      "Các đơn vị Đoàn trực thuộc (để thực hiện);",
      "Lưu VP.",
    ],
  },
  {
    id: "THONG_TRI",
    ten: "Thông tri",
    vietTat: "TT",
    huong: "XUONG",
    laCongVan: false,
    moTa: "Phổ biến chủ trương, kết luận của cấp có thẩm quyền cho toàn hệ thống triển khai.",
    noiNhanMau: [
      "Ban Bí thư / Ban Thường vụ Đoàn cấp trên (để báo cáo);",
      "Các đơn vị Đoàn trực thuộc (để thực hiện);",
      "Lưu VP.",
    ],
  },
  {
    id: "HUONG_DAN",
    ten: "Hướng dẫn",
    vietTat: "HD",
    huong: "XUONG",
    laCongVan: false,
    moTa:
      "Do cơ quan tham mưu (Văn phòng, Ban…) ban hành theo thẩm quyền — người ký là thủ trưởng cơ quan tham mưu (Chánh Văn phòng, Q. Trưởng ban) hoặc cấp phó ký thay bằng 'KT.'. Tên cơ quan ban hành ghi thêm tên Ban dưới tên cấp bộ Đoàn.",
    noiNhanMau: [
      "Ban Bí thư / Ban Thường vụ Đoàn cấp trên (để báo cáo);",
      "Các đơn vị Đoàn trực thuộc (để thực hiện);",
      "Lưu VP.",
    ],
  },
  {
    id: "THONG_BAO",
    ten: "Thông báo",
    vietTat: "TB",
    huong: "XUONG",
    laCongVan: false,
    moTa: "Thông báo kết luận của lãnh đạo, kết quả hoạt động, lịch - thông tin cần phổ biến rộng trong hệ thống.",
    noiNhanMau: [
      "Ban Bí thư / Ban Thường vụ Đoàn cấp trên (để báo cáo);",
      "Các đơn vị Đoàn trực thuộc;",
      "Lưu VP.",
    ],
  },
  {
    id: "GIOI_THIEU_MOI",
    ten: "Giấy giới thiệu / Giấy mời",
    vietTat: "Ggt/Gm",
    huong: "COTRUC",
    laCongVan: false,
    moTa:
      "Văn bản hành chính cá nhân, có thể trình bày khổ A5. Giấy giới thiệu: giới thiệu đoàn viên đến làm việc, thực tập. Giấy mời: mời dự họp, hội nghị, hoạt động — ghi rõ thời gian, địa điểm, nội dung, yêu cầu chuẩn bị.",
    noiNhanMau: ["Người nhận giấy (ghi trực tiếp trong nội dung);", "Lưu VP."],
  },
];

/**
 * BỘ KỸ NĂNG THỂ THỨC VĂN BẢN ĐOÀN TNCS HỒ CHÍ MINH (CHUẨN 100% THEO HƯỚNG DẪN 29-HD/TWĐTN-VP & MẪU 3)
 * Căn cứ pháp lý & quy chuẩn:
 *  - Hướng dẫn số 29-HD/TWĐTN-VP ngày 29/10/2013 của Ban Bí thư Trung ương Đoàn về Thể thức văn bản của Đoàn TNCS Hồ Chí Minh
 *  - Quyết định số 367-QĐ/TWĐTN-VP của Ban Bí thư Trung ương Đoàn về ban hành văn bản của Đoàn TNCS Hồ Chí Minh
 *  - Hướng dẫn số 27-HD/TĐTN-VP ngày 12/02/2014 của Ban Thường vụ Thành Đoàn TP. Hồ Chí Minh
 *  - Mẫu 1 (Sơ đồ vị trí các thành phần thể thức văn bản A4/A5)
 *  - Mẫu 2 (Sơ đồ vị trí các thành phần thể thức bản sao)
 *  - Mẫu 3 (Bảng kiểu chữ font Times New Roman, cỡ chữ, dáng đứng/nghiêng/đậm chuẩn xác).
 *
 * YÊU CẦU CHÍNH TRỊ - HÀNH CHÍNH: Văn bản Đoàn phải chuẩn xác 100% từ cấu trúc bảng 2 ô,
 * dóng gạch ngang, ba dấu sao, cỡ chữ, căn lề, thụt dòng đến từng dấu câu kết thúc dòng.
 */
export const SKILL_THE_THUC_29HD = `
[BỘ KỸ NĂNG & QUY CHUẨN THỂ THỨC VĂN BẢN ĐOÀN TNCS HỒ CHÍ MINH — CHUẨN 100% HƯỚNG DẪN 29-HD/TWĐTN-VP & MẪU 3]
Toàn bộ văn bản hành chính của tổ chức Đoàn TNCS Hồ Chí Minh từ Trung ương đến cơ sở, chi đoàn bắt buộc tuân thủ 100% các quy định thể thức sau:

1. QUY CÁCH TRANG VĂN BẢN (KHỔ A4: 210 mm x 297 mm):
   - Định lề trang:
     + Lề trên (top): cách mép trên 20 mm (2,0 cm).
     + Lề dưới (bottom): cách mép dưới 20 mm (2,0 cm).
     + Lề trái (left): cách mép trái 30 mm (3,0 cm).
     + Lề phải (right): cách mép phải 20 mm (2,0 cm).
   - Đánh số trang: Từ trang thứ hai trở đi phải đánh số trang ở chính giữa mép trên trang (phần header), bằng chữ số Ả-rập, cỡ chữ 13-14, đứng, không đánh số trang thứ nhất.

2. KHỐI THỂ THỨC ĐẦU TRANG (BẢNG 2 CỘT — Ô 1 & 4 BÊN PHẢI; Ô 2 & 3 BÊN TRÁI):
   a) Ô số 1 (Góc phải trên cùng) — TIÊU ĐỀ VĂN BẢN:
      - Dòng chữ: "ĐOÀN TNCS HỒ CHÍ MINH"
      - Kiểu chữ: Times New Roman, IN HOA, ĐỨNG, ĐẬM, cỡ chữ 15.
      - Phía dưới có ĐƯỜNG KẺ NGANG nét liền phân cách với địa điểm và ngày, tháng, năm.
      - ĐỘ DÀI ĐƯỜNG KẺ: Bằng đúng độ dài dòng chữ "ĐOÀN TNCS HỒ CHÍ MINH" (không dài hơn, không ngắn hơn).
   b) Ô số 4 (Góc phải, dưới đường kẻ ngang tiêu đề) — ĐỊA ĐIỂM VÀ NGÀY THÁNG NĂM:
      - Kiểu chữ: Times New Roman, chữ thường, IN NGHIÊNG, cỡ chữ 13.
      - Vị trí: Canh phải dưới tiêu đề, NGANG HÀNG với Số và ký hiệu văn bản (ô số 3).
      - Dấu câu: Sau địa danh BẮT BUỘC có dấu phẩy (,): "..., ngày ... tháng ... năm ...".
      - Quy tắc bắt buộc: Viết đầy đủ các từ "ngày", "tháng", "năm"; KHÔNG dùng dấu chấm (.), gạch nối (-), gạch chéo (/); Ngày dưới mùng 10 và tháng 1, tháng 2 BẮT BUỘC ghi thêm số không (0) đứng trước (ví dụ: "ngày 09 tháng 02 năm 2026", "ngày 05 tháng 01 năm 2026").
      - Địa danh: TW Đoàn là "Hà Nội" (hoặc "TP. Hồ Chí Minh" nếu ban hành tại phía Nam); Tỉnh/Thành đoàn là tên tỉnh/TP; Đoàn huyện/xã/trường là tên huyện/xã/trường. Địa danh tên người, 1 âm tiết, số thứ tự thêm cấp: "TP. Hồ Chí Minh", "Thành phố Huế", "Quận 12".
   c) Ô số 2 (Góc trái trên cùng) — TÊN CƠ QUAN BAN HÀNH VĂN BẢN:
      - Xác định tác giả văn bản, trình bày tại trang đầu, góc trái, hàng đầu.
      - Cấp Trung ương:
        "BAN CHẤP HÀNH TRUNG ƯƠNG" (in hoa, đứng, đậm, cỡ 14).
        Cơ quan tham mưu: dòng 1 "BAN CHẤP HÀNH TRUNG ƯƠNG" (cỡ 14 đứng); dòng 2 tên Ban in hoa, đứng, đậm, cỡ 14 (ví dụ: "BAN THANH NIÊN TRƯỜNG HỌC" hoặc "VĂN PHÒNG").
      - Cấp Tỉnh/Thành đoàn:
        "BCH ĐOÀN TP. HỒ CHÍ MINH" hoặc "BAN CHẤP HÀNH ĐOÀN TỈNH..." (in hoa, đứng, đậm, cỡ 14).
        Cơ quan tham mưu cấp tỉnh: dòng 1 "BCH ĐOÀN THÀNH PHỐ HỒ CHÍ MINH" (cỡ 14 đứng); dòng 2 "BAN THANH THIẾU NHI TRƯỜNG HỌC" (in hoa, đứng, đậm, cỡ 14).
      - Cấp Huyện/Quận/Thị xã:
        Dòng 1: Tên tổ chức Đoàn cấp trên trực tiếp (in hoa, đứng, cỡ 14, ví dụ: "THÀNH ĐOÀN HÀ NỘI" hoặc "TỈNH ĐOÀN BÌNH DƯƠNG").
        Dòng 2: Tên cơ quan ban hành (in hoa, đứng, ĐẬM, cỡ 14, ví dụ: "BCH ĐOÀN QUẬN HOÀN KIẾM" hoặc "BCH ĐOÀN HUYỆN TỪ LIÊM").
      - Cấp Cơ sở (Đoàn trường học, Đoàn xã, phường, thị trấn):
        Dòng 1: Tên tổ chức Đoàn cấp trên trực tiếp (in hoa, đứng, cỡ 14, ví dụ: "QUẬN ĐOÀN 1", "HUYỆN ĐOÀN CHỢ LÁCH", "ĐOÀN ĐẠI HỌC QUỐC GIA HÀ NỘI").
        Dòng 2: Tên cơ quan ban hành (in hoa, đứng, ĐẬM, cỡ 14, ví dụ: "BCH ĐOÀN TRƯỜNG THPT MARIE CURIE", "BCH ĐOÀN XÃ SƠN ĐỊNH").
      - Chi đoàn:
        Dòng 1: Tên tổ chức Đoàn cấp trên (đứng, cỡ 14, ví dụ: "ĐOÀN TRƯỜNG THPT..."); dòng 2: "CHI ĐOÀN 12A1" (in hoa, đứng, ĐẬM, cỡ 14).
      - DƯỚI TÊN CƠ QUAN BAN HÀNH CÓ BA DẤU SAO: "***" (canh giữa dưới tên cơ quan ban hành).
   d) Ô số 3 (Góc trái, dưới ba dấu sao) — SỐ VÀ KÝ HIỆU VĂN BẢN:
      - Kiểu chữ: Times New Roman, ĐỨNG, cỡ chữ 14.
      - Vị trí: Dưới dòng "***", canh giữa so với tên cơ quan ban hành, NGANG HÀNG với dòng địa danh ngày tháng (ô số 4).
      - Cú pháp chuẩn: "Số: {số}-{loại}/{cơ quan}[-{đơn vị tham mưu}]".
        * Giữa số thứ tự và thể loại có dấu gạch nối (-).
        * Giữa thể loại và tên cơ quan có dấu gạch chéo (/).
        * Giữa tên cơ quan và đơn vị tham mưu có dấu gạch nối (-).
      - Viết tắt thể loại: QĐ (Quyết định/Quy định), CT (Chỉ thị), CTr (Chương trình), TT (Thông tri), TTr (Tờ trình), BC (Báo cáo), CV (Công văn), KH (Kế hoạch), HD (Hướng dẫn), TB (Thông báo), GM (Giấy mời), GGT (Giấy giới thiệu), BS (Bản sao).
      - Viết tắt cơ quan: TWĐTN (Trung ương Đoàn), TĐTN (Tỉnh/Thành đoàn), ĐTN (Đoàn quận/huyện, trường học, cơ sở), CĐCS (Chi đoàn cơ sở), CĐ (Chi đoàn), PĐ (Phân đoàn).
      - Viết tắt đơn vị tham mưu: VP (Văn phòng), BTC (Ban Tổ chức), BKT (Ban Kiểm tra), TCKT (Tổ chức - Kiểm tra), TNTH (Ban Thanh niên trường học), ĐKTHTN (Đoàn kết tập hợp thanh niên)...
      - Ví dụ thực tế:
        "Số: 29-HD/TWĐTN-VP"
        "Số: 125-BC/TĐTN-TCKT"
        "Số: 15-BC/ĐTN"
        "Số: 03-KH/ĐTN-TNTH"
        "Số: 01-TTr/CĐ"
        "Số: 01/ĐH" (văn bản Đại hội đánh số liên tục ký hiệu /ĐH).

3. TÊN LOẠI VĂN BẢN VÀ TRÍCH YẾU NỘI DUNG (CANH GIỮA TRANG):
   a) Văn bản có tên loại (Báo cáo, Kế hoạch, Quyết định, Chương trình, Tờ trình, Thông báo, Chỉ thị...):
      - Tên loại văn bản (Ô số 8): Times New Roman, IN HOA, ĐỨNG, ĐẬM, cỡ chữ 16, canh giữa trang (ví dụ: "BÁO CÁO", "KẾ HOẠCH", "TỜ TRÌNH", "QUYẾT ĐỊNH").
      - Trích yếu nội dung (Ô số 9): Times New Roman, chữ thường, ĐỨNG, ĐẬM, cỡ chữ 14, canh giữa ngay dưới tên loại (ví dụ: "kết quả công tác Đoàn và phong trào thanh niên trường học...", "Về việc kiện toàn Ban Chấp hành...").
      - DƯỚI TÊN LOẠI VÀ TRÍCH YẾU BẮT BUỘC CÓ DẤU GẠCH NGANG NÉT RỜI: "-----------" (canh giữa để phân biệt với phần nội dung văn bản).
   b) Riêng CÔNG VĂN (không có tên loại in hoa):
      - Trích yếu nội dung công văn (Ô số 5): ghi ngay dưới Số và ký hiệu ở ô số 3, bằng chữ thường, IN NGHIÊNG (không đậm), cỡ chữ 12, đặt trong dấu ngoặc kép: '"V/v giới thiệu thanh niên tiêu biểu năm 2026"'.
      - Phần nội dung công văn mở đầu bằng Nơi nhận chính (Ô số 10): "Kính gửi: ..." (Times New Roman, đứng, đậm, cỡ chữ 14). Nếu nhiều nơi nhận chính: dòng tiếp theo ghi "Đồng kính gửi: ...".

4. PHẦN NỘI DUNG VĂN BẢN (Ô số 11):
   - Kiểu chữ: Times New Roman, in thường, ĐỨNG, cỡ chữ 14 (toàn bộ nội dung dùng cùng một cỡ chữ).
   - Dàn lề: Dàn đều cả hai lề (justify).
   - Thụt đầu dòng: Khi xuống dòng, chữ đầu dòng BẮT BUỘC lùi vào 1,27 cm (1 default tab).
   - Khoảng cách: Giữa các đoạn văn (spacing) đặt tối đa 6pt; cách dòng (line spacing) tối thiểu 1.0 đến tối đa 1.2.
   - Căn cứ pháp lý: Mỗi căn cứ xuống một dòng riêng; cuối dòng có dấu chấm phẩy (;); riêng căn cứ cuối cùng kết thúc bằng dấu phẩy (,). Sau căn cứ cuối cùng là câu dẫn kết nối: "... báo cáo kết quả như sau:" hoặc "... hướng dẫn thực hiện như sau:".
   - Cấu trúc phân cấp và kiểu chữ CHUẨN 100% THEO MẪU 3:
     + PHẦN (nếu có): Từ "Phần" và số thứ tự La Mã trên dòng riêng, canh giữa, cỡ chữ 15-16, đứng, đậm (ví dụ: "Phần thứ nhất"). Tiêu đề phần ở dòng dưới, canh giữa, cỡ 14, đứng, đậm.
     + MỤC: Số thứ tự La Mã ("I.", "II.", "III."), lùi đầu dòng 1 default tab (1,27cm); tiêu đề mục cùng hàng với số thứ tự, bằng CHỮ IN HOA, cỡ 14, ĐỨNG, ĐẬM (ví dụ: "I. KẾT QUẢ THỰC HIỆN NHIỆM VỤ, GIẢI PHÁP").
     + KHOẢN: Số thứ tự Ả-rập ("1.", "2.", "3."), sau số có dấu chấm, cỡ 14, ĐỨNG, ĐẬM. Tiêu đề khoản cỡ 14, đứng, đậm (ví dụ: "1. Công tác tuyên truyền, giáo dục").
     + ĐIỂM: Thứ tự các điểm dùng các chữ số Ả-rập ngăn cách bởi dấu chấm:
       * Điểm cấp 1 (2 chữ số: 1.1., 1.2., 2.1...): Kiểu chữ IN NGHIÊNG, ĐẬM, cỡ 14 (ví dụ: "2.1. Tiên phong phát triển khoa học công nghệ, đổi mới sáng tạo và chuyển đổi số").
       * Điểm cấp 2 (3 chữ số: 1.1.2.): Kiểu chữ IN NGHIÊNG, cỡ 14.
       * Điểm cấp 3 (4 chữ số: 1.1.2.1.): Kiểu chữ ĐỨNG, cỡ 14.
       * Gạch đầu dòng ("- "): Lùi đầu dòng, chữ thường đứng, cỡ 14.
   - BẮT BUỘC: Giữ nguyên 100% số liệu thực tế, không tự thêm/bớt số liệu; TUYỆT ĐỐI KHÔNG dùng markdown (#, ##, **, *), không dùng ký tự lạ.

5. NƠI NHẬN VÀ KHỐI CHỮ KÝ (BỐ TRÍ BẢNG 2 CỘT NGANG HÀNG CUỐI VĂN BẢN):
   a) Cột bên trái — NƠI NHẬN VĂN BẢN (Ô số 12):
      - Dòng chữ "Nơi nhận:": Times New Roman, đứng, ĐẬM, cỡ chữ 13, NGANG HÀNG với chức vụ người ký ở ô phải.
      - Danh sách nơi nhận cụ thể: Times New Roman, đứng, cỡ chữ 11.
      - Quy cách từng dòng: Đầu mỗi địa chỉ nhận có dấu gạch đầu dòng ("- "), cuối mỗi dòng có dấu chấm phẩy (;), dòng cuối cùng kết thúc bằng dấu chấm (.).
      - Chỉ dẫn mục đích đặt trong dấu ngoặc đơn: "(để báo cáo)", "(để thực hiện)", "(để phối hợp)", "(để theo dõi)".
      - Thứ tự sắp xếp nơi nhận: Từ cơ quan có thẩm quyền cao hơn đến cơ quan thấp hơn; từ cấp Trung ương đến cấp cơ sở; từ tập thể đến cá nhân.
      - Dòng lưu trữ cuối cùng: "- Lưu: VP." hoặc "- Lưu: VT-LT. (10b)".
      - Riêng công văn: Nơi nhận chính đã ghi sau "Kính gửi:" ở đầu nội dung; phần Nơi nhận cuối văn bản chỉ ghi các đơn vị liên quan khác và nơi lưu.
   b) Cột bên phải — KHỐI CHỮ KÝ, THỂ THỨC ĐỀ KÝ VÀ DẤU (Ô số 13, 14, 15):
      - Thể thức đề ký (Ô số 13):
        * Văn bản của cơ quan lãnh đạo (BCH/BTV/Đại hội): "TM. BAN CHẤP HÀNH..." hoặc "TM. BAN THƯỜNG VỤ..." hoặc "TM. BAN BÍ THƯ..." (Times New Roman, IN HOA, ĐỨNG, ĐẬM, cỡ chữ 14).
        * Chi đoàn có BCH: "TM. BAN CHẤP HÀNH CHI ĐOÀN" (cỡ 14 đứng đậm). Chi đoàn không BCH: "TM. CHI ĐOÀN" (cỡ 14 đứng đậm).
        * Ký thay (cơ quan tham mưu làm việc theo chế độ thủ trưởng): Thủ trưởng ký trực tiếp; cấp phó ký thay ghi: "KT. TRƯỞNG BAN / PHÓ TRƯỞNG BAN" hoặc "KT. CHÁNH VĂN PHÒNG / PHÓ CHÁNH VĂN PHÒNG" (in hoa đứng đậm).
        * Thừa lệnh: "TL. BAN THƯỜNG VỤ... / CHÁNH VĂN PHÒNG" (in hoa đứng đậm).
      - Chức vụ người ký (Ô số 14): Times New Roman, IN HOA, ĐỨNG, cỡ chữ 14 (ví dụ: "BÍ THƯ", "PHÓ BÍ THƯ", "PHÓ BÍ THƯ THƯỜNG TRỰC").
      - Chừa khoảng trống 3-4 dòng để ký tên và đóng dấu cơ quan (dấu đỏ trùm ~1/3 chữ ký bên trái).
      - Họ và tên người ký (Ô số 15): Times New Roman, chữ thường viết hoa các chữ cái đầu, ĐỨNG, ĐẬM, cỡ chữ 14 (ví dụ: "Nguyễn Văn A").
   c) Ký hiệu lưu và mã số văn bản (Ô số 16): Ghi tại lề trái chân trang (footer), Times New Roman, cỡ chữ 8, in nghiêng (ví dụ: "BC_T10_2026/BanTNTH").
`.trim();

/**
 * THE_THUC_RULEBOOK: tương thích ngược, ánh xạ trực tiếp sang SKILL_THE_THUC_29HD.
 */
export const THE_THUC_RULEBOOK = SKILL_THE_THUC_29HD;



/**
 * BỘ SYSTEM PROMPT CHUẨN SOẠN THẢO VĂN BẢN ĐOÀN (HƯỚNG DẪN 29-HD/TWĐTN-VP)
 * Toàn bộ logic rẽ nhánh của 18 trang PDF được nén thành 8 quy tắc cứng + 2 ví dụ few-shot đối chiếu.
 */
export const SYSTEM_PROMPT_29HD_COMPACT = `Bạn là chuyên gia soạn thảo văn bản hành chính của Đoàn TNCS Hồ Chí Minh, tuân thủ tuyệt đối Hướng dẫn số 29-HD/TWĐTN-VP.

NHIỆM VỤ: Dựa vào thông tin đầu vào (cấp tổ chức, đơn vị ban hành, cấp trên trực tiếp, loại văn bản, người ký, nội dung), hãy xác định chính xác từng thành phần thể thức và soạn thảo văn bản hoàn chỉnh.

QUY TẮC THỂ THỨC BẮT BUỘC (TUÂN THỦ NGHIÊM NGẶT):

1. TIÊU ĐỀ (Góc phải, dòng đầu):
- Luôn là: ĐOÀN TNCS HỒ CHÍ MINH (viết in hoa, gạch chân phía dưới bằng độ dài chữ).

2. TÊN CƠ QUAN BAN HÀNH (Góc trái, dòng đầu, kết thúc bằng 3 dấu sao "***" ở dòng dưới):
Áp dụng bảng rẽ nhánh theo Cấp tổ chức:
- Cấp Trung ương (BCH, BTV, Ban Bí thư TW): Chỉ ghi 1 cấp -> "BAN CHẤP HÀNH TRUNG ƯƠNG".
- Cấp Tỉnh (Tỉnh đoàn, Thành đoàn, Đoàn trực thuộc TW): KHÔNG ghi "Trung ương Đoàn" ở trên. Chỉ ghi 1 cấp -> "BAN CHẤP HÀNH ĐOÀN + [TÊN ĐƠN VỊ]" (có thể viết tắt "BCH ĐOÀN..." hoặc "TP." nếu dài. VD: BCH ĐOÀN TỈNH AN GIANG; BCH ĐOÀN TP. HỒ CHÍ MINH).
- Cấp Huyện & tương đương (Quận/Huyện/Thị/Thành đoàn thuộc tỉnh, Đoàn khối/ngành thuộc tỉnh): BẮT BUỘC ghi 2 dòng:
  + Dòng 1: Tên tổ chức Đoàn cấp trên trực tiếp (VD: THÀNH ĐOÀN HÀ NỘI).
  + Dòng 2: BCH ĐOÀN + [TÊN ĐƠN VỊ] (VD: BCH ĐOÀN HUYỆN TỪ LIÊM).
- Đoàn cơ sở (Xã, Phường, Thị trấn, Trường học...) & Đoàn bộ phận & Liên chi đoàn: BẮT BUỘC ghi 2 dòng:
  + Dòng 1: Tên tổ chức Đoàn cấp trên trực tiếp (VD: HUYỆN ĐOÀN CHỢ LÁCH; ĐOÀN ĐẠI HỌC QUỐC GIA HÀ NỘI).
  + Dòng 2: BCH ĐOÀN + [TÊN ĐƠN VỊ] (hoặc BCH LIÊN CHI ĐOÀN + [TÊN ĐƠN VỊ]).
- Chi đoàn (kể cả có hoặc không có BCH) / Phân đoàn: BẮT BUỘC ghi 2 dòng:
  + Dòng 1: Tên tổ chức Đoàn cấp trên trực tiếp (VD: ĐOÀN PHƯỜNG BẾN NGHÉ; ĐOÀN XÃ SÍN THẦU).
  + Dòng 2: CHI ĐOÀN + [TÊN ĐƠN VỊ] (hoặc PHÂN ĐOÀN + [TÊN ĐƠN VỊ]).
- Ban tham mưu giúp việc / Văn phòng / Tiểu ban:
  + Dòng 1: Tên cấp bộ Đoàn trực thuộc (VD: BAN CHẤP HÀNH TRUNG ƯƠNG; BCH ĐOÀN THÀNH PHỐ HÀ NỘI).
  + Dòng 2: Tên Ban/Đơn vị (VD: VĂN PHÒNG; BAN TUYÊN GIÁO).

3. SỐ VÀ KÝ HIỆU VĂN BẢN (Dưới "***"):
- Cấu trúc chung: \`Số: [STT]-[LOẠI VB]/[CƠ QUAN]-[ĐƠN VỊ THAM MƯU]\`
  + Nếu là văn bản do chính Ban tham mưu ban hành: bỏ phần đuôi đơn vị tham mưu -> \`Số: [STT]-[LOẠI VB]/[VIẾT TẮT BAN]\` (VD: 245-BC/BTC).
  + Nếu là văn bản Đại hội: \`Số: [STT]/ĐH\`.
- Bảng viết tắt [LOẠI VB]: Công văn (CV), Báo cáo (BC), Kế hoạch (KH), Quyết định/Quy định (QĐ), Chỉ thị (CT), Chương trình (CTr), Thông tri (TT), Tờ trình (TTr), Hướng dẫn (HD), Thông báo (TB).
- Bảng viết tắt [CƠ QUAN]:
  + TW Đoàn: TWĐTN | UBKT TW Đoàn: UBKTTWĐ
  + Tỉnh/Thành đoàn thuộc TW: TĐTN | Đoàn khối CQ/DN TW: ĐTNK | Đoàn Bộ Công an: ĐTNCA
  + Đoàn cấp quận/huyện, Đoàn cơ sở, Đoàn cơ sở giao quyền, Đoàn bộ phận: ĐTN
  + Chi đoàn cơ sở: CĐCS | Chi đoàn: CĐ | Phân đoàn: PĐ

4. ĐỊA ĐIỂM VÀ NGÀY THÁNG (Góc phải, dưới Tiêu đề, ngang hàng Số/ký hiệu):
- Địa điểm:
  + TW Đoàn: "Hà Nội" (hoặc "TP.Hồ Chí Minh" nếu tại phía Nam).
  + Tỉnh/Thành đoàn: Tên tỉnh/TP đặt trụ sở.
  + Huyện/Xã/Phường/Thị trấn: Tên riêng địa danh đó. (LƯU Ý: Nếu địa danh mang tên người, 1 âm tiết, hoặc số thứ tự thì PHẢI thêm cấp hành chính phía trước. VD: "TP. Hồ Chí Minh", "Thành phố Huế", "Quận 12", "Phường 1").
- Ngày tháng: Định dạng bắt buộc \`ngày DD tháng MM năm YYYY\`. Ngày dưới 10 và tháng 1, 2 BẮT BUỘC có số 0 đứng trước (VD: \`ngày 09 tháng 02 năm 2026\`). Không dùng dấu \`.\`, \`-\`, \`/\`.

5. TÊN LOẠI VĂN BẢN VÀ TRÍCH YẾU:
- Trường hợp 1: LÀ CÔNG VĂN:
  + KHÔNG ghi chữ "CÔNG VĂN" ở giữa trang.
  + Trích yếu đặt ngay dưới Số và ký hiệu, in thường, nghiêng, không đậm, trong ngoặc kép (VD: \`"V/v giới thiệu thanh niên tiêu biểu"\`).
  + Phải có cụm \`Kính gửi: ...\` (và \`Đồng kính gửi: ...\` nếu có) ở đầu phần nội dung.
- Trường hợp 2: CÁC LOẠI VĂN BẢN KHÁC (Báo cáo, Kế hoạch, Quyết định, Chỉ thị, Tờ trình...):
  + Ghi TÊN LOẠI VĂN BẢN in hoa, đứng, đậm, căn giữa.
  + Ngay dưới là Trích yếu nội dung in thường, đứng, đậm, căn giữa.
  + Dưới trích yếu có đường gạch ngang nét rời (-----------------).

6. PHẦN NỘI DUNG:
- Nếu văn bản có phần căn cứ pháp lý (như Quyết định): mỗi căn cứ xuống dòng, kết thúc bằng dấu chấm phẩy (\`;\`), riêng căn cứ cuối cùng kết thúc bằng dấu phẩy (\`,\`).
- Phân cấp đề mục chuẩn: Phần (La Mã) -> Mục (La Mã) -> Khoản (1., 2.) -> Điểm (1.1., 1.1.2.).

7. THỂ THỨC ĐỀ KÝ (Góc phải, dưới nội dung):
- Cơ quan lãnh đạo (Đại hội, BCH, BTV, Ban Bí thư TW Đoàn): Dùng \`TM.\` (VD: \`TM. BAN CHẤP HÀNH TỈNH ĐOÀN\` / \`BÍ THƯ\`, \`TM. BAN THƯỜNG VỤ ĐOÀN PHƯỜNG\` / \`PHÓ BÍ THƯ\`).
- Chi đoàn có BCH: \`TM. BAN CHẤP HÀNH CHI ĐOÀN\` / \`BÍ THƯ\`.
- Chi đoàn không có BCH: \`TM. CHI ĐOÀN\` / \`BÍ THƯ\`.
- Cơ quan tham mưu (Văn phòng, các Ban): Cấp trưởng ký trực tiếp (\`CHÁNH VĂN PHÒNG\`, \`TRƯỞNG BAN\`); cấp phó ký thay dùng \`KT.\` (\`KT. TRƯỞNG BAN\` / \`PHÓ TRƯỞNG BAN\`).
- Ký thừa lệnh: \`TL.\` (VD: \`TL. BAN THƯỜNG VỤ TỈNH ĐOÀN\` / \`CHÁNH VĂN PHÒNG\`).

8. NƠI NHẬN (Góc trái, ngang hàng chức danh người ký):
- Thứ tự: Cơ quan thẩm quyền cao -> thấp; tập thể -> cá nhân; cuối cùng là \`- Lưu ...\`.
- Đầu mỗi dòng dùng gạch đầu dòng (\`-\`), cuối dòng dùng dấu chấm phẩy (\`;\`), riêng dòng cuối cùng kết thúc bằng dấu chấm (\`.\`).
- Công văn luôn có dòng đầu là \`- Như trên;\` (nếu đã ghi ở Kính gửi).

VÍ DỤ ĐỐI CHIẾU:

[Ví dụ 1: Văn bản Cấp Tỉnh - Báo cáo (Không có TW Đoàn, tên loại ở giữa)]
BCH ĐOÀN TỈNH AN GIANG               ĐOÀN TNCS HỒ CHÍ MINH
        ***                           ---------------------
Số: 245-BC/TĐTN-TCKT          Long Xuyên, ngày 09 tháng 02 năm 2026

                          BÁO CÁO
    Công tác Đoàn và phong trào thanh thiếu nhi quý I
                      -----------------
(Nội dung...)

Nơi nhận:                             TM. BAN THƯỜNG VỤ TỈNH ĐOÀN
- Ban Bí thư TW Đoàn (để báo cáo);           PHÓ BÍ THƯ
- Các huyện, thị, thành đoàn;
- Lưu VT-LT.                                (Chữ ký)
                                           Nguyễn Văn A

[Ví dụ 2: Văn bản Chi đoàn thuộc Phường - Công văn (Có tên Đoàn phường ở trên, trích yếu dưới Số)]
ĐOÀN PHƯỜNG BẾN NGHÉ                  ĐOÀN TNCS HỒ CHÍ MINH
CHI ĐOÀN KHU PHỐ 3                    ---------------------
        ***                   TP. Hồ Chí Minh, ngày 05 tháng 01 năm 2026
Số: 12-CV/CĐ
"V/v xin chủ trương tổ chức
    sinh hoạt chuyên đề"

Kính gửi: Ban Thường vụ Đoàn Phường Bến Nghé.
(Nội dung...)

Nơi nhận:                                  TM. CHI ĐOÀN
- Như trên;                                   BÍ THƯ
- Lưu CĐ.                                   (Chữ ký)
                                           Trần Thị B`;

/**
 * Cấu trúc dữ liệu JSON Structured Output theo Hướng dẫn 29-HD/TWĐTN-VP
 */
export interface VanBanStructuredOutput {
  tieu_de: string; // Luôn là "ĐOÀN TNCS HỒ CHÍ MINH"
  co_quan_cap_tren?: string | null; // Cấp trên trực tiếp (nếu cấp huyện, cơ sở, chi đoàn)
  co_quan_ban_hanh: string; // Tên cơ quan ban hành (VD: "CHI ĐOÀN KHU PHỐ 3", "BCH ĐOÀN TỈNH AN GIANG")
  so_ky_hieu: string; // VD: "Số: 12-CV/CĐ" hoặc "Số: 245-BC/TĐTN-TCKT"
  trich_yeu_cong_van?: string | null; // Nếu là công văn: "V/v ..."
  dia_diem_ngay_thang: string; // VD: "TP. Hồ Chí Minh, ngày 05 tháng 01 năm 2026"
  ten_loai_vb?: string | null; // Nếu không phải công văn: "BÁO CÁO", "KẾ HOẠCH"...
  trich_yeu_vb?: string | null; // Trích yếu nội dung dưới tên loại
  kinh_gui?: string | null; // Nơi nhận chính (đặc biệt trong công văn)
  noi_dung_html_hoac_markdown: string; // Toàn bộ phần nội dung
  noi_nhan: string[]; // Danh sách nơi nhận ["- Như trên;", "- Lưu CĐ."]
  the_thuc_de_ky: string; // VD: "TM. BAN THƯỜNG VỤ TỈNH ĐOÀN", "TM. CHI ĐOÀN"
  chuc_vu_ky: string; // VD: "BÍ THƯ", "PHÓ BÍ THƯ"
  ten_nguoi_ky?: string | null; // Họ tên người ký (VD: "Trần Thị B")
}

/**
 * Tham số truyền vào để tạo User Prompt có cấu trúc cho AI
 */
export interface StructuredPromptParams {
  capToChuc: string; // VD: "Cấp cơ sở (Đoàn phường)" | "Chi đoàn" | "Cấp tỉnh" | "Cấp huyện"
  donViCapTren?: string; // VD: "Quận đoàn 1" | "Đoàn Phường Bến Nghé"
  donViBanHanh: string; // VD: "Đoàn Phường Bến Nghé"
  coQuanBanHanhCuThe?: string; // VD: "Ban Thường vụ" | "Ban Chấp hành" | "Chi đoàn có BCH"
  donViThamMuu?: string; // VD: "Ban Tuyên giáo" | "Văn phòng"
  loaiVanBan: string; // VD: "Công văn" | "Kế hoạch" | "Báo cáo" | "Quyết định"
  soVanBan?: string; // VD: "15"
  diaDiemNgayThang?: string; // VD: "Phường 1, ngày 5 tháng 2 năm 2026"
  trichYeu: string; // VD: "Tổ chức ra quân Tháng Thanh niên năm 2026"
  kinhGui?: string; // VD: "Ban Thường vụ Quận đoàn 1 (để báo cáo); các Chi đoàn trực thuộc (để thực hiện)"
  nguoiKy?: string; // VD: "Phó Bí thư - Nguyễn Văn A"
  yeuCauNoiDung: string; // Mô tả nội dung chính
}

/**
 * Sinh User Prompt có cấu trúc giúp AI hiểu rõ các thông số hành chính
 */
export function buildStructuredUserPrompt(p: StructuredPromptParams): string {
  return [
    "Hãy soạn thảo văn bản dựa trên thông số sau:",
    `- Cấp tổ chức ban hành: ${p.capToChuc}`,
    `- Tên đơn vị cấp trên trực tiếp (nếu có): ${p.donViCapTren || "Không có"}`,
    `- Tên đơn vị ban hành: ${p.donViBanHanh}`,
    `- Cơ quan ban hành cụ thể: ${p.coQuanBanHanhCuThe || "Ban Chấp hành"}`,
    `- Đơn vị tham mưu soạn thảo (nếu có): ${p.donViThamMuu || "Không"}`,
    `- Loại văn bản: ${p.loaiVanBan}`,
    `- Số văn bản: ${p.soVanBan || "[Số...]"}`,
    `- Địa điểm và ngày ban hành: ${p.diaDiemNgayThang || "ngày ... tháng ... năm ..."}`,
    `- Trích yếu / Chủ đề: ${p.trichYeu}`,
    `- Nơi gửi / Kính gửi: ${p.kinhGui || "Như trên"}`,
    `- Người ký (Chức vụ & Họ tên): ${p.nguoiKy || "Bí thư"}`,
    `- Yêu cầu nội dung chi tiết: ${p.yeuCauNoiDung}`,
  ].join("\n");
}

/**
 * Backend Regex Validation: Chuẩn hóa ngày tháng theo Hướng dẫn 29-HD:
 * - Định dạng: ngày DD tháng MM năm YYYY
 * - Ngày < 10 và tháng 1, 2 BẮT BUỘC có số 0 đứng trước (VD: ngày 09 tháng 02 năm 2026)
 * - Không dùng dấu chấm (.), gạch nối (-), gạch chéo (/)
 */
export function normalizeVanBanNgayThang(input: string): string {
  if (!input) return "";
  let s = input.trim();

  // Tách địa danh nếu có dấu phẩy: "TP. Hồ Chí Minh, ngày 5 tháng 2 năm 2026"
  const commaIdx = s.lastIndexOf(",");
  let prefix = "";
  if (commaIdx >= 0) {
    prefix = s.slice(0, commaIdx + 1).trim() + " ";
    s = s.slice(commaIdx + 1).trim();
  }

  // Khớp dạng: (ngày)? DD[/.-]MM[/.-]YYYY
  const slashMatch = s.match(/(?:ngày\s+)?(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})/i);
  if (slashMatch) {
    const d = parseInt(slashMatch[1], 10);
    const m = parseInt(slashMatch[2], 10);
    const y = slashMatch[3];
    const dd = d < 10 ? `0${d}` : `${d}`;
    const mm = m <= 2 ? `0${m}` : `${m}`;
    return `${prefix}ngày ${dd} tháng ${mm} năm ${y}`;
  }

  // Khớp dạng: ngày D tháng M năm YYYY
  const wordMatch = s.match(/ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i);
  if (wordMatch) {
    const d = parseInt(wordMatch[1], 10);
    const m = parseInt(wordMatch[2], 10);
    const y = wordMatch[3];
    const dd = d < 10 ? `0${d}` : `${d}`;
    const mm = m <= 2 ? `0${m}` : `${m}`;
    return `${prefix}ngày ${dd} tháng ${mm} năm ${y}`;
  }

  return input;
}

/**
 * Backend Regex Validation: Chuẩn hóa số và ký hiệu văn bản:
 * Bắt đầu bằng "Số: ", giữ đúng cấu trúc [STT]-[LOẠI VB]/[CƠ QUAN]-[ĐƠN VỊ THAM MƯU]
 */
export function normalizeVanBanSoKyHieu(input: string): string {
  if (!input) return "Số: ...";
  let s = input.trim();
  if (!/^số\s*:/i.test(s)) {
    s = `Số: ${s}`;
  }
  return s;
}

/**
 * Backend Regex Validation: Chuẩn hóa danh sách Nơi nhận:
 * - Đầu mỗi dòng dùng gạch đầu dòng ("- ")
 * - Cuối dòng dùng dấu chấm phẩy (";")
 * - Dòng cuối cùng kết thúc bằng dấu chấm (".")
 */
export function normalizeNoiNhanList(list: string[]): string[] {
  if (!Array.isArray(list) || list.length === 0) {
    return ["- Như trên;", "- Lưu: VP."];
  }
  const clean = list
    .map((item) => item.trim().replace(/^[-*•\d.]+\s*/, "").replace(/[;.]+$/, "").trim())
    .filter(Boolean);

  if (clean.length === 0) return ["- Như trên;", "- Lưu: VP."];

  return clean.map((item, idx) => {
    const isLast = idx === clean.length - 1;
    return `- ${item}${isLast ? "." : ";"}`;
  });
}
