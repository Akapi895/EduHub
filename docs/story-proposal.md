# 📘 Thiết kế hệ thống "Sách tương tác" (Interactive Story Engine)

## 1. Tổng quan

Tính năng "sách tương tác" không phải là hiển thị nội dung tĩnh, mà là một **hệ thống kể chuyện có tương tác (interactive storytelling system)**.

Hệ thống cần xử lý:

- Hiển thị nội dung đa phương tiện (ảnh, video, audio)
- Nhận input từ người dùng (click, chọn đáp án)
- Điều khiển luồng câu chuyện (flow control)
- Phản hồi theo hành động (âm thanh, UI)
- Rẽ nhánh nội dung (branching logic)

👉 Kết luận: cần xây dựng theo hướng **data-driven + event-driven**, không hardcode.

---

## 2. Luồng hoạt động theo yêu cầu

### Bước 1: Timeline (5 ảnh sự kiện)

- Hiển thị 5 ảnh đại diện cho 5 sự kiện
- Sắp xếp theo thứ tự thời gian
- Người dùng click vào từng ảnh → chuyển sang nội dung chi tiết

👉 Mapping kỹ thuật:
- 1 ảnh = 1 `scene`
- Dùng `order_index` để sắp xếp

---

### Bước 2.1: Giới thiệu chung (video)

- Người dùng click vào ảnh đầu tiên
- Hiển thị video hoặc gif
- Có thể kèm audio mp3
- Auto play khi vào

👉 Mapping:
- Scene type = `video`
- Element = `video`
- `autoplay = true`

---

### Bước 2.2: Ảnh + hotspot + câu hỏi

Flow:

1. Hiển thị ảnh
2. Người dùng click vào vị trí cụ thể trên ảnh
3. Phát audio
4. Sau khi audio kết thúc → hiện câu hỏi trắc nghiệm
5. Người dùng chọn đáp án:
   - Đúng → phát âm thanh đúng + UI success
   - Sai → phát audio giải thích + UI fail

👉 Mapping:
- Scene = image
- Element:
  - image
  - hotspot (tọa độ)
- Action chain:
```
click hotspot
→ play audio
→ show quiz
→ answer
→ correct → play sound + success UI
→ wrong → play explanation + fail UI
```


---

### Bước 2.3: Video rẽ nhánh (branching)

Flow:

1. Video đang chạy
2. Tại thời điểm X → video pause
3. Hiện các lựa chọn
4. Người dùng chọn:
 - đúng → chuyển scene tiếp
 - sai → game over / quay lại

👉 Mapping:
- Scene type = video
- Video interaction tại timestamp
- Option → next scene

---

### Các bước tiếp theo

- Lặp lại logic:
- Scene
- Interaction
- Quiz
- Branch

👉 Hệ thống phải reusable 100%

---

## 3. Kiến trúc hệ thống
```
Story
├── Scenes
├── Elements (media, hotspot, quiz)
├── Actions
└── Transitions (rẽ nhánh)
```


---

## 4. Thiết kế Database

## 4.1. Bảng `stories`

```sql
id
title
description
created_at
```

4.2. Bảng scenes
id
story_id
title
type            -- intro | image | video | quiz | branch
order_index     -- dùng cho timeline
background_media_id
auto_play
4.3. Bảng media
id
type            -- image | video | audio | gif
url
thumbnail
duration
4.4. Bảng scene_elements

Dùng để gắn các thành phần vào scene

id
scene_id
type            -- image | video | hotspot | quiz | button
config_json
Ví dụ config

Video

{
  "media_id": 10,
  "autoplay": true
}

Hotspot

{
  "x": 0.4,
  "y": 0.7,
  "radius": 30,
  "onClickActionId": 5
}
4.5. Bảng actions

Điều khiển logic hệ thống

id
type            -- play_audio | show_quiz | go_to_scene | show_options
config_json
Ví dụ

Play audio

{
  "media_id": 20
}

Show quiz

{
  "quiz_id": 3
}

Go to scene

{
  "scene_id": 8
}
4.6. Bảng quizzes
id
question
type            -- multiple_choice
4.7. Bảng quiz_options
id
quiz_id
content
is_correct
correct_action_id
wrong_action_id
4.8. Bảng transitions
id
scene_id
trigger_type    -- end_video | click | answer
condition
next_scene_id
4.9. Bảng video_interactions
id
scene_id
timestamp
question
4.10. Bảng video_options
id
interaction_id
label
next_scene_id
is_correct
5. Cách hệ thống vận hành (Runtime)
Khi load scene:
Load scene từ DB
Load tất cả scene_elements
Render UI tương ứng
Khi user tương tác:
Click hotspot → gọi action
Action có thể:
play audio
show quiz
chuyển scene
Khi làm quiz:
Check is_correct
Trigger action tương ứng
Khi video:
Track time
Đến timestamp → pause
Hiện options
Chọn → chuyển scene
6. Cách cập nhật nội dung (Admin)
Thêm story mới:
Insert story
Tạo các scene
Upload media
Gắn scene_elements
Tạo actions
Tạo quiz nếu cần
Tạo transition

👉 Không cần sửa code

Sửa nội dung:
Chỉ update DB:
đổi media
đổi câu hỏi
đổi logic rẽ nhánh
7. Insight quan trọng
1. Không hardcode

❌ Sai:

if (scene === 1) ...

✅ Đúng:

đọc config từ DB
2. Mọi thứ là Action
Click → Action
Answer → Action
Video → Action

👉 giúp mở rộng cực dễ

3. Scene là đơn vị nhỏ nhất
FE chỉ cần render theo scene
Không cần biết logic toàn bộ story
4. Dùng JSON để linh hoạt
Tránh sửa schema DB
Dễ thêm loại interaction mới
8. Tech stack đề xuất
Frontend: React + Canvas (Konva)
Backend: Node.js / NestJS
Database: PostgreSQL
Media: Cloudinary / S3
9. Kết luận

Bạn đang xây dựng:

🎮 Một "interactive story engine" (mini game engine)

Nếu làm đúng:

Thêm nội dung mới = insert DB
Không cần deploy lại code
Scale tốt cho nhiều story
Dễ mở rộng (VR, gamification sau này)