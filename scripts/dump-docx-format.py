# Dump cấu trúc + định dạng từng đoạn của DOCX gốc để tái tạo thể thức Word xuất AI.
# Chạy: python scripts/dump-docx-format.py  → ghi scripts/thuc-the-2-mau.txt
import zipfile
import re
import os

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

FOLDER = r"C:\Users\Admin\Desktop\Thanh niên trường học\Mẫu văn bản"
FILES = [
    "Bao_cao_tuan_ThanhDoan_TPHCM_06-12.10.2026_mau_dau_ra.docx",
    "2. Dự thảo lần 5 BCCT Đại hội Đoàn XIII - trình TTBBT TW Đảng.docx",
]
OUT = os.path.join(os.path.dirname(__file__), "thuc-the-2-mau.txt")


def get(el, tag, attr="val"):
    v = el.find(f"{W}{tag}")
    if v is None:
        return None
    return v.get(f"{W}{attr}") or "(co)"


def para_desc(p):
    ppr = p.find(f"{W}pPr")
    props = []
    jc = num = None
    if ppr is not None:
        jc = get(ppr, "jc")
        ind = ppr.find(f"{W}ind")
        if ind is not None:
            for k in ("left", "firstLine", "hanging"):
                v = ind.get(f"{W}{k}")
                if v:
                    props.append(f"ind.{k}={v}")
        sp = ppr.find(f"{W}spacing")
        if sp is not None:
            parts = []
            for k in ("before", "after", "line"):
                v = sp.get(f"{W}{k}")
                if v:
                    parts.append(f"{k}={v}")
            if parts:
                props.append("spacing(" + ",".join(parts) + ")")
        numpr = ppr.find(f"{W}numPr")
        if numpr is not None:
            props.append("LIST")
        pstyle = ppr.find(f"{W}pStyle")
        if pstyle is not None:
            props.append("style=" + (pstyle.get(f"{W}val") or "?"))
    # runs: gom đặc điểm chữ + text
    runs = []
    for r in p.iter(f"{W}r"):
        rpr = r.find(f"{W}rPr")
        b = i = sz = font = u = None
        if rpr is not None:
            b = rpr.find(f"{W}b") is not None
            i = rpr.find(f"{W}i") is not None
            u = rpr.find(f"{W}u") is not None
            szel = rpr.find(f"{W}sz")
            sz = szel.get(f"{W}val") if szel is not None else None
            fel = rpr.find(f"{W}rFonts")
            font = (fel.get(f"{W}ascii") if fel is not None else None)
        text = "".join(t.text or "" for t in r.iter(f"{W}t"))
        if not text:
            continue
        flags = "".join([
            "B" if b else "",
            "I" if i else "",
            "U" if u else "",
        ])
        runs.append(f"[{flags}|{sz or '?'}|{font or '?'}] {text}")
    full = "".join("".join(t.text or "" for t in r.iter(f"{W}t")) for r in p.iter(f"{W}r"))
    if not full.strip():
        return None
    head = f"jc={jc or 'left'}"
    if props:
        head += " " + " ".join(props)
    return head + "\n" + "\n".join("    " + r for r in runs)


def dump(docx_path):
    out = []
    with zipfile.ZipFile(docx_path) as z:
        doc = z.read("word/document.xml").decode("utf-8")
        # styles default font/size
        try:
            styles = z.read("word/styles.xml").decode("utf-8")
            m = re.search(r"<w:docDefaults>.*?</w:docDefaults>", styles, re.S)
            if m:
                fonts = re.findall(r'w:ascii="([^"]+)"', m.group(0))
                szs = re.findall(r'<w:sz w:val="(\d+)"', m.group(0))
                out.append(f"== docDefaults: font={fonts[:1]} sz(half-pt)={szs[:2]}")
        except KeyError:
            pass
        # sectPr margins
        for m in re.finditer(r"<w:pgMar[^/]*/>", doc):
            out.append("== pgMar: " + m.group(0))
            break
    # parse paragraphs qua ElementTree
    import xml.etree.ElementTree as ET
    root = ET.fromstring(doc)
    body = root.find(f"{W}body")
    idx = 0
    for child in body.iter():
        if child.tag == f"{W}p":
            idx += 1
            d = para_desc(child)
            if d:
                out.append(f"--- P{idx}: {d}")
    return out


with open(OUT, "w", encoding="utf-8") as g:
    for f in FILES:
        g.write(f"\n{'='*80}\nFILE: {f}\n{'='*80}\n")
        for line in dump(os.path.join(FOLDER, f)):
            g.write(line + "\n")
print("OK", OUT)
