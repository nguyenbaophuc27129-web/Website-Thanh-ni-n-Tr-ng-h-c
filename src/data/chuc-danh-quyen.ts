/**
 * Phân quyền THEO CHỨC DANH Ban Thường vụ Trung ương Đoàn.
 * Nguồn: file "quyền của từng người trong các chức vụ.xlsx" (Ban TNTH cung cấp).
 * - toanQuyen: "Tất cả chức năng hiện nay" — người giữ chức danh dùng toàn bộ hệ thống.
 * - quyen: danh sách quyền cụ thể (hiển thị để các anh chị sau này tiện cấp quyền cho nhau).
 * Lưu ý: đây là lớp mô tả trên vai trò (ROLE_PERMISSIONS); khi tích hợp backend
 * ánh xạ sang bảng account_permission theo tài khoản.
 */
export interface ChucDanhQuyen {
  id: number;
  ten: string;
  moTa: string;
  toanQuyen: boolean;
  quyen: { code: string; ten: string }[];
  /** Tài khoản demo thử quyền của chức danh này (nếu có) */
  demoUser?: string;
}

/** Các quyền chi tiết dùng cho chức danh giới hạn */
export const QUYEN_HS3T = [
  { code: "hs3t.view", ten: "Xem hồ sơ Học sinh 3 tốt" },
  { code: "hs3t.review", ten: "Thẩm định, duyệt, đánh giá hồ sơ Học sinh 3 tốt" },
];
export const QUYEN_KIEM_TRA = [
  { code: "feedback.view", ten: "Xem phản ánh, kiến nghị của Học sinh THPT" },
  { code: "feedback.reply", ten: "Trả lời phản ánh, kiến nghị của Học sinh THPT" },
];
export const QUYEN_TIN_TUC = [
  { code: "post.manage", ten: "Đọc, thẩm định, duyệt đăng chuyên mục Tin tức" },
  { code: "forum.interact", ten: "Bình luận các chủ đề trên Diễn đàn" },
];
export const QUYEN_DU_AN_TN = [
  { code: "project.manage", ten: 'Đọc, thẩm định, duyệt đăng chuyên mục "Mỗi trường THPT 01 dự án tình nguyện vì cộng đồng"' },
  { code: "forum.interact", ten: "Bình luận các chủ đề trên Diễn đàn" },
];

export const chucDanhQuyenList: ChucDanhQuyen[] = [
  { id: 1, ten: "Bí thư thứ nhất Trung ương Đoàn", moTa: "Tất cả chức năng hiện nay", toanQuyen: true, quyen: [] },
  { id: 2, ten: "Bí thư Thường trực Trung ương Đoàn", moTa: "Tất cả chức năng hiện nay", toanQuyen: true, quyen: [] },
  { id: 3, ten: "Bí thư Ban Bí thư", moTa: "Tất cả chức năng hiện nay", toanQuyen: true, quyen: [] },
  { id: 4, ten: "Trưởng Ban Công tác Thanh thiếu nhi", moTa: "Tất cả chức năng hiện nay", toanQuyen: true, quyen: [] },
  { id: 5, ten: "Trưởng Ban Công tác Đoàn", moTa: "Tất cả chức năng hiện nay", toanQuyen: true, quyen: [] },
  { id: 6, ten: "Phó Trưởng Ban Công tác Thanh thiếu nhi", moTa: "Tất cả chức năng hiện nay", toanQuyen: true, quyen: [] },
  { id: 7, ten: "Phó Trưởng Ban Công tác Đoàn", moTa: "Tất cả chức năng hiện nay", toanQuyen: true, quyen: [] },
  { id: 8, ten: "Chuyên viên phụ trách chính Web", moTa: "Tất cả chức năng hiện nay", toanQuyen: true, quyen: [] },
  {
    id: 9,
    ten: "Chuyên viên phụ trách công tác kiểm tra",
    moTa: "Chỉ chức năng xem, trả lời phản ánh, kiến nghị của Học sinh THPT",
    toanQuyen: false,
    quyen: QUYEN_KIEM_TRA,
    demoUser: "cv.kiemtra",
  },
  {
    id: 10,
    ten: "Chuyên viên phụ trách xét hồ sơ Học sinh 3 tốt",
    moTa: "Chỉ chức năng xem, thẩm định, duyệt, đánh giá hồ sơ Học sinh 3 tốt",
    toanQuyen: false,
    quyen: QUYEN_HS3T,
    demoUser: "cv.hs3t",
  },
  { id: 11, ten: "Trưởng Ban Biên tập", moTa: "Tất cả chức năng hiện nay", toanQuyen: true, quyen: [] },
  { id: 12, ten: "Phó Trưởng Ban Biên tập", moTa: "Tất cả chức năng hiện nay", toanQuyen: true, quyen: [] },
  {
    id: 13,
    ten: "CTV phụ trách chuyên mục Tin tức",
    moTa: "Chỉ chức năng đọc, thẩm định, duyệt đăng, bình luận các chủ đề trong mục Tin tức + Forum",
    toanQuyen: false,
    quyen: QUYEN_TIN_TUC,
    demoUser: "ctv.tintuc",
  },
  {
    id: 14,
    ten: 'CTV phụ trách chuyên mục "Mỗi trường THPT 01 dự án tình nguyện vì cộng đồng"',
    moTa: "Chỉ chức năng đọc, thẩm định, duyệt đăng, bình luận các chủ đề trong mục liên quan",
    toanQuyen: false,
    quyen: QUYEN_DU_AN_TN,
    demoUser: "ctv.duan",
  },
  {
    id: 15,
    ten: 'CTV hỗ trợ xét "Học sinh 3 tốt"',
    moTa: "Chỉ chức năng xem, thẩm định, duyệt, đánh giá hồ sơ Học sinh 3 tốt",
    toanQuyen: false,
    quyen: QUYEN_HS3T,
    demoUser: "cv.hs3t",
  },
];
