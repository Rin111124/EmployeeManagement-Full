# Ma trận chất lượng sản phẩm theo ISO/IEC 25010

**Sản phẩm:** EmployeeManagement (admin portal, backend, attendance, kiosk/mobile và AI service)  
**Ngày lập:** 24-09-2026  
**Trạng thái:** Baseline sơ bộ từ repository; chưa phải kết quả kiểm định độc lập  
**Phạm vi đánh giá:** Chất lượng sản phẩm theo tám đặc tính ISO/IEC 25010. Đánh giá không thay thế kiểm thử thực thi, security review hoặc nghiệm thu người dùng.

## 1. Cách chấm điểm

Điểm 1–5 là mức đạt được so với tiêu chí nghiệm thu của chính sản phẩm, không phải tỷ lệ phần trăm và không cộng trung bình để tuyên bố chứng nhận.

| Điểm | Diễn giải |
|---|---|
| 1 | Chưa có hoặc hầu như chưa kiểm soát; rủi ro nghiêm trọng |
| 2 | Có triển khai một phần; còn thiếu kiểm soát quan trọng |
| 3 | Đủ cho MVP/phạm vi thử nghiệm; còn khoảng trống đáng kể |
| 4 | Đạt mục tiêu đã thống nhất; có đo lường và kiểm chứng lặp lại |
| 5 | Đạt mục tiêu cao của sản phẩm, có bằng chứng vận hành ổn định và cải tiến liên tục |

Chỉ nâng điểm khi có bằng chứng lưu được (CI report, test, benchmark, staging telemetry, usability study, restore record hoặc phê duyệt phù hợp). Mục checklist được đánh dấu hoàn thành trong roadmap tự nó chưa phải bằng chứng kiểm chứng.

## 2. Baseline và mục tiêu

| Đặc tính | Baseline /5 | Mục tiêu /5 | Bằng chứng và khoảng trống chính |
|---|---:|---:|---|
| Phù hợp chức năng | 3 | 5 | Có các module nghiệp vụ và API. Cần chốt acceptance criteria, hoàn thiện quy tắc attendance/payroll và xác minh các luồng xuyên suốt. |
| Hiệu quả hoạt động | 2 | 5 | Có một số giới hạn tài nguyên/upload. Chưa có kết quả benchmark p95, throughput, concurrency, soak và capacity theo tải mục tiêu. |
| Tương thích | 3 | 5 | Có nhiều service tích hợp và outbox. Cần contract/version compatibility tests, kiểm tra ma trận môi trường/thiết bị và hành vi khi service phụ thuộc lỗi. |
| Khả năng tương tác | 3 | 5 | Có API versioning, outbox/retry/idempotency trong attendance. Cần schema contract được CI kiểm tra, quy tắc tương thích ngược và chaos test có báo cáo. |
| Tính dễ sử dụng | 3 | 5 | Có portal và màn hình kiosk. Chưa thấy usability/accessibility study, tiêu chí hoàn thành tác vụ và kiểm thử trên tập người dùng/thiết bị đại diện. |
| Độ tin cậy | 3 | 5 | Có unit/integration tests và outbox. Cần hoàn thiện payroll invariants, chaos, restore/rollback drills, SLO và bằng chứng availability từ staging/production tương đương. |
| Bảo mật | 2 | 5 | Có auth, rate limit, socket controls và CI scan. Roadmap/data classification ghi rõ còn mã hóa dữ liệu nhạy cảm, quản lý key, benchmark biometric và kiểm soát vận hành cần hoàn thiện. |
| Khả năng bảo trì | 3 | 5 | Có phân lớp/module, tài liệu và CI nhiều thành phần. Cần coverage gate theo critical path, giảm coupling, chuẩn hóa API/error, và theo dõi thời gian sửa lỗi/thay đổi. |

**Đọc baseline:** điểm 3 biểu thị MVP/thử nghiệm có điều kiện; điểm 2 biểu thị thiếu bằng chứng hoặc kiểm soát quan trọng. Đây là đánh giá repo tại ngày lập, không khẳng định trạng thái runtime hiện tại.

## 3. Tiêu chí nghiệm thu theo đặc tính

| Đặc tính / chủ đề | Chỉ số hoặc phép kiểm | Mục tiêu đề xuất | Bằng chứng bắt buộc | Trạng thái |
|---|---|---|---|---|
| Chức năng — nghiệp vụ nhân sự | Acceptance tests cho luồng nhân viên, phân quyền, hợp đồng, nghỉ phép, thiết bị | 100% luồng P0/P1 pass; không có lỗi nghiệp vụ Sev-1/Sev-2 mở | Test report liên kết yêu cầu và API/UI | Cần lập baseline |
| Chức năng — attendance/payroll | Invariant/property tests: ca đêm, timezone, OT, nghỉ, holiday, correction, cutoff, rounding | Tất cả invariant được PO/Finance xác nhận; kết quả payroll tái lập từ input/version đã lưu | Bộ quy tắc được duyệt và test report | Chưa đạt theo roadmap |
| Hiệu quả — API | Load test theo tải dự kiến, đo latency/error/throughput | p95 < 500 ms cho API thường; error rate < 0.1% ở tải mục tiêu | Báo cáo load test, profile tải và cấu hình môi trường | Chưa đo staging |
| Hiệu quả — inference/sync | Đo p50/p95 AI, throughput kiosk, queue lag, DLQ và thời gian drain | Đặt SLO sau baseline; không mất/nhân đôi event; DLQ có alert/owner | Benchmark và dashboard | Chưa có benchmark đủ |
| Tương thích — client/platform | Ma trận browser, OS, kích thước màn hình, camera và phiên bản app hỗ trợ | Tất cả tổ hợp hỗ trợ được smoke test trước release | Compatibility matrix và kết quả kiểm tra | Cần xác định |
| Tương thích — phụ thuộc | Kiểm tra Redis/Mongo/AI/admin unavailable, restart, timeout, protocol/version mismatch | Không silent data loss; lỗi có thể phát hiện, retry hoặc degraded mode có hướng dẫn | Integration/chaos test report | Một phần đã có test; staging cần xác minh |
| Tương tác — API/event contract | Schema contract giữa admin, attendance, AI; backward/forward compatibility | CI chặn breaking change không có version/migration | Contract test và artifact schema | Cần bổ sung/kiểm chứng |
| Dễ dùng — hoàn thành tác vụ | Usability test cho tác vụ HR, nhân viên và kiosk; đo completion, lỗi, thời gian | Đề xuất: ≥90% hoàn thành tác vụ chính không trợ giúp; không có blocker usability | Kịch bản, số người thử, kết quả và issue log | Chưa có số đo |
| Dễ dùng — accessibility | Rà soát keyboard, focus, label, contrast, zoom và thông báo lỗi | Không có lỗi accessibility nghiêm trọng trong luồng P0; tiêu chuẩn mức mục tiêu do PO chốt | Accessibility audit và issue closure | Chưa có bằng chứng |
| Tin cậy — đồng bộ | Duplicate, out-of-order, timeout, restart và admin unavailable | Exactly-once effect qua idempotency; mọi event có trạng thái cuối hoặc cảnh báo | Chaos suite và đối soát dữ liệu | Một phần đã implement; chaos cần kiểm tra |
| Tin cậy — availability/recovery | Theo dõi SLO; restore backup và rollback release/database | Mục tiêu roadmap: availability ≥99.9%; RPO ≤15 phút, RTO ≤4 giờ (cần owner xác nhận) | Telemetry theo kỳ, restore/rollback drill có thời gian thực đo | Chưa xác minh |
| Bảo mật — ứng dụng/dữ liệu | AuthN/AuthZ, IDOR, CSRF, socket, upload, secret/leak, encryption, retention | 0 Critical mở; High có owner/SLA được duyệt; không lộ secret/PII/biometric; kiểm thử hồi quy pass | CI scan, security test, review và remediation record | Còn hạng mục roadmap mở |
| Bảo mật — nhận diện khuôn mặt | Liveness; FAR/FRR/FTE; bias theo điều kiện; threshold/version/rollback | Ngưỡng được chủ sở hữu rủi ro phê duyệt từ benchmark; có manual fallback | Dataset đánh giá được phép dùng, báo cáo benchmark và model card duyệt | Chưa benchmark; model card draft |
| Bảo trì — thay đổi an toàn | Coverage trên domain critical, static/type checks, review, migration/rollback | Backend ≥80% tổng và ≥90% security/auth/payroll theo roadmap; critical paths được test; không regress | CI artifact và change failure/defect trend | Gate chưa được xác nhận |
| Bảo trì — vận hành/mã | Thời gian định vị/sửa lỗi, độ rõ API/error, runbook và ownership | Mọi service có owner/runbook; lỗi production có correlation ID và cách tái hiện | Review định kỳ, incident/change records | Một phần tài liệu đã có |

Các ngưỡng trên là mục tiêu khởi đầu. Engineering, Product, QA, Security và Operations cần xác nhận trước khi dùng làm release gate. Ngưỡng sinh trắc học không đặt tùy tiện; phải xuất phát từ đánh giá rủi ro và benchmark được phê duyệt.

## 4. Thứ tự thực hiện

| Giai đoạn | Kết quả cần tạo | Ưu tiên |
|---|---|---|
| 0. Baseline (tuần 1) | Chốt phạm vi MVP, luồng P0/P1, người sở hữu, tải mục tiêu; lưu kết quả hiện trạng CI và mở issue có tiêu chí nghiệm thu | P0 |
| 1. Đúng nghiệp vụ và an toàn (tuần 2–4) | Chốt payroll/attendance rules; bổ sung invariant tests; xử lý khoảng trống security/data handling; xác nhận API/event contracts | P0 |
| 2. Luồng đầu cuối và phục hồi (tuần 4–6) | E2E portal/kiosk, chaos suite, restore và rollback drill; smoke test staging có log kết quả | P1 |
| 3. Đo hiệu năng và trải nghiệm (tuần 6–8) | Load/soak benchmark, capacity report, usability và accessibility review; tạo backlog theo finding | P1 |
| 4. Release gates và cải tiến (liên tục) | CI chặn regression, dashboard SLO, review chất lượng theo release; chỉ nâng điểm khi evidence đủ và được owner xác nhận | P1 |

Ước lượng thời gian chỉ để lập kế hoạch, phụ thuộc số người và mức sẵn sàng môi trường. Không đánh dấu giai đoạn hoàn thành chỉ dựa trên ngày hoặc checkbox.

## 5. Kế hoạch đo và cập nhật

Mỗi lần đánh giá cần ghi commit/release được đánh giá, ngày, môi trường, phiên bản test, kết quả, liên kết artifact, giới hạn và người xác nhận. Cập nhật baseline khi có bằng chứng mới; ghi lại lý do thay đổi điểm. Dùng backlog hiện tại để quản lý ticket và tránh tạo bản sao công việc.

### Liên kết tài liệu

- [Production excellence roadmap](production-excellence-roadmap.md) — hạng mục production, security, reliability, CI/CD và vận hành.
- [Model card](model-card.md) — giả định và giới hạn của face recognition.
- [Data classification](data-classification.md) — phân loại và biện pháp bảo vệ dữ liệu.
- [Backlog](backlog.md) — ticket, owner và trạng thái triển khai.

## 6. Giới hạn đánh giá

- Không chạy test, scan, load test hoặc triển khai staging khi lập baseline này.
- Trạng thái repository không chứng minh dịch vụ đã triển khai đúng cấu hình hoặc đang đạt SLO.
- Chưa có dữ liệu usability, accessibility, capacity hoặc biometric accuracy độc lập trong tài liệu này.
- ISO/IEC 25010 là mô hình chất lượng; bảng điểm này không phải chứng nhận phù hợp tiêu chuẩn.
