# Cẩm nang Nghiên cứu Ngược từ Codebase: Booking Platform v0
## Reverse Learning Guide — Học từ Sản phẩm Thực tế

> **Triết lý cốt lõi: Sản phẩm trước, nghiên cứu sau.**  
> Bạn đã có một sản phẩm `Booking Platform v0` hoàn chỉnh hoạt động được trên cả hai engine (Native Node.js và NestJS). Mục tiêu bây giờ không phải là đọc code một cách thụ động, mà là **mổ xẻ hệ thống** để thấu hiểu tường tận: Tại sao hệ thống lại chạy như vậy? Chuyện gì thực sự xảy ra trong từng mili-giây khi một request đi qua dây mạng vào đến server?

---

## A. SYSTEM EXPLORATION — KHÁM PHÁ HỆ THỐNG

### 1. Nên bắt đầu đọc từ đâu? (Thứ tự đọc chuẩn)
Để không bị lạc trong các decorator của framework, hãy đọc theo thứ tự từ tầng thấp lên tầng cao:

1. **Bước 1: Điểm tiếp nhận Socket cấp thấp nhất (`src/native/server.ts`)**
   - Đọc hàm khởi tạo `http.createServer()`.
   - Quan sát xem Node.js nhận `req` (`IncomingMessage`) và `res` (`ServerResponse`) như thế nào.
   - Nhận diện cách router phân phối request và cách block `try/catch` ngoài cùng bảo vệ server khỏi sập tiến trình.
2. **Bước 2: Cơ chế Stream Body & Bóc tách gói tin (`src/native/http/body-parser.ts`)**
   - Xem cách các chunk dữ liệu dạng `Buffer` được gom lại qua sự kiện `'data'`.
   - Xem cách `Buffer.concat()` chuyển mảng chunk thành chuỗi văn bản hoàn chỉnh trước khi gọi `JSON.parse()`.
3. **Bước 3: Bộ định tuyến thủ công (`src/native/http/router.ts`)**
   - Xem cách Regex biến đổi pattern `/events/:id` thành nhóm bắt giữ `(?<id>[^/]+)`.
   - Xem cách router phân biệt giữa `404 Not Found` (không khớp URL) và `405 Method Not Allowed` (khớp URL nhưng sai HTTP Method).
4. **Bước 4: Xử lý nghiệp vụ & Invariant (`src/native/handlers/events.handler.ts`)**
   - Xem cách hàm handler đọc `req.params`, gọi In-Memory Store, kiểm tra trùng mã `code`, và gọi helper `sendJson()`.
5. **Bước 5: Chuyển sang đối chiếu với NestJS (`src/nestjs/`)**
   - Đọc `src/nestjs/events/events.controller.ts` và `src/nestjs/events/events.service.ts`.
   - Tự hỏi: *Đoạn code 5 dòng decorator này trong NestJS đang thay thế cho bao nhiêu dòng code mà ta vừa đọc ở bên Native?*

### 2. Nên chạy thử chức năng nào trước?
1. **Kiểm tra Uptime:** `curl -i http://localhost:3000/health` (Native) và `curl -i http://localhost:3001/health` (NestJS). So sánh response header giữa hai engine.
2. **Tạo sự kiện (POST):** Gửi một sự kiện mới qua `curl -i -X POST ...`. Quan sát mã `201 Created` và sự xuất hiện của header `Location`.
3. **Thử nghiệm xung đột (Conflict 409):** Gửi lại chính xác request trên lần thứ hai. Quan sát mã lỗi `409 Conflict` trả về.
4. **Lấy chi tiết (GET):** Dùng ID nhận được ở bước 2 để gọi `GET /events/:id`.

---

## B. KNOWLEDGE EXPLORATION — ĐÀO SÂU KIẾN THỨC

### 1. HTTP/1.1 Protocol & Message Structure
* **Nó xuất hiện ở đâu?** Trong `src/native/http/request-parser.ts` và `src/native/http/response-helper.ts`.
* **Nó giải quyết vấn đề gì?** Chuẩn hóa việc trao đổi thông tin giữa Client và Server qua dòng byte thô (raw byte stream).
* **Cơ chế thực sự bên dưới:**
  - Request gồm 3 phần: Request Line (`POST /events HTTP/1.1`), Headers (kết thúc bằng `\r\n\r\n`), và Body (độ dài xác định bởi `Content-Length` hoặc `Transfer-Encoding: chunked`).
  - Response gồm 3 phần: Status Line (`HTTP/1.1 201 Created`), Headers, và Response Body.
* **Mức độ cần hiểu:** **Mastery (M).** Phải tự vẽ được cấu trúc message HTTP/1.1 trên giấy mà không cần nhìn tài liệu.

### 2. Stream-based Request Handling & Memory Leak
* **Nó xuất hiện ở đâu?** `src/native/http/body-parser.ts`.
* **Nó giải quyết vấn đề gì?** Trong mô hình mạng, gói tin TCP không bao giờ đến cùng một lúc nếu kích thước lớn. Nếu gom toàn bộ body vào một biến string khổng lồ mà không giới hạn kích thước, hacker có thể gửi một body 1GB làm server cạn kiệt RAM (Out Of Memory).
* **Cơ chế thực sự:** Node.js phát ra sự kiện `'data'` mỗi khi có một chunk dữ liệu tới network card. Khi client phát tín hiệu gửi xong, sự kiện `'end'` mới được kích hoạt.
* **Cần đọc phần code nào:** Đọc kỹ đoạn `req.on('data')`, kiểm tra `receivedBytes > maxBytes` thì gọi `req.destroy()`.

### 3. Safe & Idempotent Methods
* **Nó xuất hiện ở đâu?** Trong các handler của `GET`, `PUT`, `PATCH`, `DELETE`.
* **Nó giải quyết vấn đề gì?** Độ tin cậy mạng (Network Reliability). Khi client gửi request mà không nhận được phản hồi (do rớt mạng chập chờn), client có được phép tự động gửi lại (retry) hay không?
* **Cơ chế thực sự:**
  - `GET /events/:id` (Safe & Idempotent): Không đổi state, gọi 100 lần an toàn.
  - `PUT /events/:id` (Idempotent): Thay thế toàn bộ bản ghi. Nếu gọi lại lần 2 với cùng dữ liệu, trạng thái DB/Memory không thay đổi thêm.
  - `DELETE /events/:id` (Idempotent): Bản ghi đã bị xóa ở lần 1. Lần 2 gọi lại, kết quả cuối cùng vẫn là bản ghi đó không còn trong hệ thống.
  - `POST /bookings` (Non-Idempotent): Mỗi lần retry là một lần tạo mới booking, có thể dẫn tới trừ tiền hai lần hoặc đặt vé trùng.

### 4. NestJS Framework Abstraction
* **Nó xuất hiện ở đâu?** `src/nestjs/`.
* **Framework đã làm thay ta những gì?**
  1. *Stream Parsing:* Tự động đọc stream và parse JSON qua body-parser tích hợp.
  2. *Routing:* Tự động gắn controller methods vào router Express bên dưới.
  3. *Serialization:* Tự động `JSON.stringify()` và thêm header `Content-Type: application/json`.
  4. *Dependency Injection:* Quản lý vòng đời (Lifecycle) của Service, tự động inject vào Controller mà không cần viết tay `new EventsService()`.

---

## C. EXPERIMENTATION — CÁC THỬ NGHIỆM PHÁ HỦY CÓ CHỦ ĐÍCH

Hãy trực tiếp chỉnh sửa code và chạy các thử nghiệm sau để quan sát hậu quả:

### Thí nghiệm 1: Phá vỡ vòng đời Request (Treo kết nối)
* **Thao tác:** Mở `src/native/handlers/health.handler.ts`, comment dòng `res.end()` hoặc dòng gọi `sendJson()`.
* **Thực hiện:** Chạy `curl -i http://localhost:3000/health`.
* **Hiện tượng quan sát:** Con trỏ terminal nhấp nháy, lệnh `curl` không bao giờ kết thúc cho đến khi bạn bấm `Ctrl+C` hoặc timeout sau 2 phút.
* **Bài học rút ra:** Trong Native HTTP Server, nếu lập trình viên không chủ động đóng stream response bằng `res.end()`, socket TCP sẽ bị giữ mở lơ lửng, gây rò rỉ tài nguyên hệ thống (connection leak).

### Thí nghiệm 2: Gửi gói tin JSON bị cắt cụt (Malformed JSON)
* **Thao tác:** Dùng `curl` gửi một chuỗi JSON dở dang:
  ```bash
  curl -i -X POST http://localhost:3000/events \
    -H "Content-Type: application/json" \
    -d '{"code": "JS-CONF", "title": "Javascript'
  ```
* **Hiện tượng quan sát:** Server bắt được lỗi `SyntaxError` trong hàm `JSON.parse()`, không bị sập máy chủ, và trả về đúng `400 Bad Request` kèm thông báo `"Malformed JSON payload"`.
* **Bài học rút ra:** Luôn phải bọc `JSON.parse()` trong `try/catch`. Không bao giờ tin tưởng dữ liệu từ client gửi lên.

### Thí nghiệm 3: Thử nghiệm tính Idempotent khi Retry
* **Thao tác:**
  1. Gửi request tạo sự kiện: `POST /events` với `code: "GOLANG-2026"`. Kết quả: `201 Created`.
  2. Gửi request cập nhật đè: `PUT /events/<id>` với dữ liệu `{ "code": "GOLANG-2026", "title": "Golang New", "totalSeats": 200, "startsAt": "..." }`. Kết quả: `200 OK`.
  3. Bấm gửi lại lệnh `PUT` trên thêm 3 lần nữa.
* **Hiện tượng quan sát:** Cả 3 lần sau đều trả về `200 OK`, dữ liệu trong bộ nhớ không sinh thêm bất kỳ bản ghi thừa nào, ID sự kiện giữ nguyên.
* **Bài học rút ra:** Đây chính là lý do vì sao client được phép retry tự do các request `PUT` và `DELETE` khi gặp lỗi timeout mạng mà không sợ làm sai lệch dữ liệu.

### Thí nghiệm 4: Tracing Network với curl và Chrome DevTools
* **Thao tác:** Mở terminal, chạy lệnh:
  ```bash
  curl -v --http1.1 http://localhost:3000/events
  ```
  Sau đó chạy so sánh với một trang HTTPS thật:
  ```bash
  curl -v --http1.1 https://httpbin.org/get
  ```
* **Hiện tượng quan sát:**
  - Ở `localhost`: Chỉ có `* Connected to localhost (127.0.0.1) port 3000`, sau đó gửi ngay Request headers (`> GET /events HTTP/1.1`).
  - Ở `httpbin.org`: Có thêm các dòng bắt tay TLS: `* ALPN: server accepted http/1.1`, `* SSL connection using TLSv1.3...`, `* Server certificate: ...`.
* **Bài học rút ra:** Phân biệt rõ ranh giới: TCP thiết lập đường truyền thô, TLS thiết lập lớp mã hóa bảo mật, và HTTP là giao thức trao đổi dữ liệu nghiệp vụ chạy bên trên.

---

## D. DEEP DIVE CANDIDATES — PHÂN LOẠI ĐỘ SÂU NGHIÊN CỨU

Không dàn trải thời gian đều cho mọi kiến thức. Hãy tập trung theo 3 mức độ:

### 1. Phải hiểu sâu sắc (Must Understand Deeply — Core):
* **HTTP Semantics & Status Codes:** Tại sao lại dùng 201 thay vì 200? Khi nào dùng 400, 404, 409, 422? Sự khác biệt giữa Safe và Idempotent. (Đây là kiến thức dùng suốt đời trong sự nghiệp Backend).
* **Request-Response Stream Lifecycle:** Hiểu cách dữ liệu truyền qua TCP socket dưới dạng stream và tại sao cần `res.end()`.
* **Ranh giới Protocol vs Framework:** Hiểu chính xác NestJS làm gì bên dưới, không nhầm lẫn giữa tính năng của NestJS và tính năng của giao thức HTTP.

### 2. Hiểu ở mức vận dụng thực tế (Understand Practically):
* **NestJS Dependency Injection & Controllers:** Biết cách tạo Module, Controller, Service để tổ chức code gọn gàng, phục vụ cho M2 và M5.
* **URL Routing Regex:** Hiểu nguyên lý bóc tách param `:id` bằng biểu thức chính quy.
* **Integration Testing with Supertest:** Biết cách viết test case gửi HTTP request thật để kiểm thử API.

### 3. Chỉ cần hiểu tổng quan / Nhận diện (Awareness):
* **Chi tiết thuật toán mã hóa của TLS:** Chỉ cần biết TLS diễn ra sau TCP và trước HTTP.
* **HTTP Keep-Alive & Connection Pooling:** Biết khái niệm tái sử dụng kết nối TCP để giảm độ trễ, sẽ học sâu ở M3 và M7.
* **NestJS Guards, Interceptors, Pipes nâng cao:** Chỉ cần biết chúng nằm trên đường đi của request lifecycle trong NestJS, chưa cần đào sâu ở M1.2.
