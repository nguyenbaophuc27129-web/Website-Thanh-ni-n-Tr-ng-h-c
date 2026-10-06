/* ══════════════════════════════════════════════════════════════════════
   ⭐ BỘ GỌI AI DÙNG CHUNG cho cả 5 API (kiem-duyet / chat / xet-hs3t /
   phan-tich-cong-van / nhap-bao-cao) — hỗ trợ 2 nhà cung cấp:

   1. GEMINI (FREE — Google AI Studio, không cần thẻ):
      .env.local:  AI_PROVIDER=gemini
                   GEMINI_API_KEY=...        (tạo tại aistudio.google.com/apikey)
      Model mặc định: gemini-2.5-flash (có hạn mức free mỗi ngày)

   2. CLAUDE (Anthropic — trả phí, nạp trước):
      .env.local:  AI_PROVIDER=claude
                   ANTHROPIC_API_KEY=...     (tạo tại console.anthropic.com)
      Model mặc định: claude-haiku-4-5-20251001 (rẻ nhất, rất nhanh)

   → Chuyển nhà cung cấp = đổi DUY NHẤT dòng AI_PROVIDER, không sửa code.
   → AI_MODEL=<tên model> trong .env.local nếu muốn ép model khác.
   → Thiếu key / gọi lỗi → hàm throw → từng route tự rơi về fallback quy tắc.
   ══════════════════════════════════════════════════════════════════════ */

export interface AiCallOptions {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AiCallResult {
  text: string;
  model: string;
}

function currentProvider(): "gemini" | "claude" {
  return (process.env.AI_PROVIDER ?? "gemini").trim().toLowerCase() === "claude"
    ? "claude"
    : "gemini";
}

/** Route dùng để chọn thông báo lỗi thân thiện khi chưa cấu hình key. */
export function aiConfigError(): string | null {
  const provider = currentProvider();
  if (provider === "claude" && !process.env.ANTHROPIC_API_KEY) {
    return 'Chưa cấu hình AI: thêm ANTHROPIC_API_KEY vào .env.local (hoặc đổi AI_PROVIDER=gemini để dùng hạn mức miễn phí).';
  }
  if (provider === "gemini" && !process.env.GEMINI_API_KEY) {
    return 'Chưa cấu hình AI: thêm GEMINI_API_KEY vào .env.local (tạo key miễn phí tại aistudio.google.com/apikey).';
  }
  return null;
}

export async function callAI(options: AiCallOptions): Promise<AiCallResult> {
  const configError = aiConfigError();
  if (configError) throw new Error(configError);

  const provider = currentProvider();
  const overrideModel = process.env.AI_MODEL?.trim();

  if (provider === "claude") {
    const model = overrideModel ?? "claude-haiku-4-5-20251001";
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: options.maxTokens ?? 512,
        temperature: options.temperature ?? 0.3,
        system: options.system,
        messages: [{ role: "user", content: options.user }],
      }),
    });
    if (!res.ok) throw new Error(`Claude HTTP ${res.status}`);
    const data = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>;
      model?: string;
    };
    const text = (data.content?.find((b) => b.type === "text")?.text ?? "").trim();
    if (!text) throw new Error("Claude trả về nội dung rỗng");
    return { text, model: data.model ?? model };
  }

  // ---- GEMINI (mặc định) ----
  const model = overrideModel ?? "gemini-2.5-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY ?? "",
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: options.system }] },
        contents: [{ role: "user", parts: [{ text: options.user }] }],
        generationConfig: {
          temperature: options.temperature ?? 0.3,
          maxOutputTokens: options.maxTokens ?? 512,
          // Tắt "suy nghĩ" nội bộ để trả lời nhanh + không ăn mất hạn mức output
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    modelVersion?: string;
  };
  const text = (data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "").trim();
  if (!text) throw new Error("Gemini trả về nội dung rỗng (có thể do bộ lọc an toàn hoặc hết hạn mức free trong ngày)");
  return { text, model: data.modelVersion ?? model };
}
