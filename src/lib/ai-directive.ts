/**
 * AI lượng hoá công văn → chỉ tiêu KPI (mô phỏng, thuần — không dùng Date trong parse
 * để an toàn hydration; demoDirectiveText sinh hạn tại thời điểm CLICK).
 */

import { addDaysISO } from "@/lib/utils";

export interface DirectiveDraft {
  metricName: string;
  targetValue: number;
  unit: string;
  aggregationType: "SUM" | "COUNT" | "AVG" | "MAX" | "PERCENT";
  /** ISO yyyy-mm-dd hoặc "" — caller điền hạn mặc định khi trống */
  dueDate: string;
  recipientHint?: string;
}

/** Câu có từ khoá chỉ đạo mới được AI xem xét lượng hoá */
const KEYWORD_RE =
  /(chỉ tiêu|hoàn thành|đạt|tổ chức|phải|giao|triển khai|phát động|báo cáo|phổ cập|nâng cao|đẩy mạnh)/i;

const UNIT_LIST = [
  "hoạt động", "đoàn viên", "biên bản", "sân chơi", "chương trình", "sản phẩm",
  "buổi", "bài", "người", "lượt", "trường", "đội",
];

interface DeadlineHit {
  iso: string; // yyyy-mm-dd hoặc ""
  removed: string; // đoạn văn bản đã nhận diện là hạn
}

/** Nhận diện mệnh đề hạn trong câu và trả về ngày ISO tương ứng */
function extractDeadline(sentence: string): DeadlineHit {
  let m = sentence.match(/trước\s+ngày\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  if (m) {
    const iso = `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    return { iso, removed: m[0] };
  }
  m = sentence.match(/trước\s+ngày\s+(\d{1,2})\/(\d{1,2})(?:\/(\d{2}))?/i);
  if (m) {
    const iso = `2026-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    return { iso, removed: m[0] };
  }
  m = sentence.match(/trong\s+tháng\s+(\d{1,2})/i);
  if (m) {
    const month = Math.min(12, Math.max(1, parseInt(m[1], 10)));
    const lastDay = new Date(2026, month, 0).getDate();
    return { iso: `2026-${String(month).padStart(2, "0")}-${lastDay}`, removed: m[0] };
  }
  m = sentence.match(/quý\s+([IV]+)/i);
  if (m) {
    return { iso: "", removed: m[0] };
  }
  return { iso: "", removed: "" };
}

/** Nhận diện mệnh đề "gửi về …" để suy ra đơn vị nhận */
function extractRecipient(sentence: string): { hint?: string; removed: string } {
  const m = sentence.match(/(gửi về[^;,.]*)/i);
  if (m) return { hint: m[1].trim(), removed: m[1] };
  return { removed: "" };
}

/** Đếm và đơn vị trong phần câu đã bỏ hạn/đơn vị nhận — ưu tiên đơn vị đứng NGAY SAU số */
function extractNumber(
  cleaned: string
): { value: number; unit: string; aggregationType: DirectiveDraft["aggregationType"] } | null {
  const pct = cleaned.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (pct) {
    return { value: parseFloat(pct[1].replace(",", ".")), unit: "%", aggregationType: "PERCENT" };
  }
  // Nhóm nghìn kiểu Việt Nam: 1.200 → 1200
  const vn = cleaned.match(/(\d{1,3}(?:\.\d{3}){1,})/);
  let value: number;
  let matched: RegExpMatchArray;
  if (vn) {
    value = parseInt(vn[1].replace(/\./g, ""), 10);
    matched = vn;
  } else {
    const plain = cleaned.match(/(\d+(?:,\d+)?)/);
    if (!plain) return null;
    value = parseFloat(plain[1].replace(",", "."));
    matched = plain;
  }
  const lower = cleaned.toLowerCase();
  // Đơn vị tốt nhất là danh từ NGAY SAU con số ("5 bài tin", "1.200 lượt") — chọn theo vị trí gần nhất
  const pickUnit = (s: string): string | undefined => {
    let best: string | undefined;
    let bestIdx = Number.POSITIVE_INFINITY;
    for (const u of UNIT_LIST) {
      const i = s.indexOf(u);
      if (i !== -1 && i < bestIdx) {
        best = u;
        bestIdx = i;
      }
    }
    return best;
  };
  const afterIdx = (matched.index ?? 0) + matched[0].length;
  const after = lower.slice(afterIdx, afterIdx + 50);
  const unit = pickUnit(after) ?? pickUnit(lower) ?? "đơn vị";
  return { value, unit, aggregationType: "SUM" };
}

/** Dọn tên chỉ tiêu: bỏ gạch đầu dòng, đánh số, mệnh đề hạn, mệnh đề đơn vị nhận */
function buildMetricName(raw: string, deadlineRemoved: string, recipientRemoved: string): string {
  let s = raw
    .replace(/^\s*[-–•*]\s*/, "")
    .replace(/^\s*\d+[.)]\s*/, "")
    .replace(deadlineRemoved, "")
    .replace(recipientRemoved, "")
    .replace(/hoàn thành|đúng hạn|chậm trễ/gi, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s;,.:–-]+|[\s;,.:–-]+$/g, "");
  if (s.length > 80) s = `${s.slice(0, 77).trimEnd()}…`;
  return s || "Chỉ tiêu từ công văn";
}

/** Tách câu theo xuống dòng và dấu chấm phẩy (không tách theo "." để giữ số kiểu 1.200) */
export function parseDirective(text: string): DirectiveDraft[] {
  const drafts: DirectiveDraft[] = [];
  const attachDeadlineToLast = (iso: string) => {
    const last = drafts[drafts.length - 1];
    if (iso && last && !last.dueDate) last.dueDate = iso;
  };
  const sentences = text
    .split(/[\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const sentence of sentences) {
    const deadline = extractDeadline(sentence);
    if (!KEYWORD_RE.test(sentence)) {
      // Đoạn chỉ chứa hạn (VD: "hạn trước ngày 01/11/2026") → gắn cho chỉ tiêu đứng ngay trước
      attachDeadlineToLast(deadline.iso);
      continue;
    }
    const recipient = extractRecipient(sentence);
    // Phần câu còn lại sau khi bỏ hạn + đơn vị nhận — dùng để trích số
    const cleaned = sentence.replace(deadline.removed, "").replace(recipient.removed, "");
    const num = extractNumber(cleaned);
    if (!num) {
      // Có từ khoá + hạn nhưng không có số (VD: "hoàn thành trước ngày …") → gắn hạn cho chỉ tiêu trước
      attachDeadlineToLast(deadline.iso);
      continue;
    }
    drafts.push({
      metricName: buildMetricName(sentence, deadline.removed, recipient.removed),
      targetValue: num.value,
      unit: num.unit,
      aggregationType: num.aggregationType,
      dueDate: deadline.iso,
      recipientHint: recipient.hint,
    });
    if (drafts.length >= 8) break;
  }
  return drafts;
}

const fmtDMY = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

/** 6 câu công văn mẫu — hạn sinh TẠI THỜI ĐIỂM GỌI (an toàn hydration):
 *  D+15 (bình thường), D+2 (tới hạn), D−3 (quá hạn), tháng của D+20, D+7, D+20 */
export function demoDirectiveText(): string {
  const d15 = fmtDMY(addDaysISO(15));
  const d2 = fmtDMY(addDaysISO(2));
  const dm3 = fmtDMY(addDaysISO(-3));
  const d7 = fmtDMY(addDaysISO(7));
  const d20 = fmtDMY(addDaysISO(20));
  const monthOfD20 = parseInt(d20.split("/")[1], 10);
  return [
    `Triển khai phong trào "Thanh niên tình nguyện vì cộng đồng" trên toàn địa bàn, phấn đấu đạt 1.200 lượt đoàn viên tham gia, gửi về các phường, xã trực thuộc; hoàn thành trước ngày ${d15}.`,
    `Mỗi trường phải tổ chức ít nhất 3 sân chơi an toàn cho học sinh trong hè; hoàn thành trước ngày ${d2}.`,
    `Báo cáo kết quả đợt cao điểm bảo vệ môi trường, mỗi đơn vị nộp tối thiểu 2 biên bản kiểm tra kèm minh chứng; hạn trước ngày ${dm3}.`,
    `Phát động phong trào "Học sinh 3 tốt", nâng cao tỷ lệ đoàn viên đăng ký đạt 75% trở lên, phổ cập trong tháng ${monthOfD20}.`,
    `Đẩy mạnh truyền thông hoạt động hè trên Cổng TNTH, mỗi chi đoàn đăng tải 5 bài tin về hoạt động của đơn vị; hoàn thành trước ngày ${d7}.`,
    `Tổ chức lớp tập nghiệp vụ Đoàn, mỗi đơn vị cử 10 đoàn viên ưu tú tham gia; hoàn thành trước ngày ${d20}.`,
  ].join("\n");
}
