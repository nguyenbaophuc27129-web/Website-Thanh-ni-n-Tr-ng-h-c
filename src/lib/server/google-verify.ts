/**
 * Xác thực Google ID token (Google Identity Services — nút "Đăng nhập bằng Google").
 * Chỉ đạo lãnh đạo 09/11/2026: bình chọn HS3T không cần đăng ký đoàn viên —
 * xác thực qua Gmail là đủ; 1 Gmail bình chọn 1 lần cho mỗi gương.
 *
 * Không cần secret: kiểm tra ID token qua endpoint tokeninfo chính thức của Google
 * (aud khớp GOOGLE_CLIENT_ID, email_verified, còn hạn).
 */

export interface GoogleUser {
  email: string;
  name?: string;
  sub: string;
}

const TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo?id_token=";

export function googleClientId(): string {
  return process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
}

export async function verifyGoogleCredential(credential: string): Promise<GoogleUser | null> {
  const clientId = googleClientId();
  if (!clientId) return null; // chưa cấu hình → không chấp nhận xác thực Google
  if (!credential || credential.length > 5000) return null;
  try {
    const res = await fetch(`${TOKENINFO_URL}${encodeURIComponent(credential)}`, {
      signal: AbortSignal.timeout(10_000),
      headers: { "User-Agent": "tnth-website" },
    });
    if (!res.ok) return null;
    const d = (await res.json()) as {
      aud?: string;
      email?: string;
      email_verified?: string | boolean;
      sub?: string;
      name?: string;
      exp?: string;
    };
    if (d.aud !== clientId) return null;
    if (!d.email || !d.sub) return null;
    if (!(d.email_verified === true || d.email_verified === "true")) return null;
    if (Number(d.exp ?? 0) * 1000 < Date.now()) return null;
    return { email: d.email.trim().toLowerCase(), name: d.name, sub: d.sub };
  } catch {
    return null;
  }
}
