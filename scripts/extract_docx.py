import zipfile
import xml.etree.ElementTree as ET
import os

folder = r"C:\Users\Admin\Desktop\Thanh niên trường học\Mẫu văn bản"
out_dir = r"C:\Users\Admin\Desktop\Thanh niên trường học\tnth-website\scripts"

files = [
    "Dac_ta_huan_luyen_AI_agent_bao_cao_Doan.docx",
    "Bao_cao_tuan_ThanhDoan_TPHCM_06-12.10.2026_mau_dau_ra.docx",
    "2. Dự thảo lần 5 BCCT Đại hội Đoàn XIII - trình TTBBT TW Đảng.docx"
]

def extract_text(docx_path):
    with zipfile.ZipFile(docx_path) as z:
        xml_content = z.read("word/document.xml")
    root = ET.fromstring(xml_content)
    namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    lines = []
    for p in root.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}p'):
        texts = [t.text for t in p.iter('{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t') if t.text]
        if texts:
            lines.append("".join(texts))
    return "\n".join(lines)

for fname in files:
    full_path = os.path.join(folder, fname)
    if os.path.exists(full_path):
        txt = extract_text(full_path)
        out_name = os.path.splitext(fname)[0] + ".txt"
        out_path = os.path.join(out_dir, out_name)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(txt)
        print(f"Extracted: {fname} -> {out_name} ({len(txt)} chars)")
    else:
        print(f"Not found: {full_path}")
