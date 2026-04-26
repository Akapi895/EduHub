# Thiết kế chuẩn hóa question bank cho exam và game

Tài liệu này là bản mô tả canonical cho lớp dữ liệu dùng chung giữa exam và game sau khi hệ thống đã chuyển sang `content_packages`, `question_banks` và `package_attempts`.

## Mục tiêu

- chỉ có một `question bank` chuẩn cho toàn hệ thống;
- exam và game dùng chung cấu trúc câu hỏi, chấm điểm và lưu attempt;
- chỉ tách phần config delivery giữa exam và game;
- tránh để hai schema song song cho cùng một loại dữ liệu.

## Nguyên tắc kiến trúc

### 1. Một nguồn dữ liệu câu hỏi duy nhất

- Không giữ branch riêng kiểu `exam questions` và `game questions`.
- Câu hỏi luôn sống trong `question_banks` và `question_bank_items`.
- Bài làm luôn sống trong `package_attempts` và `package_question_attempts`.

### 2. Exam và game chỉ khác ở config phân phối

- Exam khác ở thứ tự hiển thị, thời lượng, số lần làm, review policy.
- Game khác ở module runtime, trigger, pause/resume, state và scoring theo gameplay.
- Bản thân câu hỏi và answer storage không được nhân đôi.

### 3. Không tạo schema riêng cho từng game

Gold Miner không có các bảng kiểu:

- `gold_miner_questions`
- `gold_miner_attempts`
- `gold_miner_answers`

Mọi game đều phải đi qua shared core trước, rồi mới thêm config hoặc service runtime đặc thù nếu thật sự cần.

## Các lớp dữ liệu chuẩn

```text
content_packages
├── content_package_assignments
├── exam_package_configs
├── game_package_configs
└── question_banks
    └── question_bank_items
        ├── question_item_options
        ├── question_item_matching_left_items
        ├── question_item_matching_right_items
        ├── question_item_text_configs
        │   ├── question_item_text_accepted_answers
        │   └── question_item_text_keywords
        └── question_item_assets

package_attempts
└── package_question_attempts
    ├── question_attempt_selected_options
    ├── question_attempt_matching_answers
    ├── question_attempt_text_answers
    └── question_attempt_uploaded_assets

game_modules
├── game_module_trigger_mappings
└── game_runtime_events
```

## Bảng lõi

### `content_packages`

Đây là bảng trung tâm cho cả exam và game.

Các trường chính:

- `package_type`: `exam` hoặc `game`
- `title`, `description`, `subject`, `grade`
- `thumbnail_url`
- `status`
- `created_by`
- `version`, `published_at`

### `content_package_assignments`

Gắn package vào lớp. Cả exam và game đều dùng cùng bảng này.

### `question_banks`

- Mỗi package có đúng một question bank.
- `package_id` là unique.

### `question_bank_items`

Đại diện cho từng câu hỏi.

Các trường chính:

- `type`
- `difficulty_band`
- `content`
- `instruction`
- `explanation`
- `points`
- `required`
- `order_index`
- `is_active`

### `package_attempts`

Đại diện cho một phiên làm bài hoặc lượt chơi.

Các trường chính:

- `status`
- `attempt_index`
- `score_total`, `score_question`, `score_context`
- `summary_payload`
- `runtime_state`

### `package_question_attempts`

Đại diện cho một câu đã được trình bày cho học sinh trong một attempt.

Các trường chính:

- `source_context`
- `source_payload`
- `display_order`
- `difficulty_band_snapshot`
- `presented_at`, `answered_at`, `graded_at`, `resolved_at`
- `pause_started_at`, `pause_ended_at`
- `status`
- `is_correct`
- `score_awarded`
- `feedback_message`

## Các bảng con theo loại câu hỏi

### Trắc nghiệm một đáp án hoặc nhiều đáp án

- `question_item_options`
- `question_attempt_selected_options`

### Nối cặp

- `question_item_matching_left_items`
- `question_item_matching_right_items`
- `question_attempt_matching_answers`

### Tự luận hoặc điền văn bản

- `question_item_text_configs`
- `question_item_text_accepted_answers`
- `question_item_text_keywords`
- `question_attempt_text_answers`

Các trường cấu hình đã hỗ trợ:

- `input_variant`: `short_text`, `paragraph`
- `grading_mode`: `exact_match`, `normalized_exact`, `keyword`, `hybrid`, `manual`
- `case_sensitive`
- `accent_sensitive`
- `trim_whitespace`
- `ignore_punctuation`
- `manual_grading_required`

### Upload ảnh hoặc file bổ sung

- `question_item_assets`
- `question_attempt_uploaded_assets`

## Bảng config riêng theo loại package

### `exam_package_configs`

Chứa rule delivery cho exam:

- `start_time`, `end_time`
- `duration_minutes`
- `shuffle_questions`
- `max_attempts`
- `allow_review`
- `show_answers_policy`

### `game_package_configs`

Chứa rule delivery cho game:

- `game_module_id`
- `selector_strategy`
- `runtime_config`
- `scoring_config`

## Bảng game runtime

### `game_modules`

Registry của các runtime module.

Các trường chính:

- `slug`
- `title`
- `description`
- `runtime_kind`
- `manifest_url`
- `status`
- `capability_config`

### `game_module_trigger_mappings`

Dùng cho các game có trigger generic theo `trigger_type`, `trigger_key`, `trigger_value`.

Gold Miner hiện vẫn giữ bảng này ở cấp schema chung, nhưng scheduler chính của Gold Miner được điều khiển bởi `question_plan` trong runtime service thay vì phụ thuộc hoàn toàn vào mapping item type.

### `game_runtime_events`

Lưu telemetry và event runtime như `pause`, `resume`, `question_triggered`, `complete`.

## Enum lõi đang dùng

- `ContentPackageType`: `exam`, `game`
- `ContentPackageStatus`: `draft`, `published`, `archived`
- `QuestionType`: `single_choice`, `multi_choice`, `matching`, `text`, `image_upload`
- `DifficultyBand`: `recognition`, `comprehension`, `application_basic`, `application_advanced`
- `PackageAttemptStatus`: `in_progress`, `submitted`, `graded`, `completed`, `abandoned`
- `QuestionAttemptStatus`: `presented`, `answered`, `pending_manual`, `graded`, `resolved`
- `QuestionSourceContext`: `exam_sequence`, `game_trigger`

## Cách exam dùng schema này

- `content_packages.package_type = exam`
- config ở `exam_package_configs`
- câu hỏi ở `question_banks`
- attempt ở `package_attempts`
- từng câu trả lời ở `package_question_attempts` và các bảng con

Exam không cần một bộ bảng riêng khác.

## Cách game dùng schema này

- `content_packages.package_type = game`
- config ở `game_package_configs`
- runtime module lấy từ `game_modules`
- câu hỏi vẫn ở `question_banks`
- lượt chơi ở `package_attempts`
- câu hỏi bật trong lúc chơi ở `package_question_attempts`

## Gold Miner: rule authoring

- Giáo viên chỉ tạo package game và nhập câu hỏi.
- Không cấu hình trực tiếp `rock`, `small_gold`, `big_gold`, `diamond` trên UI teacher.
- Có thể nhóm câu hỏi theo `difficulty_band`, nhưng backend phân bổ câu hỏi theo `question_plan` của từng màn.
- Mục tiêu cuối cùng là học sinh phải làm hết toàn bộ tập câu hỏi của package trong toàn session.

## Quy tắc mở rộng về sau

1. Nếu thêm loại câu hỏi mới, mở rộng shared question system trước.
2. Nếu thêm game mới, ưu tiên dùng `game_module_trigger_mappings`.
3. Chỉ viết service runtime đặc thù khi game có scheduler hoặc state machine không biểu diễn đủ bằng mapping generic.
4. Không đưa business rule của teacher hoặc exam vào bundle game.
