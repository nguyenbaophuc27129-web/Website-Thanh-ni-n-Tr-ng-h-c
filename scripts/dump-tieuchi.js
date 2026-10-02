const XLSX = require("xlsx");
const path = require("path");

const file = process.argv[2] || "../1.2 Bộ Tiêu chí năm 2027 - Tỉnh, thành đoàn.xlsx";
const wb = XLSX.readFile(path.resolve(__dirname, "..", file));
const sheetName = process.argv[3] || wb.SheetNames[0];
const ws = wb.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", blankrows: false });

rows.forEach((r, i) => {
  const cells = r.map((c) => String(c).replace(/\r?\n/g, " ¶ "));
  const nonEmpty = cells.map((c, ci) => (c.trim() ? `[${ci}]${c}` : "")).filter(Boolean);
  if (nonEmpty.length) console.log(i + ":", nonEmpty.join(" § "));
});
console.log("=== merges ===");
(ws["!merges"] || []).forEach((m) => console.log(`r${m.s.r}:r${m.e.r} c${m.s.c}:c${m.e.c}`));
