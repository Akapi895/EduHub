đối chiếu frontend-ui-analysis-and-proposal-gap.md và story-proposal.md với hệ thống hiện tại để biết đã hoàn thiện những gì, sau đó, hoàn thiện nốt những cải thiện cần thiết cho sách tương tác (bỏ qua những phase liên quan đến gamification và VR/3D)

# Tổng hợp hệ thống giao diện website EduHub

Tài liệu này được lập để hiểu hiện trạng frontend cho hai vai trò `teacher` và `student`, sau đó dùng `docs/story-proposal.md` làm mục tiêu đối chiếu. Phần hiện trạng bên dưới được tổng hợp trước khi đọc proposal.

## 1. Phạm vi khảo sát hiện trạng

- Frontend nằm tại `frontend`, dùng Vite + React 18 + TypeScript.
- Điều hướng dùng `react-router-dom` với route tách theo vai trò tại `frontend/src/routes/index.tsx`.
- UI dùng Tailwind CSS, icon từ `lucide-react`, state client bằng Zustand, HTTP bằng Axios.
- Các nhóm màn hình chính đã khảo sát:
  - Auth: đăng nhập, đăng ký.
  - Layout chung: sidebar, navbar, thông báo, hộp thư.
  - Teacher: dashboard, lớp học, chi tiết lớp, thư viện, chi tiết tài liệu, tạo/chỉnh đề thi, chấm bài, sách tương tác, cài đặt.
  - Student: dashboard, lớp học, chi tiết lớp, thư viện, danh sách bài thi, làm bài/xem lại bài, sách tương tác, AI chatbot, hộp thư, cài đặt.

## 2. Kiến trúc frontend hiện tại

### 2.1 Tech stack và cấu trúc

- `package.json` khai báo app `eduhub-frontend`, script chính gồm `dev`, `build`, `preview`.
- Dependency chính:
  - `react`, `react-dom`.
  - `react-router-dom` cho routing.
  - `axios` cho API.
  - `zustand` cho auth/chat/notification/class/exam state.
  - `tailwindcss`, `classnames`, `lucide-react`.
- Alias import dạng `@/...` được dùng xuyên suốt frontend.
- Styling tập trung ở `frontend/src/index.css` và `frontend/tailwind.config.js`.
- Theme hiện tại thiên về dashboard educational:
  - Primary blue `#3B82F6`.
  - Background xám nhạt `#F3F4F6`.
  - Card trắng, border xám nhạt.
  - Accent pink/purple/mint/yellow.
  - Card bo `20px`, button bo `12px`.
  - Font family dự kiến `Be Vietnam Pro`, `Nunito`, `sans-serif`.

### 2.2 Routing

Route auth:

- `/login`
- `/register`
- `/` redirect về `/login`
- `*` render NotFound

Route teacher:

- `/teacher/dashboard`
- `/teacher/library/system`
- `/teacher/library/personal`
- `/teacher/library/:id`
- `/teacher/interactive-books/new`
- `/teacher/interactive-books/:id`
- `/teacher/classes`
- `/teacher/classes/:id`
- `/teacher/classes/:classId/exams/create`
- `/teacher/exams/:id`
- `/teacher/exams/:examId/submissions/:submissionId`
- `/teacher/inbox`
- `/teacher/settings`

Route student:

- `/student/dashboard`
- `/student/classes`
- `/student/classes/:id`
- `/student/library`
- `/student/library/:id`
- `/student/exam/:id`
- `/student/exams/:id`
- `/student/exams`
- `/student/interactive-books/:id`
- `/student/interactive-books/:id/scenes/:sceneId`
- `/student/inbox`
- `/student/chatbot`
- `/student/settings`

Điểm đã làm được:

- Có phân vùng route rõ cho teacher và student.
- Sách tương tác được lazy-load bằng `React.lazy` và `Suspense`.
- Có route scene-level cho student interactive book, hỗ trợ URL theo từng cảnh.

Điểm cần chú ý của hiện trạng:

- Chưa thấy route guard rõ ràng ở tầng router. `DashboardLayout` dựa vào `auth.store` để chọn menu, còn việc chặn truy cập phụ thuộc chủ yếu vào API 401 và interceptor.
- Nếu chưa có user trong store nhưng vào dashboard, sidebar sẽ mặc định dùng menu student vì `user?.role === 'teacher' ? teacherMenu : studentMenu`.

### 2.3 Layout chung

`DashboardLayout`:

- Dùng sidebar cố định trái và navbar sticky trên cùng.
- Nội dung chính nằm trong `<main className="p-6">`.
- Sidebar có trạng thái collapsed nhưng nút toggle trong navbar chỉ hiện `lg:hidden`; layout vẫn dùng margin cố định `ml-[240px]` hoặc `ml-[72px]`.

`Sidebar`:

- Teacher menu gồm Trang chủ, Thư viện có submenu hệ thống/cá nhân, Lớp học, Hộp thư, Cài đặt.
- Student menu gồm Trang chủ, Lớp học, Thư viện, Bài thi, Hộp thư, Trợ lý AI, Cài đặt.
- Có badge unread cho hộp thư, polling `/conversations/unread-count` mỗi 15 giây.
- Có thông tin user ở cuối sidebar.

`Navbar`:

- Có nút menu, notification bell, avatar/tên user, logout.
- Logout xóa auth store và chuyển về `/login`.

`NotificationBell`:

- Poll unread notification mỗi 15 giây.
- Khi mở dropdown, tải danh sách notification và poll mỗi 5 giây.
- Cho phép mark-as-read từng notification hoặc mark all read.
- Nếu notification có `link`, click sẽ navigate tới link đó.

Điểm đã làm được:

- Layout nhất quán cho hai vai trò.
- Sidebar theo vai trò và có submenu thư viện cho giáo viên.
- Có thông báo và hộp thư realtime nhẹ bằng polling.
- Có loading state và dropdown notification đầy đủ ở mức cơ bản.

Điểm cần chú ý:

- Responsive dashboard chưa hoàn chỉnh: sidebar fixed width và margin left cố định có thể gây tràn trên mobile/tablet.
- Dùng nhiều `alert()` và `window.confirm()` thay vì toast/modal nhất quán.
- Polling xuất hiện ở nhiều component, chưa có chiến lược tập trung hoặc cleanup nâng cao cho realtime.

### 2.4 State, API, service

`api.ts`:

- Axios base URL là `${VITE_API_URL || ''}/api/v1`.
- Request interceptor gắn Bearer token từ Zustand auth store.
- Response interceptor xử lý 401 bằng logout và redirect `/login`.

Stores:

- `auth.store.ts`: persist user/token/isAuthenticated, login/logout/updateUser.
- `notification.store.ts`: unread notification count.
- `chat.store.ts`: unread chat count.
- `class.store.ts`: classes/currentClass/chapters/students, hiện không được dùng đồng bộ rộng rãi trong page.
- `exam.store.ts`: exams/currentExam/questions/submissions, hiện nhiều page vẫn dùng local state trực tiếp.

Services:

- `auth.service.ts`: login/register/me/logout.
- `dashboard.service.ts`: teacher/student dashboard.
- `class.service.ts`: CRUD class, join class, students, chapters, materials, exams, material views.
- `library.service.ts`: material CRUD, folders, copy/share/save, recordView.
- `exam.service.ts`: exam/questions/submissions/start/submit/grade.
- `chat.service.ts`: conversations, contacts, messages, chatbot.
- `notification.service.ts`: notification list/count/read.
- `interactive-book.service.ts`: create/update draft/publish/get/start attempt/checkpoint/events/complete.

Điểm đã làm được:

- Service layer đã chia theo domain khá rõ.
- Có local persisted auth.
- Có API support đủ cho nhiều flow phức tạp: bài thi nhiều lượt, chấm tự luận, thư viện cá nhân/hệ thống, tracking xem tài liệu, interactive book checkpoint/event.

Điểm cần chú ý:

- Một số store domain chưa được tận dụng; local state rải rác làm khó đồng bộ dữ liệu khi nhiều màn hình thay đổi cùng resource.
- Error handling chưa thống nhất; phần lớn catch chỉ `alert()` hoặc set empty list.
- Chưa thấy abstraction chung cho loading/error/empty state.

## 3. Component UI dùng chung

### 3.1 Common components

- `Button`: variant primary/secondary/danger/ghost, size sm/md/lg, loading spinner.
- `Card`: card trắng, shadow, hover scale nếu `hoverable`.
- `Input`: label/error/icon, focus ring.
- `Modal`: overlay, close on backdrop, lock body scroll, size sm/md/lg.
- `Badge`: variant blue/pink/purple/mint/yellow/gray/red.
- `Table`: generic table đơn giản, empty state.
- `SettingsPage`: form avatar/profile/password, dùng chung teacher/student; teacher có thêm bio.

Điểm đã làm được:

- Có bộ component cơ sở đủ cho dashboard CRUD.
- Visual language khá nhất quán: card trắng, rounded, shadow, blue primary, badge màu pastel.

Điểm cần chú ý:

- Nhiều page vẫn viết input/select/card/table inline thay vì dùng common component triệt để.
- Card hover scale được dùng rộng; có thể gây layout shift nhẹ ở grid.
- Chưa thấy chuẩn accessibility rõ cho modal focus trap, aria label, keyboard navigation.

### 3.2 Card domain

`ClassCard`:

- Hiển thị thumbnail/lớp, giáo viên, số học sinh/tài liệu/đề.
- Dùng cho dashboard và list lớp cả teacher/student.

`MaterialCard`:

- Hiển thị thumbnail, badge loại tài liệu, subject, ngày tạo.
- Hỗ trợ interactive book badge/status/duration.
- Có menu ba chấm cho personal/system mode:
  - Xóa khỏi thư mục.
  - Tạo bản sao vào thư mục.
  - Chia sẻ vào thư viện chung.
  - Lưu về thư viện cá nhân.
  - Xóa tài liệu.
- Có drag data `materialId` để thả vào folder, trừ interactive book.

`ExamCard`:

- Hiển thị thumbnail, trạng thái đề thi, trạng thái học sinh, class name, mô tả, thời gian, số câu, best score.

Điểm đã làm được:

- Các resource chính đều có card tái sử dụng.
- Badge trạng thái giúp học sinh/giáo viên nhận biết nhanh.
- MaterialCard đã bao phủ nhiều action thư viện.

Điểm cần chú ý:

- Student Library label type `interactive_book` đang là `Sach tuong tac` không dấu, khác các nơi còn lại.
- `MaterialDetail` chưa có badge cho `interactive_book` trong `typeBadge`, nhưng interactive book được redirect sang editor/player nên ít lộ.

## 4. Hệ thống Teacher hiện tại

### 4.1 Teacher Dashboard

Màn hình: `frontend/src/pages/teacher/Dashboard.tsx`

Đã làm được:

- Gọi `/dashboard/teacher`.
- Thống kê:
  - Tổng lớp học.
  - Tổng học sinh.
  - Tổng đề thi.
  - Bài chờ chấm điểm.
- Section “Cần xử lý” cho bài nộp chưa chấm.
- Section “Bài thi sắp tới”.
- Section “Các lớp học”, hiển thị tối đa 4 lớp bằng `ClassCard`.
- CTA tạo lớp mới.

Nhận xét:

- Dashboard đã phản ánh công việc giáo viên: theo dõi lớp, bài thi, bài cần chấm.
- Chưa thấy biểu đồ, phân tích tiến độ học tập hay cảnh báo sâu theo lớp/học sinh.

### 4.2 Teacher Classes

Màn hình: `frontend/src/pages/teacher/Classes.tsx`

Đã làm được:

- Danh sách lớp giáo viên quản lý.
- Tìm kiếm lớp bằng debounce.
- Modal tạo lớp mới gồm tên, mô tả, thumbnail upload.
- Sau khi tạo lớp, chuyển tới chi tiết lớp mới.
- Loading và empty state cơ bản.

### 4.3 Teacher Class Detail

Màn hình: `frontend/src/pages/teacher/ClassDetail.tsx`

Đã làm được:

- Header lớp có tên, mô tả, mã lớp, copy mã lớp.
- Stats: số học sinh, chương, bài kiểm tra.
- Tab:
  - Tài liệu.
  - Bài kiểm tra.
  - Học sinh.
  - Cài đặt.
- Tab tài liệu:
  - Danh sách chương.
  - Thêm chương.
  - Trong mỗi chương có thể thêm/gỡ tài liệu.
  - Có tracking lượt xem tài liệu theo học sinh nếu có `student_count`.
- Tab bài kiểm tra:
  - Danh sách đề thi bằng `ExamCard`.
  - CTA tạo bài kiểm tra.
- Tab học sinh:
  - Bảng học sinh, email, ngày tham gia.
  - Có action gỡ học sinh khỏi lớp.
- Tab cài đặt:
  - Sửa tên/mô tả lớp.
  - Xóa lớp.

Nhận xét:

- Quản lý lớp khá đầy đủ ở mức LMS cơ bản.
- Chương/tài liệu/bài thi/học sinh được đặt cùng một nơi, phù hợp flow giáo viên.
- Chưa có quản trị vai trò trợ giảng, batch import học sinh, hoặc dashboard riêng theo tiến độ từng chương.

### 4.4 Teacher Library

Màn hình: `frontend/src/pages/teacher/Library.tsx`

Đã làm được:

- Có 2 mode:
  - Thư viện hệ thống.
  - Thư viện cá nhân.
- Filter:
  - Search debounce.
  - Loại tài liệu: sách, đề thi, video, tham khảo, tài liệu, sách tương tác.
  - Môn học.
- Personal library:
  - Tạo thư mục.
  - Xem thư mục bằng query `?folder=`.
  - Xóa thư mục.
  - Drag-and-drop material vào folder để copy.
  - Upload tài liệu.
  - Tạo sách tương tác.
  - Share tài liệu vào thư viện hệ thống.
  - Xóa tài liệu.
  - Lưu/copy material giữa folder.
- System library:
  - Xem tài liệu hệ thống.
  - Lưu tài liệu về thư viện cá nhân, có chọn folder.

Nhận xét:

- Thư viện là một trong các phần giàu tính năng nhất.
- Đã hỗ trợ cả quản lý cá nhân và chia sẻ hệ thống.
- Interactive book được đưa vào thư viện như một material type.

### 4.5 Material Detail

Màn hình: `frontend/src/pages/teacher/MaterialDetail.tsx`, route dùng chung với student.

Đã làm được:

- Hiển thị thumbnail, title, description, subject, grade, ngày tạo.
- Với video: render `<video controls>`.
- Với PDF: render `<iframe>`.
- Với file khác: hiển thị link download.
- Teacher:
  - Owner có thể xóa/chỉnh sửa metadata.
  - Có thể thêm tài liệu vào lớp/chương.
- Nếu material là `interactive_book`, tự redirect sang route interactive book tương ứng.

Nhận xét:

- Đủ cho xem tài liệu cơ bản.
- Chưa có viewer nâng cao cho nhiều định dạng, annotation, bookmark, comment hoặc trạng thái học tập trong tài liệu.

### 4.6 Teacher Exam Flow

Màn hình:

- `CreateExam.tsx`
- `ExamDetail.tsx`
- `SubmissionReview.tsx`
- `QuestionEditor.tsx`

Đã làm được:

- Tạo đề thi từ lớp với title, mô tả, thời gian bắt đầu/kết thúc.
- Sau tạo, chuyển sang màn chi tiết đề để thêm câu hỏi.
- `ExamDetail` có tab:
  - Câu hỏi.
  - Cài đặt.
  - Kết quả.
- Câu hỏi:
  - Thêm câu hỏi mới.
  - Sửa nội dung, điểm, loại câu hỏi.
  - Hỗ trợ trắc nghiệm 1 đáp án, nhiều đáp án, tự luận, nối cột trong UI editor.
  - Xóa câu hỏi.
  - Lưu exam settings và từng câu hỏi.
- Cài đặt:
  - Ngày bắt đầu/kết thúc.
  - Thời gian làm bài.
  - Trộn câu hỏi.
  - Số lượt làm tối đa.
  - Cho phép xem lại bài.
  - Chính sách hiển thị đáp án đúng: never, after_attempts, after_deadline, after_all_complete.
- Kết quả:
  - Bảng submissions, trạng thái, ngày bắt đầu/nộp, điểm, link chi tiết.
- Chấm bài:
  - Hiển thị từng câu và câu trả lời học sinh.
  - Trắc nghiệm/nối cột có đánh dấu đúng/sai.
  - Tự luận có input chấm điểm và lưu điểm từng answer.
  - Tổng điểm/status submission cập nhật sau khi chấm.

Nhận xét:

- Exam flow đã vượt mức CRUD cơ bản, có nhiều lượt làm và review policy.
- Chưa thấy upload ảnh cho câu hỏi `image_upload` ở UI dù type tồn tại trong constants/type.
- Chưa có drag reorder câu hỏi thực sự, dù có icon grip.
- Chưa thấy autosave đề thi hoặc validation sâu trước khi publish/mở đề.

### 4.7 Teacher Interactive Book Editor

Màn hình: `frontend/src/pages/teacher/InteractiveBookEditor.tsx`

Đã làm được:

- Tạo hoặc chỉnh sửa sách tương tác như một material.
- Có draft/published workflow:
  - Lưu bản nháp.
  - Phát hành.
  - Nếu ở preview/read-only có trạng thái readonly.
- Có thông tin chung:
  - Title, description, subject, grade, thumbnail, estimated duration, is_system.
  - Chọn cảnh bắt đầu.
- Có manifest editor theo sự kiện/cảnh:
  - Scene types: timeline, interactive video, hotspot audio, branching, quiz, slideshow, mini game, VR scene.
  - Tạo scene mặc định theo loại.
  - Chọn scene, sửa nội dung scene.
  - Kéo thả để đổi thứ tự scene.
  - Xóa scene.
  - Timeline có khả năng tự sync cards từ các scene.
- Có checklist manifest trước khi lưu/phát hành:
  - Trùng id cảnh.
  - Entry scene không tồn tại.
  - Scene thiếu title.
  - Next scene trỏ sai.
  - Video scene thiếu video.
  - Hotspot thiếu ảnh/audio/câu hỏi nối tiếp.
  - Quiz/branching thiếu choices.
  - Slideshow thiếu ảnh.
  - Choice trỏ tới scene không tồn tại.
- Có upload asset:
  - Thumbnail.
  - Asset cho sự kiện: image/video/audio/file.
  - Gán asset vào vị trí phù hợp theo scene type: ảnh tổng quan, ảnh nền, video chính, poster, background audio, audio hotspot, ảnh slideshow.
- Có JSON nâng cao cho người dùng kỹ thuật.
- Có preview bằng `InteractiveBookPlayer`.
- Có action nạp mẫu 5 sự kiện.
- Có modal gán sách tương tác đã phát hành vào lớp/chương.

Nhận xét:

- Đây là module giàu tính năng nhất và đã có tư duy authoring tool tương đối rõ.
- Vẫn còn một phần dựa vào manifest JSON; UX cho giáo viên phổ thông có thể còn phức tạp.
- Mini game và VR scene hiện mới là loại cảnh/placeholder cấu hình, chưa thấy runtime chuyên sâu tương ứng ngoài hiển thị visual/text cơ bản.

### 4.8 Teacher Inbox và Settings

Inbox:

- Dùng `InboxPage`.
- Teacher subtitle là tin nhắn với học sinh.
- Có danh sách conversation, search, unread badge, polling conversation/message.
- Có modal tạo tin nhắn mới từ contacts.
- ChatWindow hiển thị message bubbles và input gửi text.

Settings:

- Dùng `SettingsPage showBio`.
- Update avatar, full name, phone, bio.
- Change password.

Nhận xét:

- Hộp thư đã đủ cho chat 1-1 text.
- Chưa có file attachment trong UI dù service `sendMessage` có `file_url`.
- Chưa có typing indicator/read receipt chi tiết.

## 5. Hệ thống Student hiện tại

### 5.1 Student Dashboard

Màn hình: `frontend/src/pages/student/Dashboard.tsx`

Đã làm được:

- Gọi `/dashboard/student`.
- Greeting theo giờ và tên học sinh.
- Stats:
  - Lớp học.
  - Đã hoàn thành.
  - Điểm trung bình.
  - Bài cần làm.
- Section “Bài thi cần làm” hiển thị tối đa 6 bài.
- Section “Kết quả gần đây” có điểm và trạng thái.
- Section “Lớp học của em” hiển thị tối đa 4 lớp.

Nhận xét:

- Dashboard tập trung vào việc học sinh cần làm và kết quả gần đây.
- Chưa có lộ trình học, tiến độ theo kỹ năng/chương, streak hoặc đề xuất học tiếp.

### 5.2 Student Classes

Màn hình: `frontend/src/pages/student/Classes.tsx`

Đã làm được:

- Danh sách lớp học sinh đang tham gia.
- Tìm kiếm lớp bằng debounce.
- Modal nhập mã lớp để tham gia.
- Sau join, refresh danh sách.

### 5.3 Student Class Detail

Màn hình: `frontend/src/pages/student/ClassDetail.tsx`

Đã làm được:

- Header lớp, mô tả, giáo viên.
- Stats: giáo viên, sĩ số, số chương, số bài kiểm tra.
- Tab:
  - Tài liệu.
  - Bài kiểm tra.
- Tài liệu:
  - Dùng `ChapterSection` ở chế độ readOnly.
  - Khi click tài liệu, gọi record view rồi navigate.
  - Interactive book mở sang player với `classId`.
- Bài kiểm tra:
  - Dùng `ExamCard`.
  - Navigate sang `/student/exam/:id?from=class&classId=...`.

Nhận xét:

- Học sinh có nơi xem tài liệu và bài thi theo lớp.
- Chưa có phần thảo luận lớp, thông báo lớp, bài tập ngoài exam hoặc tiến độ đọc theo chương.

### 5.4 Student Library

Màn hình: `frontend/src/pages/student/Library.tsx`

Đã làm được:

- Xem thư viện tài liệu hệ thống và tài liệu từ lớp tham gia.
- Search debounce.
- Filter theo type và subject.
- Mở material bằng `getMaterialRoute`; interactive book chuyển sang player.

Nhận xét:

- Student library đơn giản, phù hợp vai trò tiêu thụ nội dung.
- Chưa có lưu yêu thích, lịch sử xem, lọc theo lớp/chương, tiếp tục học interactive book từ library list.

### 5.5 Student Exam Flow

Màn hình:

- `Exam.tsx`
- `ExamStartScreen.tsx`
- `ExamHistoryView.tsx`
- `ExamTakingView.tsx`
- `ExamReviewView.tsx`

Đã làm được:

- Màn danh sách bài thi `/student/exams` tách “Chưa làm” và “Đã làm”.
- Màn exam chính có state machine:
  - loading.
  - history.
  - start-confirm.
  - taking.
  - review.
  - submitted.
- Khi load exam:
  - Lấy thông tin exam và submission history.
  - Resume in-progress submission nếu exam còn open.
  - Restore answers từ `localStorage`.
  - Nếu hết lượt làm và review allowed, tự mở review latest submission.
- Bắt đầu lượt làm:
  - Gọi `startExam`.
  - Load questions.
  - Tính deadline từ end_time và duration_minutes.
- Làm bài:
  - Timer countdown và auto-submit khi hết giờ.
  - Progress answered count.
  - Navigator câu hỏi desktop.
  - Mobile bottom submit bar.
  - Hỗ trợ single choice, multi choice, text, matching.
  - Lưu câu trả lời localStorage theo exam id.
  - Modal confirm nộp bài, liệt kê câu chưa làm.
- Sau nộp:
  - Hiển thị điểm nếu backend trả total_score.
  - Xóa localStorage answers.
  - Có nút xem lịch sử.
- Review:
  - Hiển thị đáp án học sinh, điểm từng câu.
  - Có chính sách show correct answer theo backend.
  - Navigator câu hỏi và màu đúng/sai.

Nhận xét:

- Student exam flow khá hoàn chỉnh.
- `image_upload` chưa có UI làm bài/chấm bài đầy đủ dù type tồn tại.
- Không thấy cảnh báo/tab visibility, chống gian lận, hoặc autosave server-side từng câu; chỉ localStorage trước khi submit.

### 5.6 Student Interactive Book Player

Màn hình: `frontend/src/pages/student/InteractiveBook.tsx`

Đã làm được:

- Khi mở sách, gọi `startAttempt(materialId, classId)`.
- Hỗ trợ resume attempt, review completed attempt.
- Xác định scene hợp lệ từ URL `sceneId`.
- Build URL theo scene để điều hướng replace mà vẫn giữ `classId`.
- Gọi `InteractiveBookPlayer` với:
  - manifest.
  - initial scene.
  - state snapshot.
  - score summary.
  - completion percent.
  - autosave key localStorage.
  - callback checkpoint.
  - callback complete.
  - callback log events.
  - callback scene change.
- Nếu attempt completed, player ở reviewOnly.

`InteractiveBookPlayer` đã làm được:

- Runtime state gồm phase, currentSceneId, history, visited scenes, branch history, interaction results, media progress, score summary.
- Autosave localStorage mỗi khi state thay đổi.
- Checkpoint backend theo interval.
- Event queue và flush backend theo batch/interval.
- Scene render:
  - timeline/tổng quan có cards.
  - interactive video.
  - hotspot audio.
  - branching/quiz.
  - slideshow.
  - fallback image/text cho scene khác.
- Interaction panel:
  - Hiển thị trạng thái, tiến độ, điểm, sync.
  - Mở interaction choices.
  - Feedback text/image/audio.
  - Retry/continue logic.
- Navigation:
  - Back theo history.
  - Về tổng quan.
  - Cảnh tiếp theo.
  - Hoàn thành.
- Complete attempt gọi backend và xóa checkpoint local.

Nhận xét:

- Runtime sách tương tác đã có nền tảng mạnh: progress, checkpoint, events, branching, media, scoring.
- Các loại scene mini game/VR chưa có trải nghiệm chuyên biệt rõ như tên gọi.
- Chưa thấy dashboard phân tích dữ liệu event/attempt cho teacher trong UI.

### 5.7 Student Chatbot, Inbox, Settings

Chatbot:

- Màn chat riêng `/student/chatbot`.
- Có gợi ý câu hỏi.
- Gửi câu hỏi tới `/chatbot/ask`.
- Hiển thị typing indicator và message bubbles.

Inbox:

- Dùng `InboxPage`, subtitle “Tin nhắn với giáo viên và bạn học”.
- Có hiển thị role contact.
- Chat 1-1 text giống teacher.

Settings:

- Dùng `SettingsPage` không có bio.

Nhận xét:

- Có AI assistant cơ bản cho học sinh.
- Chưa thấy context-aware chatbot theo tài liệu/lớp/bài thi hiện tại.
- Chưa có lịch sử conversation AI persisted trong frontend, vì messages chỉ ở local state của page.

## 6. Những gì giao diện website hiện tại đã làm được

### 6.1 Nền tảng LMS hai vai trò

- Đăng ký/đăng nhập theo role teacher/student.
- Dashboard riêng cho từng vai trò.
- Sidebar và route riêng theo vai trò.
- Cài đặt hồ sơ người dùng.
- Thông báo và hộp thư nội bộ.

### 6.2 Quản lý lớp học

- Teacher tạo/sửa/xóa lớp.
- Student tham gia lớp bằng mã.
- Teacher xem mã lớp và copy.
- Teacher quản lý học sinh trong lớp.
- Cả hai vai trò xem chi tiết lớp.
- Lớp có chương, tài liệu và bài kiểm tra.

### 6.3 Quản lý thư viện/tài liệu

- Teacher có thư viện cá nhân và thư viện hệ thống.
- Teacher upload tài liệu, tạo folder, copy/lưu/share/xóa.
- Teacher gán tài liệu vào lớp/chương.
- Student xem thư viện và tài liệu theo lớp.
- Hỗ trợ xem video/PDF/download file.
- Có tracking học sinh đã xem tài liệu trong lớp.

### 6.4 Hệ thống bài thi

- Teacher tạo đề, thêm/sửa/xóa câu hỏi, cấu hình thời gian/lượt làm/review/đáp án.
- Teacher xem kết quả và chấm bài tự luận.
- Student xem danh sách bài thi, làm bài có timer, nộp bài, xem lịch sử và review.
- Hỗ trợ câu hỏi trắc nghiệm 1 đáp án, nhiều đáp án, tự luận, nối cột.

### 6.5 Sách tương tác

- Teacher tạo/chỉnh sách tương tác, lưu nháp, phát hành, xem thử, gán vào lớp.
- Teacher có authoring UI theo scene và JSON nâng cao.
- Student mở sách tương tác, tiếp tục tiến trình, hoàn thành, xem lại.
- Player có timeline, video, hotspot/audio, branching, quiz, slideshow, checkpoint, event logging và scoring.

### 6.6 Chat và AI

- Chat 1-1 giữa user qua hộp thư, có unread badge và polling.
- Student có AI chatbot cơ bản để hỏi đáp học tập.

## 7. Rủi ro/chưa hoàn thiện nhìn từ hiện trạng frontend

- Route guard chưa rõ ràng, có thể truy cập dashboard khi auth store rỗng trước khi API phản hồi.
- Responsive layout cần kiểm tra kỹ vì sidebar fixed + margin left cố định.
- Error/loading/empty state chưa được chuẩn hóa.
- Nhiều action dùng `alert()`/`confirm()` làm trải nghiệm thiếu nhất quán.
- `image_upload` đã có trong type nhưng chưa được UI hỗ trợ đầy đủ.
- Mini game và VR scene mới ở mức khai báo/placeholder, chưa có runtime chuyên sâu.
- Chat chưa hỗ trợ upload file ở UI dù service có `file_url`.
- AI chatbot chưa có persistence hoặc context theo lớp/tài liệu.
- Teacher chưa có màn phân tích tiến độ interactive book/learning analytics từ event logs.
- Chưa thấy test frontend hoặc storybook/component preview.
- Một số store domain chưa được tận dụng, state nằm rải rác theo page.
- Khi chuyển sang Canvas Editor, quản lý state bằng React/Zustand theo kiểu cập nhật toàn bộ manifest trên từng pixel drag/resize có nguy cơ gây re-render dày và nghẽn hiệu năng.

## 8. Phần đối chiếu proposal

Phần này được bổ sung sau khi đã hoàn tất phần tổng hợp hiện trạng bên trên và sau đó mới đọc `docs/story-proposal.md`.

### 8.1 Mục tiêu proposal rút gọn

Proposal định nghĩa Sách tương tác là một interactive story engine gắn vào thư viện/lớp học EduHub. Trọng tâm không chỉ là render manifest, mà gồm hai trải nghiệm chính:

- Teacher có editor trực quan kiểu PowerPoint kết hợp flow graph:
  - Scene như slide/node.
  - Canvas chỉnh trực tiếp.
  - Text box/layer kéo thả, resize, chỉnh style.
  - Visibility rule cho layer.
  - Button chuyển cảnh.
  - Graph view để kiểm soát nhánh, retry loop, dead-end.
  - Preview riêng giống student.
- Student có player nhập vai, gần/full màn hình:
  - Media chiếm phần lớn màn hình.
  - Text/layer/question/feedback hiển thị overlay đúng thời điểm.
  - Video pause theo timecode.
  - Đi theo flow teacher cấu hình, không tự quay lại timeline.
  - Resume attempt, ghi checkpoint/event, hiển thị completed summary.

Proposal Phase 1 yêu cầu MVP ổn định gồm: editor scene-based, text box/layer cơ bản, visibility hiện ngay/sau delay/sau click, button chuyển cảnh, upload media, scene types `timeline`, `slideshow`, `interactive_video`, `hotspot_audio`, `branching`, `quiz`, `connect_the_dots`, scoring cơ bản, preview riêng, student player full page, attempt/checkpoint, publish và assign.

### 8.2 Mức độ đáp ứng hiện tại so với proposal

| Nhóm yêu cầu | Hiện trạng | Đánh giá |
| --- | --- | --- |
| Sách là material trong thư viện/lớp | Đã có `material_type = interactive_book`, route thư viện, assign vào lớp/chương | Đạt nền tảng |
| Draft/published workflow | Teacher editor có lưu draft, publish, status/version | Đạt phần chính |
| Data-driven manifest | Player/editor đọc manifest, không hardcode theo truyện cụ thể | Đạt hướng kiến trúc |
| Scene-based authoring | Có danh sách scene, thêm/xóa/sắp xếp scene, scene type | Đạt một phần |
| Preview giống student | Có preview dùng `InteractiveBookPlayer` | Đạt một phần, vẫn nằm trong page editor/dashboard |
| Upload media | Có upload thumbnail, image/video/audio asset và gán vào scene | Đạt phần chính |
| Interactive video timecode | Có trigger `timecode` trong editor/player | Đạt một phần |
| Hotspot audio | Có hotspot x/y, audio và câu hỏi sau audio | Đạt một phần |
| Branching/quiz | Có choices, target scene, feedback, retry, score_delta | Đạt một phần |
| Checkpoint/event | Player có autosave localStorage, checkpoint backend, event batch | Đạt phần lớn nền runtime |
| Student URL theo scene | Có `/student/interactive-books/:id/scenes/:sceneId` | Đạt |
| Text box/layer kiểu PowerPoint | Chưa có editor canvas/layer/text_box đúng nghĩa | Thiếu lớn |
| Visibility rule của layer | Chưa có `content.layers` + `visibility_rule` renderer/editor | Thiếu lớn |
| Canvas chỉnh trực tiếp | Editor chủ yếu là form/panel, không kéo thả layer trực tiếp trên canvas | Thiếu lớn |
| Graph/Flow view và validation loop | Chưa có graph view, unreachable/dead-end/cycle UI; chưa chặn dead-end loop | Thiếu lớn, có rủi ro làm học sinh kẹt trong flow |
| Connect-the-dots | Chưa có scene type/runtime/editor `connect_the_dots` | Thiếu MVP |
| Player full page/fullscreen | Player đang nằm trong dashboard/card, layout 2 cột, media cao cố định | Thiếu MVP UX |
| Overlay question/feedback trên media | Interaction panel nằm bên cạnh, chưa overlay trực tiếp lên ảnh/video | Thiếu UX quan trọng |
| Completed summary theo proposal | Hiện chỉ có completion/correct/score; thiếu wrong/retry/max/completed_scene_count | Thiếu |
| Analytics teacher | Có event logging nhưng chưa có UI báo cáo | Thiếu Phase 3 |

### 8.3 Thiếu sót lớn cần cải thiện để đạt proposal

#### 8.3.1 Teacher editor chưa đủ trực quan như PowerPoint + flow graph

Hiện tại `InteractiveBookEditor` đã có scene list, form metadata, form sửa scene, upload asset và JSON nâng cao. Tuy nhiên proposal yêu cầu luồng chính không bắt giáo viên tư duy JSON/form quá nhiều.

Cần cải thiện:

- Tách editor thành layout đúng proposal:
  - Header: tên sách, trạng thái, save, preview, publish.
  - Sidebar trái: danh sách scene/slide, thêm/xóa/nhân bản/sắp xếp, badge cảnh báo.
  - Canvas giữa: vùng preview/chỉnh trực tiếp của scene.
  - Inspector phải: thuộc tính scene/layer/interaction đang chọn.
  - Graph/Flow view phía dưới hoặc tab riêng.
- Canvas phải cho thao tác trực quan:
  - Thêm text box trực tiếp.
  - Drag vị trí, resize kích thước.
  - Click chọn layer để sửa inspector.
  - Đặt hotspot bằng click/drag trên ảnh thay vì nhập số x/y.
  - Với video, chọn timecode dừng trực quan trên video/timeline thay vì chỉ nhập số.
- Cần layer manager:
  - Background, image, text_box, hotspot, button, quiz_overlay, feedback_overlay.
  - Đổi z-index bằng kéo thả hoặc nút đưa lên/đưa xuống.
  - Khóa layer, ẩn/hiện layer.
  - Xóa/nhân bản layer.
- JSON nâng cao nên giữ, nhưng chỉ là advanced mode. Luồng chính phải đủ để tạo sách MVP mà không mở JSON.

#### 8.3.2 Chưa có mô hình `content.layers` và text box/layer renderer

Proposal coi layer là nền tảng để scene giống slide PowerPoint. Hiện trạng chủ yếu dùng:

- `content.text`
- `content.image_url`
- `content.video_url`
- `content.images`
- `interactions`

Chưa thấy UI/runtime xử lý `content.layers` theo manifest V1 đề xuất.

Cần bổ sung:

- Type frontend cho layer:
  - `background`
  - `text_box`
  - `image`
  - `hotspot`
  - `button`
  - `quiz_overlay`
  - `feedback_overlay`
- Renderer layer trong student player:
  - Vị trí theo phần trăm trong canvas.
  - Kích thước, z-index, style.
  - Text box có font size/color/background/border radius/opacity/shadow/căn lề.
  - Button layer có action `go_to_scene`, `go_back`, `open_question`, `finish_book`.
- Editor layer:
  - Tạo text box/layer.
  - Sửa nội dung và style tối thiểu.
  - Kéo thả, resize.
  - Inspector chỉnh style.
- Migration/fallback:
  - Scene cũ dùng `content.text/image_url/video_url` vẫn render được.
  - Scene mới ưu tiên `content.layers`.

#### 8.3.3 Visibility rule của layer chưa đạt yêu cầu

Proposal yêu cầu layer có thứ tự xuất hiện:

- `on_scene_enter`
- `after_delay`
- `after_media_time`
- `after_media_end`
- `after_click`
- `after_choice`
- `manual`

Hiện trạng đã có interaction trigger như `on_enter`, `timecode`, `on_click`, `on_complete`, nhưng đó là trigger của interaction, chưa phải visibility rule cho từng layer/text box.

Cần bổ sung:

- Schema `visibility_rule` cho layer.
- Runtime scheduler trong player:
  - Khi vào scene, tính layer nào visible.
  - Timer cho `after_delay`.
  - Theo dõi video/audio time cho `after_media_time`.
  - Bắt media end cho `after_media_end`.
  - Event click/choice để bật layer liên quan.
- Editor timeline nhỏ cho từng scene:
  - Danh sách layer theo thứ tự xuất hiện.
  - Chọn trigger và delay/timecode.
  - Preview visibility ngay trong editor.

#### 8.3.4 Student player chưa đạt trải nghiệm nhập vai/full page

Hiện tại `InteractiveBookPlayer` render trong dashboard layout, bên trong card lớn, media thường cao `420px`, panel tương tác nằm bên phải. Điều này tốt cho debugging nhưng chưa đúng proposal.

Cần cải thiện:

- Student interactive book nên có chế độ player riêng, giảm hoặc ẩn dashboard chrome:
  - Không bị sidebar/navbar chiếm không gian khi đang học.
  - Header nhỏ chỉ gồm tên sách, progress, thoát/tạm dừng.
  - Scene canvas/media chiếm gần toàn bộ viewport.
- Interaction/question/feedback nên là overlay trên scene:
  - Overlay trên video/ảnh tại thời điểm tương tác.
  - Video pause khi overlay mở.
  - Feedback đúng/sai hiển thị nổi trên media.
- Control nên ít chiếm diện tích:
  - Hiện khi cần hoặc nằm ở bottom overlay.
  - Không để panel kỹ thuật “Trạng thái/Đồng bộ/Điểm” chiếm vai trò chính trong chế độ học.
- Cần đảm bảo “Cảnh tiếp theo” đi đúng transition hiện tại:
  - Hiện trạng đã có default next/target scene, nhưng UI timeline/tổng quan và nút tổng quan cần kiểm soát để không phá flow tuyến tính.

#### 8.3.5 Graph/Flow view và validation flow còn thiếu

Hiện tại editor có checklist cấu trúc phổ biến:

- Duplicate scene id.
- Entry scene không tồn tại.
- Next scene trỏ sai.
- Thiếu media cơ bản.
- Choice target scene không tồn tại.

Nhưng proposal yêu cầu graph view và validation flow sâu hơn.

Đây không nên xem là phần trang trí Phase 2 thuần túy. Với dạng sách "Choose Your Own Adventure", giáo viên sẽ tạo nhiều nhánh đúng/sai, retry và scene feedback. Nếu không phát hiện dead-end loop ngay từ MVP, học sinh có thể bị kẹt vĩnh viễn trong một vòng lặp không có đường tới scene hoàn thành. Vì vậy validation dead-end/unreachable là yêu cầu an toàn luồng học, cần được đưa lên P0; Graph View có thể đơn giản ở P1 để giáo viên nhìn được flow trước khi phát hành.

Cần bổ sung:

- Graph view đơn giản:
  - Mỗi scene là node.
  - Default edge theo thứ tự sidebar.
  - Choice/button edge có nhãn.
  - Edge retry/cycle có nhãn/icon riêng.
  - Cho xem hoặc chỉnh target transition.
- Validation khi lưu/phát hành:
  - Unreachable scene.
  - Scene không có đường đi tiếp.
  - Dead-end loop: cụm scene nối vòng nhưng không có edge thoát.
  - Cycle có chủ đích phải được phân biệt bằng nhãn retry/practice loop.
  - Timecode âm hoặc trùng bất hợp lý.
  - Option rẽ nhánh thiếu target/rule.
  - Interaction có scoring nhưng thiếu cấu hình rõ.
- Lưu/phát hành nên có bước chặn hoặc xác nhận lỗi nghiêm trọng:
  - Hiện tại warnings chỉ hiển thị, `handlePublish` vẫn persist/publish nếu backend cho phép.
  - Dead-end loop không có lối thoát nên bị chặn ở P0, không chỉ cảnh báo.

#### 8.3.6 Thiếu `connect_the_dots` cho MVP “Sợi chỉ”

Proposal Phase 1 yêu cầu scene type `connect_the_dots`, dùng cho bài “Sợi chỉ”:

- Ảnh nền vỏ ốc.
- Các điểm A/B/C theo thứ tự.
- Học sinh click đúng tuần tự.
- Click sai báo lỗi, tăng `wrong_count`.
- Success chuyển tới target scene.
- Scoring gồm complete_score/wrong_penalty.

Hiện trạng chưa có:

- Type `connect_the_dots` trong `InteractiveSceneType`/constants.
- Editor tạo/sửa điểm theo thứ tự.
- Runtime render điểm đã khóa/mở, kiểm tra thứ tự click.
- Event `connect_dot_clicked`, `connect_dot_wrong_order`.
- Scoring/wrong behavior cho scene này.

Đây là gap MVP trực tiếp, cần ưu tiên cao nếu proposal là mục tiêu.

#### 8.3.7 Scoring, wrong/retry summary và completed screen chưa đủ

Hiện tại player có `ScoreSummary` gồm:

- `attempted`
- `correct`
- `score`

Choice hỗ trợ `score_delta`, retry boolean. Tuy nhiên proposal yêu cầu attempt/score_summary tối thiểu:

- `total_score`
- `max_score`
- `correct_count`
- `wrong_count`
- `retry_count`
- `completed_scene_count`
- `branch_history`

Cần cải thiện:

- Chuẩn hóa tên score summary theo proposal hoặc mapping tương thích.
- Tính `max_score` từ manifest scene/interactions.
- Ghi nhận wrong choice:
  - `wrong_count`.
  - `wrong_count_delta`.
  - retry count theo interaction/scene.
- Khi bấm retry, log `retry_clicked` và tăng `retry_count`.
- Completed screen cần hiển thị:
  - Điểm đạt/tối đa.
  - Số lần chọn sai.
  - Số lần retry.
  - Số thử thách/cảnh hoàn thành.
  - Thông điệp theo mức điểm.
- State snapshot nên bổ sung `retry_history`.

#### 8.3.8 Event analytics chưa khớp naming và chưa có UI báo cáo

Hiện player đã batch log events, nhưng event hiện tại như `scene_enter`, `scene_transition`, `interaction_choice`, `hotspot_audio_started`, `book_completed` chưa khớp hoàn toàn danh sách proposal:

- `scene_entered`
- `choice_selected`
- `answer_correct`
- `answer_wrong`
- `retry_clicked`
- `connect_dot_clicked`
- `connect_dot_wrong_order`
- `book_completed`

Cần cải thiện:

- Chuẩn hóa event taxonomy theo proposal hoặc map ở backend.
- Ghi event riêng cho đúng/sai thay vì chỉ một event choice chung.
- Ghi retry và connect-the-dots.
- Teacher UI Phase 3:
  - Báo cáo học sinh đi theo nhánh nào.
  - Tỷ lệ chọn đúng/sai từng câu.
  - Heatmap hotspot.
  - Tiến độ hoàn thành từng học sinh.

#### 8.3.9 Scene type mini game và VR nên hạ ưu tiên theo proposal

Hiện trạng có `mini_game` và `vr_scene` trong type/options, nhưng runtime/editor chưa có trải nghiệm chuyên biệt. Proposal Phase 4 nói VR/3D chỉ là extension point sau, không nằm critical path MVP.

Cần điều chỉnh ưu tiên:

- Không nên đầu tư VR trước khi hoàn tất layer/canvas/player/graph/connect-the-dots.
- `mini_game` nên tạm tập trung vào `connect_the_dots` MVP thay vì mini game canvas tự do.
- UI nên thể hiện rõ các type chưa hỗ trợ đầy đủ, tránh tạo kỳ vọng sai cho teacher.

#### 8.3.10 Asset UX còn lộ tư duy URL ở một số nơi

Proposal yêu cầu giáo viên không phải nhìn/nhập URL media trong luồng bình thường. Hiện editor đã có upload/gán asset, nhưng vẫn có các field dạng URL/link editor trong `renderMediaField` và JSON nâng cao.

Cần cải thiện:

- Luồng mặc định chỉ upload/chọn asset từ library.
- URL thô chỉ nằm trong advanced/copy link.
- Cần asset library tái sử dụng giữa scene/sách theo Phase 2.
- Cần poster/loading state rõ hơn cho video.

#### 8.3.11 Rủi ro state management và performance khi chuyển sang Canvas Editor

Hiện tại nhiều màn hình dùng local React state hoặc Zustand store đơn giản cho dữ liệu dạng list/form. Proposal lại yêu cầu Canvas Editor có nhiều layer, tọa độ `x/y`, kích thước, `z_index`, style và visibility rule. Nếu mỗi pixel khi kéo/thả hoặc resize đều cập nhật toàn bộ manifest/tree vào state chung rồi làm React render lại cả editor, UI rất dễ bị giật, đặc biệt khi có video/ảnh lớn và nhiều layer.

Cần bổ sung yêu cầu kỹ thuật:

- Tách state thao tác tức thời khỏi state tài liệu bền vững:
  - Dùng local/transient state hoặc ref cho drag/resize trong lúc pointer đang di chuyển.
  - Chỉ sync vào editor store/manifest khi `pointerup`, blur hoặc debounce hợp lý.
- Giảm phạm vi re-render:
  - Mỗi layer component subscribe đúng phần state của nó.
  - Tránh truyền toàn bộ manifest xuống toàn bộ cây component.
  - Dùng selector/shallow compare nếu dùng Zustand.
- Tối ưu thao tác canvas:
  - Dùng `requestAnimationFrame` cho cập nhật vị trí đang kéo.
  - CSS transform cho preview vị trí trong khi kéo, commit tọa độ thật khi kết thúc.
  - Memoize renderer layer, inspector và scene list.
- Thiết kế store riêng cho editor:
  - Tách `documentState` đã commit, `selectionState`, `interactionState` và `draftDragState`.
  - Có history stack cho undo/redo nhưng không ghi history trên từng pixel.
- Validation/serialization nên chạy theo debounce hoặc theo hành động lưu, không chạy full graph analysis trên mỗi thay đổi nhỏ.

### 8.4 Ưu tiên cải thiện để đạt Phase 1 của proposal

#### P0 - Bắt buộc để MVP proposal chạy đúng

1. Tạo player route/layout gần/full màn hình cho student interactive book, giảm dashboard chrome khi học.
2. Thêm mô hình `content.layers` và renderer layer cơ bản:
   - background.
   - text_box.
   - image.
   - hotspot.
   - button.
   - quiz/feedback overlay tối thiểu.
3. Thêm editor canvas cơ bản:
   - hiển thị scene theo tỉ lệ cố định.
   - thêm text box.
   - drag vị trí, resize kích thước.
   - inspector sửa text/style tối thiểu.
4. Thêm visibility rule tối thiểu:
   - hiện ngay.
   - hiện sau delay.
   - hiện sau click.
5. Thêm button chuyển cảnh:
   - next theo sidebar.
   - target scene cụ thể.
   - finish book.
6. Thêm `connect_the_dots`:
   - type/schema.
   - editor đặt điểm theo thứ tự.
   - player kiểm tra thứ tự click.
   - event và scoring sai/đúng.
7. Chuẩn hóa scoring summary:
   - total/max score.
   - correct/wrong/retry.
   - completed scene count.
8. Completed screen theo proposal.
9. Publish validation tối thiểu phải chặn/cảnh báo mạnh:
   - missing entry.
   - duplicate scene id.
   - transition target sai.
   - missing required media.
   - option thiếu target/rule.
10. Validation flow bắt buộc cho nhánh chọn sai/thử lại:
   - phát hiện unreachable scene.
   - phát hiện scene không có đường đi tiếp.
   - chặn lưu/phát hành khi có dead-end loop không có edge thoát tới scene tiếp theo hoặc scene hoàn thành.
   - cho phép retry/practice loop có chủ đích nếu có nhãn/rule và có lối thoát rõ.
11. Yêu cầu tối ưu re-render cho Canvas Editor:
   - local/transient state cho drag/resize.
   - chỉ sync manifest/store khi thao tác kết thúc hoặc debounce.
   - selector/shallow compare nếu dùng Zustand.
12. Regression kiểm tra tài liệu thường, video, PDF, exam và notification khi gán tài liệu.

#### P1 - Cần để editor đủ dùng cho giáo viên

1. Hotspot placement bằng click/drag trên ảnh.
2. Video timecode picker trực quan.
3. Timeline nhỏ trong scene cho layer visibility.
4. Scene sidebar có badge cảnh báo thiếu media/transition/question.
5. Graph View đơn giản để giáo viên nhìn được flow:
   - node là scene.
   - edge mặc định theo sidebar.
   - edge từ choice/button có nhãn.
   - đánh dấu retry loop và dead-end/unreachable bằng màu hoặc badge.
6. Preview mở ở route/mode riêng giống student hơn, không lẫn editor panel.
7. Undo/redo tối thiểu cho thao tác layer/scene.
8. Nhân bản scene/layer.
9. Asset library tái sử dụng.

#### P2 - Đúng định hướng Phase 2/3

1. Graph view nâng cao kiểu git graph.
2. Drag edge để nối scene.
3. Label retry loop/practice loop nâng cao, filter các nhánh đúng/sai/phụ đạo.
4. Analytics teacher:
   - branch path.
   - answer correctness.
   - hotspot heatmap.
5. Template theo môn học.
6. Preset text box/caption/speech bubble/callout.

### 8.5 Checklist nghiệm thu proposal hiện chưa đạt

Teacher chưa đạt đầy đủ:

- Thêm text box lên scene và kéo thả/resize/chỉnh style trực tiếp trên canvas.
- Cấu hình text box hiện sau delay hoặc sau click bằng UI.
- Thêm nút “Cảnh tiếp theo” như layer/button trên canvas.
- Graph View hiển thị cycle hợp lệ và cảnh báo cycle không có lối thoát.
- Tạo `connect_the_dots` scene bằng ảnh nền và hotspot A/B/C theo thứ tự.
- Gán điểm đúng và ghi số lần chọn sai đúng theo score_summary proposal.
- Preview tách biệt hoàn toàn giống student mode.

Student chưa đạt đầy đủ:

- Player full page/fullscreen, media chiếm gần toàn bộ màn hình.
- Text box/layer hiển thị đúng vị trí, đúng thứ tự, đúng thời điểm.
- Câu hỏi/lựa chọn/feedback dạng overlay trên ảnh/video.
- Connect-the-dots click đúng thứ tự, click sai báo lỗi và ghi nhận sai.
- Completed summary có tổng điểm, số lần chọn sai, số lần retry và thông tin hoàn thành.
- Không thấy trạng thái kỹ thuật trong chế độ học; hiện panel vẫn hiển thị trạng thái/đồng bộ/điểm như debug UI.

Regression cần giữ:

- Tài liệu thường/PDF/video/download vẫn hoạt động.
- Thư viện cá nhân/hệ thống không bị vỡ khi thêm `interactive_book` manifest mới.
- Gán tài liệu mới vào lớp vẫn tạo notification/hiển thị ở chương.
- Teacher/student permission vẫn đúng, nhất là draft chỉ teacher thấy và student chỉ thấy published.
- Attempt cũ phải tiếp tục dùng đúng `manifest_version`.

### 8.6 Kết luận đối chiếu proposal

Hệ thống hiện tại đã có nền móng tốt cho interactive book: material integration, draft/publish, scene manifest, upload media, preview/player, checkpoint/event, branching/quiz/hotspot/video cơ bản. Tuy nhiên khoảng cách lớn nhất nằm ở trải nghiệm sản phẩm:

- Teacher editor hiện là structured form + manifest editor, chưa phải visual canvas/layer editor như PowerPoint.
- Student player hiện là dashboard card/player 2 cột, chưa phải immersive full page overlay player.
- Data model runtime hiện có scene/interactions nhưng thiếu layer, visibility, connect-the-dots, graph validation và scoring evidence đầy đủ.

Do đó, để đạt proposal, nên ưu tiên hoàn thiện trục `layer/canvas/player/scoring/connect_the_dots` trước, rồi mới mở rộng graph view, analytics, mini game canvas hoặc VR.
