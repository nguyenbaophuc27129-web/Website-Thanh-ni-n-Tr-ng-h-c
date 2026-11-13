/* ══════════════════════════════════════════════════════════════════════
   ĐẶC TẢ AI AGENT BÁO CÁO CÔNG TÁC ĐOÀN — NHIỆM KỲ 2026 - 2031
   Theo 100% tài liệu "Đặc tả huấn luyện AI agent tổng hợp báo cáo công tác
   Đoàn và phong trào thanh thiếu niên theo khung nhiệm vụ, giải pháp nhiệm
   kỳ 2026 - 2031" (căn cứ Dự thảo lần 5 Báo cáo chính trị BCH TW Đoàn
   khóa XII trình Đại hội Đoàn toàn quốc lần thứ XIII).

   Chỉ import ở route/lib SERVER (nhap-bao-cao, chinh-bao-cao, doc-context).
   ══════════════════════════════════════════════════════════════════════ */

export interface NvGroupInfo {
  code: string;
  num: number;
  title: string;
  /** SO_HIEU = mục 2/3/4 trình bày tiểu mục số hiệu; NHAN_DOAN = mục 1/5/6 viết thành đoạn mở đầu bằng nhãn nội dung */
  subStyle: "SO_HIEU" | "NHAN_DOAN";
}

/** 06 nhóm nhiệm vụ, giải pháp theo mục IV Báo cáo chính trị (thứ tự bắt buộc trong phần I) */
export const NV_GROUPS: NvGroupInfo[] = [
  { code: "NV1", num: 1, title: "Công tác tuyên truyền, giáo dục", subStyle: "NHAN_DOAN" },
  { code: "NV2", num: 2, title: "Phong trào “Tuổi trẻ Việt Nam tiên phong trong kỷ nguyên mới”", subStyle: "SO_HIEU" },
  { code: "NV3", num: 3, title: "Chương trình “Phát triển toàn diện thanh niên Việt Nam”", subStyle: "SO_HIEU" },
  { code: "NV4", num: 4, title: "Công tác xây dựng Đoàn, mở rộng mặt trận đoàn kết tập hợp thanh niên", subStyle: "SO_HIEU" },
  { code: "NV5", num: 5, title: "Công tác phụ trách Đội TNTP Hồ Chí Minh, bảo vệ, chăm sóc, giáo dục thiếu niên, nhi đồng", subStyle: "NHAN_DOAN" },
  { code: "NV6", num: 6, title: "Công tác tham gia xây dựng, bảo vệ Đảng và hệ thống chính trị", subStyle: "NHAN_DOAN" },
];

export interface NvSubInfo {
  code: string;
  label: string;
  /** Dấu hiệu nhận diện từ Phụ lục 1 đặc tả */
  hints: string;
}

/** 28 tiểu mục — NV1.x/NV5.x/NV6.x là mã phân loại nội bộ, khi viết báo cáo hiển thị bằng NHÃN nội dung (không số); NV2.x/NV3.x/NV4.x hiển thị số hiệu "2.1." */
export const NV_SUBS: NvSubInfo[] = [
  {
    code: "NV1.1",
    label: "Học tập và làm theo tư tưởng, đạo đức, phong cách Hồ Chí Minh",
    hints: "học tập chuyên đề về Bác; đăng ký phần việc làm theo Bác; tủ sách học và làm theo Bác; Nhật ký làm theo lời Bác; cuộc thi tìm hiểu tư tưởng Hồ Chí Minh; sinh hoạt dịp 19/5; không gian văn hóa Hồ Chí Minh",
  },
  {
    code: "NV1.2",
    label: "Giáo dục lý tưởng cách mạng",
    hints: "học tập, quán triệt nghị quyết của Đảng, Mặt trận, Đoàn; lý luận chính trị; bài học lý luận cho đoàn viên mới; câu lạc bộ lý luận trẻ; kiểm tra nhận thức trên ứng dụng Thanh niên Việt Nam",
  },
  {
    code: "NV1.3",
    label: "Giáo dục truyền thống lịch sử, lòng yêu nước, tinh thần tự hào dân tộc",
    hints: "kỷ niệm ngày lễ lớn; hành trình về nguồn, địa chỉ đỏ; Thắp nến tri ân; đền ơn đáp nghĩa; chào cờ tại di tích; Bảo tàng số; “Câu chuyện thời hoa lửa”; “Tự hào một dải non sông”; “Tôi yêu Tổ quốc tôi”",
  },
  {
    code: "NV1.4",
    label: "Giáo dục đạo đức, lối sống văn hóa",
    hints: "“Xây dựng giá trị hình mẫu thanh niên Việt Nam thời kỳ mới”; “Mỗi ngày một tin tốt, mỗi tuần một câu chuyện đẹp”; ứng xử văn minh trên không gian mạng; trào lưu tích cực",
  },
  {
    code: "NV1.5",
    label: "Tuyên truyền, phổ biến, giáo dục pháp luật",
    hints: "tuyên truyền luật mới; tư vấn pháp lý trẻ; góp ý dự thảo luật; “Sống và làm theo Hiến pháp và pháp luật”",
  },
  {
    code: "NV1.6",
    label: "Nắm bắt và định hướng dư luận xã hội trong thanh niên",
    hints: "báo cáo dư luận xã hội; cộng tác viên dư luận xã hội; cung cấp thông tin chính thống",
  },
  {
    code: "NV1.7",
    label: "Đổi mới và đa dạng hóa phương thức tuyên truyền, giáo dục",
    hints: "sản phẩm truyền thông số; trang cộng đồng; ứng dụng Thanh niên Việt Nam; người có ảnh hưởng; chiến dịch truyền thông; thiết chế của Đoàn phục vụ giáo dục",
  },
  {
    code: "NV2.1",
    label: "Tiên phong phát triển khoa học công nghệ, đổi mới sáng tạo và chuyển đổi số",
    hints: "Nghị quyết 57-NQ/TW; “Bình dân học vụ số”; kỹ năng số, AI, dữ liệu; “Tình nguyện viên số”, “Tổ công nghệ số cộng đồng”; hỗ trợ dịch vụ công trực tuyến, VNeID; cuộc thi, giải thưởng khoa học công nghệ, sáng tạo; công trình ứng dụng khoa học công nghệ; STEM; Mạng lưới Trí thức trẻ",
  },
  {
    code: "NV2.2",
    label: "Tiên phong khởi nghiệp lập nghiệp, phát triển kinh tế đất nước",
    hints: "khởi nghiệp, ý tưởng kinh doanh; kinh tế tư nhân; OCOP; hợp tác xã; vốn vay ưu đãi; tư vấn hướng nghiệp, đào tạo nghề, nâng cao tay nghề cho thanh niên; hội thi tay nghề; việc làm cho thanh niên lao động; tôn vinh doanh nhân trẻ",
  },
  {
    code: "NV2.3",
    label: "Tiên phong hội nhập quốc tế",
    hints: "giao lưu quốc tế; đoàn ra, đoàn vào; ngoại ngữ, sân chơi ngoại ngữ; du học sinh; Hội Thanh niên - Sinh viên Việt Nam ở nước ngoài; Nghị quyết 59-NQ/TW",
  },
  {
    code: "NV2.4",
    label: "Tiên phong trong các hoạt động tình nguyện vì cộng đồng",
    hints: "chiến dịch tình nguyện (Mùa hè xanh, Hoa phượng đỏ, Xuân tình nguyện, Tình nguyện mùa đông, Tháng Thanh niên); an sinh xã hội; nông thôn mới; đô thị văn minh; môi trường, Ngày Chủ nhật xanh, xóa điểm đen ô nhiễm; hiến máu; hỗ trợ thiên tai; xã biên giới, biển đảo; “mỗi trường học một dự án phục vụ cộng đồng”",
  },
  {
    code: "NV2.5",
    label: "Tiên phong tham gia bảo vệ Tổ quốc và an ninh trật tự trên địa bàn",
    hints: "giáo dục quốc phòng an ninh; tòng quân, nghĩa vụ quân sự; “Nghĩa tình biên giới, biển đảo”; đội thanh niên xung kích, tự quản an ninh trật tự; phòng chống tội phạm, ma túy, tệ nạn; cảm hóa thanh thiếu niên chậm tiến; Thanh niên Quân đội, Thanh niên Công an",
  },
  {
    code: "NV3.1",
    label: "Trong học tập",
    hints: "“Tuổi trẻ thi đua xây dựng xã hội học tập, đẩy mạnh học tập suốt đời”; Tuần lễ học tập suốt đời; kỹ năng cho học sinh, sinh viên; sức khỏe tinh thần trong học tập; “Sinh viên 5 tốt”, “Học sinh 3 tốt”, “Học sinh 3 rèn luyện”, “Nhà giáo trẻ tiêu biểu”; mạng lưới học tập, câu lạc bộ học thuật; nghiên cứu khoa học của sinh viên; trường học thông minh, thư viện số; “Tiếp sức đến trường”; học bổng; kết nối sinh viên với doanh nghiệp, thực tập",
  },
  {
    code: "NV3.2",
    label: "Trong rèn luyện, phát triển thể chất",
    hints: "giải thể thao; câu lạc bộ thể thao; tập luyện trên môi trường số; khám sàng lọc sức khỏe; bể bơi, phổ cập bơi; phòng chống tác hại thuốc lá, rượu bia, chất kích thích; thiết chế thể thao",
  },
  {
    code: "NV3.3",
    label: "Trong nâng cao đời sống văn hóa tinh thần",
    hints: "Nghị quyết 80-NQ/TW; văn hóa, nghệ thuật, liên hoan, nhạc hội; bảo tồn bản sắc văn hóa; không gian văn hóa, vui chơi cho thanh niên; tư vấn tâm lý, sức khỏe tâm thần, sức khỏe sinh sản; kỹ năng tiền hôn nhân, giá trị gia đình",
  },
  {
    code: "NV4.1",
    label: "Công tác cán bộ Đoàn",
    hints: "kiện toàn, bố trí cán bộ; tập huấn, bồi dưỡng cán bộ Đoàn; Hội thi Bí thư Đoàn cơ sở; Giải thưởng Lý Tự Trọng; quy chế cán bộ; cơ sở dữ liệu cán bộ",
  },
  {
    code: "NV4.2",
    label: "Công tác tổ chức cơ sở Đoàn",
    hints: "củng cố tổ chức cơ sở; “Chi đoàn mạnh”; Đoàn cơ sở “3 chủ động”; sinh hoạt chi đoàn; sắp xếp tổ chức; cây tổ chức trên Phần mềm Quản lý đoàn viên; tổ chức Đoàn ở khu công nghiệp, chung cư, doanh nghiệp ngoài nhà nước",
  },
  {
    code: "NV4.3",
    label: "Công tác đoàn viên",
    hints: "kết nạp đoàn viên mới; chủ trương “1+1”; “Rèn luyện đoàn viên”; “Ngày đoàn viên”; Phần mềm Quản lý đoàn viên, thẻ đoàn viên điện tử, VNeID; đánh giá, xếp loại đoàn viên",
  },
  {
    code: "NV4.4",
    label: "Công tác kiểm tra, giám sát",
    hints: "kiểm tra, giám sát chuyên đề; Ủy ban kiểm tra; kỷ luật Đoàn; giải quyết kiến nghị, phản ánh của thanh niên",
  },
  {
    code: "NV4.5",
    label: "Công tác mở rộng mặt trận đoàn kết, tập hợp thanh niên",
    hints: "Hội Liên hiệp Thanh niên Việt Nam, Hội Sinh viên Việt Nam (đại hội, kỷ niệm, tuyên dương cán bộ Hội); “Đoàn mạnh, Hội rộng”; câu lạc bộ, đội, nhóm theo sở thích; thanh niên công nhân, dân tộc thiểu số, tôn giáo, trí thức trẻ, kiều bào; Hội đồng huấn luyện kỹ năng",
  },
  {
    code: "NV4.6",
    label: "Công tác chỉ đạo, phối hợp của Đoàn",
    hints: "ký kết chương trình phối hợp, liên tịch; hội nghị sơ kết, tổng kết, giao ban; đổi mới chế độ thông tin báo cáo; Bộ tiêu chí công tác Đoàn; thi đua khen thưởng; Kết luận 166-KL/TW",
  },
  {
    code: "NV5.1",
    label: "Công tác phụ trách Đội Thiếu niên Tiền phong Hồ Chí Minh",
    hints: "Tổng phụ trách Đội; Hội đồng Đội; chỉ huy Đội; sinh hoạt Đội; phát triển Đội trong trường ngoài công lập",
  },
  {
    code: "NV5.2",
    label: "Công tác chăm sóc, giáo dục thiếu niên, nhi đồng",
    hints: "“Thiếu nhi Việt Nam thi đua làm theo 5 điều Bác Hồ dạy”; Trung thu; sân chơi, kỹ năng, STEM cho thiếu nhi; Internet an toàn cho thiếu nhi; hỗ trợ thiếu nhi khó khăn, mồ côi",
  },
  {
    code: "NV5.3",
    label: "Công tác bảo vệ trẻ em, đại diện tiếng nói, nguyện vọng trẻ em",
    hints: "Luật Trẻ em; Hội đồng trẻ em; diễn đàn trẻ em; phòng chống xâm hại, đuối nước, tai nạn thương tích; bảo vệ trẻ em trên không gian mạng",
  },
  {
    code: "NV6.1",
    label: "Bảo vệ nền tảng tư tưởng của Đảng",
    hints: "đấu tranh, phản bác quan điểm sai trái, thù địch; lực lượng cốt cán trên không gian mạng; diễn tập bảo vệ nền tảng tư tưởng",
  },
  {
    code: "NV6.2",
    label: "Bồi dưỡng, giới thiệu đoàn viên ưu tú cho Đảng; tạo nguồn cán bộ trẻ",
    hints: "lớp cảm tình Đảng; giới thiệu đoàn viên ưu tú; đoàn viên được kết nạp Đảng; tạo nguồn cán bộ trẻ cho cấp ủy, chính quyền",
  },
  {
    code: "NV6.3",
    label: "Tham mưu chính sách; đối thoại giữa cấp ủy, chính quyền với thanh niên",
    hints: "đối thoại lãnh đạo với thanh niên; “Tháng nghe thanh niên nói”; đề xuất chính sách cho thanh thiếu nhi",
  },
  {
    code: "NV6.4",
    label: "Giám sát, phản biện xã hội, góp ý xây dựng Đảng, chính quyền",
    hints: "giám sát, phản biện; góp ý văn kiện, dự thảo chính sách; theo dõi thực hiện kiến nghị sau giám sát",
  },
];

/** 13 chỉ tiêu trọng tâm nhiệm kỳ 2026 - 2031 (CT1 - CT13) */
export const CHI_TIEU: { code: string; text: string }[] = [
  { code: "CT1", text: "100% cán bộ đoàn, đoàn viên được học tập, quán triệt và đạt yêu cầu kiểm tra, đánh giá; 80% thanh niên được tuyên truyền, phổ biến các nghị quyết của Đảng, của Đoàn, chính sách, pháp luật của Nhà nước" },
  { code: "CT2", text: "100 triệu lượt đoàn viên, thanh niên tham gia hoạt động tình nguyện do Đoàn, Hội tổ chức trong giai đoạn 2026 - 2031" },
  { code: "CT3", text: "100.000 công trình thanh niên các cấp tham gia phát triển, ứng dụng khoa học công nghệ, đổi mới sáng tạo và chuyển đổi số" },
  { code: "CT4", text: "Hằng năm, 100% đoàn xã, phường, đặc khu xóa ít nhất 01 điểm đen về ô nhiễm môi trường và duy trì bền vững kết quả" },
  { code: "CT5", text: "Hằng năm, 100% Đoàn cấp tỉnh triển khai tối thiểu 01 công trình thanh niên hỗ trợ xây dựng hoặc nâng cấp hạ tầng dân sinh tại xã, phường, đặc khu khu vực biên giới, biển đảo" },
  { code: "CT6", text: "Hằng năm, 100% Đoàn cấp xã triển khai mô hình thanh niên tham gia giữ gìn an ninh trật tự, phòng chống tội phạm tại địa phương" },
  { code: "CT7", text: "Ít nhất 80% thanh thiếu nhi tham gia các hoạt động nâng cao năng lực số và sử dụng khoa học công nghệ do Đoàn, Hội, Đội tổ chức" },
  { code: "CT8", text: "Ít nhất 750 dự án khởi nghiệp đổi mới sáng tạo của thanh niên được hỗ trợ đầu ra sản phẩm, dịch vụ" },
  { code: "CT9", text: "10 triệu thanh thiếu nhi tham gia các chương trình bồi dưỡng, nâng cao năng lực sử dụng ngoại ngữ và hội nhập quốc tế do Đoàn, Hội, Đội tổ chức" },
  { code: "CT10", text: "4 triệu thiếu nhi có hoàn cảnh khó khăn được tổ chức Đoàn, Hội, Đội các cấp hỗ trợ" },
  { code: "CT11", text: "Hằng năm, 100% thông tin đoàn viên, cán bộ đoàn các cấp được số hóa trên Phần mềm Quản lý đoàn viên" },
  { code: "CT12", text: "Tỷ lệ đoàn kết tập hợp thanh niên đạt 80%" },
  { code: "CT13", text: "50% đoàn viên xếp loại hoàn thành xuất sắc nhiệm vụ; 01 triệu đoàn viên ưu tú được giới thiệu cho Đảng xem xét kết nạp" },
];

/** 05 nhiệm vụ đột phá (DP1 - DP5) */
export const DOT_PHA: { code: string; text: string }[] = [
  { code: "DP1", text: "Đổi mới mạnh mẽ phương thức hoạt động của Đoàn phù hợp với mô hình tổ chức mới" },
  { code: "DP2", text: "Hỗ trợ nâng cao năng lực số, trí tuệ nhân tạo, khoa học công nghệ, góp phần nâng cao chất lượng nguồn nhân lực trẻ" },
  { code: "DP3", text: "Khuyến khích, hỗ trợ thanh niên khởi nghiệp, nhất là khởi nghiệp đổi mới sáng tạo gắn với phát triển kinh tế tư nhân" },
  { code: "DP4", text: "Xây dựng đội ngũ cán bộ đoàn có bản lĩnh chính trị, đạo đức, trách nhiệm, năng lực, uy tín, gần thanh niên, sát cơ sở; nâng cao chất lượng cán bộ đoàn xã, phường, đặc khu" },
  { code: "DP5", text: "Tăng cường năng lực quản lý, điều phối hoạt động tình nguyện cho đội ngũ cán bộ Đoàn, Hội Liên hiệp Thanh niên Việt Nam, Hội Sinh viên Việt Nam các cấp" },
];

/** 07 chương trình, đề án trọng điểm (DA1 - DA7) */
export const DE_AN: { code: string; text: string }[] = [
  { code: "DA1", text: "Chương trình “Giáo dục lý tưởng cách mạng, đạo đức, lối sống văn hóa cho thanh thiếu nhi trên không gian mạng giai đoạn 2022 - 2030”" },
  { code: "DA2", text: "Đề án “Phát hiện, bồi dưỡng và phát huy Tài năng trẻ Việt Nam giai đoạn 2022 - 2030”" },
  { code: "DA3", text: "Chương trình “Hỗ trợ thanh niên khởi nghiệp giai đoạn 2022 - 2030”" },
  { code: "DA4", text: "Chương trình “Hỗ trợ nâng cao năng lực ngoại ngữ và hội nhập quốc tế cho thanh thiếu nhi Việt Nam giai đoạn 2022 - 2030”" },
  { code: "DA5", text: "Chương trình “Tăng cường năng lực quản lý, điều phối hoạt động tình nguyện cho đội ngũ cán bộ Đoàn, Hội các cấp giai đoạn 2022 - 2030”" },
  { code: "DA6", text: "Đề án “Bồi dưỡng cán bộ Đoàn TNCS Hồ Chí Minh giai đoạn 2023 - 2027”" },
  { code: "DA7", text: "Đề án “Tuổi trẻ Việt Nam đồng hành với thanh thiếu nhi vùng biên giới giai đoạn 2025 - 2030”" },
];

/** R8 — các cặp dễ nhầm: xếp theo cách Báo cáo chính trị đã xếp */
export const DE_NHANG_PAIRS: { noiDung: string; dung: string; khong: string }[] = [
  { noiDung: "Tình nguyện viên số, Tổ công nghệ số cộng đồng, hỗ trợ dịch vụ công trực tuyến, VNeID, “Bình dân học vụ số”", dung: "NV2.1", khong: "NV2.4" },
  { noiDung: "Kết nối sinh viên với doanh nghiệp, thực tập, học bổng, “Tiếp sức đến trường”", dung: "NV3.1", khong: "NV2.2" },
  { noiDung: "Tư vấn hướng nghiệp, đào tạo nghề, hội thi tay nghề, việc làm cho thanh niên lao động", dung: "NV2.2", khong: "NV3.1" },
  { noiDung: "Cuộc thi, giải thưởng khoa học công nghệ, sáng tạo của sinh viên", dung: "NV2.1", khong: "NV3.1" },
  { noiDung: "Tuyên dương “Sinh viên 5 tốt”, “Học sinh 3 tốt”, “Nhà giáo trẻ tiêu biểu”; câu lạc bộ học thuật", dung: "NV3.1", khong: "NV2.1" },
  { noiDung: "Bồi dưỡng ngoại ngữ cho thanh thiếu nhi", dung: "NV2.3", khong: "NV3.1" },
  { noiDung: "Lễ kỷ niệm ngày truyền thống, đại hội, tuyên dương cán bộ của Hội LHTN, Hội Sinh viên", dung: "NV4.5", khong: "NV1.3" },
  { noiDung: "Nhạc hội, liên hoan văn nghệ của thanh niên", dung: "NV3.3", khong: "NV4.5" },
  { noiDung: "Kỷ niệm ngày lễ lớn của đất nước, của Đảng; hành trình về nguồn", dung: "NV1.3", khong: "NV3.3" },
  { noiDung: "Kết nạp đoàn viên mới", dung: "NV4.3", khong: "NV6.2" },
  { noiDung: "Lớp cảm tình Đảng, giới thiệu đoàn viên ưu tú cho Đảng", dung: "NV6.2", khong: "NV4.3" },
  { noiDung: "Phòng chống ma túy, tội phạm; an ninh trật tự; an toàn giao thông", dung: "NV2.5", khong: "NV1.5" },
  { noiDung: "Tuyên truyền pháp luật chung, tư vấn pháp lý", dung: "NV1.5", khong: "NV2.5" },
  { noiDung: "Hoạt động cho thiếu nhi do Đội, Hội đồng Đội tổ chức", dung: "NV5.x", khong: "NV2.4" },
  { noiDung: "Đoàn viên tình nguyện vì thiếu nhi (Chiến dịch “Hoa phượng đỏ”, tặng quà thiếu nhi khó khăn)", dung: "NV2.4", khong: "NV5.2" },
  { noiDung: "Áp lực học tập, sức khỏe tinh thần của học sinh, sinh viên", dung: "NV3.1", khong: "NV3.3" },
  { noiDung: "Tư vấn tâm lý, sức khỏe tinh thần chung cho thanh niên", dung: "NV3.3", khong: "NV3.1" },
  { noiDung: "Tập huấn nghiệp vụ công tác Đoàn cho cán bộ", dung: "NV4.1", khong: "—" },
  { noiDung: "Tập huấn chuyên đề lĩnh vực cho cán bộ (trí tuệ nhân tạo, kỹ năng số…)", dung: "Mục của lĩnh vực; phụ NV4.1", khong: "—" },
  { noiDung: "Ký kết chương trình phối hợp, hội nghị giao ban, sơ kết, tổng kết", dung: "NV4.6", khong: "—" },
];

export const EMPTY_SECTION_SENTENCE = "Chưa ghi nhận hoạt động trong kỳ báo cáo.";

/** Câu mở đầu bắt buộc (đúng mẫu Phụ lục 3) */
export const MO_DAU_PREFIX =
  "Thực hiện Nghị quyết Đại hội đại biểu toàn quốc Đoàn TNCS Hồ Chí Minh lần thứ XIII, nhiệm kỳ 2026 - 2031,";

export type PeriodKind = "TUAN" | "THANG" | "QUY" | "SIX_MONTH" | "NAM";

/** Tên phần IV theo kỳ: tuần tới, tháng tới, quý tới, 06 tháng cuối năm, năm tới */
export const PHUONG_HUONG_LABEL: Record<PeriodKind, string> = {
  TUAN: "PHƯƠNG HƯỚNG TUẦN TỚI",
  THANG: "PHƯƠNG HƯỚNG THÁNG TỚI",
  QUY: "PHƯƠNG HƯỚNG QUÝ TỚI",
  SIX_MONTH: "PHƯƠNG HƯỚNG 06 THÁNG CUỐI NĂM",
  NAM: "PHƯƠNG HƯỚNG NĂM TỚI",
};

export const periodKindOf = (kind: string): PeriodKind =>
  kind === "TUAN" || kind === "THANG" || kind === "QUY" || kind === "SIX_MONTH" || kind === "NAM" ? kind : "THANG";

/** Suy ra loại kỳ (tuần/tháng/quý/6 tháng/năm) từ nhãn kỳ hoặc khoảng ngày —
 *  dùng khi client không gửi periodKind để phần IV không luôn in nhãn "tháng tới". */
export function inferPeriodKind(label?: string, start?: string, end?: string): PeriodKind {
  const lower = (label ?? "").toLowerCase();
  if (/6 tháng|sáu tháng|nửa đầu năm|nửa cuối năm/.test(lower)) return "SIX_MONTH";
  if (/tuần/.test(lower)) return "TUAN";
  if (/quý/.test(lower)) return "QUY";
  if (/tháng/.test(lower)) return "THANG";
  if (/năm/.test(lower)) return "NAM";
  const toD = (s?: string): Date | null => {
    const m = (s ?? "").match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
  };
  const a = toD(start);
  const b = toD(end);
  if (a && b && b >= a) {
    const days = Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
    if (days <= 14) return "TUAN";
    if (days <= 45) return "THANG";
    if (days <= 120) return "QUY";
    if (days <= 240) return "SIX_MONTH";
    return "NAM";
  }
  return "THANG";
}

/** Quy tắc lọc R1 - R4 + gán mục R5 - R8 + gắn chỉ tiêu R9 - R10 (rút nguyên văn) */
export const R_RULES: string[] = [
  "R1 - Kỳ báo cáo: ngày diễn ra nằm ngoài kỳ thì không đưa vào phần I. Hoạt động đã diễn ra trước kỳ: trạng thái NGOAI_KY. Hoạt động diễn ra sau kỳ: trạng thái PHUONG_HUONG (viết ở phần IV). Căn cứ là NGÀY DIỄN RA, không phải ngày đăng bài.",
  "R2 - Chủ thể: chỉ nhận hoạt động do tổ chức Đoàn, Hội Liên hiệp Thanh niên, Hội Sinh viên, Hội đồng Đội hoặc thiết chế, đơn vị trực thuộc các tổ chức này chủ trì hoặc phối hợp. Bài báo không nêu vai trò của tổ chức Đoàn, Hội, Đội: trạng thái KHONG_PHAI_DOAN.",
  "R3 - Thiếu thông tin: thiếu ngày diễn ra hoặc thiếu chủ thể: trạng thái CAN_XAC_MINH, không đưa vào thân báo cáo, nêu tại phần IV và phụ lục.",
  "R4 - Trùng lặp: cùng hoạt động (cùng tên chuẩn hóa, ngày, chủ trì) từ nhiều nguồn gộp thành 01 bản ghi, giữ tất cả nguồn; số liệu lệch nhau thì lấy số của nguồn chính thức của đơn vị, không lấy trung bình.",
  "R5 - Một mục chính: mỗi hoạt động có đúng 01 mục chính (cấp tiểu mục) và được viết một lần tại mục chính; mục phụ chỉ dùng để thống kê, không viết lặp.",
  "R6 - Theo nội dung cốt lõi: phân loại theo mục đích và kết quả chính của hoạt động, không theo hình thức (hội thi, ngày hội, ra quân) hay theo dịp kỷ niệm.",
  "R7 - Tách hoạt động: một sự kiện có nhiều nội dung thuộc các mục khác nhau (khai trương công trình, ký kết, phát động, trao quà) thì tách thành nhiều bản ghi theo từng nội dung.",
  "R8 - Các cặp dễ nhầm (xếp theo cách Báo cáo chính trị đã xếp): " +
    DE_NHANG_PAIRS.map((p) => `${p.noiDung} → xếp ${p.dung}, KHÔNG xếp ${p.khong}`).join("; ") + ".",
  "R9 - Đóng góp trực tiếp: chỉ gắn chỉ tiêu, nhiệm vụ đột phá khi hoạt động tạo ra đúng đại lượng của chỉ tiêu (lượt tình nguyện, công trình khoa học công nghệ, điểm đen môi trường, dự án khởi nghiệp, thiếu nhi khó khăn được hỗ trợ…) hoặc đúng nội dung của nhiệm vụ đột phá. Không gắn theo suy đoán.",
  "R10 - Loại số liệu: mỗi số liệu có loại ket_qua, muc_tieu hoặc du_kien. Chỉ số liệu ket_qua được cộng vào tiến độ chỉ tiêu ở phần II; mục tiêu, dự kiến phải viết kèm từ “mục tiêu”, “dự kiến”. Không cộng mục tiêu với kết quả.",
];

/** Quy tắc viết mục VII */
export const VIET_RULES: string[] = [
  "Mỗi hoạt động một gạch đầu dòng; thứ tự: thời gian (Ngày dd/mm/yyyy) - chủ thể - hoạt động - mục đích - quy mô, kết quả.",
  "Tên chương trình, cuộc thi, phong trào đặt trong ngoặc kép; tên đơn vị viết đầy đủ ở lần đầu.",
  "Số liệu: chỉ dùng số có trong nguồn; số dưới 10 viết 02 chữ số (01, 05, 10); dùng dấu chấm phân cách hàng nghìn (100.000); giữ nguyên các từ “trên”, “khoảng” của nguồn.",
  "Không dùng tính từ cảm xúc (sôi nổi, ấn tượng, hoành tráng); không trích nguyên văn lời phát biểu; nêu chức danh lãnh đạo khi cần, không nêu tên người dự thi, người nhận giải.",
  "Không lặp một hoạt động ở hai mục; không viết lại mục phụ.",
  "Phần đánh giá (III): ưu điểm nêu xu hướng chung của các hoạt động trong kỳ; hạn chế nêu mục trống, thiếu số liệu, thông tin cần xác minh. Không đưa nhận định không có căn cứ.",
  "Văn phong hành chính, câu chủ động, ngắn gọn; thống nhất cách viết “TP. Hồ Chí Minh” trong thể thức và “Thành phố” trong thân báo cáo của Thành Đoàn.",
];

/** Danh mục tự kiểm tra trước khi xuất mục X */
export const TU_KIEM: string[] = [
  "Kỳ báo cáo ghi đúng ở tên báo cáo, câu mở đầu và phần IV.",
  "Không có hoạt động ngoài kỳ, không phải của tổ chức Đoàn, Hội, Đội trong phần I.",
  "Mỗi hoạt động chỉ xuất hiện một lần trong phần I.",
  "Số liệu phần II khớp số liệu phần I.",
  "Phụ lục liệt kê đủ bản ghi được đưa vào và bị loại, có nguồn.",
  "Thể thức: Times New Roman 14, lề trên 2 cm, dưới 2 cm, trái 3 cm, phải 2 cm; phụ lục khổ ngang.",
];

/* ── Nội dung giải pháp từng mục (trích Phần thứ hai V, Dự thảo lần 5 Báo cáo chính trị) — corpus RAG "học kỳ từng mục" ── */

export const GT_MUC_TEXT: Record<string, string> = {
  "NV1": "1. Công tác tuyên truyền, giáo dục — Học tập và làm theo tư tưởng, đạo đức, phong cách Hồ Chí Minh: Tổ chức học tập chuyên đề hằng năm bằng nhiều hình thức; kiểm tra, đánh giá nhận thức qua ứng dụng Thanh niên Việt Nam. Đoàn viên, thanh niên đăng ký phần việc làm theo Bác gắn với nhiệm vụ chuyên môn tại địa phương, đơn vị. Duy trì các hoạt động: tủ sách học và làm theo Bác, Nhật ký làm theo lời Bác, các cuộc thi tìm hiểu về tư tưởng, đạo đức, phong cách Hồ Chí Minh. Triển khai sinh hoạt chuyên đề vào dịp kỷ niệm ngày sinh Chủ tịch Hồ Chí Minh, gắn với thực hiện Di chúc của Người. Giáo dục lý tưởng cách mạng: Đa dạng hóa hình thức học tập, tìm hiểu, tuyên truyền về chủ nghĩa Mác - Lênin, tư tưởng Hồ Chí Minh; chủ trương, nghị quyết của Đảng, pháp luật của Nhà nước. Tổ chức nghiên cứu, quán triệt và triển khai Nghị quyết Đại hội Đảng, Đại hội Mặt trận Tổ quốc Việt Nam, Đại hội Đoàn các cấp. Tăng cường ứng dụng trí tuệ nhân tạo, dữ liệu lớn để phát triển kho tư liệu truyền thông về nền tảng tư tưởng của Đảng; phát triển nền tảng học lý luận chính trị trên ứng dụng Thanh niên Việt Nam cho đoàn viên mới kết nạp. Giáo dục truyền thống lịch sử, lòng yêu nước, tinh thần tự hào dân tộc: Tổ chức sinh hoạt chính trị cao điểm, chiến dịch truyền thông nhân kỷ niệm các ngày lễ lớn, sự kiện lịch sử của Đảng, đất nước, Đoàn, Hội, Đội. Phát huy hiệu quả Bảo tàng số tuổi trẻ Việt Nam, bản đồ số di tích lịch sử, địa chỉ đỏ; tổ chức hành trình đến di tích lịch sử, địa chỉ đỏ; duy trì hoạt động đền ơn đáp nghĩa, Thắp nến tri ân, các đội tuyên truyền viên trẻ. Ứng dụng trí tuệ nhân tạo và nền tảng số để sản xuất sản phẩm truyền thông lịch sử; triển khai Đề án “Câu chuyện thời hoa lửa” và cuộc vận động “Tự hào một dải non sông”. Giáo dục đạo đức, lối sống văn hóa: Tiếp tục Cuộc vận động “Xây dựng giá trị hình mẫu thanh niên Việt Nam thời kỳ mới”, “Mỗi ngày một tin tốt, mỗi tuần một câu chuyện đẹp”, “Ứng xử văn minh trên không gian mạng”; tổ chức các trào lưu, xu hướng tích cực trên không gian mạng. Tuyên truyền, phổ biến, giáo dục pháp luật: Định kỳ tuyên truyền về các văn bản quy phạm pháp luật mới, nhất là các luật liên quan đến thanh niên; duy trì và phát triển các mô hình tư vấn pháp lý trẻ; phát huy vai trò của thanh niên trong tham gia góp ý xây dựng, phản biện và hoàn thiện hệ thống pháp luật. Nắm bắt và định hướng dư luận xã hội trong thanh niên: Duy trì đa dạng và bảo đảm cơ chế nắm bắt, thông tin, báo cáo dư luận xã hội trong thanh niên; củng cố hoạt động của lực lượng cộng tác viên dư luận xã hội các cấp; chủ động định hướng, cung cấp thông tin chính thống. Đổi mới và đa dạng hóa phương thức tuyên truyền, giáo dục: Tăng cường ứng dụng công nghệ hiện đại, trí tuệ nhân tạo; phát triển đa dạng các trang cộng đồng và sản phẩm truyền thông số; hoàn thiện, phát triển ứng dụng “Thanh niên Việt Nam”; đề cao tính nêu gương của cán bộ đoàn; phát huy hiệu quả hệ thống thiết chế của Đoàn phục vụ công tác giáo dục toàn diện đoàn viên, thanh niên.",
  "NV2": "2. Phong trào “Tuổi trẻ Việt Nam tiên phong trong kỷ nguyên mới” — 2.1. Tiên phong phát triển khoa học công nghệ, đổi mới sáng tạo và chuyển đổi số: Đẩy mạnh triển khai Nghị quyết 57-NQ/TW và chương trình hành động của Đoàn; tổ chức các diễn đàn, cuộc thi về công nghệ, trí tuệ nhân tạo, dữ liệu lớn, blockchain; tích hợp giáo dục an ninh mạng và đạo đức số. Đẩy mạnh phong trào “Bình dân học vụ số cho thanh niên”, phổ cập kiến thức công nghệ, kỹ năng số, kỹ năng sử dụng mạng an toàn, hướng tới mục tiêu 100% thanh thiếu nhi cơ bản làm chủ công nghệ số vào năm 2030. Triển khai các mô hình “Tình nguyện viên số”, “Tổ công nghệ số cộng đồng” hỗ trợ địa phương chuyển đổi số, ưu tiên hỗ trợ doanh nghiệp nhỏ và khu vực nông thôn. Phát triển các mô hình ứng dụng khoa học công nghệ phục vụ cộng đồng do thanh niên làm nòng cốt. Kết nối, huy động đội ngũ chuyên gia trẻ thông qua Mạng lưới Trí thức trẻ Việt Nam. Phát động phong trào tình nguyện chuyển giao tri thức số, kết hợp đào tạo kỹ năng số, định hướng nghề nghiệp, giáo dục STEM. Đổi mới các cuộc thi, hội thi, giải thưởng, hoạt động khoa học, công nghệ, đổi mới sáng tạo và chuyển đổi số; kết nối thanh niên với các quỹ đầu tư, doanh nghiệp. 2.2. Tiên phong khởi nghiệp lập nghiệp, phát triển kinh tế đất nước: Tuyên truyền về vai trò của kinh tế tư nhân, kinh tế nhà nước; khơi dậy tinh thần khởi nghiệp bằng trí tuệ, đạo đức kinh doanh. Khuyến khích thanh niên khởi nghiệp trong các lĩnh vực nông nghiệp công nghệ cao, sản xuất sạch, năng lượng tái tạo, du lịch sinh thái, phát triển sản phẩm OCOP; tham gia Cuộc vận động “Người Việt Nam ưu tiên dùng hàng Việt Nam”; chú trọng biểu dương, tôn vinh thanh niên làm kinh tế giỏi, doanh nhân trẻ tiêu biểu. Tăng cường vai trò kết nối của tổ chức Đoàn hỗ trợ thanh niên tiếp cận mô hình kinh tế hiệu quả, nhà đầu tư, doanh nghiệp công nghệ; phát huy vai trò của Hội Doanh nhân trẻ Việt Nam. Đổi mới và triển khai các giải pháp tư vấn, hướng nghiệp cho học sinh; tổ chức các hoạt động tư vấn, hỗ trợ, đào tạo nghề cho thanh niên nông thôn, thanh niên khuyết tật, thanh niên hoàn lương, bộ đội, công an xuất ngũ, thanh niên xuất khẩu lao động; tổ chức các khóa tập huấn, tư vấn, đào tạo chuyên sâu nâng cao năng lực quản trị doanh nghiệp đổi mới sáng tạo; phát triển kinh tế tập thể qua mô hình hợp tác xã, tổ hợp tác, liên kết chuỗi giá trị; hỗ trợ tiếp cận vốn ưu đãi, xúc tiến thương mại, xây dựng thương hiệu. 2.3. Tiên phong hội nhập quốc tế: Tổ chức quán triệt, triển khai Nghị quyết số 59-NQ/TW của Bộ Chính trị; xây dựng bản tin hội nhập, “Sổ tay đối ngoại thanh niên”. Tăng cường quan hệ hữu nghị và hợp tác quốc tế; mở rộng quan hệ đối ngoại với tổ chức thanh niên các nước. Tổ chức các cuộc thi, sân chơi ngoại ngữ với nhiều hình thức; tổ chức các chương trình giao lưu, kết nối, hỗ trợ thanh niên, du học sinh; phát huy vai trò của các tổ chức Đoàn, Hội Thanh niên - Sinh viên Việt Nam ở nước ngoài. Tích cực triển khai công tác dự án, chủ động hợp tác, vận động nguồn lực tài chính và chuyên môn hỗ trợ của các tổ chức quốc tế. Tổ chức các lớp tập huấn, đào tạo chuyên sâu cho cán bộ Đoàn về kỹ năng ngoại giao thanh niên, giao tiếp liên văn hóa. 2.4. Tiên phong trong các hoạt động tình nguyện vì cộng đồng: Tăng cường năng lực tổ chức và điều phối hoạt động tình nguyện theo hướng chuyên nghiệp, hiệu quả và bền vững; xây dựng, vận hành hệ thống dữ liệu tình nguyện quốc gia. Thực hiện chủ trương “đa liên kết”; đa dạng nội dung, phương thức hoạt động tình nguyện thường xuyên, tại chỗ; đẩy mạnh hoạt động tình nguyện dưới dạng dự án hoặc chiến dịch chuyên đề có mục tiêu, lộ trình, chỉ tiêu rõ ràng; thực hiện mỗi trường học có một dự án phục vụ cộng đồng. Chú trọng tổ chức hoạt động tình nguyện tại 248 xã, phường biên giới, vùng đặc biệt khó khăn, biển đảo; xây dựng các đội hình trí thức trẻ tình nguyện theo lĩnh vực; hoạt động tình nguyện xây dựng nông thôn mới, đô thị văn minh, bảo vệ môi trường, ứng phó biến đổi khí hậu; triển khai các chương trình, chiến dịch an sinh xã hội hướng tới trẻ em khó khăn, người già neo đơn, thanh niên yếu thế. 2.5. Tiên phong tham gia bảo vệ Tổ quốc và an ninh trật tự trên địa bàn: Giáo dục, nâng cao nhận thức về nhiệm vụ quốc phòng, an ninh; phối hợp tuyên truyền, vận động thanh niên thực hiện nghĩa vụ quân sự, nghĩa vụ công an nhân dân; tư vấn, đào tạo nghề, giới thiệu việc làm cho đoàn viên thanh niên hoàn thành nghĩa vụ. Triển khai phong trào “Thanh niên Quân đội 3 tiên phong quyết thắng”, thi đua “Ba nhất” của Thanh niên Công an. Triển khai hiệu quả Cuộc vận động “Nghĩa tình biên giới, biển đảo”; phát triển mô hình thanh niên làm kinh tế tại khu vực biên giới, biển đảo. Duy trì và nhân rộng mô hình đội thanh niên tự quản, đội thanh niên xung kích giữ gìn an ninh trên địa bàn dân cư; phối hợp phòng chống, kéo giảm tội phạm, ma túy, mại dâm, tệ nạn xã hội trong thanh thiếu niên; giáo dục, cảm hóa, hỗ trợ thanh thiếu niên chậm tiến.",
  "NV3": "3. Chương trình “Phát triển toàn diện thanh niên Việt Nam” — 3.1. Trong học tập: Triển khai hiệu quả phong trào “Tuổi trẻ thi đua xây dựng xã hội học tập, đẩy mạnh học tập suốt đời”; đổi mới nội dung, đa dạng hóa các phương thức huấn luyện kỹ năng cho thanh thiếu nhi; triển khai các hoạt động tư vấn, hỗ trợ sức khỏe tinh thần và kỹ năng xử lý áp lực trong học tập cho học sinh, sinh viên; nâng cao chất lượng tuyên dương “Sinh viên 5 tốt”, “Học sinh 3 tốt”, “Học sinh 3 rèn luyện”, “Nhà giáo trẻ tiêu biểu”. Mở rộng các sân chơi khuyến khích thanh niên chủ động cập nhật tri thức mới, kỹ năng số, ngoại ngữ; xây dựng các mạng lưới học tập chuyên ngành, câu lạc bộ, diễn đàn thanh niên theo ngành học; hỗ trợ xây dựng mô hình trường học thông minh, lớp học số, thư viện số. Triển khai đồng bộ, hiệu quả chương trình “Tiếp sức đến trường”; nhân rộng các mô hình hỗ trợ học sinh, sinh viên, giảng viên trẻ học tập, nghiên cứu khoa học; phát triển các quỹ, học bổng và giải thưởng; đẩy mạnh kết nối sinh viên với doanh nghiệp, mở rộng cơ hội thực tập, trải nghiệm nghề nghiệp. Tham gia xây dựng, hoàn thiện chính sách hỗ trợ thanh niên học tập. 3.2. Trong rèn luyện, phát triển thể chất: Đẩy mạnh tuyên truyền về vai trò rèn luyện thể chất, lối sống lành mạnh; về tác hại của ma túy, rượu bia, thuốc lá và các chất kích thích. Duy trì và phát triển các mô hình nâng cao thể lực, tầm vóc thanh niên; tổ chức các giải thể thao quy mô, hiện đại, hội nhập quốc tế; đa dạng hóa các loại hình thể dục, thể thao; duy trì các câu lạc bộ, đội, nhóm thể thao; đẩy mạnh các phong trào rèn luyện thể thao trên môi trường số. Tăng cường phát hiện, bồi dưỡng tài năng trẻ lĩnh vực thể dục, thể thao; tổ chức khám sàng lọc sức khỏe; tham mưu xây dựng, cải tạo và phát huy hiệu quả các thiết chế văn hóa, thể thao, đặc biệt là không gian văn hóa, thể thao công cộng. 3.3. Trong nâng cao đời sống văn hóa tinh thần: Tổ chức quán triệt, triển khai Nghị quyết số 80-NQ/TW của Bộ Chính trị; tuyên truyền xây dựng nếp sống văn hóa, văn minh, tiến bộ; nâng cao nhận thức về chăm sóc sức khỏe tinh thần; tuyên truyền kiến thức, kỹ năng tiền hôn nhân, giá trị gia đình. Đa dạng hóa các loại hình hoạt động văn hóa, nghệ thuật; tổ chức các sân chơi, cuộc thi, liên hoan nghệ thuật phát hiện, bồi dưỡng tài năng trẻ; chú trọng các hoạt động tôn vinh bản sắc văn hóa các dân tộc; mở rộng không gian văn hóa, nghệ thuật, đặc biệt tại khu công nghiệp, vùng sâu, vùng xa, biên giới, hải đảo. Tổ chức các hoạt động hỗ trợ chăm sóc sức khỏe tâm thần, sức khỏe sinh sản; xây dựng và duy trì mạng lưới tư vấn tâm lý cho thanh niên, nhất là nhóm dễ tổn thương. Tham mưu, đề xuất các chính sách chăm lo đời sống văn hóa, tinh thần cho thanh niên công nhân, thanh niên vùng khó khăn, dân tộc thiểu số.",
  "NV4": "4. Công tác xây dựng Đoàn, mở rộng mặt trận đoàn kết tập hợp thanh niên — 4.1. Công tác cán bộ Đoàn: Xây dựng đội ngũ cán bộ Đoàn các cấp có bản lĩnh chính trị vững vàng, phẩm chất đạo đức trong sáng, tinh thần trách nhiệm cao, năng lực công tác thực tiễn, uy tín; tiên phong, gương mẫu; có khả năng dẫn dắt; tập trung đào tạo cán bộ Đoàn ở xã, phường, đặc khu. Thực hiện nghiêm các quy định về tiêu chuẩn cán bộ đoàn theo Quy chế cán bộ Đoàn sửa đổi; xây dựng đội ngũ cán bộ Đoàn có tư duy đổi mới, thích ứng chuyển đổi số và mô hình tổ chức tinh gọn; xây dựng cơ sở dữ liệu cán bộ đoàn toàn quốc tích hợp trên Phần mềm Quản lý đoàn viên; tham mưu chế độ, chính sách cho cán bộ đoàn, đặc biệt khối địa bàn dân cư. 4.2. Công tác tổ chức cơ sở Đoàn: Củng cố và nâng cao chất lượng tổ chức cơ sở Đoàn, trọng tâm xây dựng “Chi đoàn mạnh” và Đoàn cơ sở “3 chủ động”; đổi mới nội dung, phương thức hoạt động sau sắp xếp tổ chức bộ máy; nâng cao chất lượng sinh hoạt chi đoàn, tăng cường ứng dụng công nghệ số; thường xuyên rà soát, chuẩn hóa cây tổ chức trên Phần mềm Quản lý đoàn viên; duy trì và phát triển tổ chức đoàn ở khu chung cư, khu nhà trọ, đơn vị hành chính kinh tế đặc biệt, khu vực doanh nghiệp ngoài nhà nước, khu công nghiệp, khu chế xuất. 4.3. Công tác đoàn viên: Nâng cao chất lượng đoàn viên cả về bản lĩnh chính trị, đạo đức, năng lực hành động và trách nhiệm xã hội; thực hiện nghiêm quy trình, thủ tục kết nạp đoàn viên mới theo hướng chú trọng chất lượng, đa dạng hóa nguồn kết nạp, không chạy theo số lượng; đẩy mạnh chủ trương “1+1”; thực hiện hiệu quả chương trình “Rèn luyện đoàn viên”; nâng cao hiệu quả tổ chức “Ngày đoàn viên”. Chuẩn hóa dữ liệu đoàn viên trên Phần mềm Quản lý đoàn viên “đúng - đủ - sạch - sống”, liên thông với ứng dụng VNeID; tăng cường sử dụng sổ đoàn viên và thẻ đoàn viên điện tử. 4.4. Công tác kiểm tra, giám sát: Tăng cường lãnh đạo, chỉ đạo công tác kiểm tra, giám sát và thi hành kỷ luật của Đoàn; kiện toàn bộ máy và phát huy vai trò của Ủy ban kiểm tra các cấp; kiểm tra, giám sát theo chuyên đề; xử lý nghiêm minh vi phạm quy định của Đảng, Nhà nước và Điều lệ Đoàn; chú trọng giám sát việc tiếp nhận, giải quyết kiến nghị, phản ánh chính đáng của thanh niên. 4.5. Công tác mở rộng mặt trận đoàn kết, tập hợp thanh niên: Kiên trì phương châm “Đoàn mạnh, Hội rộng”, xây dựng Hội Liên hiệp Thanh niên Việt Nam và Hội Sinh viên Việt Nam vững mạnh; phát triển các mô hình tập hợp thanh niên theo sở thích, ngành nghề qua câu lạc bộ, tổ, đội, nhóm; tinh thần “không để thanh niên nào đứng ngoài tổ chức Đoàn, Hội”; tăng cường vận động thanh niên đặc thù (công nhân, dân tộc thiểu số, tín đồ tôn giáo, doanh nhân trẻ, trí thức trẻ, kiều bào); hỗ trợ thanh niên Việt Nam ở nước ngoài; nâng cao chất lượng Hội đồng huấn luyện kỹ năng các cấp. 4.6. Công tác chỉ đạo, phối hợp của Đoàn: Đổi mới công tác chỉ đạo, phương thức hoạt động phù hợp mô hình tổ chức bộ máy mới; lấy thanh niên làm trung tâm; đẩy mạnh ứng dụng công nghệ, chuyển đổi số trong chỉ đạo, điều hành; áp dụng công thức 3 Dễ - 3 Rõ - 3 Đo; mục tiêu “mỗi quý một kết quả lớn”, “mỗi năm hai đột phá”. Đổi mới chế độ thông tin, báo cáo; đổi mới Bộ Tiêu chí công tác đoàn; đổi mới thi đua khen thưởng. Tiếp tục phối hợp, triển khai hiệu quả các chương trình phối hợp, nghị quyết liên tịch; thực hiện Kết luận số 166-KL/TW ngày 10/6/2025 của Bộ Chính trị về nâng cao hiệu quả thực hiện Nghị quyết số 25-NQ/TW.",
  "NV5": "5. Công tác phụ trách Đội TNTP Hồ Chí Minh, bảo vệ, chăm sóc, giáo dục thiếu niên, nhi đồng — Quan điểm: dành những điều kiện tốt nhất, sự chăm lo chu đáo nhất cho trẻ em; phương châm “Xây dựng Đội là xây dựng Đoàn trước một bước”. Công tác phụ trách Đội Thiếu niên Tiền phong Hồ Chí Minh: củng cố và nâng cao chất lượng công tác cán bộ phụ trách Đội trong tình hình mới; nâng cao chất lượng công tác đội viên, nhi đồng và cán bộ chỉ huy Đội thông qua đổi mới nội dung, phương thức sinh hoạt Đội; đẩy mạnh ứng dụng công nghệ thông tin và nền tảng số vào các hoạt động Đội; tăng cường hiệu quả hoạt động của Hội đồng Đội cấp xã; kiện toàn tổ chức, nhân sự, cơ chế phối hợp giữa Hội đồng Đội và chính quyền, các tổ chức chính trị - xã hội; quan tâm phát triển tổ chức Đội trong các trường ngoài công lập. Công tác chăm sóc, giáo dục thiếu niên, nhi đồng: triển khai sâu rộng phong trào “Thiếu nhi Việt Nam thi đua làm theo 5 điều Bác Hồ dạy” và các phong trào, chương trình, cuộc vận động của Đội; triển khai hiệu quả các chương trình giáo dục trang bị ngoại ngữ, kỹ năng thực hành xã hội, trải nghiệm sáng tạo, các sân chơi văn hóa, thể thao, nghệ thuật, sáng tạo, STEM; hướng dẫn thiếu nhi khai thác, sử dụng Internet an toàn; quan tâm sâu sắc thiếu nhi có hoàn cảnh khó khăn, khuyết tật, mồ côi, chịu ảnh hưởng thiên tai, dịch bệnh; xây dựng, nhân rộng các mô hình hỗ trợ thiếu nhi khó khăn bền vững. Công tác bảo vệ trẻ em, đại diện tiếng nói, nguyện vọng trẻ em: phát huy vai trò lực lượng nòng cốt chính trị trong công tác bảo vệ trẻ em, thực hiện các giải pháp triển khai Luật Trẻ em năm 2016; chủ động đề xuất, phối hợp triển khai các giải pháp bảo vệ trẻ em, đặc biệt trên không gian mạng; phát triển các mô hình phát huy quyền tham gia của trẻ em, tổ chức tập huấn cho thành viên Hội đồng trẻ em các cấp; tổ chức đồng bộ các hoạt động trang bị kỹ năng phòng, chống xâm hại, đuối nước, tai nạn thương tích, bạo lực học đường cho trẻ em.",
  "NV6": "6. Công tác tham gia xây dựng, bảo vệ Đảng và hệ thống chính trị — Thực hiện có hiệu quả nhiệm vụ bảo vệ nền tảng tư tưởng của Đảng, kiên quyết đấu tranh, phản bác các luận điệu xuyên tạc của các thế lực thù địch với phương châm “Nhận thức đúng, thông tin đủ, hành động nhanh, kết nối mạnh, lan toả rộng”; củng cố, kiện toàn lực lượng cốt cán thực hiện nhiệm vụ trên không gian mạng; chủ động xây dựng, kết nối đồng bộ các nền tảng, trang cộng đồng nhằm nâng cao hiệu quả định hướng dư luận. Tập trung các giải pháp phát hiện, lựa chọn, bồi dưỡng và giới thiệu đoàn viên ưu tú cho Đảng, đặc biệt đối tượng công nhân trực tiếp sản xuất, sinh viên, thanh niên nông thôn, dân tộc thiểu số, cán bộ đoàn cơ sở; xây dựng quy trình, tiêu chuẩn cụ thể để lựa chọn, bồi dưỡng, giới thiệu đoàn viên ưu tú; phấn đấu hoàn thành chỉ tiêu kết nạp đảng viên mới từ đoàn viên do cấp ủy giao; chú trọng đào tạo, bồi dưỡng, tạo nguồn cán bộ trẻ chất lượng cao bổ sung cho cấp ủy đảng, chính quyền và tổ chức chính trị - xã hội. Chủ động, sáng tạo, kiên trì tham mưu, đề xuất với Đảng, Nhà nước các chủ trương, chính sách đối với thanh thiếu nhi; tham mưu tổ chức cơ chế đối thoại giữa cấp ủy, chính quyền các cấp với thanh niên; tổ chức “Tháng nghe thanh niên nói” trong Tháng Thanh niên hằng năm. Đổi mới, nâng cao chất lượng công tác giám sát, phản biện xã hội, góp ý xây dựng Đảng, chính quyền; tập trung góp ý các chính sách, pháp luật liên quan đến thanh niên; xây dựng nền tảng tiếp nhận ý kiến, phản hồi của thanh thiếu nhi trên Ứng dụng Thanh niên Việt Nam; tăng cường kiểm tra, theo dõi thực hiện kết luận, kiến nghị sau giám sát.",
};

/* ── Mẫu báo cáo đầu ra (Phụ lục 3 + bản đầy đủ thể thức) — đối chiếu đúng định dạng ── */

export const MAMU_OUT = `BÁO CÁO
kết quả công tác Đoàn và phong trào thanh thiếu nhi
tuần từ ngày 06/10/2026 đến ngày 12/10/2026

Thực hiện Nghị quyết Đại hội đại biểu toàn quốc Đoàn TNCS Hồ Chí Minh lần thứ XIII, nhiệm kỳ 2026 - 2031, Ban Thường vụ Thành Đoàn TP. Hồ Chí Minh báo cáo kết quả công tác Đoàn và phong trào thanh thiếu nhi tuần từ ngày 06/10/2026 đến ngày 12/10/2026 như sau:

I. KẾT QUẢ THỰC HIỆN NHIỆM VỤ, GIẢI PHÁP

1. Công tác tuyên truyền, giáo dục

Học tập và làm theo tư tưởng, đạo đức, phong cách Hồ Chí Minh: Ngày 11/10/2026, Đoàn phường Vũng Tàu phối hợp với Nhà Văn hóa Thanh niên Bà Rịa - Vũng Tàu xây dựng không gian văn hóa Hồ Chí Minh, trao tặng tủ sách cho thanh niên, lan tỏa văn hóa đọc, khuyến khích tinh thần tự học theo tấm gương Chủ tịch Hồ Chí Minh.

2. Phong trào “Tuổi trẻ Việt Nam tiên phong trong kỷ nguyên mới”

2.1. Tiên phong phát triển khoa học công nghệ, đổi mới sáng tạo và chuyển đổi số

- Ngày 10/10/2026, tại Trường Đại học Khoa học tự nhiên, ĐHQG TP.HCM, Thành Đoàn - Hội Sinh viên Việt Nam Thành phố khởi động Tuần lễ “Sinh viên thành phố Vươn mình thời đại số” năm 2026, triển khai Nghị quyết số 57-NQ/TW của Bộ Chính trị, hưởng ứng Ngày Chuyển đổi số quốc gia và Tuần lễ học tập suốt đời năm 2026. Tuần lễ đặt mục tiêu 100.000 sinh viên tham gia các hoạt động nâng cao kỹ năng số, 10.000 sinh viên được hướng dẫn nghiên cứu khoa học, truyền cảm hứng đổi mới sáng tạo.

- Bàn giao 01 công trình thiết bị cảnh báo tai nạn giao thông cho Hội Sinh viên Trường Đại học Khoa học tự nhiên để vận hành thí điểm, dự kiến triển khai tại các phường, xã, đặc khu trong Chiến dịch Xuân tình nguyện năm 2027.

- Ngày 11/10/2026, Đoàn phường Vũng Tàu ra mắt 01 Đội hình thanh niên hỗ trợ người dân sử dụng dịch vụ, ứng dụng số; phát động đợt cao điểm hỗ trợ phát triển kinh tế số trên địa bàn.

2.2. Tiên phong khởi nghiệp lập nghiệp, phát triển kinh tế đất nước

- Ngày 10/10/2026, Hội Liên hiệp Thanh niên Việt Nam Thành phố phối hợp với Trung tâm Dịch vụ việc làm Thanh niên Thành phố tổ chức chung kết Hội thi tay nghề làm bánh lần I với chủ đề “Tinh hoa nghệ thuật làm bánh”, chào mừng 70 năm Ngày truyền thống Hội Liên hiệp Thanh niên Việt Nam. Hội thi thu hút trên 500 thí sinh đăng ký, chọn 30 thí sinh vào chung kết; trao giải bảng không chuyên, bảng chuyên nghiệp và giải “Tỏa sáng cùng đam mê”, góp phần nâng cao tay nghề, định hướng nghề nghiệp cho thanh niên.

3. Chương trình “Phát triển toàn diện thanh niên Việt Nam”

3.1. Trong học tập

- Ngày 11/10/2026, Đoàn phường Vũng Tàu phối hợp với Nhà Văn hóa Thanh niên Bà Rịa - Vũng Tàu phát động “Tuần lễ học tập suốt đời” theo tấm gương Chủ tịch Hồ Chí Minh; Thường trực Thành Đoàn định hướng đoàn viên, thanh niên đẩy mạnh tự học, làm chủ công nghệ số và trí tuệ nhân tạo; trao quà cho học sinh.

3.2. Trong rèn luyện, phát triển thể chất

- Ngày 11/10/2026, khai trương hồ bơi di động tại phường Vũng Tàu, tạo thêm điều kiện cho thanh thiếu nhi rèn luyện thể chất.

3.3. Trong nâng cao đời sống văn hóa tinh thần

- Ngày 11/10/2026, khai trương “Phố quà tặng Thanh niên” và “Bến đỗ Thanh niên” tại phường Vũng Tàu, mở rộng không gian sinh hoạt, vui chơi, giải trí và kết nối cộng đồng cho thanh niên.

4. Công tác xây dựng Đoàn, mở rộng mặt trận đoàn kết tập hợp thanh niên

4.6. Công tác chỉ đạo, phối hợp của Đoàn

- Ngày 11/10/2026, Nhà Văn hóa Thanh niên Bà Rịa - Vũng Tàu và Đoàn phường Vũng Tàu ký kết chương trình phối hợp tổ chức các hoạt động thanh niên.

5. Công tác phụ trách Đội TNTP Hồ Chí Minh, bảo vệ, chăm sóc, giáo dục thiếu niên, nhi đồng

Chưa ghi nhận hoạt động trong kỳ báo cáo.

6. Công tác tham gia xây dựng, bảo vệ Đảng và hệ thống chính trị

Chưa ghi nhận hoạt động trong kỳ báo cáo.

II. KẾT QUẢ GẮN VỚI CHỈ TIÊU, NHIỆM VỤ ĐỘT PHÁ NHIỆM KỲ 2026 - 2031

01 | Chỉ tiêu 3 - Công trình thanh niên tham gia phát triển, ứng dụng khoa học công nghệ, đổi mới sáng tạo và chuyển đổi số | 01 công trình thiết bị cảnh báo tai nạn giao thông được bàn giao, vận hành thí điểm.
02 | Chỉ tiêu 7 - Thanh thiếu nhi tham gia hoạt động nâng cao năng lực số | Khởi động Tuần lễ “Sinh viên thành phố Vươn mình thời đại số” (mục tiêu 100.000 sinh viên); ra mắt 01 đội hình thanh niên hỗ trợ người dân sử dụng dịch vụ số. Chưa có số liệu kết quả.
03 | Nhiệm vụ đột phá 2 - Hỗ trợ nâng cao năng lực số, trí tuệ nhân tạo, khoa học công nghệ | Tuần lễ “Sinh viên thành phố Vươn mình thời đại số”; 01 công trình ứng dụng khoa học công nghệ; 01 đội hình hỗ trợ dịch vụ số.

III. ĐÁNH GIÁ CHUNG

Ưu điểm: Các hoạt động trong kỳ tập trung vào nhiệm vụ đột phá nâng cao năng lực số cho thanh niên, gắn với Ngày Chuyển đổi số quốc gia và Tuần lễ học tập suốt đời năm 2026; nhiều hoạt động được tổ chức tại cơ sở, chào mừng 70 năm Ngày truyền thống Hội Liên hiệp Thanh niên Việt Nam.

Hạn chế: Thông tin trong kỳ chưa phản ánh các nội dung tình nguyện vì cộng đồng, hội nhập quốc tế, bảo vệ Tổ quốc, công tác Đội và tham gia xây dựng Đảng; phần lớn hoạt động chưa có số liệu về lượt đoàn viên, thanh niên tham gia, chưa đủ căn cứ cập nhật tiến độ thực hiện chỉ tiêu.

IV. PHƯƠNG HƯỚNG TUẦN TỚI (TỪ NGÀY 13/10/2026 ĐẾN NGÀY 19/10/2026)

- Tổ chức các hoạt động kỷ niệm 70 năm Ngày truyền thống Hội Liên hiệp Thanh niên Việt Nam (15/10/1956 - 15/10/2026): Nhạc hội Thanh niên Thành phố lần 1 năm 2026 “Thanh âm Lên đàng” ngày 17 - 18/10/2026 tại phố đi bộ Nguyễn Huệ, phường Sài Gòn; tuyên dương “Thủ lĩnh thanh niên tiêu biểu” giai đoạn 2021 - 2026 ngày 18/10/2026.

- Tiếp tục triển khai Tuần lễ “Sinh viên thành phố Vươn mình thời đại số” năm 2026; tổng hợp số liệu kết quả.

- Xác minh thời gian tổ chức Ngày hội kết nối thực tập “Internship Fair 2026” để cập nhật vào báo cáo.

Nơi nhận:
- Ban Bí thư Trung ương Đoàn (để báo cáo);
- Thường trực Thành ủy (để báo cáo);
- Lưu VP.

TM. BAN THƯỜNG VỤ THÀNH ĐOÀN
BÍ THƯ
(bỏ trống dòng ký tên, họ tên người ký)`;

/* ── System prompt đầy đủ cho nháp báo cáo — dựng từ dữ liệu trên, đúng 100% đặc tả ── */

export function buildBaoCaoSystemPrompt(): string {
  const groups = NV_GROUPS.map((g) => `${g.num}. ${g.title}`).join("\n");
  const subs = NV_SUBS.map((s) => `- ${s.code}: ${s.label} — dấu hiệu: ${s.hints}`).join("\n");
  const ct = CHI_TIEU.map((c) => `- ${c.code}: ${c.text}`).join("\n");
  const dp = DOT_PHA.map((d) => `- ${d.code}: ${d.text}`).join("\n");
  const da = DE_AN.map((d) => `- ${d.code}: ${d.text}`).join("\n");

  return [
    "Bạn là AI agent tổng hợp báo cáo công tác Đoàn và phong trào thanh thiếu nhi theo khung nhiệm vụ, giải pháp nhiệm kỳ 2026 - 2031, chạy trên hệ thống báo cáo trực tuyến 4 cấp (đoàn cấp trường → đoàn cấp xã → đoàn cấp tỉnh → Trung ương Đoàn), phục vụ kỳ báo cáo tuần, tháng, quý, 06 tháng, năm. Chỉ xuất VĂN BẢN thuần (plain text), KHÔNG markdown, KHÔNG dấu *, KHÔNG ký tự #.",
    "",
    "NGUYÊN TẮC: (1) Đúng khung — thân báo cáo bám 06 nhóm nhiệm vụ, giải pháp và số hiệu tiểu mục của Báo cáo chính trị; (2) Đúng sự thật — mọi câu, mọi số liệu truy xuất được về ít nhất 01 bản ghi đầu vào, KHÔNG suy diễn, KHÔNG tự thêm số liệu; (3) Đúng kỳ, đúng chủ thể — chỉ đưa hoạt động diễn ra trong kỳ và do tổ chức Đoàn, Hội, Đội chủ trì hoặc phối hợp; (4) Người duyệt cuối cùng là cán bộ phụ trách — nội dung cần xác minh phải được đánh dấu.",
    "",
    "QUY TRÌNH: (1) Lọc từng bản ghi theo R1-R4; (2) Gán mục chính theo R5-R8; (3) Gắn chỉ tiêu/đột phá theo R9-R10; (4) Viết theo quy tắc viết; (5) Lắp khung đề cương; (6) Tự kiểm trước khi trả.",
    "",
    "QUY TẮC LỌC VÀ PHÂN LOẠI:",
    ...R_RULES,
    "",
    "KHUNG ĐỀ CƯƠNG BẮT BUỘC (áp dụng chung mọi cấp, mọi kỳ; đúng thứ tự, đúng tên phần):",
    "• Khối thể thức đầu văn bản (bảng 2 ô chuẩn 100% theo 29-HD/TWĐTN-VP & Mẫu 3):",
    "  - Ô bên trái: Dòng 1 ghi tên tổ chức Đoàn cấp trên trực tiếp (nếu có, ví dụ “THÀNH ĐOÀN TP. HỒ CHÍ MINH” hoặc “QUẬN ĐOÀN 1”); dòng 2 ghi tên cơ quan ban hành (IN HOA, ĐỨNG, ĐẬM, cỡ 14: “BCH ĐOÀN ...” hoặc “BAN THƯỜNG VỤ ...”); dưới có ba dấu sao “***” canh giữa; dòng dưới cùng ghi số và ký hiệu: “Số:     -BC/ĐTN” (để trống số thứ tự).",
    "  - Ô bên phải: Dòng 1 ghi tiêu đề “ĐOÀN TNCS HỒ CHÍ MINH” (IN HOA, ĐỨNG, ĐẬM, cỡ 15); phía dưới có ĐƯỜNG KẺ NGANG nét liền độ dài bằng đúng độ dài dòng chữ “ĐOÀN TNCS HỒ CHÍ MINH”; dòng tiếp theo (ngang hàng số ký hiệu) ghi địa danh ngày tháng nghiêng cỡ 13: “[Địa danh], ngày ... tháng ... năm ...”.",
    "• Tên báo cáo giữa trang, 3 dòng: “BÁO CÁO” / “kết quả công tác Đoàn và phong trào thanh thiếu nhi” / “<tên kỳ> từ ngày <dd/mm/yyyy> đến ngày <dd/mm/yyyy>”.",
    "• MỞ ĐẦU đúng 01 câu, KHÔNG thêm đánh giá, bắt đầu: “" + MO_DAU_PREFIX + "” tiếp theo là cơ quan ban hành + tên đơn vị báo cáo + “báo cáo kết quả công tác Đoàn và phong trào thanh thiếu nhi <tên kỳ> từ ngày … đến ngày … như sau:”.",
    "• Phần “I. KẾT QUẢ THỰC HIỆN NHIỆM VỤ, GIẢI PHÁP” — 06 mục lớn LUÔN CÓ, đúng thứ tự và đúng tên:",
    groups,
    "  Trình bày: mục 1, 5, 6 viết thành ĐOẠN, mỗi đoạn mở đầu bằng NHÃN nội dung in theo tên tiểu mục của Báo cáo chính trị rồi dấu hai chấm (ví dụ “Học tập và làm theo tư tưởng, đạo đức, phong cách Hồ Chí Minh: …”), KHÔNG hiện số hiệu NV1.x/NV5.x/NV6.x trong văn bản; mục 2, 3, 4 dùng TIỂU MỤC CÓ SỐ HIỆU (ví dụ “2.1. Tiên phong phát triển khoa học công nghệ, đổi mới sáng tạo và chuyển đổi số”), mỗi hoạt động một gạch đầu dòng “- ”. Tiểu mục chỉ có khi có hoạt động (mục có hoạt động chỉ liệt kê đúng các tiểu mục có hoạt động, giữ nguyên số hiệu). MỤC LỚN nào không có hoạt động ghi đúng câu: “" + EMPTY_SECTION_SENTENCE + "”.",
    "• Phần “II. KẾT QUẢ GẮN VỚI CHỈ TIÊU, NHIỆM VỤ ĐỘT PHÁ NHIỆM KỲ 2026 - 2031” — bảng 3 cột: STT (01, 02…) | Chỉ tiêu, nhiệm vụ đột phá (viết “Chỉ tiêu 3 - …” hoặc “Nhiệm vụ đột phá 2 - …”) | Kết quả trong kỳ (số liệu ket_qua của các hoạt động đóng góp trực tiếp, nêu rõ hoạt động nào tạo ra; nếu hoạt động mới phát động thì ghi “Chưa có số liệu kết quả.”). Chỉ liệt kê chỉ tiêu, nhiệm vụ đột phá CÓ hoạt động đóng góp TRỰC TIẾP trong kỳ — KHÔNG gắn khi hoạt động không tạo ra đúng đại lượng của chỉ tiêu (ví dụ kết nạp đoàn viên mới KHÔNG phải số liệu của CT13, hội thi tin học của học sinh mới tính CT7 khi đúng đối tượng thanh thiếu nhi…); trình bày mỗi hàng một khối, cột phân cách bằng dấu “|”. Không đưa mục tiêu/dự kiến vào kết quả — phải viết kèm từ “mục tiêu”, “dự kiến”.",
    "• Phần “III. ĐÁNH GIÁ CHUNG” — 2 đoạn: “Ưu điểm: …” (xu hướng chung từ hoạt động trong kỳ) và “Hạn chế: …” (mục trống, thiếu số liệu, nội dung cần xác minh). Không nhận định không có căn cứ.",
    "• Phần “IV. PHƯƠNG HƯỚNG <TUẦN TỚI/THÁNG TỚI/QUÝ TỚI/06 THÁNG CUỐI NĂM/NĂM TỚI> (TỪ NGÀY … ĐẾN NGÀY …)” — gạch đầu dòng các hoạt động sắp diễn ra (trạng thái PHUONG_HUONG) và việc cần xác minh, bổ sung (trạng thái CAN_XAC_MINH). Nếu trống ghi đúng câu: “" + EMPTY_SECTION_SENTENCE + "”.",
    "• Phần “V. ĐỀ XUẤT, KIẾN NGHỊ” — CHỈ có khi đầu vào có đề xuất, kiến nghị; KHÔNG có đề xuất thì bỏ hẳn phần này (không xuất tiêu đề, không ghi câu thay thế).",
    "• Kết: “Nơi nhận:” + gạch đầu dòng cấp trên trực tiếp (để báo cáo), cơ quan địa phương (để phối hợp/c báo cáo), “Lưu: VT.”; rồi “TM. BAN CHẤP HÀNH ĐOÀN <TÊN ĐƠN VỊ>” (hoặc TM. BAN THƯỜNG VỤ với cấp tỉnh trở lên), chức danh “BÍ THƯ”, để TRỐNG dòng ký tên và họ tên người ký.",
    "• PHỤ LỤC (bắt buộc, sau nơi nhận): “PHỤ LỤC — Danh mục hoạt động, nguồn tin và kết quả phân loại”: bảng I “Hoạt động được đưa vào báo cáo” (STT | hoạt động | ngày | mục chính (phụ: …) | nguồn), bảng II “Hoạt động không đưa vào thân báo cáo” (STT | hoạt động | xử lý: NGOAI_KY/KHONG_PHAI_DOAN/CAN_XAC_MINH/PHUONG_HUONG | nguồn). Cột phân cách bằng “|”, khổ ngang khi in.",
    "",
    "BỘ MÃ ĐẦU MỤC (28 tiểu mục — dấu hiệu nhận diện để gán mục chính):",
    subs,
    "",
    "13 CHỈ TIÊU TRỌNG TÂM NHIỆM KỲ 2026 - 2031:",
    ct,
    "",
    "05 NHIỆM VỤ ĐỘT PHÁ:",
    dp,
    "",
    "07 CHƯƠNG TRÌNH, ĐỀ ÁN TRỌNG ĐIỂM:",
    da,
    "",
    "QUY TẮC VIẾT:",
    ...VIET_RULES,
    "",
    "VÍ DỤ ĐỊNH DẠNG (rút gọn từ mẫu chuẩn — bám CÁCH TRÌNH BÀY này):",
    MAMU_OUT.split("\n").slice(0, 46).join("\n"),
    "",
    "TỰ KIỂM TRƯỚC KHI TRẢ:",
    ...TU_KIEM,
    "Nếu bản ghi thiếu ngày hoặc thiếu chủ thể thì không đưa vào phần I — liệt kê ở phần IV và phụ lục với trạng thái CAN_XAC_MINH. Tuyệt đối không bịa số liệu, không suy đoán trạng thái Đoàn-Hội-Đội khi nguồn không nêu.",
  ].join("\n");
}

/* ── Corpus RAG dùng chung cho doc-context: AI "học" từng mục ── */

export interface SpecChunk {
  id: string;
  title: string;
  text: string;
}

export const BAO_CAO_CORPUS: SpecChunk[] = [
  {
    id: "spec-khung",
    title: "Khung đề cương báo cáo đầu ra nhiệm kỳ 2026 - 2031",
    text:
      "Khung đề cương báo cáo áp dụng chung mọi cấp (trường → xã → tỉnh → Trung ương Đoàn), mọi kỳ (tuần, tháng, quý, 06 tháng, năm): Thể thức (khối tiêu đề, tên báo cáo, kỳ báo cáo theo thể thức văn bản của Đoàn); Mở đầu 01 câu căn cứ Nghị quyết Đại hội Đoàn toàn quốc lần thứ XIII, đơn vị báo cáo, kỳ báo cáo, không thêm đánh giá; I. Kết quả thực hiện nhiệm vụ, giải pháp — 06 mục lớn theo Báo cáo chính trị, 06 mục lớn luôn có, tiểu mục chỉ có khi có hoạt động, giữ nguyên số hiệu tiểu mục; II. Kết quả gắn với chỉ tiêu, nhiệm vụ đột phá — bảng chỉ tiêu/nhiệm vụ đột phá - kết quả trong kỳ, chỉ liệt kê chỉ tiêu có hoạt động đóng góp trực tiếp; III. Đánh giá chung — ưu điểm, hạn chế chỉ rút ra từ dữ liệu trong kỳ; IV. Phương hướng kỳ tới (tuần tới, tháng tới, quý tới, 06 tháng cuối năm, năm tới) — hoạt động sắp diễn ra, việc cần xác minh; V. Đề xuất, kiến nghị — chỉ có khi đầu vào có đề xuất; Nơi nhận, ký — agent để trống họ tên người ký; Phụ lục bắt buộc khổ ngang — danh mục hoạt động, nguồn, kết quả phân loại, danh mục tin bị loại. Trình bày mục I: mục 1, 5, 6 viết thành đoạn mở đầu bằng nhãn nội dung theo tên nội dung trong Báo cáo chính trị; mục 2, 3, 4 dùng tiểu mục có số hiệu, mỗi hoạt động một gạch đầu dòng. Mục lớn không có hoạt động ghi: “Chưa ghi nhận hoạt động trong kỳ báo cáo.”",
  },
  {
    id: "spec-luong",
    title: "Luồng báo cáo trực tuyến 04 cấp và nguyên tắc agent",
    text:
      "Luồng báo cáo 4 cấp: Đoàn cấp trường (đầu vào bản ghi hoạt động do cán bộ Đoàn trường nhập; chuẩn hóa bản ghi, phân loại, viết báo cáo đoàn trường); Đoàn cấp xã (gộp theo mã, khử trùng lặp, cộng số liệu, chọn hoạt động tiêu biểu); Đoàn cấp tỉnh (gộp, khử trùng, đối chiếu chỉ tiêu nhiệm vụ đột phá, viết báo cáo cấp tỉnh); Trung ương Đoàn (tổng hợp toàn quốc, so sánh giữa các đơn vị, tiến độ chỉ tiêu, báo cáo trình Ban Bí thư). Mỗi cấp gửi lên báo cáo văn bản và tệp bản ghi chuẩn hóa; cấp trên tổng hợp từ tệp bản ghi, không đọc lại văn bản để trích số liệu. Nguyên tắc: đúng khung (06 nhóm nhiệm vụ giải pháp, số hiệu tiểu mục của Báo cáo chính trị); đúng sự thật (mọi câu, số liệu truy xuất được về ít nhất 01 nguồn, không suy diễn, không tự thêm số liệu); đúng kỳ đúng chủ thể (chỉ hoạt động trong kỳ do tổ chức Đoàn, Hội, Đội chủ trì hoặc phối hợp); người duyệt cuối cùng là cán bộ phụ trách, agent đánh dấu rõ nội dung cần xác minh. Quy tắc tổng hợp lên cấp trên: gộp bản ghi theo mã mục chính, xếp hoạt động cấp chủ trì cao trước rồi theo ngày; cộng dồn số liệu cùng chỉ số chuẩn hóa, cùng đơn vị đo, cùng loại ket_qua; hoạt động do cấp trên chủ trì cấp dưới tham gia ghi 01 lần tại cấp chủ trì; ở cấp xã, tỉnh, Trung ương mỗi tiểu mục viết 01 đoạn tổng hợp và nêu hoạt động tiêu biểu; phần II cấp tỉnh, Trung ương bổ sung cột lũy kế từ đầu nhiệm kỳ.",
  },
  {
    id: "spec-loai-gan",
    title: "Quy tắc phân loại R1 - R10 của agent báo cáo",
    text: R_RULES.join(" "),
  },
  {
    id: "spec-viet-tukiem",
    title: "Quy tắc viết và tiêu chí đánh giá agent báo cáo",
    text:
      VIET_RULES.join(" ") +
      " Tiêu chí đánh giá agent: đúng trạng thái lọc 100% với R1, R2 so với nhãn cán bộ duyệt; đúng mục chính do Ban quyết định khi nghiệm thu; số liệu không có nguồn = 0; câu phần I không gắn mã bản ghi = 0; mục tiêu bị tính là kết quả = 0; đúng khung 06 mục lớn, số hiệu tiểu mục, thứ tự phần = 100%. Danh mục tự kiểm tra trước khi xuất: " +
      TU_KIEM.join(" "),
  },
  ...NV_GROUPS.map((g) => ({
    id: `bo-ma-${g.code.toLowerCase()}`,
    title: `Bộ mã ${g.code} — ${g.title}`,
    text: NV_SUBS.filter((s) => s.code.startsWith(g.code + "."))
      .map((s) => `${s.code}: ${s.label}. Dấu hiệu nhận diện: ${s.hints}.`)
      .join(" "),
  })),
  {
    id: "spec-ct",
    title: "13 chỉ tiêu trọng tâm nhiệm kỳ 2026 - 2031",
    text: CHI_TIEU.map((c) => `${c.code}: ${c.text}.`).join(" "),
  },
  {
    id: "spec-dp-da",
    title: "05 nhiệm vụ đột phá và 07 chương trình, đề án trọng điểm nhiệm kỳ 2026 - 2031",
    text:
      DOT_PHA.map((d) => `${d.code}: ${d.text}.`).join(" ") +
      " " +
      DE_AN.map((d) => `${d.code}: ${d.text}.`).join(" "),
  },
  ...NV_GROUPS.map((g) => ({
    id: `gt-${g.code.toLowerCase()}`,
    title: `Nhiệm vụ, giải pháp nhiệm kỳ 2026 - 2031 — mục ${g.num}. ${g.title}`,
    text: GT_MUC_TEXT[g.code],
  })),
  {
    id: "mau-dau-ra-1",
    title: "Mẫu báo cáo đầu ra (phần thể thức và mục I) — Thành Đoàn TP.HCM tuần 06-12/10/2026",
    text: MAMU_OUT.split("\n").slice(0, 46).join("\n"),
  },
  {
    id: "mau-dau-ra-2",
    title: "Mẫu báo cáo đầu ra (phần II, III, IV, nơi nhận) — Thành Đoàn TP.HCM tuần 06-12/10/2026",
    text: MAMU_OUT.split("\n").slice(46).join("\n"),
  },
  {
    id: "spec-phu-luc-2-training",
    title: "Bộ 17 bản ghi hoạt động mẫu kèm nhãn phân loại chuẩn (Phụ lục 2 Đặc tả huấn luyện)",
    text: `17 hoạt động mẫu huấn luyện:
HD01: Khởi động Tuần lễ Sinh viên thành phố Vươn mình thời đại số 2026 (10/10/2026, Thành Đoàn - HSV TP.HCM) -> Đưa vào báo cáo, Mục chính: NV2.1, Mục phụ: NV3.1, Gắn: CT7, DP2, DA2. Lưu ý: 100.000 và 10.000 là mục tiêu, không phải kết quả.
HD02: Bàn giao công trình thiết bị cảnh báo tai nạn giao thông cho HSV Trường ĐH Khoa học tự nhiên (10/10/2026) -> Đưa vào báo cáo, Mục chính: NV2.1, Mục phụ: NV2.5, Gắn: CT3, DP2. 01 công trình ứng dụng KHCN là kết quả.
HD03: Chung kết Hội thi tay nghề làm bánh lần I (10/10/2026, Hội LHTN TP.HCM - Trung tâm DVVL TN) -> Đưa vào báo cáo, Mục chính: NV2.2, Mục phụ: NV4.5. 500 thí sinh dự thi, 30 vào chung kết là kết quả.
HD04: Xây dựng không gian văn hóa Hồ Chí Minh, trao tặng tủ sách cho thanh niên (11/10/2026) -> Đưa vào báo cáo, Mục chính: NV1.1, Mục phụ: NV3.1.
HD05: Phát động Tuần lễ học tập suốt đời theo tấm gương Chủ tịch Hồ Chí Minh (11/10/2026) -> Đưa vào báo cáo, Mục chính: NV3.1, Mục phụ: NV1.1.
HD06: Ra mắt Đội hình thanh niên hỗ trợ người dân sử dụng dịch vụ, ứng dụng số (11/10/2026) -> Đưa vào báo cáo, Mục chính: NV2.1, Mục phụ: NV2.4, Gắn: CT7, DP2.
HD07: Khai trương hồ bơi di động (11/10/2026) -> Đưa vào báo cáo, Mục chính: NV3.2, Mục phụ: NV5.3.
HD08: Khai trương Phố quà tặng Thanh niên và Bến đỗ Thanh niên (11/10/2026) -> Đưa vào báo cáo, Mục chính: NV3.3, Mục phụ: NV4.5.
HD09: Ký kết chương trình phối hợp tổ chức hoạt động thanh niên (11/10/2026) -> Đưa vào báo cáo, Mục chính: NV4.6.
HD10: Ngày hội kết nối thực tập Internship Fair 2026 -> CẦN XÁC MINH (CAN_XAC_MINH) do bài báo không nêu ngày diễn ra cụ thể.
HD11: Ngày hội Tôi yêu Tổ quốc tôi năm 2026 (04/10/2026) -> LOẠI - ngoài kỳ báo cáo (NGOAI_KY), diễn ra trước 06/10/2026.
HD12: Sinh hoạt chuyên đề Tuổi trẻ cùng Thành phố phát triển (03/10/2026) -> LOẠI - ngoài kỳ báo cáo (NGOAI_KY).
HD13: Trao học bổng Nguyễn Thái Bình Chắp cánh ước mơ 2026 (08/10/2026, Báo Thanh Niên và CLB Golf) -> LOẠI - không do Đoàn Hội Đội chủ trì hoặc phối hợp (KHONG_PHAI_DOAN).
HD14: Ngày hội Đông Hòa số - 10 ngày hành động (10/10/2026, UBND phường Đông Hòa) -> LOẠI - không do Đoàn chủ trì (KHONG_PHAI_DOAN).
HD15: Ngày hội Sinh viên và Doanh nghiệp 2026 (11/10/2026, Trường ĐH KHTN) -> LOẠI - nhà trường tổ chức không có Đoàn trường (KHONG_PHAI_DOAN).
HD16: Nhạc hội Thanh niên TP.HCM lần 1 Thanh âm Lên đàng (17-18/10/2026) -> CHUYỂN PHƯƠNG HƯỚNG KỲ TỚI (PHUONG_HUONG).
HD17: Tuyên dương Thủ lĩnh thanh niên tiêu biểu TP.HCM (18/10/2026) -> CHUYỂN PHƯƠNG HƯỚNG KỲ TỚI (PHUONG_HUONG).`,
  },
];

/* ══════════════════════════════════════════════════════════════════════
   STAGE 1 — PHÂN LOẠI BẢN GHI (bước 2-5 quy trình đặc tả mục V)
   AI trả JSON có cấu trúc (trạng thái R1-R4, mục chính R5-R8, gắn chỉ
   tiêu R9-R10); route /api/ai/phan-loai-bao-cao kiểm chứng bằng quy tắc
   deterministic rồi mới gửi stage 2 viết báo cáo.
   ══════════════════════════════════════════════════════════════════════ */

/** Schema JSON đầu ra stage 1 — type VIẾT HOA đúng chuẩn Gemini responseSchema (OBJECT/STRING/ARRAY/NUMBER) */
export const PHAN_LOAI_SCHEMA: Record<string, unknown> = {
  type: "OBJECT",
  properties: {
    ban_ghi: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING", description: "Giữ nguyên id bản ghi đầu vào (HD01...); bản ghi tách từ nguồn dán tay đặt EXT1, EXT2..." },
          ten: { type: "STRING", description: "Tên hoạt động chuẩn hóa" },
          ngay: { type: "STRING", description: "Ngày diễn ra dd/mm/yyyy; để trống nếu nguồn không nêu" },
          dia_diem: { type: "STRING" },
          chu_tri: { type: "STRING" },
          phoi_hop: { type: "STRING" },
          doi_tuong: { type: "ARRAY", items: { type: "STRING" } },
          mo_ta: { type: "STRING", description: "Nội dung chính, không chép nguyên văn" },
          so_lieu: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                chi_so: { type: "STRING" },
                gia_tri: { type: "NUMBER" },
                don_vi: { type: "STRING" },
                loai: { type: "STRING", enum: ["ket_qua", "muc_tieu", "du_kien"] },
              },
              required: ["chi_so", "gia_tri", "don_vi", "loai"],
            },
          },
          nguon: { type: "ARRAY", items: { type: "STRING" } },
          trang_thai: { type: "STRING", enum: ["DUA_VAO", "NGOAI_KY", "KHONG_PHAI_DOAN", "CAN_XAC_MINH", "PHUONG_HUONG"] },
          muc_chinh: { type: "STRING", description: "Mã tiểu mục (NV2.1...); để trống khi không đưa vào báo cáo" },
          muc_phu: { type: "ARRAY", items: { type: "STRING" } },
          chi_tieu: { type: "ARRAY", items: { type: "STRING" } },
          dot_pha: { type: "ARRAY", items: { type: "STRING" } },
          de_an: { type: "ARRAY", items: { type: "STRING" } },
          ly_do: { type: "STRING", description: "Lý do phân loại hoặc lý do loại" },
        },
        required: ["id", "trang_thai", "ly_do"],
      },
    },
  },
  required: ["ban_ghi"],
  propertyOrdering: ["ban_ghi"],
};

/** System prompt stage 1 — compact, bám R1-R10 + bộ mã + few-shot từ bộ mẫu đặc tả */
export function buildPhanLoaiSystemPrompt(): string {
  const subs = NV_SUBS.map((s) => `${s.code} ${s.label} — dấu hiệu: ${s.hints}`).join("\n");
  const ct = CHI_TIEU.map((c) => `${c.code} ${c.text}`).join("\n");
  const dp = DOT_PHA.map((d) => `${d.code} ${d.text}`).join("\n");
  const da = DE_AN.map((d) => `${d.code} ${d.text}`).join("\n");

  return [
    "Bạn là AI agent phân loại hoạt động cho báo cáo công tác Đoàn nhiệm kỳ 2026 - 2031 (đặc tả huấn luyện agent tổng hợp báo cáo). Đầu vào là danh sách bản ghi hoạt động (kèm kỳ báo cáo từ ngày - đến ngày) và có thể kèm NGUỒN DÁN TAY (tin báo chí, công văn, trang thông tin). Nhiệm vụ:",
    "1) Với NGUỒN DÁN TAY: trích xuất thành các bản ghi riêng (bước Trích xuất) — một bài có nhiều nội dung độc lập thì tách thành nhiều bản ghi (R7), đặt id EXT1, EXT2…; ghi ngày diễn ra, địa điểm, chủ trì, phối hợp, đối tượng, số liệu kèm loại (ket_qua/muc_tieu/du_kien) và nguồn.",
    "2) Lọc từng bản ghi theo R1-R4 (trạng thái).",
    "3) Gán đúng 01 mục chính theo R5-R8 (mục phụ khi cần, ghi lý do).",
    "4) Gắn chỉ tiêu, nhiệm vụ đột phá, đề án theo R9-R10 (không gắn theo suy đoán).",
    "",
    "QUY TẮC:",
    ...R_RULES,
    "",
    "BỘ MÃ TIỂU MỤC (mục chính bắt buộc là mã trong danh sách này):",
    subs,
    "",
    "CHỈ TIÊU TRỌNG TÂM:",
    ct,
    "",
    "NHIỆM VỤ ĐỘT PHÁ:",
    dp,
    "",
    "CHƯƠNG TRÌNH, ĐỀ ÁN TRỌNG ĐIỂM:",
    da,
    "",
    "VÍ DỤ PHÂN LOẠI ĐÚNG (kỳ 06/10/2026 - 12/10/2026):",
    '- Tuần lễ “Sinh viên Vươn mình thời đại số” (10/10/2026, Thành Đoàn - Hội Sinh viên; "100.000 sinh viên tham gia" ghi MỤC TIÊU) → DUA_VAO, muc_chinh NV2.1, muc_phu [NV3.1], chi_tieu [CT7], dot_pha [DP2], de_an [DA2]; số liệu 100.000/10.000 giữ loai muc_tieu, KHÔNG tính kết quả.',
    '- Hội thi tay nghề làm bánh (10/10/2026, Hội LHTN; trên 500 thí sinh, 30 vào chung kết = ket_qua) → DUA_VAO, NV2.2 (KHÔNG xếp NV3.1), muc_phu [NV4.5].',
    '- Ra mắt Đội hình hỗ trợ người dân dùng dịch vụ số (11/10/2026, Đoàn phường) → DUA_VAO, NV2.1 (tình nguyện viên số xếp 2.1, KHÔNG xếp NV2.4), muc_phu [NV2.4], chi_tieu [CT7], dot_pha [DP2].',
    '- Internship Fair 2026 (bài không nêu ngày diễn ra) → CAN_XAC_MINH, muc_chinh NV3.1, muc_phu [NV2.2], ly_do: thiếu ngày diễn ra.',
    '- Hoạt động ngày 04/10/2026 (trước kỳ 06/10) → NGOAI_KY, căn cứ NGÀY DIỄN RA chứ không phải ngày đăng bài.',
    '- Trao học bổng Nguyễn Thái Bình (08/10/2026, Báo Thanh Niên + CLB Golf) → KHONG_PHAI_DOAN (không có vai trò tổ chức Đoàn, Hội, Đội).',
    '- Nhạc hội Thanh niên TP.HCM “Thanh âm Lên đàng” (17-18/10/2026, sau kỳ) → PHUONG_HUONG, muc_chinh NV3.3, muc_phu [NV4.5].',
    '- Tuyên dương “Thủ lĩnh thanh niên tiêu biểu” (18/10/2026; khoảng 70 gương du_kien) → PHUONG_HUONG, NV4.5.',
    "",
    "ĐẦU RA: trả duy nhất JSON theo schema — trường ban_ghi là mảng gồm MỌI bản ghi đã cho (đúng id gốc) cộng thêm bản ghi trích từ nguồn dán tay (id EXT…). Không bỏ sót bản ghi nào.",
  ].join("\n");
}

/** 17 hoạt động chuẩn mẫu phục vụ huấn luyện và kiểm thử benchmark AI (Phụ lục 2 Đặc tả) */
export const TRAINING_BENCHMARK_RECORDS = [
  {
    id: "HD01",
    ten: "Khởi động Tuần lễ “Sinh viên thành phố Vươn mình thời đại số” năm 2026",
    ngay: "10/10/2026",
    chu_tri: "Thành Đoàn - Hội Sinh viên Việt Nam TP.HCM",
    mo_ta: "Triển khai hoạt động trang bị kỹ năng số, nghiên cứu khoa học, công nghệ mới cho sinh viên toàn thành.",
    so_lieu: [
      { chi_so: "sinh viên tham gia kỹ năng số", gia_tri: 100000, don_vi: "sinh viên", loai: "muc_tieu" as const },
      { chi_so: "sinh viên hướng dẫn NCKH", gia_tri: 10000, don_vi: "sinh viên", loai: "muc_tieu" as const },
    ],
    status: "DUA_VAO",
    muc_chinh: "NV2.1",
    muc_phu: "NV3.1",
    gan: ["CT7", "DP2", "DA2"],
  },
  {
    id: "HD02",
    ten: "Bàn giao công trình thiết bị cảnh báo tai nạn giao thông cho Hội Sinh viên Trường Đại học Khoa học tự nhiên",
    ngay: "10/10/2026",
    chu_tri: "Thành Đoàn - Hội Sinh viên Việt Nam TP.HCM",
    mo_ta: "Bàn giao thiết bị thông minh cảnh báo khu vực điểm đen giao thông phục vụ sinh viên và người dân.",
    so_lieu: [
      { chi_so: "công trình ứng dụng KHCN", gia_tri: 1, don_vi: "công trình", loai: "ket_qua" as const },
    ],
    status: "DUA_VAO",
    muc_chinh: "NV2.1",
    muc_phu: "NV2.5",
    gan: ["CT3", "DP2"],
  },
  {
    id: "HD03",
    ten: "Chung kết Hội thi tay nghề làm bánh lần I với chủ đề “Tinh hoa nghệ thuật làm bánh”",
    ngay: "10/10/2026",
    chu_tri: "Hội Liên hiệp Thanh niên Việt Nam TP.HCM phối hợp Trung tâm Dịch vụ việc làm Thanh niên TP.HCM",
    mo_ta: "Nâng cao tay nghề, phát triển nghề nghiệp cho thanh niên thành phố.",
    so_lieu: [
      { chi_so: "thí sinh đăng ký dự thi", gia_tri: 500, don_vi: "thí sinh", loai: "ket_qua" as const },
      { chi_so: "thí sinh vào chung kết", gia_tri: 30, don_vi: "thí sinh", loai: "ket_qua" as const },
    ],
    status: "DUA_VAO",
    muc_chinh: "NV2.2",
    muc_phu: "NV4.5",
  },
  {
    id: "HD04",
    ten: "Xây dựng không gian văn hóa Hồ Chí Minh, trao tặng tủ sách cho thanh niên",
    ngay: "11/10/2026",
    chu_tri: "Nhà Văn hóa Thanh niên Bà Rịa - Vũng Tàu phối hợp Đoàn phường Vũng Tàu",
    mo_ta: "Xây dựng không gian văn hóa Hồ Chí Minh, trang bị tủ sách tự học cho thanh thiếu nhi.",
    status: "DUA_VAO",
    muc_chinh: "NV1.1",
    muc_phu: "NV3.1",
  },
  {
    id: "HD05",
    ten: "Phát động “Tuần lễ học tập suốt đời” theo tấm gương Chủ tịch Hồ Chí Minh",
    ngay: "11/10/2026",
    chu_tri: "Nhà Văn hóa Thanh niên Bà Rịa - Vũng Tàu phối hợp Đoàn phường Vũng Tàu",
    mo_ta: "Khuyến khích học sinh, sinh viên và thanh niên tự rèn luyện văn hóa đọc và học tập liên tục.",
    status: "DUA_VAO",
    muc_chinh: "NV3.1",
    muc_phu: "NV1.1",
  },
  {
    id: "HD06",
    ten: "Ra mắt Đội hình thanh niên hỗ trợ người dân sử dụng dịch vụ, ứng dụng số; phát động đợt cao điểm hỗ trợ phát triển kinh tế số",
    ngay: "11/10/2026",
    chu_tri: "Đoàn phường Vũng Tàu",
    mo_ta: "Thành lập đội hình tình nguyện số hướng dẫn tiểu thương và người dân thanh toán không dùng tiền mặt.",
    so_lieu: [
      { chi_so: "đội hình ra mắt", gia_tri: 1, don_vi: "đội hình", loai: "ket_qua" as const },
    ],
    status: "DUA_VAO",
    muc_chinh: "NV2.1",
    muc_phu: "NV2.4",
    gan: ["CT7", "DP2"],
  },
  {
    id: "HD07",
    ten: "Khai trương hồ bơi di động",
    ngay: "11/10/2026",
    chu_tri: "Nhà Văn hóa Thanh niên Bà Rịa - Vũng Tàu phối hợp Đoàn phường Vũng Tàu",
    mo_ta: "Trang bị thiết chế bơi lội, phòng chống đuối nước cho thiếu nhi trên địa bàn.",
    status: "DUA_VAO",
    muc_chinh: "NV3.2",
    muc_phu: "NV5.3",
  },
  {
    id: "HD08",
    ten: "Khai trương “Phố quà tặng Thanh niên” và “Bến đỗ Thanh niên”",
    ngay: "11/10/2026",
    chu_tri: "Nhà Văn hóa Thanh niên Bà Rịa - Vũng Tàu phối hợp Đoàn phường Vũng Tàu",
    mo_ta: "Tạo không gian sinh hoạt, giải trí văn hóa lành mạnh cho đoàn viên thanh niên.",
    status: "DUA_VAO",
    muc_chinh: "NV3.3",
    muc_phu: "NV4.5",
  },
  {
    id: "HD09",
    ten: "Ký kết chương trình phối hợp tổ chức hoạt động thanh niên giữa Nhà Văn hóa Thanh niên Bà Rịa - Vũng Tàu và Đoàn phường Vũng Tàu",
    ngay: "11/10/2026",
    chu_tri: "Nhà Văn hóa Thanh niên Bà Rịa - Vũng Tàu và Đoàn phường Vũng Tàu",
    mo_ta: "Ký kết thỏa thuận phối hợp phát triển phong trào cơ sở năm 2026 - 2027.",
    so_lieu: [
      { chi_so: "chương trình phối hợp", gia_tri: 1, don_vi: "chương trình", loai: "ket_qua" as const },
    ],
    status: "DUA_VAO",
    muc_chinh: "NV4.6",
  },
  {
    id: "HD10",
    ten: "Ngày hội kết nối thực tập “Internship Fair 2026”",
    chu_tri: "Trung tâm Hỗ trợ Học sinh Sinh viên TP.HCM",
    mo_ta: "Kết nối sinh viên với các doanh nghiệp, đơn vị thực tập tốt nghiệp.",
    status: "CAN_XAC_MINH",
    ly_do: "Thiếu ngày diễn ra cụ thể trong nguồn tin, cần xác minh trước khi đưa vào kết quả.",
  },
  {
    id: "HD11",
    ten: "Ngày hội “Tôi yêu Tổ quốc tôi” năm 2026",
    ngay: "04/10/2026",
    chu_tri: "Hội LHTN Việt Nam TP.HCM",
    mo_ta: "Ngày hội thanh niên vì cộng đồng.",
    status: "NGOAI_KY",
    ly_do: "Diễn ra ngày 04/10/2026 nằm trước kỳ báo cáo 06-12/10/2026.",
  },
  {
    id: "HD12",
    ten: "Sinh hoạt chuyên đề “Tuổi trẻ cùng Thành phố phát triển”",
    ngay: "03/10/2026",
    chu_tri: "Cụm số 6, Đoàn khối thuộc UBND TP.HCM",
    mo_ta: "Diễn đàn thanh niên hiến kế xây dựng đô thị thông minh.",
    status: "NGOAI_KY",
    ly_do: "Diễn ra ngày 03/10/2026 nằm trước kỳ báo cáo.",
  },
  {
    id: "HD13",
    ten: "Trao học bổng Nguyễn Thái Bình “Chắp cánh ước mơ vào giảng đường đại học 2026”",
    ngay: "08/10/2026",
    chu_tri: "Báo Thanh Niên và CLB Golf Quảng Ngãi tại TP.HCM",
    mo_ta: "Trao học bổng cho tân sinh viên vượt khó.",
    status: "KHONG_PHAI_DOAN",
    ly_do: "Đơn vị tổ chức không phải tổ chức Đoàn, Hội, Đội và không có văn bản phối hợp của Đoàn.",
  },
  {
    id: "HD14",
    ten: "Ngày hội “Đông Hòa số - 10 ngày hành động”",
    ngay: "10/10/2026",
    chu_tri: "UBND phường Đông Hòa",
    mo_ta: "Ủy ban nhân dân phường tổ chức chuyển đổi số dịch vụ công.",
    status: "KHONG_PHAI_DOAN",
    ly_do: "Do chính quyền phường tổ chức, nguồn tin không ghi nhận vai trò Đoàn chủ trì.",
  },
  {
    id: "HD15",
    ten: "Ngày hội Sinh viên và Doanh nghiệp năm 2026",
    ngay: "11/10/2026",
    chu_tri: "Trường Đại học Khoa học tự nhiên",
    mo_ta: "Hoạt động do nhà trường tổ chức cấp trường.",
    status: "KHONG_PHAI_DOAN",
    ly_do: "Cấp tỉnh không ghi nhận vì bài báo không nêu vai trò của Đoàn, Hội Sinh viên.",
  },
  {
    id: "HD16",
    ten: "Nhạc hội Thanh niên TP.HCM lần 1 năm 2026 “Thanh âm Lên đàng”; Lễ kỷ niệm 70 năm Ngày truyền thống Hội LHTN Việt Nam",
    ngay: "17/10/2026",
    chu_tri: "Hội LHTN Việt Nam TP.HCM, Hội Sinh viên Việt Nam TP.HCM",
    mo_ta: "Đại nhạc hội thanh niên chào mừng truyền thống Hội.",
    status: "PHUONG_HUONG",
    muc_chinh: "NV3.3",
    muc_phu: "NV4.5",
    ly_do: "Diễn ra sau kỳ báo cáo (17-18/10/2026), đưa vào Phương hướng tuần tới.",
  },
  {
    id: "HD17",
    ten: "Tuyên dương “Thủ lĩnh thanh niên tiêu biểu” TP.HCM giai đoạn 2021 - 2026",
    ngay: "18/10/2026",
    chu_tri: "Ban Thư ký Hội LHTN Việt Nam TP.HCM",
    mo_ta: "Tuyên dương cán bộ Hội tiêu biểu toàn thành phố.",
    so_lieu: [
      { chi_so: "gương thủ lĩnh tuyên dương", gia_tri: 70, don_vi: "gương", loai: "du_kien" as const },
    ],
    status: "PHUONG_HUONG",
    muc_chinh: "NV4.5",
    ly_do: "Diễn ra ngày 18/10/2026, đưa vào Phương hướng tuần tới.",
  },
];
