#!/usr/bin/env bash
# Tải 1 tệp PDF ~20MB vào phân hệ van-ban (kiểm tra máy chủ nhận > 4MB)
T=${TNTH_TEST_DIR:-/var/tmp/tnth-kiem-thu}/e-test
PW=$(cat ${TNTH_TEST_DIR:-/var/tmp/tnth-kiem-thu}/test-password.txt)
curl -s -c $T/jar/t.tw -o /dev/null -H 'Content-Type: application/json' -X POST http://127.0.0.1:3105/api/auth/login --data "{\"username\":\"t.tw\",\"password\":\"$PW\"}"
{ printf '%%PDF-1.4\n'; head -c 20000000 /dev/urandom; } > $T/big.pdf
curl -s -b $T/jar/t.tw -F kind=van-ban -F "file=@$T/big.pdf;type=application/pdf" http://127.0.0.1:3105/api/uploads
echo
rm -f $T/big.pdf
