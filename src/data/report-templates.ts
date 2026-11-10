/**
 * Kho mẫu văn bản báo cáo Đoàn TNCS Hồ Chí Minh
 * CHUẨN HÓA DUY NHẤT 02 MẪU VĂN BẢN CHÍNH THỨC THEO QUY ĐỊNH:
 * 1. Mẫu 01 (DINH_KY): Báo cáo định kỳ (Tuần / Tháng / Quý / Năm) — Căn cứ file "Bao_cao_tuan_ThanhDoan_TPHCM_06-12.10.2026_mau_dau_ra.docx"
 * 2. Mẫu 02 (CHINH_TRI_TONG_KET): Báo cáo chính trị Đại hội Đoàn — Căn cứ file "2. Dự thảo lần 5 BCCT Đại hội Đoàn XIII - trình TTBBT TW Đảng.docx"
 */

export interface ReportTemplate {
  id: "DINH_KY" | "CHINH_TRI_TONG_KET";
  name: string; // "Báo cáo định kỳ" | "Báo cáo chính trị"
  docSuffix: string; // ký hiệu vụ: BC/TĐTN | BCCT/ĐTN
  docPrefix: string; // "BC" | "BCCT"
  description: string;
  cadence: string; // chu kỳ khuyến nghị
  titlePattern: (label: string, org: string) => string;
  defaultBases: string[];
  outline: string[];
  recipients: (orgName: string) => string[];
}

export const reportTemplates: ReportTemplate[] = [
  {
    id: "DINH_KY",
    name: "Báo cáo định kỳ (Tuần / Tháng / Quý / Năm)",
    docSuffix: "BC/TĐTN",
    docPrefix: "BC",
    description:
      "Báo cáo kết quả công tác Đoàn và phong trào thanh thiếu nhi định kỳ (tuần/tháng/quý/năm). Chuẩn hóa theo thể thức Thành Đoàn TP.HCM và 6 nhóm nhiệm vụ, giải pháp công tác Đoàn.",
    cadence: "Định kỳ: Hàng tuần, trước ngày 05 hàng tháng, cuối quý hoặc cuối năm",
    titlePattern: (label, org) =>
      `Báo cáo kết quả công tác Đoàn và phong trào thanh thiếu nhi ${label} của ${org}`,
    defaultBases: [
      "Nghị quyết Đại hội đại biểu toàn quốc Đoàn TNCS Hồ Chí Minh lần thứ XIII, nhiệm kỳ 2026 - 2031",
      "Quy chế làm việc của Ban Chấp hành Đoàn TNCS Hồ Chí Minh",
      "Kế hoạch công tác Đoàn và phong trào thanh thiếu nhi của Đoàn cấp trên và đơn vị",
    ],
    outline: [
      "I. KẾT QUẢ THỰC HIỆN NHIỆM VỤ, GIẢI PHÁP",
      "1. Công tác tuyên truyền, giáo dục",
      "2. Phong trào “Tuổi trẻ Việt Nam tiên phong trong kỷ nguyên mới”",
      "3. Chương trình “Phát triển toàn diện thanh niên Việt Nam”",
      "4. Công tác xây dựng Đoàn, mở rộng mặt trận đoàn kết tập hợp thanh niên",
      "5. Công tác phụ trách Đội TNTP Hồ Chí Minh, bảo vệ, chăm sóc, giáo dục thiếu niên, nhi đồng",
      "6. Công tác tham gia xây dựng, bảo vệ Đảng và hệ thống chính trị",
      "II. KẾT QUẢ GẮN VỚI CHỈ TIÊU, NHIỆM VỤ ĐỘT PHÁ NHIỆM KỲ 2026 - 2031",
      "III. ĐÁNH GIÁ CHUNG (Ưu điểm · Hạn chế)",
      "IV. PHƯƠNG HƯỚNG KỲ TỚI (tên phần theo kỳ: tuần tới / tháng tới / quý tới / 6 tháng cuối năm / năm tới)",
      "V. ĐỀ XUẤT, KIẾN NGHỊ (chỉ có khi đầu vào có đề xuất)",
    ],
    recipients: (org) => ["Ban Bí thư Trung ương Đoàn (để báo cáo)", "Ban Thường vụ Đoàn cấp trên trực tiếp", "Lưu VP."],
  },
  {
    id: "CHINH_TRI_TONG_KET",
    name: "Báo cáo chính trị Đại hội Đoàn (Tổng kết nhiệm kỳ)",
    docSuffix: "BCCT/ĐTN",
    docPrefix: "BCCT",
    description:
      "Báo cáo chính trị của Ban Chấp hành trình tại Đại hội Đoàn TNCS Hồ Chí Minh. Chuẩn hóa theo Dự thảo lần 5 Báo cáo chính trị Đại hội Đoàn toàn quốc lần thứ XIII trình Thường trực Ban Bí thư TW Đảng.",
    cadence: "Nhiệm kỳ Đại hội Đoàn (5 năm một lần) hoặc Tổng kết giai đoạn lớn",
    titlePattern: (label, org) =>
      `Báo cáo chính trị của Ban Chấp hành ${org} trình tại Đại hội Đoàn (${label})`,
    defaultBases: [
      "Nghị quyết Đại hội Đảng toàn quốc và định hướng công tác thanh niên trong kỷ nguyên mới",
      "Nghị quyết Đại hội Đoàn TNCS Hồ Chí Minh nhiệm kỳ trước",
      "Nghị quyết số 57-NQ/TW ngày 22/12/2024 của Bộ Chính trị về đột phá phát triển KHCN, ĐMST và chuyển đổi số quốc gia",
      "Nghị quyết số 68-NQ/TW của Bộ Chính trị về phát triển kinh tế tư nhân",
    ],
    outline: [
      "Phần thứ nhất: ĐÁNH GIÁ KẾT QUẢ TRIỂN KHAI THỰC HIỆN NGHỊ QUYẾT ĐẠI HỘI ĐOÀN TOÀN QUỐC LẦN THỨ XII",
      "I. Kết quả đạt được",
      "1. Công tác tuyên truyền, giáo dục",
      "2. Các phong trào hành động cách mạng",
      "3. Các chương trình đồng hành với thanh niên",
      "4. Công tác phụ trách Đội TNTP Hồ Chí Minh, chăm sóc, bảo vệ, giáo dục thiếu niên, nhi đồng",
      "5. Công tác quốc tế thanh niên",
      "6. Công tác xây dựng Đoàn, mở rộng mặt trận đoàn kết tập hợp thanh niên",
      "7. Công tác tham gia xây dựng, bảo vệ Đảng và hệ thống chính trị",
      "8. Tiếp tục đổi mới công tác tham mưu, phối hợp, chỉ đạo của Đoàn",
      "9. Đánh giá việc thực hiện các chỉ tiêu nhiệm kỳ",
      "II. Hạn chế, nguyên nhân",
      "III. Một số bài học kinh nghiệm",
      "Phần thứ hai: NHIỆM VỤ VÀ GIẢI PHÁP CÔNG TÁC ĐOÀN VÀ PHONG TRÀO THANH THIẾU NHI NHIỆM KỲ 2026 - 2031",
      "I. Dự báo tình hình đất nước và thanh thiếu nhi",
      "II. Mục tiêu",
      "III. Khẩu hiệu hành động: “Bản lĩnh tự cường - Tiên phong sáng tạo - Khát vọng cống hiến - Làm chủ tương lai”",
      "IV. Một số chỉ tiêu trọng tâm",
      "V. Nhiệm vụ, giải pháp công tác Đoàn và phong trào thanh thiếu nhi nhiệm kỳ 2026 - 2031",
      "VI. Các nhiệm vụ đột phá",
    ],
    recipients: (org) => ["Ban Chấp hành Đoàn cấp trên", "Cấp ủy Đảng cùng cấp", "Lưu: " + org],
  },
];

/** Tìm mẫu báo cáo theo ID, tương thích ngược các mã cũ */
export const templateById = (id: string): ReportTemplate => {
  if (id === "CHINH_TRI_TONG_KET" || id === "SUMMARY") {
    return reportTemplates[1];
  }
  return reportTemplates[0];
};

/** Sinh số/ký hiệu gợi ý: BC-{số thứ tự}/BC-ĐTN */
export function suggestDocCode(existingExports: number, prefix = "BC"): string {
  return `${prefix}-${String(100 + existingExports + 1)}/BC-ĐTN`;
}
