/**
 * Gọi API ghi riêng của cổng công khai (phản ánh, điểm danh, thi trực tuyến) từ trình duyệt.
 * Kết quả luôn là { ok: true, ...data } hoặc { ok: false, error } — không ném lỗi,
 * mất mạng / máy chủ lỗi cũng trả thông báo tiếng Việt để giao diện hiện toast.
 */

export type ApiResult<T> = ({ ok: true } & T) | { ok: false; error: string; status?: number };

export async function callPublicApi<T>(
  url: string,
  body?: unknown,
  method: "GET" | "POST" = body === undefined ? "GET" : "POST",
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as ({ ok?: boolean; error?: string } & T) | null;
    if (!res.ok || !data?.ok) {
      return {
        ok: false,
        status: res.status,
        error: data?.error || `Máy chủ không xử lý được yêu cầu (HTTP ${res.status}).`,
      };
    }
    return { ...data, ok: true } as ApiResult<T>;
  } catch {
    return { ok: false, error: "Không kết nối được máy chủ — vui lòng kiểm tra mạng và thử lại." };
  }
}
