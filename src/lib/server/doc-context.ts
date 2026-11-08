/* ════════════════════════════════════════════════════════════════════
   RAG NHẸ — "AI HỌC" VĂN BẢN TW ĐÃ BAN HÀNH (làm theo FILE THẬT)
   ════════════════════════════════════════════════════════════════════
   Nguồn: bảng documents (status = ISSUED) — mỗi văn bản có tệp đính kèm
   thì trích text thật (PDF/DOCX/TXT) bằng lib/server/file-text.ts.
   Cần "teach" AI mới: upload + ban hành văn bản ở Quản trị → Văn bản,
   AI dùng ngay (cache tự làm mới sau 5 phút), không cần deploy lại.
   Trả chuỗi ngữ cảnh gắn vào prompt của các route AI (nhap-bao-cao,
   tro-ly, phan-tich-cong-van…). DB lỗi / trống → trả "" — AI vẫn chạy.
   ════════════════════════════════════════════════════════════════════ */

import { dbEnabled } from "@/lib/db";
import { readEntity } from "@/lib/server/store-tables";
import { extractTextFromDataUrl } from "@/lib/server/file-text";
import { BAO_CAO_CORPUS } from "@/data/bao-cao-agent";

/** Trần ký tự trích từ 1 tệp đính kèm đưa vào ngữ cảnh RAG */
const PER_DOC_TEXT_CAP = 20_000;
const CACHE_TTL_MS = 5 * 60 * 1000;

interface TwDocEntry {
  docNumber: string;
  title: string;
  summary: string;
  text: string;
}

interface DocCache {
  loadedAt: number;
  docs: TwDocEntry[];
}

const globalStore = globalThis as unknown as { __tnthDocCache?: DocCache };

/** Bỏ dấu tiếng Việt + lowercase — dùng cho chấm điểm trùng từ khoá */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function tokenize(s: string): string[] {
  return norm(s)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3);
}

/** Đọc văn bản TW đã ban hành (có tệp thì trích text thật) — cache TTL 5 phút */
export async function loadTwDocuments(): Promise<TwDocEntry[]> {
  const cached = globalStore.__tnthDocCache;
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) return cached.docs;
  if (!dbEnabled()) return [];

  try {
    const rows = await readEntity("documents", { where: "status = 'ISSUED'", params: [] });
    const docs: TwDocEntry[] = [];
    for (const row of rows) {
      const r = row as {
        docNumber?: string;
        title?: string;
        summary?: string;
        fileDataUrl?: string;
        fileName?: string;
      };
      let text = "";
      if (r.fileDataUrl && r.fileName) {
        try {
          text = await extractTextFromDataUrl(r.fileName, r.fileDataUrl, PER_DOC_TEXT_CAP);
        } catch (err) {
          console.warn(
            `[TNTH][RAG] Không trích được tệp của văn bản ${r.docNumber ?? "?"}:`,
            err instanceof Error ? err.message : err
          );
        }
      }
      docs.push({
        docNumber: r.docNumber ?? "",
        title: r.title ?? "",
        summary: r.summary ?? "",
        text,
      });
    }
    globalStore.__tnthDocCache = { loadedAt: Date.now(), docs };
    return docs;
  } catch (err) {
    console.warn("[TNTH][RAG] Đọc văn bản thất bại:", err instanceof Error ? err.message : err);
    return [];
  }
}

/**
 * Chọn ngữ cảnh liên quan nhất tới `topic` (chấm điểm trùng từ khoá) từ
 * 2 nguồn: corpus đặc tả báo cáo nhúng sẵn (bộ mã, quy tắc, giải pháp từng
 * mục, mẫu đầu ra — luôn có, không cần DB) + văn bản TW đã ban hành trong
 * DB (status ISSUED, có tệp thì trích text thật). Ghép top kết quả nằm
 * trong `budgetChars`. Không có gì khớp → "".
 */
export async function buildDocContext(topic: string, budgetChars = 6000): Promise<string> {
  const docs = await loadTwDocuments();

  interface Candidate {
    header: string;
    text: string;
    score: number;
  }
  const topicWords = new Set(tokenize(topic));

  const scoreOf = (haystack: string): number => {
    const unique = new Set(tokenize(haystack));
    let hits = 0;
    for (const w of unique) if (topicWords.has(w)) hits += 1;
    return hits;
  };

  const candidates: Candidate[] = [];

  // 1) Corpus đặc tả báo cáo (nhúng sẵn — khung, bộ mã NV/CT/DP/DA, giải pháp từng mục, mẫu đầu ra)
  for (const chunk of BAO_CAO_CORPUS) {
    const score = scoreOf(`${chunk.title} ${chunk.text.slice(0, 4000)}`);
    if (score > 0) candidates.push({ header: `=== ${chunk.title} ===`, text: chunk.text, score });
  }

  // 2) Văn bản TW đã ban hành trong DB
  for (const d of docs) {
    const haystack = `${d.docNumber} ${d.title} ${d.summary} ${d.text.slice(0, 4000)}`;
    const score = scoreOf(haystack) + (d.text ? 0.5 : 0);
    if (score > 0.5) candidates.push({ header: `=== ${[d.docNumber, d.title].filter(Boolean).join(" — ")} ===`, text: d.text || "(chỉ có tiêu đề — nội dung tệp không trích được)", score });
  }

  const scored = candidates.sort((a, b) => b.score - a.score).slice(0, 4);
  if (scored.length === 0) return "";

  const parts: string[] = [];
  let used = 0;
  for (const c of scored) {
    const excerpt =
      c.text.slice(0, Math.max(400, budgetChars - used - c.header.length - 2)) +
      (c.text.length > budgetChars - used - c.header.length ? "\n[…cắt]" : "");
    const block = `${c.header}\n${excerpt}`;
    if (used + block.length > budgetChars && parts.length > 0) break;
    parts.push(block);
    used += block.length + 2;
  }
  return parts.length > 0 ? parts.join("\n\n") : "";
}
