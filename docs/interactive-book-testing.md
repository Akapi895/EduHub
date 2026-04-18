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
2. Vào `Teacher -> Library -> Tài liệu hệ thống`.
3. Lọc theo `Sách tương tác` nếu cần.
4. Mở sách có `material_id` ở trên.
5. Kiểm tra các thao tác sau:
   - `Xem thử`
   - `Đưa vào thư viện hệ thống` hoặc `Gỡ khỏi thư viện hệ thống`
   - `Gán vào lớp`
   - chỉnh sửa scene, upload media, kéo thả thứ tự scene

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
