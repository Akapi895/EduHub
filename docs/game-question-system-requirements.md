# Thiết kế chuẩn hóa `question bank` cho game và exam

## 1. Mục tiêu của bản thiết kế mới

Tài liệu này chốt lại hướng kiến trúc dữ liệu theo quyết định mới:

- không tiếp tục giữ schema `exam` cũ như một nhánh riêng;
- `question bank` trở thành nguồn dữ liệu chuẩn duy nhất cho câu hỏi;
- cả `game` và `exam` về sau đều dùng chung một mô hình dữ liệu câu hỏi, đáp án, attempt và grading;
- không cần giữ dữ liệu cũ, nên có thể migrate database theo hướng phá vỡ hoàn toàn schema cũ nếu cần;
- ưu tiên một schema canonical, tránh trùng lặp bảng giữa `game` và `exam`.

Trọng tâm của tài liệu này là:

- thiết kế database hoàn chỉnh cho `question bank`;
- thiết kế các bảng chung để `game` và `exam` cùng dùng;
- xác định phần nào là shared core, phần nào là config riêng của `game` hoặc `exam`;
- chốt luôn cách Gold Miner sẽ dùng question bank mà không lộ UI vật phẩm cho giáo viên.

## 2. Quyết định kiến trúc

## 2.1. `Question bank` là nguồn chuẩn duy nhất

Sau lần migrate này:

- không còn mô hình `questions`, `question_options`, `matching_pairs`, `answers`, `answer_options`, `exam_submissions` như một nhánh dữ liệu riêng cho exam;
- mọi câu hỏi đều đi qua `question bank`;
- mọi lần học sinh trả lời đều đi qua một bộ `attempt` và `question_attempt` dùng chung.

Điều này có nghĩa:

- `exam` không sở hữu bảng câu hỏi riêng;
- `game` cũng không sở hữu bảng câu hỏi riêng;
- cả hai chỉ là hai dạng `delivery context` khác nhau của cùng một question system.

## 2.2. `Exam` và `game` chỉ khác ở delivery config

Điểm khác nhau giữa `exam` và `game` không nằm ở cấu trúc câu hỏi, mà nằm ở:

- cách phân phối câu hỏi;
- cách render câu hỏi;
- luật thời gian;
- luật chấm điểm tổng;
- runtime context.

Vì vậy:

- phần `authoring` và `answer storage` phải dùng chung;
- chỉ tách các bảng config riêng theo loại package.

## 2.3. Gold Miner là một game module, không phải một schema riêng

Gold Miner chỉ là:

- một `game_module`;
- có `runtime capability`;
- có mapping nội bộ từ vật phẩm sang độ khó;
- dùng chung `question bank` như mọi runtime khác.

Không tạo riêng các bảng như:

- `gold_miner_questions`
- `gold_miner_question_attempts`
- `gold_miner_item_rules`

Nếu cần rule riêng cho Gold Miner, chúng phải nằm trong vùng `game module config`, không phá vỡ schema chung.

## 3. Nguyên tắc thiết kế dữ liệu

## 3.1. Tách làm 4 lớp

Schema tổng thể được chia thành 4 lớp:

1. `content package layer`
   - định nghĩa một đơn vị nội dung mà người học sẽ mở ra, ví dụ `exam` hoặc `game package`.
2. `question bank layer`
   - lưu định nghĩa câu hỏi, đáp án chuẩn, rule chấm.
3. `attempt layer`
   - lưu phiên làm của người học và từng câu đã xuất hiện/trả lời.
4. `runtime-specific config layer`
   - config riêng cho exam hoặc game.

## 3.2. Không duplicate title/description vô ích

Những metadata dùng chung như:

- `title`
- `description`
- `subject`
- `grade`
- `status`

chỉ nên nằm ở `content_packages`, không lặp lại trong `exam` và `game`.

## 3.3. Không duplicate answer tables

Không tạo song song:

- `exam_answers`
- `game_answers`

Thay vào đó:

- chỉ có một bộ bảng `package_attempts` và `package_question_attempts`;
- các bảng con theo kiểu câu hỏi cũng dùng chung cho mọi package type.

## 3.4. Loại câu hỏi là shared domain

Các loại câu hỏi phải được chuẩn hóa một lần cho toàn hệ thống:

- `single_choice`
- `multi_choice`
- `matching`
- `text`
- `image_upload`

Nếu sau này thêm loại mới thì thêm vào shared question system, không thêm riêng vào game hay exam.

## 4. Mô hình dữ liệu tổng quát

```text
content_packages
  ├─ exam_package_configs
  ├─ game_package_configs
  ├─ question_banks
  │   └─ question_bank_items
  │       ├─ question_item_options
  │       ├─ question_item_matching_left_items
  │       ├─ question_item_matching_right_items
  │       ├─ question_item_text_configs
  │       │   ├─ question_item_text_accepted_answers
  │       │   └─ question_item_text_keywords
  │       └─ question_item_assets
  └─ content_package_assignments

package_attempts
  └─ package_question_attempts
      ├─ question_attempt_selected_options
      ├─ question_attempt_matching_answers
      ├─ question_attempt_text_answers
      └─ question_attempt_uploaded_assets

game_modules
  ├─ game_module_trigger_mappings
  └─ game_runtime_events
```

## 5. Shared enums đề xuất

Đây là bộ enum chuẩn hóa nên có ở backend.

### `ContentPackageType`

- `exam`
- `game`

### `ContentPackageStatus`

- `draft`
- `published`
- `archived`

### `QuestionType`

- `single_choice`
- `multi_choice`
- `matching`
- `text`
- `image_upload`

### `DifficultyBand`

- `recognition`
- `comprehension`
- `application_basic`
- `application_advanced`

### `TextInputVariant`

- `short_text`
- `paragraph`

### `TextGradingMode`

- `exact_match`
- `normalized_exact`
- `keyword`
- `hybrid`
- `manual`

### `PackageAttemptStatus`

- `in_progress`
- `submitted`
- `graded`
- `completed`
- `abandoned`

### `QuestionAttemptStatus`

- `presented`
- `answered`
- `pending_manual`
- `graded`
- `resolved`

### `QuestionSourceContext`

- `exam_sequence`
- `game_trigger`

## 6. Lớp `content package` dùng chung cho exam và game

## 6.1. Bảng `content_packages`

Đây là bảng trung tâm thay cho việc có `exams` và `game_content_packages` tách rời.

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | UUID/String | PK |
| `package_type` | Enum/String | `exam` hoặc `game` |
| `title` | Text | tên hiển thị |
| `description` | Text nullable | mô tả |
| `subject` | String nullable | môn học |
| `grade` | String nullable | khối lớp |
| `thumbnail_url` | Text nullable | thumbnail |
| `status` | Enum/String | `draft`, `published`, `archived` |
| `created_by` | String | FK users |
| `version` | Integer | tăng mỗi lần publish lớn |
| `published_at` | DateTime nullable | |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

Điểm quan trọng:

- metadata chung chỉ nằm ở đây;
- exam và game đều tham chiếu về đây;
- mọi assignment, attempt, analytics đều bắt đầu từ `content_packages`.

## 6.2. Bảng `content_package_assignments`

Gán package cho lớp hoặc nhóm học sinh.

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | UUID/String | PK |
| `package_id` | String | FK `content_packages.id` |
| `class_id` | String | FK classes |
| `assigned_by` | String | FK users |
| `start_at` | DateTime nullable | |
| `end_at` | DateTime nullable | |
| `is_active` | Boolean | |
| `created_at` | DateTime | |

Bảng này dùng chung cho cả exam và game.

## 6.3. Bảng `exam_package_configs`

Config riêng cho package type = `exam`.

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `package_id` | String | PK + FK `content_packages.id` |
| `start_time` | DateTime nullable | |
| `end_time` | DateTime nullable | |
| `duration_minutes` | Integer nullable | |
| `shuffle_questions` | Boolean | |
| `max_attempts` | Integer | |
| `allow_review` | Boolean | |
| `show_answers_policy` | String | |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

Lưu ý:

- đây là bảng config, không phải bảng câu hỏi.

## 6.4. Bảng `game_package_configs`

Config riêng cho package type = `game`.

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `package_id` | String | PK + FK `content_packages.id` |
| `game_module_id` | String | FK `game_modules.id` |
| `selector_strategy` | String | ví dụ `random_no_repeat` |
| `runtime_config` | JSON/Text nullable | các config runtime |
| `scoring_config` | JSON/Text nullable | reward/penalty tổng |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

Lưu ý:

- package type `game` dùng bảng này để biết đang gắn với module game nào;
- teacher không cần thấy config vật phẩm của Gold Miner ở đây.

## 7. Lớp `question bank` chuẩn hóa

## 7.1. Bảng `question_banks`

Mỗi `content_package` sở hữu đúng 1 question bank.

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | UUID/String | PK |
| `package_id` | String | Unique FK `content_packages.id` |
| `created_by` | String | FK users |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

Chủ đích thiết kế:

- không lặp `title`, `description` ở đây vì đã có trong `content_packages`;
- bank là container kỹ thuật của question system;
- một exam có 1 bank, một game package cũng có 1 bank.

Nếu sau này cần “thư viện câu hỏi reusable” độc lập, có thể mở rộng thêm `bank_scope`, nhưng phase đầu chưa cần.

## 7.2. Bảng `question_bank_items`

Đây là bảng định nghĩa câu hỏi chuẩn, dùng cho mọi runtime.

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | UUID/String | PK |
| `question_bank_id` | String | FK `question_banks.id` |
| `type` | Enum/String | `single_choice`, `multi_choice`, `matching`, `text`, `image_upload` |
| `difficulty_band` | Enum/String nullable | cần cho game; exam có thể null hoặc vẫn dùng |
| `content` | Text | nội dung câu hỏi |
| `instruction` | Text nullable | hướng dẫn thêm |
| `explanation` | Text nullable | feedback sau khi trả lời |
| `points` | Integer | mặc định 1 |
| `required` | Boolean | mặc định true |
| `order_index` | Integer | thứ tự trong editor/list |
| `is_active` | Boolean | soft disable |
| `created_by` | String | FK users |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

Index khuyến nghị:

- `(question_bank_id, order_index)`
- `(question_bank_id, difficulty_band, is_active)`
- `(question_bank_id, type, is_active)`

Lưu ý:

- `difficulty_band` ở item là đủ cho Gold Miner;
- không tạo riêng `game_question_banks` hay `exam_questions`.

## 7.3. Bảng `question_item_options`

Dùng cho `single_choice` và `multi_choice`.

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | UUID/String | PK |
| `question_item_id` | String | FK `question_bank_items.id` |
| `option_key` | String | key submit ổn định |
| `content` | Text | nội dung lựa chọn |
| `is_correct` | Boolean | |
| `order_index` | Integer | |

Validation:

- `single_choice`: đúng đúng 1 option correct;
- `multi_choice`: ít nhất 1 option correct;
- ít nhất 2 options cho cả hai loại.

## 7.4. Bảng `question_item_matching_right_items`

Danh sách đáp án phía phải cho câu `matching`.

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | UUID/String | PK |
| `question_item_id` | String | FK `question_bank_items.id` |
| `right_key` | String | key ổn định |
| `content` | Text | text hiển thị |
| `order_index` | Integer | |

## 7.5. Bảng `question_item_matching_left_items`

Mỗi item trái biết đáp án đúng qua `correct_right_key`.

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | UUID/String | PK |
| `question_item_id` | String | FK `question_bank_items.id` |
| `left_key` | String | key ổn định |
| `content` | Text | text hiển thị |
| `correct_right_key` | String | tham chiếu logic đến `right_key` |
| `order_index` | Integer | |

Lý do không dùng kiểu cũ `correct_match = text`:

- text có thể đổi;
- UI có thể shuffle;
- key ổn định giúp grading chắc hơn.

## 7.6. Bảng `question_item_text_configs`

Config riêng cho câu hỏi `text`.

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | UUID/String | PK |
| `question_item_id` | String | Unique FK `question_bank_items.id` |
| `input_variant` | Enum/String | `short_text`, `paragraph` |
| `grading_mode` | Enum/String | `exact_match`, `normalized_exact`, `keyword`, `hybrid`, `manual` |
| `min_length` | Integer nullable | |
| `max_length` | Integer nullable | |
| `case_sensitive` | Boolean | |
| `accent_sensitive` | Boolean | |
| `trim_whitespace` | Boolean | |
| `ignore_punctuation` | Boolean | |
| `manual_grading_required` | Boolean | |

Ghi chú:

- vẫn giữ `type = text` ở bảng item để không nổ số lượng enum;
- phần chi tiết nằm ở config table này.

## 7.7. Bảng `question_item_text_accepted_answers`

Danh sách đáp án chuẩn cho `text` auto-grade.

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | UUID/String | PK |
| `text_config_id` | String | FK `question_item_text_configs.id` |
| `answer_text` | Text | đáp án mẫu |
| `normalized_answer` | Text nullable | cache normalize |
| `score_ratio` | Float | 1.0 cho đúng hoàn toàn, có thể nhỏ hơn cho gần đúng |
| `order_index` | Integer | |

## 7.8. Bảng `question_item_text_keywords`

Từ khóa dùng cho `keyword` hoặc `hybrid`.

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | UUID/String | PK |
| `text_config_id` | String | FK `question_item_text_configs.id` |
| `keyword` | Text | từ/cụm từ |
| `weight` | Float | trọng số |
| `is_required` | Boolean | |
| `match_mode` | String | `contains`, `exact_word`, `regex` |

Khuyến nghị phase đầu:

- chỉ hỗ trợ `contains` và `exact_word`;
- để `regex` như tùy chọn mở rộng sau.

## 7.9. Bảng `question_item_assets`

Nếu cần media trong câu hỏi.

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | UUID/String | PK |
| `question_item_id` | String | FK `question_bank_items.id` |
| `asset_type` | String | `image`, `audio`, `video` |
| `url` | Text | |
| `order_index` | Integer | |

Với Gold Miner phase đầu, bảng này có thể tạo sẵn nhưng chưa cần dùng mạnh.

## 8. Validation chuẩn ở lớp question bank

## 8.1. `single_choice`

- ít nhất 2 options;
- đúng đúng 1 option correct.

## 8.2. `multi_choice`

- ít nhất 2 options;
- ít nhất 1 option correct.

## 8.3. `matching`

- ít nhất 2 `left_items`;
- ít nhất 2 `right_items`;
- mọi `correct_right_key` phải hợp lệ và nằm trong cùng câu hỏi;
- `left_key` và `right_key` phải unique trong phạm vi question.

## 8.4. `text`

- phải có đúng 1 `question_item_text_configs`;
- nếu `grading_mode != manual` thì phải có:
  - ít nhất 1 accepted answer, hoặc
  - ít nhất 1 keyword, hoặc cả hai;
- `short_text` nên có `max_length` nhỏ;
- `paragraph` cho phép dài hơn, nhưng vẫn nên có upper bound.

## 8.5. `image_upload`

Có thể giữ trong schema chung để exam dùng về sau, nhưng Gold Miner phase đầu không nên cho publish loại này.

## 9. Lớp `attempt` dùng chung cho exam và game

## 9.1. Bảng `package_attempts`

Đây là phiên làm tổng thể của một người học trên một `content_package`.

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | UUID/String | PK |
| `package_id` | String | FK `content_packages.id` |
| `user_id` | String | FK users |
| `class_id` | String nullable | FK classes |
| `attempt_index` | Integer | lần làm thứ mấy |
| `status` | Enum/String | `in_progress`, `submitted`, `graded`, `completed`, `abandoned` |
| `started_at` | DateTime | |
| `submitted_at` | DateTime nullable | |
| `completed_at` | DateTime nullable | |
| `score_total` | Float nullable | |
| `score_question` | Float nullable | điểm từ câu hỏi |
| `score_context` | Float nullable | điểm từ gameplay hoặc context khác |
| `summary_payload` | JSON/Text nullable | summary chung |
| `runtime_state` | JSON/Text nullable | checkpoint runtime, chủ yếu cho game |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

Lợi ích:

- exam và game cùng dùng một bảng attempt;
- không cần song song `exam_submissions` và `game_attempts`;
- có thể lưu `runtime_state` cho game mà exam bỏ trống.

## 9.2. Bảng `package_question_attempts`

Mỗi lần một câu được trình bày cho học sinh là một record.

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | UUID/String | PK |
| `package_attempt_id` | String | FK `package_attempts.id` |
| `question_item_id` | String | FK `question_bank_items.id` |
| `source_context` | Enum/String | `exam_sequence` hoặc `game_trigger` |
| `source_payload` | JSON/Text nullable | snapshot context |
| `display_order` | Integer nullable | dùng cho exam hoặc order hiển thị |
| `difficulty_band_snapshot` | Enum/String nullable | chụp lại lúc render |
| `presented_at` | DateTime | |
| `answered_at` | DateTime nullable | |
| `graded_at` | DateTime nullable | |
| `resolved_at` | DateTime nullable | |
| `pause_started_at` | DateTime nullable | dùng cho game blocking modal |
| `pause_ended_at` | DateTime nullable | |
| `status` | Enum/String | `presented`, `answered`, `pending_manual`, `graded`, `resolved` |
| `is_correct` | Boolean nullable | |
| `score_awarded` | Float nullable | |
| `graded_by` | String nullable | FK users |
| `feedback_message` | Text nullable | |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

Điểm quan trọng:

- game và exam cùng dùng bảng này;
- Gold Miner chỉ cần điền thêm `pause_started_at`, `pause_ended_at`, `source_payload`;
- exam có thể bỏ trống các cột runtime-specific.

## 9.3. Bảng `question_attempt_selected_options`

Cho `single_choice` và `multi_choice`.

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | UUID/String | PK |
| `question_attempt_id` | String | FK `package_question_attempts.id` |
| `option_id` | String | FK `question_item_options.id` |

## 9.4. Bảng `question_attempt_matching_answers`

Cho `matching`.

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | UUID/String | PK |
| `question_attempt_id` | String | FK `package_question_attempts.id` |
| `left_item_id` | String | FK `question_item_matching_left_items.id` |
| `selected_right_key` | String | |
| `is_correct` | Boolean nullable | |

## 9.5. Bảng `question_attempt_text_answers`

Cho `text`.

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | UUID/String | PK |
| `question_attempt_id` | String | FK `package_question_attempts.id` |
| `raw_answer` | Text | nội dung người học nhập |
| `normalized_answer` | Text nullable | phục vụ chấm |
| `grading_mode_snapshot` | String | snapshot mode khi submit |
| `score_awarded` | Float nullable | |

## 9.6. Bảng `question_attempt_uploaded_assets`

Cho `image_upload` hoặc tương lai.

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | UUID/String | PK |
| `question_attempt_id` | String | FK `package_question_attempts.id` |
| `asset_url` | Text | |
| `asset_type` | String | |
| `created_at` | DateTime | |

## 10. Lớp game-specific

## 10.1. Bảng `game_modules`

Registry các game runtime mà hệ thống hỗ trợ.

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | UUID/String | PK |
| `slug` | String unique | ví dụ `gold-miner` |
| `title` | Text | |
| `description` | Text nullable | |
| `runtime_kind` | String | `iframe`, `external_url`, ... |
| `manifest_url` | Text | nơi load artifact |
| `status` | String | `draft`, `active`, `archived` |
| `capability_config` | JSON/Text | các khả năng runtime |
| `created_at` | DateTime | |
| `updated_at` | DateTime | |

## 10.2. Bảng `game_module_trigger_mappings`

Mapping trigger runtime sang `difficulty_band`.

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | UUID/String | PK |
| `game_module_id` | String | FK `game_modules.id` |
| `trigger_type` | String | ví dụ `item_captured` |
| `trigger_key` | String | ví dụ `item_type` |
| `trigger_value` | String | ví dụ `rock` |
| `difficulty_band` | Enum/String | |
| `selector_strategy` | String | ví dụ `random_no_repeat` |
| `is_active` | Boolean | |
| `created_at` | DateTime | |

Với Gold Miner:

| trigger_type | trigger_key | trigger_value | difficulty_band |
| --- | --- | --- | --- |
| `item_captured` | `item_type` | `rock` | `recognition` |
| `item_captured` | `item_type` | `small_gold` | `comprehension` |
| `item_captured` | `item_type` | `big_gold` | `application_basic` |
| `item_captured` | `item_type` | `diamond` | `application_advanced` |

Điểm quan trọng:

- mapping này là config nội bộ của module;
- teacher không thao tác trực tiếp lên bảng này ở phase đầu.

## 10.3. Bảng `game_runtime_events`

Log event gameplay ở mức cần thiết.

| Cột | Kiểu | Ghi chú |
| --- | --- | --- |
| `id` | UUID/String | PK |
| `package_attempt_id` | String | FK `package_attempts.id` |
| `event_type` | String | |
| `event_payload` | JSON/Text | |
| `created_at` | DateTime | |

Exam không cần bảng này, vì runtime event là nhu cầu riêng của game.

## 11. Cách Gold Miner dùng schema mới

## 11.1. Phía giáo viên

Giáo viên tạo một `content_package` với:

- `package_type = game`
- có `game_package_configs.game_module_id = gold-miner`
- có `question_banks` gắn 1-1
- soạn các `question_bank_items`

Teacher UI chỉ cần:

- thông tin gói game;
- 4 tab câu hỏi:
  - Nhận biết
  - Thông hiểu
  - Vận dụng thấp
  - Vận dụng cao

Teacher không cần thấy:

- rock
- small_gold
- big_gold
- diamond

## 11.2. Phía runtime

Khi học sinh bắt được vật phẩm:

1. game gửi trigger event;
2. backend/host tra `game_module_trigger_mappings`;
3. resolve ra `difficulty_band`;
4. chọn 1 câu hỏi trong `question_bank_items` có difficulty tương ứng;
5. tạo `package_question_attempt`;
6. pause hẳn game;
7. render modal;
8. submit và chấm;
9. resume game.

## 11.3. Quy tắc blocking modal bắt buộc

Khi modal hiện:

- `pause_started_at` phải được ghi nhận;
- timer game dừng hẳn;
- input gameplay bị khóa;
- không cho đóng modal tự do;
- chỉ resume sau khi chấm xong hoặc có quyết định fallback rõ ràng.

Khi modal đóng:

- `pause_ended_at` được ghi nhận;
- runtime mới được resume.

## 12. Publish validation

## 12.1. Validation chung cho mọi package

Không cho publish nếu:

- thiếu `content_package`;
- chưa có `question_bank`;
- question bank rỗng;
- có question item invalid theo type;
- có question inactive nhưng đang được tính là bắt buộc.

## 12.2. Validation riêng cho game package

Không cho publish nếu:

- thiếu `game_package_configs`;
- thiếu `game_module_id`;
- `game_module` không hỗ trợ loại câu hỏi đang dùng;
- với Gold Miner: thiếu câu hỏi ở một trong 4 `difficulty_band`;
- có câu `text` dùng `manual` trong runtime Gold Miner;
- game module không khai báo khả năng `blocking modal` hoặc `timer pause`.

## 12.3. Validation riêng cho exam package

Không cho publish nếu:

- thiếu `exam_package_configs`;
- `duration_minutes` không hợp lệ;
- `max_attempts` không hợp lệ.

## 13. Những bảng cũ nên bỏ hẳn

Vì không cần giữ dữ liệu cũ, có thể retire hoàn toàn các bảng cũ sau:

- `exams`
- `questions`
- `question_options`
- `matching_pairs`
- `exam_submissions`
- `answers`
- `answer_options`

Sau migrate:

- `exam` sẽ được dựng lại bằng `content_packages + exam_package_configs + question_banks + package_attempts`;
- `game` cũng dùng cùng core đó.

## 14. Trình tự migrate database được khuyến nghị

## Bước 1. Tạo shared enums mới

- `content_package_type`
- `content_package_status`
- `question_type`
- `difficulty_band`
- `text_input_variant`
- `text_grading_mode`
- `package_attempt_status`
- `question_attempt_status`

## Bước 2. Tạo shared package layer

- `content_packages`
- `content_package_assignments`
- `exam_package_configs`
- `game_modules`
- `game_package_configs`

## Bước 3. Tạo toàn bộ question bank layer

- `question_banks`
- `question_bank_items`
- `question_item_options`
- `question_item_matching_left_items`
- `question_item_matching_right_items`
- `question_item_text_configs`
- `question_item_text_accepted_answers`
- `question_item_text_keywords`
- `question_item_assets`

## Bước 4. Tạo shared attempt layer

- `package_attempts`
- `package_question_attempts`
- `question_attempt_selected_options`
- `question_attempt_matching_answers`
- `question_attempt_text_answers`
- `question_attempt_uploaded_assets`

## Bước 5. Tạo game-specific runtime layer

- `game_module_trigger_mappings`
- `game_runtime_events`

## Bước 6. Drop schema cũ

Drop các bảng cũ của exam question system sau khi app đã đổi sang schema mới.

Vì không cần dữ liệu cũ, đây có thể là migrate phá vỡ hoàn toàn.

## 15. Tổ chức code backend sau migrate

```text
backend/app/
├─ models/
│  ├─ content_package.py
│  ├─ exam_package_config.py
│  ├─ game_module.py
│  ├─ game_package_config.py
│  ├─ question_bank.py
│  ├─ package_attempt.py
│  └─ ...
├─ schemas/
│  ├─ content_package.py
│  ├─ question_bank.py
│  ├─ package_attempt.py
│  └─ ...
├─ services/
│  ├─ question_bank_service.py
│  ├─ question_validation_service.py
│  ├─ question_grading_service.py
│  ├─ content_package_service.py
│  ├─ package_attempt_service.py
│  ├─ exam_runtime_service.py
│  └─ game_runtime_service.py
└─ api/v1/endpoints/
   ├─ content_packages.py
   ├─ question_banks.py
   ├─ package_attempts.py
   ├─ game_modules.py
   └─ ...
```

Điểm cần giữ:

- `question_grading_service` là shared;
- `exam_runtime_service` và `game_runtime_service` chỉ khác phần orchestration, không khác phần question storage.

## 16. Kết luận

Thiết kế chuẩn nên đi theo hướng:

- `content_packages` là lớp phát hành nội dung chung cho `exam` và `game`;
- `question_banks` là nguồn câu hỏi chuẩn duy nhất;
- `package_attempts` và `package_question_attempts` là lớp lưu câu trả lời chung;
- `exam` và `game` chỉ còn là hai loại config/runtime khác nhau trên cùng một nền dữ liệu;
- Gold Miner dùng `difficulty_band` và `game_module_trigger_mappings`, không lộ UI vật phẩm cho giáo viên;
- không giữ schema cũ song song, vì điều đó sẽ tiếp tục sinh duplicate và khó maintain.

Sau tài liệu này, bước hợp lý tiếp theo là triển khai migration backend theo đúng schema trên, bắt đầu từ các model và migration của `content package`, `question bank` và `package attempt`.
