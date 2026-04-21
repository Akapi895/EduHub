# Kế hoạch implement cải thiện UX cho giáo viên khi tạo và chỉnh sửa Interactive Book

## Mục tiêu

Tài liệu này mô tả các hạng mục cần implement để tối ưu trải nghiệm cho giáo viên khi tạo và chỉnh sửa `interactive book`, đồng thời đề xuất cách tổ chức lại code để:

- giảm tải nhận thức trên màn hình editor hiện tại
- hạn chế thuật ngữ kỹ thuật không cần thiết
- rút ngắn thao tác soạn bài
- giữ được khả năng mở rộng cho các loại scene mới
- tránh để `InteractiveBookEditor.tsx` tiếp tục phình to

Tài liệu được viết theo hướng có thể triển khai trực tiếp, không chỉ dừng ở mức ý tưởng UX.

---

## Cập nhật triển khai 2026-04-21

### Trạng thái tổng quan

| Hạng mục | Phase | Trạng thái | Ghi chú |
| --- | --- | --- | --- |
| 1. Editor nhiều bước | P0 | Đã triển khai | Chia thành 4 bước trong cùng route: `Thông tin sách`, `Dàn cảnh`, `Soạn nội dung`, `Kiểm tra và phát hành`. |
| 2. Chuẩn hóa ngôn ngữ UI | P0 | Đã triển khai | Đã thêm dictionary label thân thiện và ẩn các thuật ngữ kỹ thuật khỏi luồng chính. |
| 3. Scene editor theo tabs | P0 | Đã triển khai | Tabs động theo loại scene, nhưng giữ chung trong `SceneEditorPanel.tsx` để tránh tách file quá vụn. |
| 4. Asset workflow theo ngữ cảnh | P0 | Triển khai một phần | Đã có asset tray theo scene và drag-drop ngay trên media field. Chưa có drag-drop trực tiếp vào canvas để tự tạo layer. |
| 5. Ẩn chế độ nâng cao | P0 | Đã triển khai | `Flow graph` và `Manifest JSON` được đẩy xuống bước review và ẩn mặc định. |
| 6. Thanh tiến độ và checklist | P1 | Đã triển khai | Có trạng thái theo bước, checklist review và đếm mức sẵn sàng trước publish. |
| 7. Tối ưu scene list | P1 | Đã triển khai | Có badge trạng thái, thumbnail, duplicate scene và rename trực tiếp. |
| 8. Preset theo môn học | P2 | Chưa triển khai | Giữ lại cho bước sau để tránh scope creep. |

### Những gì đã verify

- Build frontend thành công bằng `npm run build`.
- Smoke test trên preview build đã pass với tài khoản local `demo.teacher@example.com`.
- Flow đã kiểm tra gồm:
  - mở editor tạo mới
  - nạp dữ liệu mẫu
  - di chuyển qua stepper
  - mở workspace soạn cảnh
  - vào bước review
  - xác nhận `Chỉnh sửa nâng cao` bị ẩn mặc định và chỉ hiện khi mở ra

### Giới hạn còn lại sau vòng P0/P1

- Chưa hỗ trợ kéo thả file trực tiếp vào canvas để tự sinh image layer hoặc gán đúng slot theo điểm thả.
- `Attempts report` chưa tách sang route riêng; hiện chỉ được chuyển xuống bước `Kiểm tra và phát hành` và chỉ hiện khi đã có dữ liệu học sinh.
- Chưa thêm preset scene/template theo môn học.
- Không có thay đổi database; toàn bộ triển khai giữ nguyên contract backend hiện tại.

---

## Hiện trạng cần xử lý

File hiện tại: [frontend/src/pages/teacher/InteractiveBookEditor.tsx](</d:/Hackathon/EduHub/frontend/src/pages/teacher/InteractiveBookEditor.tsx>)

Các vấn đề chính:

- Một màn hình đang ôm quá nhiều việc: thông tin sách, biên soạn scene, flow graph, báo cáo attempts, upload asset, JSON nâng cao, publish.
- Scene editor bên phải quá dài, nhiều input nối tiếp nhau, khó quét và khó học.
- Vẫn lộ nhiều thuật ngữ mang tính kỹ thuật hơn là ngôn ngữ nghiệp vụ giáo viên.
- Khu vực upload tư liệu bị trùng vai trò với upload inline trong từng field.
- Logic UI, logic mapping manifest, upload, validation, render scene-specific form đang dồn vào một file rất lớn, khó maintain.

---

## Nguyên tắc thiết kế sau khi cải tiến

### 1. Tổ chức theo tiến trình công việc của giáo viên

UI phải đi theo câu hỏi tự nhiên của giáo viên:

1. Đây là cuốn sách gì?
2. Gồm những cảnh nào?
3. Trong từng cảnh có nội dung và tương tác gì?
4. Đã ổn để xem thử và phát hành chưa?

### 2. Progressive disclosure

Chỉ hiển thị thông tin phù hợp với ngữ cảnh hiện tại.

- Giáo viên phổ thông không cần thấy `JSON`, `flow graph`, `z-index`, `visibility rule` ngay từ đầu.
- Các phần nâng cao phải bị ẩn mặc định và chỉ mở khi cần.

### 3. Ưu tiên thao tác trực tiếp trong ngữ cảnh

- Upload và gán asset nên diễn ra ngay tại scene hoặc canvas đang chỉnh sửa.
- Không bắt người dùng tải file ở cuối trang rồi quay lại phần trên để gán.

### 4. Tách code theo “vùng trách nhiệm”, không tách theo từng input nhỏ

Không chia file quá vụn. Chỉ tách ở mức có ý nghĩa chức năng:

- điều phối page
- workstep theo luồng
- scene workspace
- scene detail forms
- advanced/review tools

---

## Phạm vi triển khai đề xuất

## P0 - Bắt buộc

### Hạng mục 1: Chuyển từ một trang dài sang editor nhiều bước

#### Mục tiêu

Thay vì hiển thị tất cả section trong một trang cuộn dài, chia editor thành 4 bước lớn:

1. `Thông tin sách`
2. `Dàn cảnh`
3. `Soạn nội dung`
4. `Kiểm tra và phát hành`

#### Cách hoạt động

- Hiển thị stepper hoặc tab cấp cao ở đầu trang.
- Người dùng có thể đi tuần tự hoặc nhảy sang bước khác.
- Giữ trạng thái editor trong cùng một route, không cần tách thành nhiều route con ở giai đoạn đầu.

#### Nội dung từng bước

##### Bước 1: Thông tin sách

Bao gồm:

- tên sách
- mô tả
- môn học
- khối lớp
- ảnh bìa
- thời lượng ước tính
- đưa vào thư viện hệ thống

Không hiển thị:

- scene list
- flow graph
- report
- JSON nâng cao

##### Bước 2: Dàn cảnh

Bao gồm:

- danh sách scene
- thêm scene mới
- kéo thả đổi thứ tự scene
- chọn entry scene
- mô tả ngắn từng scene

Không hiển thị form chỉnh sâu của scene.

Mục tiêu của bước này là để giáo viên sắp khung bài trước khi viết chi tiết.

##### Bước 3: Soạn nội dung

Bao gồm:

- scene list ở trái
- scene detail editor ở phải
- canvas
- upload và gán asset trong ngữ cảnh
- nội dung, media, interaction, câu hỏi, hiệu ứng

Đây là vùng làm việc chính.

##### Bước 4: Kiểm tra và phát hành

Bao gồm:

- checklist trước phát hành
- preview
- lỗi flow chặn publish
- warnings quan trọng
- publish / save draft / gán vào lớp

`Attempts report` không nên nằm trong flow tạo sách. Đề xuất chuyển sang màn hình riêng hoặc block phụ chỉ hiện sau khi sách đã có dữ liệu học sinh.

#### Acceptance criteria

- Người dùng có thể hoàn thành tạo sách mà không cần cuộn qua JSON hoặc report.
- Ở mỗi bước chỉ nhìn thấy thông tin liên quan đến mục tiêu của bước đó.
- Không có section nào của trang cũ còn bị lặp vai trò trong bước mới.

---

### Hạng mục 2: Chuẩn hóa lại ngôn ngữ UI cho giáo viên

#### Mục tiêu

Giảm cảm giác “công cụ dev”, tăng khả năng tự hiểu mà không cần đào tạo kỹ thuật.

#### Mapping đề xuất

| Hiện tại | Đề xuất |
| --- | --- |
| `Scene` | `Cảnh` hoặc `Phần nội dung` |
| `Entry scene` | `Cảnh bắt đầu` |
| `Next scene` | `Chuyển tiếp tới` |
| `Canvas layers` | `Lớp nội dung trên màn hình` |
| `Z-index` | `Lớp trên/dưới` |
| `Visibility rule` | `Khi nào xuất hiện?` |
| `Scene đích` | `Hành động tiếp theo` |
| `Graph View và Flow Safety` | `Kiểm tra luồng học` |
| `Blocking errors` | `Lỗi cần sửa trước khi phát hành` |
| `Warnings` | `Lưu ý nên kiểm tra` |
| `Manual reveal` | `Chỉ hiện khi được gọi` |
| `Open interaction` | `Mở câu hỏi / tương tác` |
| `Reveal layer` | `Hiện thêm nội dung` |

#### Hành động cụ thể

- Tạo một file dictionary nhãn để tránh hardcode rải rác trong JSX.
- Với các trường nâng cao vẫn cần giữ tên kỹ thuật trong code, chỉ đổi label hiển thị ở UI.
- Bổ sung helper text dưới các trường khó hiểu thay vì dùng tên kỹ thuật.

#### Acceptance criteria

- Giáo viên có thể hiểu các label chính mà không cần biết manifest hay runtime.
- Không còn từ như `Z-index`, `Visibility rule`, `Blocking errors` xuất hiện ở luồng chính.

---

### Hạng mục 3: Tổ chức lại Scene Editor bằng tabs theo ngữ cảnh

#### Mục tiêu

Giảm chiều dài của cột phải, gom nhóm trường theo mục đích sử dụng.

#### Cấu trúc tab đề xuất

Không nên dùng một bộ tab cứng cho mọi loại scene. Dùng tab chung ở mức vừa đủ, nhưng cho phép nội dung bên trong thay đổi theo loại scene.

##### Với scene `media`

Tab 1: `Nội dung chính`

- tên cảnh
- mô tả/lời dẫn
- ảnh hoặc video chính
- poster
- audio nền
- thời điểm phát audio nền

Tab 2: `Tương tác & câu hỏi`

- bật/tắt câu hỏi
- câu hỏi
- lựa chọn
- phản hồi
- điểm số
- chuyển tiếp theo đáp án

Tab 3: `Trình bày`

- canvas overlay
- text/image/button layer
- lớp trên/dưới
- kích thước
- khi nào xuất hiện
- hành động tiếp theo của button

##### Với scene `timeline`

Tab 1: `Nội dung chính`

- tên cảnh
- mô tả
- ảnh tổng quan
- audio nền

Tab 2: `Thẻ timeline`

- bật/tắt đồng bộ từ scenes
- preview danh sách thẻ

##### Với scene `connect_the_dots`

Tab 1: `Nội dung chính`

- tên cảnh
- mô tả
- ảnh nền

Tab 2: `Các điểm`

- canvas đặt điểm
- danh sách điểm
- chỉnh label, tọa độ, thứ tự

Tab 3: `Hoàn thành`

- scene sau khi hoàn thành
- điểm thưởng
- phạt khi sai
- hành vi khi sai

##### Với scene `slideshow`

Tab 1: `Nội dung chính`

- tên cảnh
- mô tả
- danh sách ảnh

Tab 2: `Âm thanh & trình chiếu`

- audio nền
- trigger audio

#### Hành động cụ thể

- Tạo một state `activeSceneTab`.
- Reset tab hợp lý khi đổi scene type hoặc đổi scene.
- Giữ `renderSceneEditor` làm nơi điều phối, nhưng tách phần render tab body ra component riêng.

#### Acceptance criteria

- Trong một thời điểm, giáo viên chỉ phải tập trung vào một nhóm input nhỏ.
- Không còn khối form kéo dài nhiều màn hình cho một scene phổ biến.

---

### Hạng mục 4: Đưa quản lý tư liệu về đúng ngữ cảnh chỉnh sửa

#### Mục tiêu

Loại bỏ hoặc thu gọn section `Tải lên tư liệu` ở cuối trang và thay bằng tương tác gần nơi sử dụng.

#### Cách triển khai theo giai đoạn

##### Giai đoạn 1

- Giữ upload inline trong từng field như hiện tại.
- Thay section `Tải lên tư liệu` cuối trang bằng `Tư liệu của cảnh hiện tại`.
- Chỉ hiển thị khi đang ở bước `Soạn nội dung`.
- Nếu có scene được chọn, hiển thị asset tray nhỏ ở cạnh phải hoặc dưới scene editor.

Asset tray cho phép:

- upload nhanh
- xem file vừa tải
- gán nhanh vào `ảnh chính`, `video chính`, `audio nền`, `ảnh layer`, `ảnh slideshow`

##### Giai đoạn 2

Thêm drag and drop có ngữ nghĩa rõ ràng:

- thả ảnh vào vùng media chính => gán làm ảnh chính
- thả video vào vùng media chính => gán làm video chính
- thả audio vào card audio => gán làm audio nền
- thả ảnh vào canvas khi đang chọn mode `Thêm ảnh` => tạo image layer mới
- thả ảnh vào danh sách slideshow => append vào mảng ảnh

Không nên làm kiểu “thả bất kỳ file nào vào canvas là tự hiểu”.

#### Hành động cụ thể

- Tái sử dụng `uploadFile` và `handleInlineUpload`.
- Thêm wrapper component xử lý drag state và mapping target.
- Mỗi drop zone phải có text gợi ý rõ ràng.

#### Acceptance criteria

- Giáo viên không cần cuộn xuống cuối trang để upload rồi quay lại phần trên.
- Upload xong có thể dùng ngay trong scene đang chỉnh.
- Không có case mơ hồ về việc thả file vào đâu để hệ thống tự đoán sai.

---

### Hạng mục 5: Ẩn chế độ nâng cao khỏi luồng chính

#### Mục tiêu

JSON và các công cụ debug/analysis chỉ hiện khi thật sự cần.

#### Đề xuất hiển thị

##### JSON nâng cao

- Mặc định đóng.
- Chuyển xuống cuối bước `Kiểm tra và phát hành`.
- Đổi tên thành `Chỉnh sửa nâng cao`.
- Chỉ mở rộng khi người dùng chủ động bấm.

##### Flow graph

- Không hiển thị như một section lớn mặc định trong luồng chính.
- Ở bước `Kiểm tra và phát hành`, thay bằng:
  - summary ngắn
  - danh sách lỗi/warning có thể click để nhảy tới scene
  - nút `Xem chi tiết luồng học`
- Graph card đầy đủ chỉ mở khi cần.

##### Attempts report

- Không đặt giữa flow biên soạn.
- Chỉ hiện khi sách đã publish và có dữ liệu attempts.
- Tốt nhất chuyển ra một tab hoặc màn hình `Báo cáo`.

#### Acceptance criteria

- Người dùng mới có thể tạo sách mà không phải đọc JSON hoặc graph.
- Các công cụ nâng cao vẫn tồn tại cho admin/dev hoặc tình huống xử lý lỗi.

---

## P1 - Nên làm sau khi hoàn thành P0

### Hạng mục 6: Bổ sung thanh tiến độ và trạng thái hoàn thiện

#### Mục tiêu

Cho giáo viên biết cuốn sách còn thiếu gì trước khi phát hành.

#### Nội dung

- Progress summary theo bước:
  - đã có thông tin sách chưa
  - đã có ít nhất 1 scene chưa
  - đã chọn entry scene chưa
  - có scene thiếu media không
  - có scene có câu hỏi nhưng chưa đủ lựa chọn không
- Hiển thị dạng checklist rõ ràng ở bước `Kiểm tra và phát hành`

#### Acceptance criteria

- Người dùng hiểu ngay còn thiếu gì mà không phải tự suy luận từ manifest warning.

---

### Hạng mục 7: Tối ưu thao tác với scene list

#### Nội dung

- Thêm trạng thái rõ trên từng scene card:
  - `Chưa đủ nội dung`
  - `Cần kiểm tra`
  - `Đã ổn`
- Hiển thị thumbnail nhỏ nếu scene có ảnh/video poster.
- Cho phép duplicate scene từ scene hiện tại.
- Cho phép rename trực tiếp từ scene list.

#### Acceptance criteria

- Scene list không chỉ là danh sách điều hướng, mà còn là nơi giúp giáo viên nhìn nhanh tiến độ soạn bài.

---

## P2 - Có thể làm sau

### Hạng mục 8: Mẫu scene và preset theo môn học

Ví dụ:

- `Cảnh kể chuyện có câu hỏi`
- `Cảnh xem video rồi trả lời`
- `Cảnh nối điểm`
- `Cảnh tổng kết`

Mục tiêu là giảm thao tác cấu hình lặp lại.

---

## Đề xuất tái cấu trúc code

## Mục tiêu tái cấu trúc

- giảm kích thước `InteractiveBookEditor.tsx`
- tách UI theo vùng nghiệp vụ rõ ràng
- giữ logic state đủ gần page để không tạo kiến trúc quá phức tạp
- tránh chia file theo từng field hoặc từng scene type nhỏ lẻ

## Nguyên tắc

- `InteractiveBookEditor.tsx` chỉ nên giữ vai trò page container và orchestration.
- Các component con nhận props rõ ràng, không tự fetch lung tung.
- Utility xử lý manifest, label, scene summary, asset target nên đưa ra file riêng.
- Không cần tạo store mới nếu state vẫn chủ yếu dùng cục bộ trong editor.

## Cấu trúc file sau khi refactor

```text
frontend/src/pages/teacher/
  InteractiveBookEditor.tsx

frontend/src/components/interactive-book/editor/
  AdvancedEditorPanel.tsx
  InteractiveBookEditorLayout.tsx
  InteractiveBookStepGeneral.tsx
  InteractiveBookStepReview.tsx
  InteractiveBookStepScenes.tsx
  InteractiveBookStepWorkspace.tsx
  MediaFieldCard.tsx
  SceneListPanel.tsx
  SceneEditorPanel.tsx

frontend/src/components/interactive-book/
  SceneLayerCanvas.tsx
  InteractiveBookPlayer.tsx

frontend/src/utils/
  interactiveBookEditorHelpers.ts
  interactiveBookEditorLabels.ts
```

## Giải thích mức tách file

Mức tách này là vừa đủ:

- Không giữ mọi thứ trong 1 file lớn.
- Không tách thành 15-20 file vụn kiểu mỗi tab một file, mỗi scene type một file.
- Các vùng nghiệp vụ có component riêng, nhưng vẫn dễ lần theo luồng.

## Trách nhiệm từng file

### `InteractiveBookEditor.tsx`

Giữ:

- load dữ liệu
- sync form với bundle
- save draft
- publish
- assign to class
- preview mode
- state lớn của editor

Không nên tiếp tục giữ:

- toàn bộ JSX của 4 bước
- toàn bộ render functions của scene editor
- label mapping
- helper format/summarize

### `InteractiveBookEditorLayout.tsx`

Chịu trách nhiệm:

- header editor
- step navigation
- action buttons theo bước
- layout khung tổng thể

### `InteractiveBookStepGeneral.tsx`

Chứa form thông tin sách.

### `InteractiveBookStepScenes.tsx`

Chứa:

- entry scene
- add scene
- reorder scene
- scene list overview

### `InteractiveBookStepWorkspace.tsx`

Chứa:

- scene list bên trái
- scene đang chọn
- asset tray theo scene
- scene editor panel

Đây là vùng làm việc chính.

### `SceneEditorPanel.tsx`

Chứa logic điều phối form scene theo scene type:

- header scene
- tab selector
- body tab theo loại scene

### `MediaFieldCard.tsx`

Wrapper dùng lại cho:

- upload file trong ngữ cảnh scene
- nhập external URL
- drag-drop trực tiếp vào đúng field media
- hiển thị preview và thao tác đổi/xóa tệp

File này giúp tránh lặp lại nhiều block upload giống nhau trong `SceneEditorPanel.tsx`.

### `InteractiveBookStepReview.tsx`

Chứa:

- checklist
- preview shortcut
- flow issues summary
- publish actions
- optional graph detail
- optional JSON nâng cao

### `AdvancedEditorPanel.tsx`

Chứa:

- JSON nâng cao
- graph detail
- các công cụ dành cho admin/dev

### Ghi chú về mức tách thực tế

- Không tạo `SceneEditorTabs.tsx` riêng.
- Lý do: phần tab đã đủ lớn để cần tách về mặt trách nhiệm, nhưng chưa đủ độc lập để tách tiếp thành nhiều file con mà không làm props phình to.
- Hiện tại giữ tab selector và tab body trong `SceneEditorPanel.tsx` là điểm cân bằng hợp lý giữa độ rõ ràng và khả năng maintain.

## Utility nên tách ra

### `interactiveBookEditorLabels.ts`

Chứa:

- mapping label thân thiện
- text mô tả scene type
- text cho trigger/action

### `interactiveBookEditorHelpers.ts`

Chứa:

- `summarizeScene`
- `getAssetTargetsForScene`
- `isAssetCompatibleWithTarget`
- `inferSceneImage`
- `getSceneMediaKind`
- `isQuestionEnabled`
- các helper format text đơn giản

Không nên để các helper render-independent tiếp tục nằm trong page component.

---

## Chiến lược refactor an toàn

### Bước 1: Refactor không đổi UX

Mục tiêu:

- tách helpers
- tách layout lớn
- giữ nguyên hành vi hiện tại

Việc làm:

- chuyển utility ra file riêng
- chuyển section `Thông tin chung`
- chuyển section `Biên soạn theo sự kiện`
- chuyển `JSON nâng cao`

### Bước 2: Thêm stepper cấp trang

Mục tiêu:

- thay đổi IA nhưng ít đụng logic manifest

Việc làm:

- thêm `activeStep`
- render theo step
- di chuyển flow graph và publish vào step review

### Bước 3: Tab hóa scene editor

Mục tiêu:

- thu gọn cột phải

Việc làm:

- tạo `activeSceneTab`
- map nội dung tab theo scene type
- giữ lại logic update scene hiện tại

### Bước 4: Refactor asset workflow

Mục tiêu:

- bỏ section upload cuối trang hoặc biến nó thành asset tray trong workspace

Việc làm:

- tái sử dụng logic upload hiện có
- thêm drop zone theo ngữ cảnh

---

## Những phần có thể giữ nguyên để tránh scope creep

- `InteractiveBookPlayer.tsx`
- `SceneLayerCanvas.tsx` về cơ bản có thể giữ, chỉ cần mở rộng nếu thêm drop target
- `interactiveBookFlow.ts`
- service gọi API hiện tại
- kiểu dữ liệu manifest hiện tại

Không nên đổi data model lớn ở vòng đầu nếu mục tiêu chính là UX editor.

---

## Đề xuất thứ tự implement

### Sprint 1

- tách utility và layout khỏi `InteractiveBookEditor.tsx`
- thêm stepper 4 bước
- chuyển flow graph, JSON, publish sang bước review
- chuẩn hóa label phi kỹ thuật

### Sprint 2

- tab hóa scene editor
- làm scene workspace gọn hơn
- thêm trạng thái scene card

### Sprint 3

- thay asset section cuối trang bằng asset tray theo scene
- thêm drag and drop có ngữ nghĩa
- cân nhắc tách attempts report ra màn hình riêng

---

## Definition of Done

Một bản cải tiến được xem là hoàn thành khi đạt các điều kiện sau:

- Giáo viên mới có thể tạo một interactive book đơn giản mà không cần mở JSON.
- Màn hình editor không còn là một trang cuộn dài chứa mọi thứ.
- Scene editor của một scene phổ biến không còn là một form kéo dài quá nhiều nhóm input liên tiếp.
- Các nhãn chính dùng ngôn ngữ gần với nghiệp vụ dạy học hơn là ngôn ngữ kỹ thuật.
- Upload và gán tư liệu diễn ra ngay trong bước soạn nội dung.
- `InteractiveBookEditor.tsx` giảm đáng kể trách nhiệm render và helper logic.
- Cấu trúc file mới vẫn đủ gọn để một dev có thể lần theo luồng mà không bị lạc qua quá nhiều file.

---

## Gợi ý phạm vi PR

Để review dễ hơn, nên chia thành các PR nhỏ theo lớp thay đổi:

1. `refactor/editor-helpers-and-layout`
2. `feat/editor-stepper`
3. `feat/scene-editor-tabs`
4. `feat/contextual-asset-workflow`
5. `feat/review-and-advanced-panels`

Không nên gộp toàn bộ refactor + UX overhaul + drag-drop vào một PR quá lớn.

---

## Kết luận

Trọng tâm của đợt cải tiến này không phải thêm thật nhiều tính năng mới, mà là sắp xếp lại trải nghiệm để giáo viên thao tác theo đúng luồng tư duy của họ. Về kỹ thuật, hướng tốt nhất là:

- giữ nguyên data model và runtime ở giai đoạn đầu
- tái cấu trúc editor theo step và panel
- gom logic dùng chung ra helper
- chỉ tách file ở mức theo vùng nghiệp vụ

Đây là phương án cân bằng giữa tốc độ triển khai, độ an toàn khi refactor và khả năng maintain lâu dài.
