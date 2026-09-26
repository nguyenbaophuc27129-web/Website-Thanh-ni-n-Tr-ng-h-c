import type { Account } from "@/types";
import type { Role } from "@/lib/auth-context";

/**
 * Tài khoản được tạo từ trang Hệ thống → Tài khoản (kể cả nhập từ file).
 * Lưu localStorage để tài khoản mới có thể đăng nhập như 5 tài khoản demo.
 */
export interface CreatedAccountRecord {
  id: number;
  orgUnitId: number;
  username: string;
  email: string;
  contactPerson: string;
  contactPosition: string;
  role: Role;
  status: Account["status"];
  password: string;
  displayName: string;
  orgUnitName: string;
}

export const CREATED_ACCOUNTS_KEY = "tnth_demo_created_accounts";

export function loadCreatedAccounts(): CreatedAccountRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CREATED_ACCOUNTS_KEY);
    const list = raw ? (JSON.parse(raw) as CreatedAccountRecord[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function appendCreatedAccount(rec: CreatedAccountRecord): void {
  if (typeof window === "undefined") return;
  const list = loadCreatedAccounts();
  list.push(rec);
  window.localStorage.setItem(CREATED_ACCOUNTS_KEY, JSON.stringify(list));
}
