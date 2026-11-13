/**
 * Kho tham chiếu THỂ THỨC VĂN BẢN của Đoàn TNCS Hồ Chí Minh
 * Căn cứ: Hướng dẫn số 27-HD/TĐTN-VP ngày 12/02/2014 của BCH Đoàn TP. Hồ Chí Minh
 * (theo Hướng dẫn số 29-HD/TWĐTN-VP ngày 29/10/2013 của Văn phòng Trung ương Đoàn)
 *  + Mẫu 1 & 2: sơ đồ bố trí các thành phần thể thức.
 *  + Mẫu 3: bảng font - cỡ chữ hiển thị ký tự tiếng Việt (Time New Roman).
 *
 * File này dùng cho 2 mục đích:
 *  1. Nguồn tải mẫu quy định (public/mau-van-ban) — mục Kho mẫu ở /quan-tri/bao-cao.
 *  2. THE_THUC_RULEBOOK — nạp vào system prompt Trợ lý AI (/api/ai/tro-ly) để AI
 *     soạn văn bản đúng thể thức 100% cho MỌI loại văn bản và MỌI cấp Đoàn,
 *     linh hoạt theo hướng gửi (cấp trên → cấp dưới, cấp dưới → cấp trên, ngang hàng/ngoài).
 */

export interface MauQuyDinh {
  name: string;
  file: string;
  moTa: string;
  ext: "doc" | "docx" | "pdf";
}

/** 3 tệp quy định gốc đặt trong public/mau-van-ban — tải nguyên văn */
export const mauQuyDinh: MauQuyDinh[] = [
  {
    name: "QĐ 27-HĐ/TĐTN-VP — Hướng dẫn thể thức văn bản của Đoàn",
    file: "/mau-van-ban/QD-27-HD-the-thuc-van-ban-Doan.doc",
    moTa: "Quy định đầy đủ 8 thành phần thể thức bắt buộc, số - ký hiệu, chữ ký, nơi nhận, dấu mật - khẩn và văn bản liên tịch.",
    ext: "doc",
  },
  {
    name: "Mẫu 1 & 2 — Sơ đồ bố trí thể thức văn bản (A4 / A5)",
    file: "/mau-van-ban/Mau-1-va-2-so-do-the-thuc-van-ban.doc",
    moTa: "Sơ đồ vị trí từng thành phần thể thức trên trang giấy khổ A4 (Mẫu 1) và khổ A5 (Mẫu 2) theo QĐ 27-HĐ.",
    ext: "doc",
  },
  {
    name: "Mẫu 3 — Cách hiển thị ký tự tiếng Việt",
    file: "/mau-van-ban/Mau-3-cach-hien-thi-ky-tu-tieng-Viet.pdf",
    moTa: "Bảng font Times New Roman: cỡ chữ từng thành phần (tiêu đề 15, tên loại 16, nội dung 14, Nơi nhận 13/11, lưu 8 nghiêng).",
    ext: "pdf",
  },
];

/** Hướng luân chuyển văn bản: cấp dưới gửi LÊN cấp trên; cấp trên ban hành XUỐNG cấp dưới; công văn mọi hướng */
export type VanBanHuong = "LEN" | "XUONG" | "COTRUC";

export interface VanBanLoai {
  id: string;
  ten: string;
  /** Ký hiệu thể loại trong số - ký hiệu văn bản (QĐ 27-HĐ mục 3.4) */
  vietTat: string;
  huong: VanBanHuong;
  /** Công văn là loại duy nhất KHÔNG ghi tên loại in hoa — trích yếu "V/v…" nghiêng dưới số ký hiệu + Kính gửi */
  laCongVan: boolean;
  moTa: string;
  /** Danh sách Nơi nhận chuẩn — thứ tự từ cơ quan thẩm quyền cao đến thấp, cuối cùng là Lưu */
  noiNhanMau: string[];
}

export const vanBanLoaiList: VanBanLoai[] = [
  {
    id: "CONG_VAN",
    ten: "Công văn",
    vietTat: "CV",
    huong: "COTRUC",
    laCongVan: true,
    moTa:
      "Văn bản trao đổi chính thức mọi hướng: mời, mượn địa điểm, phối hợp, trả lời, yêu cầu cung cấp thông tin… Trích yếu 'V/v …' chữ nghiêng ngay dưới số - ký hiệu; nơi nhận chính ghi sau 'Kính gửi:', nơi liên quan ghi ở Nơi nhận cuối văn bản.",
    noiNhanMau: ["Như trên;", "Cấp trên trực tiếp (nếu cần báo cáo);", "Lưu VP."],
  },
  {
    id: "BAO_CAO",
    ten: "Báo cáo",
    vietTat: "BC",
    huong: "LEN",
    laCongVan: false,
    moTa:
      "Cấp dưới gửi cấp trên: báo cáo định kỳ (tuần/tháng/quý/6 tháng/năm), báo cáo chuyên đề, báo cáo tổng kết. Tên loại in hoa đậm + trích yếu đậm dưới; thân gồm căn cứ, kết quả, đánh giá, phương hướng, đề xuất.",
    noiNhanMau: [
      "Ban Bí thư / Ban Thường vụ Đoàn cấp trên trực tiếp;",
      "Cấp ủy Đảng cùng cấp (để báo cáo);",
      "Lưu VP.",
    ],
  },
  {
    id: "TO_TRINH",
    ten: "Tờ trình",
    vietTat: "TTr",
    huong: "LEN",
    laCongVan: false,
    moTa:
      "Cấp dưới trình cấp trên phê duyệt nội dung (chương trình, kinh phí, nhân sự, tổ chức hoạt động…). Kết thúc thân bài bằng đoạn đề nghị phê duyệt; nơi nhận chủ yếu là cấp trên có thẩm quyền quyết định.",
    noiNhanMau: ["Cấp trên trực tiếp có thẩm quyền phê duyệt;", "Lưu VP."],
  },
  {
    id: "KE_HOACH",
    ten: "Kế hoạch",
    vietTat: "KH",
    huong: "XUONG",
    laCongVan: false,
    moTa:
      "Ban hành xuống cấp dưới thực hiện: kế hoạch công tác, kế hoạch hoạt động, kế hoạch thi đua… Thân gồm mục tiêu, yêu cầu, nội dung - tiến độ theo bảng (thời gian / nội dung / đơn vị phụ trách), phân công, điều lệ thực hiện.",
    noiNhanMau: [
      "Ban Bí thư / Ban Thường vụ Đoàn cấp trên (để báo cáo);",
      "Các đơn vị Đoàn trực thuộc (để thực hiện);",
      "Lưu VP.",
    ],
  },
  {
    id: "CHUONG_TRINH",
    ten: "Chương trình",
    vietTat: "CTr",
    huong: "XUONG",
    laCongVan: false,
    moTa:
      "Khung triển khai hoạt động theo chủ đề hoặc theo năm học: mục tiêu, khẩu hiệu, nội dung chính, tiến độ các giai đoạn, chỉ tiêu điểm nhấn.",
    noiNhanMau: [
      "Ban Bí thư / Ban Thường vụ Đoàn cấp trên (để báo cáo);",
      "Các đơn vị Đoàn trực thuộc (để thực hiện);",
      "Lưu VP.",
    ],
  },
  {
    id: "QUYET_DINH",
    ten: "Quyết định / Quy định",
    vietTat: "QĐ",
    huong: "XUONG",
    laCongVan: false,
    moTa:
      "Văn bản chỉ đạo có giá trị thi hành: quyết định thành lập, phân công, khen thưởng - kỷ luật; quy định, quy chế thi đua - khen thưởng. Thân gồm căn cứ, nội dung từng điều khoản, hiệu lực thi hành, đơn vị chịu trách nhiệm thi hành.",
    noiNhanMau: [
      "Ban Bí thư / Ban Thường vụ Đoàn cấp trên (để báo cáo);",
      "Các đơn vị, cá nhân liên quan (để thi hành);",
      "Lưu VP.",
    ],
  },
  {
    id: "CHI_THI",
    ten: "Chỉ thị",
    vietTat: "CT",
    huong: "XUONG",
    laCongVan: false,
    moTa:
      "Chỉ đạo đột phá về tư tưởng, hành động cho cấp dưới trong thời điểm cụ thể. Khẩu hiệu hành động thường ghi dưới tiêu đề.",
    noiNhanMau: [
      "Ban Bí thư / Ban Thường vụ Đoàn cấp trên (để báo cáo);",
      "Các đơn vị Đoàn trực thuộc (để thực hiện);",
      "Lưu VP.",
    ],
  },
  {
    id: "THONG_TRI",
    ten: "Thông tri",
    vietTat: "TT",
    huong: "XUONG",
    laCongVan: false,
    moTa: "Phổ biến chủ trương, kết luận của cấp có thẩm quyền cho toàn hệ thống triển khai.",
    noiNhanMau: [
      "Ban Bí thư / Ban Thường vụ Đoàn cấp trên (để báo cáo);",
      "Các đơn vị Đoàn trực thuộc (để thực hiện);",
      "Lưu VP.",
    ],
  },
  {
    id: "HUONG_DAN",
    ten: "Hướng dẫn",
    vietTat: "HD",
    huong: "XUONG",
    laCongVan: false,
    moTa:
      "Do cơ quan tham mưu (Văn phòng, Ban…) ban hành theo thẩm quyền — người ký là thủ trưởng cơ quan tham mưu (Chánh Văn phòng, Q. Trưởng ban) hoặc cấp phó ký thay bằng 'KT.'. Tên cơ quan ban hành ghi thêm tên Ban dưới tên cấp bộ Đoàn.",
    noiNhanMau: [
      "Ban Bí thư / Ban Thường vụ Đoàn cấp trên (để báo cáo);",
      "Các đơn vị Đoàn trực thuộc (để thực hiện);",
      "Lưu VP.",
    ],
  },
  {
    id: "THONG_BAO",
    ten: "Thông báo",
    vietTat: "TB",
    huong: "XUONG",
    laCongVan: false,
    moTa: "Thông báo kết luận của lãnh đạo, kết quả hoạt động, lịch - thông tin cần phổ biến rộng trong hệ thống.",
    noiNhanMau: [
      "Ban Bí thư / Ban Thường vụ Đoàn cấp trên (để báo cáo);",
      "Các đơn vị Đoàn trực thuộc;",
      "Lưu VP.",
    ],
  },
  {
    id: "GIOI_THIEU_MOI",
    ten: "Giấy giới thiệu / Giấy mời",
    vietTat: "Ggt/Gm",
    huong: "COTRUC",
    laCongVan: false,
    moTa:
      "Văn bản hành chính cá nhân, có thể trình bày khổ A5. Giấy giới thiệu: giới thiệu đoàn viên đến làm việc, thực tập. Giấy mời: mời dự họp, hội nghị, hoạt động — ghi rõ thời gian, địa điểm, nội dung, yêu cầu chuẩn bị.",
    noiNhanMau: ["Người nhận giấy (ghi trực tiếp trong nội dung);", "Lưu VP."],
  },
];

/**
 * RULEBOOK THỂ THỨC cho Trợ lý AI — nén từ QĐ 27-HĐ/TĐTN-VP (12/02/2014) + Mẫu 3.
 * Bám đúng quy định nhưng linh hoạt mọi cấp (TW → tỉnh → quận/huyện → cơ sở → chi đoàn)
 * và mọi hướng gửi (cấp trên → cấp dưới, cấp dưới → cấp trên, ngang hàng/ngoài hệ thống).
 */
export const THE_THUC_RULEBOOK = `
[THỂ THỨC VĂN BẢN ĐOÀN — QĐ 27-HĐ/TĐTN-VP + Hướng dẫn 29-HD/TWĐTN-VP, MẪU 3]
Khi được yêu cầu soạn/lấy khung văn bản, sinh đủ 8 thành phần thể thức theo thứ tự:
1) KHỐI THỂ THỊ (bảng 2 ô):
   - Ô trái dòng 1: tên cấp trên trực tiếp (chữ thường, bỏ trống nếu là Trung ương Đoàn): THÀNH ĐOÀN TP. … / QUẬN ĐOÀN … / ĐOÀN TRƯỜNG …
   - Ô trái dòng 2 (IN HOA, đậm): tác giả văn bản — BCH ĐOÀN + tên đơn vị; Ban tham mưu thêm dòng đậm tên Ban (BAN TỔ CHỨC, BAN TNTH…); Chi đoàn: CHI ĐOÀN + tên; Liên chi đoàn: BCH LIÊN CHI ĐOÀN + tên.
   - Dòng *** dưới tên cơ quan.
   - Ô trái dòng cuối: 'Số: …-KÝ HIỆU' để TRỐNG số thứ tự cho đơn vị tự điền.
   - Ô phải: 'ĐOÀN TNCS HỒ CHÍ MINH' in hoa đậm, dưới có đường kẻ ngang ngang bằng chữ; tiếp theo là địa danh + 'ngày … tháng … năm …' (in nghiêng), căn phải dưới tiêu đề.
2) ĐỊA DANH: TP → 'TP. Hồ Chí Minh'; đoàn quận/huyện → tên quận/huyện; đoàn xã/phường → tên phường/xã; đoàn khối ngành trực thuộc cấp trên thì lấy tên địa phương nơi trụ sở. Ngày dưới mùng 10 và tháng 1, 2 phải viết có số 0 đầu (ngày 05 tháng 02 năm 2027); KHÔNG thay 'ngày/tháng/năm' bằng chấm hay gạch chéo.
3) SỐ - KÝ HIỆU: Số: {thứ tự từ 01 mỗi loại văn bản theo nhiệm kỳ}-{ký hiệu thể loại}/{ký hiệu cơ quan}[-{đơn vị tham mưu}].
   - Thể loại: QĐ (Quyết định + Quy định), CT (Chỉ thị), CTr (Chương trình), TT (Thông tri), TTr (Tờ trình), BC (Báo cáo), CV (Công văn), KH (Kế hoạch), HD (Hướng dẫn), TB (Thông báo), NQLT/KHLT (liên tịch - phối hợp), BS (bản sao), Gm/Ggt (giấy mời/giới thiệu).
   - Cơ quan: TW Đoàn dùng TWĐTN; Thành/Tỉnh Đoàn dùng TĐTN (hoặc ĐTN theo tập quán địa phương); Đoàn quận/huyện và Đoàn cơ sở dùng ĐTN; Chi đoàn cơ sở CĐCS; Chi đoàn CĐ; Phân đoàn PĐ; đơn vị tham mưu: VP, BTC, BKT, TNTH…
   - Văn bản của Đại hội đánh số chung ký hiệu /ĐH.
4) TÊN LOẠI + TRÍCH YẾU: tên loại IN HOA ĐẬM căn giữa (BÁO CÁO / KẾ HOẠCH / QUYẾT ĐỊNH…), trích yếu chữ thường đậm căn giữa ngay dưới, rồi dòng kẻ ngang '-----------'. RIÊNG CÔNG VĂN: KHÔNG ghi tên loại — trích yếu 'V/v …' chữ thường IN NGHIÊNG ngay dưới số - ký hiệu.
5) PHẦN NỘI DUNG:
   - Trình bày TNR cỡ 14, căn đều 2 lề, thụt đầu dòng 1,27cm, cách đoạn ≤ 6pt, cách dòng ≤ 1,2.
   - CÓ CĂN CỨ: mỗi căn cứ một dòng đánh a), b), c)… kết thúc ';' — căn cứ cuối kết thúc ',' — sau đó: 'Xét đề nghị của … và phân công …' (quyết định) hoặc dẫn nhập 'Thực hiện chỉ đạo của …' rồi nội dung chính.
   - KHOẢN: '1. 2. 3.' đậm đầu dòng; ĐIỂM: 'a) b) c)'; MỤC lớn: 'I. II. III.' IN HOA đậm; PHẦN (báo cáo tổng kết): 'Phần thứ nhất/thứ hai…' + tiêu đề phần căn giữa.
   - Báo cáo: kết quả → ưu điểm → hạn chế → phương hướng → đề xuất kiên nghị. Tờ trình: căn cứ → nội dung đề xuất → đoạn đề nghị: 'Kính đề nghị … xem xét, phê duyệt'. Kế hoạch/chương trình: mục tiêu → yêu cầu → nội dung, tiến độ (bảng: thời gian | nội dung | đơn vị phụ trách) → tổ chức thực hiện. Công văn: Kính gửi → V/v nêu yêu cầu cụ thể → chốt 'Kính đề nghị … phối hợp thực hiện' hoặc cam kết.
6) CHỮ KÝ (bên phải, dưới nội dung):
   - Cơ quan lãnh đạo (BCH/BTV/Đại hội): 'TM. BAN CHẤP HÀNH …' hoặc 'TM. BAN THƯỜNG VỤ …' → chức danh (BÍ THƯ / PHÓ BÍ THƯ / PHÓ BÍ THƯ THƯỜNG TRỰC) → dòng '(Chữ ký)' → họ tên.
   - Chi đoàn có BCH: 'TM. BAN CHẤP HÀNH CHI ĐOÀN / BÍ THƯ'; không BCH: 'TM. CHI ĐOÀN / BÍ THƯ'.
   - Cơ quan tham mưu (làm việc theo chế độ thủ trưởng): thủ trưởng ký → chức danh trực tiếp (CHÁNH VĂN PHÒNG, Q. TRƯỞNG BAN); cấp phó ký thay → 'KT. TRƯỞNG BAN / PHÓ TRƯỞNG BAN'.
   - Được ủy quyền ký → 'TL. BAN THƯỜNG VỤ … / CHÁNH VĂN PHÒNG'.
   - Dấu cơ quan đóng đỏ trùm ~1/3 chữ ký bên trái (ghi chú ngoài văn bản soạn, không in trong file).
7) NƠI NHẬN (góc trái dưới, ngang hàng chức danh ký): dòng 'Nơi nhận:' đậm cỡ 13; các dòng '- …' cỡ 11, mỗi dòng kết thúc ';' — dòng cuối kết thúc '.'.
   - THỨ TỰ: cơ quan thẩm quyền cao → thấp; từ TW về cơ sở; tập thể → cá nhân; ghi mục đích trong ngoặc (để báo cáo / để thực hiện / để phối hợp); cuối cùng 'Lưu VP.' hoặc 'Lưu VT-LT.' (+ tổng số bản '(…b)' nếu cần).
   - CÔNG VĂN: nơi nhận chính ghi ngay đầu thân bài sau 'Kính gửi:…' (nhiều nơi nhận chính thì 'Đồng kính gửi:…'); Nơi nhận cuối chỉ ghi đơn vị liên quan + lưu.
   - CẤP DƯỚI GỬI LÊN (báo cáo, tờ trình): Nơi nhận phải có cấp trên trực tiếp đầu tiên. CẤP TRÊN BAN HÀNH XUỐNG (quyết định, chỉ thị, kế hoạch, chương trình): nơi nhận gồm cấp dưới trực tiếp '(để thực hiện)' + cấp trên '(để báo cáo)' + lưu.
8) THÀNH PHẦN BỔ SUNG: MẬT (khung chữ nhật dưới số - ký hiệu); KHẨN / THƯỢNG KHẨN / HỎA TỐC dưới MẬT; 'DỰ THẢO LẦN THỨ…' + tên cơ quan dự thảo; 'Tài liệu hội nghị …'; văn bản liên tịch theo thể thức cơ quan chủ trì, tên các cơ quan ghi đủ cách nhau dấu '-', ký hiệu NQLT/KHLT.
QUY TẮC LINH HOẠT THEO CẤP — tự suy từ tên đơn vị người dùng cung cấp:
- Cấp có cấp trên trực tiếp → tên cấp trên ghi dòng trên tác giả ở ô trái; Trung ương Đoàn → chỉ 'BCH ĐOÀN TNCS HỒ CHÍ MINH' hoặc 'BAN THƯỜNG VỤ ĐOÀN TNCS HỒ CHÍ MINH'.
- Không biết số thứ tự văn bản → để chỗ trống '…'; không biết họ tên người ký → ghi chức danh và dòng (Chữ ký) + 'Nguyễn Văn A' làm ví dụ phải báo rõ người dùng tự thay.
- Luôn hỏi lại (1 câu ngắn) khi thiếu quyết định: loại văn bản, tên đơn vị, nội dung chính, người ký — nhưng nếu người dùng đã nêu đủ thì soạn ngay, không hỏi thêm.
`.trim();
