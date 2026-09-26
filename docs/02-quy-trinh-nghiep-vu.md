# 2. Quy trình nghiệp vụ chính

> Sơ đồ các luồng demo được trên hệ thống. Ký hiệu: ĐV = đơn vị cơ sở; CT = cấp trên (phường/tỉnh).

## 2.1. Luồng chính: Hoạt động → Xác nhận → Truyền thông

```
ĐV: Tạo hoạt động (DRAFT)
 │  tiêu đề, tóm tắt, thời gian, địa điểm, số người tham gia,
 │  nhóm nội dung, link Facebook/website/báo
 ▼
ĐV: Nộp lên (SUBMITTED) ───────────► CT: nhận thông báo
                                        │
                                        ▼
                        CT: XỬ LÝ 3 kiểu (ghi nhật ký activity_reviews)
                        ├─ XÁC NHẬN (CONFIRMED) ──┐
                        ├─ YÊU CẦU BỔ SUNG (NEEDS_INFO) → ĐV sửa → nộp lại (REVISED)
                        └─ TRẢ LẠI (REJECTED)
                                        │
              ┌─────────────────────────┘
              ▼
Biên tập viên: TẠO BÀI TỪ HOẠT ĐỘNG ĐÃ XÁC NHẬN
 │  tiêu đề báo chí + lead (tự gợi ý từ tóm tắt) + nhóm nội dung
 ▼
ĐĂNG BÀI (PUBLISHED) ──► HIỆN NGAY trên /tin-tuc công khai
 ├── Gắn "NỔI BẬT" → hiện trang chủ
 ├── GỠ BÀI (UNPUBLISHED) khi cần
 └── Hẹn giờ đăng (SCHEDULED)
```

## 2.2. Luồng Nhiệm vụ — Chỉ tiêu nhiều cấp (điểm đặc thù của Chương trình)

```
TW: Ban hành bộ tiêu chí (criteria_sets) + cây nhiệm vụ phân cấp
    I → I.1, I.2 → I.1.a…  mỗi nhiệm vụ có: điểm tối đa, hạn chót,
    phương thức chấm (AUTO_AGGREGATE / MANUAL_CONFIRM / EXPERT_REVIEW)
 ▼
TW: Giao Tỉnh Đoàn — chỉ tiêu tổng, VD 60 hoạt động + 6.000 đoàn viên
 ▼
Tỉnh: CHIA CHO PHƯỜNG/XÃ (kiểm tra tổng con = chỉ tiêu cha)
      60 = 25 (Hiệp Thành) + 20 (Phú Hòa) + 15 (Tương Bình Hiệp) ✓
      hệ thống chặn chia VƯỢT, cảnh báo khi CÒN DƯ
 ▼
Phường: CHIA CHO TRƯỜNG (tiếp tục tách chỉ tiêu)
 ▼
Trường: CẬP NHẬT KẾT QUẢ theo kỳ (append-only — không xóa lịch sử)
      số liệu → tự tính completion_rate = đạt/chỉ tiêu
      trạng thái: NOT_STARTED → IN_PROGRESS → COMPLETED / OVERDUE
 ▼
Cấp trên: XEM HÀNG CHỜ → Xác nhận / Yêu cầu bổ sung / Trả lại
      (ghi assignment_reviews + gửi thông báo cho đơn vị)
 ▼
Deadline đếm ngược: D-7 xanh → D-3 vàng → QUÁ HẠN đỏ (hiện mọi danh sách)
```

## 2.3. Luồng Chấm điểm → Xếp hạng

```
CẤP TRÊN: vào "Chấm điểm thi đua", chọn đơn vị được chấm
 ├─ AUTO_AGGREGATE  → hệ thống tự tính = tỷ lệ đạt chỉ tiêu × điểm tối đa
 ├─ MANUAL_CONFIRM  → nhập tay (kèm ghi chú)
 └─ EXPERT_REVIEW   → hội đồng chấm, ghi chú đầy đủ
 ▼
Tổng điểm phiếu / tổng điểm bộ tiêu chí (VD 86/100)
 ▼
"Tổng hợp kỳ xếp hạng": chọn phạm vi + cấp đơn vị + kiểu xếp hạng
 (BY_SCORE / BY_TASK_RESULT / BY_ACTIVITY_COUNT)
 ▼
Bảng xếp hạng NHÁP → rà soát → "CHỐT KỲ" (FINALIZED)
 ▼
Công khai tại /bang-xep-hang (khách truy cập xem được, có huy chương Hạng 1-3)
```

## 2.4. Luồng Báo cáo → (đề xuất) Xuất văn bản thể thức

```
ĐV: Tạo báo cáo (tháng/quý/năm/đột xuất) theo kỳ
 ▼
"Tạo nháp AI" (giả lập): hệ thống tổng hợp hoạt động, nhiệm vụ,
tin bài trong kỳ thành bản nháp 4 đoạn — người dùng chỉnh rồi lưu
 ▼
Chốt báo cáo (FINALIZED)
 ▼
Xuất Word/PDF/Excel + lịch sử xuất
 ▼
(Đề xuất Phần II) → Xuất file Word ĐÚNG THỂ THỨC, ô số liệu tự điền từ DB
```

## 2.5. Luồng Phản ánh kiến nghị của người dân

```
Người dân: gửi tại /phan-anh (không cần tài khoản)
      chủ đề, tiêu đề, nội dung, họ tên, email, SĐT, đơn vị
 ▼
Hệ thống cấp MÃ TRA CỨU: PA-2026-000123 + link tra cứu riêng
 ▼
Cán bộ: hộp tiếp nhận theo trạng thái (Mới / Đang xử lý / Đã xử lý / Đóng)
 ├─ Trả lời công khai → người dân tra cứu bằng mã thấy được
 └─ Ghi chú NỘI BỘ → người dân KHÔNG thấy (trao đổi nội bộ cán bộ)
 ▼
Người dân tra cứu /phan-anh/tra-cuu → nhập mã → xem thread + trạng thái
```

## 2.6. Luồng Văn bản — Thông báo

```
Cấp trên: Ban hành văn bản, chọn phạm vi nhận:
 ├─ TOÀN BỘ CẤP DƯỚI (ALL_DESCENDANTS)
 ├─ TRỰC TIẾP CẤP DƯỚI (DIRECT_CHILDREN)
 └─ CHỌN ĐƠN VỊ CỤ THỂ (SELECTED)
 ▼
Đơn vị nhận: thông báo mới → đọc văn bản → "Đánh dấu đã đọc"
 ▼
Cấp trên: xem TỶ LỆ ĐÃ ĐỌC của từng đơn vị (theo dõi đôn đốc)
```

Thông báo trong hệ thống sinh tự động khi: giao nhiệm vụ, sắp đến hạn/qua hạn,
kết quả được xác nhận/cần bổ sung, có văn bản mới, tin bài đăng, phản ánh có trả lời.
Xem tại chuông 🔔 trên topbar hoặc trang Thông báo (đếm chưa đọc).
