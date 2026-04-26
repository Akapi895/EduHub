# Kiến trúc game module

## Mục đích

Tài liệu này chốt cách EduHub tích hợp game theo hướng mở rộng được cho nhiều engine và nhiều đội phát triển khác nhau, đồng thời làm rõ vai trò của `frontend/public/game-modules`.

## Kết luận ngắn

Không cần đặt toàn bộ source của mọi game vào `frontend/public/game-modules`.

Thư mục này nên được hiểu là lớp `runtime artifact`:

- chứa bundle đã sẵn sàng chạy trên trình duyệt;
- có thể được serve trực tiếp khi chạy local hoặc deploy đơn giản;
- không phải nơi bắt buộc phải lưu source gốc lâu dài.

## Kiến trúc hiện tại

### Lớp dữ liệu và phân quyền

- Backend quản lý `game_modules`, `content_packages`, `content_package_assignments`, `package_attempts`.
- Học sinh không mở game từ raw catalog nữa, mà từ `game package` đã được giao cho lớp.
- Giáo viên tạo nội dung game qua package, không thao tác trực tiếp với thư mục bundle.

### Lớp host trong frontend

- `frontend/src/components/games/GamePlayerShell.tsx`: shell quản lý `iframe`, lifecycle, pause/resume và modal câu hỏi.
- `frontend/src/features/games/bridge.ts`: gửi lệnh `host:init`, `host:pause`, `host:resume`, `host:restart`.
- `frontend/src/features/games/helpers.ts`: helper cho phân bổ câu hỏi, số liệu runtime và metadata.
- `frontend/src/pages/student/Games.tsx`: danh sách package học sinh có thể chơi.
- `frontend/src/pages/student/GamePlayer.tsx`: route mở game theo package.
- `frontend/src/pages/teacher/Games.tsx` và các page teacher khác: quản lý package game theo lớp.

### Lớp runtime bundle

```text
frontend/public/game-modules/
└── gold-miner/
    ├── manifest.json
    ├── bridge.js
    ├── index.html
    ├── css/
    ├── js/
    └── images/
```

Game chạy như một web app độc lập trong `iframe` sandbox và giao tiếp với hệ thống chính bằng `postMessage`.

## Vì sao `iframe` vẫn là mặc định đúng

`iframe` là lựa chọn mặc định phù hợp nhất cho EduHub vì:

- cô lập CSS, JS và asset của game khỏi app chính;
- tương thích với nhiều stack khác nhau như HTML/JS thuần, React, Phaser, Pixi, Unity WebGL, Godot export;
- cho ranh giới lỗi rõ ràng hơn;
- giảm rủi ro game làm hỏng route hoặc state của frontend chính;
- đơn giản hóa việc build và deploy từng game độc lập.

`Micro-frontend` chỉ nên cân nhắc nếu game thực chất là một web app cùng stack, cùng vòng đời release và cần chia sẻ sâu dependency với frontend chính. Đó không phải mặc định tốt cho domain game.

## Phân tách source và artifact

### Nên lưu source game ở đâu

Hai hướng hợp lý:

1. `games/<slug>/` trong cùng repo nếu game do nội bộ duy trì và bundle không quá nặng.
2. Repo riêng nếu game có toolchain nặng, asset lớn hoặc do đội khác phụ trách.

### Nên publish artifact ở đâu

Hai hướng hợp lý:

1. `frontend/public/game-modules/<slug>/` cho local dev và môi trường đơn giản.
2. CDN hoặc object storage cho production scale.

Backend chỉ cần giữ `manifest_url` và metadata module. Frontend shell không phụ thuộc bundle nằm ở đâu, miễn manifest hợp lệ.

## Kiến trúc khuyến nghị lâu dài

### 1. Source workspace

- Source gốc đặt ngoài `public`.
- Mỗi game tự có toolchain build riêng.

Ví dụ:

```text
games/
└── gold-miner/
    ├── src/
    ├── assets/
    └── dist/
```

### 2. Delivery layer

- `dist/` được đồng bộ sang `frontend/public/game-modules/<slug>/` hoặc upload lên CDN.
- `public/game-modules` chỉ giữ artifact cần browser tải.

### 3. Registry layer

- `game_modules` là registry chuẩn ở backend.
- `content_packages` là lớp nội dung giáo viên tạo cho từng lớp.
- `content_package_assignments` quyết định học sinh nào được chơi package nào.

## Gold Miner hiện tại đang đi theo hướng nào

Gold Miner hiện là bản tích hợp đầu tiên, nên source mẫu đã được đóng gói trực tiếp thành runtime bundle trong `frontend/public/game-modules/gold-miner`.

Điều này chấp nhận được ở giai đoạn bootstrap, nhưng không nên xem là quy tắc chung cho các game sau.

## Checklist khi thêm game mới

1. Tạo hoặc nhận bundle web độc lập có `index.html` và asset tự chứa.
2. Cung cấp `manifest.json` với `entry`, `runtime`, `bridge`.
3. Đăng ký module vào bảng `game_modules`.
4. Nếu game dùng trigger generic, cấu hình `game_module_trigger_mappings`.
5. Nếu game có scheduler đặc thù như Gold Miner, triển khai service runtime riêng nhưng vẫn dùng chung `content_packages`, `question_banks`, `package_attempts`.
6. Tạo `game package` từ giao diện teacher, không gắn logic nội dung trực tiếp vào module runtime.

## Contract manifest tối thiểu

Manifest tối thiểu nên có:

- `id`, `slug`, `title`
- `entry`
- `runtime.kind`, `runtime.sandbox`, `runtime.allow`, `runtime.aspect_ratio`
- `bridge.enabled`, `bridge.version`, `bridge.capabilities`

## Ghi chú bảo trì

- Không đặt business logic teacher/student vào trong bundle game.
- Không để game tự quyết định phân quyền hay dữ liệu câu hỏi.
- Chỉ frontend shell và backend runtime service mới được quyết định session, attempt, pause/resume và ghi nhận kết quả.
