"use client";

import React, { useMemo } from "react";
import { Trophy, Medal, Award, Sparkles, Star } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Component hiển thị nội dung thành tích & câu chuyện phấn đấu của học sinh
 * Tự động nhận diện tiêu đề mục (1., 2., a., b., ##, ###) và in đậm, phân cấp rõ ràng
 * Hỗ trợ in đậm **...**, in nghiêng *...*, danh sách gạch đầu dòng, liên kết.
 */

export interface AchievementItem {
  title: string;
  level?: string;
  icon?: "trophy" | "medal" | "award" | "star";
}

/** Loop parse từng dòng thành tích → ô vàng (dùng chung cho văn bản tách trong story lẫn ô riêng) */
function parseAchievementLines(contentLines: string[]): AchievementItem[] {
  const items: AchievementItem[] = [];
  for (const rawLine of contentLines) {
    const line = rawLine.trim();
    if (!line) continue;
    // Bỏ ký tự đầu dòng: - • + * hoặc số thứ tự
    const cleaned = line
      .replace(/^[-•+*]\s*/, "")
      .replace(/^[0-9]+\.[0-9]*\s*/, "")
      .trim();
    if (!cleaned) continue;

    let title = cleaned;
    let level: string | undefined;

    const parenMatch = cleaned.match(/^(.*?)\s*[\(\[]([^()\[\]]+)[\)\]]$/);
    if (parenMatch) {
      title = parenMatch[1].trim();
      level = parenMatch[2].trim();
    } else if (/\s+cấp\s+(trung ương|tỉnh|thành phố|thành đoàn|quận|huyện|xã|phường|cơ sở|trường|[a-z0-9\s]+)$/i.test(cleaned)) {
      const parts = cleaned.split(/\s+cấp\s+/i);
      if (parts.length === 2 && parts[0].length > 3) {
        title = parts[0].trim();
        level = `Cấp ${parts[1].trim()}`;
      }
    } else if (/\s+năm\s+\d{4}/i.test(cleaned)) {
      const yearMatch = cleaned.match(/^(.*?)\s+năm\s+(\d{4}(?:-\d{4})?)(.*)$/i);
      if (yearMatch && yearMatch[1].length > 3) {
        title = yearMatch[1].trim();
        level = `Năm ${yearMatch[2]}${yearMatch[3] ? " " + yearMatch[3].trim() : ""}`;
      }
    }

    items.push({
      title,
      level,
      icon: items.length === 0 ? "trophy" : items.length === 1 ? "medal" : "award",
    });
  }
  return items;
}

/** Parse ô "Thành tích nổi bật" nhập RIÊNG (cột achievements) → danh sách ô vàng */
export function parseAchievementsText(text: string): AchievementItem[] {
  if (!text?.trim()) return [];
  // Bỏ các dòng tiêu đề mục (2., II., ## Thành tích…) — chỉ giữ dòng nội dung
  const contentLines = text
    .split("\n")
    .filter((l) => {
      const line = l.trim();
      if (!line) return false;
      if (/^(?:[0-9]+\.|[IVXLCDM]+\.)\s+/i.test(line)) return false;
      if (/^#{2,3}\s+/i.test(line)) return false;
      return true;
    });
  return parseAchievementLines(contentLines);
}

/** Tách văn bản bài thi thành: Quá trình phấn đấu & Danh sách thành tích nổi bật */
export function parseStoryAndAchievements(rawStory: string): {
  striveText: string;
  achievements: AchievementItem[];
} {
  if (!rawStory) {
    return { striveText: "", achievements: [] };
  }

  // Tìm vị trí bắt đầu của mục Thành tích (ví dụ "2. Thành tích", "II. Thành tích", "## Thành tích", "Thành tích nổi bật")
  const splitRegex = /\n(?=(?:2\.|II\.|##\s*Thành tích|###\s*Thành tích|Thành tích nổi bật|Thành tích đạt được|Các giải thưởng))/i;
  const match = rawStory.match(splitRegex);

  let striveText = rawStory;
  let achieveText = "";

  if (match && match.index !== undefined) {
    striveText = rawStory.slice(0, match.index).trim();
    achieveText = rawStory.slice(match.index).trim();
  }

  const items: AchievementItem[] = [];

  if (achieveText) {
    const lines = achieveText.split("\n");
    // Bỏ dòng tiêu đề (ví dụ "2. Thành tích nổi bật đạt được:")
    const contentLines = lines.slice(1);
    items.push(...parseAchievementLines(contentLines));
  }

  // Nếu trong story chưa có mục 2 riêng biệt, tự động trích xuất các danh hiệu trong văn bản
  if (items.length === 0) {
    // 1. Tìm các danh hiệu trong ngoặc kép
    const quoteMatches = Array.from(rawStory.matchAll(/"([^"]{8,120})"/g));
    for (const qm of quoteMatches) {
      if (items.length < 5) {
        items.push({
          title: qm[1],
          level: "Thành tích vinh danh",
          icon: items.length === 0 ? "trophy" : "medal",
        });
      }
    }

    // 2. Trích xuất theo từ khóa danh hiệu, giải thưởng phổ biến của học sinh
    if (items.length === 0) {
      const kwRegex = /(?:đoạt|đạt|nhận|tặng)?\s*(giải\s+(?:nhất|nhì|ba|khuyến khích|đặc biệt)[^.,;\n]{3,60}|huy chương\s+(?:vàng|bạc|đồng)[^.,;\n]{3,60}|học sinh 3 tốt[^.,;\n]{3,60}|thanh niên tiên tiến[^.,;\n]{3,60}|bằng khen[^.,;\n]{3,60}|học sinh tiêu biểu[^.,;\n]{3,60})/gi;
      const kwMatches = Array.from(rawStory.matchAll(kwRegex));
      for (const km of kwMatches) {
        if (items.length < 5) {
          const title = km[1].trim().toUpperCase();
          if (!items.some((it) => it.title === title)) {
            items.push({
              title,
              level: "Thành tích vinh danh",
              icon: items.length === 0 ? "trophy" : items.length === 1 ? "medal" : "award",
            });
          }
        }
      }
    }
  }

  return { striveText, achievements: items };
}

function renderInlineText(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const tokenRegex = /(\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      parts.push(
        <strong key={`b-${match.index}`} className="font-bold text-stone-900">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      parts.push(
        <em key={`i-${match.index}`} className="italic text-stone-800">
          {match[3]}
        </em>
      );
    } else if (match[4] && match[5]) {
      parts.push(
        <a
          key={`a-${match.index}`}
          href={match[5]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-blue-600 underline hover:text-blue-800"
        >
          {match[4]}
        </a>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

export function StoryContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const elements = useMemo(() => {
    if (!content) return null;
    const lines = content.split("\n");

    return lines.map((rawLine, idx) => {
      const line = rawLine.trim();

      // Dòng trống
      if (!line) {
        return <div key={idx} className="h-2" />;
      }

      // Tiêu đề markdown: ## hoặc ###
      if (line.startsWith("## ")) {
        return (
          <h3
            key={idx}
            className="mt-4 mb-1.5 font-serif-display text-base sm:text-lg font-black text-[#C81E1E] border-l-3 border-[#C81E1E] pl-2"
          >
            {renderInlineText(line.slice(3))}
          </h3>
        );
      }
      if (line.startsWith("### ")) {
        return (
          <h4
            key={idx}
            className="mt-3.5 mb-1 font-bold text-sm sm:text-base text-stone-900"
          >
            {renderInlineText(line.slice(4))}
          </h4>
        );
      }

      // Tiêu đề số mục lớn: 1. Quá trình phấn đấu..., 2. Thành tích nổi bật... hoặc I., II., III.
      const mainSectionMatch = line.match(/^([0-9]+\.|\b[IVXLCDM]+\.)\s+(.+)$/i);
      if (mainSectionMatch) {
        return (
          <h4
            key={idx}
            className="mt-4 mb-1.5 font-bold text-stone-900 text-sm sm:text-[15px] flex items-baseline gap-1"
          >
            <span className="text-[#C81E1E] font-black">{mainSectionMatch[1]}</span>
            <span>{renderInlineText(mainSectionMatch[2])}</span>
          </h4>
        );
      }

      // Tiêu đề tiểu mục: a. Bản lĩnh..., b. Thành tích học tập..., c. ...
      const subSectionMatch = line.match(/^([a-z]\.|\b[a-z]\))\s+(.+)$/i);
      if (subSectionMatch) {
        return (
          <h5
            key={idx}
            className="mt-3 mb-1 font-bold text-stone-800 text-xs sm:text-sm pl-1.5 flex items-baseline gap-1"
          >
            <span className="text-[#E04A1F] font-bold">{subSectionMatch[1]}</span>
            <span>{renderInlineText(subSectionMatch[2])}</span>
          </h5>
        );
      }

      // Gạch đầu dòng: - hoặc • hoặc +
      if (line.startsWith("- ") || line.startsWith("• ") || line.startsWith("+ ")) {
        return (
          <div key={idx} className="my-1 flex items-start gap-2 pl-3 text-xs sm:text-sm text-stone-700 leading-relaxed">
            <span className="text-[#E04A1F] select-none font-bold mt-0.5">•</span>
            <div className="flex-1">{renderInlineText(line.slice(2))}</div>
          </div>
        );
      }

      // Dòng văn bản bình thường (nếu có in đậm trong dòng sẽ được tô đậm)
      return (
        <p
          key={idx}
          className="my-1.5 text-xs sm:text-sm leading-relaxed text-stone-700 text-justify"
        >
          {renderInlineText(line)}
        </p>
      );
    });
  }, [content]);

  return <div className={cn("space-y-0.5", className)}>{elements}</div>;
}

/** CỘT MÀU VÀNG CHỨA CÁC Ô VÀNG VINH DANH CÁC THÀNH TÍCH NỔI BẬT */
export function GoldenAchievementColumn({
  achievements,
  studentName,
  className,
}: {
  achievements: AchievementItem[];
  studentName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl bg-gradient-to-b from-[#FFFBEB] via-[#FEF3C7]/70 to-[#FDE68A]/50 p-4 border-2 border-amber-300 shadow-md",
        className
      )}
    >
      {/* Tiêu đề cột màu vàng — Cố định trên đỉnh cột */}
      <div className="sticky top-0 -mt-1 pt-1 pb-3 mb-3 bg-[#FFFBEB]/95 backdrop-blur-xs border-b border-amber-200 flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-amber-950 shadow-xs ring-1 ring-amber-300/80">
            <Trophy className="h-4.5 w-4.5" />
          </div>
          <div>
            <h4 className="font-serif-display text-xs sm:text-sm font-black uppercase tracking-wider text-amber-950">
              Thành tích nổi bật
            </h4>
            <p className="text-[10px] text-amber-800/90 font-medium">Bảng vàng vinh danh tiêu biểu</p>
          </div>
        </div>
        <span className="rounded-full bg-amber-200/90 px-2.5 py-0.5 text-[10.5px] font-black text-amber-950 border border-amber-300/80 shadow-2xs">
          {achievements.length} vinh danh
        </span>
      </div>

      {/* Danh sách các ô vàng vinh danh các thành tích nổi bật */}
      <div className="space-y-2.5">
        {achievements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-amber-300 bg-white/70 p-5 text-center">
            <Sparkles className="mx-auto h-6 w-6 text-amber-500 mb-1.5" />
            <p className="text-xs text-amber-900/90 font-semibold">
              Đang cập nhật các thành tích vinh danh...
            </p>
          </div>
        ) : (
          achievements.map((item, idx) => (
            <div
              key={idx}
              className="group relative overflow-hidden rounded-xl border-2 border-amber-300/90 bg-gradient-to-br from-white via-amber-50/90 to-yellow-100/80 p-3.5 shadow-xs transition-all hover:border-amber-400 hover:shadow-md hover:-translate-y-0.5"
            >
              {/* Vệt sáng trang trí góc ô vàng */}
              <div className="pointer-events-none absolute -right-3 -top-3 h-12 w-12 rounded-full bg-amber-300/40 blur-xs" />

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 border border-amber-300/90 mt-0.5 shadow-xs">
                  {idx === 0 ? (
                    <Trophy className="h-4 w-4 text-amber-950" />
                  ) : idx === 1 ? (
                    <Medal className="h-4 w-4 text-amber-950" />
                  ) : (
                    <Award className="h-4 w-4 text-amber-950" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black uppercase text-amber-950 leading-snug tracking-tight group-hover:text-[#9A1B0E] transition-colors">
                    {item.title}
                  </p>
                  {item.level && (
                    <div className="mt-1.5 flex items-center gap-1">
                      <span className="inline-block rounded-md bg-amber-200/90 px-2 py-0.5 text-[10px] font-bold text-amber-950 border border-amber-300/80 shadow-2xs">
                        {item.level}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
