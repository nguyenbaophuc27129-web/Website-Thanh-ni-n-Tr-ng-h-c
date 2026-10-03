import type { VolunteerProject } from "@/types";

/**
 * Dự án tình nguyện "Mỗi trường THPT — 01 dự án" — pin lên bản đồ 34 tỉnh
 * (public/vn-map-34.jpg 1200×1485). mapX/mapY = % tâm tỉnh ước lượng từ ảnh thật:
 *   Lào Cai 18/16 · Hà Nội 21/21 · Nghệ An 26/36 · Đà Nẵng 38/47
 *   TP.HCM 27/65 · Bình Dương 28.5/63 · Cần Thơ 22/71 · Bến Tre 25/73 · Bắc Giang 22/19
 */
export const volunteerProjects: VolunteerProject[] = [
  {
    id: 921, orgUnitId: 31, schoolName: "THPT Chánh Phú Hưng", province: "Bình Dương",
    projectName: "Đồng quản lý kênh Nông Trại xanh",
    summary: "Thu gom rác thải nhựa ven kênh Nông Trại, phân loại tại nguồn và trao túi vải cho hộ dân.",
    beneficiaries: "450 hộ dân ven kênh", participants: 120,
    status: "APPROVED", mapX: 28.5, mapY: 63, createdAt: "2026-08-25T02:00:00Z",
  },
  {
    id: 922, orgUnitId: 29, schoolName: "Trường THPT Bến Nghé", province: "TP Hồ Chí Minh",
    projectName: "Bữa sáng tình thương khu phố cổ",
    summary: "500 suất ăn sáng miễn phí mỗi tháng cho lao động nghèo khu phường Bến Nghé.",
    beneficiaries: "60 lao động khó khăn", participants: 85,
    status: "APPROVED", mapX: 27, mapY: 65, createdAt: "2026-08-28T02:00:00Z",
  },
  {
    id: 923, orgUnitId: 2, schoolName: "THPT Chuyên Hà Nội — Amsterdam", province: "Hà Nội",
    projectName: "Sách cũ tặng bạn — kết nối vùng cao",
    summary: "Thu gom 2.000 đầu sách cũ, xây 1 tủ sách cho điểm trường lẻ Hà Giang.",
    beneficiaries: "300 học sinh vùng cao", participants: 150,
    status: "APPROVED", mapX: 21, mapY: 21, createdAt: "2026-09-02T02:00:00Z",
  },
  {
    id: 924, orgUnitId: 46, schoolName: "ĐH Sư phạm Nghệ An", province: "Nghệ An",
    projectName: "Lớp học số cho trẻ em Vinh",
    summary: "Dạy kỹ năng số và an toàn không gian mạng cho 400 học sinh THCS tại 6 phường.",
    beneficiaries: "400 học sinh THCS", participants: 95,
    status: "APPROVED", mapX: 26, mapY: 36, createdAt: "2026-09-05T02:00:00Z",
  },
  {
    id: 925, orgUnitId: 52, schoolName: "ĐH Kinh tế Đà Nẵng", province: "Đà Nẵng",
    projectName: "Giải cứu nông sản cuối năm",
    summary: "Kết nối tiêu thụ 25 tấn dưa lưới, khoai lang cho nông dân ngoại thành Đà Nẵng.",
    beneficiaries: "70 hộ nông dân", participants: 110,
    status: "APPROVED", mapX: 38, mapY: 47, createdAt: "2026-09-08T02:00:00Z",
  },
  {
    id: 926, orgUnitId: 60, schoolName: "THPT Chuyên Bình Dương", province: "Bình Dương",
    projectName: "Cây xanh trường học chỉnh trang",
    summary: "Trồng 300 cây xanh, sơn mới 12 phòng học tại 3 trường trên địa bàn TP Thủ Dầu Một.",
    beneficiaries: "3.000 học sinh 3 trường", participants: 130,
    status: "APPROVED", mapX: 30, mapY: 62, createdAt: "2026-09-10T02:00:00Z",
  },
  {
    id: 927, orgUnitId: 1, schoolName: "THPT Lào Cai", province: "Lào Cai",
    projectName: "Áo ấm Sa Pa — ấm hơn mùa đông",
    summary: "Vận động 1.000 áo ấm, 500 chăn hơi cho học sinh vùng cao Sa Pa, Bát Xát.",
    beneficiaries: "350 học sinh vùng cao", participants: 90,
    status: "APPROVED", mapX: 18, mapY: 16, createdAt: "2026-09-12T02:00:00Z",
  },
  {
    id: 928, orgUnitId: 1, schoolName: "THPT Chuyên Bến Tre", province: "Bến Tre",
    projectName: "Đường dòng — lưới lọc rác sông nước",
    summary: "Lắp 40 lưới lọc rác trên rạch, thu gom 1,2 tấn rác thải nhựa sông nước Bến Tre.",
    beneficiaries: "220 hộ dân ven rạch", participants: 105,
    status: "APPROVED", mapX: 25, mapY: 73, createdAt: "2026-09-15T02:00:00Z",
  },
  {
    id: 929, orgUnitId: 43, schoolName: "THCS Lê Lợi", province: "Bắc Giang",
    projectName: "Sao băng vùng cao",
    summary: "Mô hình lớp học kết nối trực tuyến với điểm trường lẻ, hỗ trợ 45 học sinh vùng lũ.",
    beneficiaries: "45 học sinh vùng lũ", participants: 60,
    status: "PENDING", mapX: 22, mapY: 19, createdAt: "2026-09-28T02:00:00Z",
  },
];
