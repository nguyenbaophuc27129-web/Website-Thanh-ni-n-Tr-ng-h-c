/**
 * Sinh src/data/tieuchi-2027.ts từ file Excel "1.2 Bộ Tiêu chí năm 2027 - Tỉnh, thành đoàn.xlsx".
 * Trích xuất ĐẦY ĐỦ từng điều kiện chấm điểm: tên đầy đủ, điểm tối đa, nguyên tắc chấm (thang điểm),
 * yêu cầu đánh giá, yêu cầu minh chứng, thời gian, bộ phận phụ trách.
 * Tự đối soát: tổng điều kiện/điểm từng Tiêu chí với số khai báo trên dòng tiêu đề.
 * Chạy: node scripts/gen-tieuchi-2027.js "<đường dẫn file xlsx>"
 * File TS đầu ra là dữ liệu seed — không sửa tay.
 */
const XLSX = require("xlsx");
const fs = require("fs");
const path = require("path");

const xlsxArg = process.argv[2] || "../1.2 Bộ Tiêu chí năm 2027 - Tỉnh, thành đoàn.xlsx";
const xlsxPath = path.resolve(__dirname, "..", xlsxArg);
const outFile = path.resolve(__dirname, "..", "src/data/tieuchi-2027.ts");

const wb = XLSX.readFile(xlsxPath);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", blankrows: true });

const cell = (r, c) => String((rows[r] || [])[c] ?? "").trim();

// "Quý I".."Quý IV" -> hạn 2027 (check IV/III/II trước để tránh khớp nhầm "quý i")
function dueFromPeriod(txt) {
  const t = txt.toLowerCase();
  if (t.includes("quý iv") || t.includes("quý 4")) return "2027-12-31";
  if (t.includes("quý iii") || t.includes("quý 3")) return "2027-09-30";
  if (t.includes("quý ii") || t.includes("quý 2")) return "2027-06-30";
  if (t.includes("quý i") || t.includes("quý 1")) return "2027-03-31";
  return undefined;
}

function scoringMethod(ladder) {
  const t = ladder.toLowerCase();
  if (t.includes("tự động") || t.includes("hệ thống") || t.includes("phần mềm")) return "AUTO_AGGREGATE";
  if (t.includes("rà soát") || t.includes("hồ sơ") || t.includes("đánh giá của tw")) return "EXPERT_REVIEW";
  return "MANUAL_CONFIRM";
}

const q = (s) => JSON.stringify(s ?? undefined);

let groupId = 100;      // TASK nhóm tiêu chí (Phần 1: 100-105, Phần 2: 106)
let critId = 110;       // CRITERION nội dung đánh giá (110..141)
let metricId = 200;     // TaskMetric điều kiện chấm điểm (200+)
let metricSeq = 0;

const groups = [];   // {id, code, title, maxPoints, order, declaredConds, declaredPts}
const criteria = []; // {id, groupId, code, title, maxPoints, method, due, order}
const metrics = [];  // {id, taskId, code, name, maxPoints, ladder, requirement, evidence, period, dept, due}

let warnings = [];

function newGroup(code, title, declaredConds, declaredPts) {
  const g = { id: groupId++, code, title, maxPoints: 0, order: groups.length + 1, declaredConds, declaredPts, conds: 0 };
  groups.push(g);
  return g;
}

function addCriterion(g, title) {
  const id = critId++;
  criteria.push({ id, groupId: g.id, code: title.split(".")[0].trim(), title, maxPoints: 0, method: "MANUAL_CONFIRM", due: undefined, order: criteria.length + 1 });
  return criteria[criteria.length - 1];
}

function addMetric(crit, g, name, pts, ladder, requirement, evidence, period, dept) {
  const id = metricId++;
  metricSeq++;
  g.conds++;
  g.maxPoints += pts;
  crit.maxPoints += pts;
  crit.method = scoringMethod(ladder);
  const due = dueFromPeriod(period);
  if (due && !crit.due) crit.due = due;
  metrics.push({
    id, taskId: crit.id,
    code: `DK-${metricSeq}`,
    name,                      // TÊN ĐẦY ĐỦ, không cắt
    maxPoints: pts,
    ladder,                    // nguyên tắc chấm điểm (thang từng mức)
    requirement,
    evidence,
    period,
    dept,
    due,
  });
}

/* ==== Phần 1: rows 4..80 ==== */
let curGroup = null;
let curCrit = null;

for (let r = 4; r <= 80; r++) {
  const c0 = cell(r, 0), c1 = cell(r, 1), c2 = cell(r, 2), c3 = cell(r, 3), c4 = cell(r, 4), c5 = cell(r, 5), c6 = cell(r, 6), c7 = cell(r, 7);
  if (!c0 && !c1) continue;
  if (/^Tiêu chí \d/.test(c0)) {
    curGroup = newGroup(`TC${c0.match(/\d+/)[0]}`, c0, Number(c1) || 0, Number(c2) || 0);
    curCrit = null;
    continue;
  }
  if (!curGroup) continue;
  if (c0) curCrit = addCriterion(curGroup, c0); // mỗi c0 mới = 1 nội dung đánh giá
  if (!curCrit) continue;
  if (!c1) continue;
  // 1 dòng = 1 điều kiện chấm điểm, c2 = điểm tối đa của điều kiện này
  const pts = Number(c2) || 0;
  const name = c1.replace(/^\d+[.]\s*/, ""); // bỏ đánh số "1." đầu dòng, giữ toàn bộ nội dung
  addMetric(curCrit, curGroup, name, pts, c5, c3 || undefined, c4 || undefined, c6, c7 || undefined);
}

// Đối soát Phần 1 với số khai báo
for (const g of groups.filter((x) => x.code.startsWith("TC"))) {
  if (g.conds !== g.declaredConds) warnings.push(`${g.code}: điều kiện ${g.conds} ≠ khai báo ${g.declaredConds}`);
  if (g.maxPoints !== g.declaredPts) warnings.push(`${g.code}: điểm ${g.maxPoints} ≠ khai báo ${g.declaredPts}`);
}

/* ==== Phần 2: row 81 tiêu đề, 82 header; nội dung rows 83..91 ==== */
// c1 = nội dung gợi ý (tên), c2 = mô tả điều kiện đăng ký, c3 = yêu cầu, c4 = minh chứng, c5 = nguyên tắc chấm, c6 = thời gian, c7 = bộ phận
const p2Title = cell(81, 0);
const p2 = newGroup("P2", p2Title || "Phần 2. Nội dung đăng ký tự chọn (tối đa 100 điểm)", 9, 100);
for (let r = 83; r <= 91; r++) {
  const c1 = cell(r, 1), c2 = cell(r, 2), c3 = cell(r, 3), c4 = cell(r, 4), c5 = cell(r, 5), c6 = cell(r, 6), c7 = cell(r, 7);
  if (!c1) continue;
  const crit = addCriterion(p2, c1);
  crit.due = dueFromPeriod(c6);
  addMetric(crit, p2, c1, 10, c5, c3 || undefined, c4 || undefined, c6, c7 || undefined);
}
// Phần 2 là nhóm tự chọn: điểm tối đa theo tiêu đề file (100), từng mục tối đa 10 theo thang
p2.maxPoints = 100;

// Đối soát chung
const p1 = groups.filter((g) => g.code.startsWith("TC"));
const totalP1 = p1.reduce((s, g) => s + g.maxPoints, 0);
if (totalP1 !== 313) warnings.push(`Tổng Phần 1 = ${totalP1} ≠ 313 khai báo`);
const totalConds = p1.reduce((s, g) => s + g.conds, 0);
if (totalConds !== 71) warnings.push(`Tổng điều kiện Phần 1 = ${totalConds} ≠ 71 khai báo`);

/* ==== Emit TS ==== */
const totalPoints = p1.reduce((s, g) => s + g.maxPoints, 0) + 100; // Phần 1 + Phần 2 (tối đa 100 theo file)

const L = [];
L.push("// Tự sinh từ file Excel bởi scripts/gen-tieuchi-2027.js — KHÔNG sửa tay.");
L.push("// Nguồn: Dự thảo Bộ Tiêu chí các Tỉnh, Thành đoàn năm 2027 — Ban TNTH TW Đoàn.");
L.push("// Phần 1: 6 Tiêu chí, 23 nội dung đánh giá, 71 điều kiện, 313 điểm. Phần 2: 9 nhóm tự chọn, tối đa 100 điểm (10 điểm/mục).");
L.push('import type { CriteriaSet, Task, TaskMetric } from "@/types";');
L.push("");
L.push("export const criteriaSet2027: CriteriaSet = {");
L.push('  id: 3, code: "BTS-TINH-2027",');
L.push('  name: "Bộ Tiêu chí các Tỉnh, Thành đoàn năm 2027 (Dự thảo)",');
L.push("  year: 2027, ownerOrgUnitId: 1, targetOrgLevel: 2,");
L.push(`  totalPoints: ${totalPoints},`);
L.push('  status: "DRAFT",');
L.push("};");
L.push("");
L.push("export const tasks2027: Task[] = [");
for (const g of groups) {
  L.push(`  { id: ${g.id}, criteriaSetId: 3, parentTaskId: null, code: ${q(g.code)}, title: ${q(g.title)}, taskKind: "TASK", maxPoints: ${g.maxPoints}, scoringMethod: "OTHER", displayOrder: ${g.order}, status: "PUBLISHED" },`);
}
for (const c of criteria) {
  L.push(`  { id: ${c.id}, criteriaSetId: 3, parentTaskId: ${c.groupId}, code: ${q(c.code)}, title: ${q(c.title)}, taskKind: "CRITERION", maxPoints: ${c.maxPoints}, scoringMethod: ${q(c.method)}, ${c.due ? `dueDate: ${q(c.due)}, ` : ""}displayOrder: ${c.order}, status: "PUBLISHED" },`);
}
L.push("];");
L.push("");
L.push("export const taskMetrics2027: TaskMetric[] = [");
for (const m of metrics) {
  const parts = [
    `id: ${m.id}`,
    `taskId: ${m.taskId}`,
    `code: ${q(m.code)}`,
    `name: ${q(m.name)}`,
    `unitOfMeasure: "điều kiện"`,
    'aggregationType: "SUM"',
    `maxPoints: ${m.maxPoints}`,
    `scoringLadder: ${q(m.ladder)}`,
  ];
  if (m.requirement) parts.push(`requirement: ${q(m.requirement)}`);
  if (m.evidence) parts.push(`evidence: ${q(m.evidence)}`);
  if (m.period) parts.push(`period: ${q(m.period)}`);
  if (m.dept) parts.push(`dept: ${q(m.dept)}`);
  L.push(`  { ${parts.join(", ")} },`);
}
L.push("];");
L.push("");

fs.writeFileSync(outFile, L.join("\n"), "utf8");
console.log(`Đã sinh ${outFile}`);
console.log(`  Nhóm: ${groups.length} (Phần 1: ${p1.length} + Phần 2)`);
console.log(`  Nội dung đánh giá: ${criteria.length} (Phần 1: ${criteria.length - 9}, Phần 2: 9)`);
console.log(`  Điều kiện chấm: ${metrics.length} (Phần 1: ${metrics.length - 9}, Phần 2: 9)`);
console.log(`  Tổng điểm set: ${totalPoints} (Phần 1: ${totalP1} + Phần 2: 100)`);
if (warnings.length) {
  console.log("  ⚠ CẢNH BÁO ĐỐI SOÁT:");
  warnings.forEach((w) => console.log("   - " + w));
} else {
  console.log("  ✓ Đối soát khớp: từng Tiêu chí đúng số điều kiện + số điểm khai báo.");
}
