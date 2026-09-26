# 5. Ví dụ hoàn chỉnh: Mẫu Báo cáo tháng (BC-T01)

> Minh họa 1 mẫu "đi được từ đầu đến cuối": thể thức → căn cứ → ô số liệu → ánh xạ DB.

## 5.1. Mẫu văn bản (DOCX thể thức, placeholder đánh dấu)

```
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                     Độc lập - Tự do - Hạnh phúc

Số: {{so_hieu}}                        {{dia_danh}}, {{ngay_ban_hanh}}

                    {{ten_co_quan}}
┌─────────────────────────────────────────────────────────┐
│                       BÁO CÁO                           │
│   về tình hình thực hiện Chương trình Thanh niên        │
│   Trường học {{ky}}                                     │
└─────────────────────────────────────────────────────────┘

{{can_cu_1}}
{{can_cu_2}}
{{can_cu_3}},
{{ten_co_quan_thuong}} BÁO CÁO:

I. CÔNG TÁC XÂY DỰNG, THAM MƯU
   - Triển khai {{so_hoat_dong}} hoạt động, thu hút
     {{tong_luot_tham_gia}} lượt đoàn viên tham gia;
     {{so_hoat_dong_da_xac_nhan}} hoạt động được cấp trên xác nhận.
   {{phan_dinh_danh_gia}}

II. KẾT QUẢ THỰC HIỆN NHIỆM VỤ, CHỈ TIÊU
    {#bang_nhiem_vu}
    - Nhiệm vụ {ma}: {ten} — chỉ tiêu {chitieu}, đạt {dat} ({ty_le}%).
    {/bang_nhiem_vu}
   → Tỷ lệ hoàn thành bình quân: {{ty_le_hoan_thanh}}%;
     {{so_nhiem_vu_qua_han}} nhiệm vụ quá hạn.

III. KẾT QUẢ THI ĐUA, XẾP LOẠI
   - Tổng điểm thi đua: {{tong_diem_thidua}}/{{tong_diem_toi_da}};
     xếp hạng {{hang_bxh}} trong kỳ.

IV. CÔNG TÁC THÔNG TIN, TRUYỀN THÔNG
   - Đăng {{so_tin_bai_dang}} tin bài, đạt {{tong_luot_xem}} lượt xem.

V. KIẾN NGHỊ, ĐỀ XUẤT
   {{kien_nghi_de_xuat}}


NƠI NHẬN:                                {{chuc_vu_nguoi_ky}}
- {{noi_nhan_1}};                            (Đã ký)
- {{noi_nhan_2}};                        {{nguoi_ky}}
- Lưu: VT.
```

## 5.2. Bảng ánh xạ ô số liệu → DB

| Ô (`{{...}}`) | Kiểu | Nguồn | Sửa tay? |
|---|---|---|---|
| `so_hieu` | text | Sổ văn bản: `{số}/TNTH-{ký hiệu đơn vị}` | Chọn từ sổ |
| `dia_danh` | text | `org_units.admin_unit_name` của đơn vị xuất | Không |
| `ngay_ban_hanh` | date | Ngày bấm xuất (`dd/mm/yyyy`) | Không |
| `ten_co_quan` | text | `org_units.name` viết hoa | Không |
| `ky` | text | Người chọn: "tháng 9/2026" | Chọn kỳ |
| `can_cu_1..3` | text | `citation_refs` gắn với mẫu BC-T01, sắp theo `sort_order` | Không |
| `ten_co_quan_thuong` | text | `org_units.name` | Không |
| `so_hoat_dong` | number | `COUNT(activities)` trong kỳ, phạm vi đơn vị | **Khóa** |
| `tong_luot_tham_gia` | number | `SUM(activities.participant_count)` | **Khóa** |
| `so_hoat_dong_da_xac_nhan` | number | `COUNT(activities WHERE confirm_status=CONFIRMED)` | **Khóa** |
| `bang_nhiem_vu` | table | `task_assignments` JOIN `assignment_targets` JOIN `tasks` | **Khóa** |
| `ty_le_hoan_thanh` | percent | `AVG(task_assignments.completion_rate)` | **Khóa** |
| `so_nhiem_vu_qua_han` | number | `COUNT(task_assignments WHERE progress_status=OVERDUE)` | **Khóa** |
| `tong_diem_thidua` | number | `SUM(scores.points)` theo bộ tiêu chí hiện hành | **Khóa** |
| `tong_diem_toi_da` | number | `criteria_sets.total_points` | **Khóa** |
| `hang_bxh` | number | `ranking_entries.rank_position` snapshot phù hợp; `—` nếu chưa chốt | **Khóa** |
| `so_tin_bai_dang` | number | `COUNT(published_posts WHERE status=PUBLISHED)` | **Khóa** |
| `tong_luot_xem` | number | `SUM(published_posts.view_count)` | **Khóa** |
| `phan_dinh_danh_gia` | text | Người soạn (có gợi ý nháp AI) | ✅ Sửa |
| `kien_nghi_de_xuat` | text | Người soạn | ✅ Sửa |
| `chuc_vu_nguoi_ky`, `nguoi_ky` | text | `accounts.contact_position`, `contact_person` | ✅ Sửa |
| `noi_nhan_1..2` | text | Mặc định theo cấp: Đoàn cấp trên trực tiếp; Lưu VT | ✅ Chọn |

## 5.3. Màn hình trong hệ thống

```
┌ Quản trị → Báo cáo → Báo cáo tháng 9/2026 ─────────────────────┐
│ [Chọn mẫu ▼ BC-T01 Báo cáo tháng]  [Kỳ: 09/2026 ▼]  [Tổng hợp] │
│                                                                │
│ ── XEM TRƯỚC ──────────────────────────────────────────────    │
│ (PDF render — đúng thể thức, số liệu đã điền)                  │
│                                                                │
│ ⚠ Kiểm tra thể thức: 6/6 đạt · Số liệu: 10/10 ô đã có          │
│                                                                │
│ [Sửa phần nhận xét & kiến nghị]   [Xuất Word] [Xuất PDF]       │
└────────────────────────────────────────────────────────────────┘
```

- Số liệu khóa hiển thị nền xám nhạt; ô sửa tay nền trắng có viền.
- Cảnh báo nếu đơn vị chưa nhập đủ chỉ tiêu: "3 nhiệm vụ chưa có kết quả — ô tương ứng sẽ hiển thị `—`".
- Xuất xong ghi vào `report_exports`: mẫu BC-T01, snapshot số liệu, người xuất, thời điểm.
