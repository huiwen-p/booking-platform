# Lộ trình & Thứ tự Đọc Code Chuẩn: Milestone M1.2
## Dự án: Booking Platform v0 — Dual-Engine HTTP Service (Native Node.js vs NestJS)

> **Mục tiêu:** Giúp bạn đọc hiểu toàn bộ codebase theo một dòng chảy tư duy logic (từ hợp đồng dữ liệu $\rightarrow$ tầng lưu trữ chia sẻ $\rightarrow$ bộ não Native HTTP cấp thấp $\rightarrow$ triển khai NestJS chuẩn mực $\rightarrow$ kiểm thử hợp đồng $\rightarrow$ kịch bản thực nghiệm mạng), tránh bị ngợp khi nhìn vào nhiều file cùng lúc.

---

## BẢN ĐỒ TỔNG THỂ CÁC BƯỚC ĐỌC CODE

```text
[BƯỚC 1: HỢP ĐỒNG DỮ LIỆU & LỖI]      ──>  src/shared/types.ts  &  src/shared/errors/
                 │
                 ▼
[BƯỚC 2: TẦNG LƯU TRỮ CHIA SẺ]        ──>  src/shared/storage/ (in-memory-store.ts)
                 │
                 ▼
[BƯỚC 3: ENGINE A - NATIVE HTTP CẤP THẤP] ──>  src/native/ (body-parser -> router -> handlers -> server -> main)
                 │
                 ▼
[BƯỚC 4: ENGINE B - NESTJS CHUẨN MỰC] ──>  src/nestjs/ (filters -> middleware -> events/bookings -> app -> main)
                 │
                 ▼
[BƯỚC 5: BỘ KIỂM THỬ HỢP ĐỒNG & UNIT] ──>  tests/ (api-contract-suite -> native/nestjs server tests -> unit tests)
                 │
                 ▼
[BƯỚC 6: QUAN SÁT THỰC NGHIỆM MẠNG]   ──>  scripts/ (trace-network.sh với curl -v)
```

---

## CHI TIẾT THỨ TỰ TỪNG FILE CẦN ĐỌC

### BƯỚC 1: HỢP ĐỒNG DỮ LIỆU & HỆ THỐNG MÃ LỖI (DATA CONTRACTS & ERRORS)
*Trước khi tìm hiểu cách server nhận và phản hồi dữ liệu, bạn phải nắm rõ hình thù của thực thể nghiệp vụ và quy chuẩn mã lỗi HTTP.*

1. **[src/shared/types.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/shared/types.ts)**
   * **Mục đích:** Định nghĩa cấu trúc Domain Entity (`Event`, `Booking`), các Data Transfer Objects (`CreateEventDto`, `UpdateEventDto`, `PatchEventDto`, `CreateBookingDto`) và schema phản hồi (`ErrorResponse`, `HealthResponse`).
   * **Ý nghĩa:** Đây là "bản hợp đồng" tối thượng. Cả hai Engine (Native lẫn NestJS) và bộ kiểm thử (Contract Tests) đều phải tuân thủ nghiêm ngặt giao diện này.
2. **[src/shared/errors/app-error.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/shared/errors/app-error.ts)**
   * **Mục đích:** Lớp cơ sở kế thừa từ `Error` chuẩn của JavaScript, mang theo `statusCode` (mã HTTP) và `error` (chuỗi định danh lỗi).
   * **Ý nghĩa:** Nền móng cho cây phân tầng lỗi, giúp tầng mạng tự động chuyển đổi Exception thành HTTP Status Code tương ứng mà không cần viết `if-else` thủ công.
3. **[src/shared/errors/not-found.error.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/shared/errors/not-found.error.ts)** *(kèm `conflict.error.ts`, `validation.error.ts`)*
   * **Mục đích:** Định nghĩa các lỗi nghiệp vụ thường gặp: `NotFoundError` (404), `ConflictError` (409 — trùng mã code sự kiện), `ValidationError` (422 — thiếu trường bắt buộc hoặc số ghế âm).
   * **Ý nghĩa:** Chuẩn hóa các phản hồi lỗi phía client theo đúng ngữ nghĩa RFC 9110.
4. **[src/shared/errors/malformed-json.error.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/shared/errors/malformed-json.error.ts)** *(kèm `method-not-allowed.error.ts`, `payload-too-large.error.ts`)*
   * **Mục đích:** Định nghĩa các lỗi ở tầng giao thức HTTP: `MalformedJsonError` (400 — client gửi JSON sai cú pháp), `MethodNotAllowedError` (405 — gọi sai HTTP method trên route có tồn tại), `PayloadTooLargeError` (413 — body vượt quá 1MB).
   * **Ý nghĩa:** Phân định rõ ràng giữa lỗi dữ liệu nghiệp vụ (422) và lỗi định dạng giao thức (400, 405, 413).
5. **[src/shared/errors/index.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/shared/errors/index.ts)**
   * **Mục đích:** Barrel file re-export toàn bộ hệ thống mã lỗi, tạo điểm import tập trung cho các tầng ứng dụng.

---

### BƯỚC 2: TẦNG LƯU TRỮ CHIA SẺ & BỘ NHỚ IN-MEMORY (SHARED STORAGE LAYER)
*Xem cách dữ liệu sự kiện và vé đặt được lưu trữ tạm thời trong bộ nhớ RAM trước khi có cơ sở dữ liệu thật ở M2.*

6. **[src/shared/storage/in-memory-store.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/shared/storage/in-memory-store.ts)**
   * **Mục đích:** Triển khai một Singleton Store quản lý hai bảng dữ liệu `events: Map<string, Event>` và `bookings: Map<string, Booking>`.
   * **Ý nghĩa:** Cung cấp kho dữ liệu duy nhất dùng chung cho cả Native Server và NestJS. Chứa hàm `reset()` cực kỳ quan trọng giúp làm sạch dữ liệu trước mỗi lượt chạy test độc lập.

---

### BƯỚC 3: ENGINE A — BỘ NÃO NATIVE HTTP CẤP THẤP (LOW-LEVEL HTTP ENGINE)
*Đây là "trái tim" của Milestone M1.2. Đọc để hiểu cặn kẽ những gì diễn ra bên dưới một framework web.*

7. **[src/native/http/body-parser.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/native/http/body-parser.ts)**
   * **Mục đích:** Đọc dữ liệu từ `IncomingMessage` dưới dạng stream nhị phân (`Buffer`), lũy kế số bytes nhận được, kích hoạt `req.destroy()` khi vượt quá 1MB (`PayloadTooLargeError`), và parse chuỗi UTF-8 sang JSON (`MalformedJsonError`).
   * **Ý nghĩa:** Giúp bạn hiểu vì sao request body là **Stream**, hiểu cơ chế chặn rò rỉ RAM (OOM) và phòng chống tấn công DoS ngoài đời thực.
8. **[src/native/http/request-parser.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/native/http/request-parser.ts)**
   * **Mục đích:** Tách chuỗi URL thô của request thành `pathname` và `searchParams` chuẩn thông qua đối tượng `URL`.
   * **Ý nghĩa:** Cho thấy cách server bóc tách query parameter (ví dụ `?code=JS-2026`) ở mức độ giao thức.
9. **[src/native/http/response-helper.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/native/http/response-helper.ts)**
   * **Mục đích:** Đóng gói các hàm trả response: `sendJson` (thiết lập `Content-Type: application/json; charset=utf-8` và tính `Content-Length`), `sendEmpty` (cho mã 204 No Content), và `sendError` (chuyển đổi mọi Exception thành JSON chuẩn).
   * **Ý nghĩa:** Cho thấy HTTP Response thực chất là việc ghi status code, ghi header vào socket và kết thúc bằng `res.end()`.
10. **[src/native/http/router.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/native/http/router.ts)**
    * **Mục đích:** Tự xây dựng Router: biên dịch path pattern (như `/events/:id`) thành `RegExp` có named capture groups `(?<id>[^/]+)`, trích xuất `req.params`, và theo dõi cờ `methodMismatch` để phân biệt chính xác giữa `405 Method Not Allowed` và `404 Not Found`.
    * **Ý nghĩa:** File quan trọng nhất của Native Engine! Giúp bạn hiểu cơ chế hoạt động của router và tại sao Regex tiêu tốn tài nguyên CPU khi số lượng route tăng lên.
11. **[src/native/handlers/health.handler.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/native/handlers/health.handler.ts)**
    * **Mục đích:** Handler trả về trạng thái máy chủ, uptime và tên engine `native`.
12. **[src/native/handlers/events.handler.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/native/handlers/events.handler.ts)**
    * **Mục đích:** Xử lý toàn bộ logic CRUD cho sự kiện: `getEvents`, `getEventById`, `createEvent` (trả về 201 kèm header `Location`), `updateEvent` (PUT — Idempotent), `patchEvent` (PATCH), `deleteEvent` (DELETE — Idempotent trả về 204).
    * **Ý nghĩa:** Thể hiện đầy đủ các phương thức HTTP và tính chất Idempotent/Non-Idempotent trong thực tế.
13. **[src/native/handlers/bookings.handler.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/native/handlers/bookings.handler.ts)**
    * **Mục đích:** Xử lý đặt chỗ (`POST /bookings`), kiểm tra khóa ngoại (sự kiện phải tồn tại trước khi đặt vé), và hủy đặt chỗ (`DELETE /bookings/:id`).
14. **[src/native/server.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/native/server.ts)**
    * **Mục đích:** Gắn kết `NativeRouter`, tạo `http.createServer`, đo lường thời gian xử lý từng request bằng `process.hrtime.bigint()`, in log `[NATIVE] METHOD PATH -> STATUS (DURATION)` và thiết lập error boundary ngoài cùng.
15. **[src/native/main.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/native/main.ts)**
    * **Mục đích:** Entry point khởi động Native Server trên cổng `3000`.

---

### BƯỚC 4: ENGINE B — FRAMEWORK NESTJS CHUẨN MỰC (ENTERPRISE NESTJS ENGINE)
*Xem cách toàn bộ các cơ chế cấp thấp ở Bước 3 được đóng gói thành các Module, Controller, Service hiện đại theo chuẩn công nghiệp.*

16. **[src/nestjs/common/filters/http-exception.filter.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/nestjs/common/filters/http-exception.filter.ts)**
    * **Mục đích:** Exception Filter toàn cục `@Catch()` bắt tất cả lỗi từ NestJS và `AppError`, chuẩn hóa thành JSON đồng nhất, đồng thời thông minh dịch lỗi 404 thành `405 Method Not Allowed` khi đường dẫn tồn tại nhưng sai HTTP method.
    * **Ý nghĩa:** Đảm bảo dù chạy trên NestJS, định dạng lỗi trả về phía client vẫn tương thích 100% với Native Engine.
17. **[src/nestjs/common/middleware/request-logger.middleware.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/nestjs/common/middleware/request-logger.middleware.ts)**
    * **Mục đích:** Middleware ghi log request và đo độ trễ: `[NESTJS] METHOD PATH -> STATUS (DURATION)`.
18. **[src/nestjs/health/health.controller.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/nestjs/health/health.controller.ts)**
    * **Mục đích:** Cung cấp endpoint `GET /health` trả về `engine: 'nestjs'`.
19. **[src/nestjs/events/events.service.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/nestjs/events/events.service.ts)**
    * **Mục đích:** Tầng xử lý nghiệp vụ độc lập (Service Layer), thực hiện validate dữ liệu, kiểm tra trùng mã sự kiện, tương tác với `InMemoryStore`.
20. **[src/nestjs/events/events.controller.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/nestjs/events/events.controller.ts)**
    * **Mục đích:** Định tuyến Controller với `@Controller('events')`, inject `EventsService`, sử dụng `@Res({ passthrough: true })` để set header `Location`, và decorator `@HttpCode(204)` khi xóa.
21. **[src/nestjs/events/events.module.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/nestjs/events/events.module.ts)**
    * **Mục đích:** Đóng gói module sự kiện, khai báo controller và provider.
22. **[src/nestjs/bookings/bookings.service.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/nestjs/bookings/bookings.service.ts)** *(kèm `bookings.controller.ts`, `bookings.module.ts`)*
    * **Mục đích:** Module đặt vé hoàn chỉnh trong NestJS, quản lý nghiệp vụ tạo và hủy vé đặt chỗ.
23. **[src/nestjs/app.module.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/nestjs/app.module.ts)**
    * **Mục đích:** Root Module gom toàn bộ sub-modules (`EventsModule`, `BookingsModule`) và áp dụng `RequestLoggerMiddleware` cho mọi route.
24. **[src/nestjs/main.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/nestjs/main.ts)**
    * **Mục đích:** Entry point khởi tạo NestJS bằng `NestFactory.create()`, kích hoạt global filter và lắng nghe trên cổng `3001`.

---

### BƯỚC 5: BỘ KIỂM THỬ HỢP ĐỒNG & UNIT TESTS (TEST SUITES)
*Xem cách tính đúng đắn và tính nhất quán giữa 2 động cơ được chứng minh bằng thực nghiệm.*

25. **[tests/contract/api-contract-suite.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/tests/contract/api-contract-suite.ts)**
    * **Mục đích:** File quan trọng nhất của tầng kiểm thử! Định nghĩa một hàm chạy tuần tự **14 kịch bản HTTP bắt buộc**:
      - `GET /health` (200 OK)
      - `POST /events` thành công (201 Created + header `Location`)
      - Trùng mã code sự kiện (409 Conflict)
      - Gửi JSON hỏng (400 Bad Request)
      - Thiếu trường bắt buộc (422 Unprocessable Entity)
      - Tra cứu sự kiện không tồn tại (404 Not Found)
      - Thay thế toàn bộ (PUT — 200 OK) & Cập nhật từng phần (PATCH — 200 OK)
      - Đặt vé cho sự kiện không tồn tại (404 Not Found)
      - Xóa vé & Xóa sự kiện (204 No Content body rỗng)
      - Gửi HTTP method không hỗ trợ (405 Method Not Allowed)
    * **Ý nghĩa:** Đóng vai trò là "Thước đo hợp đồng" chung, không phụ thuộc vào công nghệ triển khai bên dưới.
26. **[tests/contract/native-server.test.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/tests/contract/native-server.test.ts)**
    * **Cần quan sát:** Hook `before` khởi động Native Server trên cổng mạng ngẫu nhiên (`listen(0)`), chạy bộ `api-contract-suite`, và hook `after` đóng server an toàn.
27. **[tests/contract/nestjs-server.test.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/tests/contract/nestjs-server.test.ts)**
    * **Cần quan sát:** Khởi động ứng dụng NestJS trên cổng ngẫu nhiên, chạy đúng bộ `api-contract-suite` đó để chứng minh tính tương thích 100%.
28. **[tests/unit/body-parser.test.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/tests/unit/body-parser.test.ts)**
    * **Cần quan sát:** Test case giả lập Readable stream để kiểm tra việc bắt lỗi JSON hỏng và chặn đứng payload vượt quá 1MB.
29. **[tests/unit/router.test.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/tests/unit/router.test.ts)**
    * **Cần quan sát:** Test case kiểm tra trích xuất param `/events/:id`, ném `405 MethodNotAllowedError` khi sai method, và ném `404 NotFoundError` khi không khớp URL.

---

### BƯỚC 6: KỊCH BẢN QUAN SÁT THỰC NGHIỆM MẠNG (NETWORK OBSERVABILITY)
*Bước cuối cùng: Dùng công cụ mạng để quan sát từng gói tin HTTP bay qua dây cáp.*

30. **[scripts/trace-network.sh](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/scripts/trace-network.sh)**
    * **Mục đích:** Kịch bản thực thi lệnh `curl -v` chi tiết, in ra toàn bộ quá trình bắt tay TCP, Request Headers (`Content-Type`, `Content-Length`), Response Headers (`Location`, status code), và kiểm chứng tính Idempotent khi gọi lệnh `DELETE` nhiều lần liên tiếp.

---

## LỜI KHUYÊN KHI ĐỌC CODE

* **Đừng chỉ đọc lướt bằng mắt:** Hãy mở file [src/native/http/body-parser.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/native/http/body-parser.ts) và đặt một **Breakpoint (F9)** tại sự kiện `req.on('data')`.
* **Chạy Debug:** Mở terminal chạy `pnpm start:native`, sau đó dùng `curl` gửi một request `POST /events`. Bạn sẽ thấy tiến trình dừng lại ngay tại breakpoint để bạn soi từng mảnh buffer nhị phân!
* **So sánh đối chứng:** Sau khi hiểu Native, mở file tương ứng bên NestJS ([events.controller.ts](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/src/nestjs/events/events.controller.ts)) để thấy NestJS đã che giấu những dòng code nào bằng Decorator.
* **Tiến hành thí nghiệm phá hoại:** Mở tài liệu **[docs/m01-2/05-reverse-learning-guide.md](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/docs/m01-2/05-reverse-learning-guide.md)** để thực hiện 4 bài test phá hoại có chủ đích (Cắt kết nối giữa chừng, gửi payload 10MB, spam request...).
