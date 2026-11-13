# Dump v2: giữ cấu trúc bảng (tbl/tr/tc), bold/italic đúng nghĩa OOXML (w:val="0" = tắt),
# size/font ở run lẫn paragraph-mark, styles được dùng. Ghi scripts/thuc-the-2-mau.txt
import zipfile
import re
import os
import xml.etree.ElementTree as ET

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
FOLDER = r"C:\Users\Admin\Desktop\Thanh niên trường học\Mẫu văn bản"
FILES = [
    "Bao_cao_tuan_ThanhDoan_TPHCM_06-12.10.2026_mau_dau_ra.docx",
    "2. Dự thảo lần 5 BCCT Đại hội Đoàn XIII - trình TTBBT TW Đảng.docx",
]
OUT = os.path.join(os.path.dirname(__file__), "thuc-the-2-mau.txt")

styles_map = {}  # styleId -> (name, sz, font, bold, italic)


def load_styles(z):
    try:
        styles = z.read("word/styles.xml").decode("utf-8")
    except KeyError:
        return
    root = ET.fromstring(styles)
    for st in root.iter(f"{W}style"):
        sid = st.get(f"{W}styleId") or "?"
        name = ""
        nel = st.find(f"{W}name")
        if nel is not None:
            name = nel.get(f"{W}val") or ""
        sz = font = None
        b = i = False
        rpr = st.find(f"{W}rPr")
        if rpr is not None:
            szel = rpr.find(f"{W}sz")
            sz = szel.get(f"{W}val") if szel is not None else None
            fel = rpr.find(f"{W}rFonts")
            font = fel.get(f"{W}ascii") if fel is not None else None
            b = rpr.find(f"{W}b") is not None
            i = rpr.find(f"{W}i") is not None
        styles_map[sid] = (name, sz, font, b, i)


def flag(el, tag):
    """True nếu bật, False nếu w:val="0", None nếu không có."""
    e = el.find(f"{W}{tag}")
    if e is None:
        return None
    v = e.get(f"{W}val")
    return v not in ("0", "false", "off")


def runs_desc(p, default_sz, default_font):
    parts = []
    for r in p.iter(f"{W}r"):
        rpr = r.find(f"{W}rPr")
        b = i = u = None
        sz = font = None
        if rpr is not None:
            b = flag(rpr, "b")
            i = flag(rpr, "i")
            u = flag(rpr, "u")
            szel = rpr.find(f"{W}sz")
            sz = szel.get(f"{W}val") if szel is not None else None
            fel = rpr.find(f"{W}rFonts")
            font = fel.get(f"{W}ascii") if fel is not None else None
        text = "".join(t.text or "" for t in r.iter(f"{W}t"))
        if not text:
            continue
        flags = "".join([
            "B" if b else ("b0" if b is False else ""),
            "I" if i else ("i0" if i is False else ""),
            "U" if u else "",
        ])
        szf = sz or default_sz or "?"
        ff = font or default_font or "?"
        parts.append(f"[{flags}|{szf}|{ff}] {text}")
    return parts


def ppr_desc(ppr, styles_map):
    bits = []
    if ppr is None:
        return bits
    pstyle = ppr.find(f"{W}pStyle")
    if pstyle is not None:
        sid = pstyle.get(f"{W}val")
        st = styles_map.get(sid)
        bits.append(f"style={sid}({st[0] if st else '?'} sz={st[1] if st else '?'})")
    jc = ppr.find(f"{W}jc")
    if jc is not None:
        bits.append("jc=" + (jc.get(f"{W}val") or "?"))
    ind = ppr.find(f"{W}ind")
    if ind is not None:
        for k in ("left", "firstLine", "hanging"):
            v = ind.get(f"{W}{k}")
            if v:
                bits.append(f"ind.{k}={v}")
    sp = ppr.find(f"{W}spacing")
    if sp is not None:
        parts = [f"{k}={sp.get(f'{W}{k}')}" for k in ("before", "after", "line") if sp.get(f"{W}{k}")]
        if parts:
            bits.append("spacing(" + ",".join(parts) + ")")
    if ppr.find(f"{W}numPr") is not None:
        bits.append("LIST")
    return bits


def emit_para(p, out, prefix, default_sz, default_font):
    ppr = p.find(f"{W}pPr")
    bits = ppr_desc(ppr, styles_map)
    # paragraph-mark run props (size/font mặc định của đoạn)
    mark_sz = mark_font = None
    if ppr is not None:
        mrpr = ppr.find(f"{W}rPr")
        if mrpr is not None:
            szel = mrpr.find(f"{W}sz")
            mark_sz = szel.get(f"{W}val") if szel is not None else None
            fel = mrpr.find(f"{W}rFonts")
            mark_font = fel.get(f"{W}ascii") if fel is not None else None
    runs = runs_desc(p, mark_sz or default_sz, mark_font or default_font)
    if not runs:
        return
    head = prefix + (" ".join(bits) if bits else "(default)")
    out.append(head)
    for r in runs:
        out.append("    " + r)


def emit_container(el, out, prefix, default_sz, default_font):
    """Duyệt con: bảng đánh dấu [TABLE ROW CELL], đoạn đánh dấu --- ."""
    for child in el:
        if child.tag == f"{W}tbl":
            out.append(prefix + "══TABLE══")
            for tr in child.findall(f"{W}tr"):
                trpr = tr.find(f"{W}trPr")
                cells = []
                for tc in tr.findall(f"{W}tc"):
                    tcpr = tc.find(f"{W}tcPr")
                    w = ""
                    if tcpr is not None:
                        wel = tcpr.find(f"{W}tcW")
                        if wel is not None:
                            w = wel.get(f"{W}w") or ""
                    cells.append(f"w={w}")
                out.append(prefix + f"ROW({', '.join(cells)})")
                for ci, tc in enumerate(tr.findall(f"{W}tc")):
                    emit_container(tc, out, prefix + f"  C{ci+1}| ", default_sz, default_font)
        elif child.tag == f"{W}p":
            emit_para(child, out, prefix + "--- ", default_sz, default_font)
        else:
            emit_container(child, out, prefix, default_sz, default_font)


def dump(docx_path, out):
    with zipfile.ZipFile(docx_path) as z:
        doc = z.read("word/document.xml").decode("utf-8")
        load_styles(z)
        try:
            styles = z.read("word/styles.xml").decode("utf-8")
            m = re.search(r"<w:docDefaults>.*?</w:docDefaults>", styles, re.S)
            if m:
                szs = re.findall(r'<w:sz w:val="(\d+)"', m.group(0))
                fonts = re.findall(r'w:ascii="([^"]+)"', m.group(0))
                out.append(f"== docDefaults sz={szs[:1]} font={fonts[:1]}")
        except KeyError:
            pass
        for m in re.finditer(r"<w:pgMar[^/]*/>", doc):
            out.append("== pgMar " + m.group(0))
            break
        root = ET.fromstring(doc)
        body = root.find(f"{W}body")
        emit_container(body, out, "", "22", "Times New Roman")


with open(OUT, "w", encoding="utf-8") as g:
    for f in FILES:
        g.write(f"\n{'='*80}\nFILE: {f}\n{'='*80}\n")
        lines = []
        dump(os.path.join(FOLDER, f), lines)
        g.write("\n".join(lines) + "\n")
print("OK", len(lines))
