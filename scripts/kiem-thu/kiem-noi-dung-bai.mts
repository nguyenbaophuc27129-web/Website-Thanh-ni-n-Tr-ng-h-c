// Kiểm phần lõi trình soạn thảo bài viết (src/lib/editor/*): chuyển Markdown cũ, rút văn bản thuần,
// chốt chặn validatePostDoc (danh sách trắng chống XSS). Không cần DB, không cần web chạy.
//
//   docker build --target builder -t tnth-builder:editor .
//   docker run --rm -v "$PWD/scripts:/app/scripts:ro" [-v <bai-cu.json>:/bai-cu.json:ro] tnth-builder:editor \
//     node --no-warnings --import ./scripts/kiem-thu/alias-loader.mjs scripts/kiem-thu/kiem-noi-dung-bai.mts [/bai-cu.json]
// bai-cu.json (tuỳ chọn): [{ "id": 1, "content": "<Markdown bài thật>" }] — kiểm bài cũ chuyển được và hợp lệ.
import { readFileSync } from "node:fs";
import { legacyMarkdownToDoc } from "../../src/lib/editor/legacy-markdown.ts";
import { docToPlainText, isDocEmpty } from "../../src/lib/editor/doc-utils.ts";
import { validatePostDoc } from "../../src/lib/editor/doc-validate.ts";
import { isSafeFileUrl, isSafeLinkHref, youtubeVideoId } from "../../src/lib/safe-urls.ts";

let pass = 0;
let fail = 0;
const check = (name: string, ok: boolean, extra = "") => {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${!ok && extra ? " — " + extra : ""}`);
};

const IMG = "/uploads/bai-viet/2026/10/b72e5843d7bf9723a4a6f3b5bac6567c.webp";
const serverOpts = { isImageSrc: (v: unknown) => typeof v === "string" && /^\/uploads\/bai-viet\/\d{4}\/\d{2}\/[a-f0-9]{16,64}\.webp$/.test(v) };
const valid = (doc: unknown) => validatePostDoc(doc, serverOpts);

/* ---------- Markdown cũ → tài liệu ---------- */
const md = [
  "Mở đầu **đậm** và *nghiêng*, <u>gạch chân</u>, ~~gạch~~, [link](https://doan.vn).",
  "## Tiêu đề lớn",
  "### Tiêu đề nhỏ",
  `![Ảnh hoạt động](${IMG})\n*Chú thích ảnh*`,
  "> Câu trích dẫn",
  "Đoạn có danh sách:\n- Một\n- Hai\n1. Bước một\n2. Bước hai",
  "[xấu](javascript:alert(1))",
].join("\n\n");
const doc = legacyMarkdownToDoc(md);
const types = (doc.content ?? []).map((n) => n.type);
check("Markdown cũ: đủ loại khối", ["paragraph", "heading", "heading", "figureImage", "blockquote", "paragraph", "bulletList", "orderedList", "paragraph"].every((t, i) => types[i] === t), types.join(","));
const first = doc.content?.[0]?.content ?? [];
const marksOf = (t: string) => first.find((n) => n.text === t)?.marks?.map((m) => m.type).join("+");
check("Markdown cũ: đậm/nghiêng/gạch chân/gạch ngang", marksOf("đậm") === "bold" && marksOf("nghiêng") === "italic" && marksOf("gạch chân") === "underline" && marksOf("gạch") === "strike");
check("Markdown cũ: link an toàn giữ lại", first.some((n) => n.marks?.[0]?.type === "link" && n.marks[0].attrs?.href === "https://doan.vn"));
const fig = doc.content?.find((n) => n.type === "figureImage");
check("Markdown cũ: ảnh + chú thích", fig?.attrs?.src === IMG && fig?.attrs?.caption === "Chú thích ảnh");
const last = doc.content?.[doc.content.length - 1];
check("Markdown cũ: link javascript: thành chữ thường", !JSON.stringify(last).includes('"link"') && JSON.stringify(last).includes("javascript:"));
check("Markdown cũ: kết quả qua được chốt chặn", valid(doc) === null, String(valid(doc)));
check("Markdown rỗng → tài liệu rỗng hợp lệ", isDocEmpty(legacyMarkdownToDoc("")) && valid(legacyMarkdownToDoc("")) === null);
check("Ảnh + dòng chú thích tách khối vẫn gắn vào ảnh", legacyMarkdownToDoc(`![](${IMG})\n\n*Chú thích riêng*`).content?.[0]?.attrs?.caption === "Chú thích riêng");

/* ---------- Văn bản thuần ---------- */
const text = docToPlainText(doc);
check("Văn bản thuần: có chữ, chú thích, mục danh sách", text.includes("Mở đầu đậm và nghiêng") && text.includes("Chú thích ảnh") && text.includes("- Một"));
check("Văn bản thuần: không còn ký hiệu Markdown", !/\*\*|<u>|~~|!\[/.test(text));

/* ---------- Chốt chặn validatePostDoc ---------- */
const p = (content: unknown[]) => ({ type: "doc", content });
const t = (text: string, marks?: unknown[]) => (marks ? { type: "text", text, marks } : { type: "text", text });
const bad: [string, unknown][] = [
  ["link javascript:", p([{ type: "paragraph", content: [t("x", [{ type: "link", attrs: { href: "javascript:alert(1)" } }])] }])],
  ["link JaVaScRiPt có khoảng trắng", p([{ type: "paragraph", content: [t("x", [{ type: "link", attrs: { href: " javascript:alert(1)" } }])] }])],
  ["link data:", p([{ type: "paragraph", content: [t("x", [{ type: "link", attrs: { href: "data:text/html,<script>" } }])] }])],
  ["link //host", p([{ type: "paragraph", content: [t("x", [{ type: "link", attrs: { href: "//evil.com" } }])] }])],
  ["ảnh link ngoài", p([{ type: "figureImage", attrs: { src: "https://evil.com/a.png", alt: "", caption: "", width: "100", align: "center" } }])],
  ["ảnh data:", p([{ type: "figureImage", attrs: { src: "data:image/svg+xml,<svg onload=alert(1)>", alt: "", caption: "", width: "100", align: "center" } }])],
  ["ảnh sai phân hệ", p([{ type: "figureImage", attrs: { src: "/uploads/tai-nguyen/2026/10/b72e5843d7bf9723a4a6f3b5bac6567c.webp", alt: "", caption: "", width: "100", align: "center" } }])],
  ["ảnh độ rộng lạ", p([{ type: "figureImage", attrs: { src: IMG, alt: "", caption: "", width: "120", align: "center" } }])],
  ["ảnh thuộc tính lạ (onerror)", p([{ type: "figureImage", attrs: { src: IMG, alt: "", caption: "", width: "100", align: "center", onerror: "alert(1)" } }])],
  ["khối lạ (iframe)", p([{ type: "iframe", attrs: { src: "https://evil.com" } }])],
  ["khối lạ (codeBlock)", p([{ type: "codeBlock", content: [t("x")] }])],
  ["định dạng lạ (textStyle)", p([{ type: "paragraph", content: [t("x", [{ type: "textStyle", attrs: { color: "red" } }])] }])],
  ["thuộc tính style tự thêm", p([{ type: "paragraph", attrs: { style: "background:url(javascript:1)" }, content: [t("x")] }])],
  ["canh lề lạ", p([{ type: "paragraph", attrs: { textAlign: "expression(alert(1))" }, content: [t("x")] }])],
  ["tiêu đề H1", p([{ type: "heading", attrs: { level: 1 }, content: [t("x")] }])],
  ["YouTube giả", p([{ type: "youtube", attrs: { src: "https://evil.com/embed/abcdefghijk" } }])],
  ["trường lạ trên khối", p([{ type: "paragraph", html: "<script>", content: [t("x")] }])],
  ["cấu trúc sai (đoạn trong chữ)", p([t("chữ ngay dưới gốc")])],
  ["bảng sai cấu trúc", p([{ type: "table", content: [{ type: "paragraph", content: [t("x")] }] }])],
  ["không phải tài liệu", { type: "paragraph" }],
  ["chuỗi JSON hỏng", "{not json"],
  ["quá sâu", (() => { let n: Record<string, unknown> = { type: "paragraph", content: [t("x")] }; for (let i = 0; i < 60; i++) n = { type: "blockquote", content: [n] }; return p([n]); })()],
  ["quá lớn", p(Array.from({ length: 31000 }, () => ({ type: "paragraph" })))],
];
for (const [name, d] of bad) check(`chặn: ${name}`, valid(d) !== null);

const good = p([
  { type: "heading", attrs: { level: 2, textAlign: "center" }, content: [t("Tiêu đề")] },
  { type: "paragraph", attrs: { textAlign: "justify" }, content: [t("Đậm", [{ type: "bold" }]), { type: "hardBreak" }, t("link", [{ type: "link", attrs: { href: "https://doan.vn/a?b=1", target: "_blank", rel: "noopener noreferrer nofollow", class: null } }])] },
  { type: "paragraph", content: [t("nội bộ", [{ type: "link", attrs: { href: "/tin-tuc/abc" } }]), t(" mail", [{ type: "link", attrs: { href: "mailto:a@b.vn" } }])] },
  { type: "figureImage", attrs: { src: IMG, alt: "mô tả", caption: "chú thích", width: "50", align: "left" } },
  { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [t("mục")] }] }] },
  { type: "orderedList", attrs: { start: 3, type: null }, content: [{ type: "listItem", content: [{ type: "paragraph", content: [t("mục")] }] }] },
  { type: "blockquote", content: [{ type: "paragraph", content: [t("trích")] }] },
  { type: "horizontalRule" },
  { type: "youtube", attrs: { src: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", start: 0, width: 640, height: 480 } },
  { type: "table", content: [
    { type: "tableRow", content: [{ type: "tableHeader", attrs: { colspan: 1, rowspan: 1, colwidth: null }, content: [{ type: "paragraph", content: [t("A")] }] }] },
    { type: "tableRow", content: [{ type: "tableCell", attrs: { colspan: 1, rowspan: 1, colwidth: [120] }, content: [{ type: "paragraph", content: [t("1")] }] }] },
  ] },
]);
check("cho qua: tài liệu đủ mọi định dạng hợp lệ", valid(good) === null, String(valid(good)));
check("cho qua: dạng chuỗi JSON", valid(JSON.stringify(good)) === null);

/* ---------- Kiểm đường dẫn ---------- */
check("link: chặn javascript:/data:/vbscript:", !isSafeLinkHref("javascript:alert(1)") && !isSafeLinkHref("data:x") && !isSafeLinkHref("vbscript:x"));
check("link: chặn có ký tự điều khiển", !isSafeLinkHref("java\tscript:alert(1)") && !isSafeLinkHref("https://a.vn/\nx"));
check("link: nhận https/mailto/tel/nội bộ/#", ["https://a.vn", "mailto:a@b.vn", "tel:0123", "/tin-tuc", "#muc-1"].every(isSafeLinkHref));
check("YouTube: đủ dạng link", ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ", "https://www.youtube.com/shorts/dQw4w9WgXcQ", "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"].every((u) => youtubeVideoId(u) === "dQw4w9WgXcQ"));
check("YouTube: chặn host giả / http", youtubeVideoId("https://youtube.com.evil.vn/watch?v=dQw4w9WgXcQ") === null && youtubeVideoId("http://youtu.be/dQw4w9WgXcQ") === null);

/* ---------- Bài thật (tuỳ chọn) ---------- */
const fixture = process.argv[2];
if (fixture) {
  const posts = JSON.parse(readFileSync(fixture, "utf8")) as { id: number; content: string }[];
  for (const post of posts) {
    const d = legacyMarkdownToDoc(post.content);
    const err = validatePostDoc(d, { isImageSrc: isSafeFileUrl });
    const imgs = (post.content.match(/!\[/g) ?? []).length;
    const figs = (d.content ?? []).filter((n) => n.type === "figureImage").length;
    check(`bài thật #${post.id}: chuyển được, hợp lệ, đủ ${imgs} ảnh`, err === null && figs === imgs, `${err ?? ""} ảnh ${figs}/${imgs}`);
    const before = post.content.replace(/!\[[^\]]*\]\([^)]*\)|[*_~#>]|<\/?u>/g, "").replace(/\s+/g, " ").trim();
    const after = docToPlainText(d).replace(/[-]/g, "").replace(/\s+/g, " ").trim();
    check(`bài thật #${post.id}: không mất chữ`, after.length >= before.replace(/[-]/g, "").length * 0.95, `${after.length}/${before.length}`);
  }
}

console.log(`\n${pass}/${pass + fail} PASS`);
process.exit(fail ? 1 : 0);
