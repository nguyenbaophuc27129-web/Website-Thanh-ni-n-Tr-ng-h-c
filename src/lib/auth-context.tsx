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
  {
    id: 2,
    username: "bd.province",
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
    displayName: "btv.tw",
    orgUnitId: 2,
    orgUnitName: "Ban Biên tập Cổng TNTH — TW Đoàn",
    role: "BIEN_TAP_VIEN",
    email: "bientap@tnth.vn",
    contactPerson: "Võ Ngọc Lan",
    contactPosition: "Phóng viên biên tập",
  },

  /* Chức danh TW quyền giới hạn — demo phân quyền theo chức danh (xem data/chuc-danh-quyen.ts) */
  {
    id: 16,
    username: "cv.hs3t",
    displayName: "cv.hs3t",
    orgUnitId: 1,
    orgUnitName: "Ban Công tác Thanh Thiếu Nhi — TW Đoàn",
    role: "QUAN_TRI_TW",
    email: "hs3t@tnth.vn",
    contactPerson: "Trần Thị Thu Hà",
    contactPosition: "Chuyên viên phụ trách xét hồ sơ Học sinh 3 tốt",
  },
  {
    id: 17,
    username: "cv.kiemtra",
    displayName: "cv.kiemtra",
    orgUnitId: 1,
    orgUnitName: "Ban Công tác Thanh Thiếu Nhi — TW Đoàn",
    role: "QUAN_TRI_TW",
    email: "kiemtra@tnth.vn",
    contactPerson: "Lê Minh Đức",
    contactPosition: "Chuyên viên phụ trách công tác kiểm tra",
  },
  {
    id: 18,
    username: "ctv.tintuc",
    displayName: "ctv.tintuc",
    orgUnitId: 1,
    orgUnitName: "Ban Công tác Thanh Thiếu Nhi — TW Đoàn",
    role: "QUAN_TRI_TW",
    email: "tintuc@tnth.vn",
    contactPerson: "Nguyễn Hải Yến",
    contactPosition: "CTV phụ trách chuyên mục Tin tức",
  },
  {
    id: 19,
    username: "ctv.duan",
    displayName: "ctv.duan",
    orgUnitId: 1,
    orgUnitName: "Ban Công tác Thanh Thiếu Nhi — TW Đoàn",
    role: "QUAN_TRI_TW",
    email: "duan@tnth.vn",
    contactPerson: "Phạm Đức Anh",
    contactPosition: 'CTV phụ trách chuyên mục "Mỗi trường THPT 01 dự án tình nguyện vì cộng đồng"',
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
