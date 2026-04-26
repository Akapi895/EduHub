# Game Runtime Contract

Tài liệu này chốt contract triển khai phase game question runtime sau khi hệ thống đã migrate sang `content_packages + question_banks + package_attempts`.

## 1. Mục tiêu

- dùng chung unified schema hiện tại;
- không tạo schema riêng cho Gold Miner;
- cho phép frontend game và backend triển khai song song mà không lệch contract;
- giữ Gold Miner như một `game_module`, còn nội dung giáo viên tạo ra là `content_package` type `game`.

## 2. Định danh chính

- `game_module`: runtime module, ví dụ `gold-miner`
- `content_package`: gói nội dung game do giáo viên tạo
- `package_attempt`: phiên chơi của học sinh cho một game package
- `package_question_attempt`: một câu hỏi được bật lên trong runtime game

## 3. Route frontend

- trang danh sách game của học sinh hiển thị `game packages` được gán cho học sinh, không hiển thị raw module catalog
- route player chuyển sang dùng `packageId`
- route đề xuất:
  - `/student/games`
  - `/student/games/:packageId`
- giáo viên quản lý game từ lớp học:
  - `/teacher/classes/:classId/games/create`
  - `/teacher/games/:packageId`

## 4. API contract

### 4.1. Teacher APIs

- `GET /api/v1/game-modules`
  - trả về registry module khả dụng
- `GET /api/v1/classes/{class_id}/game-packages`
  - trả về danh sách game package của lớp
- `POST /api/v1/classes/{class_id}/game-packages`
  - tạo package mới
  - body:
    - `title`
    - `description?`
    - `game_module_id`
    - `thumbnail_url?`
    - `runtime_config?`
- `GET /api/v1/game-packages/{package_id}`
  - metadata package + module gắn kèm + thống kê câu hỏi
- `PUT /api/v1/game-packages/{package_id}`
- `DELETE /api/v1/game-packages/{package_id}`
- `GET /api/v1/game-packages/{package_id}/questions`
  - trả về question bank items cho package
- `POST /api/v1/game-packages/{package_id}/questions`
  - tạo câu hỏi với `difficulty_band`
- `PUT /api/v1/game-questions/{question_id}`
- `DELETE /api/v1/game-questions/{question_id}`

### 4.2. Student APIs

- `GET /api/v1/game-packages/my-all`
  - trả về các package học sinh được chơi
- `GET /api/v1/game-packages/{package_id}/play`
  - trả về dữ liệu để mở player:
    - package metadata
    - module manifest/entry
    - runtime config
    - quyền truy cập
    - trạng thái attempt đang mở nếu có
- `POST /api/v1/game-packages/{package_id}/start`
  - tạo hoặc trả về `in_progress attempt`
  - response:
    - `attempt_id`
    - `package_id`
    - `module`
    - `manifest_url`
    - `entry`
    - `runtime_config`
    - `status`

### 4.3. Runtime APIs

- `POST /api/v1/game-packages/{package_id}/runtime/trigger`
  - dùng khi game phát sinh trigger hỏi
  - body:
    - `attempt_id`
    - `trigger_type`
    - `trigger_key`
    - `trigger_value`
    - `event_payload`
  - response 1:
    - `action: "ask_question"`
    - `question_attempt`
    - `question`
    - `attempt_totals`
  - response 2:
    - `action: "resume"`
    - `reason`
    - `attempt_totals`

- `POST /api/v1/game-packages/{package_id}/runtime/answers`
  - nộp câu trả lời cho modal đang mở
  - body:
    - `attempt_id`
    - `question_attempt_id`
    - `text_answer?`
    - `selected_option_ids?`
    - `uploaded_image_url?`
  - response:
    - `question_attempt_id`
    - `status`
    - `is_correct`
    - `score_awarded`
    - `feedback_message?`
    - `attempt_totals`
    - `resume_payload`

- `POST /api/v1/game-packages/{package_id}/runtime/events`
  - log các event phụ như `pause`, `resume`, `complete`
  - body:
    - `attempt_id`
    - `event_type`
    - `event_payload`

- `POST /api/v1/game-packages/{package_id}/complete`
  - kết thúc phiên chơi
  - body:
    - `attempt_id`
    - `summary_payload`
    - `runtime_state?`

- `GET /api/v1/game-attempts/{attempt_id}`
  - xem chi tiết session game + question attempts

## 5. Runtime bridge contract

### 5.1. Game -> host

- `game:ready`
  - payload:
    - `status`
    - `title?`
    - `controls?`
- `game:state`
  - payload:
    - `status`
    - `score?`
    - `level?`
    - `targetScore?`
    - `timeRemaining?`
    - `reason?`
- `game:progress`
  - payload tự do cho telemetry tần suất cao
- `game:question-trigger`
  - payload:
    - `triggerType`
    - `triggerKey`
    - `triggerValue`
    - `eventPayload`
- `game:complete`
  - payload:
    - `status`
    - `outcome`
    - `score`
    - `level`
    - `targetScore`
    - `timeRemaining`
- `game:error`

### 5.2. Host -> game

- `host:init`
  - payload:
    - `sessionId`
    - `attemptId?`
    - `packageId?`
- `host:pause`
  - pause cứng gameplay và timer
- `host:resume`
  - resume sau khi modal đóng
  - có thể kèm `questionResult`
- `host:restart`

## 6. Gold Miner trigger mapping

Mapping phải nằm ở backend trong `game_module_trigger_mappings`.

- `rock` -> `recognition`
- `small_gold` -> `comprehension`
- `big_gold` -> `application_basic`
- `diamond` -> `application_advanced`

Trigger contract gửi từ Gold Miner:

- `triggerType = "item_captured"`
- `triggerKey = "item_type"`
- `triggerValue in {"rock","small_gold","big_gold","diamond"}`

## 7. UX rules bắt buộc

- khi có `game:question-trigger`, host phải mở modal blocking
- lúc modal mở, host gửi `host:pause`
- game phải dừng timer và khóa input gameplay
- modal không có nút đóng tự do
- chỉ sau khi backend trả kết quả cho `runtime/answers` thì host mới gửi `host:resume`
- tại một thời điểm chỉ có một modal hoạt động
- nếu backend trả `action = "resume"` vì không còn câu phù hợp thì host đóng flow và resume ngay

## 8. Teacher authoring rules

- giáo viên không cấu hình trực tiếp `rock/small_gold/big_gold/diamond`
- giáo viên chỉ tạo câu hỏi theo `difficulty_band`
- UI game package nên nhóm theo 4 mức:
  - `recognition`
  - `comprehension`
  - `application_basic`
  - `application_advanced`
- editor câu hỏi tái sử dụng càng nhiều logic exam hiện tại càng tốt

## 9. Chia trách nhiệm triển khai

### Frontend agent

- route học sinh và giáo viên cho game package
- player shell + modal question blocking
- bridge integration với Gold Miner
- service/client types cho game APIs
- teacher UI tạo và quản lý game package

### Backend agent

- game package APIs
- runtime APIs
- question selection theo `difficulty_band`
- grading + attempt state update
- game module registry + trigger mapping cho Gold Miner

## 10. Nguyên tắc tương thích

- không đụng vào interactive book runtime
- không phá contract exam đang hoạt động
- game code phải đi theo module riêng, không trộn logic vào exam endpoints
