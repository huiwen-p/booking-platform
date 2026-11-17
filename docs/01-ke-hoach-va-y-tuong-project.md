# Giai đoạn M1.2: Phân tích Kế hoạch Học tập & Đề xuất Project Thực hành
## Milestone M1.2 — HTTP & Service Đầu Tiên (Booking Platform v0)

Tài liệu này được thiết lập theo quy chuẩn thiết kế project thực hành 2 tuần ([rm-prompt-stage-project.md](file:///d:/Books/notes/pure-md/ps/rm/rm-prompt-stage-project.md)), dựa trên các nguồn thông tin context:
- [rm-12.md](file:///d:/Books/notes/pure-md/ps/rm/rm-12.md) (Lộ trình 12 tháng Backend Engineer — Cấp tổng quan & Milestone chi tiết)
- [rm-ts.md](file:///d:/Books/notes/pure-md/ps/rm/rm-ts.md) (Technology Stack chuẩn của toàn bộ lộ trình)
- [M1-2.md](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/docs/M1-2.md) (Kế hoạch học tập chi tiết 2 tuần của Milestone 1.2)

---

## PHẦN 1: PHÂN TÍCH KẾ HOẠCH HỌC TẬP 2 TUẦN (M1.2)

Milestone 1.2 là bước ngoặt quan trọng nhất của Tháng 1: **Chuyển từ một chương trình chạy độc lập trong console (CLI ở M1.1) sang một Backend Service mở cổng mạng và giao tiếp với client qua giao thức HTTP**.

Mục tiêu cốt lõi không phải là học thuộc cú pháp decorator của framework NestJS, mà là **làm chủ bản chất giao thức HTTP** (cấu trúc thông điệp, ngữ nghĩa method, mã trạng thái, headers, stream parsing, tính chất safe/idempotent) và phân biệt ranh giới giữa những gì thuộc về giao thức với những gì framework làm thay cho lập trình viên.

### Bảng phân tích toàn bộ kiến thức và vai trò trong Project

| STT | Kiến thức / Chủ đề | Mức độ ưu tiên | Vai trò trong Project | Cách thể hiện thực tế trong Code & Hệ thống |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Client-Server Architecture & Request-Response Model** | **Core** (U) | Mô hình giao tiếp nền tảng của toàn bộ hệ thống | Client gửi HTTP request qua TCP socket; server tiếp nhận, xử lý và bắt buộc phải trả về HTTP response đóng kín luồng. |
| **2** | **HTTP/1.1 Message Structure** (Request Line, Status Line, Headers, CRLF, Body) | **Core** (U $\rightarrow$ C) | Cấu trúc dữ liệu raw truyền qua dây mạng | Đọc và bóc tách raw text của HTTP request: method, path, headers (`Content-Type`, `Accept`), và request body dạng stream. |
| **3** | **HTTP Methods & Semantics** (GET, POST, PUT, PATCH, DELETE) | **Core** (C) | Định nghĩa hành vi tác động lên tài nguyên Events & Bookings | Thiết kế RESTful endpoints: GET để đọc dữ liệu, POST để tạo mới, PUT để thay thế toàn bộ, PATCH để cập nhật từng phần, DELETE để xóa. |
| **4** | **Safe & Idempotent Properties** | **Core** (C) | Đảm bảo an toàn khi client retry do timeout hoặc sự cố mạng | Cài đặt logic phân biệt: GET là safe & idempotent; PUT/DELETE là idempotent (gọi lặp lại không sinh thêm side-effect mới); POST không idempotent (gọi lại tạo booking mới). |
| **5** | **HTTP Status Codes Mapping** (200, 201, 204, 400, 404, 405, 409, 422, 500) | **Core** (C) | Phản ánh chính xác kết quả xử lý nghiệp vụ ra ngoài client | 200 OK (GET/PUT), 201 Created (POST kèm `Location`), 204 No Content (DELETE), 400 Bad Request (JSON hỏng), 404 Not Found (sai ID/URL), 405 Method Not Allowed, 409 Conflict (trùng `code` sự kiện), 422 Unprocessable Entity (thiếu trường/sai kiểu), 500 Internal Error. |
| **6** | **HTTP Headers & Content Negotiation** (`Content-Type`, `Accept`, `Location`, `Content-Length`) | **Core** (C) | Giao thức truyền tải metadata và định dạng dữ liệu | Kiểm tra `Content-Type: application/json` ở đầu vào; thiết lập `Content-Type: application/json; charset=utf-8` ở đầu ra; trả về header `Location: /events/:id` khi tạo event mới. |
| **7** | **Statelessness trong HTTP** | **Core** (U) | Thiết kế server không phụ thuộc vào trạng thái session của kết nối trước | Mỗi request chứa đầy đủ thông tin để server xử lý độc lập, không lưu session state trên socket. |
| **8** | **Native Node.js HTTP Server (`node:http`)** | **Core** (C) | Động cơ HTTP cấp thấp (Engine A) | Dùng `http.createServer()`, lắng nghe cổng qua `server.listen()`, xử lý luồng `IncomingMessage` và `ServerResponse`. |
| **9** | **Request Stream & Chunk-by-Chunk Body Parsing** | **Core** (C) | Thu thập dữ liệu payload truyền qua mạng | Lắng nghe event `req.on('data', chunk)` và `req.on('end')` để ghép buffer thành chuỗi JSON hoàn chỉnh; xử lý lỗi stream `req.on('error')`. |
| **10** | **Manual URL Routing & Parameter Extraction** | **Core** (C) | Điều hướng request đến đúng handler nghiệp vụ trong Native Server | Xây dựng router thủ công bằng Regex hoặc path matching để bóc tách URL path và route parameter (ví dụ `/events/:id`). |
| **11** | **In-Memory CRUD Storage & Business Rules** | **Core** (C) | Tầng lưu trữ dữ liệu tạm thời của Booking v0 | Quản lý collection Events và Bookings bằng `Map<string, Event>` / `Map<string, Booking>`. Bảo vệ invariant: `Event.code` là duy nhất, không cho tạo Booking nếu `eventId` không tồn tại. |
| **12** | **Error Handling & Exception Propagation** | **Core** (C) | Bắt lỗi tập trung và chuyển đổi thành HTTP response chuẩn | Phân biệt lỗi cú pháp client (400), lỗi nghiệp vụ/validation (422), xung đột tài nguyên (409) và unhandled exception (500) mà không làm sập tiến trình Node.js. |
| **13** | **Integration Testing over Real HTTP Port** | **Core** (C) | Kiểm chứng tính đúng đắn của API qua kết nối mạng thật | Viết test suite gửi HTTP request thật (dùng Supertest hoặc Native `fetch`) đến ephemeral port, kiểm tra status code, headers và response body cho cả 2 engine. |
| **14** | **DNS $\rightarrow$ TCP $\rightarrow$ TLS $\rightarrow$ HTTP Request Lifecycle** | **Core** (U) | Mental model về đường đi của gói tin từ client đến server | Lập sơ đồ phân giải tên miền, thiết lập kết nối 3-way handshake, bắt tay TLS, truyền dữ liệu HTTP. Quan sát thực tế bằng `curl -v` và DevTools Timing. |
| **15** | **NestJS Framework Architecture & Porting** | **Important** (C) | Động cơ HTTP cấp cao (Engine B) để so sánh và nhận diện abstraction | Chuyển đổi cùng một tập API sang NestJS (Modules, Controllers, Services, Dependency Injection, Middleware, Pipes/Exception Filters cơ bản). |
| **16** | **Framework Abstraction Comparison ("What NestJS does for me")** | **Important** (U) | Phân định ranh giới giữa giao thức và framework | So sánh trực tiếp: Native Server tự làm gì (stream, route, parse, error) vs NestJS tự động hóa điều gì qua decorator và pipeline. |

---

## PHẦN 2: ĐỀ XUẤT Ý TƯỞNG PROJECT (3 PHƯƠNG ÁN)

Để bao quát trọn vẹn 16 kiến thức trên theo đúng tinh thần *"Sản phẩm trước, nghiên cứu sau"*, 3 phương án thiết kế project được đưa ra xem xét:

### Ý tưởng 1: Booking Platform v0 — Dual-Engine HTTP Service (Native Node.js vs NestJS)
* **Bài toán thực tế:** Xây dựng hệ thống quản lý sự kiện và đặt chỗ (`Booking Platform v0`) — chính là hạt nhân của dự án xuyên suốt 12 tháng. Hệ thống cho phép đơn vị tổ chức tạo sự kiện (Events) và người dùng đặt chỗ (Bookings). Điểm đặc biệt: Dự án được thiết kế theo mô hình **Dual-Engine (Hai động cơ song hành)**:
  1. **Engine A (Native):** Tự xây dựng toàn bộ HTTP server từ số 0 bằng `node:http` (tự parse stream, tự route URL bằng regex, tự map status code, tự serialize JSON).
  2. **Engine B (NestJS):** Triển khai cùng một hợp đồng API (API Contract) đó trên nền NestJS framework.
  3. Cả hai engine đều dùng chung một bộ **Contract & Integration Test Suite** để kiểm chứng hành vi đồng nhất.
* **Người dùng mục tiêu:** Ban tổ chức sự kiện và khách hàng đặt chỗ.
* **Chức năng chính:**
  - CRUD Events (`/events`, `/events/:id`): Tạo sự kiện, xem danh sách, cập nhật thông tin sự kiện (PUT/PATCH), hủy sự kiện (DELETE). Ràng buộc duy nhất: `Event.code` không được trùng lặp.
  - CRUD Bookings (`/bookings`, `/bookings/:id`): Đặt chỗ cho một sự kiện (POST `/bookings`), tra cứu booking, cập nhật người tham gia, hủy đặt chỗ. Ràng buộc: `eventId` phải hợp lệ và sự kiện đang tồn tại.
  - Phân hệ Observability & Tracing: Endpoint `/health` và kịch bản trace chi tiết bằng `curl -v` / Browser DevTools.
* **Kiến thức ứng dụng:** Đầy đủ 100% các chủ đề từ U1 đến U6: Client-Server, HTTP/1.1 message, Safe/Idempotent semantics, Status code mapping, Request stream parsing, Router, In-memory store, Integration test, NestJS DI & Controller, Network tracing.
* **Độ phức tạp triển khai:** Vừa phải, tập trung sâu vào bản chất HTTP và kiến trúc phần mềm, không bị phân tán bởi database hay hạ tầng bên ngoài.
* **Giá trị học tập:** **Cực kỳ cao.** Khởi động trực tiếp dự án xuyên suốt 12 tháng của roadmap, giúp người học "chạm" vào từng byte dữ liệu HTTP trước khi nhìn thấy sự tiện lợi của NestJS.

---

### Ý tưởng 2: Webhook & Event Ingestion Gateway
* **Bài toán thực tế:** Xây dựng một gateway tiếp nhận các webhook HTTP từ bên thứ ba (như GitHub, Stripe), xác thực headers, parse payload JSON dạng stream và lưu trữ in-memory để phục vụ truy vấn.
* **Ưu điểm:** Thực hành tốt về HTTP headers, POST request, stream parsing và response status.
* **Điểm hạn chế:** Nghiệp vụ thuần một chiều (chủ yếu là POST), thiếu các method RESTful phong phú (PUT, PATCH, DELETE), không có tính kế thừa lâu dài cho dự án xuyên suốt Booking của roadmap 12 tháng.

---

### Ý tưởng 3: E-Commerce Catalog & Cart Service v0
* **Bài toán thực tế:** Xây dựng API quản lý sản phẩm (Products) và giỏ hàng (Carts) in-memory.
* **Ưu điểm:** Có CRUD và kiểm tra logic nghiệp vụ.
* **Điểm hạn chế:** Không đồng bộ với roadmap [rm-12.md](file:///d:/Books/notes/pure-md/ps/rm/rm-12.md). Nếu chọn E-Commerce, người học sẽ phải duy trì hai domain song song (E-Commerce ở M1 và Booking ở M2+), gây lãng phí năng lực và xáo trộn context.

---

## PHẦN 3: LỰA CHỌN PHƯƠNG ÁN & GIẢI THÍCH LÝ DO

**Phương án được chọn:** **Ý tưởng 1 — Booking Platform v0 (Dual-Engine HTTP Service)**.

### Lý do lựa chọn:
1. **Khớp 100% với mục tiêu và định hướng của Roadmap 12 tháng:**
   - Dự án Booking bắt đầu chính thức từ **M1.2 (Booking v0)** và phát triển liên tục đến M12 ([rm-12.md#L249-L260](file:///d:/Books/notes/pure-md/ps/rm/rm-12.md#L249-L260)).
   - Xây dựng Booking v0 ngay tại M1.2 tạo ra codebase nền tảng để M2.1/M2.2 gắn PostgreSQL vào mà không phải viết lại từ đầu.
2. **Hiện thực hóa trọn vẹn triết lý "Hiểu giao thức trước khi dùng framework":**
   - Bằng cách xây dựng **Engine A (Native Node.js)** trước, người học buộc phải đối mặt với các vấn đề kỹ thuật cơ bản: Stream chunking là gì? Tại sao request body không có sẵn ngay lập tức? Làm thế nào gửi response header trước response body? Quên gọi `res.end()` thì điều gì xảy ra?
   - Sau đó chuyển sang **Engine B (NestJS)**, người học sẽ thấy rõ NestJS Controllers, `@Body()`, `@Param()`, `@HttpCode()` giải quyết vấn đề gì bên dưới nắp ca-pô.
3. **Môi trường đối chiếu kiến trúc hoàn hảo (Dual-Engine with Shared Contract):**
   - Hai engine chạy độc lập trên 2 cổng (ví dụ: port 3000 cho Native, port 3001 cho NestJS), nhưng dùng chung một bộ test kiểm thử tích hợp (Contract Test). Nếu một request gửi đến Native trả về `409 Conflict`, thì cùng request đó gửi đến NestJS cũng phải trả về đúng `409 Conflict`.
   - Đây là bài học thực tế đỉnh cao về **API Contract & Idempotency**.
4. **Phạm vi kiểm soát chặt chẽ (Zero External DB / Zero Over-engineering):**
   - Hoàn toàn dùng in-memory storage (`Map`), không dùng TypeORM, không PostgreSQL, không Docker.
   - Tập trung 100% năng lượng vào tầng mạng (Networking) và giao thức ứng dụng (HTTP).
