import type { Notification } from "@/types";

export const notifications: Notification[] = [
  // tw.admin (account 1)
  { id: 1, recipientAccountId: 1, notificationType: "POST_PUBLISHED", title: "Bài mới được xuất bản", message: "Bài 'Đêm nhạc Lịch sử tươi đẹp' vừa được đăng công khai.", refType: "POST", refId: 5007, linkUrl: "/quan-tri/xuat-ban", isRead: false, createdAt: "2026-09-21T02:10:00Z" },
  { id: 2, recipientAccountId: 1, notificationType: "SYSTEM", title: "Chốt kỳ xếp hạng", message: "Kỳ 'Xếp hạng đơn vị trường học — Quý III/2026' đã được chốt.", linkUrl: "/quan-tri/bang-xep-hang", isRead: true, createdAt: "2026-09-21T10:05:00Z" },
  // bd.province (account 3)
  { id: 3, recipientAccountId: 3, notificationType: "TASK_ASSIGNED", title: "Nhiệm vụ mới từ Trung ương Đoàn", message: "Bạn nhận nhiệm vụ III.1 — Chương trình bảo vệ môi trường, hạn 31/10/2026.", refType: "TASK", refId: 31, linkUrl: "/quan-tri/nhiem-vu/phan-cong/130", isRead: false, createdAt: "2026-08-01T02:05:00Z" },
  { id: 4, recipientAccountId: 3, notificationType: "TASK_DUE_SOON", title: "Nhiệm vụ sắp đến hạn", message: "Nhiệm vụ II.1 của Đoàn phường Hiệp Thành hạn 30/09 (còn 8 ngày).", refType: "ASSIGNMENT", refId: 121, linkUrl: "/quan-tri/nhiem-vu/phan-cong/121", isRead: false, createdAt: "2026-09-22T01:00:00Z" },
  { id: 5, recipientAccountId: 3, notificationType: "SYSTEM", title: "Yêu cầu bổ sung minh chứng", message: "Đoàn phường Phú Hòa cần bổ sung minh chứng nhiệm vụ III.1.", refType: "ASSIGNMENT", refId: 132, linkUrl: "/quan-tri/nhiem-vu/xac-nhan", isRead: true, createdAt: "2026-09-14T01:05:00Z" },
  // hc.hiepthanh (account 4)
  { id: 6, recipientAccountId: 4, notificationType: "RESULT_CONFIRMED", title: "Kết quả được xác nhận", message: "Nhiệm vụ I.1 của bạn đã được Đoàn phường xác nhận (72% hoàn thành).", refType: "ASSIGNMENT", refId: 101, linkUrl: "/quan-tri/nhiem-vu/phan-cong/101", isRead: false, createdAt: "2026-09-20T02:30:00Z" },
  { id: 7, recipientAccountId: 4, notificationType: "RESULT_NEEDS_INFO", title: "Cần bổ sung thông tin", message: "Hoạt động 'Chung kết cuộc thi Sáng tạo' cần bổ sung ảnh giải thưởng.", refType: "ACTIVITY", refId: 104, linkUrl: "/quan-tri/hoat-dong/104", isRead: false, createdAt: "2026-09-18T02:00:00Z" },
  { id: 8, recipientAccountId: 4, notificationType: "NEW_DOCUMENT", title: "Văn bản mới", message: "Kế hoạch Kiểm tra công tác Đoàn quý III/2026 gửi tới các trường.", refType: "DOCUMENT", refId: 6, linkUrl: "/quan-tri/van-ban", isRead: false, createdAt: "2026-09-22T02:05:00Z" },
  { id: 9, recipientAccountId: 4, notificationType: "TASK_ASSIGNED", title: "Nhiệm vụ được phân bổ xuống trường", message: "THPT Chánh Phú Hưng nhận chỉ tiêu 25 hoạt động trải nghiệm, hạn 15/11.", refType: "ASSIGNMENT", refId: 101, linkUrl: "/quan-tri/nhiem-vu/phan-cong/101", isRead: true, createdAt: "2026-07-20T02:10:00Z" },
  // thpt.chanhphu (account 5)
  { id: 10, recipientAccountId: 5, notificationType: "TASK_ASSIGNED", title: "Nhiệm vụ mới từ Đoàn phường", message: "Bạn nhận nhiệm vụ I.1 — Hoạt động trải nghiệm, chỉ tiêu 25 hoạt động.", refType: "ASSIGNMENT", refId: 101, linkUrl: "/quan-tri/nhiem-vu/phan-cong/101", isRead: false, createdAt: "2026-07-20T02:15:00Z" },
  { id: 11, recipientAccountId: 5, notificationType: "TASK_DUE_SOON", title: "Deadline sắp đến", message: "Nhiệm vụ II.1 — Tin bài xuất bản, hạn 30/09. Hiện đạt 4/8 bài.", refType: "ASSIGNMENT", refId: 121, linkUrl: "/quan-tri/nhiem-vu/phan-cong/121", isRead: false, createdAt: "2026-09-22T01:10:00Z" },
  { id: 12, recipientAccountId: 5, notificationType: "NEW_DOCUMENT", title: "Văn bản mới từ Đoàn phường", message: "Kế hoạch Kiểm tra công tác Đoàn quý III/2026 — đề nghị đọc và xác nhận.", refType: "DOCUMENT", refId: 6, linkUrl: "/quan-tri/van-ban", isRead: false, createdAt: "2026-09-22T02:05:00Z" },
  { id: 13, recipientAccountId: 5, notificationType: "RESULT_CONFIRMED", title: "Điểm thi đua đã cập nhật", message: "Tiêu chí III.1 đạt điểm tối đa 15/15.", linkUrl: "/quan-tri/nhiem-vu/cham-diem", isRead: true, createdAt: "2026-09-21T02:00:00Z" },
  // btv.tw (account 2)
  { id: 14, recipientAccountId: 2, notificationType: "POST_PUBLISHED", title: "Nhắc nhở bài chờ đăng", message: "1 bài trạng thái SCHEDULED sẽ tự đăng 24/09 — 'Hội thi ATGT'.", refType: "POST", refId: 5010, linkUrl: "/quan-tri/xuat-ban", isRead: false, createdAt: "2026-09-22T01:40:00Z" },
  { id: 15, recipientAccountId: 2, notificationType: "SYSTEM", title: "Bài nháp chờ biên tập", message: "Bài 'Hội thảo NCKH sinh viên' đang ở trạng thái DRAFT.", refType: "POST", refId: 5011, linkUrl: "/quan-tri/xuat-ban", isRead: true, createdAt: "2026-09-18T02:30:00Z" },
];
