# Kế hoạch tích hợp Memory Card vào kiến trúc Game Module của EduHub

## 1. Phân tích kiến trúc tích hợp game hiện tại (tham chiếu Gold Miner)

## 1.1 Cơ chế module game
- Registry module nằm ở backend qua bảng `game_modules` + `game_module_trigger_mappings` + `game_runtime_events`.
- `game_seed_service.ensure_default_game_modules()` hiện seed `gold-miner` và trigger mapping mặc định.
- Giáo viên không thao tác trực tiếp với source game; giáo viên tạo `content_package` (type `game`) + `game_package_configs` + `question_banks`.
- Question bank dùng chung với exam (`question_bank_items`, `package_attempts`, `package_question_attempts`), không có bảng riêng cho từng game.

## 1.2 Cơ chế load runtime (iframe/sandbox)
- `GamePlayerShell` nạp manifest qua `manifest_url`, resolve `entry`, rồi render game bằng `<iframe>`.
- Sandbox policy được sanitize, loại `allow-same-origin` để cô lập runtime game.
- Runtime game được xem như artifact web độc lập trong `frontend/public/game-modules/<slug>/` (hoặc CDN tương lai).
- `manifest.json` là contract runtime tối thiểu (`entry`, `runtime`, `bridge`, metadata hiển thị).

## 1.3 Communication giữa game và host
- Kênh message: `eduhub:game-bridge`.
- Game -> host: `game:ready`, `game:state`, `game:progress`, `game:question-trigger`, `game:complete`, `game:error`.
- Host -> game: `host:init`, `host:pause`, `host:resume`, `host:restart`.
- Luồng chuẩn:
  1. Student mở `/play` rồi `/start` để lấy/khởi tạo attempt.
  2. Host gửi `host:init` (kèm `runtimeConfig`, `attemptTotals`).
  3. Game gửi trigger -> host gọi `/runtime/trigger`.
  4. Nếu cần hỏi, host mở modal blocking, submit `/runtime/answers`, sau đó mới `host:resume`.
  5. Kết thúc game -> host gọi `/complete`.

## 1.4 Kết nối question bank + backend runtime
- Trigger được backend xử lý theo 2 nhánh:
  - **Đặc thù Gold Miner**: scheduler theo `question_plan` (progressive theo level, checkpoint slot, forced-tail).
  - **Generic cho game khác**: map trigger với `game_module_trigger_mappings` -> chọn câu theo `difficulty_band`.
- Chấm điểm câu hỏi dùng chung grading service, cộng với điểm gameplay (`score_context`) để ra `score_total`.
- Leaderboard lưu ở `game_leaderboard_entries` theo scope (`global`, `class`).

## 1.5 Cơ chế publish thư viện game chung
- Publish dùng `content_package_publications` (channel `game_hub`) + `content_package_access_rules`.
- Mặc định publish tạo allow rule `permission=play`, `audience_type=all_students`.
- Student có thể chơi qua:
  - class assignment;
  - game hub (không phụ thuộc class) nếu package đã publish và rule cho phép.

---

## 2. Phân tích code game Memory Card trong `references/Memory-Card`

## 2.1 Hiện trạng kỹ thuật
- Game thuần HTML/CSS/JS, render tile bằng DOM, logic chơi trong `script.js`.
- Có timer, move counter, match logic, popup luật chơi, game over/reload trang.
- Chưa có:
  - manifest runtime;
  - bridge postMessage theo contract EduHub;
  - pause/resume bằng host command;
  - trigger câu hỏi + attempt sync;
  - runtime_state chuẩn để resume.

## 2.2 Khoảng cách so với contract EduHub
- Logic đang tự `location.reload()` khi win/lose -> không tương thích luồng `/complete` của host.
- Không emit `game:question-trigger` nên chưa vào được question bank flow.
- Không nhận `host:init` để áp runtime config từ backend.
- Chưa có idempotency cho trigger (`item_instance_id`/event_id), dễ bị hỏi trùng khi retry.

## 2.3 Kết luận
- Memory Card phù hợp để tích hợp theo hướng **generic runtime** (không cần service đặc thù như Gold Miner) nếu thiết kế trigger phù hợp.
- Cần thêm một lớp adapter bridge mỏng, không phụ thuộc framework game.

---

## 3. Đề xuất tích hợp Memory Card theo đúng kiến trúc mở rộng

## 3.1 Nguyên tắc stack-agnostic
- Mỗi game chỉ cần đáp ứng **Runtime Contract** (manifest + bridge events + host commands).
- Không ràng buộc game phải React/Phaser/Unity; chỉ cần chạy được trong iframe và nói chuyện qua postMessage.
- Tránh viết logic nghiệp vụ giáo viên/học sinh vào game runtime.

## 3.2 Trigger strategy đề xuất cho Memory Card (generic)
- Trigger loại: `pair_revealed` hoặc `pair_matched`.
- `trigger_key`: `stage` hoặc `difficulty_band`.
- `trigger_value`: `recognition|comprehension|application_basic|application_advanced` (hoặc `stage_1..stage_4`).
- Game gửi thêm `event_payload`:
  - `item_instance_id` (duy nhất mỗi sự kiện để tránh duplicate trigger),
  - `move_index`, `matched_pairs`, `total_pairs`, `time_remaining`, `level`.

## 3.3 Mapping với question bank
- Seed `game_module_trigger_mappings` cho module `memory-card`:
  - mỗi `trigger_value` map 1 `difficulty_band`.
- Backend generic flow sẽ tự chọn câu hỏi đúng band, không cần thêm bảng mới.

## 3.4 Runtime config đề xuất
- `runtime_config.session`: `time_limit_seconds`, `max_levels` (nếu có stage), `max_moves`.
- `runtime_config.question_distribution`: mode chọn câu (`random_no_repeat`/`ordered_no_repeat`).
- `runtime_config.memory_card` (module-specific): `board_size`, `pair_count`, `theme`, `flip_back_delay_ms`.

---

## 4. Phase implement chi tiết

## Phase 0 - Rà soát DB hiện tại và chốt phạm vi
**Mục tiêu**: xác nhận hệ schema hiện tại đã đủ cho Memory Card.

**Công việc**
1. Audit schema `content_packages`, `game_package_configs`, `question_banks`, `package_attempts`, `package_question_attempts`, `content_package_publications`, `content_package_access_rules`, `game_leaderboard_entries`.
2. Xác nhận không cần bảng riêng cho Memory Card.
3. Chốt rule publish chung: mọi teacher có thể tạo package, publish lên `game_hub`; mọi student truy cập theo access rule `all_students`.
4. Đánh giá chỉ số/index còn thiếu cho volume lớn (nếu cần thêm migration tối ưu truy vấn hub/leaderboard/events).

**Kết quả mong đợi**
- Tài liệu decision: **reuse hoàn toàn question bank unified**, chỉ mở rộng config/module seed.

---

## Phase 1 - Chuẩn hóa lớp game module registry (backend)
**Mục tiêu**: đưa Memory Card vào module registry chuẩn.

**Công việc**
1. Mở rộng `game_seed_service` để seed thêm `memory-card` (không hardcode duy nhất Gold Miner).
2. Tách seed config theo danh sách module (declarative) để dễ thêm game mới.
3. Cấu hình `capability_config` cho Memory Card:
   - `runtime.kind=iframe`, `sandbox`, `allow`, `aspect_ratio`,
   - bridge capabilities,
   - supported question types.
4. Seed `game_module_trigger_mappings` cho Memory Card theo trigger strategy đã chốt.

**Kết quả mong đợi**
- Teacher thấy Memory Card trong `GET /game-modules`.
- Tạo package mới với module Memory Card hoạt động không cần sửa UI core.

---

## Phase 2 - Tích hợp runtime artifact Memory Card (frontend/public)
**Mục tiêu**: biến game tham chiếu thành runtime bundle chuẩn EduHub.

**Công việc**
1. Tạo thư mục runtime: `frontend/public/game-modules/memory-card/`.
2. Tạo `manifest.json` theo contract.
3. Bổ sung bridge adapter:
   - emit `game:ready/state/progress/question-trigger/complete/error`,
   - handle `host:init/pause/resume/restart`.
4. Refactor game logic Memory Card:
   - bỏ `location.reload()` trực tiếp, chuyển sang state reset + complete event;
   - pause input/timer tuyệt đối khi host pause hoặc modal mở;
   - gửi trigger tại các checkpoint gameplay (match/stage/move milestones);
   - gửi runtime snapshot định kỳ để host log event.
5. Giữ game độc lập stack: chỉ phụ thuộc browser APIs + bridge contract.

**Kết quả mong đợi**
- Runtime Memory Card chạy trong iframe sandbox, host điều khiển lifecycle đầy đủ.

---

## Phase 3 - Backend runtime flow cho Memory Card
**Mục tiêu**: hỗ trợ trigger/answer/attempt/complete qua luồng generic.

**Công việc**
1. Xác nhận `handle_trigger` generic path xử lý đúng mapping Memory Card.
2. Bổ sung guard/idempotency cho trigger dựa trên `item_instance_id`.
3. Chuẩn hóa payload `attempt_totals` trả về để runtime dễ đồng bộ state.
4. Rà soát `serialize_game_package` và `question_plan_preview`:
   - tránh áp logic Gold Miner cho module không phải Gold Miner;
   - tách preview theo module strategy (Gold Miner specific vs generic summary).
5. Đảm bảo `/complete` và leaderboard hoạt động cho Memory Card tương tự Gold Miner.

**Kết quả mong đợi**
- Memory Card dùng được full flow runtime API mà không cần service đặc thù.

---

## Phase 4 - Frontend cho giáo viên (tạo, quản lý, publish)
**Mục tiêu**: teacher UX thống nhất, publish lên thư viện game chung.

**Công việc**
1. Kiểm tra `TeacherGames`, `GamePackageCreate`, `GamePackageDetail` hiển thị module Memory Card đúng.
2. Thêm module-specific guidance (nếu cần) trong trang detail để giáo viên hiểu trigger/question strategy.
3. Giữ luồng publish hiện tại:
   - bật/tắt publish `game_hub`,
   - rule mặc định all students.
4. Cải thiện hiển thị quản trị:
   - trạng thái publish, visibility, thời gian mở/đóng,
   - thống kê câu hỏi theo difficulty band.

**Kết quả mong đợi**
- Bất kỳ teacher nào cũng tạo được package Memory Card và publish lên Game Hub chung.

---

## Phase 5 - Frontend cho học sinh (truy cập hub và chơi game)
**Mục tiêu**: gameplay mượt, question modal blocking đúng contract.

**Công việc**
1. Dùng lại `StudentGames` + `GamePlayerShell` hiện có.
2. Đảm bảo Memory Card runtime gửi message đúng để shell:
   - pause khi hỏi,
   - resume sau submit answer,
   - complete attempt đúng 1 lần.
3. Đồng bộ runtime facts/tiến trình/leaderboard.
4. Kiểm tra recovery path (frame recovery, handshake timeout, resume watchdog).

**Kết quả mong đợi**
- Student vào `/student/games`, chọn Memory Card, chơi trơn tru, điểm và tiến trình lưu đúng.

---

## Phase 6 - Phân quyền và hiển thị theo yêu cầu thư viện chung
**Mục tiêu**: đảm bảo mô hình “teacher publish chung, mọi student truy cập”.

**Công việc**
1. Duy trì kiểm soát tạo/chỉnh sửa package ở role teacher.
2. Khi publish hub: tạo/duy trì allow rule `all_students`.
3. Student list chỉ hiển thị package còn hiệu lực publication + access window.
4. Rà soát edge case:
   - unpublish giữa chừng,
   - access window hết hạn,
   - deny rule ưu tiên hơn allow.

**Kết quả mong đợi**
- Thư viện game chung hoạt động nhất quán, không phụ thuộc class.

---

## Phase 7 - Automated test end-to-end cho domain game
**Mục tiêu**: tự động kiểm thử toàn flow game và chống regression.

**Phạm vi test bắt buộc**
1. **Create package**: teacher tạo package Memory Card.
2. **Publish**: publish/unpublish lên Game Hub + kiểm tra access rules.
3. **Play flow**: student `/play` -> `/start` -> runtime triggers -> question modal -> submit answers.
4. **Attempt**: lưu runtime events, runtime_state, scores, completion status.
5. **Leaderboard**: cập nhật rank/global scope sau complete.
6. **Regression**: đảm bảo flow Gold Miner không bị ảnh hưởng.

**Cách triển khai test tự động**
- Mở rộng `backend/tests/test_game_api.py` với test case riêng cho Memory Card:
  - `test_memory_card_runtime_flow`
  - `test_memory_card_game_hub_publish_and_access`
  - `test_memory_card_leaderboard_update`
  - `test_gold_miner_regression_after_memory_card_integration`
- Chạy backend automated tests trong CI bằng `python -m unittest tests.test_game_api`.
- Chạy frontend build check (`npm run build`) để bảo đảm không phá vỡ app shell.

**Tiêu chí pass**
- Tất cả test game pass.
- Không có regression ở luồng hiện có (đặc biệt Gold Miner + Game Hub APIs).

---

## Phase 8 - Rollout và vận hành
**Mục tiêu**: đưa module mới vào production an toàn.

**Công việc**
1. Migrate DB (nếu có thay đổi index/schema).
2. Deploy backend + runtime artifact Memory Card.
3. Seed module production.
4. Smoke test nhanh theo checklist create/publish/play/attempt/leaderboard.
5. Theo dõi telemetry `game_runtime_events` để phát hiện lỗi runtime sớm.

---

## 5. Kết luận thiết kế
- Memory Card có thể tích hợp **không phụ thuộc tech stack** nếu tuân thủ contract iframe + bridge.
- Hệ thống DB/question bank/backend hiện tại đã đủ mạnh để tái sử dụng.
- Trọng tâm triển khai là: **module registry chuẩn + runtime adapter + test automation đầy đủ**.
