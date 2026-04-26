# Game runtime contract

Tài liệu này chốt contract đang dùng giữa backend, frontend host shell và game runtime sau khi hệ thống đã chuyển sang kiến trúc `content_packages + question_banks + package_attempts`.

## Mục tiêu

- dùng chung schema dữ liệu với exam;
- không tạo bảng riêng cho Gold Miner;
- cho phép thêm game mới mà không phải sửa router hoặc state chung của app;
- giữ shell/frontend và runtime game tách rời nhau bằng `iframe + postMessage`.

## Thực thể chính

- `game_module`: runtime module, ví dụ `gold-miner`
- `content_package`: gói nội dung game giáo viên tạo cho lớp
- `package_attempt`: một lượt chơi của học sinh
- `package_question_attempt`: một lần câu hỏi được bật lên trong lúc chơi

## Route frontend hiện tại

- Học sinh:
  - `/student/games`
  - `/student/games/:packageId`
- Giáo viên:
  - `/teacher/games`
  - `/teacher/classes/:classId/games/create`
  - `/teacher/games/:packageId`

## API backend hiện tại

### Teacher APIs

- `GET /api/v1/game-modules`
- `GET /api/v1/classes/{class_id}/game-packages`
- `POST /api/v1/classes/{class_id}/game-packages`
- `GET /api/v1/game-packages/{package_id}`
- `PUT /api/v1/game-packages/{package_id}`
- `DELETE /api/v1/game-packages/{package_id}`
- `GET /api/v1/game-packages/{package_id}/questions`
- `POST /api/v1/game-packages/{package_id}/questions`
- `PUT /api/v1/game-questions/{question_id}`
- `DELETE /api/v1/game-questions/{question_id}`

### Student APIs

- `GET /api/v1/game-packages/my-all`
- `GET /api/v1/game-packages/{package_id}/play`
- `POST /api/v1/game-packages/{package_id}/start`

### Runtime APIs

- `POST /api/v1/game-packages/{package_id}/runtime/trigger`
- `POST /api/v1/game-packages/{package_id}/runtime/answers`
- `POST /api/v1/game-packages/{package_id}/runtime/events`
- `POST /api/v1/game-packages/{package_id}/complete`
- `GET /api/v1/game-attempts/{attempt_id}`

## Contract giữa game và host

### Game -> host

- `game:ready`
- `game:state`
- `game:progress`
- `game:question-trigger`
- `game:complete`
- `game:error`

### Host -> game

- `host:init`
- `host:pause`
- `host:resume`
- `host:restart`

## Luồng runtime chuẩn

1. Học sinh mở `/student/games/:packageId`.
2. Frontend gọi `GET /play` để lấy package, module, manifest, runtime config và attempt hiện có.
3. Frontend gọi `POST /start` để tạo hoặc resume `package_attempt`.
4. `GamePlayerShell` nạp manifest, mở `iframe` sandbox và gửi `host:init`.
5. Game chạy độc lập, gửi `game:state` và `game:progress` về shell.
6. Khi phát sinh trigger, game gửi `game:question-trigger`.
7. Shell gọi `POST /runtime/trigger`.
8. Backend quyết định:
   - `action = "ask_question"` nếu cần hỏi.
   - `action = "resume"` nếu lượt bắt đó không cần hỏi.
9. Nếu có câu hỏi, shell mở modal blocking, gửi `host:pause`, nộp bài qua `POST /runtime/answers`.
10. Chỉ khi backend trả kết quả xong, shell mới gửi `host:resume`.
11. Khi game kết thúc, shell gọi `POST /complete`.

## Gold Miner: chính sách đang dùng

Gold Miner không còn gắn cứng `rock -> nhận biết`, `small_gold -> thông hiểu` như phiên bản ý tưởng ban đầu.

Thay vào đó:

- mọi lượt bắt vật đều có thể gửi trigger `item_captured`;
- backend tạo `question_plan` từ tổng số câu hỏi của package và `runtime_config.question_distribution`;
- plan được chia theo màn với các trường chính:
  - `distribution_mode`
  - `level_count`
  - `questions_per_level`
  - `capture_slots_by_level`
  - `item_count_per_level`
  - `time_limit_seconds`
  - `target_scores_by_level`

### Quy tắc hỏi của Gold Miner

- Không bắt buộc mọi vật phẩm phải có câu hỏi.
- Backend cố phân bổ đều câu hỏi trong màn bằng `capture_slots_by_level`.
- Nếu cuối màn còn thiếu câu hỏi, backend chuyển sang `forced_tail_question` để ép các lượt bắt còn lại phải bật câu hỏi.
- Khi kết thúc toàn bộ các màn, học sinh phải làm hết toàn bộ tập câu hỏi đã cấu hình trong package.

Điều này giúp tránh việc học sinh né câu hỏi bằng cách chọn loại vật phẩm cụ thể.

## Runtime config quan trọng cho Gold Miner

`runtime_config.question_distribution` hiện hỗ trợ:

- `mode`: `progressive` hoặc `random`
- `questions_per_level`
- `level_count`

Ngoài ra `runtime_config` còn có thể chứa:

- `time_limit_seconds`
- `target_score_base`
- `target_score_step`

## Quy tắc UX bắt buộc

- Modal câu hỏi là blocking.
- Khi modal mở, timer và input gameplay phải dừng hẳn.
- Không cho đóng modal tự do để bỏ qua câu hỏi.
- Mỗi thời điểm chỉ có một `active question attempt`.
- Nếu backend trả `resume`, shell phải đóng flow câu hỏi và cho game tiếp tục ngay.

## Vùng generic và vùng đặc thù

### Generic cho mọi game

- `game_modules`
- `content_packages`
- `question_banks`
- `package_attempts`
- `runtime/trigger`, `runtime/answers`, `runtime/events`, `complete`

### Đặc thù của Gold Miner

- cách tạo `question_plan`
- cách scheduler quyết định checkpoint và forced tail
- runtime state của màn chơi

Game mới chỉ nên có service riêng khi logic trigger của nó không biểu diễn được bằng `game_module_trigger_mappings`.
