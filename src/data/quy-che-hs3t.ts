/**
 * Toàn văn Quy chế danh hiệu "Học sinh 3 tốt" giai đoạn 2023–2027
 * (Ban hành kèm theo Quyết định số 317-QĐ/TWĐTN-TNTH ngày 09/11/2023
 *  của Ban Bí thư Trung ương Đoàn TNCS Hồ Chí Minh)
 * đã hợp nhất các điều chỉnh theo Thông báo số 630-TB/TWĐTN-CTTTN ngày 10/10/2025.
 */

export const QUY_CHE_META = {
  quyetDinh: "317-QĐ/TWĐTN-TNTH",
  ngayQuyetDinh: "09/11/2023",
  coQuan: "Ban Bí thư Trung ương Đoàn TNCS Hồ Chí Minh",
  giaiDoan: "2023 - 2027",
  thuongTruc: "Ban Thanh niên Trường học Trung ương Đoàn",
};

export const THONG_BAO_DIEU_CHINH = {
  so: "630-TB/TWĐTN-CTTTN",
  ngay: "10/10/2025",
  trichYeu:
    "Ban Bí thư Trung ương Đoàn thông báo điều chỉnh một số tiêu chí xét chọn danh hiệu “Học sinh 3 tốt” cấp Trung ương; các tiêu chí còn lại giữ nguyên theo Quyết định số 317-QĐ/TWĐTN-TNTH.",
};

export interface DieuContent {
  heading?: string;
  items?: string[];
  /** văn bản thường */
  paragraphs?: string[];
  /** ghi chú in nghiêng cuối điều (mốc thời gian, ngoại lệ…) */
  notes?: string[];
}

export interface Dieu {
  so: string; // "Điều 1."
  title: string;
  /** điều chỉnh theo TB 630/2025 → highlight vàng */
  adjusted?: boolean;
  content: DieuContent[];
}

export interface Chuong {
  name: string;
  title: string;
  dieu: Dieu[];
}

export const QUY_CHE_CHUONGS: Chuong[] = [
  {
    name: "CHƯƠNG I",
    title: "QUY ĐỊNH CHUNG",
    dieu: [
      {
        so: "Điều 1.",
        title: "Đối tượng áp dụng",
        content: [
          {
            paragraphs: [
              "Danh hiệu “Học sinh 3 tốt” (sau đây gọi tắt là Danh hiệu) là phần thưởng cao quý của Đoàn TNCS Hồ Chí Minh, được trao tặng hằng năm cho học sinh các trường Trung học phổ thông, Trung tâm Giáo dục nghề nghiệp - giáo dục thường xuyên có thành tích xuất sắc trong học tập, rèn luyện và tích cực tham gia các hoạt động vì cộng đồng.",
            ],
          },
        ],
      },
      {
        so: "Điều 2.",
        title: "Mục đích của danh hiệu",
        content: [
          {
            items: [
              "Tôn vinh học sinh tiêu biểu có thành tích xuất sắc trong học tập, rèn luyện và tích cực tham gia các hoạt động vì cộng đồng.",
              "Tạo động lực, khuyến khích học sinh học tập, rèn luyện, tham gia các hoạt động vì cộng đồng.",
            ],
          },
        ],
      },
      {
        so: "Điều 3.",
        title: "Cơ quan chủ trì, đơn vị thường trực",
        content: [
          {
            paragraphs: [
              "Danh hiệu “Học sinh 3 tốt” cấp Trung ương do Trung ương Đoàn TNCS Hồ Chí Minh chủ trì. Đơn vị Thường trực Danh hiệu là Ban Thanh niên Trường học Trung ương Đoàn.",
            ],
          },
        ],
      },
    ],
  },
  {
    name: "CHƯƠNG II",
    title: "TIÊU CHUẨN, QUYỀN LỢI VÀ NGHĨA VỤ",
    dieu: [
      {
        so: "Điều 4.",
        title: "Tiêu chuẩn, giải thưởng đối với danh hiệu cấp Trung ương",
        content: [
          { heading: "1. Tiêu chuẩn chung", items: ["Đạt Danh hiệu “Học sinh 3 tốt” cấp tỉnh.", "Được Hội đồng xét chọn Danh hiệu “Học sinh 3 tốt” cấp tỉnh đề nghị xét chọn ở cấp Trung ương."] },
          {
            heading: "2. Tiêu chuẩn cụ thể",
            paragraphs: ["2.1. Tiêu chuẩn: Đạo đức tốt"],
            items: [
              "Xếp loại hạnh kiểm trong năm học đạt loại Tốt (theo Thông tư số 22/2021/TT-BGDĐT, ngày 20/7/2021 của Bộ Giáo dục và Đào tạo quy định về đánh giá, xếp loại học sinh trung học cơ sở và học sinh trung học phổ thông).",
              "Là đoàn viên Đoàn TNCS Hồ Chí Minh, kết quả đánh giá chất lượng Đoàn viên trong năm học hoàn thành xuất sắc nhiệm vụ.",
              "Không vi phạm đạo đức, pháp luật và các quy chế, nội quy của nhà trường, quy định của địa phương, pháp luật của nhà nước.",
              "Tham gia và đạt giải cá nhân (Nhất, Nhì, Ba) chung kết một trong các cuộc thi: nâng cao nhận thức của học sinh về nghị quyết của Đảng, chính sách, pháp luật của Nhà nước; cuộc thi tìm hiểu về Đoàn TNCS Hồ Chí Minh; tìm hiểu lịch sử, văn hóa dân tộc; học tập và làm theo tư tưởng, đạo đức, phong cách Hồ Chí Minh từ cấp trường trở lên.",
              "Đạt thêm 01 trong các tiêu chí sau:",
            ],
            notes: [
              "+ Được khen thưởng có thành tích xuất sắc trong các hoạt động tình nguyện từ cấp trên trực tiếp cơ sở trở lên. (Điều chỉnh theo Thông báo 630-TB/TWĐTN-CTTTN)",
              "+ Là thanh niên tiêu biểu, thanh niên tiên tiến, gương người tốt, việc tốt, có hành động dũng cảm được biểu dương từ cấp trên trực tiếp cơ sở trở lên hoặc Bằng khen đã có thành tích xuất sắc trong công tác Đoàn và phong trào thanh niên trường học năm học từ cấp trên trực tiếp cơ sở trở lên. (Điều chỉnh theo Thông báo 630-TB/TWĐTN-CTTTN)",
            ],
          },
          {
            paragraphs: ["2.2. Tiêu chuẩn: Học tập tốt"],
            items: [
              "Xếp loại học lực trong năm học đạt loại Tốt (theo Thông tư số 22/2021/TT-BGDĐT, ngày 20/7/2021 của Bộ Giáo dục và Đào tạo quy định về đánh giá xếp loại học sinh trung học cơ sở và học sinh trung học phổ thông, từ năm học 2022 - 2023 đối với học sinh lớp 10, từ năm học 2023 - 2024 đối với học sinh lớp 11, từ năm học 2024 - 2025 đối với học sinh lớp 12). Trong đó điểm trung bình các môn Toán, Ngữ văn, Ngoại ngữ đạt từ 8,5 trở lên.",
              "Đạt thêm 01 trong các tiêu chí sau:",
            ],
            notes: [
              "+ Đạt giải (Nhất, Nhì, Ba) kỳ thi học sinh giỏi cấp tỉnh trở lên.",
              "+ Đạt giải (Nhất, Nhì, Ba) Cuộc thi khoa học, kỹ thuật cấp tỉnh trở lên dành cho học sinh trung học. (Điều chỉnh theo Thông báo 630-TB/TWĐTN-CTTTN — bổ sung “Nhất, Nhì, Ba”)",
            ],
          },
          {
            paragraphs: ["2.3. Tiêu chuẩn: Thể lực tốt"],
            items: [
              "Được đánh giá là đạt yêu cầu về Thể lực theo Quy định đánh giá, xếp loại thể lực học sinh, sinh viên được ban hành kèm theo Quyết định số 53/2008/QĐ-BGDĐT ngày 18/9/2008 của Bộ Giáo dục và Đào tạo; được đánh giá là Đạt môn Giáo dục thể chất theo Thông tư số 22/2021/TT-BGDĐT, ngày 20/7/2021 của Bộ Giáo dục và Đào tạo quy định về đánh giá xếp loại học sinh trung học cơ sở và học sinh trung học phổ thông (từ năm học 2022 - 2023 đối với học sinh lớp 10, từ năm học 2023 - 2024 đối với học sinh lớp 11, từ năm học 2024 - 2025 đối với học sinh lớp 12).",
              "Đạt thêm 01 trong các tiêu chí sau:",
            ],
            notes: [
              "+ Đạt danh hiệu “Thanh niên khỏe” từ cấp trường trở lên (tiêu chuẩn cụ thể theo Hướng dẫn liên tịch số 87/2006/HDLT-ĐTN-TDTT về tiêu chuẩn thi đua và rèn luyện thể dục thể thao của các cấp bộ Đoàn và đoàn viên thanh niên do Trung ương Đoàn TNCS Hồ Chí Minh và Ủy ban Thể dục - Thể thao ban hành ngày 24 tháng 11 năm 2006).",
              "+ Đạt giải cá nhân (Nhất, Nhì, Ba) tại một trong các giải thể thao phong trào từ cấp trường trở lên (không tính đối với các bộ môn thi theo đội, nhóm). (Điều chỉnh theo Thông báo 630-TB/TWĐTN-CTTTN)",
            ],
          },
          {
            paragraphs: [
              "* Hội đồng xét danh hiệu sẽ xem xét cụ thể tiêu chí thể lực tốt đối với các trường hợp học sinh được miễn học phần thực hành môn Giáo dục thể chất theo Thông tư số 22/2021/TT-BGDĐT, ngày 20/7/2021 của Bộ Giáo dục và Đào tạo quy định về đánh giá xếp loại học sinh trung học cơ sở và học sinh trung học phổ thông.",
              "* Tất cả các thành tích xét trao Danh hiệu “Học sinh 3 tốt” cấp Trung ương được tính trong khoảng thời gian từ ngày 01/9 năm trước đến hết ngày 31/8 năm xét trao danh hiệu.",
            ],
          },
          {
            heading: "3. Giá trị giải thưởng",
            paragraphs: [
              "Mỗi học sinh đạt Danh hiệu “Học sinh 3 tốt” cấp Trung ương sẽ nhận được các phần thưởng như sau:",
            ],
            items: [
              "Bằng khen của Ban Chấp hành Trung ương Đoàn; được đề xuất nhận bằng khen của Bộ trưởng Bộ Giáo dục và Đào tạo.",
              "Biểu trưng.",
              "Phần thưởng bằng tiền mặt.",
            ],
          },
        ],
      },
      {
        so: "Điều 5.",
        title: "Tiêu chuẩn, giải thưởng đối với danh hiệu cấp tỉnh, cấp trường",
        adjusted: true,
        content: [
          {
            items: [
              "Ban Thường vụ các tỉnh, thành đoàn xây dựng tiêu chuẩn cụ thể và giải thưởng của Danh hiệu “Học sinh 3 tốt” cấp tỉnh phù hợp với tình hình, điều kiện thực tế của học sinh và các trường trên địa bàn.",
              "Ban Thường vụ Đoàn trường xây dựng tiêu chuẩn cụ thể và giải thưởng của Danh hiệu “Học sinh 3 tốt” cấp trường trên cơ sở hướng dẫn của Đoàn cấp trên và tình hình thực tiễn của học sinh và đơn vị.",
            ],
          },
        ],
      },
      {
        so: "Điều 6.",
        title: "Quyền lợi của học sinh được nhận Danh hiệu",
        content: [
          {
            items: [
              "Được nhận các phần thưởng quy định tại Điều 4, Điều 5 Quy chế này.",
              "Được tổ chức Đoàn các cấp, các bộ, ban, ngành liên quan hỗ trợ trong học tập, nghiên cứu.",
              "Được các cấp bộ Đoàn ưu tiên theo dõi, bồi dưỡng và giới thiệu cho Đảng thực hiện các quy trình xét, kết nạp Đảng.",
              "Được giới thiệu tham gia một số hoạt động trong nước và quốc tế do các cấp bộ Đoàn tổ chức.",
            ],
          },
        ],
      },
      {
        so: "Điều 7.",
        title: "Nghĩa vụ của học sinh nhận được Danh hiệu",
        content: [
          {
            items: [
              "Tích cực tham gia học tập, rèn luyện và tham gia các hoạt động vì cộng đồng, góp phần tuyên truyền về ý nghĩa, uy tín của Danh hiệu.",
              "Thông tin và thành tích cá nhân của học sinh đạt danh hiệu có thể được sử dụng để tuyên truyền.",
            ],
          },
        ],
      },
    ],
  },
  {
    name: "CHƯƠNG III",
    title: "CÔNG TÁC XÉT CHỌN GIẢI THƯỞNG",
    dieu: [
      {
        so: "Điều 8.",
        title: "Quy trình xét chọn Danh hiệu",
        content: [
          {
            heading: "1. Danh hiệu “Học sinh 3 tốt” cấp Trung ương",
            items: [
              "Thành lập Hội đồng xét chọn do đồng chí Bí thư Trung ương Đoàn làm Chủ tịch Hội đồng. Thành phần hội đồng gồm có: Lãnh đạo Ban Thanh niên Trường học, đại diện lãnh đạo Văn phòng, Ban Tuyên giáo, Hội đồng Thi đua - Khen thưởng Trung ương đoàn, đại diện lãnh đạo Vụ Giáo dục chính trị và Công tác học sinh, sinh viên, Vụ Giáo dục Trung học, Bộ Giáo dục và Đào tạo và các thành viên khác theo chỉ đạo của Chủ tịch Hội đồng.",
              "Hàng năm, Hội đồng xét chọn cấp Trung ương sẽ xét chọn, trao Danh hiệu “Học sinh 3 tốt” cấp Trung ương cho các học sinh đạt tiêu chuẩn theo quy định.",
              "Thời gian xét chọn: xong trước ngày 30/11 hằng năm.",
              "Hồ sơ đề nghị xét trao danh hiệu “Học sinh 3 tốt” cấp Trung ương gồm: Công văn đề nghị xét tặng Danh hiệu của Tỉnh đoàn; Biên bản đề nghị xét tặng Danh hiệu của Tỉnh đoàn; Trích ngang thành tích của học sinh; Minh chứng học sinh đạt tiêu chuẩn tại Điều 4 Quy chế này.",
            ],
          },
          {
            heading: "2. Danh hiệu “Học sinh 3 tốt” cấp tỉnh",
            items: [
              "Thành lập Hội đồng xét chọn do đồng chí Bí thư hoặc Phó Bí thư tỉnh, thành đoàn làm Chủ tịch Hội đồng. Tùy điều kiện cụ thể của từng địa phương, đơn vị, mời đại biểu tham gia hội đồng.",
              "Tổ chức xét chọn, tuyên dương, trao Danh hiệu “Học sinh 3 tốt” cấp tỉnh trước 30/10 hàng năm.",
              "Gửi hồ sơ đề nghị xét chọn Danh hiệu “Học sinh 3 tốt” cấp Trung ương về Ban Thanh niên Trường học Trung ương Đoàn, số 64 Bà Triệu, Hoàn Kiếm, Hà Nội trước ngày 30/9 hàng năm.",
            ],
          },
          {
            heading: "3. Danh hiệu “Học sinh 3 tốt” cấp trường",
            items: [
              "Ban Thường vụ Đoàn trường thành lập Hội đồng xét chọn do đồng chí Bí thư đoàn trường làm Chủ tịch Hội đồng. Tùy điều kiện cụ thể của từng đơn vị mời đại biểu tham gia Hội đồng.",
              "Hội đồng xét chọn cấp trường xét chọn Danh hiệu “Học sinh 3 tốt” cấp trường và giới thiệu các học sinh đủ tiêu chuẩn “Học sinh 3 tốt” cấp tỉnh, cấp Trung ương lên đoàn cấp trên xem xét, công nhận.",
              "Thời gian xét chọn và tổ chức tuyên dương “Học sinh 3 tốt” cấp trường vào dịp tổng kết năm học.",
            ],
          },
        ],
      },
      {
        so: "Điều 9.",
        title: "Quy định xử lý các trường hợp vi phạm",
        content: [
          {
            paragraphs: [
              "Trong quá trình xét Danh hiệu hoặc sau khi nhận thưởng nếu phát hiện học sinh vi phạm quy chế Danh hiệu (làm giả tài liệu, khai báo không đúng thành tích), Ban Bí thư Trung ương Đoàn sẽ hủy hồ sơ xét chọn hoặc quyết định tước bỏ Danh hiệu và thông báo công khai trên các phương tiện thông tin đại chúng.",
            ],
          },
        ],
      },
    ],
  },
  {
    name: "CHƯƠNG IV",
    title: "TỔ CHỨC THỰC HIỆN",
    dieu: [
      {
        so: "Điều 10.",
        title: "Kinh phí thực hiện",
        content: [
          {
            items: [
              "Kinh phí tổ chức xét chọn và trao Danh hiệu được cân đối từ nguồn Ngân sách Nhà nước, nguồn tài trợ của các doanh nghiệp, tổ chức, cá nhân.",
              "Việc tiếp nhận, quản lý và sử dụng kinh phí tài trợ thực hiện theo đúng quy định hiện hành của Nhà nước và Trung ương Đoàn.",
            ],
          },
        ],
      },
      {
        so: "Điều 11.",
        title: "Điều khoản thi hành",
        content: [
          {
            items: [
              "Văn phòng Trung ương Đoàn, các ban, đơn vị thuộc Trung ương Đoàn, các tỉnh, thành đoàn, đoàn trực thuộc có trách nhiệm phối hợp cùng các cơ quan, đơn vị liên quan triển khai, tổ chức giải thưởng theo Quy chế này.",
              "Trong quá trình tổ chức thực hiện nếu có phát sinh, vướng mắc cần sửa đổi, bổ sung, đơn vị thường trực Danh hiệu tổng hợp, báo cáo Ban Bí thư Trung ương Đoàn xem xét quyết định.",
            ],
          },
        ],
      },
    ],
  },
];

/**
 * Ý nghiên cứu bổ sung (Điều 5): cơ sở các cấp tự điều chỉnh tiêu chuẩn theo thực tiễn
 * nhưng KHÔNG được cao hơn chuẩn Trung ương — thể hiện trong form tiêu chuẩn đơn vị.
 */
export const DIEU_5_NOTE =
  "Dựa trên tiêu chuẩn chung của Trung ương, cơ sở các cấp (Đoàn tỉnh/thành phố, Đoàn trường) " +
  "tự xây dựng tiêu chuẩn cụ thể phù hợp thực tiễn đơn vị mình — tuy nhiên tiêu chuẩn điều chỉnh " +
  "không được cao hơn chuẩn của Trung ương. Trên Cổng TNTH, tính năng “Tiêu chuẩn tại đơn vị” " +
  "trong khu quản trị yêu cầu xác nhận nguyên tắc này trước khi lưu.";

export const DIEU_CHINH_2025: { nhom: string; cu: string; moi: string }[] = [
  {
    nhom: "Đạo đức tốt",
    cu: "Được khen thưởng có thành tích xuất sắc trong các hoạt động tình nguyện từ cấp huyện trở lên",
    moi: "… từ cấp trên trực tiếp cơ sở trở lên",
  },
  {
    nhom: "Đạo đức tốt",
    cu: "Thanh niên tiêu biểu, tiên tiến, gương người tốt việc tốt / Bằng khen công tác Đoàn và phong trào TNTH từ cấp huyện trở lên",
    moi: "… từ cấp trên trực tiếp cơ sở trở lên",
  },
  {
    nhom: "Học tập tốt",
    cu: "Đạt giải Cuộc thi khoa học, kỹ thuật cấp tỉnh trở lên dành cho học sinh trung học",
    moi: "Đạt giải (Nhất, Nhì, Ba) Cuộc thi khoa học, kỹ thuật cấp tỉnh trở lên dành cho học sinh trung học",
  },
  {
    nhom: "Thể lực tốt",
    cu: "Đạt giải cá nhân (Nhất, Nhì, Ba) tại giải thể thao phong trào từ cấp trường trở lên",
    moi: "… (không tính đối với các bộ môn thi theo đội, nhóm)",
  },
];
