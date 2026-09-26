import type { PublishedPost } from "@/types";

const CONTENT_DEMO = (paras: string[]) => paras.join("\n\n");

/** ~12 bài tin công khai — status PUBLISHED hiện trên website, còn lại quản trị tại /xuat-ban */
export const publishedPosts: PublishedPost[] = [
  {
    id: 5001, activityId: 101, slug: "le-ra-quan-thang-thanh-nien-tinh-nguyen-2026",
    title: "Ra quân Tháng Thanh niên tình nguyện 2026: Sức trẻ Hiệp Thành đồng hành cùng cộng đồng",
    excerpt: "Hơn 350 đoàn viên, thanh niên Trường THPT Chánh Phú Hưng đã tham gia Lễ ra quân với nhiều hoạt động ý nghĩa: đường cờ Tổ quốc, vệ sinh nghĩa trang liệt sĩ và khởi công công trình sân chơi thiếu nhi.",
    content: CONTENT_DEMO([
      "Sáng ngày 15/8, tại nhà văn hóa phường Hiệp Thành, Đoàn Trường THPT Chánh Phú Hưng phối hợp với Đoàn phường long trọng tổ chức Lễ ra quân Tháng Thanh niên tình nguyện năm 2026.",
      "Phát huy tinh thần xung kích, tình nguyện của tuổi trẻ, năm nay các hoạt động tập trung vào 3 trụ cột: xây dựng nông thôn mới, văn minh đô thị; bảo vệ môi trường và chăm lo đời sống cộng đồng.",
      "Ngay sau lễ ra quân, 350 đoàn viên đã đồng loạt triển khai các phần việc: lắp đặt 500m đường cờ Tổ quốc, dọn vệ sinh nghĩa trang liệt sĩ, khởi công sân chơi thiếu nhi tại khu phố 4 với tổng kinh phí 80 triệu đồng từ nguồn xã hội hóa.",
      "Tháng Thanh niên năm nay cam kết đạt ít nhất 25 hoạt động tình nguyện, hướng tới kỷ niệm 95 năm thành lập Đoàn.",
    ]),
    coverSeed: 1, status: "PUBLISHED", isFeatured: true, publishedAt: "2026-08-16T03:00:00Z",
    viewCount: 3421, authorOrgUnitName: "Đoàn Trường THPT Chánh Phú Hưng", editorAccountId: 5,
    categoryNames: ["Tình nguyện, cộng đồng"], createdAt: "2026-08-16T02:30:00Z",
  },
  {
    id: 5002, activityId: 102, slug: "hanh-trinh-do-2026-doi-tuyen-binh-duong",
    title: "Hành trình đỏ 2026: Đội tuyển Bình Dương xuất sắc vào vòng khu vực",
    excerpt: "Với 9,2 điểm vòng cấp tỉnh, đội tuyển Hành trình đỏ của Trường THPT Chánh Phú Hưng giành vé dự vòng khu vực phía Nam.",
    content: CONTENT_DEMO([
      "Cuộc thi Hành trình đỏ là sân chơi học tập lịch sử Party, lịch sử Đoàn quen thuộc với tuổi trẻ cả nước.",
      "Đội tuyển trường THPT Chánh Phú Hưng vượt qua 24 đội mạnh của tỉnh để giành suất tham dự vòng khu vực.",
    ]),
    coverSeed: 2, status: "PUBLISHED", isFeatured: true, publishedAt: "2026-08-06T02:00:00Z",
    viewCount: 2870, authorOrgUnitName: "Đoàn Trường THPT Chánh Phú Hưng", editorAccountId: 5,
    categoryNames: ["Lịch sử, truyền thống, hành trình đỏ"], createdAt: "2026-08-06T01:30:00Z",
  },
  {
    id: 5003, activityId: 106, slug: "chunhat-xanh-ve-sinh-kenh-nong-trai",
    title: "Chủ nhật xanh: 70 đoàn viên thu gom rác thải tại kênh Nông Trại",
    excerpt: "Chương trình thu gom rác thải nhựa, tuyên truyền phân loại rác tại nguồn đã thu về hơn 300kg rác, góp phần giữ xanh dòng kênh nội đô.",
    content: CONTENT_DEMO([
      "Ngày 6/9, lực lượng đoàn viên trường THPT Chánh Phú Hưng triển khai hoạt động Chủ nhật xanh tại tuyến kênh Nông Trại.",
      "Hoạt động nằm trong nhiệm vụ thi đua III.1 về bảo vệ môi trường năm 2026.",
    ]),
    coverSeed: 6, status: "PUBLISHED", isFeatured: false, publishedAt: "2026-09-08T02:00:00Z",
    viewCount: 1215, authorOrgUnitName: "Đoàn Trường THPT Chánh Phú Hưng", editorAccountId: 5,
    categoryNames: ["Bảo vệ môi trường, an toàn giao thông"], createdAt: "2026-09-08T01:00:00Z",
  },
  {
    id: 5004, activityId: 108, slug: "tap-huan-cong-tac-doan-nam-hoc-moi",
    title: "Tập huấn công tác Đoàn: Đưa số liệu thi đua lên môi trường số",
    excerpt: "45 bí thư chi đoàn các trường học trên địa bàn phường Hiệp Thành được hướng dẫn quy trình cập nhật hoạt động, phân bổ chỉ tiêu và theo dõi deadline trên Cổng Thanh niên Trường học.",
    content: CONTENT_DEMO([
      "Ngày 2/9, Ban Thanh niên Trường học tỉnh Bình Dương phối hợp Đoàn phường Hiệp Thành tổ chức tập huấn công tác Đoàn năm học 2026-2027.",
      "Tham dự buổi tập huấn, đại biểu được hướng dẫn chi tiết nghiệp vụ trên hệ thống: cập nhật hoạt động kèm minh chứng truyền thông, phân bổ chỉ tiêu nhiều cấp, cập nhật kết quả theo deadline và quy trình chấm điểm 3 phương thức.",
      "Năm học 2026-2027, toàn phường đặt mục tiêu 100% chi đoàn trường học cập nhật hoạt động định kỳ trên cổng.",
    ]),
    coverSeed: 8, status: "PUBLISHED", isFeatured: false, publishedAt: "2026-09-04T02:00:00Z",
    viewCount: 986, authorOrgUnitName: "Đoàn Phường Hiệp Thành", editorAccountId: 5,
    categoryNames: ["Đoàn viên 3 tốt"], createdAt: "2026-09-04T01:00:00Z",
  },
  {
    id: 5005, activityId: 111, slug: "vong-tay-yeu-thuong-30-suat-hoc-bong",
    title: "Vòng tay yêu thương: Trao 30 suất học bổng cho học sinh khó khăn",
    excerpt: "Chuỗi hoạt động quyên góp của Đoàn phường Phú Hòa đã vận động được 42 triệu đồng, trao 30 suất học bổng cho học sinh có hoàn cảnh đặc biệt khó khăn.",
    content: CONTENT_DEMO([
      "Chương trình được duy trì 7 năm liền, trở thành nét đẹp truyền thống của tuổi trẻ phường Phú Hòa.",
      "Năm nay ngoài học bổng, các bạn trẻ còn trao 100 cặp sách và đồ dùng học cho học sinh vùng lũ lân cận.",
    ]),
    coverSeed: 11, status: "PUBLISHED", isFeatured: false, publishedAt: "2026-08-22T02:00:00Z",
    viewCount: 1743, authorOrgUnitName: "Đoàn Phường Phú Hòa", editorAccountId: 5,
    categoryNames: ["Tình nguyện, cộng đồng", "Áo ấm mùa đông, đồng dao vùng cao"], createdAt: "2026-08-22T01:00:00Z",
  },
  {
    id: 5006, activityId: 112, slug: "giai-bong-da-thanh-nien-tuong-binh-hiep-2026",
    title: "Khởi tranh Giải bóng đá Thanh niên Tương Bình Hiệp 2026",
    excerpt: "8 đội bóng đến từ các trường học, cơ quan đơn vị trên địa bàn phường tranh tài suốt 2 tuần cuối tháng 9.",
    content: CONTENT_DEMO([
      "Giải đấu nhằm thiết chế văn hóa thể thao, tăng cường gắn kết đoàn viên thanh niên sau mùa hè.",
      "Trận khai mạc diễn ra sôi nổi với chiến thắng 2-1 của đội Đoàn trường THPT Nguyễn Trãi.",
    ]),
    coverSeed: 12, status: "PUBLISHED", isFeatured: false, publishedAt: "2026-09-16T02:00:00Z",
    viewCount: 764, authorOrgUnitName: "Đoàn Phường Tương Bình Hiệp", editorAccountId: 5,
    categoryNames: ["Thể dục thể thao, Đoàn kết sức trẻ"], createdAt: "2026-09-16T01:00:00Z",
  },
  {
    id: 5007, activityId: 113, slug: "dem-nhac-lich-su-tuoi-dep-ben-nghe",
    title: "Đêm nhạc 'Lịch sử tươi đẹp' hòa quyện ký ức Sài Gòn - Gia Định",
    excerpt: "Hơn 500 khán giả tham dự đêm nhạc cộng đồng kỷ niệm lịch sử hình thành Sài Gòn - Gia Định, do Đoàn phường Bến Nghé tổ chức.",
    content: CONTENT_DEMO([
      "Chương trình quy tụ các nghệ sĩ trẻ và học sinh các trường trên địa bàn, tái hiện chặng đường 300 năm hình thành và phát triển.",
      "Đêm nhạc cũng là hoạt động khép lại chuỗi sự kiện 'Trải nghiệm di sản' mùa thu 2026.",
    ]),
    coverSeed: 13, status: "PUBLISHED", isFeatured: true, publishedAt: "2026-09-21T02:00:00Z",
    viewCount: 2450, authorOrgUnitName: "Đoàn Phường Bến Nghé", editorAccountId: 5,
    categoryNames: ["Lịch sử, truyền thống, hành trình đỏ"], createdAt: "2026-09-21T01:00:00Z",
  },
  {
    id: 5008, activityId: 114, slug: "giot-hong-bac-giang-110-don-vi-mau",
    title: "Giọt hồng Bắc Giang: 110 đơn vị máu từ sức trẻ Lê Lợi",
    excerpt: "160 đoàn viên đăng ký hiến máu, kết quả thu về 110 đơn vị máu an toàn phục vụ cấp cứu và điều trị.",
    content: CONTENT_DEMO([
      "Hoạt động hiến máu tình nguyện đợt 3 năm 2026 do Đoàn trường THPT Bắc Giang chủ trì.",
      "Nhiều đoàn viên lần đầu hiến máu đã chia sẻ cảm xúc 'rưng rưng' khi nhận giấy chứng nhận.",
    ]),
    coverSeed: 14, status: "PUBLISHED", isFeatured: false, publishedAt: "2026-09-10T02:00:00Z",
    viewCount: 890, authorOrgUnitName: "Đoàn Trường THPT Bắc Giang", editorAccountId: 5,
    categoryNames: ["Tình nguyện, cộng đồng"], createdAt: "2026-09-10T01:00:00Z",
  },
  {
    id: 5009, activityId: 117, slug: "mua-he-xanh-2026-tong-ket",
    title: "Mùa hè xanh 2026 khép lại với 15 công trình, phần việc thanh niên",
    excerpt: "2.500 lượt thanh niên tham gia chiến dịch tình nguyện hè, để lại dấu ấn tại 8 phường trên thành phố Đà Nẵng.",
    content: CONTENT_DEMO([
      "Chiến dịch Mùa hè xanh 2026 chính thức khép lại sau 2 tháng triển khai với nhiều kết quả nổi bật.",
      "Nổi bật là dự án đường đèn năng lượng mặt trời tại phường An Hải, quy mô 1,2km, do tuổi trẻ cùng doanh nghiệp đồng hành thực hiện.",
    ]),
    coverSeed: 17, status: "PUBLISHED", isFeatured: false, publishedAt: "2026-09-03T02:00:00Z",
    viewCount: 1320, authorOrgUnitName: "Đoàn Trường ĐH Kinh tế Đà Nẵng", editorAccountId: 5,
    categoryNames: ["Tình nguyện, cộng đồng"], createdAt: "2026-09-03T01:00:00Z",
  },
  {
    id: 5010, activityId: 116, slug: "hoi-thi-an-toan-giao-thong-ntn",
    title: "Hội thi An toàn giao thông: 'Mũ bảo hiểm chuẩn - Thông sáng đường tới'",
    excerpt: "200 học sinh THPT Ngô Thời Nhậm tham gia hội thi tìm hiểu luật giao thông, thực hành đội mũ bảo hiểm chuẩn.",
    content: CONTENT_DEMO([
      "Hội thi nhằm nâng cao ý thức chấp hành luật giao thông cho học sinh trong độ tuổi được phép điều khiển xe máy.",
      "Ban tổ chức trao giải cho 3 đội xuất sắc và 10 cá nhân 'Ambassador an toàn giao thông'.",
    ]),
    coverSeed: 16, status: "SCHEDULED", isFeatured: false, publishedAt: "2026-09-24T01:00:00Z",
    viewCount: 0, authorOrgUnitName: "Đoàn Trường THPT Ngô Thời Nhậm", editorAccountId: 5,
    categoryNames: ["Bảo vệ môi trường, an toàn giao thông"], createdAt: "2026-09-22T01:30:00Z",
  },
  {
    id: 5011, activityId: null, slug: "hoi-thao-nckh-sinh-vien-dhsp-nghe-an",
    title: "25 đề tài sinh viên nghiên cứu khoa học dự hội thảo cấp trường ĐHSP Nghệ An",
    excerpt: "Hội thảo thường niên của Trường ĐH Sư phạm Nghệ An chọn ra 6 đề tài xuất sắc tham dự hội thảo cấp tỉnh.",
    content: CONTENT_DEMO([
      "Các đề tài tập trung vào ứng dụng AI trong giảng dạy, giáo dục kỹ năng sống và bảo tồn văn hóa dân tộc Thái.",
      "Hội thảo có sự tham gia phản biện của các chuyên gia từ Trường ĐH Vinh.",
    ]),
    coverSeed: 15, status: "DRAFT", isFeatured: false,
    viewCount: 0, authorOrgUnitName: "Đoàn Trường ĐH Sư phạm Nghệ An", editorAccountId: 5,
    categoryNames: ["Học tập, nghiên cứu khoa học"], createdAt: "2026-09-18T02:00:00Z",
  },
  {
    id: 5012, activityId: 109, slug: "doi-co-do-bao-ve-chu-quyen-bien-dao",
    title: "Ra mắt Đội cờ đỏ tuyên truyền chủ quyền biển đảo thiêng liêng",
    excerpt: "Chuỗi hoạt động tuyên truyền về Hoàng Sa, Trường Sa đến 1.200 học sinh tại 4 trường học trên địa bàn phường Hiệp Thành.",
    content: CONTENT_DEMO([
      "Đội cờ đỏ gồm 20 thành viên được trang bị kiến thức về lịch sử và luật pháp quốc tế về chủ quyền biển đảo.",
      "Các buổi tuyên truyền lồng ghép hội thi tìm hiểu trực tiếp tại lớp, tạo hứng thú cho học sinh.",
    ]),
    coverSeed: 9, status: "UNPUBLISHED", isFeatured: false, publishedAt: "2026-09-01T02:00:00Z",
    viewCount: 410, authorOrgUnitName: "Đoàn Phường Hiệp Thành", editorAccountId: 5,
    categoryNames: ["Lịch sử, truyền thống, hành trình đỏ"], createdAt: "2026-09-01T01:00:00Z",
  },
];

/** Dữ liệu lượt xem tổng hợp theo ngày (post_view_daily) cho biểu đồ */
export const postViewDaily = [
  { date: "01/09", views: 320 }, { date: "05/09", views: 410 },
  { date: "10/09", views: 560 }, { date: "15/09", views: 720 },
  { date: "18/09", views: 650 }, { date: "21/09", views: 980 },
];
