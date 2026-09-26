# 3. Kho mẫu văn bản — Phân loại, Trích căn cứ, Ô số liệu

> Mẫu (`document_templates`) và căn cứ (`citation_refs`) là 2 danh mục mới đề xuất bổ sung
> vào thiết kế CSDL 43 bảng hiện có. Ô số liệu (`data_slots`) khai báo nguồn lấy từ DB.

## 3.1. Phân loại văn bản

| Mã loại | Tên loại | Mục đích | Ai xuất |
|---|---|---|---|
| `BC` | Báo cáo (tháng/quý/năm/đột xuất) | Trình cấp trên tình hình, kết quả | Đơn vị tất cả cấp |
| `CV` | Công văn | Đề nghị, hướng dẫn, trả lời | Cấp 1–3 |
| `KH` | Kế hoạch | Triển khai nhiệm vụ, đợt phát động | Cấp 1–3 |
| `TT` | Tờ trình | Đề xuất phê duyệt (kinh phí, nhân sự…) | Cấp 1–3 |
| `TB` | Thông báo | Phổ biến quyết định, lịch, kết luận | Cấp 1–3 |
| `BCDT` | Báo cáo đột xuất | Sự vụ khẩn, điển hình tiên tiến | Đơn vị tất cả cấp |

## 3.2. Cấu trúc 1 mẫu văn bản

Mỗi mẫu = **file DOCX thể thức** + **bản khai báo slot** (JSON) + **danh sách căn cứ đính**:

```
document_templates
├─ template_code   : BC-T01                (mã mẫu, UQ)
├─ name            : Báo cáo tháng phong trào Thanh niên Trường học
├─ doc_type        : BC                    (FK → phân loại trên)
├─ period_type     : MONTH                 (kỳ áp dụng: MONTH/QUARTER/YEAR/AD_HOC)
├─ org_levels      : [2,3,4]               (cấp đơn vị được dùng mẫu này)
├─ file_id         : → files               (file .docx thể thức gốc)
├─ slot_config     : JSON                  (danh sách ô dữ liệu, xem 3.4)
├─ citation_ids    : [1,2,7]               (căn cứ đính kèm, xem 3.3)
├─ signing_title   : BÍ THƯ                (chức vụ mặc định người ký)
└─ status          : DRAFT / ACTIVE / ARCHIVED
```

## 3.3. Danh mục trích căn cứ (`citation_refs`)

Mỗi căn cứ là 1 bản ghi dùng chung, mẫu nào cần thì gắn vào — **không ai phải gõ lại**:

| id | Nội dung căn cứ (chuỗi cố định) | Dùng cho |
|---|---|---|
| 1 | Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05/3/2020 của Chính phủ về công tác văn thư; | Tất cả mẫu |
| 2 | Căn cứ Quyết định số …/QĐ-TWĐ ngày … của Ban Bí thư TW Đoàn ban hành Chương trình Thanh niên Trường học; | BC, KH |
| 3 | Căn cứ Hướng dẫn số …/HD-TNTH ngày … của Ban TNTH — TW Đoàn về triển khai Chương trình năm 2026; | BC, KH |
| 4 | Căn cứ Kế hoạch số …/KH-ĐTN ngày … của Đoàn TNCS HCM {tỉnh} về Chương trình Thanh niên Trường học năm 2026; | BC, KH (cấp dưới tỉnh) |
| 5 | Căn cứ Thể thức xếp hạng, đánh giá thi đua ban hành kèm Quyết định số …; | BC quý/năm |
| 6 | Căn cứ kết luận của {chức_vụ} tại cuộc họp ngày {ngày}; | BC đột xuất |
| … | *(danh mục mở — Ban TNTH TW bổ sung văn bản chính thức)* | |

> ⚠️ Các số liệu `…` trong bảng trên là **chỗ trống chờ** văn bản chính thức của TW Đoàn.
> Khi Ban cung cấp, chỉ cần cập nhật danh mục — mọi mẫu dùng căn cứ đó tự đúng theo.

**Cấu trúc bản ghi:**

```
citation_refs
├─ id, content       : chuỗi căn cứ nguyên bản (có thể chứa biến {tỉnh}, {ngày})
├─ source_code       : NDC30 / QD-TWD / HD-TNTH …
├─ doc_types         : [BC, KH, CV]        (loại mẫu nào dùng)
├─ sort_order        : thứ tự sắp trong phần căn cứ
└─ is_active
```

## 3.4. Ô số liệu (data slots) — nguồn từ DB của đơn vị

Mỗi ô trong mẫu khai báo: **tên biến · nhãn hiển thị · kiểu · nguồn truy vấn · định dạng**.
Tại thời điểm xuất, hệ thống chạy truy vấn theo `{org_unit_id}` + `{kỳ}` rồi điền vào.

### Nhóm A — Thông tin hành chính (lấy từ mẫu + phiên xuất)

| Biến | Nhãn | Nguồn |
|---|---|---|
| `{{quoc_hieu}}`, `{{tieu_ngu}}` | Quốc hiệu, tiêu ngữ | Cố định theo mẫu |
| `{{so_hieu}}` | Số, ký hiệu văn bản | Sinh từ sổ văn bản: `{số}/{ký hiệu đơn vị}-{ký hiệu người ký}` |
| `{{dia_danh}}`, `{{ngay_ban_hanh}}` | Nơi và ngày ban hành | Địa danh của đơn vị (`org_units.admin_unit_id`); ngày = ngày xuất |
| `{{ten_co_quan}}` | Tên cơ quan ban hành | `org_units.name` (viết hoa) |
| `{{ky}}` | Kỳ báo cáo | Người dùng chọn |
| `{{nguoi_ky}}`, `{{chuc_vu_nguoi_ky}}` | Chữ ký | `accounts.contact_person`, `accounts.contact_position` hoặc nhập tay |

### Nhóm B — Số liệu nghiệp vụ (khóa cứng từ DB)

| Biến | Nhãn | Nguồn DB (bảng · phép tính) |
|---|---|---|
| `{{so_hoat_dong}}` | Số hoạt động trong kỳ | `COUNT(activities)` WHERE org_unit_id ∈ phạm vi, start_date trong kỳ |
| `{{tong_luot_tham_gia}}` | Tổng lượt đoàn viên tham gia | `SUM(activities.participant_count)` cùng điều kiện trên |
| `{{so_hoat_dong_da_xac_nhan}}` | Số hoạt động được xác nhận | `COUNT(activities)` WHERE confirm_status = CONFIRMED |
| `{{bang_nhiem_vu}}` | Bảng nhiệm vụ: chỉ tiêu / đạt / % | `task_assignments` JOIN `assignment_targets` GROUP BY task |
| `{{ty_le_hoan_thanh}}` | Tỷ lệ hoàn thành bình quân | `AVG(task_assignments.completion_rate)` |
| `{{so_nhiem_vu_qua_han}}` | Số nhiệm vụ quá hạn | `COUNT(task_assignments)` WHERE progress_status = OVERDUE |
| `{{tong_diem_thidua}}` | Tổng điểm thi đua | `SUM(scores.points)` WHERE criteria_set_id = bộ hiện hành |
| `{{so_tin_bai_dang}}` | Số tin bài đã đăng | `COUNT(published_posts)` WHERE status = PUBLISHED |
| `{{tong_luot_xem}}` | Tổng lượt xem tin bài | `SUM(published_posts.view_count)` |
| `{{hang_bxh}}` | Xếp hạng trong kỳ (nếu có) | `ranking_entries.rank_position` của snapshot phù hợp |

### Nhóm C — Phần người dùng soạn (không khóa)

| Biến | Nhãn | Ghi chú |
|---|---|---|
| `{{phan_dinh_danh_gia}}` | Nhận xét, đánh giá | Textarea có gợi ý từ AI (bản nháp) |
| `{{kien_nghi_de_xuat}}` | Kiến nghị, đề xuất | Textarea |
| `{{noi_nhan}}` | Danh sách nơi nhận | Chọn từ cây đơn vị, mặc định theo cấp |

> Nguyên tắc: **Nhóm B không sửa tay được** — nếu số liệu sai, đơn vị phải sửa dữ liệu gốc rồi xuất lại.
> Nhờ vậy báo cáo luôn khớp hệ thống, cấp trên cộng gộp được ngay.
