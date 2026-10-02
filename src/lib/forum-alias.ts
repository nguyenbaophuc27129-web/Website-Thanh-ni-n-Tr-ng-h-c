/**
 * Bí danh ẩn danh cho Diễn đàn — sinh từ seed thuần (pure) nên an toàn hydration.
 * Alias được SINH CỨNG lúc tạo bài/bình luận và lưu vào state, tuyệt đối không
 * gọi random lúc render.
 */

const FIRST = [
  "Bằng Lăng", "Hoa Sữa", "Cỏ May", "Trúc Đào", "Hải Đăng", "Cánh Buồm",
  "Mặt Trời Đỏ", "Gió Mùa", "Sông Thương", "Ngọn Cờ", "Đom Đóm", "Sao Mai",
];

const SECOND = [
  "Tim Xanh", "Tự Do", "Tươi Trẻ", "Xa Xăm", "Bình Yên", "Kiêu Hãnh",
  "Nơi Nào Đó", "Mùa Hè", "Vượt Trôi", "Thức Giấc",
];

/** Sinh alias từ 1 số seed — cùng seed luôn ra cùng alias (pure) */
export function pickAlias(seed: number): string {
  let h = Math.imul(seed ^ 0x9e3779b9, 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  h ^= h >>> 16;
  const first = FIRST[Math.abs(h) % FIRST.length];
  const second = SECOND[Math.abs(Math.imul(h, 31)) % SECOND.length];
  const num = 1000 + (Math.abs(Math.imul(h, 977)) % 9000);
  return `${first} ${second} #${num}`;
}

/**
 * Sinh alias chưa trùng trong danh sách đã có (gọi trong action handler thôi —
 * dùng Date.now nên KHÔNG pure, không được gọi lúc render).
 */
export function generateUniqueAlias(existing: string[]): string {
  const set = new Set(existing);
  for (let i = 0; i < 60; i++) {
    const alias = pickAlias(Date.now() + i * 7919);
    if (!set.has(alias)) return alias;
  }
  return `Đoàn Viên Ẩn Danh #${Date.now() % 9000 + 1000}`;
}

/** Màu avatar theo hash alias — pure, an toàn hydration */
const AVATAR_TONES = [
  "bg-blue-100 text-blue-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-cyan-100 text-cyan-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-amber-100 text-amber-700",
];

export function avatarTone(alias: string): string {
  let h = 0;
  for (let i = 0; i < alias.length; i++) h = Math.imul(h ^ alias.charCodeAt(i), 2654435761);
  return AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length];
}

/** Ký tự đầu của alias để hiển thị trong avatar ("Bằng Lăng… #2481" → "BL") */
export function avatarInitials(alias: string): string {
  const core = alias.replace(/\s*#\d+$/, "");
  return core
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
