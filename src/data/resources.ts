import type { Resource, SystemSetting } from "@/types";

export const resources: Resource[] = [
  /* ===== Clip tuyên truyền Xây dựng tình bạn đẹp, nói không với bạo lực học đường =====
     Nguồn: playlist chính thức "Học sinh TP. Hồ Chí Minh" — xem trực tuyến qua YouTube. */
  { id: 11, resourceTypeId: 5, title: "Playlist đầy đủ: Xây dựng tình bạn đẹp, nói không với bạo lực học đường", description: "Toàn bộ clip tuyên truyền của Học sinh TP. Hồ Chí Minh — phát liên tục trong 1 trình duyệt.", fileName: "playlist-tinh-ban-de.mp4", fileSizeKb: 0, isPublic: true, downloadCount: 1863, publishedByOrgUnitId: 1, publishedAt: "2026-09-10T02:00:00Z", status: "PUBLISHED", videoUrl: "https://www.youtube.com/embed/videoseries?list=PLS4M_3LJA2EIRMv0PW5YyPxjQirGhuwK5" },
  { id: 12, resourceTypeId: 5, title: "Hoạt cảnh tuyên truyền Xây dựng tình bạn đẹp, nói không với bạo lực học đường số 01", description: "Hoạt cảnh tuyên truyền do Học sinh TP. Hồ Chí Minh sản xuất.", fileName: "clip-hoat-canh-so-01.mp4", fileSizeKb: 24500, isPublic: true, downloadCount: 2140, publishedByOrgUnitId: 1, publishedAt: "2026-09-12T02:00:00Z", status: "PUBLISHED", videoUrl: "https://www.youtube.com/watch?v=03GNBozuQKA" },
  { id: 13, resourceTypeId: 5, title: "Videoclip tình huống về bạo lực học đường — Đoàn trường THPT Ernst Thälmann (Quận 01)", description: "Tình huống kịch tính do Đoàn trường dàn dựng, phát trong tiết sinh hoạt lớp.", fileName: "clip-ernst-thalmann.mp4", fileSizeKb: 68300, isPublic: true, downloadCount: 1756, publishedByOrgUnitId: 1, publishedAt: "2026-09-12T02:00:00Z", status: "PUBLISHED", videoUrl: "https://www.youtube.com/watch?v=bPw9OsqLHxM" },
  { id: 14, resourceTypeId: 5, title: "Videoclip tình huống về bạo lực học đường — Đoàn trường THPT Bình Chiểu (TP. Thủ Đức)", description: "Tình huống về bạo lực học đường do Đoàn trường THPT Bình Chiểu thực hiện.", fileName: "clip-binh-chieu.mp4", fileSizeKb: 52100, isPublic: true, downloadCount: 1402, publishedByOrgUnitId: 1, publishedAt: "2026-09-12T02:00:00Z", status: "PUBLISHED", videoUrl: "https://www.youtube.com/watch?v=hf98LN-JNdI" },
  { id: 15, resourceTypeId: 5, title: "Hoạt cảnh tuyên truyền Xây dựng tình bạn đẹp, nói không với bạo lực học đường số 01 (bản playlist)", description: "Bản đăng trong playlist chính thức của Học sinh TP. Hồ Chí Minh.", fileName: "clip-hoat-canh-playlist.mp4", fileSizeKb: 31000, isPublic: true, downloadCount: 987, publishedByOrgUnitId: 1, publishedAt: "2026-09-12T02:00:00Z", status: "PUBLISHED", videoUrl: "https://www.youtube.com/watch?v=wOUKVVJb5Jg" },
  { id: 16, resourceTypeId: 5, title: "Videoclip tình huống về bạo lực tinh thần học đường — Đoàn trường THPT Marie Curie (Quận 3)", description: "Tình huống về bạo lực tinh thần học đường do Đoàn trường THPT Marie Curie thực hiện.", fileName: "clip-marie-curie.mp4", fileSizeKb: 45800, isPublic: true, downloadCount: 1123, publishedByOrgUnitId: 1, publishedAt: "2026-09-12T02:00:00Z", status: "PUBLISHED", videoUrl: "https://www.youtube.com/watch?v=zv94WljV6YA" },
];

export const systemSettings: SystemSetting[] = [
  { settingKey: "site.name", value: "Cổng Thanh niên Trường học", valueType: "STRING", groupName: "Công khai", description: "Tên website hiển thị header, tiêu đề SEO" },
  { settingKey: "site.slogan", value: "Sức trẻ trường học — Cống hiến và lớn lên", valueType: "STRING", groupName: "Công khai", description: "Khẩu hiệu hiển thị dưới logo" },
  { settingKey: "site.contact_email", value: "tnth@doanthanhnienvn.vn", valueType: "STRING", groupName: "Công khai", description: "Email liên hệ hiển thị footer" },
  { settingKey: "site.hotline", value: "024.38253271", valueType: "STRING", groupName: "Công khai", description: "Đường dây nóng" },
  { settingKey: "feature.hs3t_link", value: "https://hoc-sinh-3-tot.vn", valueType: "STRING", groupName: "Tính năng", description: "Link banner Học sinh 3 tốt trên trang chủ" },
  { settingKey: "feature.ai_chat", value: "true", valueType: "BOOLEAN", groupName: "Tính năng", description: "Bật/tắt trợ lý ảo chat trên website công khai" },
  { settingKey: "feature.ai_report_draft", value: "true", valueType: "BOOLEAN", groupName: "Tính năng", description: "Cho phép tạo nháp báo cáo bằng AI" },
  { settingKey: "feedback.rate_limit_hours", value: "1", valueType: "NUMBER", groupName: "Phản ánh", description: "Số giờ tối thiểu giữa 2 lần gửi từ 1 IP" },
  { settingKey: "ranking.lock_period_days", value: "7", valueType: "NUMBER", groupName: "Xếp hạng", description: "Số ngày công bố trước khi chốt vĩnh viễn kỳ xếp hạng" },
  { settingKey: "notify.deadline_d7", value: "true", valueType: "BOOLEAN", groupName: "Thông báo", description: "Gửi thông báo D-7 khi nhiệm vụ sắp đến hạn" },
  { settingKey: "notify.deadline_d3", value: "true", valueType: "BOOLEAN", groupName: "Thông báo", description: "Gửi thông báo D-3 nhắc khẩn" },
];
