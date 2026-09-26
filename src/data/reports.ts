import type { Report } from "@/types";

export const reports: Report[] = [
  {
    id: 1, orgUnitId: 12,
    title: "Báo cáo kết quả tháng 8/2026 — Tỉnh Đoàn Bình Dương",
    reportType: "MONTHLY", periodYear: 2026, periodNumber: 8,
    periodStart: "2026-08-01", periodEnd: "2026-08-31",
    aiDraftContent:
      "Trong tháng 8/2026, toàn tỉnh có 34 hoạt động được cập nhật với 3.400 lượt đoàn viên tham gia. Tiến độ nhiệm vụ I.1 đạt 56,7% chỉ tiêu. Đơn vị dẫn đầu là Đoàn phường Tương Bình Hiệp (100% hoàn thành chỉ tiêu hoạt động trải nghiệm). Công tác truyền thông ghi nhận 11 tin bài được xuất bản trên Cổng TNTH.",
    aiModel: "tnth-draft-v1 (mock)", aiGeneratedAt: "2026-09-01T02:00:00Z",
    status: "FINALIZED", createdAt: "2026-09-01T01:30:00Z",
    exports: [{ id: 1, reportId: 1, exportFormat: "DOCX", exportedAt: "2026-09-02T01:00:00Z" }],
  },
  {
    id: 2, orgUnitId: 25,
    title: "Báo cáo tiến độ nhiệm vụ quý III/2026 — Đoàn phường Hiệp Thành",
    reportType: "QUARTERLY", periodYear: 2026, periodNumber: 3,
    periodStart: "2026-07-01", periodEnd: "2026-09-30",
    aiDraftContent:
      "Tính đến 20/9/2026, Đoàn phường Hiệp Thành đã đạt 18/25 hoạt động (72%) chỉ tiêu I.1; 6/10 bài nhật ký trải nghiệm (60%) chỉ tiêu I.2; 4/8 tin bài xuất bản (50%) chỉ tiêu II.1. Nhiệm vụ đột xuất III.1 đã hoàn thành với chương trình Chủ nhật xanh tại kênh Nông Trại. Kiến nghị: đề nghị cấp trên gia hạn deadline nhiệm vụ II.1 do mùa khai giảng tập trung hoạt động lễ.",
    aiModel: "tnth-draft-v1 (mock)", aiGeneratedAt: "2026-09-21T02:00:00Z",
    status: "DRAFT", createdAt: "2026-09-21T01:45:00Z", exports: [],
  },
  {
    id: 3, orgUnitId: 31,
    title: "Báo cáo phong trào tháng 9/2026 — Đoàn trường THPT Chánh Phú Hưng",
    reportType: "MONTHLY", periodYear: 2026, periodNumber: 9,
    periodStart: "2026-09-01", periodEnd: "2026-09-30",
    content:
      "Tháng 9/2026, Đoàn trường tổ chức 4 hoạt động với 752 lượt đoàn viên, học sinh tham gia. Điểm nổi bật: chương trình Nhật ký trải nghiệm nghề nghiệp cho khối 11 thu hút 42 bạn trẻ tham gia. Đề xuất: được hỗ trợ kinh phí hoạt động trải nghiệm nghề tháng 10.",
    status: "FINALIZED", createdAt: "2026-09-20T02:00:00Z",
    exports: [{ id: 2, reportId: 3, exportFormat: "PDF", exportedAt: "2026-09-20T02:30:00Z" }],
  },
];
