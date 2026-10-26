#!/usr/bin/env python3
"""Kiểm thử API ghi của đoàn viên (nhóm B) trên web thử — chạy: python3 -I b-api.py [BASE]"""
import http.cookiejar, json, os, struct, subprocess, sys, time, urllib.request, uuid, zlib

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:3102"
PW = open(os.environ.get("TNTH_TEST_DIR", "/var/tmp/tnth-kiem-thu") + "/test-password.txt").read().strip()
PSQL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "psql-test.sh")
RUN = uuid.uuid4().hex[:6]
results = []


def check(name, ok, extra=""):
    results.append(ok)
    print(("PASS" if ok else "FAIL"), name, ("— " + str(extra)) if extra else "")


def sql(q):
    out = subprocess.run([PSQL, "-At", "-c", q], capture_output=True, text=True)
    return out.stdout.strip()


class Client:
    def __init__(self, username=None):
        self.jar = http.cookiejar.CookieJar()
        self.op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(self.jar))
        if username:
            st, j = self.post("/api/auth/login", {"username": username, "password": PW})
            if st != 200:
                raise SystemExit(f"login {username} -> {st}")
            self.id = j.get("session", {}).get("accountId")

    def req(self, path, data=None, headers=None, method=None):
        r = urllib.request.Request(BASE + path, data=data, headers=headers or {}, method=method)
        try:
            with self.op.open(r) as resp:
                return resp.status, json.loads(resp.read() or b"null")
        except urllib.error.HTTPError as e:
            body = e.read()
            try:
                return e.code, json.loads(body)
            except Exception:
                return e.code, {"raw": body[:200].decode("latin1")}

    def post(self, path, obj):
        return self.req(path, json.dumps(obj).encode(), {"Content-Type": "application/json"}, "POST")

    def get(self, path):
        return self.req(path)

    def upload(self, kind, name, content, mime):
        b = "----b" + uuid.uuid4().hex
        body = (
            f"--{b}\r\nContent-Disposition: form-data; name=\"kind\"\r\n\r\n{kind}\r\n"
            f"--{b}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{name}\"\r\nContent-Type: {mime}\r\n\r\n"
        ).encode() + content + f"\r\n--{b}--\r\n".encode()
        st, j = self.req("/api/uploads", body, {"Content-Type": f"multipart/form-data; boundary={b}"}, "POST")
        if st != 200:
            raise SystemExit(f"upload {kind} -> {st} {j}")
        return j["file"]["url"]


def png(seed):
    # Ảnh PNG 8x8 màu theo seed (mỗi lần chạy một ảnh khác nhau)
    raw = b"".join(b"\x00" + b"".join(bytes([(seed * 37 + x * 9 + y) % 256, (seed * 11) % 256, (x * y) % 256]) for x in range(8)) for y in range(8))
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", 8, 8, 8, 2, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")


PDF = lambda: (f"%PDF-1.4\n% tnth test {RUN} {time.time()}\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n").encode()

guest = Client()
ENDPOINTS = {
    "/api/dien-dan/bai-viet": {"title": "Khách thử đăng", "content": "Nội dung khách thử đăng bài"},
    "/api/dien-dan/binh-luan": {"threadId": 1, "content": "Khách bình luận"},
    "/api/dien-dan/thich": {"kind": "THREAD", "id": 1},
    "/api/dong-gop": {"categoryTag": "x", "title": "Khách gửi bài", "content": "x" * 50},
    "/api/tai-nguyen/dong-gop": {"resourceTypeId": 1, "title": "Khách tài nguyên"},
    "/api/du-an": {"projectName": "Khách dự án"},
    "/api/hs3t/ho-so": {},
    "/api/hs3t/thanh-tich": {"title": "Khách thành tích", "category": "HOC_TAP"},
}
for path, body in ENDPOINTS.items():
    st, _ = guest.post(path, body)
    check(f"khách gọi {path} → 401", st == 401, st)

dv1, dv2, tw = Client("t.dv1"), Client("t.dv2"), Client("t.tw")
print("   tài khoản:", dv1.id, dv2.id, tw.id)

# ---------- Diễn đàn ----------
img = dv1.upload("dien-dan", f"anh-{RUN}.png", png(int(RUN, 16) % 200), "image/png")
check("tải ảnh diễn đàn lên /uploads/dien-dan/", img.startswith("/uploads/dien-dan/"), img)

st, j = dv1.post("/api/dien-dan/bai-viet", {
    "title": f"Bài sạch {RUN}", "content": "Chia sẻ kinh nghiệm học tập và hoạt động Đoàn ở trường.",
    "topic": "Học tập", "media": [{"kind": "image", "dataUrl": img, "name": "anh.png"}],
})
clean = j.get("row", {}) if st == 200 else {}
check("dv1 đăng bài sạch → PUBLISHED", st == 200 and clean.get("status") == "PUBLISHED", (st, j.get("error")))
check("dòng trả về: tác giả = mình, likeCount 0", clean.get("authorAccountId") == dv1.id and clean.get("likeCount") == 0)
check("bí danh do máy chủ sinh", bool(clean.get("alias")), clean.get("alias"))
check("media lưu đúng đường dẫn", (clean.get("media") or [{}])[0].get("dataUrl") == img)

st, j = dv1.post("/api/dien-dan/bai-viet", {
    "title": f"Bài vi phạm {RUN}", "content": "Rủ nhau đi cá độ bóng đá, đm vui lắm",
    "verdict": "CLEAN", "aiVerdict": "CLEAN", "status": "PUBLISHED", "mod": {"verdict": "CLEAN"},
    "authorAccountId": dv2.id, "alias": "Giả Mạo #1111", "likedByAccountIds": [1, 2, 3],
})
bad = j.get("row", {}) if st == 200 else {}
check("bài vi phạm + verdict CLEAN giả mạo → HIDDEN/FLAGGED", st == 200 and bad.get("status") == "HIDDEN" and bad.get("aiVerdict") == "FLAGGED", (st, bad.get("status"), j.get("reason")))
check("bỏ qua authorAccountId/alias/likes giả trong body", bad.get("authorAccountId") == dv1.id and bad.get("alias") != "Giả Mạo #1111" and bad.get("likeCount") == 0)
n = sql(f"select count(*) from notifications where recipient_account_id=1 and ref_type='FORUM_THREAD' and ref_id={bad.get('id', 0)}")
check("bài bị gắn cờ → thông báo Quản trị TW", n == "1", n)

for label, media in [
    ("URL ngoài", [{"kind": "image", "dataUrl": "https://evil.example/x.webp"}]),
    ("đường dẫn phân hệ khác", [{"kind": "image", "dataUrl": img.replace("/dien-dan/", "/dong-gop/")}]),
    ("có ../", [{"kind": "image", "dataUrl": "/uploads/dien-dan/../../etc/passwd"}]),
    ("data: base64", [{"kind": "image", "dataUrl": "data:image/png;base64,iVBORw0KGgo="}]),
    ("6 tệp", [{"kind": "image", "dataUrl": img}] * 6),
    ("2 video", [{"kind": "video", "dataUrl": "/uploads/dien-dan/2026/10/" + "a" * 32 + ".mp4"}] * 2),
    ("ảnh khai là video", [{"kind": "video", "dataUrl": img}]),
]:
    st, j = dv1.post("/api/dien-dan/bai-viet", {"title": f"Bài media {RUN}", "content": "Nội dung đủ dài để qua kiểm tra", "media": media})
    check(f"media {label} → 400", st == 400, (st, j.get("error")))
st, j = dv1.post("/api/dien-dan/bai-viet", {"title": "abc", "content": "ngắn"})
check("tiêu đề/nội dung quá ngắn → 400", st == 400, st)

# Thích
tid = clean.get("id")
st, j = dv2.post("/api/dien-dan/thich", {"kind": "THREAD", "id": tid})
check("dv2 thích bài dv1 → liked, 1", st == 200 and j.get("liked") is True and j.get("likeCount") == 1, j)
check("dòng trả dv2 đã che: tác giả null, liked=[dv2]", j.get("row", {}).get("authorAccountId") is None and j.get("row", {}).get("likedByAccountIds") == [dv2.id] and "aiModel" not in j.get("row", {}), j.get("row", {}).get("authorAccountId"))
st, j = dv1.post("/api/dien-dan/thich", {"kind": "THREAD", "id": tid})
check("dv1 thích → 2", j.get("likeCount") == 2 and j.get("liked") is True, j.get("likeCount"))
st, j = dv2.post("/api/dien-dan/thich", {"kind": "THREAD", "id": tid})
check("dv2 bỏ thích → 1, liked false", j.get("likeCount") == 1 and j.get("liked") is False, j)
arr = sql(f"select liked_account_ids from forum_threads where id={tid}")
check("DB liked_account_ids chỉ còn dv1", arr == "{" + str(dv1.id) + "}", arr)
st, j = dv2.post("/api/dien-dan/thich", {"kind": "THREAD", "id": bad.get("id")})
check("dv2 thích bài ẩn của dv1 → 404", st == 404, st)
st, j = dv1.post("/api/dien-dan/thich", {"kind": "THREAD", "id": bad.get("id")})
check("dv1 thích bài ẩn của chính mình → 200", st == 200, st)
st, j = dv1.post("/api/dien-dan/thich", {"kind": "THREAD", "id": bad.get("id")})

# Bình luận
st, j = dv2.post("/api/dien-dan/binh-luan", {"threadId": tid, "content": "Bài viết hay, cảm ơn bạn đã chia sẻ!", "verdict": "FLAGGED"})
check("dv2 bình luận sạch → PUBLISHED", st == 200 and j.get("row", {}).get("status") == "PUBLISHED", (st, j.get("error")))
cid = j.get("row", {}).get("id")
st, j = dv2.post("/api/dien-dan/binh-luan", {"threadId": tid, "content": "Thằng chó nói láo", "verdict": "CLEAN"})
check("bình luận vi phạm → PENDING_REVIEW", st == 200 and j.get("row", {}).get("status") == "PENDING_REVIEW", j.get("row", {}).get("status"))
st, j = dv2.post("/api/dien-dan/binh-luan", {"threadId": bad.get("id"), "content": "Bình luận vào bài ẩn"})
check("dv2 bình luận bài ẩn của dv1 → 404", st == 404, st)
st, j = dv1.post("/api/dien-dan/thich", {"kind": "COMMENT", "id": cid})
check("dv1 thích bình luận dv2 → 1", j.get("likeCount") == 1, j)

# Không sửa được bài người khác qua API mới: thích chỉ đổi đúng id của mình, nội dung giữ nguyên
before = sql(f"select title||'|'||content||'|'||author_account_id from forum_threads where id={tid}")
dv2.post("/api/dien-dan/thich", {"kind": "THREAD", "id": tid, "title": "SỬA TRỘM", "content": "SỬA TRỘM"})
dv2.post("/api/dien-dan/thich", {"kind": "THREAD", "id": tid})
after = sql(f"select title||'|'||content||'|'||author_account_id from forum_threads where id={tid}")
check("API thích không sửa được nội dung bài người khác", before == after, after[:60])

# Cán bộ đăng diễn đàn cũng qua API
st, j = tw.post("/api/dien-dan/bai-viet", {"title": f"Cán bộ đăng {RUN}", "content": "Thông báo hoạt động Đoàn tháng này."})
check("cán bộ đăng bài qua API → PUBLISHED, nhận đủ dòng", st == 200 and j.get("row", {}).get("status") == "PUBLISHED" and j.get("row", {}).get("authorAccountId") == tw.id, st)

# ---------- Bài đóng góp tin tức ----------
cover = dv1.upload("dong-gop", f"bia-{RUN}.png", png(int(RUN, 16) % 200 + 1), "image/png")
base = {"categoryTag": "Thanh niên trường học", "title": f"Bài đóng góp {RUN}", "content": "Nội dung bài đóng góp về hoạt động Đoàn trường, phong trào thanh niên tình nguyện."}
for label, cv in [("URL ngoài", "https://evil.example/a.webp"), ("phân hệ dien-dan", img), ("data:", "data:image/png;base64,AAAA")]:
    st, j = dv1.post("/api/dong-gop", {**base, "coverDataUrl": cv})
    check(f"đóng góp bài: ảnh bìa {label} → 400", st == 400, (st, j.get("error")))
st, j = dv1.post("/api/dong-gop", {**base, "coverDataUrl": cover, "aiVerdict": "FLAGGED", "status": "APPROVED", "contributorAccountId": dv2.id})
row = j.get("row", {})
check("đóng góp bài hợp lệ → PENDING, người gửi = dv1", st == 200 and row.get("status") == "PENDING" and row.get("contributorAccountId") == dv1.id and row.get("aiVerdict") == "CLEAN", (st, row.get("status"), j.get("error")))
st, j = dv1.post("/api/dong-gop", {**base, "title": f"Bài đóng góp vi phạm {RUN}", "content": base["content"] + " Liên hệ vay tiền nhanh 0912345678", "aiVerdict": "CLEAN"})
check("đóng góp bài vi phạm → aiVerdict FLAGGED", j.get("row", {}).get("aiVerdict") == "FLAGGED", j.get("row", {}).get("aiReason"))

# ---------- Tài nguyên ----------
doc = dv1.upload("tai-nguyen", f"tai-lieu-{RUN}.pdf", PDF(), "application/pdf")
rbase = {"resourceTypeId": 1, "title": f"Tài nguyên {RUN}", "description": "Tài liệu sinh hoạt chi đoàn", "fileName": "tai-lieu.pdf", "fileSizeKb": 1}
for label, fu in [("URL ngoài", "https://evil.example/a.pdf"), ("phân hệ du-an", doc.replace("/tai-nguyen/", "/du-an/")), ("thiếu tệp", None)]:
    st, j = dv1.post("/api/tai-nguyen/dong-gop", {**rbase, "fileDataUrl": fu})
    check(f"tài nguyên: tệp {label} → 400", st == 400, (st, j.get("error")))
st, j = dv1.post("/api/tai-nguyen/dong-gop", {**rbase, "fileDataUrl": doc, "status": "PUBLISHED", "isPublic": True, "submittedByAccountId": dv2.id})
row = j.get("row", {})
check("tài nguyên hợp lệ → DRAFT, không công khai, người gửi = dv1", st == 200 and row.get("status") == "DRAFT" and row.get("isPublic") is False and row.get("submittedByAccountId") == dv1.id, (st, j.get("error")))

# ---------- Dự án tình nguyện ----------
rep = dv1.upload("du-an", f"bao-cao-{RUN}.pdf", PDF(), "application/pdf")
pbase = {"province": "Nghệ An", "projectName": f"Dự án thử {RUN}", "summary": "Dự án trồng cây xanh tại khuôn viên trường học.", "participants": 30, "field": "MOI_TRUONG", "phase": "DANG_TRIEN_KHAI"}
for label, rf in [("URL ngoài", {"name": "a.pdf", "dataUrl": "https://evil.example/a.pdf"}), ("phân hệ tai-nguyen", {"name": "a.pdf", "dataUrl": doc})]:
    st, j = dv1.post("/api/du-an", {**pbase, "reportFile": rf})
    check(f"dự án: file báo cáo {label} → 400", st == 400, (st, j.get("error")))
st, j = dv1.post("/api/du-an", {**pbase, "reportFile": {"name": "bao-cao.pdf", "dataUrl": rep}, "status": "APPROVED", "orgUnitId": 1, "aiVerdict": "CLEAN"})
row = j.get("row", {})
check("dự án hợp lệ → PENDING, đơn vị theo tài khoản", st == 200 and row.get("status") == "PENDING" and row.get("orgUnitId") == 131101 and row.get("submittedByAccountId") == dv1.id, (st, row.get("orgUnitId"), j.get("error")))
check("dự án trả reportFile dạng client", row.get("reportFile", {}).get("dataUrl") == rep)

# ---------- HS3T ----------
st, j = dv1.post("/api/hs3t/ho-so", {})
p1 = j.get("row", {})
check("dv1 lấy/tạo hồ sơ của mình", st == 200 and p1.get("accountId") == dv1.id and bool(p1.get("code")), (st, p1.get("code")))
st, j = dv1.post("/api/hs3t/ho-so", {"accountId": dv2.id})
check("gọi lại → cùng hồ sơ (idempotent, bỏ qua accountId giả)", j.get("row", {}).get("id") == p1.get("id") and j.get("created") is False)
st, j = dv2.post("/api/hs3t/ho-so", {})
p2 = j.get("row", {})
check("dv2 có hồ sơ riêng, mã khác", st == 200 and p2.get("accountId") == dv2.id and p2.get("code") != p1.get("code"), (p1.get("code"), p2.get("code")))
ach = {"title": f"Giải nhất học sinh giỏi {RUN}", "category": "HOC_TAP", "achievedAt": "2026-05-01", "evidenceNames": ["giay-khen.pdf"]}
st, j = dv1.post("/api/hs3t/thanh-tich", {**ach, "profileId": p1.get("id"), "addedByRole": "SCHOOL"})
check("dv1 thêm thành tích vào hồ sơ mình → STUDENT", st == 200 and j.get("row", {}).get("profileId") == p1.get("id") and j.get("row", {}).get("addedByRole") == "STUDENT", (st, j.get("error")))
st, j = dv1.post("/api/hs3t/thanh-tich", {**ach, "profileId": p2.get("id")})
check("dv1 thêm vào hồ sơ dv2 → 403", st == 403, st)
st, j = tw.post("/api/hs3t/ho-so", {})
check("cán bộ gọi API hồ sơ đoàn viên → 403", st == 403, st)

print(f"\n{sum(results)}/{len(results)} PASS")
sys.exit(0 if all(results) else 1)
