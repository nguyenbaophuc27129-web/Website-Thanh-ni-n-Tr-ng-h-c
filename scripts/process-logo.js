/**
 * Cắt nền đen của logo → PNG trong suốt (public/logo.png).
 * Dùng BFS từ RÌA ảnh: chỉ pixel nền đen KẾT NỐI được với mép ngoài mới bị xoá,
 * nên các chi tiết xanh đậm/c Circuit NỘI BỘ logo được giữ nguyên.
 * Viền logo được làm mờ (feather) cho mềm.
 *
 * Chạy: node scripts/process-logo.js
 * Đổi logo: thay scripts/logo-src/logo-goc.png rồi chạy lại lệnh trên.
 */
const sharp = require("sharp");
const path = require("path");

const SRC = path.join(__dirname, "logo-src", "logo-goc.png");
const OUT = path.join(__dirname, "..", "public", "logo.png");

const LO = 26; // dưới ngưỡng này coi là nền đen
const FEATHER = 42; // dải làm mềm viền

(async () => {
  const raw = await sharp(SRC)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h, channels } = raw.info;
  const d = raw.data;

  const lum = (i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];

  // 1) BFS từ mọi pixel biên có độ sáng <= LO — lan qua vùng "nền đen liên thông"
  const bg = new Uint8Array(w * h);
  const queue = [];
  for (let x = 0; x < w; x++) {
    for (const y of [0, h - 1]) {
      const p = y * w + x;
      if (!bg[p] && lum(p * channels) <= LO) { bg[p] = 1; queue.push(p); }
    }
  }
  for (let y = 0; y < h; y++) {
    for (const x of [0, w - 1]) {
      const p = y * w + x;
      if (!bg[p] && lum(p * channels) <= LO) { bg[p] = 1; queue.push(p); }
    }
  }
  while (queue.length) {
    const p = queue.pop();
    const x = p % w, y = (p / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const np = ny * w + nx;
      if (!bg[np] && lum(np * channels) <= LO) { bg[np] = 1; queue.push(np); }
    }
  }

  // 2) Gán alpha: nền trong suốt; viền kề nền làm mềm theo độ sáng
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const p = y * w + x, i = p * channels;
      if (bg[p]) { d[i + 3] = 0; continue; }
      // kề nền? → feather
      let near = false;
      for (let dy = -1; dy <= 1 && !near; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx >= 0 && ny >= 0 && nx < w && ny < h && bg[ny * w + nx]) { near = true; break; }
        }
      }
      if (near) {
        const l = lum(i);
        d[i + 3] = l >= LO + FEATHER ? 255 : Math.max(0, Math.round(((l - LO) / FEATHER) * 255));
      }
      if (d[i + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) throw new Error("Không tìm thấy nội dung logo nào");

  // 3) Cắt sát viền nội dung + xuất PNG
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  await sharp(d, { raw: { width: w, height: h, channels } })
    .extract({ left: minX, top: minY, width: cw, height: ch })
    .png()
    .toFile(OUT);
  console.log(`OK: cắt xong ${cw}x${ch}px (gốc ${w}x${h}) → public/logo.png`);
})().catch((e) => { console.error(e); process.exit(1); });
