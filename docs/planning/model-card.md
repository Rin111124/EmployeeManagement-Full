# Model Card — Face Recognition AI Service

**Phiên bản:** 1.0  
**Ngày lập:** 23-09-2026  
**Owner:** Security/Privacy Owner (SEC) + Backend Engineer (BE)  
**Trạng thái:** Draft — Cần SEC + EL phê duyệt trước khi dùng dữ liệu production thật  
**Tài liệu liên quan:** [data-classification.md](./data-classification.md), [biometric-consent-checklist.md](./biometric-consent-checklist.md)

> [!IMPORTANT]
> Model card này phải được phê duyệt **trước khi** hệ thống nhận dữ liệu sinh trắc học thật.
> FAR/FRR threshold không được hardcode — phải được cập nhật từ kết quả benchmark thực tế (P1-BIO-04).

---

## 1. Thông tin model

| Thuộc tính | Giá trị hiện tại | Ghi chú |
|---|---|---|
| **Framework** | InsightFace | Python library |
| **Model** | `buffalo_l` (hoặc model đang dùng) | **Cần xác nhận version chính xác** |
| **Task** | Face detection + Face recognition (embedding extraction) | |
| **Embedding dimension** | 512 (InsightFace default) | |
| **Detection model** | RetinaFace | Trong buffalo_l bundle |
| **Recognition model** | ArcFace | Trong buffalo_l bundle |
| **Input** | JPEG/PNG, 1 frame, 1 khuôn mặt | Multiface và đầu vào lạ bị từ chối |
| **Output** | Embedding vector + cosine similarity score | |
| **Liveness detection** | ❌ Chưa có | **P1-BIO-02** — rủi ro cao |

> [!WARNING]
> Model hiện tại **không có liveness detection**. Hệ thống có thể bị lừa bằng ảnh in hoặc video replay.
> Không được dùng với dữ liệu nhân sự thật cho đến khi P1-BIO-02 hoàn thành.

---

## 2. Dataset assumptions và giới hạn

### Dataset training (InsightFace buffalo_l)

| Thuộc tính | Giá trị | Nguồn |
|---|---|---|
| **Training dataset** | MS1MV2, Glint360K (biến thể tùy model) | InsightFace research |
| **Số lượng ảnh** | ~5.8 triệu (MS1MV2) hoặc 360 triệu (Glint360K) | |
| **Số nhân vật** | ~85,000–360,000 | |
| **Phân bố dân số** | Chủ yếu face ảnh celebrity, web-crawled | Bias tiềm ẩn với dân số Đông Nam Á |
| **Điều kiện ánh sáng** | Đa dạng, nhưng phần lớn ảnh ngoài trời/studio | Hiệu năng trong điều kiện ánh sáng yếu chưa được đo |

### Giới hạn đã biết

| Giới hạn | Mức độ rủi ro | Kế hoạch giảm thiểu |
|---|---|---|
| Chưa có liveness detection | 🔴 Cao | P1-BIO-02: Tuần 5 |
| Bias với dân số chưa được đại diện | 🟡 Trung bình | P1-BIO-03: Benchmark với dataset nội bộ |
| Hiệu năng khi đeo khẩu trang | 🟡 Trung bình | Đo trong benchmark thực tế |
| Hiệu năng với ánh sáng yếu/ngược sáng | 🟡 Trung bình | Đo trong benchmark thực tế |
| Embedding toàn bộ nhân viên gửi mỗi request | 🔴 Cao | P1-BIO-07: Dùng vector index |

---

## 3. Ngưỡng (Threshold)

> [!CAUTION]
> Các giá trị dưới đây là **placeholder** — chưa được đo benchmark thực tế.
> **Không được dùng các con số này trong production** cho đến khi P1-BIO-04 hoàn thành.

| Chỉ số | Giá trị placeholder hiện tại | Nguồn | Trạng thái |
|---|---|---|---|
| Cosine similarity threshold | `0.4` (trong code) | Hardcode — chưa benchmark | ❌ Chưa hợp lệ |
| FAR (False Accept Rate) | Chưa đo | — | ❌ Thiếu |
| FRR (False Reject Rate) | Chưa đo | — | ❌ Thiếu |
| FTE (Failure to Enroll) | Chưa đo | — | ❌ Thiếu |
| Latency p50 | Chưa đo | — | ❌ Thiếu |
| Latency p95 | Chưa đo | — | ❌ Thiếu |

### Kế hoạch benchmark (P1-BIO-04)

Cần thực hiện trên dataset nội bộ có consent (P1-BIO-03):

1. Thu thập tối thiểu N ảnh mỗi người (N ≥ 5) trong điều kiện thực tế: ánh sáng văn phòng, kiosk thực tế, góc nhìn thực tế.
2. Đo FAR, FRR tại các threshold: 0.3, 0.35, 0.4, 0.45, 0.5.
3. Vẽ ROC curve, chọn threshold tối ưu theo yêu cầu nghiệp vụ (cân bằng bảo mật vs. UX).
4. Đo latency p50/p95 dưới tải thực tế (concurrent kiosk).
5. Đo FTE với các trường hợp cạnh: đeo kính, khẩu trang, ánh sáng yếu.

### Quy tắc chọn threshold

- Threshold phải được chọn từ benchmark, không hardcode.
- Threshold phải được version cùng model (ví dụ: `buffalo_l_v1_threshold_0.42`).
- Thay đổi threshold phải có approval từ SEC và ghi audit.
- Rollback threshold: giữ threshold cũ trong config có version, có thể switch nhanh.

---

## 4. Điều kiện hardware và camera

| Yêu cầu | Tối thiểu | Khuyến nghị |
|---|---|---|
| CPU (inference) | 4 cores | 8 cores hoặc GPU |
| RAM | 4 GB | 8 GB |
| Camera resolution | 640x480 | 1280x720 |
| FPS camera | 15 | 30 |
| Ánh sáng | Đủ sáng (≥ 200 lux) | 300–500 lux, đồng đều |
| Khoảng cách khuôn mặt | 0.5–1.5m | 0.7–1.0m |

---

## 5. Input/Output specification

### Input constraints

```
- Format: JPEG hoặc PNG
- Content-Type: image/jpeg hoặc image/png (allowlist)
- Kích thước tối đa: 5 MB
- Kích thước pixel tối đa: 4096x4096
- Số khuôn mặt: Đúng 1 (reject nếu 0 hoặc > 1)
- Multi-frame/animated: Bị từ chối
- Decode timeout: 3 giây
```

### Output

```json
{
  "status": "success" | "no_face" | "multiple_faces" | "low_confidence",
  "employee_id": "...",
  "confidence": 0.0 - 1.0,
  "processing_time_ms": 150
}
```

### Các trường hợp edge cần xử lý

| Trường hợp | Behavior hiện tại | Behavior yêu cầu |
|---|---|---|
| Không có khuôn mặt | Error 400 | ✅ Return `no_face` |
| Nhiều khuôn mặt | Error 400 | ✅ Return `multiple_faces` |
| Confidence thấp | Match với threshold | Cần manual review workflow (P1-BIO-06) |
| Ảnh in / màn hình | Không phát hiện | ❌ Cần liveness detection (P1-BIO-02) |
| Timeout inference | 500 Error | ✅ Timeout + retry |

---

## 6. Quy trình khi confidence "vùng xám"

Khi confidence nằm trong khoảng `[threshold - margin, threshold + margin]` (margin cần xác định sau benchmark):

1. **Không tự động chấm công** — đưa vào hàng đợi manual review.
2. **HR/Manager nhận notification** trong vòng SLA (đề xuất: 15 phút trong giờ làm việc).
3. **Nhân viên có thể fallback** sang manual check-in với lý do.
4. **Dispute**: nhân viên có thể khiếu nại kết quả trong vòng 24h.

> Cần thiết kế UI và workflow cho P1-BIO-06.

---

## 7. Privacy

- **Không log ảnh khuôn mặt hoặc embedding** trong bất kỳ log nào.
- Frame ảnh chỉ tồn tại trong memory trong thời gian xử lý request (< 5 giây).
- Embedding tính toán được xử lý xong là xóa — không persist trong AI service.
- Chỉ kết quả (`employee_id`, `confidence`) được trả về và log.

---

## 8. Kế hoạch cải tiến

| Hạng mục | Priority | Deadline | Ticket |
|---|---|---|---|
| Liveness detection (chống ảnh in, video replay) | P1 | Tuần 5 | P1-BIO-02 |
| Dataset benchmark có consent | P1 | Tuần 5 | P1-BIO-03 |
| Đo FAR/FRR/FTE/latency | P1 | Tuần 6 | P1-BIO-04 |
| Threshold versioning + rollback | P1 | Tuần 6 | P1-BIO-05 |
| Manual review workflow | P1 | Tuần 7 | P1-BIO-06 |
| Vector index thay thế gửi toàn bộ embedding | P1 | Tuần 7 | P1-BIO-07 |

---

## Phê duyệt

| Người | Vai trò | Ngày | Chữ ký |
|---|---|---|---|
| [TBD] | Security/Privacy Owner (SEC) | | |
| [TBD] | Engineering Lead (EL) | | |

> [!NOTE]
> Model card này cần được update sau mỗi lần thay đổi model, threshold, hoặc kết quả benchmark.
> Version phải được ghi kèm với mỗi lần deploy model mới.
