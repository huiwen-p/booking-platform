# Tiêu chuẩn Nghiệm thu Kỹ thuật: Booking Platform v0
## Technical Acceptance Criteria & Definition of Done

Tài liệu này xác định các tiêu chí kiểm tra cụ thể để nghiệm thu dự án **Booking Platform v0** sau khi AI Coding Agent hoàn thành việc triển khai mã nguồn. Dự án chỉ được coi là đạt yêu cầu khi vượt qua 100% các tiêu chí dưới đây.

---

## 1. CHECKLIST KIỂM TRA TỰ ĐỘNG (AUTOMATED CRITERIA)

### 1.1. Biên dịch và Kiểu dữ liệu (TypeScript Compilation)
* [ ] Lệnh `pnpm build` (hoặc `tsc --noEmit`) thực thi thành công không có lỗi biên dịch.
* [ ] Cấu hình `tsconfig.json` bật đầy đủ các cờ nghiêm ngặt:
  * `"strict": true`
  * `"noImplicitAny": true`
  * `"strictNullChecks": true`
* [ ] Không có bất kỳ cảnh báo kiểu dữ liệu nào hoặc việc sử dụng bừa bãi kiểu `any` trong mã nguồn.

### 1.2. Bộ Kiểm thử Tích hợp (Integration & Contract Tests)
* [ ] Lệnh `pnpm test` (hoặc `pnpm test:contract`) thực thi thành công và đạt **100% PASS** trên cả hai engine:
  * `tests/contract/native-server.test.ts`: PASS toàn bộ các test cases trên Native Node.js Server.
  * `tests/contract/nestjs-server.test.ts`: PASS toàn bộ các test cases trên NestJS Server.
* [ ] Danh mục các test case bắt buộc phải có và vượt qua:
  * [ ] `GET /health` trả về status 200, JSON chứa `status: "ok"` và đúng tên `engine`.
  * [ ] `POST /events` tạo sự kiện hợp lệ trả về status 201, header `Location: /events/:id`, và body chứa ID.
  * [ ] `POST /events` với mã `code` đã tồn tại trả về đúng status **409 Conflict**.
  * [ ] `POST /events` với body JSON bị cắt cụt/lỗi cú pháp trả về đúng status **400 Bad Request**.
  * [ ] `POST /events` thiếu trường bắt buộc (ví dụ thiếu `title` hoặc `startsAt`) trả về đúng status **422 Unprocessable Entity**.
  * [ ] `GET /events` trả về status 200 và danh sách mảng các sự kiện.
  * [ ] `GET /events/:id` với ID không tồn tại trả về đúng status **404 Not Found**.
  * [ ] `PUT /events/:id` thay thế toàn bộ dữ liệu sự kiện thành công trả về status 200.
  * [ ] `PATCH /events/:id` cập nhật một phần dữ liệu thành công trả về status 200.
  * [ ] `DELETE /events/:id` xóa sự kiện thành công trả về status **204 No Content** (body rỗng).
  * [ ] `POST /bookings` với `eventId` không tồn tại trả về đúng status **404 Not Found** hoặc **422 Unprocessable Entity**.
  * [ ] `POST /bookings` với dữ liệu hợp lệ trả về status 201 và header `Location`.
  * [ ] `DELETE /bookings/:id` hủy đặt chỗ trả về status 204.
  * [ ] Gửi một HTTP Method không hỗ trợ (ví dụ `POST /health` hoặc `DELETE /events`) trả về đúng status **405 Method Not Allowed**.

---

## 2. CHECKLIST KIỂM TRA CHỨC NĂNG THỦ CÔNG (MANUAL VERIFICATION)

### 2.1. Khởi động và Lắng nghe cổng mạng
* [ ] Khởi chạy Native Server: `pnpm start:native`
  - Output terminal hiển thị: `[Native Engine] Server is listening on http://localhost:3000`
  - Lệnh kiểm tra port: `curl -i http://localhost:3000/health` phản hồi ngay lập tức.
* [ ] Khởi chạy NestJS Server: `pnpm start:nestjs`
  - Output terminal hiển thị: `[NestJS Engine] Server is listening on http://localhost:3001`
  - Lệnh kiểm tra port: `curl -i http://localhost:3001/health` phản hồi ngay lập tức.

### 2.2. Kiểm tra Header và Định dạng Giao thức
Dùng lệnh `curl -i` để kiểm tra các header phản hồi thực tế:
* [ ] Mọi response có body (200, 201, 4xx, 5xx) đều có header:
  `Content-Type: application/json; charset=utf-8`
* [ ] Response của `POST /events` và `POST /bookings` khi thành công luôn có header:
  `Location: /events/<id>` hoặc `Location: /bookings/<id>`
* [ ] Response của `DELETE` (204) không có Content-Length hoặc `Content-Length: 0` và tuyệt đối không in ra body.

### 2.3. Kiểm tra Tính chất Idempotent & Non-Idempotent
* [ ] **Kiểm tra POST (Non-Idempotent):**
  - Chạy lệnh tạo booking: `curl -X POST http://localhost:3000/bookings -H "Content-Type: application/json" -d '{"eventId":"...","customerName":"Alice","customerEmail":"alice@example.com"}'`
  - Chạy lại lệnh trên 3 lần.
  - Kết quả: Số lượng booking trong hệ thống tăng lên 3, mỗi booking có một `id` hoàn toàn khác nhau.
* [ ] **Kiểm tra PUT (Idempotent):**
  - Chạy lệnh cập nhật sự kiện: `curl -X PUT http://localhost:3000/events/<id> -H "Content-Type: application/json" -d '{"code":"TEST-1","title":"Title 1","totalSeats":100,"startsAt":"2026-12-01T00:00:00Z"}'`
  - Chạy lại lệnh trên 5 lần với cùng payload.
  - Kết quả: Trạng thái sự kiện trong hệ thống không đổi, không sinh thêm bản ghi nào.
* [ ] **Kiểm tra DELETE (Idempotent):**
  - Chạy lệnh xóa sự kiện: `curl -X DELETE http://localhost:3000/events/<id>` $\rightarrow$ Nhận mã `204`.
  - Chạy lại lệnh xóa trên lần thứ hai với cùng ID $\rightarrow$ Hệ thống vẫn xử lý an toàn (trả về `204` hoặc `404`), không gây lỗi sập server (500).

---

## 3. CHECKLIST KIẾN TRÚC & TIÊU CHUẨN MÃ NGUỒN

* [ ] **Native Server thuần khiết:**
  - Trong thư mục `src/native/`, không có bất kỳ import nào từ `express`, `fastify`, `@nestjs/*`.
  - Chỉ import từ `node:http`, `node:url`, `node:buffer`, `src/shared/`.
* [ ] **Xử lý Stream an toàn:**
  - Trong `src/native/http/body-parser.ts`, có kiểm tra kích thước buffer để chặn các payload $> 1MB$, tránh nguy cơ tràn RAM.
  - Luôn có handler cho sự kiện lỗi của stream: `req.on('error', ...)`.
* [ ] **Định dạng lỗi JSON thống nhất:**
  - Định dạng lỗi của cả hai engine đều có cấu trúc:
    `{ "statusCode": number, "error": string, "message": string, "timestamp": string, "path": string }`
* [ ] **Tài liệu bàn giao đầy đủ:**
  - Thư mục `docs/` có đầy đủ các file theo quy chuẩn:
    - [M1-2.md](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/docs/M1-2.md)
    - [01-ke-hoach-va-y-tuong-project.md](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/docs/01-ke-hoach-va-y-tuong-project.md)
    - [02-project-specification.md](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/docs/02-project-specification.md)
    - [03-knowledge-mapping.md](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/docs/03-knowledge-mapping.md)
    - [04-ai-coding-agent-handoff.md](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/docs/04-ai-coding-agent-handoff.md)
    - [05-reverse-learning-guide.md](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/docs/05-reverse-learning-guide.md)
    - [06-acceptance-criteria.md](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/docs/06-acceptance-criteria.md)
    - [README.md](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/docs/README.md)

---

## 4. KẾT LUẬN NGHIỆM THU
Khi tất cả các tiêu chí trên được đánh dấu `[x]`, dự án **Booking Platform v0** được chính thức bàn giao cho người học để bắt đầu bước vào **Giai đoạn Nghiên cứu Ngược (Reverse Learning)** theo hướng dẫn tại [05-reverse-learning-guide.md](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/docs/05-reverse-learning-guide.md).
