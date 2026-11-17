/**
 * THỂ THỨC VĂN BẢN ĐOÀN TNCS HỒ CHÍ MINH — FILE TỔNG HỢP
 * Căn cứ: Hướng dẫn số 29-HD/TWĐTN-VP ngày 29/10/2013 của Ban Bí thư Trung ương Đoàn; Mẫu 1, 2, 3.
 *
 * Nguyên tắc: CODE dựng khung thể thức + đánh số + phụ lục; AI chỉ viết phần thân từ dữ kiện,
 * mỗi đoạn phải trích mã nguồn; code kiểm tra bám nguồn và thể thức trước khi xuất file.
 *
 * Mục lục:
 *  1–2.  Kho mẫu tải về; danh mục loại văn bản (vanBanLoaiList)
 *  3.    THE_THUC_LAYOUT — font, cỡ chữ, lề, thụt dòng cho lớp dựng .docx (Mẫu 3)
 *  4.    SKILL_THE_THUC_29HD / SYSTEM_PROMPT_29HD_COMPACT — quy tắc thể thức (tương thích bản cũ)
 *  6.    getSystemPrompt / JSON_OUTPUT_INSTRUCTION (tương thích bản cũ)
 *  6b.   DonViBanHanh, DON_VI_PRESETS, buildKhungVanBan — khối thể thức do code dựng, thống nhất 1 đơn vị
 *  7–9.  Kiểu dữ liệu, chuẩn hoá (normalize*), validateVanBan (kể cả chặn nơi nhận/chữ ký lọt vào thân)
 *  11.   KHUNG_NOI_DUNG — khung phần thân cho từng loại văn bản
 *  12.   kiemTraDoanVoiNguon — kiểm tra số liệu, tên riêng, lời khen không có trong dữ kiện
 *  13.   soanVanBan(input, goiAi) — luồng chung cho MỌI loại văn bản
 *  14.   soanBaoCaoTuan(input, goiAi) — báo cáo tuần theo danh mục hoạt động + phụ lục nguồn tin
 *  15.   vanBanThanhVanBanThuan — văn bản thuần để lưu/xem trước
 */

import { NV_GROUPS, NV_SUBS } from "@/data/bao-cao-agent";

/* ============================================================================
 * 1. KHO MẪU QUY ĐỊNH (tải nguyên văn)
 * ========================================================================== */

export interface MauQuyDinh {
  name: string;
  file: string;
  moTa: string;
  ext: "doc" | "docx" | "pdf";
}

/** Các tệp quy định gốc đặt trong public/mau-van-ban — tải nguyên văn */
export const mauQuyDinh: MauQuyDinh[] = [
  {
    name: "Hướng dẫn 29-HD/TWĐTN-VP — Thể thức văn bản của Đoàn TNCS Hồ Chí Minh",
    file: "/mau-van-ban/QD-27-HD-the-thuc-van-ban-Doan.doc",
    moTa: "Quy định 8 thành phần thể thức bắt buộc, khổ giấy - định lề - đánh số trang, tên cơ quan ban hành theo từng cấp, số - ký hiệu, chữ ký - thể thức đề ký, nơi nhận, dấu mật - khẩn, bản sao.",
    ext: "doc",
  },
  {
    name: "Mẫu 1 & 2 — Sơ đồ vị trí thành phần thể thức (văn bản / bản sao)",
    file: "/mau-van-ban/Mau-1-va-2-so-do-the-thuc-van-ban.doc",
    moTa: "Mẫu 1: vị trí 16 ô thể thức trên trang A4 (khổ A5 áp dụng tương tự). Mẫu 2: vị trí các thành phần thể thức bản sao (ô 17–23: đường phân cách, tên cơ quan sao, số - ký hiệu sao, chỉ dẫn loại bản sao…).",
    ext: "doc",
  },
  {
    name: "Mẫu 3 — Kiểu chữ, cỡ chữ các thành phần thể thức",
    file: "/mau-van-ban/Mau-3-cach-hien-thi-ky-tu-tieng-Viet.pdf",
    moTa: "Bảng Times New Roman: tiêu đề 15 đứng đậm; tên cơ quan 14 (cấp trên đứng, cơ quan ban hành đứng đậm); số - ký hiệu 14 đứng; ngày tháng 13 nghiêng; trích yếu công văn 12 nghiêng; tên loại 16 đứng đậm; trích yếu 14 đứng đậm; nội dung 14; 'Nơi nhận:' 13 đứng đậm, danh sách 11; đề ký 14 đứng đậm; chức vụ 14 đứng; họ tên 14 đứng đậm; ký hiệu lưu 8 nghiêng.",
    ext: "pdf",
  },
];

/* ============================================================================
 * 2. DANH MỤC LOẠI VĂN BẢN
 * ========================================================================== */

/** Hướng luân chuyển: LEN = cấp dưới gửi cấp trên; XUONG = cấp trên ban hành xuống; COTRUC = mọi hướng */
export type VanBanHuong = "LEN" | "XUONG" | "COTRUC";

export interface VanBanLoai {
  id: string;
  ten: string;
  /** Viết tắt thể loại trong số - ký hiệu (29-HD mục 3.4). Viết IN HOA, riêng CTr, TTr giữ nguyên. */
  vietTat: string;
  huong: VanBanHuong;
  /** Công văn là loại duy nhất KHÔNG ghi tên loại — trích yếu "V/v…" nghiêng dưới số - ký hiệu + "Kính gửi:" */
  laCongVan: boolean;
  moTa: string;
  /** Nơi nhận chuẩn (Đoàn) — thứ tự từ thẩm quyền cao đến thấp, tập thể đến cá nhân, cuối cùng là Lưu */
  noiNhanMau: string[];
}

export const vanBanLoaiList: VanBanLoai[] = [
  {
    id: "CONG_VAN",
    ten: "Công văn",
    vietTat: "CV",
    huong: "COTRUC",
    laCongVan: true,
    moTa: 'Văn bản trao đổi chính thức mọi hướng: mời, mượn địa điểm, phối hợp, trả lời, đề nghị, yêu cầu cung cấp thông tin… KHÔNG có tên loại. Trích yếu "V/v …" chữ thường nghiêng (cỡ 12) ngay dưới số - ký hiệu; nơi nhận chính ghi sau "Kính gửi:" ở đầu nội dung; nơi liên quan ghi ở Nơi nhận cuối văn bản, dòng đầu là "- Như trên;".',
    noiNhanMau: ["Như trên;", "Cấp trên trực tiếp (để báo cáo);", "Lưu VP."],
  },
  {
    id: "BAO_CAO",
    ten: "Báo cáo",
    vietTat: "BC",
    huong: "LEN",
    laCongVan: false,
    moTa: "Cấp dưới gửi cấp trên: báo cáo định kỳ (tuần/tháng/quý/6 tháng/năm), chuyên đề, tổng kết. Tên loại in hoa đứng đậm + trích yếu chữ thường đứng đậm; thân gồm đặc điểm tình hình, kết quả, đánh giá (ưu điểm, hạn chế, nguyên nhân), phương hướng, đề xuất - kiến nghị.",
    noiNhanMau: [
      "Ban Thường vụ Đoàn cấp trên trực tiếp (để báo cáo);",
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
    moTa: "Cấp dưới trình cấp trên phê duyệt (chương trình, kinh phí, nhân sự, tổ chức hoạt động…). Kết thúc bằng đoạn kính trình/đề nghị phê duyệt; nơi nhận chính là cấp có thẩm quyền quyết định.",
    noiNhanMau: ["Ban Thường vụ Đoàn cấp trên trực tiếp (để xem xét, phê duyệt);", "Lưu VP."],
  },
  {
    id: "KE_HOACH",
    ten: "Kế hoạch",
    vietTat: "KH",
    huong: "XUONG",
    laCongVan: false,
    moTa: "Ban hành xuống cấp dưới thực hiện. Thân gồm: mục đích - yêu cầu; nội dung - hình thức - thời gian - địa điểm (có thể lập bảng thời gian / nội dung / đơn vị phụ trách); phân công; kinh phí; tổ chức thực hiện.",
    noiNhanMau: ["Ban Thường vụ Đoàn cấp trên (để báo cáo);", "Các đơn vị Đoàn trực thuộc (để thực hiện);", "Lưu VP."],
  },
  {
    id: "CHUONG_TRINH",
    ten: "Chương trình",
    vietTat: "CTr",
    huong: "XUONG",
    laCongVan: false,
    moTa: "Khung triển khai hoạt động theo chủ đề hoặc theo năm học: mục tiêu, chỉ tiêu, nội dung chính, tiến độ các giai đoạn, tổ chức thực hiện.",
    noiNhanMau: ["Ban Thường vụ Đoàn cấp trên (để báo cáo);", "Các đơn vị Đoàn trực thuộc (để thực hiện);", "Lưu VP."],
  },
  {
    id: "QUYET_DINH",
    ten: "Quyết định / Quy định",
    vietTat: "QĐ",
    huong: "XUONG",
    laCongVan: false,
    moTa: 'Văn bản có giá trị thi hành: thành lập, chuẩn y, phân công, khen thưởng - kỷ luật; quy định, quy chế. Thân gồm các căn cứ (mỗi căn cứ một dòng, kết thúc ";", căn cứ cuối kết thúc ","), câu "…QUYẾT ĐỊNH:" rồi Điều 1, Điều 2…; điều cuối nêu hiệu lực và đơn vị thi hành.',
    noiNhanMau: ["Ban Thường vụ Đoàn cấp trên (để báo cáo);", "Như Điều 3;", "Lưu VP."],
  },
  {
    id: "CHI_THI",
    ten: "Chỉ thị",
    vietTat: "CT",
    huong: "XUONG",
    laCongVan: false,
    moTa: "Chỉ đạo về tư tưởng, hành động cho cấp dưới trong thời điểm cụ thể.",
    noiNhanMau: ["Ban Thường vụ Đoàn cấp trên (để báo cáo);", "Các đơn vị Đoàn trực thuộc (để thực hiện);", "Lưu VP."],
  },
  {
    id: "THONG_TRI",
    ten: "Thông tri",
    vietTat: "TT",
    huong: "XUONG",
    laCongVan: false,
    moTa: "Phổ biến chủ trương, kết luận của cấp có thẩm quyền cho toàn hệ thống triển khai.",
    noiNhanMau: ["Ban Thường vụ Đoàn cấp trên (để báo cáo);", "Các đơn vị Đoàn trực thuộc (để thực hiện);", "Lưu VP."],
  },
  {
    id: "HUONG_DAN",
    ten: "Hướng dẫn",
    vietTat: "HD",
    huong: "XUONG",
    laCongVan: false,
    moTa: 'Thường do cơ quan tham mưu (Văn phòng, các Ban) ban hành: tên cơ quan 2 dòng (cấp bộ Đoàn / tên Ban), số - ký hiệu "…-HD/BTC" hoặc "…-HD/TĐTN-TNTH"; thủ trưởng ký trực tiếp (CHÁNH VĂN PHÒNG, TRƯỞNG BAN, Q. TRƯỞNG BAN) hoặc cấp phó ký thay "KT.".',
    noiNhanMau: ["Ban Thường vụ Đoàn cấp trên (để báo cáo);", "Các đơn vị Đoàn trực thuộc (để thực hiện);", "Lưu VP."],
  },
  {
    id: "THONG_BAO",
    ten: "Thông báo",
    vietTat: "TB",
    huong: "XUONG",
    laCongVan: false,
    moTa: "Thông báo kết luận của lãnh đạo, kết quả, lịch, thông tin cần phổ biến rộng.",
    noiNhanMau: ["Ban Thường vụ Đoàn cấp trên (để báo cáo);", "Các đơn vị Đoàn trực thuộc (để thực hiện);", "Lưu VP."],
  },
  {
    id: "GIOI_THIEU_MOI",
    ten: "Giấy giới thiệu / Giấy mời",
    /** GGT = Giấy giới thiệu, GM = Giấy mời (viết tắt theo thông lệ; 29-HD không liệt kê riêng) */
    vietTat: "GGT/GM",
    huong: "COTRUC",
    laCongVan: false,
    moTa: "Văn bản đặc thù, được trình bày khổ A5 hoặc giấy mẫu in sẵn. Giấy giới thiệu: giới thiệu cá nhân đến liên hệ, làm việc. Giấy mời: ghi rõ thành phần, thời gian, địa điểm, nội dung, yêu cầu chuẩn bị.",
    noiNhanMau: ["Như trên;", "Lưu VP."],
  },
];

/* ============================================================================
 * 3. HẰNG SỐ TRÌNH BÀY (cho lớp dựng .docx)
 * ========================================================================== */

export interface KieuChu {
  size: number; // pt
  bold?: boolean;
  italic?: boolean;
  upper?: boolean;
  underline?: boolean;
  align?: "left" | "center" | "right" | "justify";
}

export interface TheThucLayout {
  font: string;
  /** Lề trang, đơn vị mm */
  margin: { top: number; bottom: number; left: number; right: number };
  /** Lề mặt sau khi in 2 mặt (chỉ Đoàn quy định) */
  marginMatSau?: { top: number; bottom: number; left: number; right: number };
  /** Thụt đầu dòng đoạn văn, cm */
  firstLineIndentCm: number;
  /** Giãn dòng (bội số): từ đơn 1,0 đến tối đa 1,2 */
  lineSpacing: { min: number; max: number };
  /** Khoảng cách sau đoạn tối đa, pt */
  paragraphAfterMaxPt: number;
  /** Tỷ lệ cột bảng tiêu đề và bảng chữ ký [trái, phải] (%) */
  bangTieuDe: [number, number];
  bangChuKy: [number, number];
  danhSoTrang: string;
  kieuChu: Record<string, KieuChu>;
}

export const THE_THUC_LAYOUT: TheThucLayout = {
  font: "Times New Roman",
  margin: { top: 20, bottom: 20, left: 30, right: 20 },
  marginMatSau: { top: 20, bottom: 20, left: 20, right: 30 },
  firstLineIndentCm: 1.27,
  lineSpacing: { min: 1.0, max: 1.2 },
  paragraphAfterMaxPt: 6,
  bangTieuDe: [45, 55],
  bangChuKy: [45, 55],
  danhSoTrang:
    "Từ trang 2: chữ số Ả-rập, giữa mép trên (header), cỡ 13-14, đứng; không đánh số trang 1. Phụ lục đánh số riêng.",
  // Mẫu 3
  kieuChu: {
    tieuDe: { size: 15, bold: true, upper: true, underline: true, align: "right" }, // ĐOÀN TNCS HỒ CHÍ MINH — gạch chân (dài bằng chữ), canh phải
    coQuanCapTren: { size: 14, upper: true }, // đứng, KHÔNG đậm
    coQuanBanHanh: { size: 14, bold: true, upper: true },
    soKyHieu: { size: 14 },
    diaDiemNgayThang: { size: 13, italic: true, align: "right" }, // canh phải, thẳng mép phải với tiêu đề
    trichYeuCongVan: { size: 12, italic: true },
    chiDanHoiNghi: { size: 12, italic: true },
    chiDanDuThao: { size: 13, bold: true, upper: true },
    doMat: { size: 13, bold: true, upper: true }, // có khung chữ nhật
    doKhan: { size: 13, bold: true, upper: true },
    tenLoai: { size: 16, bold: true, upper: true },
    trichYeu: { size: 14, bold: true },
    kinhGui: { size: 14, bold: true },
    noiDung: { size: 14 },
    phan: { size: 15, bold: true }, // "Phần I" 15-16; tiêu đề phần 14 đứng đậm
    muc: { size: 14, bold: true, upper: true },
    khoan: { size: 14, bold: true },
    diem2: { size: 14, bold: true, italic: true }, // 1.1.
    diem3: { size: 14, italic: true }, // 1.1.2.
    diem4: { size: 14 }, // 1.1.2.1.
    noiNhanNhan: { size: 13, bold: true }, // "Nơi nhận:"
    noiNhanDanhSach: { size: 11 },
    deKy: { size: 14, bold: true, upper: true },
    chucVu: { size: 14, upper: true }, // đứng, KHÔNG đậm
    hoTen: { size: 14, bold: true },
    kyHieuLuu: { size: 8, italic: true },
  },
};

/** 1 cm = 567 DXA (twip); 1 mm = 56,7 DXA */
export const cmToDxa = (cm: number): number => Math.round(cm * 567);
export const mmToDxa = (mm: number): number => Math.round(mm * 56.7);

/* ============================================================================
 * 4. RULEBOOK ĐOÀN — 29-HD/TWĐTN-VP + MẪU 3
 * ========================================================================== */

export const SKILL_THE_THUC_29HD = `
[QUY CHUẨN THỂ THỨC VĂN BẢN ĐOÀN TNCS HỒ CHÍ MINH — HƯỚNG DẪN 29-HD/TWĐTN-VP & MẪU 1, 2, 3]
Mọi văn bản chính thức của Đoàn từ Trung ương đến chi đoàn bắt buộc có đủ 8 thành phần: (1) Tiêu đề; (2) Tên cơ quan ban hành; (3) Số và ký hiệu; (4) Địa điểm và ngày tháng năm; (5) Tên loại và trích yếu nội dung; (6) Nội dung; (7) Chữ ký, thể thức đề ký và dấu; (8) Nơi nhận. Có thể bổ sung: dấu mật, dấu khẩn, chỉ dẫn tài liệu hội nghị/dự thảo, ký hiệu lưu.

1. TRANG VĂN BẢN
- Khổ A4 (210 x 297 mm), in theo chiều dài; bảng biểu lớn không thành phụ lục riêng thì được xoay ngang. Giấy giới thiệu, phiếu gửi… có thể dùng khổ A5.
- Lề mặt trước: trên 20 mm, dưới 20 mm, trái 30 mm, phải 20 mm. Mặt sau (in 2 mặt): trái 20 mm, phải 30 mm.
- Số trang: từ trang 2, chữ số Ả-rập, giữa mép trên (header), cỡ 13-14, đứng; không đánh số trang 1.
- Font Times New Roman cho toàn bộ văn bản.

2. KHỐI ĐẦU TRANG (bảng 2 cột không viền)
 a) Ô 1 — TIÊU ĐỀ (cột phải, dòng đầu): "ĐOÀN TNCS HỒ CHÍ MINH", in hoa, cỡ 15, đứng, đậm, GẠCH CHÂN (nét gạch dài bằng đúng dòng chữ), CANH PHẢI trong cột.
 b) Ô 4 — ĐỊA ĐIỂM, NGÀY THÁNG NĂM (cột phải, dưới tiêu đề, ngang hàng số - ký hiệu): chữ thường, cỡ 13, nghiêng, CANH PHẢI (thẳng mép phải với dòng tiêu đề).
    - Mẫu: "<Địa danh>, ngày DD tháng M năm YYYY". Giữa địa danh và ngày có dấu phẩy.
    - Viết đủ chữ "ngày", "tháng", "năm"; KHÔNG dùng ".", "-", "/" thay thế.
    - Ngày dưới 10 thêm số 0 (ngày 05). Tháng 1, tháng 2 thêm số 0 (tháng 01, tháng 02). Các tháng khác KHÔNG thêm 0 (tháng 3, tháng 9, tháng 11).
    - Địa danh: TW Đoàn → "Hà Nội" (ban hành tại phía Nam: "TP. Hồ Chí Minh"); tỉnh/thành đoàn và các ban → tên tỉnh/thành phố nơi đặt trụ sở; Đoàn huyện, xã, phường, thị trấn → tên riêng của đơn vị hành chính đó; Đoàn khối/ngành thuộc tỉnh → tên thành phố/thị xã tỉnh lỵ; Đoàn khối/ngành thuộc huyện → tên xã/phường/thị trấn nơi đặt trụ sở.
    - Địa danh mang tên người, một âm tiết hoặc theo số thứ tự thì ghi thêm cấp hành chính: "TP. Hồ Chí Minh", "Thành phố Huế", "Quận 12", "Phường 1".
    - Chưa có ngày ký chính thức → để trống: "<Địa danh>, ngày    tháng    năm 2026".
 c) Ô 2 — TÊN CƠ QUAN BAN HÀNH (cột trái, dòng đầu), in hoa, cỡ 14. Dòng tên tổ chức cấp trên: ĐỨNG, KHÔNG ĐẬM. Dòng tên cơ quan ban hành: ĐỨNG, ĐẬM. Ngay dưới là ba dấu sao "***" canh giữa.
    - TW Đoàn (BCH, BTV, Ban Bí thư): 1 dòng "BAN CHẤP HÀNH TRUNG ƯƠNG".
    - Tỉnh/thành đoàn, Đoàn trực thuộc TW: 1 dòng "BAN CHẤP HÀNH ĐOÀN + TÊN ĐƠN VỊ" (được viết tắt "BCH", "TP."): "BCH ĐOÀN TP. HỒ CHÍ MINH", "BCH ĐOÀN KHỐI CÁC CƠ QUAN TRUNG ƯƠNG". KHÔNG ghi tên TW Đoàn phía trên.
    - Cấp huyện và tương đương; Đoàn cơ sở (xã, phường, thị trấn, trường học…); Đoàn cơ sở được giao quyền cấp trên cơ sở; Đoàn bộ phận: 2 dòng — dòng 1 tên tổ chức Đoàn cấp trên trực tiếp, dòng 2 "BCH ĐOÀN + TÊN ĐƠN VỊ". VD: "THÀNH ĐOÀN HÀ NỘI / BCH ĐOÀN HUYỆN TỪ LIÊM"; "HUYỆN ĐOÀN CHỢ LÁCH / BCH ĐOÀN XÃ SƠN ĐỊNH"; "ĐOÀN ĐẠI HỌC QUỐC GIA HÀ NỘI / BCH ĐOÀN TRƯỜNG ĐH NGOẠI NGỮ".
    - Liên chi đoàn: "ĐOÀN TRƯỜNG ĐẠI HỌC BÁCH KHOA / BCH LIÊN CHI ĐOÀN KHOA ĐIỀU KHIỂN TỰ ĐỘNG".
    - Chi đoàn (có hoặc không có BCH): "ĐOÀN XÃ SÍN THẦU / CHI ĐOÀN BẢN A PA CHẢI".
    - Phân đoàn: dòng 1 là CHI ĐOÀN cấp trên: "CHI ĐOÀN CQ TỈNH ĐOÀN HÀ NAM / PHÂN ĐOÀN BAN TUYÊN GIÁO".
    - Ban tham mưu, Văn phòng, Tiểu ban, Hội đồng, Tổ công tác: dòng 1 cấp bộ Đoàn trực thuộc, dòng 2 tên ban/tổ: "BAN CHẤP HÀNH TRUNG ƯƠNG / VĂN PHÒNG"; "BCH ĐOÀN THÀNH PHỐ HÀ NỘI / BAN TUYÊN GIÁO".
    - Nhiều cơ quan cùng ban hành: nối bằng gạch nối: "BAN CHẤP HÀNH TRUNG ƯƠNG / BAN TỔ CHỨC - VĂN PHÒNG".
    - Văn bản Đại hội: ghi Đại hội đại biểu hay Đại hội toàn thể và nhiệm kỳ: "ĐẠI HỘI ĐẠI BIỂU / ĐOÀN QUẬN HOÀN KIẾM / NHIỆM KỲ 2027 - 2032"; văn bản của Đoàn Chủ tịch, Đoàn Thư ký, Ban Thẩm tra tư cách đại biểu, Ban Kiểm phiếu thêm 1 dòng tên bộ phận đó ngay dưới.
 d) Ô 3 — SỐ VÀ KÝ HIỆU (cột trái, dưới "***", canh giữa theo tên cơ quan, ngang hàng ô 4): cỡ 14, đứng.
    - Cú pháp: "Số: <số>-<THỂ LOẠI>/<CƠ QUAN>-<ĐƠN VỊ THAM MƯU>". Số - thể loại nối bằng "-", thể loại / cơ quan bằng "/", cơ quan - đơn vị tham mưu bằng "-". Ký hiệu viết IN HOA (riêng CTr, TTr).
    - Số thứ tự đánh liên tục từ 01 cho mỗi loại văn bản trong một nhiệm kỳ của cấp bộ Đoàn.
    - Văn bản do chính ban tham mưu ban hành: "Số: 245-BC/BTC" (không có phần cơ quan).
    - Văn bản Đại hội (Đoàn Chủ tịch, Đoàn Thư ký, Ban Thẩm tra, Ban Kiểm phiếu): đánh số liên tục cho mọi loại, "Số: 01/ĐH".
    - Tiểu ban, Tổ công tác, Hội đồng, Đoàn kiểm tra: đánh số liên tục, ký hiệu là tên viết tắt (TB, TCT, HĐ, ĐKT).
    - Thể loại: QĐ (Quyết định, Quy định), CT (Chỉ thị), CTr (Chương trình), TT (Thông tri), TTr (Tờ trình), BC (Báo cáo), CV (Công văn), KH (Kế hoạch), HD (Hướng dẫn), TB (Thông báo), GGT (Giấy giới thiệu), GM (Giấy mời), BS (Bản sao).
    - Cơ quan: TWĐTN (BBT, BTV, BCH TW Đoàn); UBKTTWĐ (UBKT TW Đoàn); TĐTN (tỉnh, thành đoàn thuộc TW); ĐTNK (Đoàn khối các cơ quan TW, Đoàn khối Doanh nghiệp TW); ĐTNCA (Đoàn Thanh niên Bộ Công an); BCSĐ (Ban Cán sự Đoàn); ĐTN (Đoàn cấp quận và tương đương, Đoàn cơ sở, Đoàn cơ sở được giao quyền, Đoàn bộ phận); CĐCS (Chi đoàn cơ sở); CĐ (Chi đoàn); PĐ (Phân đoàn).
    - Đơn vị tham mưu: VP (Văn phòng), BTC (Ban Tổ chức), BKT (Ban Kiểm tra), TCKT (Ban Tổ chức - Kiểm tra), TNTH (Ban Thanh niên trường học), ĐKTHTN (Ban Đoàn kết tập hợp thanh niên), TTNTW (Trung tâm Thanh thiếu niên TW)…
    - Ví dụ: "Số: 245-CV/TWĐTN-VP"; "Số: 245-BC/TĐTN-TCKT"; "Số: 245-BC/BTC"; "Số: 15-KH/ĐTN"; "Số: 03-KH/ĐTN-TNTH"; "Số: 01-TTr/CĐ"; "Số: 01/ĐH".
    - Chưa cấp số → để trống phần số: "Số:     -KH/ĐTN".
 e) Ô 6, 7 (bổ sung, dưới số - ký hiệu): dấu "MẬT" (in hoa, 13, đứng, đậm, có khung); dấu "KHẨN" / "THƯỢNG KHẨN" / "HỎA TỐC" (in hoa, 13, đứng, đậm) dưới dấu mật; chỉ dẫn tài liệu hội nghị (12, nghiêng); "DỰ THẢO LẦN THỨ…" (in hoa, 13, đứng, đậm).

3. TÊN LOẠI VÀ TRÍCH YẾU (canh giữa trang)
 a) Mọi văn bản trừ công văn: Tên loại (ô 8) IN HOA, cỡ 16, đứng, đậm ("BÁO CÁO", "KẾ HOẠCH", "QUYẾT ĐỊNH"…). Trích yếu (ô 9) ngay dưới, chữ thường, cỡ 14, đứng, đậm (viết hoa chữ cái đầu). Dưới cùng là dòng gạch ngang NÉT RỜI "-----------" canh giữa.
 b) Công văn: KHÔNG ghi tên loại. Trích yếu (ô 5) ngay dưới số - ký hiệu, chữ thường, cỡ 12, nghiêng, không đậm, đặt trong ngoặc kép, bắt đầu "V/v": "V/v giới thiệu thanh niên tiêu biểu năm 2026". Nơi nhận chính (ô 10) đầu nội dung: "Kính gửi: …" (cỡ 14, đứng, đậm); nhiều nơi nhận chính thêm "Đồng kính gửi: …".

4. NỘI DUNG (ô 11)
- Chữ thường, cỡ 14, đứng; toàn bộ lời văn cùng một cỡ chữ; dàn đều 2 lề (justify).
- Đầu dòng lùi 1,27 cm; khoảng cách đoạn tối đa 6 pt; giãn dòng từ đơn (1,0) đến tối đa 1,2.
- Căn cứ: mỗi căn cứ một dòng, cuối dòng ";", căn cứ cuối cùng kết thúc bằng ",". Quyết định: sau căn cứ là dòng "QUYẾT ĐỊNH:" (in hoa, đậm, canh giữa) rồi đến các Điều.
- Phân cấp đề mục:
  + Phần: "Phần I" trên một dòng riêng, canh giữa, chữ thường, cỡ 15-16, đứng, đậm, số La Mã; tiêu đề phần ngay dưới, canh giữa, chữ thường, cỡ 14, đứng, đậm.
  + Mục: "I.", "II." cách lề trái 1 default tab; tiêu đề cùng hàng, IN HOA, cỡ 14, đứng, đậm: "I. KẾT QUẢ THỰC HIỆN".
  + Khoản: "1.", "2." cỡ 14, đứng, đậm; tiêu đề khoản (nếu có) chữ thường cùng dòng, đứng, đậm.
  + Điểm: "1.1." nghiêng đậm; "1.1.2." nghiêng; "1.1.2.1." đứng. Gạch đầu dòng "- " chữ thường, đứng.
- Giữ nguyên 100% số liệu được cung cấp; không bịa số liệu, tên người, ngày tháng; thông tin còn thiếu ghi [CẦN BỔ SUNG].
- Không dùng markdown (#, **, *, \`), không dùng thẻ HTML (<b>, <u>, <i>, <br>…), không dùng emoji hay ký tự trang trí. Văn bản là chữ thuần, mỗi thành phần một dòng.

5. NƠI NHẬN VÀ CHỮ KÝ (bảng 2 cột không viền cuối văn bản)
 a) Nơi nhận (ô 12, cột trái): "Nơi nhận:" cỡ 13, đứng, đậm, ngang hàng thể thức đề ký. Danh sách cỡ 11, đứng; mỗi địa chỉ bắt đầu "- ", cuối dòng ";", địa chỉ cuối cùng kết thúc ".".
    - Mục đích ghi trong ngoặc đơn ngay sau địa chỉ: (để báo cáo), (để thực hiện), (để phối hợp), (để biết).
    - Thứ tự: thẩm quyền cao → thấp; Trung ương → cơ sở; tập thể → cá nhân; dòng cuối là nơi lưu.
    - Nơi lưu ghi cơ quan lưu trữ và đơn vị tham mưu (nếu không phải Văn phòng), không có dấu hai chấm: "- Lưu VP.", "- Lưu TNNT, VT-LT. (4b)". Số bản (nếu cần) ghi trong ngoặc đơn.
    - Công văn: dòng đầu "- Như trên;" rồi các nơi liên quan và nơi lưu.
 b) Khối chữ ký (ô 13-15, cột phải, canh giữa):
    - Thể thức đề ký: in hoa, 14, đứng, đậm.
      * Cơ quan lãnh đạo (Đại hội, BCH, BTV, Ban Bí thư) ký "TM.": "TM. BAN THƯỜNG VỤ TỈNH ĐOÀN", "TM. BAN CHẤP HÀNH ĐOÀN TRƯỜNG", "TM. ĐOÀN CHỦ TỊCH", "TM. ĐOÀN THƯ KÝ".
      * Chi đoàn có BCH: "TM. BAN CHẤP HÀNH CHI ĐOÀN"; không có BCH: "TM. CHI ĐOÀN".
      * Cơ quan tham mưu làm việc theo chế độ thủ trưởng: cấp trưởng ký trực tiếp, không có dòng đề ký ("CHÁNH VĂN PHÒNG", "TRƯỞNG BAN", "Q. TRƯỞNG BAN"); cấp phó ký thay: "KT. TRƯỞNG BAN" / "PHÓ TRƯỞNG BAN".
      * Thừa lệnh: "TL. BAN THƯỜNG VỤ TỈNH ĐOÀN" / "CHÁNH VĂN PHÒNG" (hoặc "PHÓ CHÁNH VĂN PHÒNG"). Người được ủy quyền không ủy quyền tiếp.
    - Chức vụ người ký: in hoa, 14, đứng, KHÔNG đậm ("BÍ THƯ", "PHÓ BÍ THƯ", "PHÓ BÍ THƯ THƯỜNG TRỰC", "TRƯỞNG ĐOÀN").
    - Chừa 3-4 dòng trống để ký và đóng dấu (dấu đỏ trùm khoảng 1/3 chữ ký về bên trái).
    - Họ tên người ký: chữ thường viết hoa chữ cái đầu, 14, đứng, đậm. Không ghi học hàm, học vị, danh hiệu trước tên.
 c) Ký hiệu lưu, mã số văn bản (ô 16): lề trái chân trang, cỡ 8, nghiêng (VD: "BC_T10_2026/BanTNTH").

6. BẢN SAO (Mẫu 2): dưới đường phân cách nội dung được sao (ô 17) trình bày: tên cơ quan sao (ô 18, góc trái), "Số: …/BS" (ô 19), chỉ dẫn loại bản sao "SAO Y BẢN CHÍNH" / "SAO LỤC" / "TRÍCH SAO" (ô 20, góc phải), địa điểm ngày sao (ô 21), thể thức đề ký - chức vụ - chữ ký - họ tên - dấu (ô 22), nơi nhận bản sao (ô 23).

7. Văn bản liên tịch với cơ quan Đảng, Nhà nước, tổ chức khác: theo thể thức của cơ quan chủ trì. Đơn vị sự nghiệp, doanh nghiệp của Đoàn dùng con dấu Nhà nước: theo thể thức văn bản Nhà nước.
`.trim();

/** Tương thích ngược */
export const THE_THUC_RULEBOOK = SKILL_THE_THUC_29HD;

export const SYSTEM_PROMPT_29HD_COMPACT = `Bạn là chuyên gia soạn thảo văn bản hành chính của Đoàn TNCS Hồ Chí Minh, tuân thủ tuyệt đối Hướng dẫn số 29-HD/TWĐTN-VP và Mẫu 3.

NHIỆM VỤ: Từ thông tin đầu vào (cấp tổ chức, đơn vị ban hành, cấp trên trực tiếp, loại văn bản, người ký, nội dung), xác định chính xác từng thành phần thể thức và soạn văn bản hoàn chỉnh.

QUY TẮC BẮT BUỘC:

1. TIÊU ĐỀ (góc phải, dòng đầu): luôn là "ĐOÀN TNCS HỒ CHÍ MINH", in hoa đậm, gạch chân, canh phải.

2. TÊN CƠ QUAN BAN HÀNH (góc trái, in hoa; dòng cấp trên không đậm, dòng cơ quan ban hành đậm; dưới cùng "***"):
- TW Đoàn: 1 dòng "BAN CHẤP HÀNH TRUNG ƯƠNG".
- Tỉnh/thành đoàn, Đoàn trực thuộc TW: 1 dòng "BCH ĐOÀN + TÊN ĐƠN VỊ" (VD: BCH ĐOÀN TỈNH AN GIANG; BCH ĐOÀN TP. HỒ CHÍ MINH). Không ghi TW Đoàn phía trên.
- Cấp huyện, Đoàn cơ sở, Đoàn bộ phận: 2 dòng — tên Đoàn cấp trên trực tiếp / "BCH ĐOÀN + TÊN ĐƠN VỊ" (VD: THÀNH ĐOÀN HÀ NỘI / BCH ĐOÀN HUYỆN TỪ LIÊM; ĐOÀN ĐẠI HỌC QUỐC GIA HÀ NỘI / BCH ĐOÀN TRƯỜNG ĐH NGOẠI NGỮ).
- Liên chi đoàn: tên Đoàn cấp trên / "BCH LIÊN CHI ĐOÀN + TÊN".
- Chi đoàn: tên Đoàn cấp trên / "CHI ĐOÀN + TÊN". Phân đoàn: tên chi đoàn cấp trên / "PHÂN ĐOÀN + TÊN".
- Ban tham mưu, Văn phòng, Tiểu ban, Tổ công tác: tên cấp bộ Đoàn / tên ban (VD: BAN CHẤP HÀNH TRUNG ƯƠNG / VĂN PHÒNG).
- Đại hội: "ĐẠI HỘI ĐẠI BIỂU / ĐOÀN … / NHIỆM KỲ …" (+ dòng "ĐOÀN CHỦ TỊCH", "BAN KIỂM PHIẾU"… nếu là văn bản của bộ phận đó).

3. SỐ VÀ KÝ HIỆU (dưới "***"): "Số: [số]-[LOẠI]/[CƠ QUAN]-[ĐƠN VỊ THAM MƯU]".
- Ban tham mưu tự ban hành: "Số: 245-BC/BTC". Đại hội: "Số: 01/ĐH".
- LOẠI: CV, BC, KH, QĐ, CT, CTr, TT, TTr, HD, TB, GGT, GM.
- CƠ QUAN: TWĐTN | UBKTTWĐ | TĐTN | ĐTNK | ĐTNCA | BCSĐ | ĐTN (quận/huyện, cơ sở, bộ phận) | CĐCS | CĐ | PĐ.
- Không được cung cấp số → để trống: "Số:     -KH/ĐTN".

4. ĐỊA ĐIỂM, NGÀY THÁNG (góc phải, dưới tiêu đề, ngang hàng số - ký hiệu, nghiêng, canh phải thẳng mép với tiêu đề):
- "<Địa danh>, ngày DD tháng M năm YYYY". Ngày < 10 thêm 0; CHỈ tháng 1, 2 thêm 0 (tháng 01, 02); tháng 3–12 giữ nguyên (tháng 3, tháng 11). Không dùng ".", "-", "/".
- TW Đoàn: "Hà Nội". Tỉnh/thành: tên tỉnh/TP. Huyện/xã/phường/thị trấn: tên riêng đơn vị đó. Địa danh tên người, 1 âm tiết hoặc số thứ tự phải thêm cấp: "TP. Hồ Chí Minh", "Thành phố Huế", "Quận 12", "Phường 1".
- Không được cung cấp ngày → "<Địa danh>, ngày    tháng    năm <năm hiện tại>".

5. TÊN LOẠI VÀ TRÍCH YẾU:
- CÔNG VĂN: KHÔNG ghi chữ "CÔNG VĂN". Trích yếu ngay dưới số - ký hiệu, nghiêng, không đậm, trong ngoặc kép: "V/v …". Nội dung mở đầu "Kính gửi: …" (và "Đồng kính gửi: …" nếu có).
- LOẠI KHÁC: TÊN LOẠI in hoa đậm canh giữa; dưới là trích yếu chữ thường đậm canh giữa; dưới cùng đường gạch nét rời "-----------".

6. NỘI DUNG: chữ thường, đứng, dàn đều 2 lề, đầu dòng lùi 1,27 cm.
- Căn cứ: mỗi căn cứ một dòng, kết thúc ";", căn cứ cuối kết thúc ",".
- Đề mục: Phần (Phần I) → Mục (I. IN HOA ĐẬM) → Khoản (1. đậm) → Điểm (1.1. nghiêng đậm; 1.1.2. nghiêng; 1.1.2.1. đứng) → gạch "- ".
- Giữ nguyên số liệu; thiếu thông tin ghi [CẦN BỔ SUNG] (một lần, không lặp); không dùng markdown, không dùng thẻ HTML (<b>, <u>, <br>…) — trả về chữ thuần.

7. THỂ THỨC ĐỀ KÝ (góc phải, dưới nội dung):
- Cơ quan lãnh đạo (Đại hội, BCH, BTV, Ban Bí thư): "TM." (VD: TM. BAN THƯỜNG VỤ TỈNH ĐOÀN / PHÓ BÍ THƯ).
- Chi đoàn có BCH: TM. BAN CHẤP HÀNH CHI ĐOÀN / BÍ THƯ. Không có BCH: TM. CHI ĐOÀN / BÍ THƯ.
- Cơ quan tham mưu: cấp trưởng ký trực tiếp (CHÁNH VĂN PHÒNG, TRƯỞNG BAN); cấp phó: KT. TRƯỞNG BAN / PHÓ TRƯỞNG BAN.
- Thừa lệnh: TL. BAN THƯỜNG VỤ TỈNH ĐOÀN / CHÁNH VĂN PHÒNG.
- Chức vụ in hoa không đậm; họ tên viết hoa chữ cái đầu, đậm.

8. NƠI NHẬN (góc trái, ngang hàng thể thức đề ký):
- "Nơi nhận:" đậm. Mỗi dòng bắt đầu "- ", kết thúc ";", dòng cuối kết thúc ".".
- Thứ tự: thẩm quyền cao → thấp; tập thể → cá nhân; cuối cùng "- Lưu VP." (không có dấu hai chấm).
- Công văn: dòng đầu "- Như trên;".
- Trình bày tuần tự từng dòng: khối "Nơi nhận:" và danh sách trước, sau đó mới đến dòng thể thức đề ký, chức vụ, họ tên — KHÔNG ghép nơi nhận và chữ ký trên cùng một dòng, không căn cột bằng dấu cách.

9. CHỐNG BỊA NỘI DUNG (BẮT BUỘC):
- Thông tin đơn vị (tên cơ quan, số - ký hiệu, địa điểm, người ký, nơi nhận) do hệ thống cung cấp — dùng nguyên văn, không tự đặt, không lấy tên đơn vị nào khác.
- Chỉ viết từ dữ liệu người dùng cung cấp. Không thêm hoạt động, số liệu, ngày tháng, tên người, tên đơn vị, căn cứ, nghị quyết nào không có trong dữ liệu.
- Mọi ví dụ trong quy tắc trên chỉ minh họa cú pháp; TUYỆT ĐỐI không chép tên đơn vị, địa danh, họ tên, số liệu trong ví dụ vào văn bản.`;

/* ============================================================================
 * 6. CHỌN PROMPT THEO HỆ THỐNG
 * ========================================================================== */

/** Yêu cầu AI trả JSON đúng VanBanStructuredOutput (dùng khi lớp docx tự dựng định dạng) */
export const JSON_OUTPUT_INSTRUCTION = `ĐỊNH DẠNG TRẢ VỀ: Chỉ trả về MỘT đối tượng JSON hợp lệ, không kèm giải thích, không bọc trong \`\`\`. Các khóa:
{
  "tieu_de": "ĐOÀN TNCS HỒ CHÍ MINH",
  "co_quan_cap_tren": string | null,
  "co_quan_ban_hanh": string,
  "so_ky_hieu": string (có tiền tố "Số: "),
  "trich_yeu_cong_van": string | null (chỉ công văn, bắt đầu "V/v", không kèm ngoặc kép),
  "dia_diem_ngay_thang": string,
  "ten_loai_vb": string | null (IN HOA; công văn = null),
  "trich_yeu_vb": string | null,
  "kinh_gui": string | null (không kèm chữ "Kính gửi:"),
  "dong_kinh_gui": string | null,
  "noi_dung_html_hoac_markdown": string (CHỈ phần thân: từ đoạn mở đầu đến hết mục cuối. KHÔNG chứa tiêu đề, tên cơ quan, số - ký hiệu, ngày tháng, tên loại, trích yếu, "Nơi nhận", thể thức đề ký, chức vụ, họ tên, "(Chữ ký)". Văn bản thuần, mỗi đoạn một dòng, KHÔNG markdown),
  "noi_dung_blocks": [{ "kieu": "can_cu" | "doan" | "phan" | "tieu_de_phan" | "muc" | "khoan" | "diem" | "diem2" | "diem3" | "gach" | "dieu" | "quyet_dinh", "text": string }],
  "noi_nhan": string[] (mỗi phần tử dạng "- …;" , phần tử cuối "- Lưu …."),
  "the_thuc_de_ky": string ("" nếu thủ trưởng ký trực tiếp),
  "chuc_vu_ky": string,
  "ten_nguoi_ky": string | null
}
Nơi nhận chỉ nằm trong mảng "noi_nhan"; người ký chỉ nằm trong "the_thuc_de_ky", "chuc_vu_ky", "ten_nguoi_ky".
Trong noi_dung_blocks, "text" KHÔNG lặp lại ký hiệu đề mục đã thể hiện bằng "kieu" trừ số thứ tự (VD: kieu "muc", text "I. MỤC ĐÍCH, YÊU CẦU").`;

export function getTheThucRulebook(): string {
  return SKILL_THE_THUC_29HD;
}

/** System prompt hoàn chỉnh cho /api/ai/tro-ly */
export function getSystemPrompt(opts: { json?: boolean } = {}): string {
  const base = SYSTEM_PROMPT_29HD_COMPACT;
  return opts.json ? `${base}\n\n${JSON_OUTPUT_INSTRUCTION}` : base;
}

/* ============================================================================
 * 6b. HỒ SƠ ĐƠN VỊ BAN HÀNH — khối thể thức do CODE dựng, AI không được tự đặt
 * ========================================================================== */

export type CapToChuc =
  | "TW"
  | "TINH" // tỉnh, thành đoàn, Đoàn trực thuộc TW
  | "HUYEN" // quận, huyện và tương đương
  | "CO_SO"
  | "LIEN_CHI"
  | "CHI_DOAN"
  | "PHAN_DOAN"
  | "BAN_THAM_MUU";

export interface DonViBanHanh {
  id: string;
  capToChuc: CapToChuc;
  /** Dòng 1 (đứng, không đậm) — bỏ trống với cấp TW, cấp tỉnh */
  coQuanCapTren?: string | null;
  /** Dòng tên cơ quan ban hành (đứng, đậm), IN HOA */
  coQuanBanHanh: string;
  /** Viết tắt cơ quan trong số - ký hiệu: TWĐTN, TĐTN, ĐTN, CĐ… */
  kyHieuCoQuan: string;
  /** Đơn vị tham mưu mặc định trong ký hiệu (VP, TCKT…) — bỏ trống nếu không ghi */
  donViThamMuu?: string | null;
  diaDanh: string;
  /** Cách gọi chủ thể trong lời văn: "Ban Thường vụ Thành Đoàn TP. Hồ Chí Minh" */
  chuTheTrongVanBan: string;
  deKyMacDinh: string; // "TM. BAN THƯỜNG VỤ THÀNH ĐOÀN" | "" (thủ trưởng ký trực tiếp)
  chucVuKyMacDinh: string; // "BÍ THƯ"
  nguoiKyMacDinh?: string | null;
  /** Nơi nhận theo id loại văn bản, khóa "MAC_DINH" dùng cho các loại còn lại (không kèm dòng Lưu, không kèm "Như trên") */
  noiNhanTheoLoai?: Partial<Record<string, string[]>>;
  noiLuu: string; // "Lưu VP."
}

/** Hồ sơ mẫu — khớp file mẫu đầu ra "Bao_cao_tuan_ThanhDoan_TPHCM". Bổ sung đơn vị khác theo cùng cấu trúc. */
export const DON_VI_PRESETS: Record<string, DonViBanHanh> = {
  THANH_DOAN_TPHCM: {
    id: "THANH_DOAN_TPHCM",
    capToChuc: "TINH",
    coQuanCapTren: null,
    coQuanBanHanh: "BCH ĐOÀN TP. HỒ CHÍ MINH",
    kyHieuCoQuan: "TĐTN",
    donViThamMuu: null,
    diaDanh: "TP. Hồ Chí Minh",
    chuTheTrongVanBan: "Ban Thường vụ Thành Đoàn TP. Hồ Chí Minh",
    deKyMacDinh: "TM. BAN THƯỜNG VỤ THÀNH ĐOÀN",
    chucVuKyMacDinh: "BÍ THƯ",
    nguoiKyMacDinh: null,
    noiNhanTheoLoai: {
      BAO_CAO: ["Ban Bí thư Trung ương Đoàn (để báo cáo);", "Thường trực Thành ủy (để báo cáo);"],
    },
    noiLuu: "Lưu VP.",
  },
};

/* ----------------------------------------------------------------------------
 * 6c. Suy hồ sơ đơn vị ban hành từ cây tổ chức (org_units) — không cần khai báo tay từng đơn vị
 * -------------------------------------------------------------------------- */

/** Một tổ chức Đoàn trên cây đơn vị. orgLevel: 1 TW, 2 tỉnh/thành và tương đương, 3 xã/phường, 4 trường, 5 chi đoàn */
export interface ToChucDoan {
  id?: string | number;
  name: string;
  shortName?: string | null;
  orgLevel: number;
  orgBlock?: string | null;
}

const TIEN_TO_DOAN = /^Đoàn\s+TNCS\s+Hồ\s+Chí\s+Minh\s+/i;
const phanTenToChuc = (t: ToChucDoan) => t.name.replace(TIEN_TO_DOAN, "").trim();
const hoaVi = (s: string) => s.toLocaleUpperCase("vi");
const vietHoaDau = (s: string) => (s ? s.charAt(0).toLocaleUpperCase("vi") + s.slice(1) : s);

/** "Đoàn TNCS Hồ Chí Minh Thành phố Hải Phòng" → { loai: "TP", ten: "Hải Phòng" } */
const tachTinhThanh = (t: ToChucDoan): { loai: "TINH" | "TP"; ten: string } | null => {
  const m = phanTenToChuc(t).match(/^(Tỉnh|Thành phố)\s+(.+)$/i);
  return m ? { loai: /^tỉnh$/i.test(m[1]) ? "TINH" : "TP", ten: m[2].trim() } : null;
};

/** Địa danh cấp tỉnh — tên người / một âm tiết thì ghi thêm cấp hành chính (29-HD mục 2b) */
const diaDanhTinhThanh = (tt: { loai: "TINH" | "TP"; ten: string }) =>
  tt.ten === "Hồ Chí Minh"
    ? "TP. Hồ Chí Minh"
    : tt.ten.split(/\s+/).length === 1
      ? `${tt.loai === "TP" ? "Thành phố" : "Tỉnh"} ${tt.ten}`
      : tt.ten;

/** Địa danh cơ sở: "phường Xuân Hòa" → "Xuân Hòa"; "Phường 1" → "Phường 1" */
const diaDanhCoSo = (phanTen: string): string | null => {
  const m = phanTen.match(/^(xã|phường|thị trấn|đặc khu)\s+(.+)$/i);
  if (!m) return null;
  const ten = m[2].trim();
  return /^\d/.test(ten) || ten.split(/\s+/).length === 1 ? `${vietHoaDau(m[1].toLowerCase())} ${ten}` : ten;
};

/** Tên gọi tổ chức trong lời văn: "Tỉnh Đoàn Tuyên Quang", "Thành Đoàn TP. Hồ Chí Minh", "Đoàn phường Xuân Hòa" */
export function tenGoiToChuc(t: ToChucDoan): string {
  if (t.orgLevel === 1) return "Trung ương Đoàn";
  const tt = t.orgLevel === 2 ? tachTinhThanh(t) : null;
  if (tt) return tt.loai === "TINH" ? `Tỉnh Đoàn ${tt.ten}` : `Thành Đoàn ${tt.ten === "Hồ Chí Minh" ? "TP. Hồ Chí Minh" : tt.ten}`;
  const r = phanTenToChuc(t);
  return /^(chi đoàn|liên chi đoàn|đoàn|ban)\b/i.test(r) ? vietHoaDau(r) : `Đoàn ${r}`;
}

/**
 * Dựng hồ sơ đơn vị ban hành theo 29-HD từ tổ chức và chuỗi cấp trên (gần nhất trước).
 * Trả kèm cảnh báo khi phải suy đoán (khối cơ quan, lực lượng vũ trang, thiếu địa danh…).
 */
export function donViTuToChuc(dv: ToChucDoan, capTren: ToChucDoan[] = []): { donVi: DonViBanHanh; canhBao: string[] } {
  const canhBao: string[] = [];
  const id = `ORG_${dv.id ?? phanTenToChuc(dv)}`;
  const r = phanTenToChuc(dv);

  if (dv.orgLevel === 1) {
    return {
      canhBao,
      donVi: {
        id, capToChuc: "TW", coQuanCapTren: null, coQuanBanHanh: "BAN CHẤP HÀNH TRUNG ƯƠNG", kyHieuCoQuan: "TWĐTN",
        donViThamMuu: null, diaDanh: "Hà Nội", chuTheTrongVanBan: "Ban Bí thư Trung ương Đoàn",
        deKyMacDinh: "TM. BAN BÍ THƯ", chucVuKyMacDinh: "BÍ THƯ",
        noiNhanTheoLoai: { BAO_CAO: ["Ban Bí thư Trung ương Đảng (để báo cáo);"] }, noiLuu: "Lưu VP.",
      },
    };
  }

  if (dv.orgLevel === 2) {
    const tt = tachTinhThanh(dv);
    if (tt) {
      const tp = tt.loai === "TP";
      return {
        canhBao,
        donVi: {
          id, capToChuc: "TINH", coQuanCapTren: null,
          coQuanBanHanh: `BCH ĐOÀN ${tp ? "TP. " : "TỈNH "}${hoaVi(tt.ten)}`,
          kyHieuCoQuan: "TĐTN", donViThamMuu: null, diaDanh: diaDanhTinhThanh(tt),
          chuTheTrongVanBan: `Ban Thường vụ ${tenGoiToChuc(dv)}`,
          deKyMacDinh: `TM. BAN THƯỜNG VỤ ${tp ? "THÀNH ĐOÀN" : "TỈNH ĐOÀN"}`, chucVuKyMacDinh: "BÍ THƯ",
          noiNhanTheoLoai: {
            BAO_CAO: ["Ban Bí thư Trung ương Đoàn (để báo cáo);", `Thường trực ${tp ? "Thành ủy" : "Tỉnh ủy"} (để báo cáo);`],
          },
          noiLuu: "Lưu VP.",
        },
      };
    }
    // Đoàn khối, lực lượng vũ trang trực thuộc TW — thể thức riêng, chỉ suy gần đúng
    canhBao.push(`Hồ sơ thể thức của "${dv.name}" được suy tự động — cần kiểm tra lại tên cơ quan, ký hiệu và thể thức đề ký.`);
    const kyHieu = /công an/i.test(dv.name) ? "ĐTNCA" : /khối|cơ quan/i.test(dv.name) ? "ĐTNK" : "ĐTN";
    return {
      canhBao,
      donVi: {
        id, capToChuc: "TINH", coQuanCapTren: null,
        coQuanBanHanh: /^(đoàn|ban)\b/i.test(r) ? `BCH ${hoaVi(r)}` : `BCH ĐOÀN ${hoaVi(r)}`,
        kyHieuCoQuan: kyHieu, donViThamMuu: null, diaDanh: "Hà Nội",
        chuTheTrongVanBan: `Ban Thường vụ ${tenGoiToChuc(dv)}`,
        deKyMacDinh: "TM. BAN THƯỜNG VỤ", chucVuKyMacDinh: "BÍ THƯ",
        noiNhanTheoLoai: { BAO_CAO: ["Ban Bí thư Trung ương Đoàn (để báo cáo);"] }, noiLuu: "Lưu VP.",
      },
    };
  }

  // Cấp cơ sở, liên chi đoàn, chi đoàn: 2 dòng tên cơ quan (dòng 1 là tổ chức Đoàn cấp trên trực tiếp)
  const cha = capTren[0];
  if (!cha) canhBao.push("Không tìm thấy tổ chức Đoàn cấp trên trực tiếp — dòng tên cấp trên để trống.");
  const laChiDoan = /^chi đoàn\b/i.test(r);
  const laLienChi = /^liên chi đoàn\b/i.test(r);
  const tenDonVi = r.replace(/^đoàn\s+/i, "");

  let diaDanh = diaDanhCoSo(tenDonVi);
  for (const a of capTren) {
    if (diaDanh) break;
    if (a.orgLevel >= 3) diaDanh = diaDanhCoSo(phanTenToChuc(a).replace(/^đoàn\s+/i, ""));
    else if (a.orgLevel === 2) {
      const tt = tachTinhThanh(a);
      if (tt) {
        diaDanh = diaDanhTinhThanh(tt);
        canhBao.push(`Địa danh lấy theo ${tt.loai === "TP" ? "thành phố" : "tỉnh"} — sửa lại nếu trụ sở đặt tại xã, phường cụ thể.`);
      }
    }
  }
  if (!diaDanh) {
    diaDanh = "…";
    canhBao.push("Chưa xác định được địa danh ban hành — cần điền tay.");
  }

  const loaiCoSo = tenDonVi.match(/^(xã|phường|thị trấn|đặc khu|trường)\b/i)?.[1];
  const noiNhan = [
    ...(cha ? [`Ban Thường vụ ${tenGoiToChuc(cha)} (để báo cáo);`] : []),
    ...(dv.orgLevel === 3 && diaDanhCoSo(tenDonVi) ? [`Đảng ủy ${tenDonVi} (để báo cáo);`] : []),
  ];

  return {
    canhBao,
    donVi: {
      id,
      capToChuc: laChiDoan ? "CHI_DOAN" : laLienChi ? "LIEN_CHI" : "CO_SO",
      coQuanCapTren: cha ? hoaVi(tenGoiToChuc(cha)) : null,
      coQuanBanHanh: laChiDoan ? hoaVi(r) : `BCH ${laLienChi ? "" : "ĐOÀN "}${hoaVi(laLienChi ? r : tenDonVi)}`,
      kyHieuCoQuan: laChiDoan ? "CĐ" : laLienChi ? "LCĐ" : "ĐTN",
      donViThamMuu: null,
      diaDanh,
      chuTheTrongVanBan: `Ban Chấp hành ${tenGoiToChuc(dv)}`,
      deKyMacDinh: laChiDoan
        ? "TM. BAN CHẤP HÀNH CHI ĐOÀN"
        : laLienChi
          ? "TM. BAN CHẤP HÀNH LIÊN CHI ĐOÀN"
          : `TM. BAN CHẤP HÀNH ĐOÀN${loaiCoSo ? ` ${hoaVi(loaiCoSo)}` : ""}`,
      chucVuKyMacDinh: "BÍ THƯ",
      noiNhanTheoLoai: { BAO_CAO: noiNhan },
      noiLuu: "Lưu VT.",
    },
  };
}

/** Định dạng "<Địa danh>, ngày DD tháng M năm YYYY"; không có ngày → để trống ngày, tháng */
export function formatDiaDiemNgayThang(diaDanh: string, ngay?: Date | string | null, namMacDinh?: number): string {
  if (!ngay) return `${diaDanh}, ngày     tháng     năm ${namMacDinh ?? new Date().getFullYear()}`;
  if (typeof ngay === "string") return normalizeVanBanNgayThang(`${diaDanh}, ${ngay}`);
  return normalizeVanBanNgayThang(`${diaDanh}, ${ngay.getDate()}/${ngay.getMonth() + 1}/${ngay.getFullYear()}`);
}

export interface KhungOptions {
  so?: string | number | null;
  ngayKy?: Date | string | null;
  /** Ghi đè viết tắt thể loại (VD giấy mời "GM") */
  vietTatLoai?: string;
  donViThamMuu?: string | null;
  trichYeu: string;
  kinhGui?: string | null;
  dongKinhGui?: string | null;
  /** Nơi nhận thêm (chèn trước dòng Lưu) */
  noiNhan?: string[];
  deKy?: string;
  chucVu?: string;
  nguoiKy?: string | null;
  chiDanDuThao?: string | null;
}

/**
 * Dựng toàn bộ khối thể thức (đầu trang, tên loại, trích yếu, nơi nhận, chữ ký) bằng CODE
 * từ hồ sơ đơn vị → luôn thống nhất một đơn vị, AI chỉ còn viết phần thân.
 */
export function buildKhungVanBan(
  donVi: DonViBanHanh,
  loai: VanBanLoai,
  o: KhungOptions,
): Omit<VanBanStructuredOutput, "noi_dung_html_hoac_markdown" | "noi_dung_blocks"> {
  const vietTat = o.vietTatLoai ?? loai.vietTat;
  const thamMuu = o.donViThamMuu !== undefined ? o.donViThamMuu : donVi.donViThamMuu;
  const coQuan = `${donVi.kyHieuCoQuan}${thamMuu ? "-" + thamMuu : ""}`;
  const so = o.so !== undefined && o.so !== null && `${o.so}`.trim() !== "" ? `${o.so}`.trim() : "";
  // Không dùng loai.noiNhanMau (chỉ là gợi ý mô tả) để tránh in ra dòng chung chung như "Cấp trên trực tiếp"
  const noiNhanCoBan = (o.noiNhan ?? donVi.noiNhanTheoLoai?.[loai.id] ?? donVi.noiNhanTheoLoai?.MAC_DINH ?? []).filter(
    (x) => !/^\s*-?\s*lưu\b/i.test(x),
  );
  const noiNhan = [...(loai.laCongVan && !noiNhanCoBan.some((x) => /^như trên/i.test(x)) ? ["Như trên;"] : []), ...noiNhanCoBan, donVi.noiLuu];

  return {
    tieu_de: "ĐOÀN TNCS HỒ CHÍ MINH",
    co_quan_cap_tren: donVi.coQuanCapTren ?? null,
    co_quan_ban_hanh: donVi.coQuanBanHanh,
    so_ky_hieu: so ? `Số: ${so}-${vietTat}/${coQuan}` : `Số:     -${vietTat}/${coQuan}`,
    trich_yeu_cong_van: loai.laCongVan ? o.trichYeu : null,
    dia_diem_ngay_thang: formatDiaDiemNgayThang(donVi.diaDanh, o.ngayKy),
    ten_loai_vb: loai.laCongVan ? null : loai.ten.split("/")[0].trim().toLocaleUpperCase("vi"),
    trich_yeu_vb: loai.laCongVan ? null : o.trichYeu,
    kinh_gui: o.kinhGui ?? null,
    dong_kinh_gui: o.dongKinhGui ?? null,
    noi_nhan: normalizeNoiNhanList(noiNhan),
    the_thuc_de_ky: o.deKy ?? donVi.deKyMacDinh,
    chuc_vu_ky: o.chucVu ?? donVi.chucVuKyMacDinh,
    ten_nguoi_ky: o.nguoiKy ?? donVi.nguoiKyMacDinh ?? null,
    chi_dan_du_thao: o.chiDanDuThao ?? null,
  };
}

/* ============================================================================
 * 7. CẤU TRÚC JSON ĐẦU RA & THAM SỐ ĐẦU VÀO
 * ========================================================================== */

export type NoiDungBlockKieu =
  | "can_cu"
  | "doan"
  | "phan"
  | "tieu_de_phan"
  | "muc"
  | "khoan"
  | "diem"
  | "diem2"
  | "diem3"
  | "gach"
  | "dieu"
  | "quyet_dinh"
  | "bang" // bảng: header + rows
  | "tieu_de_giua" // dòng canh giữa, đậm (tiêu đề phụ lục)
  | "ghi_chu_giua"; // dòng canh giữa, nghiêng

export interface NoiDungBlock {
  kieu: NoiDungBlockKieu;
  text: string;
  /** Chỉ dùng cho kieu "bang" */
  header?: string[];
  rows?: string[][];
  /** Tỷ lệ độ rộng cột (tương đối) cho kieu "bang" */
  colWidths?: number[];
  /** Mã hoạt động làm nguồn của đoạn này (dùng kiểm tra bám nguồn) */
  nguon?: string[];
}

/** Phụ lục: trang riêng sau chữ ký, có tên loại "PHỤ LỤC", trích yếu, dòng "(Kèm theo …)" */
export interface PhuLuc {
  tieu_de: string; // "PHỤ LỤC"
  trich_yeu: string;
  ghi_chu?: string; // "(Kèm theo Báo cáo …)"
  blocks: NoiDungBlock[];
}

export interface VanBanStructuredOutput {
  tieu_de: string; // Luôn "ĐOÀN TNCS HỒ CHÍ MINH"
  co_quan_cap_tren?: string | null;
  co_quan_ban_hanh: string;
  so_ky_hieu: string; // "Số: 12-CV/CĐ" | "Số: 245-BC/TĐTN-TCKT"
  trich_yeu_cong_van?: string | null; // "V/v …"
  dia_diem_ngay_thang: string;
  ten_loai_vb?: string | null; // "BÁO CÁO"… ; công văn = null
  trich_yeu_vb?: string | null;
  kinh_gui?: string | null;
  dong_kinh_gui?: string | null;
  /** Văn bản thuần (giữ tên trường cũ để tương thích); KHÔNG chứa markdown */
  noi_dung_html_hoac_markdown: string;
  /** Nội dung có cấu trúc để lớp docx áp kiểu chữ đúng từng cấp đề mục */
  noi_dung_blocks?: NoiDungBlock[];
  noi_nhan: string[];
  the_thuc_de_ky: string; // "TM. BAN THƯỜNG VỤ…" | "" (thủ trưởng ký trực tiếp)
  chuc_vu_ky: string;
  ten_nguoi_ky?: string | null;
  do_mat?: "MẬT" | null;
  do_khan?: "KHẨN" | "THƯỢNG KHẨN" | "HỎA TỐC" | null;
  ky_hieu_luu?: string | null;
  /** Dòng chỉ dẫn dưới số - ký hiệu, VD "(Dự thảo)" — chỉ đặt khi người dùng yêu cầu */
  chi_dan_du_thao?: string | null;
  phu_luc?: PhuLuc[];
}

export interface StructuredPromptParams {
  capToChuc: string; // "Cấp tỉnh" | "Cấp huyện" | "Đoàn cơ sở" | "Liên chi đoàn" | "Chi đoàn" | "Ban tham mưu" | "Đại hội"…
  donViCapTren?: string;
  donViBanHanh: string;
  coQuanBanHanhCuThe?: string; // "Ban Thường vụ" | "Ban Chấp hành" | "Chi đoàn có BCH" | "Văn phòng"…
  donViThamMuu?: string;
  loaiVanBan: string;
  soVanBan?: string;
  diaDiemNgayThang?: string;
  trichYeu: string;
  kinhGui?: string;
  nguoiKy?: string; // "Phó Bí thư - Nguyễn Văn A"
  yeuCauNoiDung: string;
}

export function buildStructuredUserPrompt(p: StructuredPromptParams): string {
  return [
    "Hãy soạn thảo văn bản dựa trên thông số sau:",
    `- Cấp tổ chức ban hành: ${p.capToChuc}`,
    `- Tên đơn vị cấp trên trực tiếp: ${p.donViCapTren || "Không có"}`,
    `- Tên đơn vị ban hành: ${p.donViBanHanh}`,
    `- Cơ quan ban hành cụ thể: ${p.coQuanBanHanhCuThe || "Ban Chấp hành"}`,
    `- Đơn vị tham mưu soạn thảo: ${p.donViThamMuu || "Không"}`,
    `- Loại văn bản: ${p.loaiVanBan}`,
    `- Số văn bản: ${p.soVanBan || "Chưa cấp — để trống phần số"}`,
    `- Địa điểm và ngày ban hành: ${p.diaDiemNgayThang ? normalizeVanBanNgayThang(p.diaDiemNgayThang) : "Chưa có — để trống ngày, tháng"}`,
    `- Trích yếu / Chủ đề: ${p.trichYeu}`,
    `- Kính gửi / Nơi nhận: ${p.kinhGui || "Theo nơi nhận chuẩn của loại văn bản"}`,
    `- Người ký (chức vụ & họ tên): ${p.nguoiKy || "[CẦN BỔ SUNG]"}`,
    `- Yêu cầu nội dung chi tiết: ${p.yeuCauNoiDung}`,
  ].join("\n");
}

/* ============================================================================
 * 8. CHUẨN HOÁ
 * ========================================================================== */

/**
 * Chuẩn hoá địa điểm - ngày tháng:
 *  - "TP. Hồ Chí Minh, 5/2/2026"      → "TP. Hồ Chí Minh, ngày 05 tháng 02 năm 2026"
 *  - "Hà Nội ngày 9 tháng 3 năm 2026" → "Hà Nội, ngày 09 tháng 3 năm 2026"
 *  - "ngày 05 tháng 03 năm 2026"      → "ngày 05 tháng 3 năm 2026" (chỉ tháng 1, 2 có số 0)
 *  - Chuỗi để trống ("ngày    tháng    năm 20__") hoặc ngày không hợp lệ → giữ nguyên.
 */
export function normalizeVanBanNgayThang(input: string): string {
  if (!input) return "";
  const raw = input.trim();

  const fmt = (d: number, m: number, y: string): string | null => {
    if (d < 1 || d > 31 || m < 1 || m > 12) return null;
    const dd = d < 10 ? `0${d}` : `${d}`;
    const mm = m <= 2 ? `0${m}` : `${m}`;
    return `ngày ${dd} tháng ${mm} năm ${y}`;
  };

  const numeric = /(?:ngày\s+)?(\d{1,2})\s*[/\-.]\s*(\d{1,2})\s*[/\-.]\s*(\d{4})/i;
  const words = /ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})/i;

  const m = raw.match(words) || raw.match(numeric);
  if (!m || m.index === undefined) return raw;

  const datePart = fmt(parseInt(m[1], 10), parseInt(m[2], 10), m[3]);
  if (!datePart) return raw;

  const place = raw
    .slice(0, m.index)
    .replace(/[,\s]+$/, "")
    .trim();
  return place ? `${place}, ${datePart}` : datePart;
}

/** Ký hiệu thể loại giữ chữ thường theo 29-HD */
const LOAI_GIU_HOA_THUONG: Record<string, string> = { CTR: "CTr", TTR: "TTr" };

/**
 * Chuẩn hoá số - ký hiệu:
 *  "245 - bc / tđtn - tckt" → "Số: 245-BC/TĐTN-TCKT"; "ttr/cđ" → "Số:     -TTr/CĐ"; "01/ĐH" → "Số: 01/ĐH"
 */
export function normalizeVanBanSoKyHieu(input: string): string {
  if (!input || !input.trim()) return "Số:     -…/…";
  let s = input.trim().replace(/^số\s*:?\s*/i, "");
  s = s.replace(/\s*([/\-])\s*/g, "$1").toUpperCase();

  if (/^\d*\/ĐH$/.test(s)) {
    const n = s.split("/")[0];
    return n ? `Số: ${n}/ĐH` : "Số:     /ĐH";
  }

  const dm = s.match(/^(\d*)-?([A-ZĐ]+)\/(.+)$/);
  if (!dm) return `Số: ${s}`;
  const loai = LOAI_GIU_HOA_THUONG[dm[2]] ?? dm[2];
  return dm[1] ? `Số: ${dm[1]}-${loai}/${dm[3]}` : `Số:     -${loai}/${dm[3]}`;
}

/**
 * Chuẩn hoá danh sách Nơi nhận:
 *  - Mỗi dòng bắt đầu "- ", dòng giữa kết thúc ";", dòng cuối kết thúc ".".
 *  - Dòng lưu có số bản "(10b)" giữ nguyên ("- Lưu VT-LT. (10b)").
 *  - "Lưu: VP" → "Lưu VP." (29-HD không dùng dấu hai chấm sau "Lưu").
 *  - Không xoá số ở đầu dòng (VD: "- 03 chi đoàn trực thuộc;").
 */
export function normalizeNoiNhanList(list: string[]): string[] {
  const macDinh = ["- Như trên;", "- Lưu VP."];
  if (!Array.isArray(list) || list.length === 0) return macDinh;

  const clean = list
    .map((item) =>
      String(item ?? "")
        .trim()
        .replace(/^[-–—*•+]\s*/, "")
        .trim(),
    )
    .filter(Boolean);
  if (clean.length === 0) return macDinh;

  return clean.map((item, idx) => {
    const isLast = idx === clean.length - 1;
    let t = item;
    if (/^lưu\b/i.test(t)) {
      t = t.replace(/^lưu\s*:\s*/i, "Lưu ");
    }
    if (isLast && /\(\s*\d+\s*b\s*\)$/i.test(t)) return `- ${t}`;
    t = t.replace(/[;.,]+$/, "").trim();
    return `- ${t}${isLast ? "." : ";"}`;
  });
}

/** Viết hoa chữ cái đầu mỗi từ của họ tên ("nguyễn văn a" → "Nguyễn Văn A") */
export function normalizeHoTen(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((w) => (w ? w.charAt(0).toLocaleUpperCase("vi") + w.slice(1).toLocaleLowerCase("vi") : w))
    .join(" ");
}

const stripMarkdown = (s: string): string =>
  s
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1$2")
    .replace(/`+/g, "")
    .replace(/^\s*[*•]\s+/gm, "- ");

/** Áp toàn bộ chuẩn hoá lên kết quả AI (không đổi nội dung, chỉ sửa thể thức) */
export function normalizeVanBanOutput(o: VanBanStructuredOutput): VanBanStructuredOutput {
  const up = (s?: string | null) => (s ? s.trim().toLocaleUpperCase("vi") : (s ?? null));
  const congVan = !o.ten_loai_vb || /^CÔNG VĂN$/i.test(o.ten_loai_vb.trim());

  return {
    ...o,
    tieu_de: "ĐOÀN TNCS HỒ CHÍ MINH",
    co_quan_cap_tren: up(o.co_quan_cap_tren),
    co_quan_ban_hanh: up(o.co_quan_ban_hanh) ?? "",
    so_ky_hieu: normalizeVanBanSoKyHieu(o.so_ky_hieu),
    dia_diem_ngay_thang: normalizeVanBanNgayThang(o.dia_diem_ngay_thang),
    ten_loai_vb: congVan ? null : up(o.ten_loai_vb),
    trich_yeu_cong_van: o.trich_yeu_cong_van
      ? o.trich_yeu_cong_van.trim().replace(/^["“”]+|["“”]+$/g, "")
      : (o.trich_yeu_cong_van ?? null),
    kinh_gui: o.kinh_gui ? o.kinh_gui.trim().replace(/^kính gửi\s*:\s*/i, "") : (o.kinh_gui ?? null),
    noi_dung_html_hoac_markdown: stripMarkdown(o.noi_dung_html_hoac_markdown ?? ""),
    noi_dung_blocks: o.noi_dung_blocks?.map((b) => ({ ...b, text: stripMarkdown(b.text) })),
    noi_nhan: normalizeNoiNhanList(o.noi_nhan),
    the_thuc_de_ky: up(o.the_thuc_de_ky) ?? "",
    chuc_vu_ky: up(o.chuc_vu_ky) ?? "",
    ten_nguoi_ky:
      o.ten_nguoi_ky && !/^\[.*\]$/.test(o.ten_nguoi_ky.trim())
        ? normalizeHoTen(o.ten_nguoi_ky)
        : (o.ten_nguoi_ky ?? null),
  };
}

/* ============================================================================
 * 9. KIỂM TRA THỂ THỨC (chạy sau normalizeVanBanOutput, trước khi dựng .docx)
 * ========================================================================== */

export interface KetQuaKiemTra {
  hopLe: boolean;
  loi: string[]; // sai thể thức — nên yêu cầu AI sửa lại
  canhBao: string[]; // nên rà soát thủ công
}

const RE_SO_DOAN = /^Số:\s*(\d+|\s+)-(CV|BC|KH|QĐ|CT|CTr|TT|TTr|HD|TB|GGT|GM|BS)\/[A-ZĐ]+(-[A-ZĐ]+)*$/;
const RE_SO_DOAN_DH = /^Số:\s*(\d+|\s+)\/ĐH$/;
const RE_NGAY = /^[^,]+, ngày (\d{2}|\s+) tháng (\d{1,2}|\s+) năm \d{4}$/;
const RE_DE_KY = /^(TM\.|KT\.|TL\.|Q\.)\s+\S/;
const RE_MARKDOWN = /(^|\n)\s{0,3}#{1,6}\s|\*\*|__|`/;

/** Dấu hiệu AI nhét khối thể thức (nơi nhận, chữ ký, tiêu đề…) vào phần thân */
const RE_LOT_THE_THUC: [RegExp, string][] = [
  [/(^|\n)\s*[-–]?\s*Nơi nhận\s*:/i, '"Nơi nhận:"'],
  [/(^|\n)\s*(TM|KT|TL)\.\s+[A-ZĐ]/, "thể thức đề ký (TM./KT./TL.)"],
  [/\(\s*(chữ ký|đã ký|ký tên)\s*\)/i, '"(Chữ ký)"'],
  [/(^|\n)\s*Số\s*:\s*\d*\s*-/, "số - ký hiệu"],
  [/ĐOÀN TNCS HỒ CHÍ MINH\s*(\n|$)/, "tiêu đề Đoàn"],
  [/(^|\n)\s*[-–]\s*Lưu\b/, "dòng Lưu"],
];

export function validateVanBan(o: VanBanStructuredOutput, donVi?: DonViBanHanh): KetQuaKiemTra {
  const loi: string[] = [];
  const canhBao: string[] = [];
  const congVan = !o.ten_loai_vb;
  const isUpper = (s: string) => s === s.toLocaleUpperCase("vi");

  // Tiêu đề & tên cơ quan
  if (o.tieu_de !== "ĐOÀN TNCS HỒ CHÍ MINH") loi.push('Tiêu đề phải là "ĐOÀN TNCS HỒ CHÍ MINH".');
  if (!o.co_quan_ban_hanh?.trim()) loi.push("Thiếu tên cơ quan ban hành.");
  else if (!isUpper(o.co_quan_ban_hanh)) loi.push("Tên cơ quan ban hành phải in hoa.");
  if (o.co_quan_cap_tren && !isUpper(o.co_quan_cap_tren)) loi.push("Tên tổ chức cấp trên phải in hoa.");
  if (/^(BCH|BAN CHẤP HÀNH) ĐOÀN (TỈNH|TP\.|THÀNH PHỐ)/.test(o.co_quan_ban_hanh) && o.co_quan_cap_tren)
    canhBao.push("Văn bản cấp tỉnh chỉ ghi 1 dòng tên cơ quan, không ghi tổ chức cấp trên.");

  // Số - ký hiệu
  const so = o.so_ky_hieu ?? "";
  if (!RE_SO_DOAN.test(so) && !RE_SO_DOAN_DH.test(so))
    loi.push(`Số - ký hiệu "${so}" sai cú pháp Đoàn "Số: <số>-<LOẠI>/<CƠ QUAN>[-<THAM MƯU>]".`);
  if (congVan && RE_SO_DOAN.test(so) && !/-CV\//.test(so))
    canhBao.push("Văn bản không có tên loại nhưng ký hiệu không phải CV.");

  // Ngày tháng
  const ngay = o.dia_diem_ngay_thang ?? "";
  if (!RE_NGAY.test(ngay)) loi.push(`Địa điểm, ngày tháng "${ngay}" sai mẫu "<Địa danh>, ngày DD tháng M năm YYYY".`);
  else {
    const mm = ngay.match(/tháng (\d{1,2}) /)?.[1];
    if (mm) {
      const m = parseInt(mm, 10);
      if (m <= 2 && mm.length === 1) loi.push("Tháng 1, tháng 2 phải ghi thêm số 0 (tháng 01, tháng 02).");
      if (m > 2 && mm.length === 2 && mm.startsWith("0")) loi.push(`Tháng ${m} không ghi số 0 đứng trước.`);
    }
    if (/^(Quận|Phường|Huyện|Xã) ?$/i.test(ngay.split(",")[0])) loi.push("Địa danh thiếu tên riêng.");
    if (/^\d/.test(ngay.split(",")[0]))
      loi.push('Địa danh theo số thứ tự phải ghi thêm cấp hành chính (VD: "Quận 12").');
  }

  // Tên loại - trích yếu
  if (congVan) {
    if (!o.trich_yeu_cong_van || !/^V\/v\s/.test(o.trich_yeu_cong_van))
      loi.push('Công văn phải có trích yếu bắt đầu "V/v ".');
    if (!o.kinh_gui?.trim()) loi.push('Công văn phải có "Kính gửi:".');
    if (o.noi_nhan?.[0] && !/^- Như trên;$/.test(o.noi_nhan[0]))
      canhBao.push('Nơi nhận công văn thường bắt đầu "- Như trên;".');
  } else {
    if (!isUpper(o.ten_loai_vb ?? "")) loi.push("Tên loại văn bản phải in hoa.");
    if (!o.trich_yeu_vb?.trim()) loi.push("Thiếu trích yếu nội dung dưới tên loại văn bản.");
    if (o.trich_yeu_cong_van) canhBao.push("Văn bản có tên loại không dùng trích yếu dạng công văn.");
  }

  // Nội dung
  const body = [o.noi_dung_html_hoac_markdown ?? "", ...(o.noi_dung_blocks ?? []).map((b) => b.text)].join("\n");
  if (!body.trim()) loi.push("Thiếu phần nội dung.");
  if (RE_MARKDOWN.test(body)) loi.push("Nội dung còn ký tự markdown (#, **, __, `).");
  RE_LOT_THE_THUC.forEach(([re, ten]) => {
    if (re.test(body)) loi.push(`Phần thân chứa ${ten} — thành phần này phải nằm ở khối thể thức, không nằm trong nội dung.`);
  });
  if (o.ten_loai_vb && new RegExp(`(^|\\n)\\s*${o.ten_loai_vb}\\s*(\\n|$)`).test(body))
    loi.push(`Phần thân lặp lại tên loại "${o.ten_loai_vb}".`);
  if (/\(\s*dự thảo\s*\)/i.test(body)) loi.push('Phần thân chứa "(Dự thảo)".');
  if (/\[CẦN BỔ SUNG\]/.test(body)) canhBao.push("Nội dung còn mục [CẦN BỔ SUNG].");
  o.noi_dung_blocks
    ?.filter((b) => b.kieu === "muc")
    .forEach((b) => {
      if (!/^[IVXLC]+\.\s/.test(b.text)) loi.push(`Mục "${b.text}" phải đánh số La Mã.`);
      else if (!isUpper(b.text)) loi.push(`Tiêu đề mục "${b.text}" phải in hoa.`);
    });
  const canCu = o.noi_dung_blocks?.filter((b) => b.kieu === "can_cu") ?? [];
  canCu.forEach((b, i) => {
    const want = i === canCu.length - 1 ? "," : ";";
    if (!b.text.trim().endsWith(want)) loi.push(`Căn cứ "${b.text.slice(0, 40)}…" phải kết thúc bằng "${want}".`);
  });

  // Nơi nhận
  const nn = o.noi_nhan ?? [];
  if (nn.length === 0) loi.push("Thiếu Nơi nhận.");
  nn.forEach((line, i) => {
    const last = i === nn.length - 1;
    if (!line.startsWith("- ")) loi.push(`Nơi nhận "${line}" phải bắt đầu bằng "- ".`);
    if (!last && !line.endsWith(";")) loi.push(`Nơi nhận "${line}" phải kết thúc bằng ";".`);
    if (last && !/(\.|\(\s*\d+\s*b\s*\))$/.test(line)) loi.push(`Nơi nhận cuối "${line}" phải kết thúc bằng ".".`);
  });
  const luu = nn[nn.length - 1] ?? "";
  if (nn.filter((x) => !/^- (Lưu|Như trên)/.test(x)).length === 0 && !congVan)
    canhBao.push("Nơi nhận chỉ có dòng Lưu — cần khai báo nơi nhận (cấp trên để báo cáo, đơn vị thực hiện…).");
  if (nn.some((x) => /cấp trên trực tiếp|đơn vị liên quan|\.\.\./i.test(x))) loi.push("Nơi nhận còn dòng mô tả chung, chưa ghi tên đơn vị cụ thể.");
  if (!/^- Lưu/.test(luu)) canhBao.push("Dòng cuối Nơi nhận nên là nơi lưu (- Lưu …).");
  if (/^- Lưu:/.test(luu)) canhBao.push('Văn bản Đoàn ghi "- Lưu VP." (không dấu hai chấm).');

  // Chữ ký
  const deKy = o.the_thuc_de_ky ?? "";
  if (deKy && !RE_DE_KY.test(deKy)) loi.push(`Thể thức đề ký "${deKy}" phải bắt đầu TM. / KT. / TL. / Q.`);
  if (deKy && !isUpper(deKy)) loi.push("Thể thức đề ký phải in hoa.");
  if (!o.chuc_vu_ky?.trim()) loi.push("Thiếu chức vụ người ký.");
  else if (!isUpper(o.chuc_vu_ky)) loi.push("Chức vụ người ký phải in hoa.");
  if (!deKy && /BÍ THƯ/.test(o.chuc_vu_ky ?? ""))
    loi.push('Bí thư/Phó Bí thư ký văn bản của BCH/BTV phải có thể thức "TM. …".');
  if (/^KT\./.test(deKy) && !/^PHÓ/.test(o.chuc_vu_ky ?? "")) canhBao.push("Ký thay (KT.) thường do cấp phó ký.");
  if (!o.ten_nguoi_ky?.trim()) canhBao.push("Chưa có họ tên người ký.");
  else if (o.ten_nguoi_ky !== normalizeHoTen(o.ten_nguoi_ky) && !/^\[.*\]$/.test(o.ten_nguoi_ky))
    loi.push("Họ tên người ký phải viết hoa chữ cái đầu mỗi từ.");

  // Thống nhất một đơn vị ban hành
  if (donVi) {
    if (o.co_quan_ban_hanh !== donVi.coQuanBanHanh)
      loi.push(`Tên cơ quan ban hành "${o.co_quan_ban_hanh}" khác hồ sơ đơn vị "${donVi.coQuanBanHanh}".`);
    if ((o.co_quan_cap_tren ?? null) !== (donVi.coQuanCapTren ?? null))
      loi.push(`Tổ chức cấp trên "${o.co_quan_cap_tren ?? ""}" khác hồ sơ đơn vị "${donVi.coQuanCapTren ?? ""}".`);
    if (!ngay.startsWith(donVi.diaDanh + ",")) loi.push(`Địa danh phải là "${donVi.diaDanh}".`);
    if (!new RegExp(`/${donVi.kyHieuCoQuan}(-|$)`).test(so)) loi.push(`Ký hiệu cơ quan phải là "${donVi.kyHieuCoQuan}".`);
    if (deKy && deKy !== donVi.deKyMacDinh) canhBao.push(`Thể thức đề ký "${deKy}" khác mặc định "${donVi.deKyMacDinh}".`);
  }

  return { hopLe: loi.length === 0, loi, canhBao };
}

/** Câu phản hồi gửi lại AI khi validate thất bại (vòng sửa tự động) */
export function buildFixPrompt(kq: KetQuaKiemTra): string {
  return [
    "Văn bản vừa soạn còn lỗi thể thức sau, hãy sửa và trả lại đúng định dạng cũ (chỉ sửa thể thức, giữ nguyên nội dung):",
    ...kq.loi.map((l, i) => `${i + 1}. ${l}`),
  ].join("\n");
}

/* ============================================================================
 * 11. KHUNG PHẦN THÂN THEO LOẠI VĂN BẢN (dùng chung cho mọi loại)
 *     Code dựng tiêu đề mục, đánh số; AI chỉ điền nội dung từng phần.
 * ========================================================================== */

export interface PhanKhung {
  /** Mã phần: "I", "II"… (có tiêu đề) hoặc mã ẩn "MO_DAU", "NOI_DUNG"… */
  ma: string;
  /** Tiêu đề IN HOA; null = phần không có tiêu đề (đoạn văn liền mạch) */
  tieuDe: string | null;
  batBuoc: boolean;
  /** true = cho phép câu chữ hành chính chung không cần nguồn (nhưng cấm số liệu, tên riêng lạ) */
  vanMau?: boolean;
  /** "dieu" = phần gồm các Điều (Quyết định/Quy định) */
  kieu?: "muc" | "dieu";
  huongDan: string;
}

const MO_DAU = (huongDan: string): PhanKhung => ({ ma: "MO_DAU", tieuDe: null, batBuoc: true, vanMau: true, huongDan });

/** Khung mặc định — đơn vị có thể ghi đè qua SoanVanBanInput.khung */
export const KHUNG_NOI_DUNG: Record<string, PhanKhung[]> = {
  BAO_CAO: [
    MO_DAU('Một câu dẫn: "<chủ thể> báo cáo kết quả <trích yếu> như sau:".'),
    { ma: "I", tieuDe: "KẾT QUẢ THỰC HIỆN", batBuoc: true, huongDan: "Chia khoản theo lĩnh vực công tác; mỗi hoạt động một ý: thời gian, đơn vị, nội dung, kết quả có trong dữ kiện." },
    { ma: "II", tieuDe: "ĐÁNH GIÁ CHUNG", batBuoc: false, huongDan: "Ưu điểm, hạn chế — chỉ rút từ dữ kiện; không có dữ kiện thì để trống." },
    { ma: "III", tieuDe: "PHƯƠNG HƯỚNG, NHIỆM VỤ THỜI GIAN TỚI", batBuoc: false, huongDan: "Chỉ các việc có trong dữ kiện." },
    { ma: "IV", tieuDe: "ĐỀ XUẤT, KIẾN NGHỊ", batBuoc: false, huongDan: "Chỉ khi dữ kiện có đề xuất, kiến nghị cụ thể." },
  ],
  KE_HOACH: [
    MO_DAU('Một câu dẫn sau căn cứ: "<chủ thể> xây dựng kế hoạch <trích yếu> như sau:".'),
    { ma: "I", tieuDe: "MỤC ĐÍCH, YÊU CẦU", batBuoc: true, vanMau: true, huongDan: "Khoản 1. Mục đích; 2. Yêu cầu — câu chữ hành chính, bám chủ đề kế hoạch." },
    { ma: "II", tieuDe: "NỘI DUNG", batBuoc: true, huongDan: "Thời gian, địa điểm, đối tượng, số lượng, nội dung, hình thức — đúng dữ kiện." },
    { ma: "III", tieuDe: "KINH PHÍ", batBuoc: false, huongDan: "Chỉ khi dữ kiện có kinh phí/nguồn kinh phí." },
    { ma: "IV", tieuDe: "TỔ CHỨC THỰC HIỆN", batBuoc: true, huongDan: "Phân công đơn vị, tiến độ, đầu mối — đúng dữ kiện." },
  ],
  CHUONG_TRINH: [
    MO_DAU('Một câu dẫn: "<chủ thể> ban hành chương trình <trích yếu> như sau:".'),
    { ma: "I", tieuDe: "MỤC TIÊU, CHỈ TIÊU", batBuoc: true, huongDan: "Chỉ tiêu, con số chỉ lấy từ dữ kiện." },
    { ma: "II", tieuDe: "NỘI DUNG, GIẢI PHÁP", batBuoc: true, huongDan: "Các nội dung trọng tâm theo dữ kiện." },
    { ma: "III", tieuDe: "TỔ CHỨC THỰC HIỆN", batBuoc: true, huongDan: "Phân công, tiến độ theo dữ kiện." },
  ],
  HUONG_DAN: [
    MO_DAU('Một câu dẫn: "<chủ thể> hướng dẫn <trích yếu> như sau:".'),
    { ma: "I", tieuDe: "MỤC ĐÍCH, YÊU CẦU", batBuoc: true, vanMau: true, huongDan: "Câu chữ hành chính, bám chủ đề." },
    { ma: "II", tieuDe: "NỘI DUNG HƯỚNG DẪN", batBuoc: true, huongDan: "Quy định, quy trình, mốc thời gian theo dữ kiện." },
    { ma: "III", tieuDe: "TỔ CHỨC THỰC HIỆN", batBuoc: true, huongDan: "Phân công, thời hạn theo dữ kiện." },
  ],
  THONG_BAO: [
    MO_DAU("Một câu dẫn nêu chủ thể và việc thông báo."),
    { ma: "NOI_DUNG", tieuDe: null, batBuoc: true, huongDan: "Nội dung thông báo; nhiều nội dung thì chia khoản." },
    { ma: "TO_CHUC", tieuDe: null, batBuoc: false, huongDan: "Yêu cầu các đơn vị thực hiện, đầu mối liên hệ — theo dữ kiện." },
  ],
  CHI_THI: [
    { ma: "TINH_HINH", tieuDe: null, batBuoc: false, huongDan: "Bối cảnh, lý do ban hành — theo dữ kiện." },
    { ma: "NOI_DUNG", tieuDe: null, batBuoc: true, huongDan: "Các nhiệm vụ chỉ đạo, mỗi nhiệm vụ một khoản." },
    { ma: "TO_CHUC", tieuDe: null, batBuoc: false, huongDan: "Tổ chức thực hiện, chế độ báo cáo — theo dữ kiện." },
  ],
  THONG_TRI: [
    { ma: "NOI_DUNG", tieuDe: null, batBuoc: true, huongDan: "Chủ trương, kết luận cần phổ biến; chia khoản nếu nhiều nội dung." },
    { ma: "TO_CHUC", tieuDe: null, batBuoc: false, huongDan: "Yêu cầu triển khai — theo dữ kiện." },
  ],
  TO_TRINH: [
    { ma: "LY_DO", tieuDe: null, batBuoc: true, huongDan: "Sự cần thiết, cơ sở đề xuất — theo dữ kiện." },
    { ma: "NOI_DUNG", tieuDe: null, batBuoc: true, huongDan: "Nội dung đề nghị phê duyệt: thời gian, kinh phí, nhân sự… theo dữ kiện." },
    { ma: "KET", tieuDe: null, batBuoc: true, vanMau: true, huongDan: 'Câu kết: "<chủ thể> kính trình <cấp trên> xem xét, phê duyệt./."' },
  ],
  QUYET_DINH: [
    { ma: "DIEU", tieuDe: null, batBuoc: true, kieu: "dieu", huongDan: "Mỗi Điều một khối kieu \"dieu\": Điều đầu là nội dung quyết định; Điều cuối nêu hiệu lực và các đơn vị, cá nhân thi hành." },
  ],
  CONG_VAN: [
    { ma: "NOI_DUNG", tieuDe: null, batBuoc: true, huongDan: "Nội dung trao đổi: lý do, việc cần phối hợp/đề nghị, thời gian, địa điểm, đầu mối — theo dữ kiện." },
    { ma: "DE_NGHI", tieuDe: null, batBuoc: false, vanMau: true, huongDan: 'Câu kết: "<chủ thể> kính đề nghị … quan tâm, phối hợp./."' },
  ],
  GIOI_THIEU_MOI: [
    { ma: "NOI_DUNG", tieuDe: null, batBuoc: true, huongDan: "Giấy mời: thành phần, thời gian, địa điểm, nội dung, yêu cầu chuẩn bị. Giấy giới thiệu: người được giới thiệu, nơi đến, nội dung công việc." },
  ],
};

/* ============================================================================
 * 12. KIỂM TRA BÁM NGUỒN (dùng chung)
 * ========================================================================== */

const SO_CHU: Record<string, string> = {
  một: "1", hai: "2", ba: "3", bốn: "4", năm: "5", sáu: "6", bảy: "7", tám: "8", chín: "9", mười: "10",
};
const chuanSo = (x: string) => x.replace(/[.,](?=\d{3}\b)/g, "").replace(/^0+(?=\d)/, "");
const layCacSo = (s: string): string[] =>
  (s.match(/\d+(?:[.,]\d+)*/g) ?? []).flatMap((x) =>
    /^\d{1,3}([.,]\d{3})+$/.test(x) ? [chuanSo(x)] : [chuanSo(x), ...x.split(/[.,]/).map(chuanSo)],
  );
const layTrichDan = (s: string): string[] => [...s.matchAll(/[“"]([^”"]{3,})[”"]/g)].map((m) => m[1].trim());

/** Tập con số có trong văn bản gốc (kể cả số viết bằng chữ "một".."mười") */
export function tapSoNguon(text: string): Set<string> {
  const set = new Set(layCacSo(text));
  Object.entries(SO_CHU).forEach(([chu, so]) => {
    if (new RegExp(`(^|[\\s,(])${chu}(?=[\\s,.)]|$)`, "i").test(text)) set.add(so);
  });
  return set;
}

/** Cụm danh từ riêng phổ biến trong văn bản Đoàn — được dùng tự do */
export const TEN_RIENG_CHUNG = [
  "Đoàn TNCS Hồ Chí Minh", "Trung ương Đoàn", "Ban Bí thư", "Ban Thường vụ", "Ban Chấp hành", "Thành Đoàn", "Tỉnh Đoàn",
  "Hội Sinh viên Việt Nam", "Hội Liên hiệp Thanh niên Việt Nam", "Đội TNTP Hồ Chí Minh", "Chủ tịch Hồ Chí Minh", "Việt Nam",
];

/** Lời đánh giá chủ quan — chỉ được dùng khi chính dữ kiện có */
const LOI_KHEN = ["thành công tốt đẹp", "sôi nổi", "ý nghĩa thiết thực", "đông đảo", "nhiệt tình", "hiệu quả cao", "ấn tượng", "lan tỏa mạnh mẽ", "thu hút đông"];

/** Các cụm ≥ 2 từ viết hoa liên tiếp (tên riêng: đơn vị, địa danh, người) */
const layTenRieng = (s: string): string[] => {
  const out: string[] = [];
  let run: string[] = [];
  const flush = () => {
    if (run.length >= 2) out.push(run.join(" "));
    run = [];
  };
  for (const w of s.split(/\s+/)) {
    const tok = w.replace(/^[“"(]+|[”"),.;:!?/]+$/g, "");
    const hoa = tok.length > 0 && /\p{Lu}/u.test(tok.charAt(0));
    if (hoa) run.push(tok);
    else flush();
    if (/[,.;:!?)”"]$/.test(w)) flush();
  }
  flush();
  // Bỏ kính ngữ đầu cụm ("Quý Phòng", "Đồng chí Nguyễn Văn B" → "Nguyễn Văn B")
  return out
    .map((t) => t.replace(/^(Quý|Đồng chí|Ông|Bà|Anh|Chị|Thầy|Cô)\s+/, ""))
    .filter((t) => t.split(" ").length >= 2);
};

/**
 * So một đoạn AI viết với văn bản gốc. Bị coi là bịa khi có:
 *  - con số/ngày không có trong gốc (trừ soChoPhep: ngày ký, kỳ báo cáo…);
 *  - tên trong ngoặc kép, tên riêng (cụm từ viết hoa) không có trong gốc / tenChoPhep;
 *  - lời khen chủ quan mà gốc không có.
 */
export function kiemTraDoanVoiNguon(nhan: string, text: string, goc: string, soChoPhep: Set<string>, loi: string[], tenChoPhep = ""): void {
  const soGoc = tapSoNguon(goc);
  const soLa = [...new Set(layCacSo(text))].filter((x) => !soGoc.has(x) && !soChoPhep.has(x));
  if (soLa.length) loi.push(`${nhan}: con số/ngày không có trong dữ kiện: ${soLa.join(", ")}.`);
  const gocThuong = goc.toLowerCase();
  layTrichDan(text)
    .filter((q) => !gocThuong.includes(q.toLowerCase()))
    .forEach((q) => loi.push(`${nhan}: tên “${q}” không có nguyên văn trong dữ kiện.`));
  const choPhep = `${gocThuong}\n${tenChoPhep.toLowerCase()}\n${TEN_RIENG_CHUNG.join("\n").toLowerCase()}`;
  const tenLa = layTenRieng(text).filter((t) => !choPhep.includes(t.toLowerCase()));
  if (tenLa.length) loi.push(`${nhan}: tên riêng không có trong dữ kiện: ${[...new Set(tenLa)].join("; ")}.`);
  LOI_KHEN.filter((k) => text.toLowerCase().includes(k) && !gocThuong.includes(k)).forEach((k) =>
    loi.push(`${nhan}: lời đánh giá "${k}" không có trong dữ kiện.`),
  );
  if (/\[CẦN BỔ SUNG|\(\s*chữ ký\s*\)|Nơi nhận\s*:/i.test(text)) loi.push(`${nhan}: chứa thành phần không được phép.`);
}

const stripJsonFence = (s: string) => s.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
const ketThucCau = (s: string) => (/[.!?:;]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);
/** Bỏ số thứ tự AI tự đánh ("1.", "1.1.", "II.", "Điều 2.", "- ") — KHÔNG bỏ số liệu như "500 đoàn viên" */
const boSoThuTu = (s: string) => s.trim().replace(/^(Điều\s+\d+\s*[.:]|[IVXLC]+\.(?=\s)|\d+(\.\d+)*\.(?=\s)|[-–•*](?=\s))\s*/, "");
const LA_MA = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

/* ============================================================================
 * 13. SOẠN VĂN BẢN BẤT KỲ — AI viết phần thân từ dữ kiện, code lắp và kiểm tra
 * ========================================================================== */

/** Một dữ kiện người dùng cung cấp (ghi chú, số liệu, nội dung cuộc họp, bài báo…) */
export interface DuKien {
  ma: string; // "D01"
  noiDung: string;
  /** Gợi ý phần khung nên dùng (không bắt buộc) */
  phan?: string;
}

export interface SoanVanBanInput {
  donVi: DonViBanHanh;
  loaiId: string; // id trong vanBanLoaiList
  trichYeu: string;
  so?: string | null;
  ngayKy?: Date | string | null;
  kinhGui?: string | null; // công văn
  dongKinhGui?: string | null;
  /** Căn cứ do người dùng nhập — code chèn nguyên văn, AI không được thêm căn cứ */
  canCu?: string[];
  duKien: DuKien[];
  /** Yêu cầu tự do của người dùng — được coi như dữ kiện mã "YC" */
  yeuCauThem?: string;
  khung?: PhanKhung[];
  noiNhan?: string[];
  deKy?: string;
  chucVu?: string;
  nguoiKy?: string | null;
  vietTatLoai?: string;
  donViThamMuu?: string | null;
  chiDanDuThao?: string | null;
}

export interface AiKhoi {
  kieu: "khoan" | "diem" | "doan" | "gach" | "dieu";
  text: string;
  nguon?: string[];
}

export interface AiSoanVanBan {
  phan: Record<string, AiKhoi[]>;
  thieu_thong_tin?: string[];
}

export const SYSTEM_PROMPT_SOAN_NOI_DUNG = `Bạn là chuyên viên Văn phòng của cấp bộ Đoàn, soạn PHẦN THÂN văn bản theo thể thức Đoàn TNCS Hồ Chí Minh (Hướng dẫn 29-HD/TWĐTN-VP).

HỆ THỐNG ĐÃ DỰNG SẴN — bạn KHÔNG viết lại: tên cơ quan, số - ký hiệu, địa điểm và ngày tháng, tên loại, trích yếu, "Kính gửi", các căn cứ, dòng "QUYẾT ĐỊNH:", tiêu đề các phần (I, II…), số thứ tự khoản/điểm/Điều, nơi nhận, thể thức đề ký, chức vụ, họ tên người ký.

BẠN VIẾT: nội dung cho từng phần trong "khung", trả về theo mã phần.

NGUYÊN TẮC BÁM DỮ KIỆN (vi phạm sẽ bị hệ thống trả lại):
1. Chỉ dùng thông tin trong "du_kien". Mỗi khối "doan", "gach", "dieu" phải ghi "nguon" là các mã dữ kiện đã dùng.
2. Mọi con số, ngày tháng, giờ, địa điểm, tên người, tên đơn vị, tên chương trình phải có trong dữ kiện được trích. Không suy diễn số liệu, kết quả, số người tham gia; không thêm hoạt động, căn cứ, nghị quyết, khẩu hiệu, lời khen ("thành công tốt đẹp", "sôi nổi"…).
3. Phần có "van_mau": true được viết câu chữ hành chính chung không cần nguồn, nhưng KHÔNG chứa con số, ngày tháng, tên riêng nào ngoài dữ kiện và "thong_tin_van_ban".
4. Phần không đủ dữ kiện: trả mảng rỗng và ghi điều còn thiếu vào "thieu_thong_tin". Không dùng [CẦN BỔ SUNG], không viết cho đủ.
5. Không viết tiêu đề phần, không tự đánh số (hệ thống tự đánh "1.", "1.1.", "Điều 1."), không viết "Nơi nhận", "(Chữ ký)", tên loại văn bản; không markdown, không emoji.
6. Văn phong hành chính, câu đầy đủ, ngôi thứ ba; giữ nguyên cách viết tên đơn vị như trong dữ kiện; chủ thể ban hành gọi đúng như "chu_the".

KIỂU KHỐI: "khoan" (tiêu đề khoản, ngắn, không chấm cuối), "diem" (tiêu đề điểm trong khoản), "doan" (đoạn văn), "gach" (ý gạch đầu dòng), "dieu" (một Điều — chỉ trong phần có kieu "dieu").

ĐỊNH DẠNG TRẢ VỀ: chỉ MỘT đối tượng JSON, không giải thích, không bọc \`\`\`:
{ "phan": { "<mã phần>": [ { "kieu": "doan", "text": "…", "nguon": ["D01"] } ] }, "thieu_thong_tin": ["…"] }`;

const dsDuKien = (input: SoanVanBanInput): DuKien[] => [
  ...input.duKien,
  ...(input.yeuCauThem?.trim() ? [{ ma: "YC", noiDung: input.yeuCauThem.trim() }] : []),
];
const layKhung = (input: SoanVanBanInput): PhanKhung[] => input.khung ?? KHUNG_NOI_DUNG[input.loaiId] ?? [
  { ma: "NOI_DUNG", tieuDe: null, batBuoc: true, huongDan: "Nội dung văn bản theo dữ kiện." },
];
const layLoai = (id: string): VanBanLoai => {
  const l = vanBanLoaiList.find((x) => x.id === id);
  if (!l) throw new Error(`Không có loại văn bản "${id}"`);
  return l;
};
const thongTinVanBan = (input: SoanVanBanInput) => ({
  loai: layLoai(input.loaiId).ten,
  trich_yeu: input.trichYeu,
  chu_the: input.donVi.chuTheTrongVanBan,
  ngay_ky: input.ngayKy ? `${input.ngayKy}` : null,
  kinh_gui: input.kinhGui ?? null,
  can_cu: input.canCu ?? [],
});

export function buildUserPromptSoan(input: SoanVanBanInput): string {
  const payload = {
    thong_tin_van_ban: thongTinVanBan(input),
    khung: layKhung(input).map((p) => ({
      ma: p.ma,
      tieu_de: p.tieuDe,
      bat_buoc: p.batBuoc,
      van_mau: !!p.vanMau,
      kieu: p.kieu ?? "muc",
      huong_dan: p.huongDan,
    })),
    du_kien: dsDuKien(input).map((d) => ({ ma: d.ma, noi_dung: d.noiDung, ...(d.phan ? { phan: d.phan } : {}) })),
  };
  return `Soạn phần thân văn bản từ dữ liệu sau (chỉ dùng dữ liệu này):\n${JSON.stringify(payload, null, 2)}`;
}

/** Kiểm tra AI có bịa nội dung không (dùng cho mọi loại văn bản) */
export function kiemTraBamNguon(ai: AiSoanVanBan, input: SoanVanBanInput): KetQuaKiemTra {
  const loi: string[] = [];
  const canhBao: string[] = [];
  const dk = new Map(dsDuKien(input).map((d) => [d.ma, d]));
  const tatCaGoc = [...dk.values()].map((d) => d.noiDung).join("\n");
  const meta = thongTinVanBan(input);
  const metaText = [meta.trich_yeu, meta.ngay_ky ?? "", meta.kinh_gui ?? "", ...meta.can_cu].join("\n");
  const soChoPhep = tapSoNguon(metaText);
  const tenChoPhep = `${metaText}\n${meta.chu_the}\n${input.donVi.coQuanBanHanh}\n${input.donVi.coQuanCapTren ?? ""}`;
  const khung = layKhung(input);

  Object.keys(ai.phan ?? {}).forEach((ma) => {
    if (!khung.some((p) => p.ma === ma)) loi.push(`Phần "${ma}" không có trong khung.`);
  });

  khung.forEach((p) => {
    (ai.phan?.[p.ma] ?? []).forEach((k, i) => {
      const nhan = `Phần ${p.ma}, khối ${i + 1}`;
      if (k.kieu === "dieu" && p.kieu !== "dieu") loi.push(`${nhan}: khối "dieu" chỉ dùng trong phần Điều.`);
      if (k.kieu === "khoan" || k.kieu === "diem") {
        kiemTraDoanVoiNguon(nhan, k.text, tatCaGoc, soChoPhep, loi, tenChoPhep);
        return;
      }
      const nguon = k.nguon ?? [];
      nguon.filter((m) => !dk.has(m)).forEach((m) => loi.push(`${nhan}: trích mã "${m}" không tồn tại.`));
      const goc = nguon.map((m) => dk.get(m)?.noiDung ?? "").join("\n");
      if (!p.vanMau && nguon.filter((m) => dk.has(m)).length === 0) {
        loi.push(`${nhan}: thiếu mã dữ kiện nguồn.`);
        return;
      }
      kiemTraDoanVoiNguon(nhan, k.text, p.vanMau ? `${goc}\n${tatCaGoc}` : goc, soChoPhep, loi, tenChoPhep);
    });
    if (p.batBuoc && !(ai.phan?.[p.ma] ?? []).length) canhBao.push(`Phần bắt buộc "${p.tieuDe ?? p.ma}" chưa có nội dung (thiếu dữ kiện).`);
  });
  (ai.thieu_thong_tin ?? []).forEach((t) => canhBao.push(`Thiếu thông tin: ${t}`));
  return { hopLe: loi.length === 0, loi, canhBao };
}

/** Lắp văn bản hoàn chỉnh: khung thể thức (code) + phần thân (AI) — đánh số do code */
export function lapVanBan(input: SoanVanBanInput, ai: AiSoanVanBan): VanBanStructuredOutput {
  const loai = layLoai(input.loaiId);
  const khung = layKhung(input);
  const B: NoiDungBlock[] = [];

  const canCu = (input.canCu ?? []).map((c) => c.trim().replace(/[;,.]+$/, "")).filter(Boolean);
  canCu.forEach((c, i) => B.push({ kieu: "can_cu", text: `${c}${i === canCu.length - 1 ? "," : ";"}` }));
  if (loai.id === "QUYET_DINH")
    B.push({ kieu: "quyet_dinh", text: `${input.donVi.chuTheTrongVanBan.toLocaleUpperCase("vi")}\nQUYẾT ĐỊNH:` });

  let soMuc = 0;
  let soDieu = 0;
  khung.forEach((p) => {
    const khoi = ai.phan?.[p.ma] ?? [];
    if (!khoi.length && !p.batBuoc) return;
    if (p.tieuDe) B.push({ kieu: "muc", text: `${LA_MA[soMuc++]}. ${p.tieuDe}` });
    if (!khoi.length) {
      B.push({ kieu: "doan", text: "[CẦN BỔ SUNG]" });
      return;
    }
    let soKhoan = 0;
    let soDiem = 0;
    khoi.forEach((k) => {
      const t = boSoThuTu(k.text);
      if (k.kieu === "khoan") {
        soKhoan++;
        soDiem = 0;
        B.push({ kieu: "khoan", text: `${soKhoan}. ${t.replace(/[.:]$/, "")}` });
      } else if (k.kieu === "diem") {
        soDiem++;
        B.push({ kieu: "diem", text: `${Math.max(soKhoan, 1)}.${soDiem}. ${t.replace(/[.:]$/, "")}` });
      } else if (k.kieu === "dieu") {
        soDieu++;
        B.push({ kieu: "dieu", text: `Điều ${soDieu}. ${ketThucCau(t)}`, nguon: k.nguon });
      } else {
        B.push({ kieu: k.kieu, text: ketThucCau(t), nguon: k.nguon });
      }
    });
  });

  const khungVb = buildKhungVanBan(input.donVi, loai, {
    so: input.so,
    ngayKy: input.ngayKy,
    trichYeu: input.trichYeu,
    kinhGui: input.kinhGui,
    dongKinhGui: input.dongKinhGui,
    noiNhan: input.noiNhan,
    deKy: input.deKy,
    chucVu: input.chucVu,
    nguoiKy: input.nguoiKy,
    vietTatLoai: input.vietTatLoai,
    donViThamMuu: input.donViThamMuu,
    chiDanDuThao: input.chiDanDuThao,
  });

  return {
    ...khungVb,
    noi_dung_blocks: B,
    noi_dung_html_hoac_markdown: B.map((b) => (b.kieu === "gach" ? `- ${b.text}` : b.text)).join("\n"),
  };
}

export interface KetQuaSoan {
  vanBan: VanBanStructuredOutput;
  kiemTra: KetQuaKiemTra;
}

/**
 * Luồng đầy đủ cho /api/ai/tro-ly — mọi loại văn bản.
 * goiAi(system, user) → chuỗi JSON. Tự sửa tối đa 1 vòng khi AI bịa nội dung.
 */
export async function soanVanBan(input: SoanVanBanInput, goiAi: (system: string, user: string) => Promise<string>): Promise<KetQuaSoan> {
  let user = buildUserPromptSoan(input);
  let ai: AiSoanVanBan = JSON.parse(stripJsonFence(await goiAi(SYSTEM_PROMPT_SOAN_NOI_DUNG, user)));
  let nguon = kiemTraBamNguon(ai, input);
  if (!nguon.hopLe) {
    user += `\n\nBản trước vi phạm nguyên tắc bám dữ kiện:\n${nguon.loi.map((l, i) => `${i + 1}. ${l}`).join("\n")}\nHãy xóa thông tin không có trong dữ kiện, ghi đúng mã nguồn và trả lại toàn bộ JSON.`;
    ai = JSON.parse(stripJsonFence(await goiAi(SYSTEM_PROMPT_SOAN_NOI_DUNG, user)));
    nguon = kiemTraBamNguon(ai, input);
  }
  const vanBan = lapVanBan(input, ai);
  const theThuc = validateVanBan(vanBan, input.donVi);
  return {
    vanBan,
    kiemTra: {
      hopLe: nguon.hopLe && theThuc.hopLe,
      loi: [...nguon.loi, ...theThuc.loi],
      canhBao: [...nguon.canhBao, ...theThuc.canhBao.filter((c) => !/CẦN BỔ SUNG/.test(c))],
    },
  };
}

/* ============================================================================
 * 14. BÁO CÁO TUẦN / KỲ — KHUNG MỤC I — 6 nhóm nhiệm vụ, 28 tiểu mục NV nhiệm kỳ 2026 - 2031
 *     (bố cục theo file mẫu đầu ra của Thành Đoàn TP. Hồ Chí Minh)
 * ========================================================================== */

export interface KhoanKhung {
  ma: string; // "1"…"6"
  ten: string;
  /**
   * SO_HIEU: điểm trình bày "2.1. Tên điểm" rồi gạch đầu dòng;
   * NHAN_DOAN: không đánh số, hoạt động đầu tiên viết thành đoạn mở đầu bằng nhãn ("Tên điểm: …").
   */
  kieuDiem?: "SO_HIEU" | "NHAN_DOAN";
  /** Tên các điểm con theo mã "2.1" … Mã chưa khai báo sẽ bị chuyển "Cần xác minh", không tự đặt tên. */
  diem: Record<string, string>;
}

/** Dựng từ bộ mã NV_GROUPS / NV_SUBS (bao-cao-agent.ts) — một nguồn duy nhất cho khung nhiệm vụ */
export const KHUNG_MUC_I: KhoanKhung[] = NV_GROUPS.map((g) => ({
  ma: String(g.num),
  ten: g.title,
  kieuDiem: g.subStyle,
  diem: Object.fromEntries(
    NV_SUBS.filter((s) => s.code.startsWith(`${g.code}.`)).map((s) => [s.code.replace(/^NV/, ""), s.label]),
  ),
}));

/* ============================================================================
 * 14.2. Báo cáo tuần — dữ liệu đầu vào
 * ========================================================================== */

export type XuLyHoatDong =
  | "DUA_VAO" // đưa vào thân báo cáo
  | "XAC_MINH" // thiếu thông tin bắt buộc
  | "LOAI_NGOAI_KY"
  | "LOAI_KHONG_PHAI_DOAN" // không do Đoàn, Hội, Đội chủ trì hoặc phối hợp
  | "KY_TOI"; // chuyển sang phương hướng kỳ tới

export const NHAN_XU_LY: Record<Exclude<XuLyHoatDong, "DUA_VAO">, string> = {
  XAC_MINH: "Cần xác minh - thiếu thông tin bắt buộc",
  LOAI_NGOAI_KY: "Loại - ngoài kỳ báo cáo",
  LOAI_KHONG_PHAI_DOAN: "Loại - không do tổ chức Đoàn, Hội, Đội chủ trì hoặc phối hợp",
  KY_TOI: "Chuyển sang Phương hướng kỳ tới",
};

export interface NguonTin {
  ten: string; // tiêu đề bài viết / bản ghi
  coQuan: string; // "Sài Gòn Giải Phóng"
  ngay: string; // "11/10/2026"
  url: string;
}

export interface HoatDong {
  ma: string; // "HD01"
  ten: string; // tên ngắn hoạt động
  ngay?: string | null; // "dd/mm/yyyy" — ngày diễn ra
  /** Toàn bộ dữ kiện gốc (trích từ bài viết / bản ghi) — AI chỉ được dùng thông tin ở đây */
  duKien: string;
  /**
   * Câu chèn vào báo cáo khi đoạn AI viết bị thiếu hoặc không bám nguồn.
   * Bỏ trống = dùng nguyên văn duKien.
   */
  doanDuPhong?: string | null;
  /** Mục chính "NV2.1" (điểm) hoặc "NV5" (khoản) và mục phụ */
  mucChinh?: string | null;
  mucPhu?: string[];
  xuLy: XuLyHoatDong;
  nguon: NguonTin[];
}

export interface ChiTieu {
  ma: string; // "CT3", "DP2"
  ten: string; // "Chỉ tiêu 3 - Công trình thanh niên …"
  /** Mã hoạt động liên quan (từ bước phân loại) — gợi ý cho AI, AI vẫn phải trích nguồn */
  lienQuan?: string[];
}

export interface BaoCaoTuanInput {
  donVi: DonViBanHanh;
  tuNgay: string; // "06/10/2026"
  denNgay: string; // "12/10/2026"
  ngayKy?: string | null;
  so?: string | null;
  /** Câu căn cứ mở đầu — do người dùng cấu hình, AI không tự thêm */
  canCuMoDau: string; // "Nghị quyết Đại hội đại biểu toàn quốc Đoàn TNCS Hồ Chí Minh lần thứ XIII, nhiệm kỳ 2026 - 2031"
  hoatDong: HoatDong[];
  chiTieu?: ChiTieu[];
  /** Tiêu đề bảng mục II */
  tieuDeMucII?: string;
  khung?: KhoanKhung[];
  chiDanDuThao?: string | null;
}

/* ============================================================================
 * 14.3. Báo cáo tuần — tiền xử lý — xác định kỳ, ép xử lý theo ngày (không phụ thuộc AI)
 * ========================================================================== */

const parseNgay = (s?: string | null): Date | null => {
  const m = s?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])) : null;
};
const fmtNgay = (d: Date): string =>
  `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
const congNgay = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

export interface ThongTinKy {
  soNgay: number;
  /** Kỳ đúng 7 ngày → gọi là "tuần" */
  laTuan: boolean;
  /** "tuần từ ngày 06/10/2026 đến ngày 12/10/2026" | "từ ngày … đến ngày …" */
  text: string;
  kyToi: { tu: string; den: string };
}

/** Kỳ tới có cùng độ dài, bắt đầu ngay sau ngày cuối kỳ */
export function thongTinKy(tuNgay: string, denNgay: string): ThongTinKy {
  const tu = parseNgay(tuNgay);
  const den = parseNgay(denNgay);
  if (!tu || !den) throw new Error("tuNgay/denNgay phải có dạng dd/mm/yyyy");
  if (den < tu) throw new Error("Ngày kết thúc kỳ báo cáo phải sau ngày bắt đầu");
  const soNgay = Math.round((den.getTime() - tu.getTime()) / 86400000) + 1;
  const laTuan = soNgay === 7;
  // Kỳ trọn tháng (01 → ngày cuối tháng) → kỳ tới là trọn tháng sau, không cộng số ngày
  const cuoiThang = (y: number, m: number) => new Date(Date.UTC(y, m + 1, 0));
  const laThang =
    tu.getUTCDate() === 1 &&
    tu.getUTCMonth() === den.getUTCMonth() &&
    tu.getUTCFullYear() === den.getUTCFullYear() &&
    den.getUTCDate() === cuoiThang(den.getUTCFullYear(), den.getUTCMonth()).getUTCDate();
  const kyToiDen = laThang ? cuoiThang(den.getUTCFullYear(), den.getUTCMonth() + 1) : congNgay(den, soNgay);
  return {
    soNgay,
    laTuan,
    text: `${laTuan ? "tuần " : ""}từ ngày ${tuNgay} đến ngày ${denNgay}`,
    kyToi: { tu: fmtNgay(congNgay(den, 1)), den: fmtNgay(kyToiDen) },
  };
}

export interface PhanLoai {
  duaVao: HoatDong[];
  khac: HoatDong[];
  kyToi: { tu: string; den: string };
  ky: ThongTinKy;
  canhBao: string[];
}

export function phanLoaiHoatDong(input: BaoCaoTuanInput): PhanLoai {
  const ky = thongTinKy(input.tuNgay, input.denNgay);
  const tu = parseNgay(input.tuNgay)!;
  const den = parseNgay(input.denNgay)!;
  const canhBao: string[] = [];
  const khung = input.khung ?? KHUNG_MUC_I;

  const hd = input.hoatDong.map((h) => {
    if (h.xuLy !== "DUA_VAO") return h;
    const d = parseNgay(h.ngay);
    if (!d) {
      canhBao.push(`${h.ma}: thiếu ngày diễn ra → chuyển "Cần xác minh".`);
      return { ...h, xuLy: "XAC_MINH" as const };
    }
    if (d < tu) return { ...h, xuLy: "LOAI_NGOAI_KY" as const };
    if (d > den) return { ...h, xuLy: "KY_TOI" as const };
    const ma = (h.mucChinh ?? "").replace(/^NV/i, "");
    const khoan = khung.find((k) => k.ma === ma.split(".")[0]);
    if (!khoan) {
      canhBao.push(`${h.ma}: mục chính "${h.mucChinh ?? ""}" không có trong khung → chuyển "Cần xác minh".`);
      return { ...h, xuLy: "XAC_MINH" as const };
    }
    if (ma.includes(".") && !khoan.diem[ma]) {
      canhBao.push(`${h.ma}: điểm "${ma}" chưa khai báo tên trong KHUNG_MUC_I → chuyển "Cần xác minh".`);
      return { ...h, xuLy: "XAC_MINH" as const };
    }
    return h;
  });

  const sortKey = (h: HoatDong) => `${parseNgay(h.ngay)?.getTime() ?? 0}`.padStart(15, "0") + h.ma;
  return {
    duaVao: hd.filter((h) => h.xuLy === "DUA_VAO").sort((a, b) => sortKey(a).localeCompare(sortKey(b))),
    khac: hd.filter((h) => h.xuLy !== "DUA_VAO"),
    kyToi: ky.kyToi,
    ky,
    canhBao,
  };
}

/* ============================================================================
 * 14.4. Báo cáo tuần — prompt — AI chỉ biên tập, trả JSON gắn mã nguồn
 * ========================================================================== */

export const SYSTEM_PROMPT_BAO_CAO_TUAN = `Bạn là chuyên viên Văn phòng của một cấp bộ Đoàn, biên tập báo cáo định kỳ (tuần/kỳ) theo thể thức Đoàn TNCS Hồ Chí Minh (Hướng dẫn 29-HD/TWĐTN-VP).

VAI TRÒ: Bạn KHÔNG soạn khung văn bản. Tên cơ quan, số - ký hiệu, ngày tháng, tên loại, trích yếu, đoạn mở đầu, tên các mục, nơi nhận, chữ ký và phụ lục đều do hệ thống dựng. Bạn chỉ BIÊN TẬP lại dữ kiện đã cho thành văn phong báo cáo.

NGUYÊN TẮC BÁM NGUỒN (vi phạm sẽ bị hệ thống loại bỏ và thay bằng nguyên văn dữ kiện):
1. Mỗi hoạt động trong "hoat_dong_dua_vao" được viết thành ĐÚNG MỘT đoạn, gắn đúng mã "ma". Không thêm hoạt động, không bỏ hoạt động, không gộp hai mã vào một đoạn.
2. Chỉ dùng thông tin trong trường "du_kien" của chính hoạt động đó. Mọi con số, ngày tháng, tên đơn vị, tên người, tên chương trình (trong ngoặc kép) phải xuất hiện nguyên văn trong du_kien. Không suy diễn mục đích, ý nghĩa, kết quả, số người tham gia nếu du_kien không nêu.
3. Không viết căn cứ, nghị quyết, khẩu hiệu, tính từ khen ngợi ("thành công tốt đẹp", "sôi nổi", "ý nghĩa thiết thực", "đông đảo") nếu du_kien không có.
4. Không dùng [CẦN BỔ SUNG], không dùng "(Chữ ký)", không viết "Nơi nhận", không viết tên loại văn bản, không đánh số thứ tự đầu đoạn, không dùng markdown.
5. Văn phong: câu đầy đủ, hành chính, ngôi thứ ba; mở đầu bằng thời gian nếu có ("Ngày 10/10/2026, …"); viết số liệu bằng chữ số như trong du_kien; tên đơn vị viết đúng như du_kien.

CÁC PHẦN KHÁC:
- "chi_tieu": chỉ ghi chỉ tiêu trong danh sách "chi_tieu" có hoạt động liên quan (gợi ý ở "lien_quan"); "ket_qua" chỉ nêu dữ kiện từ các mã trong "nguon"; nếu không có số liệu kết quả thì ghi rõ "Chưa có số liệu kết quả.".
- "uu_diem": 1–2 câu tổng hợp ĐÚNG những gì các hoạt động đã nêu; phải liệt kê mã nguồn. Không có hoạt động thì để null.
- "han_che": chỉ dựa vào "muc_chua_co_hoat_dong" và "hoat_dong_thieu_so_lieu" do hệ thống cung cấp; không nêu con số.
- "phuong_huong": chỉ từ hoạt động trong "hoat_dong_ky_toi", "hoat_dong_can_xac_minh" hoặc việc tiếp tục một hoạt động đang diễn ra trong "hoat_dong_dua_vao"; mỗi ý một phần tử, có mã nguồn. Không có thì trả mảng rỗng.

ĐỊNH DẠNG TRẢ VỀ: chỉ MỘT đối tượng JSON, không giải thích, không bọc \`\`\`:
{
  "hoat_dong": [{ "ma": "HD01", "doan": "…" }],
  "chi_tieu": [{ "ma": "CT3", "ket_qua": "…", "nguon": ["HD02"] }],
  "uu_diem": { "text": "…", "nguon": ["HD01", "HD06"] },
  "han_che": "…",
  "phuong_huong": [{ "text": "…", "nguon": ["HD16"] }]
}`;

export interface AiBaoCaoTuan {
  hoat_dong: { ma: string; doan: string }[];
  chi_tieu?: { ma: string; ket_qua: string; nguon: string[] }[];
  uu_diem?: { text: string; nguon: string[] } | null;
  han_che?: string | null;
  phuong_huong?: { text: string; nguon: string[] }[];
}

const maKhoanCua = (h: HoatDong) => (h.mucChinh ?? "").replace(/^NV/i, "").split(".")[0];

const tenMucTuan = (khung: KhoanKhung[], mucChinh?: string | null): string => {
  const ma = (mucChinh ?? "").replace(/^NV/i, "");
  const k = khung.find((x) => x.ma === ma.split(".")[0]);
  return k ? (ma.includes(".") ? `${ma}. ${k.diem[ma]}` : `${k.ma}. ${k.ten}`) : ma;
};

export function buildUserPromptBaoCaoTuan(input: BaoCaoTuanInput, pl: PhanLoai = phanLoaiHoatDong(input)): string {
  const khung = input.khung ?? KHUNG_MUC_I;
  const mucCo = new Set(pl.duaVao.map(maKhoanCua));
  const payload = {
    ky_bao_cao: `${input.tuNgay} - ${input.denNgay}`,
    ky_toi: `${pl.kyToi.tu} - ${pl.kyToi.den}`,
    hoat_dong_dua_vao: pl.duaVao.map((h) => ({
      ma: h.ma,
      ten: h.ten,
      ngay: h.ngay,
      muc: tenMucTuan(khung, h.mucChinh),
      du_kien: h.duKien,
    })),
    hoat_dong_ky_toi: pl.khac.filter((h) => h.xuLy === "KY_TOI").map((h) => ({ ma: h.ma, ten: h.ten, ngay: h.ngay, du_kien: h.duKien })),
    hoat_dong_can_xac_minh: pl.khac.filter((h) => h.xuLy === "XAC_MINH").map((h) => ({ ma: h.ma, ten: h.ten })),
    chi_tieu: (input.chiTieu ?? []).map((c) => ({ ma: c.ma, ten: c.ten, lien_quan: c.lienQuan ?? [] })),
    muc_chua_co_hoat_dong: khung.filter((k) => !mucCo.has(k.ma)).map((k) => `${k.ma}. ${k.ten}`),
    hoat_dong_thieu_so_lieu: pl.duaVao.filter((h) => !/\d+\s*(người|lượt|đoàn viên|thanh niên|sinh viên|thí sinh|học sinh|đội|công trình|suất|phần quà)/i.test(h.duKien)).map((h) => h.ma),
  };
  return `Biên tập báo cáo từ dữ liệu sau (chỉ dùng dữ liệu này):\n${JSON.stringify(payload, null, 2)}`;
}

/* ============================================================================
 * 14.5. Báo cáo tuần — kiểm tra bám nguồn
 * ========================================================================== */

const mangChuoi = (x: unknown): string[] => (Array.isArray(x) ? x.filter((s): s is string => typeof s === "string") : []);

/** Trả hàm kiểm tra một đoạn AI với các hoạt động nguồn được trích; trả danh sách lỗi (rỗng = đạt) */
function taoKiemTraTuan(input: BaoCaoTuanInput, pl: PhanLoai) {
  const tatCa = new Map([...pl.duaVao, ...pl.khac].map((h) => [h.ma, h]));
  const soKy = new Set([...layCacSo(input.tuNgay), ...layCacSo(input.denNgay), ...layCacSo(pl.kyToi.tu), ...layCacSo(pl.kyToi.den)]);
  const tenChoPhep = `${input.donVi.chuTheTrongVanBan}\n${input.canCuMoDau}`;
  return (nhan: string, text: unknown, maNguon: unknown, choPhepSoKy = false): string[] => {
    const loi: string[] = [];
    if (typeof text !== "string" || !text.trim()) return [`${nhan}: nội dung trống.`];
    const ma = mangChuoi(maNguon);
    ma.filter((m) => !tatCa.has(m)).forEach((m) => loi.push(`${nhan}: trích mã "${m}" không tồn tại trong dữ liệu.`));
    const nguon = ma.map((m) => tatCa.get(m)).filter((h): h is HoatDong => !!h);
    if (nguon.length === 0) return [...loi, `${nhan}: không có mã nguồn hợp lệ.`];
    const goc = nguon.map((h) => `${h.ten}\n${h.ngay ?? ""}\n${h.duKien}`).join("\n");
    kiemTraDoanVoiNguon(nhan, text, goc, choPhepSoKy ? soKy : new Set<string>(), loi, tenChoPhep);
    return loi;
  };
}

export function kiemTraBamNguonTuan(ai: AiBaoCaoTuan, input: BaoCaoTuanInput, pl: PhanLoai = phanLoaiHoatDong(input)): KetQuaKiemTra {
  const kt = taoKiemTraTuan(input, pl);
  const loi: string[] = [];
  const duaVao = new Set(pl.duaVao.map((h) => h.ma));

  // Hoạt động: đủ, không thừa, không trùng
  const daViet = new Set<string>();
  (Array.isArray(ai.hoat_dong) ? ai.hoat_dong : []).forEach((x) => {
    if (!duaVao.has(x?.ma)) loi.push(`Đoạn mã "${x?.ma}" không thuộc danh sách hoạt động được đưa vào báo cáo.`);
    else if (daViet.has(x.ma)) loi.push(`Hoạt động "${x.ma}" bị viết lặp.`);
    else loi.push(...kt(`Hoạt động ${x.ma}`, x.doan, [x.ma]));
    if (x?.ma) daViet.add(x.ma);
  });
  pl.duaVao.filter((h) => !daViet.has(h.ma)).forEach((h) => loi.push(`Thiếu đoạn cho hoạt động ${h.ma} (${h.ten}).`));

  const maChiTieu = new Set((input.chiTieu ?? []).map((c) => c.ma));
  (Array.isArray(ai.chi_tieu) ? ai.chi_tieu : []).forEach((c) => {
    if (!maChiTieu.has(c?.ma)) loi.push(`Chỉ tiêu "${c?.ma}" không có trong danh sách chỉ tiêu.`);
    loi.push(...kt(`Chỉ tiêu ${c?.ma}`, c?.ket_qua, c?.nguon));
  });
  if (ai.uu_diem) loi.push(...kt("Ưu điểm", ai.uu_diem.text, ai.uu_diem.nguon));
  if (typeof ai.han_che === "string" && layCacSo(ai.han_che).length) loi.push("Hạn chế không được nêu con số.");
  (Array.isArray(ai.phuong_huong) ? ai.phuong_huong : []).forEach((p, i) => loi.push(...kt(`Phương hướng ý ${i + 1}`, p?.text, p?.nguon, true)));

  return { hopLe: loi.length === 0, loi, canhBao: [] };
}

/**
 * Lọc kết quả AI sau vòng sửa: đoạn hoạt động thiếu/không bám nguồn → thay bằng doanDuPhong (nguyên văn dữ kiện);
 * chỉ tiêu, ưu điểm, phương hướng không bám nguồn → bỏ; hoạt động kỳ tới chưa được nhắc → thêm ý từ dữ liệu.
 * Bảo đảm văn bản cuối cùng không chứa thông tin ngoài dữ kiện.
 */
export function locKetQuaAiTuan(ai: AiBaoCaoTuan, input: BaoCaoTuanInput, pl: PhanLoai = phanLoaiHoatDong(input)): { ai: AiBaoCaoTuan; ghiChu: string[] } {
  const kt = taoKiemTraTuan(input, pl);
  const ghiChu: string[] = [];
  const dsAi = Array.isArray(ai.hoat_dong) ? ai.hoat_dong : [];

  const hoat_dong = pl.duaVao.map((h) => {
    const duPhong = (h.doanDuPhong ?? h.duKien).trim();
    const x = dsAi.find((d) => d?.ma === h.ma);
    const doan = typeof x?.doan === "string" ? boSoThuTu(x.doan) : "";
    if (!doan) {
      ghiChu.push(`${h.ma}: AI không viết đoạn cho hoạt động này → dùng nguyên văn dữ kiện.`);
      return { ma: h.ma, doan: duPhong };
    }
    const loi = kt(`Hoạt động ${h.ma}`, doan, [h.ma]);
    if (loi.length) {
      ghiChu.push(`${loi.join(" ")} → đã thay bằng nguyên văn dữ kiện.`);
      return { ma: h.ma, doan: duPhong };
    }
    return { ma: h.ma, doan };
  });

  const maChiTieu = new Set((input.chiTieu ?? []).map((c) => c.ma));
  const daCoChiTieu = new Set<string>();
  const chi_tieu = (Array.isArray(ai.chi_tieu) ? ai.chi_tieu : []).filter((c) => {
    if (!c || !maChiTieu.has(c.ma) || daCoChiTieu.has(c.ma)) return false;
    const loi = kt(`Chỉ tiêu ${c.ma}`, c.ket_qua, c.nguon);
    if (loi.length) {
      ghiChu.push(`${loi.join(" ")} → đã bỏ dòng chỉ tiêu ${c.ma}.`);
      return false;
    }
    daCoChiTieu.add(c.ma);
    return true;
  });

  let uu_diem = ai.uu_diem ?? null;
  if (uu_diem) {
    const loi = kt("Ưu điểm", uu_diem.text, uu_diem.nguon);
    if (loi.length) {
      ghiChu.push(`${loi.join(" ")} → đã bỏ phần ưu điểm.`);
      uu_diem = null;
    }
  }

  let han_che = typeof ai.han_che === "string" && ai.han_che.trim() ? ai.han_che.trim() : null;
  if (han_che && layCacSo(han_che).length) {
    ghiChu.push("Hạn chế có con số không có cơ sở → đã bỏ phần hạn chế.");
    han_che = null;
  }

  const phuong_huong = (Array.isArray(ai.phuong_huong) ? ai.phuong_huong : []).filter((p, i) => {
    const loi = kt(`Phương hướng ý ${i + 1}`, p?.text, p?.nguon, true);
    if (loi.length) ghiChu.push(`${loi.join(" ")} → đã bỏ ý này.`);
    return loi.length === 0;
  });
  const daNhac = new Set(phuong_huong.flatMap((p) => mangChuoi(p.nguon)));
  pl.khac
    .filter((h) => h.xuLy === "KY_TOI" && !daNhac.has(h.ma))
    .forEach((h) => phuong_huong.push({ text: h.ngay ? `${h.ten} (ngày ${h.ngay})` : h.ten, nguon: [h.ma] }));

  return { ai: { hoat_dong, chi_tieu, uu_diem, han_che, phuong_huong }, ghiChu };
}

/* ============================================================================
 * 14.6. Báo cáo tuần — lắp văn bản — code dựng khung, chèn đoạn AI theo mã
 *       Khoản / mục không có nội dung được để trống (chỉ giữ tiêu đề).
 * ========================================================================== */

const pad2 = (n: number) => String(n).padStart(2, "0");

export function lapBaoCaoTuan(input: BaoCaoTuanInput, ai: AiBaoCaoTuan, pl: PhanLoai = phanLoaiHoatDong(input)): VanBanStructuredOutput {
  const khung = input.khung ?? KHUNG_MUC_I;
  const loai = vanBanLoaiList.find((l) => l.id === "BAO_CAO")!;
  const kyText = pl.ky.text;
  const doanTheoMa = new Map((Array.isArray(ai.hoat_dong) ? ai.hoat_dong : []).map((x) => [x.ma, x.doan]));
  const doanCua = (h: HoatDong) => ketThucCau(doanTheoMa.get(h.ma) || (h.doanDuPhong ?? h.duKien));
  const B: NoiDungBlock[] = [];

  B.push({
    kieu: "doan",
    text: `Thực hiện ${input.canCuMoDau}, ${input.donVi.chuTheTrongVanBan} báo cáo kết quả công tác Đoàn và phong trào thanh thiếu nhi ${kyText} như sau:`,
  });

  // I. Kết quả — mọi khoản luôn có tiêu đề; khoản không có hoạt động để trống; điểm chỉ hiện khi có hoạt động
  B.push({ kieu: "muc", text: "I. KẾT QUẢ THỰC HIỆN NHIỆM VỤ, GIẢI PHÁP" });
  khung.forEach((k) => {
    B.push({ kieu: "khoan", text: `${k.ma}. ${k.ten}` });
    const trongKhoan = pl.duaVao.filter((h) => maKhoanCua(h) === k.ma);
    trongKhoan
      .filter((h) => !(h.mucChinh ?? "").includes("."))
      .forEach((h) => B.push({ kieu: "gach", text: doanCua(h), nguon: [h.ma] }));
    Object.keys(k.diem)
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .forEach((maDiem) => {
        const hs = trongKhoan.filter((h) => (h.mucChinh ?? "").replace(/^NV/i, "") === maDiem);
        if (hs.length === 0) return;
        if (k.kieuDiem === "NHAN_DOAN") {
          // "Học tập và làm theo …: Ngày 11/10/2026, …" — các hoạt động sau cùng điểm viết gạch đầu dòng
          B.push({ kieu: "doan", text: `${k.diem[maDiem]}: ${doanCua(hs[0])}`, nguon: [hs[0].ma] });
          hs.slice(1).forEach((h) => B.push({ kieu: "gach", text: doanCua(h), nguon: [h.ma] }));
        } else {
          B.push({ kieu: "diem", text: `${maDiem}. ${k.diem[maDiem]}` });
          hs.forEach((h) => B.push({ kieu: "gach", text: doanCua(h), nguon: [h.ma] }));
        }
      });
  });

  // II. Chỉ tiêu — chỉ có khi có kết quả gắn chỉ tiêu
  let soMuc = 1;
  const chiTieuAi = (ai.chi_tieu ?? []).filter((c) => (input.chiTieu ?? []).some((x) => x.ma === c.ma));
  if (chiTieuAi.length) {
    soMuc++;
    B.push({ kieu: "muc", text: `${LA_MA[soMuc - 1]}. ${input.tieuDeMucII ?? "KẾT QUẢ GẮN VỚI CHỈ TIÊU, NHIỆM VỤ ĐỘT PHÁ"}` });
    B.push({
      kieu: "bang",
      text: "",
      header: ["STT", "Chỉ tiêu, nhiệm vụ đột phá", "Kết quả trong kỳ"],
      colWidths: [8, 42, 50],
      rows: chiTieuAi.map((c, i) => [pad2(i + 1), input.chiTieu!.find((x) => x.ma === c.ma)!.ten, ketThucCau(c.ket_qua)]),
    });
  }

  // Đánh giá chung — dòng nào không có nội dung thì để trống
  soMuc++;
  B.push({ kieu: "muc", text: `${LA_MA[soMuc - 1]}. ĐÁNH GIÁ CHUNG` });
  if (ai.uu_diem?.text) B.push({ kieu: "doan", text: `Ưu điểm: ${ketThucCau(ai.uu_diem.text)}`, nguon: ai.uu_diem.nguon });
  if (ai.han_che) B.push({ kieu: "doan", text: `Hạn chế: ${ketThucCau(ai.han_che)}` });

  // Phương hướng
  soMuc++;
  B.push({
    kieu: "muc",
    text: `${LA_MA[soMuc - 1]}. PHƯƠNG HƯỚNG ${pl.ky.laTuan ? "TUẦN" : "KỲ"} TỚI (TỪ NGÀY ${pl.kyToi.tu} ĐẾN NGÀY ${pl.kyToi.den})`,
  });
  (ai.phuong_huong ?? []).forEach((p) => B.push({ kieu: "gach", text: ketThucCau(vietHoaDau(p.text)), nguon: p.nguon }));

  // Phụ lục — dựng hoàn toàn từ dữ liệu đầu vào
  const nguonList: NguonTin[] = [];
  const maNguon = (n: NguonTin) => {
    let i = nguonList.findIndex((x) => x.url === n.url);
    if (i < 0) i = nguonList.push(n) - 1;
    return `S${i + 1}`;
  };
  const nhanNguon = (h: HoatDong) => (h.nguon ?? []).map((n) => `${n.coQuan}, ${n.ngay}`).join("; ");
  [...pl.duaVao, ...pl.khac].forEach((h) => (h.nguon ?? []).forEach(maNguon));

  const PL: NoiDungBlock[] = [
    { kieu: "muc", text: "I. Hoạt động được đưa vào báo cáo" },
    {
      kieu: "bang",
      text: "",
      header: ["STT", "Mã", "Hoạt động", "Ngày", "Mục", "Nguồn"],
      colWidths: [6, 7, 42, 13, 14, 18],
      rows: pl.duaVao.map((h, i) => [
        pad2(i + 1),
        h.ma,
        h.ten,
        h.ngay ?? "",
        `${h.mucChinh ?? ""}${h.mucPhu?.length ? ` (phụ: ${h.mucPhu.join(", ")})` : ""}`,
        nhanNguon(h),
      ]),
    },
  ];
  if (pl.khac.length) {
    PL.push({ kieu: "muc", text: "II. Hoạt động không đưa vào thân báo cáo" });
    PL.push({
      kieu: "bang",
      text: "",
      header: ["STT", "Mã", "Hoạt động", "Xử lý", "Nguồn"],
      colWidths: [6, 7, 42, 25, 20],
      rows: pl.khac.map((h, i) => [pad2(i + 1), h.ma, h.ten, NHAN_XU_LY[h.xuLy as Exclude<XuLyHoatDong, "DUA_VAO">], nhanNguon(h)]),
    });
  }
  if (nguonList.length) {
    PL.push({ kieu: "muc", text: `${pl.khac.length ? "III" : "II"}. Đường dẫn nguồn tin` });
    PL.push({
      kieu: "bang",
      text: "",
      header: ["Mã", "Bài viết", "Đường dẫn"],
      colWidths: [7, 43, 50],
      rows: nguonList.map((n, i) => [`S${i + 1}`, `${n.ten} (${n.coQuan}, ${n.ngay})`, n.url]),
    });
  }

  const trichYeu = `kết quả công tác Đoàn và phong trào thanh thiếu nhi\n${kyText}`;
  const khungVb = buildKhungVanBan(input.donVi, loai, {
    so: input.so,
    ngayKy: input.ngayKy,
    trichYeu,
    chiDanDuThao: input.chiDanDuThao,
  });

  return {
    ...khungVb,
    noi_dung_blocks: B,
    noi_dung_html_hoac_markdown: B.filter((b) => b.kieu !== "bang").map((b) => (b.kieu === "gach" ? `- ${b.text}` : b.text)).join("\n"),
    phu_luc: [
      {
        tieu_de: "PHỤ LỤC",
        trich_yeu: "Danh mục hoạt động, nguồn tin và kết quả phân loại",
        ghi_chu: `(Kèm theo Báo cáo kết quả công tác Đoàn và phong trào thanh thiếu nhi ${kyText})`,
        blocks: PL,
      },
    ],
  };
}

/* ============================================================================
 * 14.7. Báo cáo tuần — luồng đầy đủ (dùng ở /api/ai/bao-cao-tuan)
 * ========================================================================== */

/** Đọc JSON từ output AI (chống markdown fence / chữ thừa) */
const docJsonAi = (s: string): AiBaoCaoTuan => {
  const sach = stripJsonFence(s);
  try {
    return JSON.parse(sach) as AiBaoCaoTuan;
  } catch {
    const m = sach.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]) as AiBaoCaoTuan;
    throw new Error("AI trả về JSON không hợp lệ");
  }
};

export interface KetQuaBaoCaoTuan {
  vanBan: VanBanStructuredOutput;
  /** hopLe/loi: thể thức của văn bản cuối; canhBao: phân loại, các đoạn AI bị thay/bỏ, gợi ý rà soát */
  kiemTra: KetQuaKiemTra;
  phanLoai: PhanLoai;
  /** Số lượt gọi AI đã dùng (0 khi kỳ không có hoạt động) */
  soLuotAi: number;
}

/**
 * goiAi: hàm gọi model (system, user) → chuỗi JSON. Tối đa 1 vòng sửa nếu sai nguồn;
 * sau vòng sửa, phần còn sai được thay bằng nguyên văn dữ kiện (locKetQuaAiTuan) — văn bản cuối luôn bám nguồn.
 */
export async function soanBaoCaoTuan(
  input: BaoCaoTuanInput,
  goiAi: (system: string, user: string) => Promise<string>,
): Promise<KetQuaBaoCaoTuan> {
  const pl = phanLoaiHoatDong(input);
  const canhBaoAi: string[] = [];
  let ai: AiBaoCaoTuan = { hoat_dong: [] };
  let soLuotAi = 0;

  // Kỳ không có hoạt động nào cần viết → không gọi AI, các mục để trống
  const canAi = pl.duaVao.length > 0 || pl.khac.some((h) => h.xuLy === "KY_TOI" || h.xuLy === "XAC_MINH");
  if (canAi) {
    let user = buildUserPromptBaoCaoTuan(input, pl);
    try {
      soLuotAi++;
      ai = docJsonAi(await goiAi(SYSTEM_PROMPT_BAO_CAO_TUAN, user));
      const nguon = kiemTraBamNguonTuan(ai, input, pl);
      if (!nguon.hopLe) {
        user += `\n\nBản trước vi phạm nguyên tắc bám nguồn:\n${nguon.loi.map((l, i) => `${i + 1}. ${l}`).join("\n")}\nHãy sửa: xóa thông tin không có trong du_kien, giữ đúng mã. Trả lại toàn bộ JSON.`;
        try {
          soLuotAi++;
          const sua = docJsonAi(await goiAi(SYSTEM_PROMPT_BAO_CAO_TUAN, user));
          if (kiemTraBamNguonTuan(sua, input, pl).loi.length <= nguon.loi.length) ai = sua;
        } catch {
          canhBaoAi.push("Vòng AI tự sửa không đọc được kết quả — giữ bản đầu, phần sai đã thay bằng dữ kiện gốc.");
        }
      }
    } catch (e) {
      // AI lỗi/không đọc được JSON → vẫn lập báo cáo từ nguyên văn dữ kiện
      ai = { hoat_dong: [] };
      canhBaoAi.push(`Không dùng được kết quả AI (${e instanceof Error ? e.message : "lỗi không rõ"}) — các đoạn lấy nguyên văn dữ kiện, phần đánh giá để trống.`);
    }
  }

  const loc = locKetQuaAiTuan(ai, input, pl);
  const vanBan = lapBaoCaoTuan(input, loc.ai, pl);
  const theThuc = validateVanBan(vanBan, input.donVi);
  return {
    vanBan,
    phanLoai: pl,
    soLuotAi,
    kiemTra: {
      hopLe: theThuc.hopLe,
      loi: theThuc.loi,
      canhBao: [...pl.canhBao, ...canhBaoAi, ...loc.ghiChu, ...theThuc.canhBao],
    },
  };
}

/* ============================================================================
 * 15. VĂN BẢN THUẦN — để xem trước và lưu vào danh sách báo cáo.
 *     Bắt đầu từ tên loại (khối đầu trang do lớp xuất Word dựng lại); bảng viết dạng "| a | b |".
 * ========================================================================== */

export function vanBanThanhVanBanThuan(vb: VanBanStructuredOutput): string {
  const khoi = (bs: NoiDungBlock[]): string[] =>
    bs.flatMap((b) => {
      if (b.kieu === "bang") {
        const hang = (r: string[]) => `| ${r.map((c) => c.replace(/\|/g, "/").replace(/\s*\n\s*/g, " ")).join(" | ")} |`;
        return ["", ...(b.header ? [hang(b.header), `|${b.header.map(() => "---").join("|")}|`] : []), ...(b.rows ?? []).map(hang), ""];
      }
      return [b.kieu === "gach" ? `- ${b.text}` : b.text];
    });

  const dong: string[] = [];
  if (vb.ten_loai_vb) dong.push(vb.ten_loai_vb);
  if (vb.trich_yeu_vb) dong.push(...vb.trich_yeu_vb.split("\n"));
  if (vb.trich_yeu_cong_van) dong.push(vb.trich_yeu_cong_van);
  dong.push("-----------", "");
  if (vb.kinh_gui) dong.push(vb.kinh_gui, "");
  dong.push(...(vb.noi_dung_blocks?.length ? khoi(vb.noi_dung_blocks) : vb.noi_dung_html_hoac_markdown.split("\n")));
  dong.push("", "Nơi nhận:", ...vb.noi_nhan, "");
  if (vb.the_thuc_de_ky) dong.push(vb.the_thuc_de_ky);
  dong.push(vb.chuc_vu_ky);
  if (vb.ten_nguoi_ky) dong.push(vb.ten_nguoi_ky);
  for (const p of vb.phu_luc ?? []) {
    dong.push("", "", p.tieu_de, p.trich_yeu, ...(p.ghi_chu ? [p.ghi_chu] : []), "-----------", ...khoi(p.blocks));
  }
  return dong.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
