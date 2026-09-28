# Xác minh thiết bị kiosk

## Cơ chế

1. Kiosk tạo một UUID cài đặt và bootstrap secret ngẫu nhiên 256 bit. Kiosk lưu cả hai trong Expo SecureStore.
2. Kiosk gửi UUID, địa chỉ IP và SHA-256 của bootstrap secret tới Admin để đăng ký thiết bị. Bootstrap secret gốc không rời khỏi kiosk.
3. Thiết bị ở trạng thái `pending` cho đến khi người quản trị duyệt trong Admin Portal.
4. Sau khi được duyệt, kiosk yêu cầu challenge dùng một lần, thời hạn 5 phút. Kiosk gửi HMAC-SHA256 của challenge bằng bootstrap secret để đổi lấy device token.
5. Kiosk chỉ lưu token trong SecureStore. Admin chỉ lưu SHA-256 của token; các API thiết bị kiểm tra token và trạng thái duyệt trước khi trả dữ liệu.

Challenge tối đa ba lần thử và được tiêu thụ nguyên tử để ngăn replay hoặc hai lần claim đồng thời. Admin có thể thu hồi token ngay lập tức.

## Đăng ký kiosk mới

1. Mở kiosk và gửi yêu cầu truy cập.
2. Trong Admin Portal, duyệt thiết bị đang chờ.
3. Trên kiosk, thử lại yêu cầu truy cập. Kiosk tự hoàn tất challenge-response và lưu token.
4. Mở đăng ký khuôn mặt. Danh sách nhân viên chưa có dữ liệu khuôn mặt được tải từ Admin.

## Khôi phục thiết bị mất credential

Việc khôi phục yêu cầu Admin xác nhận để không cho một client chỉ biết tên kiosk thay credential.

1. Trong Admin Portal, chọn **Revoke** cho thiết bị. Token cũ bị vô hiệu ngay.
2. Trên kiosk, mở Settings và gửi lại **Yêu cầu truy cập**. Kiosk tạo bootstrap credential mới; Admin chuyển thiết bị về `pending`.
3. Duyệt lại thiết bị trong Admin Portal.
4. Trên kiosk, thử lại yêu cầu truy cập để tự claim token mới.

Với thiết bị cũ còn claim code trong SecureStore, lần claim kế tiếp tự chuyển thiết bị sang bootstrap challenge-response. Nếu code cũ không còn, dùng quy trình Revoke ở trên.

## Cấu hình

- Admin và attendance-service cần tiếp tục dùng chung `SYNC_SECRET` cho đồng bộ service-to-service. Secret này khác với bootstrap secret và device token.
- Kiosk cần kết nối HTTPS khi dùng ngoài mạng phát triển cục bộ.
- Không ghi bootstrap secret, claim code hoặc device token vào log hay gửi chúng trong yêu cầu đăng ký.
