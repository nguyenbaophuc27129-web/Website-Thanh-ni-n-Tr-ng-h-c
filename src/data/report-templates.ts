/**
 * Kho mẫu văn bản báo cáo — truy suất theo mẫu: tuần / tháng / tiến độ / tổng kết.
 * Căn cứ mặc định là các văn bản chung thường trích trong hệ thống Đoàn; đơn vị bỏ chọn/thêm căn cứ riêng khi xuất.
 */
export interface ReportTemplate {
  id: "WEEKLY" | "MONTHLY" | "PROGRESS" | "SUMMARY";
  name: string; // "Báo cáo tuần"
  docSuffix: string; // ký hiệu vụ: BC-ĐTN
  docPrefix: string; // "BC" | "TTr" | "CV"
  description: string;
  cadence: string; // chu kỳ khuyến nghị
  titlePattern: (label: string, org: string) => string;
  defaultBases: string[];
  outline: string[];
  recipients: (orgName: string) => string[];
}

const BASE_BTS_2027 =
  "Bộ Tiêu chí các Tỉnh, Thành đoàn năm 2027 do Ban Bí thư Trung ương Đoàn ban hành";
const BASE_NQ57 =
  "Nghị quyết số 57-NQ/TW ngày 22/12/2024 của Bộ Chính trị về đột phá phát triển khoa học, công nghệ, đổi mới sáng tạo và chuyển đổi số quốc gia";
const BASE_NQ68 =
  "Nghị quyết số 68-NQ/TW của Bộ Chính trị về phát triển kinh tế tư nhân";
const BASE_NQ59 =
  "Nghị quyết số 59-NQ/TW ngày 24/01/2025 của Bộ Chính trị về hội nhập quốc tế trong tình hình mới";
const BASE_DAIHOI12 =
  "Nghị quyết Đại hội XII Đoàn TNCS Hồ Chí Minh, nhiệm kỳ 2022 - 2027";

export const reportTemplates: ReportTemplate[] = [
  {
    id: "WEEKLY",
    name: "Báo cáo tuần",
    docSuffix: "BC-ĐTN",
    docPrefix: "BC",
    description:
      "Báo cáo tình hình tuần của đơn vị: hoạt động nổi bật, tình hình dư luận xã hội trong thanh niên, vụ việc phát sinh (nếu có). Phục vụ thông tin tuần gửi cấp trên.",
    cadence: "Hàng tuần (kết thúc tuần làm việc)",
    titlePattern: (label, org) => `Báo cáo tình hình tuần của ${org} (${label})`,
    defaultBases: [
      "Kế hoạch công tác thông tin, báo cáo của Đoàn cấp trên trực tiếp",
      "Yêu cầu báo cáo tình hình dư luận xã hội theo hướng dẫn của Trung ương Đoàn (48 báo cáo tuần + 11 báo cáo tháng + 4 báo cáo quý/năm)",
    ],
    outline: [
      "I. CĂN CỨ",
      "II. TÌNH HÌNH NỔI BẬT TRONG TUẦN",
      "III. DƯ LUẬN XÃ HỘI TRONG THANH NIÊN VÀ VỤ VIỆC PHÁT SINH",
      "IV. KIẾN NGHỊ, ĐỀ XUẤT",
    ],
    recipients: (org) => ["Ban Thường vụ Đoàn cấp trên trực tiếp", "Lưu: VP " + org],
  },
  {
    id: "MONTHLY",
    name: "Báo cáo tháng",
    docSuffix: "BC-ĐTN",
    docPrefix: "BC",
    description:
      "Báo cáo kết quả công tác và phong trào thanh niên theo tháng: hoạt động đã triển khai, tiến độ nhiệm vụ thi đua, công tác truyền thông.",
    cadence: "Vào trước ngày 05 tháng sau",
    titlePattern: (label, org) => `Báo cáo công tác Đoàn và phong trào thanh niên ${label} của ${org}`,
    defaultBases: [
      BASE_BTS_2027,
      BASE_DAIHOI12,
      "Kế hoạch công tác tháng của Đoàn đơn vị",
    ],
    outline: [
      "I. CĂN CỨ",
      "II. KẾT QUẢ THỰC HIỆN CÔNG TÁC ĐOÀN VÀ PHONG TRÀO THANH NIÊN",
      "III. ĐÁNH GIÁ CHUNG VÀ KIẾN NGHỊ",
    ],
    recipients: (org) => ["Ban Thường vụ Đoàn cấp trên trực tiếp", "Lưu: VP " + org],
  },
  {
    id: "PROGRESS",
    name: "Báo cáo tiến độ thi đua",
    docSuffix: "BC-ĐTN",
    docPrefix: "BC",
    description:
      "Báo cáo tiến độ thực hiện Bộ tiêu chí thi đua: số liệu từng tiêu chí/nội dung, điều kiện đã đạt, điều kiện thiếu minh chứng, kế hoạch đẩy mạnh.",
    cadence: "Theo rà soát quý hoặc theo yêu cầu",
    titlePattern: (label, org) => `Báo cáo tiến độ thực hiện Bộ tiêu chí thi đua ${label} của ${org}`,
    defaultBases: [
      BASE_BTS_2027,
      BASE_NQ57,
      "Kế hoạch thi đua năm của Đoàn đơn vị",
    ],
    outline: [
      "I. CĂN CỨ",
      "II. TIẾN ĐỘ THỰC HIỆN THEO TIÊU CHÍ",
      "III. CÁC ĐIỀU KIỆN RỦI RO, THIẾU MINH CHỨNG",
      "IV. KẾ HOẠCH ĐẨY MẠNH VÀ KIẾN NGHỊ",
    ],
    recipients: (org) => ["Ban Thường vụ Đoàn cấp trên trực tiếp", "Lưu: " + org],
  },
  {
    id: "SUMMARY",
    name: "Báo cáo tổng kết",
    docSuffix: "BC-ĐTN",
    docPrefix: "BC",
    description:
      "Báo cáo tổng kết giai đoạn (quý/6 tháng/năm): kết quả toàn diện công tác Đoàn, đánh giá chỉ tiêu, điển hình tiên tiến, bài học kinh nghiệm.",
    cadence: "Cuối quý / 6 tháng / cuối năm",
    titlePattern: (label, org) => `Báo cáo tổng kết công tác Đoàn và phong trào thanh niên ${label} của ${org}`,
    defaultBases: [
      BASE_BTS_2027,
      BASE_DAIHOI12,
      BASE_NQ68,
      BASE_NQ59,
      "Kế hoạch tổng kết của Đoàn cấp trên trực tiếp",
    ],
    outline: [
      "I. CĂN CỨ",
      "II. KẾT QUẢ CÔNG TÁC ĐOÀN VÀ PHONG TRÀO THANH NIÊN",
      "III. ĐIỂN HÌNH TIÊN TIẾN VÀ BÀI HỌC KINH NGHIỆM",
      "IV. HƯỚNG NHIỆM VỤ, KIẾN NGHỊ",
    ],
    recipients: (org) => ["Ban Chấp hành Đoàn cấp trên trực tiếp", "Lưu: " + org],
  },
];

export const templateById = (id: string) => reportTemplates.find((t) => t.id === id);

/** Sinh số/ký hiệu gợi ý: BC-{số thứ tự}/BC-ĐTN */
export function suggestDocCode(existingExports: number, prefix = "BC"): string {
  return `${prefix}-${String(100 + existingExports + 1)}/BC-ĐTN`;
}
