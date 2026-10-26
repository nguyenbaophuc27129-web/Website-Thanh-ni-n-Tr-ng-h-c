#!/usr/bin/env bash
# Bài thử nhóm E: xác thực + giới hạn tần suất cho fetch-article và /api/ai/*
# Chạy ngay sau khi khởi động lại container (bộ đếm trong bộ nhớ phải ở 0).
S=${TNTH_TEST_DIR:-/var/tmp/tnth-kiem-thu}
B=${BASE:-http://127.0.0.1:3105}
D=$S/e-test/jar; mkdir -p $D
PW=$(cat $S/test-password.txt)
pass=0; fail=0
login() { curl -s -c $D/$1 -o /dev/null -w "%{http_code}" -H 'Content-Type: application/json' -X POST $B/api/auth/login --data "{\"username\":\"$1\",\"password\":\"$PW\"}"; }
# call <user|-> <path> <json> → in mã HTTP
call() { local jar=""; [ "$1" != "-" ] && jar="-b $D/$1"; curl -s $jar -o $D/last.json -w "%{http_code}" -H 'Content-Type: application/json' -X POST "$B$2" --data "$3"; }
expect() { if [ "$2" = "$3" ]; then echo "PASS $1 ($3)"; pass=$((pass+1)); else echo "FAIL $1 — mong $2, nhận $3: $(head -c 200 $D/last.json)"; fail=$((fail+1)); fi; }
okcode() { [[ "$1" = 200 || "$1" = 502 ]] && echo ok || echo "$1"; }
for u in t.dv1 t.btv t.donvi t.tw t.dv2 t.tinh; do echo "login $u $(login $u)"; done

ART='{"url":"https://example.com/"}'
expect "fetch-article khách → 401" 401 $(call - /api/fetch-article "$ART")
expect "fetch-article t.dv1 → 403" 403 $(call t.dv1 /api/fetch-article "$ART")
c=$(call t.btv /api/fetch-article "$ART"); echo "   t.btv body: $(head -c 160 $D/last.json)"
expect "fetch-article t.btv hoạt động (200; 502 nếu máy chủ không ra mạng ngoài)" ok $(okcode $c)
expect "fetch-article SSRF vẫn chặn (127.0.0.1)" 502 $(call t.btv /api/fetch-article '{"url":"http://127.0.0.1:3000/"}')
grep -q "nội bộ" $D/last.json && echo "PASS   thông báo chặn nội bộ" || echo "FAIL   thiếu thông báo nội bộ: $(cat $D/last.json)"
# 30 lượt/10 phút: đã dùng 2 → đốt tiếp 28 lượt (URL sai vẫn bị đếm vì chốt đứng trước bước đọc body)
for i in $(seq 1 28); do call t.btv /api/fetch-article '{"url":"nope"}' >/dev/null; done
expect "fetch-article t.btv lượt 31 → 429" 429 $(call t.btv /api/fetch-article "$ART")
echo "   429 body: $(cat $D/last.json)"
expect "fetch-article tài khoản khác vẫn dùng được (t.donvi, url sai → 400)" 400 $(call t.donvi /api/fetch-article '{"url":"nope"}')

# ---- AI routes chỉ cán bộ ----
STAFF_ROUTES=("nhap-bao-cao|{\"ctx\":{\"orgUnitName\":\"X\",\"period\":\"Q1\",\"activityCount\":1,\"participantCount\":1,\"taskLines\":[],\"postCount\":0}}|20"
  "phan-tich-cong-van|{\"text\":\"Công văn số 1 yêu cầu tổ chức 10 hoạt động tình nguyện trước ngày 30/11/2026 cho toàn bộ đoàn viên.\"}|20"
  "xet-hs3t|{\"profile\":{\"id\":1,\"studentName\":\"A\"},\"achievements\":[]}|60")
for spec in "${STAFF_ROUTES[@]}"; do
  IFS='|' read -r r body max <<<"$spec"
  expect "ai/$r khách → 401" 401 $(call - /api/ai/$r "$body")
  expect "ai/$r t.dv1 → 403" 403 $(call t.dv1 /api/ai/$r "$body")
  c=$(call t.tw /api/ai/$r "$body"); expect "ai/$r t.tw qua chốt (200/502)" ok $(okcode $c)
  for i in $(seq 2 $max); do call t.tw /api/ai/$r "$body" >/dev/null; done
  expect "ai/$r t.tw lượt $((max+1)) → 429" 429 $(call t.tw /api/ai/$r "$body")
done
expect "ai/phan-tich-cong-van quá dài → 413" 413 $(call t.tinh /api/ai/phan-tich-cong-van "{\"text\":\"$(head -c 30001 /dev/zero | tr '\0' a)\"}")

# ---- kiem-duyet: bắt buộc đăng nhập; đoàn viên 30, cán bộ 120 ----
KD='{"text":"Bài viết về hoạt động Đoàn"}'
expect "ai/kiem-duyet khách → 401" 401 $(call - /api/ai/kiem-duyet "$KD")
c=$(call t.dv1 /api/ai/kiem-duyet "$KD"); expect "ai/kiem-duyet t.dv1 qua chốt (200/502)" ok $(okcode $c)
for i in $(seq 2 30); do call t.dv1 /api/ai/kiem-duyet "$KD" >/dev/null; done
expect "ai/kiem-duyet t.dv1 lượt 31 → 429" 429 $(call t.dv1 /api/ai/kiem-duyet "$KD")
c=$(call t.donvi /api/ai/kiem-duyet "$KD"); expect "ai/kiem-duyet cán bộ (t.donvi) vẫn qua" ok $(okcode $c)

# ---- chat: khách được dùng, chung 30 lượt; đăng nhập 20 lượt/tài khoản; ≤500 ký tự ----
CH='{"message":"Học sinh 3 tốt là gì?"}'
expect "ai/chat quá 500 ký tự → 413" 413 $(call - /api/ai/chat "{\"message\":\"$(head -c 501 /dev/zero | tr '\0' a)\"}")
c=$(call - /api/ai/chat "$CH"); expect "ai/chat khách qua chốt (200/502)" ok $(okcode $c)
for i in $(seq 2 30); do call - /api/ai/chat "$CH" >/dev/null; done
expect "ai/chat khách lượt 31 (hạn mức chung) → 429" 429 $(call - /api/ai/chat "$CH")
echo "   429 body: $(cat $D/last.json)"
c=$(call t.dv2 /api/ai/chat "$CH"); expect "ai/chat đoàn viên đếm riêng vẫn qua" ok $(okcode $c)
for i in $(seq 2 20); do call t.dv2 /api/ai/chat "$CH" >/dev/null; done
expect "ai/chat t.dv2 lượt 21 → 429" 429 $(call t.dv2 /api/ai/chat "$CH")
echo; echo "$pass PASS, $fail FAIL"
