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
  /**
   * Ép đầu ra JSON đúng schema (structured output):
   * - Gemini: generationConfig.responseMimeType = "application/json" + responseSchema (jsonSchema).
   * - Claude: chèn mô tả schema vào system prompt (Claude không có JSON mode riêng).
   * Route JSON nên luôn bật cờ này để đầu ra không bao giờ lệch schema đã thống nhất.
   */
  json?: boolean;
  /** Schema dạng OpenAPI rút gọn (type/properties/required/enum/items) — dùng kèm json: true. */
  jsonSchema?: Record<string, unknown>;
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
    // Claude không có JSON mode riêng → khoá schema bằng chính system prompt
    const system = options.json
      ? options.system +
        (options.jsonSchema
          ? `\n[FORMAT BẮT BUỘC] Trả về DUY NHẤT một JSON hợp lệ, không markdown, không chữ nào ngoài JSON. Cấu trúc chính xác: ${JSON.stringify(options.jsonSchema)}`
          : "\n[FORMAT BẮT BUỘC] Trả về DUY NHẤT một JSON hợp lệ, không markdown, không chữ nào ngoài JSON.")
      : options.system;
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
        system,
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
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("Chưa cấu hình GEMINI_API_KEY trong .env.local trên máy chủ.");
  }

  const candidateModels = overrideModel
    ? [overrideModel]
    : ["gemini-flash-lite-latest", "gemini-flash-latest", "gemini-2.5-flash"];

  let lastError: Error | null = null;
  for (const model of candidateModels) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: options.system }] },
            contents: [{ role: "user", parts: [{ text: options.user }] }],
            generationConfig: {
              temperature: options.temperature ?? 0.3,
              maxOutputTokens: options.maxTokens ?? 1024,
              // Family 2.5 bật thinking mặc định — thinking nuốt maxOutputTokens
              // → trả rỗng. Tác vụ hệ thống đều kiểu phân lớp/văn luật nên tắt hẳn.
              thinkingConfig: { thinkingBudget: 0 },
              // JSON mode: khoá đầu ra đúng schema thay vì chỉ dựa vào prompt
              ...(options.json
                ? {
                    responseMimeType: "application/json",
                    ...(options.jsonSchema ? { responseSchema: options.jsonSchema } : {}),
                  }
                : {}),
            },
          }),
        }
      );

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.error?.message ?? `HTTP ${res.status}`;
        // Nếu lỗi quá tải 429 hoặc model hết hạn 404, thử model tiếp theo trong danh sách
        if ((res.status === 429 || res.status === 404 || res.status === 503) && candidateModels.length > 1) {
          console.warn(`[TNTH][AI] Model ${model} gặp lỗi (${errMsg}), chuyển sang model dự phòng...`);
          lastError = new Error(`Gemini (${model}): ${errMsg}`);
          continue;
        }
        throw new Error(`Gemini HTTP ${res.status}: ${errMsg}`);
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        modelVersion?: string;
      };
      const text = (data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "").trim();
      if (!text) {
        throw new Error("Gemini trả về nội dung rỗng (có thể do bộ lọc an toàn)");
      }
      return { text, model: data.modelVersion ?? model };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Nếu còn model trong danh sách, thử tiếp
      if (model !== candidateModels[candidateModels.length - 1]) {
        continue;
      }
    }
  }

  throw lastError ?? new Error("Tất cả các model Gemini đều không khả dụng.");
}
