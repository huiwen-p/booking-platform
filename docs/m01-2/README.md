# Bộ Tài liệu Thiết kế Project & Hướng dẫn Thực hành: Milestone M1.2
## Booking Platform v0 — Dual-Engine HTTP Service (Native Node.js vs NestJS)

Thư mục này chứa toàn bộ các tài liệu đặc tả, phân tích kiến thức, tài liệu bàn giao cho AI Coding Agent và cẩm nang nghiên cứu ngược của **Milestone 1.2** (Tháng 1 – Giai đoạn 2 của Lộ trình Backend 12 tháng).

Bộ tài liệu này được thiết lập theo quy chuẩn thiết kế project thực hành 2 tuần tại [rm-prompt-stage-project.md](file:///d:/Books/notes/pure-md/ps/rm/rm-prompt-stage-project.md), bám sát mục tiêu của [rm-12.md](file:///d:/Books/notes/pure-md/ps/rm/rm-12.md) và [M1-2.md](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/docs/M1-2.md).

---

## MỤC LỤC CÁC TÀI LIỆU TRONG BỘ THIẾT KẾ

| Thứ tự | Tên tài liệu | Nội dung chính |
| :---: | :--- | :--- |
| **00** | [M1-2.md](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/docs/M1-2.md) | **Kế hoạch học tập 2 tuần gốc** của Milestone 1.2 (HTTP & Service đầu tiên). |
| **01** | [01-ke-hoach-va-y-tuong-project.md](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/docs/01-ke-hoach-va-y-tuong-project.md) | **Phân tích kế hoạch 2 tuần & Đề xuất 3 ý tưởng project**; đánh giá và lựa chọn dự án tối ưu (*Booking Platform v0 Dual-Engine*). |
| **02** | [02-project-specification.md](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/docs/02-project-specification.md) | **Đặc tả kỹ thuật đầy đủ** của dự án Booking Platform v0 (Problem Definition, Functional, Technical, Architecture, Data Design, Implementation Scope). |
| **03** | [03-knowledge-mapping.md](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/docs/03-knowledge-mapping.md) | **Bản đồ liên kết kiến thức vào codebase**: Ánh xạ 16 kiến thức cốt lõi vào từng vị trí file code trong cả 2 engine (Native Node.js và NestJS), cơ chế áp dụng, điều cần quan sát và thử nghiệm kiểm chứng. |
| **04** | [04-ai-coding-agent-handoff.md](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/docs/04-ai-coding-agent-handoff.md) | **Tài liệu độc lập bàn giao cho AI Coding Agent**: Chứa đầy đủ 13 mục đặc tả chi tiết từ types, data structures đến test suite để AI Agent triển khai code hoàn chỉnh mà không cần đoán mò. |
| **05** | [05-reverse-learning-guide.md](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/docs/05-reverse-learning-guide.md) | **Cẩm nang nghiên cứu ngược từ codebase**: Hướng dẫn thứ tự đọc code, trace luồng bằng debugger, 4 kịch bản thực nghiệm phá hủy có chủ đích và phân loại kiến thức theo chiều sâu. |
| **06** | [06-acceptance-criteria.md](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/docs/06-acceptance-criteria.md) | **Tiêu chuẩn nghiệm thu kỹ thuật**: Bộ checklist kiểm tra biên dịch, test coverage, HTTP semantics, idempotency và protocol tracing trước khi bàn giao. |

---

## HƯỚNG DẪN BẮT ĐẦU DÀNH CHO BẠN

1. **Bước 1 — Bàn giao cho AI Coding Agent triển khai code:**  
   Copy nội dung file [04-ai-coding-agent-handoff.md](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/docs/04-ai-coding-agent-handoff.md) và giao cho AI Coding Agent để tiến hành triển khai mã nguồn dự án vào thư mục `booking-platform/src/`.
2. **Bước 2 — Nghiệm thu sau khi code xong:**  
   Mở terminal kiểm tra theo bộ tiêu chí tại [06-acceptance-criteria.md](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/docs/06-acceptance-criteria.md). Đảm bảo mọi bài test tích hợp (`pnpm test`) đều `PASS` trên cả cổng 3000 (Native) và 3001 (NestJS).
3. **Bước 3 — Bắt đầu nghiên cứu và thực nghiệm phá hủy:**  
   Mở [05-reverse-learning-guide.md](file:///d:/Books/notes/pure-md/ps/rm/booking-platform/docs/05-reverse-learning-guide.md), đặt breakpoint và chạy 4 kịch bản thực nghiệm (treo socket, JSON hỏng, retry idempotent, curl -v tracing) để thấu hiểu bản chất giao thức HTTP.
