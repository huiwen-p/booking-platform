#!/usr/bin/env bash
# ==============================================================================
# Script: trace-network.sh
# Mục đích: Thực hiện network tracing với curl -v để quan sát chi tiết:
#           - Quá trình bắt tay HTTP/1.1
#           - Các header yêu cầu & phản hồi (Content-Type, Location, Content-Length)
#           - HTTP Status Codes (200, 201, 204, 400, 404, 405, 409, 422)
#           - Tính chất Idempotent (PUT, DELETE) vs Non-Idempotent (POST)
# ==============================================================================

PORT_NATIVE=3000
PORT_NESTJS=3001

echo "======================================================================"
echo " [TRACE 1] Health Check trên cả 2 Engine (200 OK)"
echo "======================================================================"
echo "--- Native Node.js (Port $PORT_NATIVE) ---"
curl -v -s http://localhost:$PORT_NATIVE/health
echo -e "\n"

echo "--- NestJS (Port $PORT_NESTJS) ---"
curl -v -s http://localhost:$PORT_NESTJS/health
echo -e "\n"

echo "======================================================================"
echo " [TRACE 2] Tạo Event thành công (201 Created + Location Header)"
echo "======================================================================"
EVENT_PAYLOAD='{"code":"CONF-2026","title":"Backend Architecture Summit","totalSeats":500,"startsAt":"2026-11-20T08:00:00Z"}'

curl -v -s -X POST http://localhost:$PORT_NATIVE/events \
  -H "Content-Type: application/json" \
  -d "$EVENT_PAYLOAD"
echo -e "\n"

echo "======================================================================"
echo " [TRACE 3] Tạo Event trùng mã code (409 Conflict)"
echo "======================================================================"
curl -v -s -X POST http://localhost:$PORT_NATIVE/events \
  -H "Content-Type: application/json" \
  -d "$EVENT_PAYLOAD"
echo -e "\n"

echo "======================================================================"
echo " [TRACE 4] Gửi JSON sai cú pháp (400 Bad Request)"
echo "======================================================================"
curl -v -s -X POST http://localhost:$PORT_NATIVE/events \
  -H "Content-Type: application/json" \
  -d '{"code": "BROKEN_JSON_WITHOUT_CLOSING'
echo -e "\n"

echo "======================================================================"
echo " [TRACE 5] Gửi thiếu trường bắt buộc (422 Unprocessable Entity)"
echo "======================================================================"
curl -v -s -X POST http://localhost:$PORT_NATIVE/events \
  -H "Content-Type: application/json" \
  -d '{"title": "Missing Code and Total Seats"}'
echo -e "\n"

echo "======================================================================"
echo " [TRACE 6] Gửi Method không hỗ trợ (405 Method Not Allowed)"
echo "======================================================================"
curl -v -s -X POST http://localhost:$PORT_NATIVE/health \
  -H "Content-Type: application/json" \
  -d '{}'
echo -e "\n"

echo "======================================================================"
echo " [TRACE 7] Idempotency: Gọi DELETE 2 lần liên tiếp (204 No Content)"
echo "======================================================================"
# Lấy ID của event đầu tiên
EVENT_ID=$(curl -s http://localhost:$PORT_NATIVE/events | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$EVENT_ID" ]; then
  echo "Xóa lần 1 (Resource tồn tại):"
  curl -v -s -X DELETE http://localhost:$PORT_NATIVE/events/$EVENT_ID
  echo -e "\n"

  echo "Xóa lần 2 (Resource đã bị xóa - Idempotent):"
  curl -v -s -X DELETE http://localhost:$PORT_NATIVE/events/$EVENT_ID
  echo -e "\n"
fi
