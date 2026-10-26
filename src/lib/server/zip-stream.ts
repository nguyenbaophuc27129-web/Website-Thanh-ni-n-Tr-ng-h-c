import { crc32 } from "node:zlib";
import type { FileHandle } from "node:fs/promises";

/**
 * Ghi tệp ZIP dạng STREAM (không giữ cả gói trong bộ nhớ) — dùng cho "Tải tất cả (.zip)" của kho tài nguyên.
 *
 * - Phương thức STORE (không nén): tệp tài nguyên đa phần đã nén sẵn (PDF, ảnh WebP, video, Office).
 * - CRC32 tính dần bằng zlib.crc32 (Node 22) khi đọc tệp, ghi vào "data descriptor" (cờ bit 3) sau dữ liệu
 *   → không cần đọc tệp hai lần mới ghi được tiêu đề.
 * - Tên tệp UTF-8 (cờ bit 11) nên tên tiếng Việt giải nén đúng.
 * - Không dùng ZIP64: mỗi tệp ≤ 25MB, tối đa vài chục tệp — vượt 4GB thì từ chối.
 * Độc lập, không phụ thuộc module zip nào khác trong dự án.
 */

const SIG_LOCAL = 0x04034b50;
const SIG_DESCRIPTOR = 0x08074b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;
const FLAGS = 0x0008 | 0x0800; // bit 3: có data descriptor; bit 11: tên UTF-8
const VERSION = 20;
const U32_MAX = 0xffffffff;
const U16_MAX = 0xffff;

export interface ZipFileInput {
  /** Tên bên trong gói — đã qua cleanZipName/uniqueZipName */
  name: string;
  /** Tệp đã mở sẵn (mở trước khi trả phản hồi để biết tệp có tồn tại); hàm này đóng nó sau khi đọc xong */
  handle: FileHandle;
  /** Dung lượng tại lúc mở (stat) — dùng tính Content-Length trước khi stream */
  size: number;
}

interface CentralRecord {
  nameBytes: Buffer;
  crc: number;
  size: number;
  offset: number;
}

/** Ngày giờ theo định dạng MS-DOS của ZIP */
function dosDateTime(d: Date): { time: number; date: number } {
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: (Math.max(d.getFullYear(), 1980) - 1980) * 512 + (d.getMonth() + 1) * 32 + d.getDate(),
  };
}

/** Tên tệp trong gói: bỏ đường dẫn / \ và "..", ký tự điều khiển; không để rỗng; giới hạn độ dài giữ nguyên đuôi */
export function cleanZipName(raw: string): string {
  let name = raw
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\.{2,}/g, ".")
    .trim()
    .replace(/^[.\s]+/, "");
  if (!name) name = "tep";
  if (name.length > 150) {
    const dot = name.lastIndexOf(".");
    const ext = dot > 0 && name.length - dot <= 8 ? name.slice(dot) : "";
    name = name.slice(0, 150 - ext.length) + ext;
  }
  return name;
}

/** Chống trùng tên (không phân biệt hoa thường): "a.pdf", "a (2).pdf", "a (3).pdf" */
export function uniqueZipName(name: string, used: Set<string>): string {
  const dot = name.lastIndexOf(".");
  const hasExt = dot > 0 && name.length - dot <= 8;
  const base = hasExt ? name.slice(0, dot) : name;
  const ext = hasExt ? name.slice(dot) : "";
  let candidate = name;
  for (let n = 2; used.has(candidate.toLowerCase()); n++) candidate = `${base} (${n})${ext}`;
  used.add(candidate.toLowerCase());
  return candidate;
}

/** Tổng số byte của gói sẽ sinh ra (STORE + data descriptor) — để gửi Content-Length */
export function zipTotalSize(files: Pick<ZipFileInput, "name" | "size">[]): number {
  let total = 22; // EOCD
  for (const f of files) {
    const n = Buffer.byteLength(f.name, "utf8");
    total += 30 + n + f.size + 16; // local header + tên + dữ liệu + data descriptor
    total += 46 + n; // central directory
  }
  return total;
}

function localHeader(nameBytes: Buffer, time: number, date: number): Buffer {
  const b = Buffer.alloc(30 + nameBytes.length);
  b.writeUInt32LE(SIG_LOCAL, 0);
  b.writeUInt16LE(VERSION, 4);
  b.writeUInt16LE(FLAGS, 6);
  b.writeUInt16LE(0, 8); // STORE
  b.writeUInt16LE(time, 10);
  b.writeUInt16LE(date, 12);
  // CRC và kích thước = 0: nằm ở data descriptor sau dữ liệu
  b.writeUInt16LE(nameBytes.length, 26);
  b.writeUInt16LE(0, 28);
  nameBytes.copy(b, 30);
  return b;
}

function descriptor(crc: number, size: number): Buffer {
  const b = Buffer.alloc(16);
  b.writeUInt32LE(SIG_DESCRIPTOR, 0);
  b.writeUInt32LE(crc >>> 0, 4);
  b.writeUInt32LE(size, 8); // kích thước nén = không nén
  b.writeUInt32LE(size, 12);
  return b;
}

function centralEntry(r: CentralRecord, time: number, date: number): Buffer {
  const b = Buffer.alloc(46 + r.nameBytes.length);
  b.writeUInt32LE(SIG_CENTRAL, 0);
  b.writeUInt16LE(VERSION, 4); // made by
  b.writeUInt16LE(VERSION, 6); // needed
  b.writeUInt16LE(FLAGS, 8);
  b.writeUInt16LE(0, 10);
  b.writeUInt16LE(time, 12);
  b.writeUInt16LE(date, 14);
  b.writeUInt32LE(r.crc >>> 0, 16);
  b.writeUInt32LE(r.size, 20);
  b.writeUInt32LE(r.size, 24);
  b.writeUInt16LE(r.nameBytes.length, 28);
  // extra, comment, disk, attrs = 0
  b.writeUInt32LE(r.offset, 42);
  r.nameBytes.copy(b, 46);
  return b;
}

function endOfCentral(count: number, cdSize: number, cdOffset: number): Buffer {
  const b = Buffer.alloc(22);
  b.writeUInt32LE(SIG_EOCD, 0);
  b.writeUInt16LE(count, 8);
  b.writeUInt16LE(count, 10);
  b.writeUInt32LE(cdSize, 12);
  b.writeUInt32LE(cdOffset, 16);
  return b;
}

/**
 * Sinh các mảnh của gói ZIP theo thứ tự. Luôn đóng mọi `handle` khi kết thúc hoặc khi bên nhận huỷ giữa chừng.
 * Đọc ĐÚNG `size` byte của mỗi tệp (khớp Content-Length đã tính): tệp ngắn hơn dự kiến → ném lỗi để
 * kết nối bị ngắt thay vì trả gói hỏng lặng lẽ.
 */
export async function* zipChunks(files: ZipFileInput[], now = new Date()): AsyncGenerator<Buffer> {
  if (files.length === 0 || files.length > U16_MAX) throw new Error("ZIP_BAD_COUNT");
  const { time, date } = dosDateTime(now);
  const records: CentralRecord[] = [];
  let offset = 0;
  try {
    for (const f of files) {
      const nameBytes = Buffer.from(f.name, "utf8");
      const head = localHeader(nameBytes, time, date);
      const start = offset;
      yield head;
      offset += head.length;

      let crc = 0;
      let read = 0;
      if (f.size > 0) {
        for await (const chunk of f.handle.createReadStream({ start: 0, end: f.size - 1, autoClose: false })) {
          const buf = chunk as Buffer;
          crc = crc32(buf, crc);
          read += buf.length;
          offset += buf.length;
          yield buf;
        }
      }
      if (read !== f.size) throw new Error(`ZIP_SHORT_READ ${f.name}`);
      const desc = descriptor(crc, read);
      yield desc;
      offset += desc.length;
      if (offset > U32_MAX) throw new Error("ZIP_TOO_LARGE");
      records.push({ nameBytes, crc, size: read, offset: start });
    }
    const cdOffset = offset;
    let cdSize = 0;
    for (const r of records) {
      const entry = centralEntry(r, time, date);
      yield entry;
      cdSize += entry.length;
    }
    yield endOfCentral(records.length, cdSize, cdOffset);
  } finally {
    await Promise.all(files.map((f) => f.handle.close().catch(() => {})));
  }
}
