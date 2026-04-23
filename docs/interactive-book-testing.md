# Hướng dẫn test tạm thời tính năng Sách tương tác

Tài liệu này phản ánh đúng trạng thái dữ liệu hiện tại trong local Postgres sau khi đã dọn seed.

## Dữ liệu đang có

- Chỉ còn **1** sách tương tác trong DB.
- `material_id`: `bb7e621c-3dab-4f26-b291-36ad8c32d56b`
- Tiêu đề hiện tại trong DB: `Sách tương tác mới`
- Trạng thái: `published`
- Phạm vi: `thư viện hệ thống`
- Tiến trình cũ của học sinh đã được xóa để test lại từ đầu

## Tài khoản dùng để test

- Teacher: `demo.teacher@example.com`
- Student: `demo.student@example.com`
- Password: `TestPass123!`

## Lớp demo đã chuẩn bị sẵn

- Tên lớp: `Lớp demo sách tương tác`
- Join code: `IBTEST`
- Chương: `Chương 1 - Sách tương tác`
- Sách tương tác hiện tại đã được gán sẵn vào chương này
- Tài khoản `demo.student@example.com` đã được thêm vào lớp

## Cách chạy ứng dụng

Database:

```powershell
cd d:\Hackathon\EduHub
docker compose up -d db
```

Backend:

```powershell
cd d:\Hackathon\EduHub\backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Frontend:

```powershell
cd d:\Hackathon\EduHub\frontend
npm run dev
```

## Cách test ở giao diện teacher

1. Đăng nhập bằng tài khoản teacher.
2. Vào `Teacher -> Library -> Tài liệu cá nhân` để tạo hoặc chỉnh sửa sách tương tác của riêng bạn.
3. Nếu cần kiểm tra bản đã chia sẻ, vào thêm `Teacher -> Library -> Tài liệu hệ thống`.
4. Lọc theo `Sách tương tác` nếu cần.
5. Mở sách có `material_id` ở trên.
6. Kiểm tra các thao tác sau:
   - `Xem thử`
   - `Gán vào lớp`
   - chỉnh sửa scene, upload media, kéo thả thứ tự scene
   - `Lưu vào thư viện cá nhân`
   - `Phát hành`

## Luồng thư viện cần test sau thay đổi

### 1. Personal-first

1. Tạo hoặc upload một tài liệu mới trong `Teacher -> Library -> Tài liệu cá nhân`.
2. Xác nhận tài liệu xuất hiện ở thư viện cá nhân ngay sau khi lưu.
3. Xác nhận tài liệu chưa xuất hiện ở `Tài liệu hệ thống` cho tới khi giáo viên chủ động đẩy lên.

### 2. Đẩy lên thư viện chung

1. Trong `Tài liệu cá nhân`, dùng menu của material để chọn `Đẩy lên thư viện chung`.
2. Sang `Tài liệu hệ thống`, xác nhận material xuất hiện ở đó.
3. Chỉnh sửa tiếp bản cá nhân.
4. Xác nhận bản ở thư viện chung chưa đổi ngay.
5. Chọn lại `Đẩy lên thư viện chung` từ bản cá nhân.
6. Xác nhận bản ở thư viện chung được cập nhật đúng snapshot mới.

### 3. Gỡ khỏi thư viện chung

1. Mở `Teacher -> Library -> Tài liệu hệ thống`.
2. Với material do chính teacher đã đẩy lên, kiểm tra menu hoặc action `Gỡ khỏi thư viện chung`.
3. Thực hiện gỡ và xác nhận material biến mất khỏi thư viện hệ thống nhưng vẫn còn trong thư viện cá nhân.
4. Với material do người khác chia sẻ, xác nhận teacher không có quyền gỡ.

Có thể mở trực tiếp:

- Editor teacher: `http://127.0.0.1:5173/teacher/interactive-books/bb7e621c-3dab-4f26-b291-36ad8c32d56b`

## Cách test ở giao diện học sinh

### Test từ thư viện

1. Đăng nhập bằng tài khoản student.
2. Vào `Student -> Library`.
3. Lọc theo `Sách tương tác`.
4. Mở sách `Sách tương tác mới`.

Route trực tiếp:

- Player student: `http://127.0.0.1:5173/student/interactive-books/bb7e621c-3dab-4f26-b291-36ad8c32d56b`

### Test từ lớp học

1. Vào `Student -> Classes`.
2. Mở lớp `Lớp demo sách tương tác`.
3. Mở chương `Chương 1 - Sách tương tác`.
4. Mở sách tương tác từ trong lớp.

Teacher cũng có thể vào lớp demo này để kiểm tra luồng đã gán tài liệu vào chương thành công.

## Những gì đã được dọn để tránh nhiễu

- Đã xóa 2 sách seed cũ:
  - `Mock Demo - Sách tương tác Cậu bé thông minh`
  - `Mock Demo - Sach tuong tac Cau be thong minh`
- Đã xóa attempt cũ của sách hiện tại để học sinh test lại từ đầu
- Đã giữ lại demo teacher và demo student để tiện test tạm thời

## Ghi chú

- Nếu terminal hiển thị chữ tiếng Việt bị lỗi khi chạy SQL hoặc PowerShell, đó là lỗi mã hóa của console, không phải dữ liệu trong DB bị hỏng.
- Nếu bạn đổi tên sách trong editor rồi lưu lại, tên hiển thị trong thư viện sẽ cập nhật theo dữ liệu mới.
