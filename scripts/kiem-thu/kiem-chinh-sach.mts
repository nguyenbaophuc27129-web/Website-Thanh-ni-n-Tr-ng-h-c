// Chốt chặn chính sách /api/store — mọi entity trong ENTITY_SPECS phải có luật ghi
// (store-write-policy.ts) và luật đọc cho khách / đoàn viên / cán bộ cấp dưới
// (store-read-policy.ts), hoặc được khai rõ "cố ý không" trong store-policy-audit.ts.
// Không cần DB, không cần web chạy. Thoát mã 1 nếu thiếu.
//
// Chạy trong image builder (có đủ node_modules):
//   docker build --target builder -t tnth-builder:chinhsach .
//   docker run --rm -v "$PWD/scripts:/app/scripts:ro" tnth-builder:chinhsach \
//     node --import ./scripts/kiem-thu/alias-loader.mjs scripts/kiem-thu/kiem-chinh-sach.mts
import { auditStorePolicies } from "../../src/lib/server/store-policy-audit.ts";
import { ENTITY_SPECS } from "../../src/lib/server/store-tables.ts";

const errors = auditStorePolicies();
if (errors.length > 0) {
  console.error(`THIẾU CHÍNH SÁCH (${errors.length}):`);
  for (const e of errors) console.error(" - " + e);
  process.exit(1);
}
console.log(`OK: ${Object.keys(ENTITY_SPECS).length} entity đều có luật ghi và luật đọc (hoặc khai rõ cố ý không).`);
process.exit(0);
