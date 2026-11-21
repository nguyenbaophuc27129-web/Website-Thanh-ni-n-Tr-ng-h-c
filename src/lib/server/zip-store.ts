import { readFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

/**
 * Bộ ghi ZIP tối giản — phương thức STORE (không nén) theo dòng dữ liệu.
 *
 * Dùng cho xuất lưu trữ ảnh/tệp minh chứng bình chọn: JPEG/WebP/PDF vốn đã
 * nén sẵn nên STORE không làm tăng dung lượng, đổi lại ghi cực nhanh và không
 * cần dependency nén. Mỗi tệp được đọc nguyên vào bộ nhớ TỪNG TỆP MỘT (tệp
 * dự kiến ≤ vài MB theo KIND_RULES) để tính CRC32 trước khi ghi header —
 * nhờ đó không cần data descriptor (bit 3), tương thích tối đa với
 * Windows Explorer / 7-Zip / WinRAR.
 *
 * Giới hạn: định dạng ZIP chuẩn (không ZIP64) → tổng dung lượng < 4GB và
 * < 65535 tệp. Vượt ngưỡng này mới cần nâng cấp sang ZIP64.
 */

// ── CRC32 (poly 0xEDB88320, bảng 256 phần tử tính 1 lần) ──

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ── Thời gian DOS (2 byte giờ + 2 byte ngày) ──

function dosDateTime(d: Date): { time: number; date: number } {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time: time & 0xffff, date: date & 0xffff };
}

// ── Kiểu dữ liệu ──

export interface ZipEntry {
  /** Tên tệp trong ZIP (đặt tên tiếng Việt có dấu — ghi kèm cờ UTF-8) */
  name: string;
  /** Đường dẫn tuyệt đối trên đĩa; tệp thiếu/không đọc được sẽ bị BỎ QUA (không làm hỏng ZIP) */
  path: string;
  /** Thời gian sửa ghi trong ZIP (mặc định: hiện tại) */
  mtime?: Date;
}

/** Chia buffer thành mảnh ≤1MB khi đưa vào stream — nhẹ nhàng với HTTP layer */
const CHUNK = 1024 * 1024;

function* bufferChunks(buf: Uint8Array): Generator<Uint8Array> {
  for (let off = 0; off < buf.length; off += CHUNK) {
    yield buf.subarray(off, Math.min(off + CHUNK, buf.length));
  }
}

/**
 * Sinh từng khối byte của file ZIP theo thứ tự:
 * local header + dữ liệu từng tệp → central directory → EOCD.
 * Tệp lỗi đọc bị bỏ qua nhưng vẫn giữ đánh số liên tục phía caller.
 */
async function* zipChunks(entries: ZipEntry[]): AsyncGenerator<Uint8Array> {
  const central: { name: Buffer; crc: number; size: number; offset: number; time: number; date: number }[] = [];
  const FLAG_UTF8 = 0x0800;
  const VERSION = 20; // 2.0 — đủ cho STORE

  let offset = 0;
  const emitted = (n: number) => {
    offset += n;
  };

  for (const entry of entries) {
    let buf: Buffer;
    try {
      buf = await readFile(entry.path);
    } catch {
      continue; // tệp không tồn tại/đọc lỗi — bỏ qua, ZIP vẫn hợp lệ
    }
    if (buf.length === 0 || buf.length > 0xffffffff) continue;

    const { time, date } = dosDateTime(entry.mtime ?? new Date());
    const crc = crc32(buf);
    const nameBytes = Buffer.from(entry.name, "utf8");
    if (nameBytes.length > 0xffff || nameBytes.length === 0) continue;

    const entryOffset = offset; // vị trí local header của entry NÀY — phải ghi trước khi phát byte

    // Local file header (30 byte + tên)
    const local = Buffer.alloc(30 + nameBytes.length);
    local.writeUInt32LE(0x04034b50, 0); // signature
    local.writeUInt16LE(VERSION, 4); // version needed
    local.writeUInt16LE(FLAG_UTF8, 6); // flags
    local.writeUInt16LE(0, 8); // method = STORE
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(buf.length, 18); // compressed size
    local.writeUInt32LE(buf.length, 22); // uncompressed size
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28); // extra length
    nameBytes.copy(local, 30);

    yield local;
    emitted(local.length);
    for (const chunk of bufferChunks(buf)) {
      yield chunk;
      emitted(chunk.length);
    }

    central.push({ name: nameBytes, crc, size: buf.length, offset: entryOffset, time, date });
  }

  // Central directory
  const cdStart = offset;
  for (const c of central) {
    const cd = Buffer.alloc(46 + c.name.length);
    cd.writeUInt32LE(0x02014b50, 0); // signature
    cd.writeUInt16LE(VERSION, 4); // version made by
    cd.writeUInt16LE(VERSION, 6); // version needed
    cd.writeUInt16LE(FLAG_UTF8, 8);
    cd.writeUInt16LE(0, 10); // method
    cd.writeUInt16LE(c.time, 12);
    cd.writeUInt16LE(c.date, 14);
    cd.writeUInt32LE(c.crc, 16);
    cd.writeUInt32LE(c.size, 20);
    cd.writeUInt32LE(c.size, 24);
    cd.writeUInt16LE(c.name.length, 28);
    cd.writeUInt16LE(0, 30); // extra
    cd.writeUInt16LE(0, 32); // comment
    cd.writeUInt16LE(0, 34); // disk start
    cd.writeUInt16LE(0, 36); // internal attrs
    cd.writeUInt32LE(0, 38); // external attrs
    cd.writeUInt32LE(c.offset, 42);
    c.name.copy(cd, 46);
    yield cd;
    emitted(cd.length);
  }
  const cdSize = offset - cdStart;

  // End of central directory
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4); // disk
  eocd.writeUInt16LE(0, 6); // disk with cd
  eocd.writeUInt16LE(central.length, 8);
  eocd.writeUInt16LE(central.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdStart, 16);
  eocd.writeUInt16LE(0, 20); // comment length
  yield eocd;
}

/**
 * Stream ZIP từ danh sách tệp trên đĩa. Trả Web ReadableStream để nhács
 * thẳng vào Response (Node runtime). Tệp lỗi đọc bị bỏ qua im lặng —
 * caller đếm được số tệp thực tế qua kết quả unzip, không cần xử lý gì thêm.
 */
export function createZipStoreStream(entries: ZipEntry[]): ReadableStream<Uint8Array> {
  const nodeStream = Readable.from(zipChunks(entries), { objectMode: false });
  return Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;
}
