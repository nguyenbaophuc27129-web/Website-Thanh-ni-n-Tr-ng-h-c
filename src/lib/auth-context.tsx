"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { loadCreatedAccounts } from "@/lib/created-accounts";

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
  password: string;
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
    password: "demo123",
    displayName: "tw.admin",
    orgUnitId: 1,
    orgUnitName: "Ban Thanh niên Trường học — TW Đoàn",
    role: "QUAN_TRI_TW",
    email: "tnth@doanthanhnienvn.vn",
    contactPerson: "Nguyễn Văn Toàn",
    contactPosition: "Phó Ban Thanh niên Trường học",
  },
  {
    id: 2,
    username: "bd.province",
    password: "demo123",
    displayName: "bd.province",
    orgUnitId: 12,
    orgUnitName: "Tỉnh Đoàn Bình Dương",
    role: "QUAN_TRI_TINH",
    email: "bandoan@binhduong.doan.vn",
    contactPerson: "Trần Thị Mai",
    contactPosition: "Phó Bí thư Tỉnh Đoàn",
  },
  {
    id: 3,
    username: "hc.hiepthanh",
    password: "demo123",
    displayName: "hc.hiepthanh",
    orgUnitId: 25,
    orgUnitName: "Đoàn Phường Hiệp Thành",
    role: "QUAN_TRI_CAP3",
    email: "hiepthanh@bd.doan.vn",
    contactPerson: "Lê Quốc Hùng",
    contactPosition: "Bí thư Đoàn Phường",
  },
  {
    id: 4,
    username: "thpt.chanhphu",
    password: "demo123",
    displayName: "thpt.chanhphu",
    orgUnitId: 31,
    orgUnitName: "Đoàn Trường THPT Chánh Phú Hưng",
    role: "DON_VI",
    email: "thptchanhphuhung@bd.edu.vn",
    contactPerson: "Phạm Minh Tuấn",
    contactPosition: "Bí thư Đoàn Trường",
  },
  {
    id: 5,
    username: "btv.tw",
    password: "demo123",
    displayName: "btv.tw",
    orgUnitId: 2,
    orgUnitName: "Ban Biên tập Cổng TNTH — TW Đoàn",
    role: "BIEN_TAP_VIEN",
    email: "bientap@tnth.vn",
    contactPerson: "Võ Ngọc Lan",
    contactPosition: "Phóng viên biên tập",
  },
  {
    id: 6,
    username: "dv.demo",
    password: "demo123",
    displayName: "dv.demo",
    orgUnitId: 31,
    orgUnitName: "Đoàn Trường THPT Chánh Phú Hưng",
    role: "DOAN_VIEN",
    email: "doanvien@thptchanhphu.edu.vn",
    contactPerson: "dv.demo",
    contactPosition: "Ủy viên Ban Chấp hành Chi Đoàn",
    className: "12A1",
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
  login: (username: string, password: string) => boolean;
  loginAs: (account: DemoAccount) => void;
  logout: () => void;
}>({
  session: null,
  ready: false,
  login: () => false,
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
    (username: string, password: string) => {
      const uname = username.trim().toLowerCase();
      const acc = DEMO_ACCOUNTS.find((a) => a.username.toLowerCase() === uname);
      if (acc) {
        if (acc.password !== password) return false;
        persist(toSession(acc));
        return true;
      }
      // Tài khoản do quản trị tạo từ trang Hệ thống (kể cả nhập từ file)
      const created = loadCreatedAccounts().find((a) => a.username.toLowerCase() === uname);
      if (!created || created.password !== password || created.status !== "ACTIVE") return false;
      persist(toSession(created));
      return true;
    },
    [persist, toSession]
  );

  const loginAs = useCallback(
    (acc: DemoAccount) => {
      persist(toSession(acc));
    },
    [persist, toSession]
  );

  const logout = useCallback(() => persist(null), [persist]);

  return (
    <AuthCtx.Provider value={{ session, ready, login, loginAs, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}
