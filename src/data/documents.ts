import type { DocumentRecord, DocumentRecipient } from "@/types";

export const documents: DocumentRecord[] = [
  {
    id: 1, docNumber: "1628/CT-TWĐ", title: "Chỉ thị về tăng cường công tác Thanh niên Trường học giai đoạn 2026-2030",
    summary: "Định hướng trọng tâm công tác thanh niên trường học, yêu cầu các cấp Đoàn số hóa công tác thi đua, khen thưởng.",
    documentCategoryId: 1, issuingOrgUnitId: 1, issuedDate: "2026-06-15", effectiveDate: "2026-07-01",
    recipientScope: "ALL_DESCENDANTS", status: "ISSUED", createdAt: "2026-06-15T02:00:00Z",
  },
  {
    id: 2, docNumber: "45/KH-TNTH", title: "Kế hoạch triển khai Bộ tiêu chí thi đua Thanh niên Trường học năm 2026",
    summary: "Hướng dẫn triển khai bộ tiêu chí 100 điểm, phân bổ chỉ tiêu từ TW đến trường học, deadline theo quý.",
    documentCategoryId: 2, issuingOrgUnitId: 1, issuedDate: "2026-07-10",
    recipientScope: "ALL_DESCENDANTS", status: "ISSUED", createdAt: "2026-07-10T02:00:00Z",
  },
  {
    id: 3, docNumber: "112/HD-TNTH", title: "Hướng dẫn quy trình cập nhật hoạt động và minh chứng truyền thông",
    summary: "Quy trình nộp hoạt động, chuẩn link minh chứng, quy tắc xác nhận của cấp trên trên Cổng TNTH.",
    documentCategoryId: 3, issuingOrgUnitId: 1, issuedDate: "2026-07-20",
    recipientScope: "ALL_DESCENDANTS", status: "ISSUED", createdAt: "2026-07-20T02:00:00Z",
  },
  {
    id: 4, docNumber: "230/KH-BD", title: "Kế hoạch thi đua chào mừng 95 năm thành lập Đoàn TNCS Hồ Chí Minh",
    summary: "Phong trào thi đua đặc biệt của tuổi trẻ Bình Dương, tăng cường chất lượng hoạt động tình nguyện.",
    documentCategoryId: 2, issuingOrgUnitId: 12, issuedDate: "2026-08-05",
    recipientScope: "DIRECT_CHILDREN", status: "ISSUED", createdAt: "2026-08-05T02:00:00Z",
  },
  {
    id: 5, docNumber: "241/TB-BD", title: "Thông báo kết quả kiểm tra công tác Đoàn 6 tháng đầu năm",
    summary: "Kết quả kiểm tra tại 4 đơn vị phường, điểm mạnh và hạn chế cần khắc phục trong 6 tháng cuối năm.",
    documentCategoryId: 5, issuingOrgUnitId: 12, issuedDate: "2026-08-28",
    recipientScope: "DIRECT_CHILDREN", status: "ISSUED", createdAt: "2026-08-28T02:00:00Z",
  },
  {
    id: 6, docNumber: "18/KH-HT", title: "Kế hoạch Kiểm tra công tác Đoàn các trường học quý III/2026",
    summary: "Kế hoạch kiểm tra việc cập nhật hoạt động và số liệu nhiệm vụ thi đua tại 4 trường trên địa bàn.",
    documentCategoryId: 2, issuingOrgUnitId: 25, issuedDate: "2026-09-22",
    recipientScope: "SELECTED", status: "ISSUED", createdAt: "2026-09-22T02:00:00Z",
  },
  {
    id: 7, docNumber: "19/QĐ-TNTH", title: "Quy định phương thức chấm điểm thi đua trên Cổng TNTH",
    summary: "Chi tiết 3 phương thức chấm: tự động tổng hợp, xác nhận thủ công, hội đồng chuyên gia; quy tắc kháng nghị điểm.",
    documentCategoryId: 4, issuingOrgUnitId: 1, issuedDate: "2026-09-25",
    recipientScope: "ALL_DESCENDANTS", status: "DRAFT", createdAt: "2026-09-21T02:00:00Z",
  },
  {
    id: 8, docNumber: "201/TB-BD", title: "Thông báo điều lịch hội thi Hành trình đỏ cấp tỉnh 2026",
    summary: "Dịch lịch vòng chung kết từ ngày 02/10 sang 09/10/2026 tại Nhà văn hóa thiếu nhi tỉnh.",
    documentCategoryId: 5, issuingOrgUnitId: 12, issuedDate: "2026-09-15",
    recipientScope: "SELECTED", status: "REVOKED", createdAt: "2026-09-15T02:00:00Z",
  },
];

/** document_recipients — readAt null = chưa đọc (badge) */
export const documentRecipients: DocumentRecipient[] = [
  // VB1: ALL_DESCENDANTS của TW → ít nhất các cấp demo
  { documentId: 1, orgUnitId: 12, readAt: "2026-06-16T02:00:00Z" },
  { documentId: 1, orgUnitId: 25, readAt: "2026-06-17T02:00:00Z" },
  { documentId: 1, orgUnitId: 31, readAt: null },
  { documentId: 1, orgUnitId: 13, readAt: "2026-06-18T02:00:00Z" },
  { documentId: 1, orgUnitId: 14, readAt: null },
  { documentId: 1, orgUnitId: 15, readAt: "2026-06-20T02:00:00Z" },
  { documentId: 1, orgUnitId: 16, readAt: null },
  // VB2
  { documentId: 2, orgUnitId: 12, readAt: "2026-07-11T02:00:00Z" },
  { documentId: 2, orgUnitId: 25, readAt: "2026-07-12T02:00:00Z" },
  { documentId: 2, orgUnitId: 31, readAt: "2026-07-13T02:00:00Z" },
  { documentId: 2, orgUnitId: 13, readAt: null },
  { documentId: 2, orgUnitId: 14, readAt: null },
  { documentId: 2, orgUnitId: 15, readAt: "2026-07-14T02:00:00Z" },
  { documentId: 2, orgUnitId: 16, readAt: null },
  // VB3
  { documentId: 3, orgUnitId: 12, readAt: "2026-07-21T02:00:00Z" },
  { documentId: 3, orgUnitId: 25, readAt: "2026-07-22T02:00:00Z" },
  { documentId: 3, orgUnitId: 31, readAt: null },
  { documentId: 3, orgUnitId: 13, readAt: "2026-07-23T02:00:00Z" },
  { documentId: 3, orgUnitId: 14, readAt: "2026-07-24T02:00:00Z" },
  { documentId: 3, orgUnitId: 15, readAt: null },
  { documentId: 3, orgUnitId: 16, readAt: null },
  // VB4: DIRECT_CHILDREN của Bình Dương
  { documentId: 4, orgUnitId: 25, readAt: "2026-08-06T02:00:00Z" },
  { documentId: 4, orgUnitId: 26, readAt: "2026-08-06T02:05:00Z" },
  { documentId: 4, orgUnitId: 27, readAt: null },
  { documentId: 4, orgUnitId: 28, readAt: null },
  // VB5
  { documentId: 5, orgUnitId: 25, readAt: "2026-08-29T02:00:00Z" },
  { documentId: 5, orgUnitId: 26, readAt: null },
  { documentId: 5, orgUnitId: 27, readAt: null },
  { documentId: 5, orgUnitId: 28, readAt: "2026-08-30T02:00:00Z" },
  // VB6: SELECTED — các trường thuộc Hiệp Thành
  { documentId: 6, orgUnitId: 31, readAt: null },
  { documentId: 6, orgUnitId: 32, readAt: "2026-09-22T02:10:00Z" },
  { documentId: 6, orgUnitId: 33, readAt: null },
  // VB7: DRAFT chưa phát hành → không có recipient
  // VB8: SELECTED revoked
  { documentId: 8, orgUnitId: 31, readAt: "2026-09-16T02:00:00Z" },
];
