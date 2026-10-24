import {
  createHash,
  randomBytes,
  scrypt as scryptCb,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { query } from "@/lib/db";

/**
 * Xác thực bằng DB thật (bảng accounts + auth_sessions) — theo huong-dan-ket-noi-db.md.
 * - Mật khẩu băm scrypt (thư viện chuẩn Node, không thêm dependency):
 *   định dạng lưu `scrypt:16384:8:1:<salt-hex>:<key-hex>`.
 * - Phiên đăng nhập: token ngẫu nhiên 64 ký tự đặt vào cookie httpOnly,
 *   DB chỉ lưu SHA-256 của token (cột refresh_token_hash của auth_sessions).
 */

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>;

export const SESSION_COOKIE = "tnth_session";
const SESSION_TTL_DAYS = 30;
const LOCK_AFTER_FAILED = 5;
const LOCK_MINUTES = 15;

export type RoleCode =
  | "QUAN_TRI_TW"
  | "QUAN_TRI_TINH"
  | "QUAN_TRI_CAP3"
  | "DON_VI"
  | "BIEN_TAP_VIEN"
  | "DOAN_VIEN";

/** Bản ghi session trả về client — khớp interface Session của lib/auth-context.tsx */
export interface SessionDto {
  accountId: number;
  username: string;
  displayName: string;
  orgUnitId: number;
  orgUnitName: string;
  role: RoleCode;
  email: string;
  contactPerson: string;
  contactPosition: string;
  className?: string;
  /** Quyền cấp trên gán riêng (account_permissions) — có thì thay quyền mặc định theo vai trò */
  grantedPerms?: string[];
}

interface AccountRow {
  id: number;
  username: string;
  email: string;
  contact_person: string | null;
  contact_position: string | null;
  role_code: string | null;
  class_name: string | null;
  status: string;
  password_hash?: string;
  locked_until?: Date | null;
}

const ACCOUNT_COLUMNS = `a.id, a.username, a.email, a.contact_person, a.contact_position,
  a.role_code, a.class_name, a.status, o.name AS org_name`;

function dtoOf(row: AccountRow & { org_name: string; org_unit_id: number }): SessionDto {
  return {
    accountId: Number(row.id),
    username: row.username,
    displayName: row.username,
    orgUnitId: Number(row.org_unit_id),
    orgUnitName: row.org_name,
    role: (row.role_code as RoleCode) ?? "DON_VI",
    email: row.email,
    contactPerson: row.contact_person ?? row.username,
    contactPosition: row.contact_position ?? "",
    className: row.class_name ?? undefined,
  };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt:16384:8:1:${salt.toString("hex")}:${key.toString("hex")}`;
}

/** Quyền cấp trên gán riêng cho tài khoản (tick mục nào xem mục đó) */
export async function loadGrantedPerms(accountId: number): Promise<string[] | undefined> {
  const rows = await query<{ perm_code: string }>(
    "SELECT perm_code FROM account_permissions WHERE account_id = $1 ORDER BY perm_code",
    [accountId],
  );
  const perms = rows.map((r) => r.perm_code);
  return perms.length > 0 ? perms : undefined;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(":");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltHex, keyHex] = parts;
  try {
    const key = await scrypt(password, Buffer.from(saltHex, "hex"), keyHex.length / 2, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
    });
    const expected = Buffer.from(keyHex, "hex");
    return key.length === expected.length && timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

export type LoginResult =
  | { ok: true; accountId: number; session: SessionDto }
  | { ok: false; status: number; error: string };

/** Đăng nhập bằng username + password, có khoá tạm khi nhập sai liên tục. */
export async function loginAccount(
  username: string,
  password: string,
): Promise<LoginResult> {
  const rows = await query<AccountRow & { org_name: string; org_unit_id: number; locked_until: Date | null; failed_login_count: number }>(
    `SELECT a.id, a.org_unit_id, a.username, a.email, a.password_hash, a.status,
            a.locked_until, a.failed_login_count, a.contact_person, a.contact_position,
            a.role_code, a.class_name, o.name AS org_name
     FROM accounts a JOIN org_units o ON o.id = a.org_unit_id
     WHERE (lower(a.username) = lower($1) OR lower(a.email) = lower($1)) AND a.deleted_at IS NULL
     LIMIT 1`,
    [username],
  );
  const account = rows[0];
  if (!account) {
    return { ok: false, status: 401, error: "Tên đăng nhập hoặc mật khẩu không đúng." };
  }
  if (account.status === "PENDING") {
    return { ok: false, status: 403, error: "Tài khoản đang chờ quản trị kích hoạt." };
  }
  // Bỏ tính năng khóa tài khoản theo yêu cầu — tự động mở khóa nếu có
  if (account.status === "LOCKED") {
    await query("UPDATE accounts SET status = 'ACTIVE', failed_login_count = 0, locked_until = NULL WHERE id = $1", [account.id]);
    account.status = "ACTIVE";
  }
  if (account.status === "DISABLED") {
    return { ok: false, status: 403, error: "Tài khoản đã bị vô hiệu hoá. Vui lòng liên hệ quản trị viên." };
  }
  const good = await verifyPassword(password, account.password_hash ?? "");
  if (!good) {
    return { ok: false, status: 401, error: "Tên đăng nhập hoặc mật khẩu không đúng." };
  }
  await query(
    `UPDATE accounts SET last_login_at = now(), failed_login_count = 0,
       locked_until = NULL, status = 'ACTIVE'
     WHERE id = $1`,
    [account.id],
  );
  const session = dtoOf(account);
  session.grantedPerms = await loadGrantedPerms(account.id);
  return { ok: true, accountId: account.id, session };
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Tạo phiên mới, trả về token (đưa vào cookie httpOnly). */
export async function createSession(
  accountId: number,
  userAgent: string | null,
  ip: string | null,
): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await query(
    `INSERT INTO auth_sessions (account_id, refresh_token_hash, user_agent, ip_address, expires_at)
     VALUES ($1, $2, $3, $4::inet, now() + ($5 || ' days')::interval)`,
    [accountId, tokenHash(token), userAgent, ip, String(SESSION_TTL_DAYS)],
  );
  return token;
}

/** secure chỉ bật khi đi qua https (reverse proxy gắn x-forwarded-proto) —
 *  server triển khai http thuần phải giữ cookie hoạt động được. */
export function sessionCookieOptions(secure = false) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
    path: "/",
  };
}

/** Giải mã cookie → phiên hợp lệ còn hạn chưa bị thu hồi. */
export async function sessionFromToken(token: string): Promise<SessionDto | null> {
  const rows = await query<AccountRow & { org_name: string; org_unit_id: number }>(
    `SELECT ${ACCOUNT_COLUMNS}, a.org_unit_id
     FROM auth_sessions s
     JOIN accounts a ON a.id = s.account_id
     JOIN org_units o ON o.id = a.org_unit_id
     WHERE s.refresh_token_hash = $1 AND s.revoked_at IS NULL
       AND s.expires_at > now() AND a.deleted_at IS NULL AND a.status = 'ACTIVE'
     LIMIT 1`,
    [tokenHash(token)],
  );
  const row = rows[0];
  if (!row) return null;
  const session = dtoOf(row);
  session.grantedPerms = await loadGrantedPerms(session.accountId);
  return session;
}

export async function revokeSession(token: string): Promise<void> {
  await query(
    `UPDATE auth_sessions SET revoked_at = now(), updated_at = now()
     WHERE refresh_token_hash = $1 AND revoked_at IS NULL`,
    [tokenHash(token)],
  );
}
