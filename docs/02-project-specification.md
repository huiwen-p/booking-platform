# Đặc tả Kỹ thuật Dự án: Booking Platform v0
## Dual-Engine HTTP Service (Native Node.js vs NestJS)

Tài liệu này xác định chi tiết kiến trúc, yêu cầu chức năng, yêu cầu kỹ thuật và phạm vi triển khai của dự án **Booking Platform v0** thuộc Milestone M1.2.

---

## A. PROBLEM DEFINITION

### 1. Bối cảnh
Trong phát triển Backend hiện đại, phần lớn các lập trình viên bắt đầu học bằng các framework cấp cao (như Express, NestJS, Spring Boot, Fastify). Framework che giấu gần như toàn bộ cơ chế của giao thức HTTP bên dưới thông qua các decorator, annotation và magic middleware:
- Lập trình viên không biết khi nào socket TCP được mở, khi nào request header được đọc xong, và tại sao request body lại phải đọc từng chunk dữ liệu.
- Lập trình viên nhầm lẫn giữa quy ước của framework với ngữ nghĩa chuẩn của giao thức quốc tế (RFC 9110, RFC 9112).
- Khi gặp lỗi mạng phức tạp (cháy connection, treo kết nối do quên kết thúc response stream, race condition khi client retry request), lập trình viên lúng túng vì thiếu một mental model chính xác về **Request-Response Lifecycle**.

### 2. Vấn đề cần giải quyết
Xây dựng phiên bản khởi đầu (`v0`) của nền tảng đặt vé **Booking Platform** dưới dạng một HTTP Web Service độc lập bằng TypeScript. Dự án giải quyết hai bài toán kỹ thuật song song:
1. **Làm chủ bản chất giao thức cấp thấp:** Tự tay hiện thực một HTTP Server bằng module chuẩn `node:http` của Node.js: tự bắt sự kiện stream, tự bóc tách header/body, tự viết bộ định tuyến (router) bằng path-matching, tự xử lý mã trạng thái HTTP chuẩn mực.
2. **Đối chiếu và làm chủ abstraction của framework:** Port toàn bộ tập API trên sang framework **NestJS**, từ đó nhìn rõ chính xác framework đã tự động hóa những công đoạn nào, giúp lập trình viên không bị biến thành "thợ gõ decorator".

### 3. Phạm vi chức năng (In-Scope)
- **Tài nguyên Events (Sự kiện):**
  - `GET /events`: Lấy danh sách sự kiện kèm khả năng lọc cơ bản.
  - `GET /events/:id`: Lấy chi tiết một sự kiện theo ID.
  - `POST /events`: Tạo sự kiện mới (yêu cầu mã `code` định danh duy nhất).
  - `PUT /events/:id`: Thay thế toàn bộ thông tin sự kiện (idempotent).
  - `PATCH /events/:id`: Cập nhật một phần thông tin sự kiện (non-idempotent mặc định).
  - `DELETE /events/:id`: Xóa sự kiện (idempotent).
- **Tài nguyên Bookings (Đặt chỗ/Vé):**
  - `GET /bookings`: Lấy danh sách đặt chỗ.
  - `GET /bookings/:id`: Lấy chi tiết một lượt đặt chỗ.
  - `POST /bookings`: Đặt chỗ cho một sự kiện (bắt buộc `eventId` phải tồn tại).
  - `DELETE /bookings/:id`: Hủy đặt chỗ (idempotent).
- **Phân hệ Kiểm tra Sức khỏe (Health Check):**
  - `GET /health`: Trả về trạng thái uptime và engine đang chạy (`native` hoặc `nestjs`).
- **Bộ Kiểm thử Tích hợp dùng chung (Shared Contract Tests):**
  - Một test suite duy nhất kiểm tra tính đúng đắn của toàn bộ endpoint thông qua cổng HTTP thật cho cả 2 engine.
- **Kịch bản Tracing mạng thực tế:**
  - Script hoặc tài liệu hướng dẫn trace request bằng `curl -v` và Browser DevTools Network.

### 4. Những gì nằm ngoài phạm vi (Out-of-Scope)
- Không kết nối Database quan hệ (PostgreSQL) hoặc ORM (TypeORM) — nội dung này thuộc M2.
- Không triển khai hệ thống xác thực (AuthN/AuthZ, JWT, Sessions) — nội dung này thuộc M6.
- Không cấu hình Docker, Reverse Proxy (Nginx) — nội dung này thuộc M7.
- Không sử dụng các pattern kiến trúc phức tạp (Hexagonal, Clean Architecture, CQRS) — nội dung này thuộc M5.
- Không sử dụng database lock hoặc distributed locking (chỉ dùng in-memory state đơn giản).

---

## B. FUNCTIONAL REQUIREMENTS

### 1. Mô hình Dữ liệu (In-Memory Entities)

```typescript
// Định nghĩa thực thể Sự kiện
export interface Event {
  id: string;              // UUID hoặc chuỗi nanoid
  code: string;            // Mã sự kiện duy nhất (VD: "TECH-CONF-2026")
  title: string;           // Tên sự kiện
  description?: string;    // Mô tả chi tiết
  totalSeats: number;      // Tổng số chỗ ngồi (nguyên dương)
  startsAt: string;        // Thời gian bắt đầu (ISO 8601 string)
  createdAt: string;       // Thời gian tạo (ISO 8601 string)
  updatedAt: string;       // Thời gian cập nhật (ISO 8601 string)
}

// Định nghĩa thực thể Đặt chỗ
export interface Booking {
  id: string;              // UUID hoặc chuỗi nanoid
  eventId: string;         // ID của sự kiện được đặt (Foreign key in-memory)
  customerName: string;    // Tên khách hàng
  customerEmail: string;   // Email khách hàng
  seatCount: number;       // Số lượng vé muốn đặt (mặc định: 1)
  status: 'CONFIRMED' | 'CANCELLED'; // Trạng thái đặt vé
  createdAt: string;       // Thời gian đặt (ISO 8601 string)
}
```

### 2. Quy tắc Nghiệp vụ (Business Invariants)
1. **Duy nhất mã sự kiện (`Event.code` Uniqueness):**
   - Khi tạo mới sự kiện (`POST /events`), nếu `code` đã tồn tại trong hệ thống, server **bắt buộc** từ chối và trả về mã `409 Conflict`.
2. **Tính toàn vẹn tham chiếu Booking (`Event Existence`):**
   - Khi tạo đặt chỗ (`POST /bookings`), trường `eventId` phải trỏ tới một Event đang tồn tại. Nếu không tìm thấy Event tương ứng, server trả về `404 Not Found` (hoặc `422 Unprocessable Entity` kèm thông điệp rõ ràng).
3. **Tính toán số chỗ:**
   - Trong phạm vi `v0`, kiểm tra đơn giản: `seatCount` phải $> 0$. (Bài toán chống oversell dưới concurrency sẽ được đào sâu ở M4.2).
4. **Hủy đặt chỗ (Cancel Booking):**
   - Khi gọi `DELETE /bookings/:id`, trạng thái của booking chuyển thành `CANCELLED` hoặc xóa khỏi in-memory store, trả về `204 No Content`.
   - Nếu client gọi `DELETE /bookings/:id` lần thứ hai trên cùng một ID đã xóa, hệ thống vẫn phải xử lý an toàn (trả về `204 No Content` hoặc `404 Not Found` theo quy ước nhất quán, thể hiện tính Idempotent).

### 3. Đặc tả Chi tiết API Endpoints

#### Bảng danh mục Endpoints:

| Method | URI Path | Safe | Idempotent | Request Body | Success Status | Error Statuses | Mô tả |
| :--- | :--- | :---: | :---: | :--- | :---: | :--- | :--- |
| `GET` | `/health` | ✅ | ✅ | Không | `200 OK` | `500` | Kiểm tra trạng thái máy chủ |
| `GET` | `/events` | ✅ | ✅ | Không | `200 OK` | `500` | Lấy danh sách tất cả sự kiện |
| `GET` | `/events/:id` | ✅ | ✅ | Không | `200 OK` | `404, 500` | Lấy thông tin chi tiết một sự kiện |
| `POST` | `/events` | ❌ | ❌ | JSON `CreateEventDto` | `201 Created` | `400, 409, 422, 500` | Tạo sự kiện mới |
| `PUT` | `/events/:id`| ❌ | ✅ | JSON `UpdateEventDto` | `200 OK` | `400, 404, 409, 422, 500` | Thay thế toàn bộ dữ liệu sự kiện |
| `PATCH`| `/events/:id`| ❌ | ❌ | JSON `PartialEventDto`| `200 OK` | `400, 404, 409, 422, 500` | Cập nhật một số trường của sự kiện |
| `DELETE`|`/events/:id`| ❌ | ✅ | Không | `204 No Content`| `404, 500` | Xóa sự kiện |
| `GET` | `/bookings` | ✅ | ✅ | Không | `200 OK` | `500` | Lấy danh sách đặt chỗ |
| `GET` | `/bookings/:id`|✅ | ✅ | Không | `200 OK` | `404, 500` | Lấy chi tiết lượt đặt chỗ |
| `POST` | `/bookings` | ❌ | ❌ | JSON `CreateBookingDto`| `201 Created` | `400, 404, 422, 500` | Đặt chỗ cho sự kiện |
| `DELETE`|`/bookings/:id`|❌ | ✅ | Không | `204 No Content`| `404, 500` | Hủy đặt chỗ |

#### Định dạng Header bắt buộc:
* Khi client gửi request có body: Bắt buộc kèm `Content-Type: application/json`. Nếu client gửi sai `Content-Type` khi có body, server từ chối bằng `415 Unsupported Media Type` hoặc `400 Bad Request`.
* Khi server trả về response có body (200, 201, 4xx, 5xx): Bắt buộc có header:
  `Content-Type: application/json; charset=utf-8`
* Khi tạo mới thành công (`201 Created`): Server **bắt buộc** trả về header `Location: /events/:id` (hoặc `/bookings/:id`).

---

## C. TECHNICAL REQUIREMENTS

### 1. Kiến trúc Hai Động cơ (Dual-Engine Architecture)
Dự án được cấu trúc để có thể chạy một trong hai động cơ:
1. **Engine A (Native Node.js Server):**
   - Điểm vào: `src/native/main.ts` (chạy trên cổng `3000`).
   - Sử dụng duy nhất module `node:http`. Tuyệt đối không dùng Express, Fastify, NestJS, Koa.
   - Tự quản lý vòng đời socket, stream events (`data`, `end`, `error`), phân giải route regex/param, serialize JSON.
2. **Engine B (NestJS Server):**
   - Điểm vào: `src/nestjs/main.ts` (chạy trên cổng `3001` hoặc configurable).
   - Sử dụng NestJS core và platform-express.
   - Triển khai đúng các pattern idiomatic của NestJS: Modules, Controllers, Services, Dependency Injection, Validation Pipes, Exception Filters.
3. **Shared Domain & Memory Store:**
   - Tầng in-memory store và models nằm tại `src/shared/` để cả hai engine có thể dùng chung nếu muốn, hoặc triển khai riêng để đối chiếu phong cách kiến trúc.

### 2. Stream-based Body Parsing (Dành cho Native Server)
* Không giả định request body luôn nằm gọn trong một single chunk.
* Phải đọc dữ liệu bằng cách gom các buffer chunk:
  ```typescript
  const chunks: Buffer[] = [];
  req.on('data', (chunk: Buffer) => chunks.push(chunk));
  req.on('end', () => {
    const rawBody = Buffer.concat(chunks).toString('utf-8');
    // parse JSON
  });
  ```
* Có cơ chế giới hạn kích thước payload (Payload Size Limit, ví dụ max 1MB). Nếu client gửi body vượt quá giới hạn, ngắt stream và phản hồi `413 Payload Too Large`.

### 3. Chuẩn hóa Định dạng Lỗi (Error Response Format)
Toàn bộ phản hồi lỗi (4xx, 5xx) từ cả hai engine phải tuân theo một schema JSON thống nhất:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Malformed JSON in request body",
  "timestamp": "2026-11-17T08:30:00.000Z",
  "path": "/events"
}
```

Bảng phân loại mã lỗi (Error Mapping Matrix):
- `400 Bad Request`: Payload JSON bị lỗi cú pháp (cắt cụt, thiếu ngoặc kép, sai format).
- `404 Not Found`: Không tìm thấy endpoint hoặc không tìm thấy Entity tương ứng với `:id`.
- `405 Method Not Allowed`: Endpoint tồn tại nhưng method gửi lên không được hỗ trợ (ví dụ: `POST /health`).
- `409 Conflict`: Vi phạm quy tắc nghiệp vụ về tính duy nhất (`code` của sự kiện đã tồn tại).
- `422 Unprocessable Entity`: Cú pháp JSON đúng nhưng vi phạm validation (thiếu trường bắt buộc, kiểu dữ liệu sai, số âm).
- `500 Internal Server Error`: Lỗi logic phát sinh ngoài dự kiến; phải log chi tiết trên server nhưng không để lộ stack trace nhạy cảm ra ngoài client.

---

## D. ARCHITECTURE & REQUEST LIFECYCLE

### 1. Sơ đồ Kiến trúc So sánh

```
CLIENT (curl / Browser / Supertest)
     │
     ├──► [Port 3000: Native Engine]
     │        │
     │        ▼
     │    node:http Server (IncomingMessage / ServerResponse)
     │        │
     │        ▼
     │    Native Body Stream Collector & JSON Parser
     │        │
     │        ▼
     │    Native Regex / Path Router
     │        │
     │        ▼
     │    Native Handlers (EventsHandler / BookingsHandler)
     │        │
     │        ▼
     │    In-Memory State (Map<string, Event>)
     │
     └──► [Port 3001: NestJS Engine]
              │
              ▼
          NestJS Platform Express Adapter
              │
              ▼
          Middleware (Request Logging)
              │
              ▼
          NestJS Controller (Routing, @Body, @Param)
              │
              ▼
          NestJS Service (Business Logic & Validation)
              │
              ▼
          In-Memory State (Map<string, Event>)
```

### 2. So sánh Vòng đời Request (Request Lifecycle)

```
┌───────────────────────────────────────┐   ┌────────────────────────────────────────┐
│         NATIVE NODE.JS ENGINE         │   │             NESTJS ENGINE              │
├───────────────────────────────────────┤   ├────────────────────────────────────────┤
│ 1. OS Socket accept()                 │   │ 1. OS Socket accept()                  │
│ 2. Node.js parse HTTP headers         │   │ 2. HTTP Adapter (Express) parse header │
│ 3. req event 'data' (stream chunks)   │   │ 3. Global Middleware (Logger)          │
│ 4. req event 'end' (complete buffer)  │   │ 4. Routing & Controller matching       │
│ 5. Manual JSON.parse()                │   │ 5. NestJS Pipes (Validation DTO)       │
│ 6. Match URL pattern & HTTP method    │   │ 6. Controller Handler execution        │
│ 7. Execute Handler logic              │   │ 7. Injectable Service business rules   │
│ 8. res.writeHead(statusCode, headers) │   │ 8. Response Serialization              │
│ 9. res.end(JSON.stringify(payload))   │   │ 9. Exception Filters (nếu có lỗi)      │
└───────────────────────────────────────┘   └────────────────────────────────────────┘
```

---

## E. DATA DESIGN & TYPES

### TypeScript Contract Interfaces (`src/shared/types.ts`)

```typescript
export interface CreateEventInput {
  code: string;
  title: string;
  description?: string;
  totalSeats: number;
  startsAt: string;
}

export interface UpdateEventInput {
  code: string;
  title: string;
  description?: string;
  totalSeats: number;
  startsAt: string;
}

export interface PatchEventInput {
  code?: string;
  title?: string;
  description?: string;
  totalSeats?: number;
  startsAt?: string;
}

export interface CreateBookingInput {
  eventId: string;
  customerName: string;
  customerEmail: string;
  seatCount?: number;
}
```

---

## F. IMPLEMENTATION SCOPE

### Pha 1: Native Node.js HTTP Server (`src/native/`)
- Cài đặt `server.ts` sử dụng `http.createServer()`.
- Xây dựng `router.ts` hỗ trợ đăng ký route (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`) và bóc tách route params (`:id`).
- Xây dựng helper `parseJsonBody(req)` xử lý stream và validation JSON.
- Xây dựng helper `sendJson(res, statusCode, data, headers)`.
- Hiện thực CRUD Events và CRUD Bookings in-memory.

### Pha 2: NestJS Porting (`src/nestjs/`)
- Khởi tạo NestJS bootstrap (`main.ts`, `app.module.ts`).
- `EventsModule`, `EventsController`, `EventsService`.
- `BookingsModule`, `BookingsController`, `BookingsService`.
- Sử dụng DTOs với validation cơ bản.
- Cấu hình Middleware ghi log method, url và thời gian phản hồi.

### Pha 3: Bộ Kiểm thử Tích hợp Dùng chung (`tests/contract/`)
- Viết test suite bằng Supertest (hoặc native HTTP client) chạy trên bất kỳ base URL nào:
  `runContractTests('http://localhost:3000')` (Native)
  `runContractTests('http://localhost:3001')` (NestJS)
- Kiểm tra 100% các ca:
  - Happy paths: Tạo, đọc, cập nhật, xóa thành công.
  - Conflict: Tạo 2 event cùng `code` trả về `409`.
  - Bad Request: Body JSON hỏng trả về `400`.
  - Validation: Dữ liệu thiếu trường bắt buộc trả về `422`.
  - Not Found: Tra cứu ID không tồn tại trả về `404`.
  - Method Not Allowed: Gửi method không hỗ trợ trả về `405`.

### Pha 4: Network Tracing & Phân tích Giao thức (`docs/network-tracing.md`)
- Soạn thảo script `curl -v` chi tiết để người học trực tiếp chạy và quan sát:
  - DNS resolution.
  - TCP handshake (SYN $\rightarrow$ SYN-ACK $\rightarrow$ ACK).
  - Request headers gửi đi (`Host`, `User-Agent`, `Accept`, `Content-Length`).
  - Response status line và headers nhận về (`HTTP/1.1 200 OK`, `Content-Type`, `Date`).
- Hướng dẫn quan sát Waterfall Timing trên Browser DevTools (DNS Lookup, Initial Connection, SSL, TTFB, Content Download).
