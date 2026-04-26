# Hướng dẫn smoke test cho interactive book

Tài liệu này chỉ giữ những thông tin cần thiết để smoke test local. Các ID seed cụ thể có thể thay đổi sau mỗi lần làm sạch dữ liệu, vì vậy không nên dùng tài liệu này như nguồn mô tả nghiệp vụ.

## Tài khoản test

- Teacher: `demo.teacher@example.com`
- Student: `demo.student@example.com`
- Password: `TestPass123!`

## Chạy local

### Database

```powershell
cd d:\Hackathon\EduHub
docker compose up -d db
```

### Backend

```powershell
cd d:\Hackathon\EduHub\backend
.\venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

### Frontend

```powershell
cd d:\Hackathon\EduHub\frontend
npm run dev
```

## Smoke test ở giao diện teacher

1. Đăng nhập bằng tài khoản teacher.
2. Vào `Teacher -> Library -> Tài liệu cá nhân`.
3. Tạo mới hoặc mở một `Sách tương tác`.
4. Kiểm tra các thao tác chính:
   - chỉnh sửa thông tin sách;
   - thêm và sắp xếp scene;
   - upload media;
   - xem thử;
   - lưu nháp;
   - phát hành;
   - gán vào lớp.
5. Nếu cần kiểm tra thư viện chung, vào thêm `Teacher -> Library -> Tài liệu hệ thống`.

## Smoke test ở giao diện học sinh

### Từ thư viện

1. Đăng nhập bằng tài khoản student.
2. Vào `Student -> Library`.
3. Lọc theo `Sách tương tác`.
4. Mở một sách đã phát hành và kiểm tra luồng đọc cơ bản.

### Từ lớp học

1. Vào `Student -> Classes`.
2. Mở lớp đã được giáo viên gán sách tương tác.
3. Mở chương có chứa sách.
4. Kiểm tra luồng mở sách từ trong lớp.

## Những điểm cần xác nhận

- Sách đã phát hành xuất hiện đúng ở nơi được gán.
- Học sinh mở được player mà không lỗi route.
- Tiến trình đọc hoặc trạng thái xem gần nhất được lưu đúng nếu tính năng đó đang bật.
- Teacher không bị lộ JSON kỹ thuật trong luồng biên soạn chính.

## Ghi chú

- Nếu terminal hiển thị tiếng Việt lỗi mã hóa trong PowerShell, đó thường là lỗi console, không phải dữ liệu trong DB.
- Nếu seed hoặc dữ liệu demo thay đổi, hãy cập nhật lại tài liệu này theo hướng giữ flow test, không cố định ID cứng.
