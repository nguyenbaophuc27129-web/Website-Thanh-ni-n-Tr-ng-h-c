import type { ForumMedia } from "@/types";

/** Giới hạn đính kèm diễn đàn: ảnh ≤2MB × tối đa, video ≤15MB × 1, tổng ≤5 tệp */
export const FORUM_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const FORUM_VIDEO_MAX_BYTES = 15 * 1024 * 1024;
export const FORUM_MEDIA_MAX_ITEMS = 5;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Không đọc được tệp ${file.name}`));
    reader.readAsDataURL(file);
  });
}

/**
 * Kiểm tra + đọc file đính kèm (chỉ gọi trong handler sự kiện).
 * Trả về danh sách media mới (gộp sẵn để set) hoặc thông báo lỗi.
 */
export async function readForumMediaFiles(
  files: FileList | File[],
  existing: ForumMedia[]
): Promise<{ media: ForumMedia[] } | { error: string }> {
  const list = Array.from(files);
  if (list.length === 0) return { media: existing };

  const total = existing.length + list.length;
  if (total > FORUM_MEDIA_MAX_ITEMS) {
    return { error: `Tối đa ${FORUM_MEDIA_MAX_ITEMS} tệp đính kèm mỗi bài.` };
  }

  const existingVideos = existing.filter((m) => m.kind === "video").length;
  const media: ForumMedia[] = [];
  for (const file of list) {
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      return { error: `“${file.name}” không phải ảnh hoặc video.` };
    }
    if (isImage && file.size > FORUM_IMAGE_MAX_BYTES) {
      return { error: `Ảnh “${file.name}” vượt 2MB — hãy chọn ảnh nhỏ hơn.` };
    }
    if (isVideo) {
      if (existingVideos + media.filter((m) => m.kind === "video").length >= 1) {
        return { error: "Mỗi bài chỉ đính kèm tối đa 1 video." };
      }
      if (file.size > FORUM_VIDEO_MAX_BYTES) {
        return { error: `Video “${file.name}” vượt 15MB — hãy chọn video ngắn hơn.` };
      }
    }
    try {
      media.push({ kind: isImage ? "image" : "video", dataUrl: await readFileAsDataUrl(file), name: file.name });
    } catch {
      return { error: `Không đọc được tệp “${file.name}”.` };
    }
  }
  return { media: [...existing, ...media] };
}
