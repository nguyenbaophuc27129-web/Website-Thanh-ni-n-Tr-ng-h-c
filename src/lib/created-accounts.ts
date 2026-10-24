import type { Account } from "@/types";
import type { Role } from "@/lib/auth-context";

export interface CreatedAccountRecord {
  id: number;
  orgUnitId: number;
  username: string;
  email: string;
  contactPerson: string;
  contactPosition: string;
  className?: string;
  role: Role;
  status: Account["status"];
  password: string;
  displayName: string;
  orgUnitName: string;
}

export const CREATED_ACCOUNTS_KEY = "tnth_demo_created_accounts";

/**
 * Xóa sạch toàn bộ tài khoản ảo đã lưu trong localStorage của trình duyệt,
 * chỉ giữ lại dữ liệu tài khoản thật từ hệ thống / database.
 */
export function loadCreatedAccounts(): CreatedAccountRecord[] {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(CREATED_ACCOUNTS_KEY);
    } catch {
      // ignore
    }
  }
  return [];
}

export function appendCreatedAccount(_rec: CreatedAccountRecord): void {
  // Không lưu tài khoản ảo vào localStorage nữa
}
