# Đề xuất sản phẩm: Sách tương tác trong EduHub

## 1. Mục tiêu

Tính năng **Sách tương tác** cho phép giáo viên tạo một tài liệu học tập dạng câu chuyện có hình ảnh, video, âm thanh, câu hỏi, điểm chạm và các nhánh lựa chọn. Học sinh không chỉ đọc hoặc xem file tĩnh, mà đi qua từng trang/cảnh theo flow giáo viên đã thiết kế.

Mục tiêu chính:

- Giáo viên có thể biên soạn nội dung theo từng trang/cảnh giống cách làm slide PowerPoint.
- Giáo viên có thể thêm text box, hình ảnh, video, hotspot và nút chuyển slide như các layer trên một slide.
- Giáo viên có thể cấu hình thứ tự ẩn/hiện của text box hoặc layer: hiện ngay khi vào cảnh, hiện sau vài giây, hiện sau khi bấm, hoặc hiện sau khi audio/video kết thúc.
- Giáo viên có thể thiết kế các nhánh rẽ logic giống một sơ đồ flow hoặc git graph: mỗi lựa chọn có thể dẫn tới một cảnh khác nhau.
- Học sinh mở sách và học theo trải nghiệm toàn màn hình, từng cảnh được trình chiếu lớn, không bị giới hạn trong một khung nhỏ.
- Nội dung phải data-driven, không hardcode theo một truyện cụ thể.
- Sách tương tác vẫn là một loại tài liệu trong EduHub, có thể đưa vào thư viện chung hoặc gán cho lớp/chương như các tài liệu khác.

## 2. Vấn đề cần giải quyết

Hiện tại tài liệu trong LMS thường là PDF, video hoặc file tải xuống. Cách này phù hợp với nội dung tĩnh nhưng không đủ cho hoạt động học tập có tương tác.

Với các bài học kiểu kể chuyện, văn học, lịch sử, tình huống đạo đức hoặc mô phỏng, giáo viên cần:

- Tạo từng cảnh học tập có ảnh/video/audio riêng.
- Gắn câu hỏi ngay tại một thời điểm trong video hoặc sau khi học sinh bấm vào một điểm trên ảnh.
- Cho học sinh chọn hướng xử lý, nếu chọn đúng thì đi tiếp, nếu chọn sai thì nhận phản hồi hoặc quay lại.
- Kiểm soát được toàn bộ flow để tránh nhầm lẫn khi có nhiều nhánh.
- Xem thử như học sinh trước khi phát hành.

Học sinh cần:

- Mở sách từ thư viện hoặc lớp học.
- Xem từng cảnh theo thứ tự hoặc theo nhánh đã được giáo viên thiết kế.
- Ảnh/video chiếm phần lớn màn hình, ưu tiên trải nghiệm nhập vai.
- Câu hỏi, lựa chọn, phản hồi xuất hiện đúng thời điểm, không làm đứt mạch học.
- Có thể tiếp tục từ vị trí đã học nếu thoát giữa chừng.

## 3. Nguyên tắc thiết kế

### 3.1. Không hardcode theo một câu chuyện

Ví dụ “Cậu bé thông minh” chỉ là dữ liệu mẫu để test. Hệ thống không được viết logic kiểu:

```ts
if (scene === "quan-hoi") {
  // xử lý riêng cho truyện này
}
```

Thay vào đó, frontend chỉ đọc manifest/config từ backend và render theo loại scene, interaction, transition.

### 3.2. Scene là đơn vị biên soạn nhỏ nhất

Một sách tương tác gồm nhiều scene. Có thể hiểu scene giống một slide PowerPoint hoặc một node trong flow graph.

Mỗi scene có thể là:

- Trang tổng quan/timeline.
- Trang ảnh có điểm chạm.
- Trang video tương tác.
- Trang rẽ nhánh.
- Trang câu hỏi.
- Trang trình chiếu nhiều ảnh.
- Trang kết thúc.

Mỗi scene không chỉ có một media chính, mà còn có thể chứa nhiều layer như một slide:

- Background: ảnh, video hoặc màu nền.
- Text box: chữ tiêu đề, chú thích, lời thoại, gợi ý.
- Media phụ: ảnh minh họa, icon, audio cue.
- Hotspot: vùng bấm tương tác trên ảnh/video.
- Button: nút chuyển slide/cảnh hoặc nút mở câu hỏi.
- Overlay: câu hỏi, lựa chọn, phản hồi đúng/sai.

Các layer này cần có thứ tự hiển thị rõ ràng, gồm cả thứ tự xếp chồng (`z-index`) và thứ tự xuất hiện theo thời gian hoặc theo hành động của học sinh.

### 3.3. Teacher authoring phải trực quan

Giáo viên không nên phải sửa JSON trực tiếp trong luồng sử dụng chính. JSON/manifest chỉ nên là chế độ nâng cao hoặc import/export.

Trải nghiệm mong muốn:

- Bên trái là danh sách các cảnh giống danh sách slide.
- Ở giữa là vùng canvas/preview của cảnh đang sửa.
- Bên phải là panel thuộc tính để sửa tiêu đề, media, câu hỏi, lựa chọn, nhánh tiếp theo.
- Có graph view để thấy cảnh nào nối tới cảnh nào.
- Có nút “Xem thử” riêng, mở chế độ preview giống học sinh, không hiển thị cùng lúc với editor.

### 3.4. Student player phải nhập vai và toàn màn hình

Khi học sinh học, sách tương tác phải giống một player riêng, không giống trang chi tiết tài liệu thông thường.

Yêu cầu:

- Ảnh/video/canvas của scene cần chiếm gần toàn bộ màn hình.
- Control chỉ hiện khi cần, không chiếm quá nhiều diện tích.
- Câu hỏi hoặc lựa chọn nên hiện dạng overlay trên nội dung.
- Video/audio cần pause đúng thời điểm khi có tương tác.
- Khi học sinh bấm “Cảnh tiếp theo”, hệ thống đi theo flow đã thiết kế, không quay về tổng quan trừ khi transition yêu cầu.

## 4. Vai trò người dùng

### 4.1. Giáo viên

Giáo viên là người tạo, chỉnh sửa, preview, publish và phân phối sách tương tác.

Các nhu cầu chính:

- Tạo sách mới từ thư viện cá nhân.
- Thêm metadata: tên sách, mô tả, môn học, khối lớp, thumbnail.
- Thêm từng cảnh như thêm từng slide.
- Thêm text box trực tiếp lên cảnh, kéo thả vị trí, chỉnh kích thước, font, màu, nền, viền và độ trong suốt.
- Sắp xếp layer của cảnh: text box nào nằm trên/dưới, nội dung nào hiện trước/sau.
- Thêm nút chuyển slide/cảnh như “Tiếp tục”, “Quay lại”, “Chọn lại”, “Tới thử thách tiếp theo”.
- Upload ảnh/video/audio/poster cho từng cảnh.
- Thêm câu hỏi và các lựa chọn trả lời.
- Cấu hình phản hồi đúng/sai bằng chữ, ảnh, audio hoặc video.
- Cấu hình nhánh rẽ: lựa chọn A đi tới cảnh X, lựa chọn B đi tới cảnh Y.
- Kéo thả để đổi thứ tự cảnh trong sidebar.
- Mặc định “Cảnh tiếp theo” là cảnh đứng ngay sau trong sidebar, nhưng giáo viên có thể đổi sang một cảnh khác.
- Xem graph để kiểm tra các luồng đi, luồng sai, dead-end và cảnh chưa được nối.
- Xem thử trước khi phát hành.
- Publish phiên bản ổn định cho học sinh.
- Gán sách vào thư viện hệ thống hoặc vào lớp/chương.

#### UX editor cho giáo viên

Editor nên gồm 4 vùng chính:

```text
+--------------------------------------------------------------+
| Header: tên sách, trạng thái draft/published, lưu, xem thử   |
+-------------+-------------------------------+----------------+
| Sidebar     | Canvas chỉnh cảnh             | Inspector      |
| danh sách   | ảnh/video/câu hỏi trực quan   | thuộc tính     |
| cảnh        |                               | cảnh đang chọn |
+-------------+-------------------------------+----------------+
| Graph/Flow view: xem luồng rẽ nhánh như git graph            |
+--------------------------------------------------------------+
```

Sidebar cảnh:

- Hiển thị tất cả scene theo thứ tự.
- Cho kéo thả để đổi vị trí.
- Cho thêm scene mới từ danh sách loại scene.
- Cho nhân bản hoặc xóa scene.
- Hiển thị cảnh thiếu media, thiếu câu hỏi, thiếu transition bằng badge cảnh báo.

Canvas:

- Hiển thị nội dung gần giống lúc học sinh sẽ thấy.
- Cho thêm text box trực tiếp lên canvas giống PowerPoint.
- Cho kéo thả, resize, căn chỉnh, nhân bản, khóa hoặc xóa từng layer.
- Cho quản lý thứ tự layer: background, ảnh/video, text box, hotspot, nút bấm, overlay câu hỏi.
- Cho cấu hình thứ tự xuất hiện của layer theo timeline nhỏ trong scene.
- Với ảnh: hiển thị ảnh lớn, cho đặt hotspot trực tiếp bằng click/drag.
- Với video: hiển thị video, cho chọn thời điểm dừng để hiện câu hỏi/lựa chọn.
- Với slideshow: hiển thị danh sách ảnh giống slide deck.
- Với branching: hiển thị câu hỏi và các nút lựa chọn.

Inspector:

- Sửa tiêu đề cảnh.
- Chọn loại cảnh.
- Upload media mà không bắt giáo viên nhập URL.
- Chỉnh text box: nội dung, font, cỡ chữ, màu chữ, nền, viền, bo góc, căn lề, vị trí, kích thước, z-index.
- Chỉnh animation/visibility của text box: hiện khi vào cảnh, hiện sau N giây, hiện sau click, hiện sau khi audio/video kết thúc, hoặc ẩn sau N giây.
- Chỉnh câu hỏi, lựa chọn, feedback.
- Chọn “Cảnh tiếp theo”.
- Chọn hành động cho nút chuyển slide: đi tới scene kế tiếp theo sidebar, đi tới scene cụ thể, quay lại scene trước, mở câu hỏi, hoặc kết thúc sách.
- Chọn hành vi khi trả lời sai: cảnh báo sai, cho thử lại, hiển thị ảnh/video/audio phản hồi, hoặc chuyển tới cảnh khác.

Graph/Flow view:

- Mỗi scene là một node.
- Mỗi transition là một edge.
- Edge mặc định hiển thị theo thứ tự sidebar.
- Edge rẽ nhánh hiển thị nhãn theo lựa chọn của học sinh.
- Hệ thống phải cho phép node nối ngược về node trước đó để tạo vòng lặp có chủ đích, ví dụ: Scene A là câu hỏi, học sinh chọn sai thì sang Scene B phản hồi/game over, sau đó nút ở Scene B trỏ ngược lại Scene A để thử lại.
- Graph View cần phân biệt rõ vòng lặp có chủ đích và vòng lặp rủi ro. Cycle dùng cho “thử lại” là hợp lệ, nhưng phải có nhãn hoặc icon để giáo viên nhận biết đây là luồng quay lại.
- Cảnh chưa thể truy cập, cảnh không có đường đi tiếp, hoặc vòng lặp không mong muốn cần được cảnh báo.
- Hệ thống cần cảnh báo dead-end loop: một cụm scene nối vòng nhau nhưng không có edge thoát ra scene tiếp theo, scene hoàn thành hoặc scene kết thúc.

### 4.2. Học sinh

Học sinh là người trải nghiệm sách tương tác đã được publish.

Các nhu cầu chính:

- Mở sách từ thư viện hệ thống, thư viện lớp hoặc chương học.
- Bắt đầu hoặc tiếp tục attempt cũ.
- Xem từng cảnh ở chế độ toàn màn hình hoặc gần toàn màn hình.
- Tương tác bằng click, chọn đáp án, chọn hướng rẽ nhánh.
- Nhận phản hồi ngay khi trả lời.
- Không thấy JSON, manifest, trạng thái kỹ thuật hoặc các công cụ biên soạn.
- Có tiến trình học: đã đi qua bao nhiêu cảnh, đang ở cảnh nào, đã hoàn thành chưa.

#### UX player cho học sinh

Player nên ưu tiên trải nghiệm học:

```text
+--------------------------------------------------------------+
| Thanh nhỏ: tên sách, tiến trình, nút thoát/tạm dừng          |
+--------------------------------------------------------------+
|                                                              |
|                  Nội dung scene full page                    |
|             ảnh/video/canvas chiếm gần toàn màn hình         |
|                                                              |
+--------------------------------------------------------------+
| Overlay khi cần: câu hỏi, lựa chọn, phản hồi, nút đi tiếp    |
+--------------------------------------------------------------+
```

Yêu cầu cụ thể:

- Ảnh/video không nên chỉ nằm trong một card nhỏ.
- Video tương tác phải pause tại timecode đã cấu hình.
- Khi có câu hỏi, overlay xuất hiện trên video/ảnh.
- Khi trả lời đúng, hệ thống có thể đi tiếp, phát phản hồi hoặc mở cảnh tiếp theo.
- Khi trả lời sai, hệ thống có thể báo sai, cho thử lại, hoặc hiển thị media phản hồi sai.
- Nút “Cảnh tiếp theo” đi tới scene theo transition hiện tại, không tự quay lại tổng quan.
- URL nên phản ánh scene hiện tại để dễ debug/chia sẻ trạng thái, ví dụ:

```text
/student/interactive-books/{material_id}/scenes/{scene_id}
```

## 5. Các khái niệm dữ liệu

### 5.1. Interactive book

Là tài liệu loại `interactive_book` trong EduHub. Sách có metadata giống tài liệu thư viện và có thêm manifest/state riêng.

### 5.2. Scene

Scene là một trang/cảnh trong sách.

Trường chính:

- `id`
- `type`
- `title`
- `order_index`
- `content`
- `assets`
- `interactions`
- `next`

### 5.3. Asset

Asset là media giáo viên upload hoặc chọn từ thư viện.

Loại asset:

- `image`
- `video`
- `audio`
- `poster`
- `file`

Nguyên tắc UX:

- Giáo viên upload file, hệ thống lưu URL phía backend.
- UI không nên bắt giáo viên nhập hoặc nhìn URL thô trong luồng bình thường.
- URL chỉ hiện trong chế độ kỹ thuật hoặc copy link nâng cao.

### 5.4. Interaction

Interaction là hành động học sinh có thể thực hiện hoặc sự kiện tự động trong scene.

Trigger phổ biến:

- `on_enter`: khi vào scene.
- `timecode`: khi video/audio tới giây X.
- `on_click`: khi học sinh click hotspot hoặc nút.
- `on_choice`: khi học sinh chọn đáp án.
- `on_complete`: khi scene hoàn tất.

### 5.5. Layer và text box

Layer là thành phần hiển thị nằm bên trong một scene. Layer giúp editor hoạt động giống PowerPoint hơn, thay vì mỗi scene chỉ là một ảnh/video cố định.

Loại layer cần hỗ trợ:

- `background`: nền ảnh, video hoặc màu.
- `text_box`: đoạn chữ giáo viên đặt lên màn hình.
- `image`: ảnh phụ hoặc minh họa.
- `hotspot`: vùng bấm.
- `button`: nút bấm như “Tiếp tục”, “Quay lại”, “Nghe lại”, “Chọn đáp án”.
- `quiz_overlay`: overlay câu hỏi/lựa chọn.
- `feedback_overlay`: overlay phản hồi đúng/sai.

Text box cần có cấu hình:

- Nội dung text.
- Vị trí theo phần trăm hoặc pixel tương đối với canvas.
- Kích thước.
- Font, cỡ chữ, màu chữ, độ đậm/nghiêng.
- Màu nền, viền, bo góc, shadow, opacity.
- Căn lề.
- `z_index` để quyết định nằm trên/dưới layer khác.
- `visibility_rule` để quyết định khi nào hiện.

Visibility rule của layer:

- `on_scene_enter`: hiện ngay khi vào scene.
- `after_delay`: hiện sau N giây.
- `after_media_time`: hiện khi video/audio tới thời điểm X.
- `after_media_end`: hiện khi video/audio kết thúc.
- `after_click`: hiện sau khi học sinh click vào hotspot/button.
- `after_choice`: hiện sau khi học sinh chọn đáp án.
- `manual`: chỉ hiện khi action gọi tới.

Ví dụ:

```json
{
  "id": "text-goi-y",
  "type": "text_box",
  "text": "Em hãy chú ý câu hỏi của viên quan.",
  "x": 12,
  "y": 70,
  "width": 48,
  "height": 12,
  "style": {
    "font_size": 28,
    "color": "#ffffff",
    "background": "rgba(0,0,0,0.55)",
    "border_radius": 16
  },
  "z_index": 30,
  "visibility_rule": {
    "trigger": "after_delay",
    "delay_seconds": 2
  }
}
```

### 5.6. Transition

Transition quyết định cảnh tiếp theo.

Ví dụ:

- Scene A kết thúc thì sang Scene B.
- Chọn đáp án đúng thì sang Scene C.
- Chọn đáp án sai thì hiện feedback rồi cho thử lại.
- Chọn hành động sai nghiêm trọng thì sang cảnh “game over”.

Transition không chỉ áp dụng cho toàn scene, mà còn có thể gắn với button hoặc option.

Ví dụ button chuyển slide:

```json
{
  "id": "btn-next",
  "type": "button",
  "label": "Cảnh tiếp theo",
  "action": {
    "type": "go_to_scene",
    "target_scene_id": "ba-con-trau-duc"
  }
}
```

Nếu giáo viên không chọn target cụ thể, hệ thống mặc định dùng scene kế tiếp theo thứ tự sidebar.

### 5.7. Attempt

Attempt lưu tiến trình học của một học sinh với một sách.

Cần lưu:

- Scene hiện tại.
- Các scene đã đi qua.
- Lịch sử rẽ nhánh.
- Kết quả câu hỏi.
- Điểm tích lũy.
- Số lần trả lời sai hoặc chọn sai.
- Số lần retry ở từng scene hoặc từng interaction.
- Tiến trình media nếu cần.
- Điểm/tổng kết nội bộ của sách.

Attempt không chỉ phục vụ resume, mà còn là bằng chứng dữ liệu cho quá trình học. Với đề tài nghiên cứu, dữ liệu này giúp chứng minh học sinh đã tương tác như thế nào, đã đi theo nhánh nào, sai ở đâu, sửa sai ra sao và hoàn thành với kết quả nào.

`interactive_book_attempts.score_summary` nên lưu tối thiểu:

- `total_score`: tổng điểm đạt được.
- `max_score`: tổng điểm tối đa theo manifest.
- `correct_count`: số lựa chọn/câu hỏi đúng.
- `wrong_count`: số lần chọn sai.
- `retry_count`: số lần phải thử lại.
- `completed_scene_count`: số scene đã hoàn thành.
- `branch_history`: tóm tắt các nhánh đã đi qua.

Màn hình completed ở scene cuối cần hiển thị tổng kết:

- Học sinh đạt bao nhiêu điểm.
- Học sinh đã chọn sai bao nhiêu lần.
- Học sinh đã hoàn thành bao nhiêu thử thách.
- Có thể hiển thị thông điệp theo mức điểm, ví dụ “Hoàn thành tốt”, “Cần thử lại để hiểu kỹ hơn”.

## 6. Loại scene cần hỗ trợ

### 6.1. Timeline/Tổng quan

Mục đích:

- Cho học sinh thấy các sự kiện chính.
- Có thể dùng làm mục lục hoặc bản đồ câu chuyện.

UX teacher:

- Giáo viên thêm các card sự kiện.
- Mỗi card gồm ảnh, tiêu đề, mô tả ngắn và target scene.
- Có thể kéo thả để đổi thứ tự card.

UX student:

- Học sinh thấy các card lớn, có ảnh rõ.
- Click card để vào scene chi tiết.
- Nếu flow tuyến tính, timeline có thể chỉ xuất hiện đầu bài, không tự quay lại sau mỗi scene.

### 6.2. Slideshow

Mục đích:

- Trình chiếu nhiều ảnh hoặc nhiều trang nội dung như một nhóm slide nhỏ.
- Cho giáo viên xây từng trang giống PowerPoint: mỗi trang có background, text box, media phụ, nút chuyển slide và animation xuất hiện.

UX teacher:

- Upload nhiều ảnh.
- Sắp xếp lại bằng kéo thả.
- Thêm text box trên từng slide, chỉnh style và vị trí trực tiếp trên canvas.
- Chọn thứ tự ẩn/hiện của từng text box hoặc layer trong slide.
- Thêm nút chuyển slide: slide trước, slide tiếp, đi tới scene khác, quay lại timeline hoặc kết thúc sách.
- Cấu hình tự chuyển slide sau N giây nếu cần.
- Có thể thêm audio nền hoặc audio thuyết minh.
- Có thể thêm nút đi tiếp sau slide cuối.

UX student:

- Ảnh hiển thị full page.
- Text box hiện đúng thứ tự giáo viên đã đặt, ví dụ tiêu đề hiện trước, lời thoại hiện sau, câu hỏi hiện cuối.
- Có nút slide trước/sau.
- Nút chuyển slide/cảnh phải rõ ràng, không làm học sinh quay về tổng quan nếu giáo viên không cấu hình như vậy.
- Nếu có audio, audio phát theo cấu hình.

### 6.3. Interactive video

Mục đích:

- Video tự dừng ở một thời điểm để hỏi hoặc cho chọn hành động.

UX teacher:

- Upload video hoặc chọn video đã có.
- Upload poster nếu cần.
- Đặt timecode dừng video.
- Thêm câu hỏi/lựa chọn tại timecode.
- Chọn hành vi sau từng lựa chọn.

UX student:

- Video hiển thị lớn, ưu tiên toàn màn hình.
- Khi tới timecode, video pause.
- Câu hỏi/lựa chọn xuất hiện overlay.
- Sau khi chọn, video tiếp tục hoặc chuyển scene theo flow.

### 6.4. Hotspot audio/image

Mục đích:

- Học sinh click vào một điểm trên ảnh để nghe thoại, gợi ý hoặc mở câu hỏi.

UX teacher:

- Upload ảnh nền.
- Click/drag để đặt hotspot trực tiếp trên ảnh.
- Gắn audio hoặc text cho hotspot.
- Chọn câu hỏi hiện sau khi audio kết thúc nếu cần.

UX student:

- Ảnh hiển thị lớn.
- Hotspot rõ nhưng không che nội dung.
- Click hotspot phát audio hoặc mở nội dung.

### 6.5. Branching/Rẽ nhánh

Mục đích:

- Học sinh chọn một hành động và đi sang nhánh khác nhau.

UX teacher:

- Tạo câu hỏi tình huống.
- Mỗi option có thể có:
  - nhãn lựa chọn
  - đúng/sai
  - feedback text
  - feedback image/audio/video
  - target scene
  - cho thử lại hoặc không
- Graph view phải hiển thị rõ option nào nối tới scene nào.

UX student:

- Thấy câu hỏi và các lựa chọn lớn, dễ bấm.
- Nếu sai, nhận phản hồi rõ.
- Nếu đúng, đi tiếp mượt mà.

### 6.6. Quiz/Câu hỏi

Mục đích:

- Kiểm tra nhanh trong sách, không thay thế exam chính thức.

UX teacher:

- Tạo câu hỏi trắc nghiệm.
- Đánh dấu đáp án đúng.
- Cấu hình phản hồi đúng/sai.
- Có thể gắn ảnh/video/audio phản hồi riêng cho từng option.

UX student:

- Trả lời ngay trong player.
- Thấy kết quả và feedback.
- Đi tiếp theo rule giáo viên đã đặt.

## 7. Flow mẫu: “Cậu bé thông minh”

Ví dụ này dùng để kiểm thử khả năng của hệ thống, không phải thiết kế cố định.

### 7.1. Tổng quan 5 sự kiện

Teacher tạo timeline gồm 5 card:

- Giới thiệu chung.
- Quan hỏi: Trâu một ngày cày được mấy đường?
- Ba con trâu đực đẻ.
- Chim sẻ.
- Sợi chỉ.

Mỗi card có ảnh đại diện, âm thanh nền tùy chọn và target scene tương ứng.

### 7.2. Giới thiệu chung

Scene type: `interactive_video` hoặc `slideshow`.

Nội dung:

- Video hoặc chuỗi ảnh giới thiệu nhân vật.
- Em bé tự kể hoàn cảnh.
- Có thể dùng âm thanh nền như tiếng sáo, tiếng gió, cánh đồng.
- Giáo viên có thể thêm text box lời dẫn: tên nhân vật, bối cảnh, câu thoại.
- Text box có thể hiện lần lượt: tiêu đề hiện ngay, mô tả hiện sau 2 giây, câu hỏi gợi mở hiện sau khi video/audio kết thúc.
- Có nút “Bắt đầu câu chuyện” hoặc “Cảnh tiếp theo” để chuyển sang scene giáo viên chọn.

Transition:

- Kết thúc video thì đi tới scene tiếp theo hoặc quay lại timeline nếu giáo viên cấu hình như vậy.

### 7.3. Quan hỏi

Scene type: `hotspot_audio` hoặc `branching`.

Nội dung:

- Ảnh quan gặp cậu bé ngoài đồng.
- Text box mô tả bối cảnh có thể xuất hiện trước.
- Hotspot trên viên quan.
- Click viên quan phát thoại.
- Text box lời thoại của viên quan có thể hiện khi audio bắt đầu.
- Sau thoại hiện câu hỏi: “Theo bạn, một ngày trâu của tớ cày được mấy đường?”

Logic:

- Chọn đúng: hiện phản hồi đồng tình, có thể phát audio khen.
- Chọn sai: hiện cảnh báo sai hoặc ảnh/audio giải thích.
- Sau khi hoàn tất: đi tới scene kế tiếp.

### 7.4. Ba con trâu đực đẻ

Scene type: `interactive_video` + `branching`.

Nội dung:

- Video cảnh vua ban ba con trâu đực.
- Đến timecode X, video dừng.
- Text box hoặc overlay giải thích tình huống xuất hiện khi video dừng.
- Hiện hai lựa chọn:
  - Khóc lóc xin vua rút lệnh.
  - Thịt trâu mở tiệc ăn khao.

Logic:

- Lựa chọn đúng đi tiếp.
- Lựa chọn sai có thể hiện “game over”, feedback hoặc bắt chọn lại.
- Teacher quyết định target scene cho từng lựa chọn.

### 7.5. Chim sẻ

Scene type: `branching` hoặc `quiz`.

Nội dung:

- Học sinh chọn cách xử lý với một con chim sẻ.
- Mỗi lựa chọn có ảnh minh họa riêng.

Logic:

- Đáp án đúng/sai không chỉ hiện text, mà có thể hiện ảnh hoặc audio phản hồi.
- Các lựa chọn có thể dẫn tới cùng một scene hoặc nhiều nhánh khác nhau.

### 7.6. Sợi chỉ

Scene type MVP: `hotspot_audio` hoặc `connect_the_dots`.

Scene type phase sau: `mini_game` nếu cần vẽ canvas tự do.

Nội dung mong muốn:

- Hình vỏ ốc lớn toàn màn hình.
- Học sinh tìm đường đi của sợi chỉ qua mê cung.

MVP:

- Ở MVP, thay vì dùng canvas vẽ tự do vì khó kiểm soát thuật toán đúng/sai, hệ thống sẽ hiển thị ảnh vỏ ốc với các điểm hotspot A, B, C... chạy dọc theo đường đi.
- Học sinh phải click tuần tự vào các điểm này để mô phỏng đường đi của sợi chỉ.
- Nếu học sinh bấm đúng điểm tiếp theo, hệ thống đánh dấu điểm đó đã hoàn thành và mở điểm kế tiếp.
- Nếu học sinh bấm sai thứ tự, hệ thống báo lỗi, tăng `wrong_count` và yêu cầu đi lại từ điểm hiện tại hoặc từ đầu tùy cấu hình của giáo viên.
- Cách này vẫn tạo được tương tác giải đố thật, nhưng kỹ thuật khả thi ngay trong Phase 1 vì chỉ cần hotspot, thứ tự điểm và state kiểm tra tuần tự.

Ví dụ cấu hình:

```json
{
  "type": "connect_the_dots",
  "content": {
    "background_image_url": "https://...",
    "points": [
      { "id": "A", "x": 18, "y": 72, "order": 1 },
      { "id": "B", "x": 28, "y": 62, "order": 2 },
      { "id": "C", "x": 43, "y": 55, "order": 3 }
    ],
    "wrong_behavior": "restart_current_sequence",
    "success_target_scene_id": "ket-thuc"
  },
  "scoring": {
    "complete_score": 10,
    "wrong_penalty": 1
  }
}
```

Phase sau:

- Có thể thêm mini game canvas để kéo/vẽ đường đi tự do nếu cần trải nghiệm phức tạp hơn.

## 8. Runtime student

Luồng state chính:

```text
loading -> intro -> scene_active -> interaction_open -> transitioning -> completed
```

Nhánh phụ:

- `paused`
- `error`

Khi vào scene:

1. Load manifest published.
2. Start hoặc resume attempt.
3. Xác định scene hiện tại.
4. Render scene bằng renderer tương ứng.
5. Preload asset của scene hiện tại và scene kế tiếp.

Khi học sinh tương tác:

1. Player xử lý interaction ở client.
2. Cập nhật state snapshot.
3. Ghi event analytics theo batch.
4. Autosave checkpoint.
5. Chuyển scene nếu transition yêu cầu.

Backend không nên xử lý request-per-click để điều phối cảnh. Backend chủ yếu:

- Validate manifest khi lưu/publish.
- Lưu attempt/checkpoint.
- Kiểm tra quyền truy cập.
- Trả đúng version manifest cho attempt.

## 9. Authoring flow teacher

Luồng tạo sách:

1. Teacher vào thư viện cá nhân.
2. Chọn “Tạo sách tương tác”.
3. Nhập metadata sách.
4. Thêm scene đầu tiên hoặc chọn template.
5. Biên soạn từng scene bằng editor trực quan.
6. Xem graph để kiểm tra flow.
7. Bấm “Xem thử” để preview như học sinh.
8. Sửa lỗi validation nếu có.
9. Publish.
10. Gán vào lớp/chương hoặc đưa vào thư viện hệ thống.

Validation trước publish:

- Có entry scene.
- Scene id không trùng.
- Mọi transition trỏ tới scene tồn tại.
- Cảnh không bị mất media bắt buộc.
- Timecode không âm và không trùng bất hợp lý.
- Option rẽ nhánh có target hoặc có rule rõ ràng.
- Không có scene quan trọng bị unreachable trừ khi teacher xác nhận.
- Cho phép transition tạo cycle nếu giáo viên chủ đích dùng cho retry/thử lại.
- Cảnh báo cycle không có lối thoát tới scene tiếp theo hoặc scene hoàn thành.
- Mỗi interaction có scoring cần khai báo rõ điểm cộng, điểm trừ hoặc không tính điểm.

## 10. Data model đề xuất trong EduHub

Nên bám vào kiến trúc hiện tại:

```text
library_materials
└── interactive_books
    ├── interactive_book_scenes
    ├── interactive_book_media
    ├── interactive_book_interactions
    ├── interactive_book_transitions
    ├── interactive_book_attempts
    └── interactive_book_events
```

Hoặc MVP có thể lưu manifest JSONB trong `interactive_books`, nhưng editor nên thao tác như scene/asset/transition riêng để UX rõ ràng.

Bảng/khái niệm chính:

- `library_materials`: metadata chung, `material_type = interactive_book`.
- `interactive_books`: trạng thái draft/published, manifest version, entry scene.
- `interactive_book_attempts`: tiến trình học sinh.
- `interactive_book_events`: log click, answer, scene enter để analytics/debug.

Với scoring và data evidence, `interactive_book_attempts` cần lưu đủ chi tiết trong `state_snapshot` và `score_summary`:

- `state_snapshot.visited_scenes`
- `state_snapshot.branch_history`
- `state_snapshot.interaction_results`
- `state_snapshot.retry_history`
- `score_summary.total_score`
- `score_summary.max_score`
- `score_summary.correct_count`
- `score_summary.wrong_count`
- `score_summary.retry_count`

`interactive_book_events` nên ghi log các sự kiện quan trọng:

- `scene_entered`
- `choice_selected`
- `answer_correct`
- `answer_wrong`
- `retry_clicked`
- `connect_dot_clicked`
- `connect_dot_wrong_order`
- `book_completed`

## 11. Manifest V1 đề xuất

```json
{
  "entry_scene_id": "timeline",
  "scenes": [
    {
      "id": "timeline",
      "type": "timeline",
      "title": "Tổng quan câu chuyện",
      "assets": [],
      "content": {
        "layers": [
          {
            "id": "title",
            "type": "text_box",
            "text": "Cậu bé thông minh",
            "x": 10,
            "y": 8,
            "width": 55,
            "height": 12,
            "z_index": 20,
            "visibility_rule": {
              "trigger": "on_scene_enter"
            }
          },
          {
            "id": "btn-next",
            "type": "button",
            "label": "Cảnh tiếp theo",
            "x": 74,
            "y": 84,
            "width": 18,
            "height": 8,
            "action": {
              "type": "go_to_scene",
              "target_scene_id": "quan-hoi"
            }
          }
        ],
        "cards": [
          {
            "title": "Quan hỏi",
            "image_url": "https://...",
            "target_scene_id": "quan-hoi"
          }
        ]
      },
      "interactions": [],
      "scoring": {
        "max_score": 0
      },
      "next": "quan-hoi"
    },
    {
      "id": "quan-hoi",
      "type": "quiz",
      "title": "Quan hỏi",
      "content": {
        "question": "Một ngày trâu của tớ cày được mấy đường?"
      },
      "interactions": [
        {
          "id": "quiz-quan-hoi",
          "type": "single_choice",
          "trigger": "on_choice",
          "choices": [
            {
              "id": "correct",
              "label": "Trâu cày bao nhiêu đường còn tùy đường cày dài hay ngắn.",
              "is_correct": true,
              "score_delta": 10,
              "target_scene_id": "ba-con-trau-duc"
            },
            {
              "id": "wrong",
              "label": "Một ngày cày được đúng 10 đường.",
              "is_correct": false,
              "score_delta": 0,
              "wrong_count_delta": 1,
              "target_scene_id": "feedback-quan-hoi"
            }
          ]
        }
      ],
      "scoring": {
        "max_score": 10
      }
    },
    {
      "id": "feedback-quan-hoi",
      "type": "branching",
      "title": "Thử lại câu hỏi",
      "content": {
        "message": "Chưa đúng. Hãy suy nghĩ lại câu đố của viên quan."
      },
      "interactions": [
        {
          "id": "retry",
          "type": "button",
          "trigger": "on_click",
          "target_scene_id": "quan-hoi"
        }
      ],
      "next": "quan-hoi"
    }
  ]
}
```

Manifest cần đủ linh hoạt để thêm scene type mới mà không đổi toàn bộ schema.

Nguyên tắc scoring trong manifest:

- Mỗi lựa chọn hoặc interaction có thể có `score_delta`.
- Lựa chọn sai có thể có `wrong_count_delta`.
- Một scene có thể có `max_score` để tính tổng điểm tối đa.
- Điểm trong sách chỉ dùng cho completion/analytics nội bộ của sách ở V1, không thay thế gradebook hoặc exam chính thức.
- Completed scene cần đọc `score_summary` từ attempt để hiển thị tổng kết cuối sách.

## 12. Phân phối và phân quyền

Teacher:

- Xem và sửa draft của sách mình tạo.
- Preview draft hoặc published.
- Publish sách.
- Gán sách đã publish vào lớp/chương.
- Đưa sách vào thư viện hệ thống nếu có quyền.

Student:

- Chỉ xem sách đã publish.
- Chỉ truy cập sách trong thư viện hệ thống hoặc lớp mình tham gia.
- Nếu sách được update sau khi học sinh đã bắt đầu, attempt cũ nên tiếp tục theo `manifest_version` đã bắt đầu để tránh hỏng tiến trình.

## 13. Yêu cầu UX quan trọng

Teacher UX:

- Không bắt sửa JSON ở luồng chính.
- Không hiển thị URL media thô nếu không cần.
- Có upload ảnh/video/audio/poster trực tiếp.
- Có công cụ thêm text box giống PowerPoint.
- Có panel quản lý layer để đổi thứ tự xếp chồng, khóa layer, ẩn/hiện layer.
- Có timeline nhỏ trong từng scene để cấu hình thứ tự xuất hiện của text box, hotspot, nút bấm và overlay.
- Có nút/chức năng “Thêm chuyển slide” để tạo button chuyển tới scene kế tiếp hoặc scene bất kỳ.
- Có kéo thả scene.
- Có graph view để kiểm soát nhánh.
- Có cảnh báo lỗi trước publish.
- Có preview riêng giống student mode.
- Có trạng thái draft/published rõ ràng.

Student UX:

- Player full page/fullscreen.
- Media chiếm phần lớn màn hình.
- Text box và layer hiện đúng vị trí, đúng thứ tự, đúng thời điểm như giáo viên đã thiết kế.
- Nút chuyển slide/cảnh hiển thị rõ và dẫn đúng target scene.
- Scene chuyển mượt, không tự quay về tổng quan nếu flow không yêu cầu.
- Câu hỏi và lựa chọn hiện dạng overlay.
- Feedback đúng/sai rõ ràng.
- Resume tiến trình.
- URL nên phản ánh scene hiện tại.

## 14. Performance và kỹ thuật

- Lazy-load renderer theo scene type.
- Chỉ preload asset của scene hiện tại và scene kế tiếp.
- Không nhúng base64 vào manifest.
- Batch event log, không gọi API cho từng click nhỏ.
- Autosave checkpoint theo scene change hoặc mỗi 20-30 giây.
- Có fallback localStorage khi mất mạng ngắn hạn.
- Media nên dùng Cloudinary/S3/CDN.
- Video cần poster và loading state.

## 15. Phase triển khai

### Phase 1: MVP ổn định

- Editor scene-based cơ bản.
- Text box/layer cơ bản: thêm, sửa, kéo thả, resize, chỉnh style tối thiểu.
- Cấu hình visibility đơn giản: hiện ngay, hiện sau delay, hiện sau khi bấm.
- Button chuyển slide/cảnh: next mặc định theo sidebar hoặc target scene cụ thể.
- Upload media.
- Scene types: timeline, slideshow, interactive_video, hotspot_audio, branching, quiz, connect_the_dots.
- Connect-the-dots MVP cho bài “Sợi chỉ”: ảnh nền + hotspot A/B/C + kiểm tra click đúng thứ tự.
- Scoring cơ bản: `score_delta`, `wrong_count`, `retry_count`, completed summary.
- Preview riêng.
- Student player full page.
- Attempt/checkpoint.
- Publish và assign vào lớp/chương.

### Phase 2: UX nâng cao cho teacher

- Timeline animation/layer chi tiết hơn cho từng scene.
- Preset text box, caption, speech bubble, callout.
- Graph view trực quan kiểu git graph.
- Drag edge để nối scene.
- Cảnh báo unreachable/dead-end/dead-end loop.
- Hiển thị cycle có chủ đích bằng nhãn “retry loop” hoặc “practice loop”.
- Template theo môn học.
- Library asset dùng lại.
- Undo/redo trong editor.

### Phase 3: Analytics và mini game

- Báo cáo học sinh đi theo nhánh nào.
- Tỷ lệ chọn đúng/sai từng câu.
- Heatmap hotspot.
- Mini game canvas cho các hoạt động như mê cung sợi chỉ.

### Phase 4: VR/3D

- Chỉ xem là extension point sau.
- Không đưa VR vào critical path của MVP.

## 16. Tiêu chí nghiệm thu

Teacher:

- Tạo được sách mới.
- Thêm/xóa/sắp xếp scene bằng UI.
- Upload media mà không cần nhập URL.
- Thêm được text box lên một scene, chỉnh vị trí, kích thước và nội dung bằng UI.
- Cấu hình được ít nhất một text box hiện sau delay hoặc sau click.
- Thêm được nút “Cảnh tiếp theo” và chọn target scene cho nút đó.
- Tạo được ít nhất một video tương tác pause theo timecode.
- Tạo được một câu hỏi có feedback đúng/sai bằng ảnh hoặc audio.
- Tạo được một nhánh lựa chọn dẫn tới scene khác.
- Tạo được retry loop có chủ đích: chọn sai sang scene feedback, bấm nút thử lại quay về scene câu hỏi.
- Graph View hiển thị được cycle hợp lệ và cảnh báo cycle không có lối thoát.
- Tạo được connect-the-dots scene bằng ảnh nền và các hotspot A/B/C cần bấm theo thứ tự.
- Gán được điểm cho lựa chọn đúng và cấu hình ghi nhận số lần chọn sai.
- Preview giống student mode.
- Publish và gán vào lớp được.

Student:

- Mở sách từ thư viện hoặc lớp.
- Player hiển thị ảnh/video full page.
- Text box hiển thị đúng vị trí và đúng thứ tự ẩn/hiện.
- Bấm nút chuyển slide/cảnh thì đi đúng scene giáo viên đã cấu hình.
- Đi qua scene theo flow teacher đã thiết kế.
- Chọn đáp án và nhận feedback đúng/sai.
- Nhánh rẽ dẫn đúng scene.
- Chọn sai có thể đi vào scene feedback rồi bấm thử lại để quay về câu hỏi.
- Connect-the-dots yêu cầu bấm đúng thứ tự điểm; bấm sai thì báo lỗi và ghi nhận sai.
- Màn hình hoàn thành hiển thị tổng điểm, số lần chọn sai và thông tin hoàn thành.
- Thoát ra vào lại vẫn resume được.
- Không nhìn thấy công cụ editor hoặc JSON kỹ thuật.

Regression:

- Tài liệu thường, video, PDF, slide trình chiếu và exam cũ không bị ảnh hưởng.
- Notification khi gán tài liệu mới vẫn hoạt động.
- Quyền truy cập teacher/student vẫn đúng.

## 17. Kết luận

Sách tương tác trong EduHub nên được hiểu là một **interactive story engine** gắn vào hệ thống thư viện/lớp học hiện tại.

Trọng tâm sản phẩm không chỉ là render JSON, mà là:

- Teacher có một công cụ biên soạn trực quan, dễ kiểm soát như PowerPoint kết hợp flow graph.
- Student có một player học tập nhập vai, toàn màn hình, đi theo flow đã publish.
- Hệ thống đủ linh hoạt để tạo nhiều sách khác nhau, không phụ thuộc vào một truyện cụ thể.

Thay vì giáo viên phải dùng nhiều công cụ rời rạc (Edpuzzle cho video, H5P cho câu hỏi) khiến dữ liệu học tập bị phân mảnh, EduHub gom toàn bộ các loại hình tương tác vào một luồng (flow) duy nhất. Điều này giúp đồng bộ hoàn toàn tiến trình học, giữ học sinh ở lại một nền tảng và quản lý dữ liệu tập trung.
