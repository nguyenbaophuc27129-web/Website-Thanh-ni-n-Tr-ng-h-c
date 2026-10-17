import type { VolunteerProject } from "@/types";

/**
 * Ngân hàng dự án tình nguyện "Mỗi trường THPT — 01 dự án".
 * Mỗi dự án gắn lĩnh vực (field) và giai đoạn (phase) để tra cứu — lập kho,
 * không còn bản đồ (trùng nền tảng Hội Sinh viên Việt Nam).
 */
export const volunteerProjects: VolunteerProject[] = [
  {
    id: 921, orgUnitId: 31, schoolName: "THPT Chánh Phú Hưng", province: "Bình Dương",
    projectName: "Đồng quản lý kênh Nông Trại xanh",
    summary: "Thu gom rác thải nhựa ven kênh Nông Trại, phân loại tại nguồn và trao túi vải cho hộ dân.",
    beneficiaries: "450 hộ dân ven kênh", participants: 120,
    status: "APPROVED", field: "MOI_TRUONG", phase: "HOAN_THANH",
    createdAt: "2026-08-25T02:00:00Z",
  },
  {
    id: 922, orgUnitId: 29, schoolName: "Trường THPT Bến Nghé", province: "TP Hồ Chí Minh",
    projectName: "Bữa sáng tình thương khu phố cổ",
    summary: "500 suất ăn sáng miễn phí mỗi tháng cho lao động nghèo khu phường Bến Nghé.",
    beneficiaries: "60 lao động khó khăn", participants: 85,
    status: "APPROVED", field: "AN_SINH", phase: "DANG_TRIEN_KHAI",
    createdAt: "2026-08-28T02:00:00Z",
  },
  {
    id: 923, orgUnitId: 2, schoolName: "THPT Chuyên Hà Nội — Amsterdam", province: "Hà Nội",
    projectName: "Sách cũ tặng bạn — kết nối vùng cao",
    summary: "Thu gom 2.000 đầu sách cũ, xây 1 tủ sách cho điểm trường lẻ Hà Giang.",
    beneficiaries: "300 học sinh vùng cao", participants: 150,
    status: "APPROVED", field: "GIAO_DUC", phase: "HOAN_THANH",
    createdAt: "2026-09-02T02:00:00Z",
  },
  {
    id: 924, orgUnitId: 46, schoolName: "ĐH Sư phạm Nghệ An", province: "Nghệ An",
    projectName: "Lớp học số cho trẻ em Vinh",
    summary: "Dạy kỹ năng số và an toàn không gian mạng cho 400 học sinh THCS tại 6 phường.",
    beneficiaries: "400 học sinh THCS", participants: 95,
    status: "APPROVED", field: "GIAO_DUC", phase: "DANG_TRIEN_KHAI",
    createdAt: "2026-09-05T02:00:00Z",
  },
  {
    id: 925, orgUnitId: 52, schoolName: "ĐH Kinh tế Đà Nẵng", province: "Đà Nẵng",
    projectName: "Giải cứu nông sản cuối năm",
    summary: "Kết nối tiêu thụ 25 tấn dưa lưới, khoai lang cho nông dân ngoại thành Đà Nẵng.",
    beneficiaries: "70 hộ nông dân", participants: 110,
    status: "APPROVED", field: "AN_SINH", phase: "HOAN_THANH",
    createdAt: "2026-09-08T02:00:00Z",
  },
  {
    id: 926, orgUnitId: 60, schoolName: "THPT Chuyên Bình Dương", province: "Bình Dương",
    projectName: "Cây xanh trường học chỉnh trang",
    summary: "Trồng 300 cây xanh, sơn mới 12 phòng học tại 3 trường trên địa bàn TP Thủ Dầu Một.",
    beneficiaries: "3.000 học sinh 3 trường", participants: 130,
    status: "APPROVED", field: "MOI_TRUONG", phase: "DANG_TRIEN_KHAI",
    createdAt: "2026-09-10T02:00:00Z",
  },
  {
    id: 927, orgUnitId: 1, schoolName: "THPT Lào Cai", province: "Lào Cai",
    projectName: "Áo ấm Sa Pa — ấm hơn mùa đông",
    summary: "Vận động 1.000 áo ấm, 500 chăn hơi cho học sinh vùng cao Sa Pa, Bát Xát.",
    beneficiaries: "350 học sinh vùng cao", participants: 90,
    status: "APPROVED", field: "AN_SINH", phase: "DANG_TUYEN",
    createdAt: "2026-09-12T02:00:00Z",
  },
  {
    id: 928, orgUnitId: 1, schoolName: "THPT Chuyên Bến Tre", province: "Bến Tre",
    projectName: "Đường dòng — lưới lọc rác sông nước",
    summary: "Lắp 40 lưới lọc rác trên rạch, thu gom 1,2 tấn rác thải nhựa sông nước Bến Tre.",
    beneficiaries: "220 hộ dân ven rạch", participants: 105,
    status: "APPROVED", field: "MOI_TRUONG", phase: "DANG_TRIEN_KHAI",
    createdAt: "2026-09-15T02:00:00Z",
  },
  {
    id: 929, orgUnitId: 43, schoolName: "THCS Lê Lợi", province: "Bắc Giang",
    projectName: "Sao băng vùng cao",
    summary: "Mô hình lớp học kết nối trực tuyến với điểm trường lẻ, hỗ trợ 45 học sinh vùng lũ.",
    beneficiaries: "45 học sinh vùng lũ", participants: 60,
    status: "PENDING", field: "GIAO_DUC", phase: "DANG_TUYEN",
    createdAt: "2026-09-28T02:00:00Z",
  },
];
