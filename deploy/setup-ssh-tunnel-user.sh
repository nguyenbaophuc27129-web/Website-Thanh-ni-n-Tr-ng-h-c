#!/usr/bin/env bash
# Tạo tài khoản Linux "tnth-tunnel" CHỈ dùng để mở SSH tunnel tới PostgreSQL (127.0.0.1:5432):
# không shell, không mật khẩu, không chuyển tiếp được tới cổng nào khác. Chạy bằng root, 1 lần.
# Thêm khóa công khai của coder:  deploy/setup-ssh-tunnel-user.sh "ssh-ed25519 AAAA... ten-coder"
# Thu hồi quyền của coder:        xóa dòng khóa trong /home/tnth-tunnel/.ssh/authorized_keys
set -euo pipefail

user=tnth-tunnel
keys=/home/$user/.ssh/authorized_keys

id "$user" >/dev/null 2>&1 || useradd --create-home --shell /usr/sbin/nologin --comment "Chi SSH tunnel toi PostgreSQL" "$user"
passwd -l "$user" >/dev/null
install -d -m 700 -o "$user" -g "$user" "/home/$user/.ssh"
[[ -f "$keys" ]] || install -m 600 -o "$user" -g "$user" /dev/null "$keys"

if ! grep -q "^Match User $user" /etc/ssh/sshd_config; then
  cp -a /etc/ssh/sshd_config "/etc/ssh/sshd_config.bak-$(date +%Y%m%d%H%M%S)"
  cat >> /etc/ssh/sshd_config <<CONF

# TNTH: tài khoản chỉ dùng để mở SSH tunnel tới PostgreSQL — không shell, không mật khẩu
Match User $user
    PasswordAuthentication no
    KbdInteractiveAuthentication no
    AllowTcpForwarding local
    PermitOpen 127.0.0.1:5432
    PermitListen none
    PermitTTY no
    X11Forwarding no
    AllowAgentForwarding no
    PermitTunnel no
    ForceCommand /usr/sbin/nologin
CONF
  # Cấu hình sai thì dừng tại đây, KHÔNG nạp lại sshd (phiên SSH đang mở không bị ảnh hưởng)
  sshd -t
  systemctl reload ssh
  echo "Đã thêm khối Match User $user vào /etc/ssh/sshd_config và nạp lại sshd."
fi

if [[ -n "${1:-}" ]]; then
  key=$1
  [[ "$key" =~ ^(ssh-ed25519|ssh-rsa|ecdsa-sha2-nistp[0-9]+|sk-ssh-ed25519@openssh\.com)\ [A-Za-z0-9+/=]+ ]] \
    || { echo "Không giống khóa công khai SSH (phải bắt đầu bằng ssh-ed25519 / ssh-rsa ...)."; exit 1; }
  grep -qxF "$key" "$keys" || echo "$key" >> "$keys"
  echo "Đã thêm khóa. Số khóa đang được phép: $(grep -c . "$keys")"
else
  echo "Chưa thêm khóa nào. Chạy lại kèm khóa công khai của coder trong dấu ngoặc kép."
fi
