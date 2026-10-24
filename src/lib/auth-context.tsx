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
  grantedPerms?: string[];
}

const AuthCtx = createContext<{
  session: Session | null;
  ready: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  loginAs: (account: DemoAccount) => void;
  logout: () => void;
  updateProfile: (patch: Partial<Session>) => void;
  refreshSession: () => Promise<void>;
}>({
  session: null,
  ready: false,
  login: async () => false,
  loginAs: () => {},
  logout: () => {},
  updateProfile: () => {},
  refreshSession: async () => {},
});

export function useAuth() {
  return useContext(AuthCtx);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data?.ok && data?.session) {
          setSession(data.session);
          return;
        }
      }
    } catch {
      // offline
    }
  }, []);

  useEffect(() => {
    // Dọn sạch toàn bộ key localStorage cũ nếu còn sót trong trình duyệt
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("tnth_demo_user");
        window.localStorage.removeItem("tnth_demo_created_accounts");
      } catch {}
    }

    // Đọc phiên đăng nhập thực tế từ PostgreSQL DB qua cookie session
    let mounted = true;
    fetch("/api/auth/session")
      .then(async (res) => {
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data?.ok && data?.session) {
            setSession(data.session);
            setReady(true);
            return;
          }
        }
        setSession(null);
        setReady(true);
      })
      .catch(() => {
        if (mounted) {
          setSession(null);
          setReady(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

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
          setSession(data.session);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    []
  );

  const loginAs = useCallback(
    (acc: DemoAccount) => {
      setSession({
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
      });
    },
    []
  );

  const updateProfile = useCallback((patch: Partial<Session>) => {
    setSession((prev) => (prev ? { ...prev, ...patch } : null));
  }, []);

  const logout = useCallback(() => {
    // Thu hồi phiên phía DB
    void fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    setSession(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ session, ready, login, loginAs, logout, updateProfile, refreshSession }}>
      {children}
    </AuthCtx.Provider>
  );
}
