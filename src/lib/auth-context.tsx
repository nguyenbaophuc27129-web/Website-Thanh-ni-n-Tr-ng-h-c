"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Role =
  | "QUAN_TRI_TW"
  | "QUAN_TRI_TINH"
  | "QUAN_TRI_CAP3"
  | "DON_VI"
  | "BIEN_TAP_VIEN"
  | "DOAN_VIEN";

export const ROLE_LABELS: Record<Role, string> = {
  QUAN_TRI_TW: "Quản trị Trung ương",
  QUAN_TRI_TINH: "Quản trị cấp Tỉnh/Tw",
  QUAN_TRI_CAP3: "Quản trị cấp 3",
  DON_VI: "Đơn vị cơ sở",
  BIEN_TAP_VIEN: "Biên tập viên",
  DOAN_VIEN: "Đoàn viên",
};

export interface DemoAccount {
  id: number;
  username: string;
  displayName: string;
  orgUnitId: number;
  orgUnitName: string;
  role: Role;
  email: string;
  contactPerson: string;
  contactPosition: string;
  /** Lớp của học sinh / đoàn viên (đăng ký từ trang Đăng ký) */
  className?: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 1,
    username: "tw.admin",
    displayName: "tw.admin",
    orgUnitId: 1,
    orgUnitName: "Ban Công tác Thanh Thiếu Nhi — TW Đoàn",
    role: "QUAN_TRI_TW",
    email: "tnth@doanthanhnienvn.vn",
    contactPerson: "Nguyễn Văn Toàn",
    contactPosition: "Phó Trưởng Ban Công tác Thanh Thiếu Nhi",
  },
];

export interface Session {
  accountId: number;
  username: string;
  displayName: string;
  orgUnitId: number;
  orgUnitName: string;
  role: Role;
  email: string;
  contactPerson: string;
  contactPosition: string;
  className?: string;
}

const AuthCtx = createContext<{
  session: Session | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  loginAs: (account: DemoAccount) => void;
  logout: () => void;
}>({
  session: null,
  ready: false,
  login: async () => false,
  loginAs: () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthCtx);
}

const STORAGE_KEY = "tnth_demo_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch {
      // ignore corrupted storage
    }
    setReady(true);
  }, []);

  const persist = useCallback((s: Session | null) => {
    setSession(s);
    if (s) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const toSession = useCallback(
    (acc: DemoAccount): Session => ({
      accountId: acc.id,
      username: acc.username,
      displayName: acc.displayName,
      orgUnitId: acc.orgUnitId,
      orgUnitName: acc.orgUnitName,
      role: acc.role,
      email: acc.email,
      contactPerson: acc.contactPerson,
      contactPosition: acc.contactPosition,
      className: acc.className,
    }),
    []
  );

  const login = useCallback(
    async (username: string, password: string) => {
      const uname = username.trim().toLowerCase();
      try {
        const r = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: uname, password }),
        });
        if (r.ok) {
          const data = (await r.json()) as { session: Session };
          persist(data.session);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [persist]
  );

  const loginAs = useCallback(
    (acc: DemoAccount) => {
      persist(toSession(acc));
    },
    [persist, toSession]
  );

  const logout = useCallback(() => {
    // Thu hồi phiên phía DB (bỏ qua lỗi — cookie/localStorage vẫn xoá)
    void fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    persist(null);
  }, [persist]);

  return (
    <AuthCtx.Provider value={{ session, ready, login, loginAs, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
