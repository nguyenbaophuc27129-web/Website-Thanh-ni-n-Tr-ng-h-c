import type { DocumentRecord, DocumentRecipient } from "@/types";

/** Kho văn bản TRỐNG — văn bản thật do các cấp ban hành trực tiếp trên hệ thống. */
export const documents: DocumentRecord[] = [];

/** document_recipients — readAt null = chưa đọc (badge) */
export const documentRecipients: DocumentRecipient[] = [];
