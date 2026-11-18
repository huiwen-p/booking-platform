# Handoff Đặc tả Triển khai Dành cho AI Coding Agent
## Dự án: Booking Platform v0 — Dual-Engine HTTP Service (Native Node.js vs NestJS)

> **CHỈ DẪN DÀNH CHO AI CODING AGENT:**  
> Bạn hãy đọc toàn bộ tài liệu này trước khi bắt tay viết code. Bạn được yêu cầu triển khai dự án **Booking Platform v0** tuân thủ chính xác kiến trúc hai động cơ (Dual-Engine), ranh giới module, các quy tắc nghiệp vụ và tiêu chuẩn kỹ thuật được mô tả dưới đây.  
> 
> **CÁC NGUYÊN TẮC BẮT BUỘC TUÂN THỦ:**
> 1. **Tuyệt đối không dùng framework cho Engine A (Native):** Chỉ sử dụng runtime chuẩn của Node.js (`node:http`, `node:url`, `node:buffer`). Không dùng Express, Fastify hay Koa trong thư mục `src/native/`.
> 2. **Sử dụng NestJS chuẩn mực cho Engine B:** Triển khai đúng idiomatic NestJS (Modules, Controllers, Services, Dependency Injection, Validation Pipes, Exception Filters) trong thư mục `src/nestjs/`.
> 3. **Không kết nối Database ngoài:** Không cài đặt PostgreSQL, TypeORM, Prisma, Mongoose, SQLite hay Redis trong milestone này. Mọi dữ liệu lưu trữ in-memory bằng `Map` chuẩn của JavaScript/TypeScript.
> 4. **Xử lý lỗi toàn diện:** Không bỏ qua các trường hợp biên (invalid JSON, method không hỗ trợ, sai ID, trùng mã sự kiện, thiếu trường). Trả về đúng HTTP Status Code theo chuẩn RFC 9110.
> 5. **Chất lượng code:** Bật `strict: true` trong `tsconfig.json`, không sử dụng kiểu `any`, xử lý stream chuẩn (không nuốt lỗi `req.on('error')`), code sạch và có chú thích kiến trúc rõ ràng.

---

## 1. PROJECT OVERVIEW
* **Tên dự án:** Booking Platform v0 — Dual-Engine HTTP Service
* **Mục tiêu:** Xây dựng hệ thống quản lý sự kiện và đặt vé (Event & Ticket Reservation) phiên bản v0, chạy đồng thời hoặc độc lập hai động cơ:
  * **Engine A (Native):** Tự xây dựng HTTP Server bằng `node:http`.
  * **Engine B (NestJS):** Triển khai cùng API contract trên nền framework NestJS.
* **Môi trường hoạt động:** Node.js v20+ LTS, TypeScript 5.x.
* **Quản lý gói:** `pnpm`.

---

## 2. PROBLEM DEFINITION
Hệ thống backend cần cung cấp REST API cho phép tạo, quản lý sự kiện và đặt chỗ cho khách hàng. Cần chứng minh tính nhất quán của API (API Consistency & Contract) trên cả hai nền tảng triển khai (cấp thấp bằng `node:http` và cấp cao bằng NestJS) thông qua một bộ kiểm thử tích hợp dùng chung chạy trên cổng mạng HTTP thật.

---

## 3. FUNCTIONAL REQUIREMENTS

### 3.1. Quản lý Sự kiện (Events Management)
1. **Lấy danh sách sự kiện (`GET /events`):**
   - Trả về danh sách toàn bộ sự kiện hiện có.
   - Hỗ trợ lọc cơ bản qua Query Parameters: `?code=<event_code>`.
   - Mã phản hồi: `200 OK`.
2. **Lấy chi tiết sự kiện (`GET /events/:id`):**
   - Tìm kiếm sự kiện theo `id`. Nếu không thấy, trả về `404 Not Found`.
   - Mã phản hồi: `200 OK`.
3. **Tạo sự kiện mới (`POST /events`):**
   - Tiếp nhận thông tin sự kiện. Bắt buộc: `code`, `title`, `totalSeats`, `startsAt`.
   - **Ràng buộc:** `code` phải là duy nhất. Nếu trùng, trả về `409 Conflict`.
   - `totalSeats` phải là số nguyên dương $> 0$.
   - Mã phản hồi: `201 Created` kèm header `Location: /events/:id`.
4. **Thay thế toàn bộ sự kiện (`PUT /events/:id` — Idempotent):**
   - Thay thế toàn bộ dữ liệu sự kiện theo `id`. Nếu `id` không tồn tại, trả về `404 Not Found`.
   - Yêu cầu đầy đủ các trường như `POST`.
   - Mã phản hồi: `200 OK`.
5. **Cập nhật từng phần sự kiện (`PATCH /events/:id`):**
   - Cập nhật một hoặc nhiều trường được gửi lên.
   - Nếu có cập nhật `code`, phải kiểm tra không trùng với các sự kiện khác.
   - Mã phản hồi: `200 OK`.
6. **Xóa sự kiện (`DELETE /events/:id` — Idempotent):**
   - Xóa sự kiện khỏi hệ thống. Đồng thời hủy hoặc xóa các booking liên quan đến sự kiện đó.
   - Mã phản hồi: `204 No Content` (không có response body). Nếu gọi lại lần 2, vẫn trả về `204 No Content` (hoặc `404 Not Found` theo quy ước nhất quán).

### 3.2. Quản lý Đặt chỗ (Bookings Management)
1. **Lấy danh sách đặt chỗ (`GET /bookings`):**
   - Trả về danh sách đặt chỗ. Hỗ trợ query `?eventId=<event_id>`.
   - Mã phản hồi: `200 OK`.
2. **Lấy chi tiết đặt chỗ (`GET /bookings/:id`):**
   - Tìm kiếm booking theo `id`. Nếu không thấy, trả về `404 Not Found`.
   - Mã phản hồi: `200 OK`.
3. **Tạo lượt đặt chỗ mới (`POST /bookings` — Non-Idempotent):**
   - Tiếp nhận: `eventId`, `customerName`, `customerEmail`, `seatCount` (tùy chọn, mặc định 1).
   - **Ràng buộc:** `eventId` phải trỏ tới một Event đang tồn tại. Nếu không, trả về `404 Not Found` hoặc `422 Unprocessable Entity`.
   - Mỗi lần gọi thành công sẽ tạo ra một bản ghi Booking mới với ID mới.
   - Mã phản hồi: `201 Created` kèm header `Location: /bookings/:id`.
4. **Hủy đặt chỗ (`DELETE /bookings/:id` — Idempotent):**
   - Xóa booking hoặc đổi trạng thái sang `CANCELLED`.
   - Mã phản hồi: `204 No Content`.

### 3.3. Kiểm tra Hệ thống (Health Check)
* `GET /health`: Trả về `200 OK` kèm JSON:
  ```json
  {
    "status": "ok",
    "engine": "native", // hoặc "nestjs"
    "uptime": 12.34,
    "timestamp": "2026-11-17T08:00:00.000Z"
  }
  ```

---

## 4. NON-FUNCTIONAL REQUIREMENTS
1. **Chuẩn giao thức HTTP/1.1:**
   - Headers trả về luôn có `Content-Type: application/json; charset=utf-8` khi có body.
   - Response status code phải phản ánh chính xác kết quả, không trả về `200 OK` cho lỗi.
2. **Payload Limiting:** Giới hạn kích thước request body tối đa là 1MB. Nếu vượt quá, trả về `413 Payload Too Large`.
3. **Không làm rò rỉ ngoại lệ (Zero Uncaught Exceptions):** Mọi lỗi phát sinh phải được bắt và định dạng lại thành response chuẩn, không để sập tiến trình máy chủ.
4. **Performance:** Thời gian phản hồi in-memory trung bình $< 5ms$ cho các thao tác đọc và ghi cơ bản.

---

## 5. ARCHITECTURE & MODULE BOUNDARIES

### Cấu trúc Thư mục Chi tiết:
```text
booking-platform/
├── package.json
├── tsconfig.json
├── pnpm-lock.yaml
├── docs/                             # Thư mục tài liệu
│   ├── M1-2.md
│   ├── 01-ke-hoach-va-y-tuong-project.md
│   ├── 02-project-specification.md
│   ├── 03-knowledge-mapping.md
│   ├── 04-ai-coding-agent-handoff.md
│   ├── 05-reverse-learning-guide.md
│   ├── 06-acceptance-criteria.md
│   └── README.md
├── src/
│   ├── shared/                       # Tầng dùng chung giữa 2 engine
│   │   ├── types.ts                  # Domain models & DTO interfaces
│   │   ├── errors/
│   │   │   ├── app-error.ts          # Custom Error base class
│   │   │   ├── not-found.error.ts
│   │   │   ├── conflict.error.ts
│   │   │   └── validation.error.ts
│   │   └── storage/
│   │       └── in-memory-store.ts    # Map<string, Event> & Map<string, Booking>
│   │
│   ├── native/                       # ENGINE A: Native Node.js Server
│   │   ├── main.ts                   # Bootstrap & listen port 3000
│   │   ├── server.ts                 # http.createServer wrapper
│   │   ├── http/
│   │   │   ├── request-parser.ts     # Bóc tách query params, path, headers
│   │   │   ├── body-parser.ts        # Stream chunk collector & JSON parser
│   │   │   ├── response-helper.ts    # sendJson(), sendEmpty(), sendError()
│   │   │   └── router.ts             # Regex-based HTTP Router
│   │   └── handlers/
│   │       ├── health.handler.ts
│   │       ├── events.handler.ts
│   │       └── bookings.handler.ts
│   │
│   └── nestjs/                       # ENGINE B: NestJS Framework Server
│       ├── main.ts                   # NestFactory.create() & listen port 3001
│       ├── app.module.ts
│       ├── common/
│       │   ├── filters/
│       │   │   └── http-exception.filter.ts # Thống nhất định dạng lỗi JSON
│       │   └── middleware/
│       │       └── request-logger.middleware.ts
│       ├── events/
│       │   ├── events.module.ts
│       │   ├── events.controller.ts
│       │   ├── events.service.ts
│       │   └── dto/
│       │       ├── create-event.dto.ts
│       │       └── update-event.dto.ts
│       └── bookings/
│           ├── bookings.module.ts
│           ├── bookings.controller.ts
│           ├── bookings.service.ts
│           └── dto/
│               └── create-booking.dto.ts
│
├── tests/
│   ├── contract/
│   │   ├── api-contract-suite.ts     # Bộ test kịch bản API dùng chung
│   │   ├── native-server.test.ts     # Chạy suite trên http://localhost:3000
│   │   └── nestjs-server.test.ts     # Chạy suite trên http://localhost:3001
│   └── unit/
│       ├── native-router.test.ts
│       └── body-parser.test.ts
└── scripts/
    └── trace-network.sh              # Script chạy curl -v demo
```

---

## 6. DATA MODEL & IN-MEMORY STORE

### File: `src/shared/types.ts`
```typescript
export interface Event {
  id: string;
  code: string;
  title: string;
  description?: string;
  totalSeats: number;
  startsAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  eventId: string;
  customerName: string;
  customerEmail: string;
  seatCount: number;
  status: 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
}

export interface CreateEventDto {
  code: string;
  title: string;
  description?: string;
  totalSeats: number;
  startsAt: string;
}

export interface UpdateEventDto {
  code: string;
  title: string;
  description?: string;
  totalSeats: number;
  startsAt: string;
}

export interface PatchEventDto {
  code?: string;
  title?: string;
  description?: string;
  totalSeats?: number;
  startsAt?: string;
}

export interface CreateBookingDto {
  eventId: string;
  customerName: string;
  customerEmail: string;
  seatCount?: number;
}
```

### File: `src/shared/storage/in-memory-store.ts`
Triển khai một class Singleton hoặc export các instance `Map`:
* `events: Map<string, Event> = new Map()`
* `bookings: Map<string, Booking> = new Map()`
* Cung cấp các helper methods:
  * `findEventByCode(code: string): Event | undefined`
  * `reset(): void` (phục vụ reset dữ liệu sạch sẽ trước mỗi lần chạy test).

---

## 7. API SPECIFICATIONS & PAYLOAD SCHEMAS

### Format Phản Hồi Thành Công:
* `POST /events` $\rightarrow$ `201 Created`
  * Header: `Location: /events/:id`
  * Body: Object `Event` vừa tạo.
* `GET /events` $\rightarrow$ `200 OK`
  * Body: Mảng `Event[]`.
* `DELETE /events/:id` $\rightarrow$ `204 No Content`
  * Body: Rỗng (empty body).

### Format Phản Hồi Lỗi Chuẩn:
```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Event with code 'TECH-2026' already exists",
  "timestamp": "2026-11-17T08:00:00.000Z",
  "path": "/events"
}
```

---

## 8. CÁC LUỒNG XỬ LÝ QUAN TRỌNG

### 8.1. Native Stream Body Parsing (`src/native/http/body-parser.ts`)
```typescript
import { IncomingMessage } from 'node:http';

export function parseJsonBody<T>(req: IncomingMessage, maxBytes = 1024 * 1024): Promise<T> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let receivedBytes = 0;

    req.on('data', (chunk: Buffer) => {
      receivedBytes += chunk.length;
      if (receivedBytes > maxBytes) {
        req.destroy();
        return reject(new PayloadTooLargeError('Payload exceeds 1MB limit'));
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      if (chunks.length === 0) {
        return resolve({} as T);
      }
      const raw = Buffer.concat(chunks).toString('utf-8');
      try {
        const parsed = JSON.parse(raw);
        resolve(parsed);
      } catch (err) {
        reject(new MalformedJsonError('Malformed JSON payload'));
      }
    });

    req.on('error', (err) => reject(err));
  });
}
```

### 8.2. Native Router Matching (`src/native/http/router.ts`)
* Đăng ký route: `router.add(method, pathPattern, handler)`.
* Chuyển đổi path pattern như `/events/:id` thành RegExp:
  `const regex = new RegExp('^' + pattern.replace(/:([a-zA-Z0-9_]+)/g, '(?<$1>[^/]+)') + '$');`
* Khi có request đến, lặp qua danh sách routes:
  1. Kiểm tra khớp URL path.
  2. Nếu URL path khớp nhưng HTTP Method không khớp: ghi nhận cờ `methodMismatch = true`.
  3. Nếu cả Method và Path đều khớp: trích xuất `groups` từ RegExp làm `req.params`, thực thi handler.
  4. Nếu kết thúc vòng lặp mà `methodMismatch === true`: ném lỗi `MethodNotAllowedError` (405).
  5. Nếu không khớp bất kỳ route nào: ném lỗi `NotFoundError` (404).

---

## 9. ERROR HANDLING & STATUS CODE TRANSLATION

Xây dựng cây lỗi chuẩn trong `src/shared/errors/`:
* `AppError`: Base class có thuộc tính `statusCode` (mặc định 500) và `errorName`.
* `MalformedJsonError`: `statusCode = 400`, `error = "Bad Request"`.
* `NotFoundError`: `statusCode = 404`, `error = "Not Found"`.
* `MethodNotAllowedError`: `statusCode = 405`, `error = "Method Not Allowed"`.
* `ConflictError`: `statusCode = 409`, `error = "Conflict"`.
* `ValidationError`: `statusCode = 422`, `error = "Unprocessable Entity"`.
* `PayloadTooLargeError`: `statusCode = 413`, `error = "Payload Too Large"`.

Tầng xử lý lỗi ngoài cùng:
* Ở Native: Bọc toàn bộ handler trong `try/catch`. Trong block `catch`, gọi `sendError(res, error, req.url)`.
* Ở NestJS: Triển khai `@Catch()` trong `HttpExceptionFilter`, map tất cả `HttpException` và `AppError` thành cùng một định dạng JSON.

---

## 10. LOGGING & OBSERVABILITY
* Xây dựng logging đơn giản ghi nhận từng request:
  `[TIMESTAMP] [ENGINE] METHOD PATH -> STATUS_CODE (DURATION_MS)`
  *Ví dụ:* `[2026-11-17T08:00:00Z] [NATIVE] POST /events -> 201 Created (2.4ms)`
* Native: Đo thời gian bằng `process.hrtime.bigint()` từ lúc bắt đầu request đến khi `res.on('finish')`.
* NestJS: Triển khai qua `NestMiddleware`.

---

## 11. TESTING REQUIREMENTS
Triển khai bộ kiểm thử tự động toàn diện:
1. **Contract Tests (`tests/contract/api-contract-suite.ts`):**
   Một hàm nhận vào `baseUrl: string` và thực hiện chuỗi kiểm thử HTTP:
   - `GET /health` trả về 200 và engine tương ứng.
   - `POST /events` tạo sự kiện thành công (201, có `Location` header).
   - `POST /events` với mã `code` trùng lặp trả về đúng `409 Conflict`.
   - `POST /events` với JSON sai cú pháp trả về `400 Bad Request`.
   - `POST /events` thiếu trường bắt buộc trả về `422 Unprocessable Entity`.
   - `GET /events/:id` không tồn tại trả về `404 Not Found`.
   - `PUT /events/:id` thay thế thành công (200).
   - `DELETE /events/:id` xóa thành công (204).
   - `POST /bookings` với `eventId` không tồn tại trả về `404` hoặc `422`.
   - `POST /bookings` thành công trả về 201.
   - Gửi method lạ (ví dụ `POST /health`) trả về `405 Method Not Allowed`.
2. **Thực thi Test:**
   - File `tests/contract/native-server.test.ts`: Khởi động Native Server trên ephemeral port, chạy test suite, đóng server.
   - File `tests/contract/nestjs-server.test.ts`: Khởi động NestJS Server trên ephemeral port, chạy test suite, đóng server.

---

## 12. ACCEPTANCE CRITERIA DÀNH CHO AI AGENT
Dự án được nghiệm thu khi đáp ứng đầy đủ các tiêu chí:
* [ ] Biên dịch TypeScript thành công (`pnpm build`) không có bất kỳ cảnh báo hoặc lỗi type nào (`noImplicitAny`, `strict: true`).
* [ ] Khởi chạy Native Server thành công qua lệnh `pnpm start:native` (lắng nghe trên cổng 3000).
* [ ] Khởi chạy NestJS Server thành công qua lệnh `pnpm start:nestjs` (lắng nghe trên cổng 3001).
* [ ] Chạy lệnh `pnpm test` vượt qua 100% test cases cho cả Native và NestJS.
* [ ] Hành vi và định dạng phản hồi (kể cả lỗi) của cả hai engine hoàn toàn tương thích và đồng nhất.
* [ ] Có script hoặc hướng dẫn `curl -v` chi tiết trong `scripts/trace-network.sh`.

---

## 13. HƯỚNG DẪN CHẠY VÀ XÁC MINH LOCAL

### Cấu hình `package.json` scripts:
```json
{
  "scripts": {
    "build": "tsc",
    "start:native": "tsx src/native/main.ts",
    "start:nestjs": "tsx src/nestjs/main.ts",
    "test": "node --test dist/tests/**/*.test.js",
    "test:native": "node --test dist/tests/contract/native-server.test.js",
    "test:nestjs": "node --test dist/tests/contract/nestjs-server.test.js"
  }
}
```

### Xác minh bằng curl:
```bash
# 1. Kiểm tra health
curl -i http://localhost:3000/health

# 2. Tạo event thành công (201)
curl -i -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{"code":"JS-2026","title":"JS Conference","totalSeats":100,"startsAt":"2026-12-01T09:00:00Z"}'

# 3. Tạo trùng code (409)
curl -i -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{"code":"JS-2026","title":"JS Conference 2","totalSeats":50,"startsAt":"2026-12-01T09:00:00Z"}'

# 4. Gửi JSON hỏng (400)
curl -i -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{"code": "broken json...'
```
