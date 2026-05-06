# EduHub - Tài Liệu Tham Chiếu Hệ Thống

> **Mục đích**: File này là tài liệu tham chiếu nhanh giúp định hướng nơi cần chỉnh sửa khi muốn thay đổi tính năng, mà không cần đọc lại toàn bộ source code.
>
> **Cập nhật lần cuối**: 2026-05-06

---

## Mục Lục

1. [Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
2. [Cấu Trúc Thư Mục](#2-cấu-trúc-thư-mục)
3. [Backend - Chi Tiết](#3-backend---chi-tiết)
   - [Models & Database](#31-models--database)
   - [API Endpoints](#32-api-endpoints)
   - [Services & Logic](#33-services--logic)
   - [Authentication](#34-authentication)
4. [Frontend - Chi Tiết](#4-frontend---chi-tiết)
   - [Routing](#41-routing)
   - [State Management](#42-state-management)
   - [API Services](#43-api-services)
   - [Components](#44-components)
5. [Mapping Tính Năng → Files](#5-mapping-tính-năng--files)
6. [Hệ Thống Game](#6-hệ-thống-game)
7. [Interactive Books](#7-interactive-books)
8. [Exam System](#8-exam-system)
9. [Communication System](#9-communication-system)
10. [Hướng Dẫn Bảo Trì](#10-hướng-dẫn-bảo-trì)

---

## 1. Tổng Quan Kiến Trúc

```
┌─────────────────────────────────────────────────────────────────┐
│                        EduHub System                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐         ┌──────────────────────────┐   │
│  │      Frontend        │         │        Backend          │   │
│  │   (React + TS)       │  HTTP   │    (FastAPI + Python)   │   │
│  │   Port: 5173         │◄───────►│    Port: 8000           │   │
│  │                      │   REST  │                         │   │
│  │  - Pages             │   API   │  - API Endpoints        │   │
│  │  - Components        │         │  - Services             │   │
│  │  - State (Zustand)   │         │  - CRUD Operations      │   │
│  │  - Game Shell        │         │  - Authentication       │   │
│  └──────────────────────┘         └────────────┬────────────┘   │
│                                                  │                 │
│                                                  ▼                 │
│                                       ┌──────────────────────┐    │
│                                       │     PostgreSQL       │    │
│                                       │    Port: 5433        │    │
│                                       │                      │    │
│                                       │  - Users             │    │
│                                       │  - Classes           │    │
│                                       │  - Materials          │    │
│                                       │  - Exams/Games        │    │
│                                       │  - Interactive Books  │    │
│                                       └──────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend Framework | React | 18.x |
| Frontend Language | TypeScript | 5.x |
| Build Tool | Vite | 5.x |
| State Management | Zustand | 4.x |
| HTTP Client | Axios | 1.x |
| Styling | Tailwind CSS | 3.x |
| Backend Framework | FastAPI | 0.104+ |
| Backend Language | Python | 3.11+ |
| ORM | SQLAlchemy | 2.0 |
| Database | PostgreSQL | 16.x |
| Migrations | Alembic | - |
| Authentication | JWT (python-jose) | - |

---

## 2. Cấu Trúc Thư Mục

```
EduHub/
├── backend/                          # FastAPI Backend
│   ├── app/
│   │   ├── api/v1/endpoints/        # API Route Handlers
│   │   │   ├── auth.py              # Authentication
│   │   │   ├── users.py             # User management
│   │   │   ├── classes.py           # Class management
│   │   │   ├── library.py            # Material library
│   │   │   ├── exams.py             # Exam system
│   │   │   ├── game_packages.py      # Game packages
│   │   │   ├── game_modules.py       # Game module registry
│   │   │   ├── submissions.py        # Exam/game submissions
│   │   │   ├── messages.py           # Messaging
│   │   │   ├── dashboard.py          # Dashboard data
│   │   │   ├── chatbot.py            # AI chatbot
│   │   │   ├── notifications.py      # Notifications
│   │   │   ├── upload.py             # File uploads
│   │   │   └── interactive_books.py  # Interactive books
│   │   ├── core/                    # Core configuration
│   │   │   ├── config.py            # Settings & environment
│   │   │   ├── security.py          # JWT & password hashing
│   │   │   └── dependencies.py      # Auth dependencies
│   │   ├── crud/                    # Database operations
│   │   ├── models/                  # SQLAlchemy ORM models
│   │   ├── schemas/                  # Pydantic schemas
│   │   ├── services/                # Business logic
│   │   └── utils/                   # Utilities & enums
│   ├── alembic/                     # Database migrations
│   ├── scripts/                     # Seed scripts
│   ├── tests/                       # Unit tests
│   ├── main.py                      # FastAPI entry point
│   └── requirements.txt             # Python dependencies
│
├── frontend/                        # React Frontend
│   ├── src/
│   │   ├── pages/                   # Page components
│   │   │   ├── auth/                # Login, Register
│   │   │   ├── teacher/             # Teacher pages
│   │   │   └── student/             # Student pages
│   │   ├── components/              # Reusable components
│   │   │   ├── layout/              # Layout components
│   │   │   ├── common/              # Common UI components
│   │   │   ├── classes/              # Class components
│   │   │   ├── exam/                # Exam components
│   │   │   ├── games/                # Game components
│   │   │   ├── interactive-book/     # Interactive book components
│   │   │   ├── library/              # Library components
│   │   │   └── chat/                 # Chat components
│   │   ├── services/                # API service modules
│   │   ├── store/                   # Zustand state stores
│   │   ├── hooks/                   # Custom React hooks
│   │   ├── features/                # Feature modules
│   │   │   └── games/               # Game bridge & helpers
│   │   ├── routes/                  # React Router config
│   │   └── utils/                   # Utilities
│   ├── public/
│   │   └── game-modules/            # Game runtime bundles
│   │       ├── gold-miner/          # Gold Miner game
│   │       └── memory-card/         # Memory Card game
│   └── package.json
│
├── docs/                           # Documentation
└── eduhub.render.sql               # Database schema export
```

---

## 3. Backend - Chi Tiết

### 3.1 Models & Database

#### Database Type: PostgreSQL (SQL/Relational)

**ERD Tổng Quan:**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    User      │────▶│    Class     │◀────│ ClassStudent │
│  (teacher/   │     │  (class by   │     │  (junction)  │
│   student)   │     │   teacher)   │     └──────────────┘
└──────────────┘     └──────────────┘
       │                   │
       │                   ▼
       │            ┌──────────────┐
       │            │   Chapter     │
       │            │ (sections)    │
       │            └──────────────┘
       │                   │
       │                   ▼
       │            ┌──────────────┐
       │            │ClassMaterial │
       │            └──────────────┘
       │                   │
       │                   ▼
       │            ┌──────────────┐
       │            │   Material    │
       │            │(book/video/   │
       │            │ game/ib)      │
       │            └──────────────┘
       │
       ▼
┌──────────────────────────┐
│    ContentPackage        │
│  (exam/game package)     │
├──────────────────────────┤
│  ├── QuestionBank ────► QuestionBankItem
│  │                              ├── QuestionItemOption (MCQ)
│  │                              ├── QuestionItemMatching* (Matching)
│  │                              └── QuestionItemTextConfig (Essay)
│  ├── ExamPackageConfig
│  └── GamePackageConfig ──► GameModule
│
└──────────────────────────┘
```

#### Danh Sách Models Chính

| Model | Table | Mô Tả |
|-------|-------|-------|
| **User** | `users` | id, full_name, email, password_hash, role, avatar_url, bio |
| **Class** | `classes` | id, name, description, thumbnail_url, teacher_id, join_code |
| **ClassStudent** | `class_students` | Junction table: class_id ↔ student_id |
| **Chapter** | `chapters` | id, class_id, name, order_index |
| **ClassMaterial** | `class_materials` | Links materials to classes/chapters |
| **Material** | `library_materials` | id, title, file_url, material_type, is_system |
| **Folder** | `folders` | Personal folders for teachers |
| **ContentPackage** | `content_packages` | Base for exams/games |
| **QuestionBank** | `question_banks` | One-to-one with ContentPackage |
| **QuestionBankItem** | `question_bank_items` | Questions with type, difficulty, points |
| **GameModule** | `game_modules` | Game registry (gold-miner, memory-card) |
| **GamePackageConfig** | `game_package_configs` | Links ContentPackage to GameModule |
| **PackageAttempt** | `package_attempts` | User attempts |
| **InteractiveBook** | `interactive_books` | Interactive book with scenes |
| **Conversation** | `conversations` | Message threads |
| **Message** | `messages` | Individual messages |
| **Notification** | `notifications` | User notifications |

#### Chi Tiết Các Model Quan Trọng

**User Model** (`backend/app/models/user.py`):
- `id`: UUID string
- `email`: unique
- `role`: 'teacher' | 'student'
- `full_name`: string
- `password_hash`: bcrypt
- `avatar_url`: optional
- `phone`: optional
- `bio`: optional

**ContentPackage Model** (`backend/app/models/content_package.py`):
- Base cho cả Exam và Game
- `package_type`: 'exam' | 'game'
- `status`: 'draft' | 'published'
- Relationships: `question_bank`, `exam_config`, `game_config`, `assignments`

**QuestionBankItem Types**:
- `single_choice`: Một đáp án đúng
- `multi_choice`: Nhiều đáp án đúng
- `matching`: Nối cặp
- `text`: Tự luận (manual grading)

### 3.2 API Endpoints

**Router Chính** (`backend/app/api/v1/router.py`):

```python
api_router.include_router(auth.router)          # /api/v1/auth
api_router.include_router(users.router)          # /api/v1/users
api_router.include_router(classes_router)       # /api/v1/classes
api_router.include_router(library.router)        # /api/v1/library
api_router.include_router(exams.router)          # /api/v1/exams
api_router.include_router(game_modules.router)   # /api/v1/game-modules
api_router.include_router(game_packages.router)  # /api/v1/game-packages
api_router.include_router(submissions.router)    # /api/v1/submissions
api_router.include_router(messages.router)       # /api/v1/conversations
api_router.include_router(dashboard.router)      # /api/v1/dashboard
api_router.include_router(chatbot.router)        # /api/v1/chatbot
api_router.include_router(upload.router)          # /api/v1/upload
api_router.include_router(notifications.router)  # /api/v1/notifications
api_router.include_router(interactive_books.router) # /api/v1/interactive-books
```

**Endpoint Chi Tiết:**

| Endpoint | Method | Mô Tả |
|----------|--------|-------|
| **Auth** (`/auth`) | | |
| POST `/auth/register` | Register | Tạo tài khoản mới |
| POST `/auth/login` | Login | Đăng nhập, trả JWT token |
| POST `/auth/logout` | Logout | Đăng xuất |
| GET `/auth/me` | Get Current User | Lấy thông tin user hiện tại |
| **Users** (`/users`) | | |
| GET `/users` | List Users | Danh sách users |
| GET `/users/{id}` | Get User | Lấy thông tin user |
| PATCH `/users/{id}` | Update User | Cập nhật thông tin |
| **Classes** (`/classes`) | | |
| GET `/classes` | List Classes | Danh sách lớp học |
| POST `/classes` | Create Class | Tạo lớp mới |
| GET `/classes/{id}` | Get Class | Chi tiết lớp |
| PATCH `/classes/{id}` | Update Class | Cập nhật lớp |
| DELETE `/classes/{id}` | Delete Class | Xóa lớp |
| POST `/classes/{id}/students` | Add Student | Thêm học sinh |
| DELETE `/classes/{id}/students/{student_id}` | Remove Student | Xóa học sinh |
| POST `/classes/{id}/join` | Join Class | Học sinh tham gia lớp |
| GET `/classes/{id}/chapters` | List Chapters | Danh sách chương |
| POST `/classes/{id}/chapters` | Create Chapter | Tạo chương mới |
| **Library** (`/library`) | | |
| GET `/library/materials` | List Materials | Danh sách tài liệu |
| POST `/library/materials` | Create Material | Tạo tài liệu mới |
| GET `/library/materials/{id}` | Get Material | Chi tiết tài liệu |
| POST `/library/materials/{id}/share` | Share Material | Chia sẻ tài liệu |
| **Exams** (`/exams`) | | |
| GET `/exams` | List Exams | Danh sách bài thi |
| POST `/exams` | Create Exam | Tạo bài thi |
| GET `/exams/{id}` | Get Exam | Chi tiết bài thi |
| POST `/exams/{id}/submit` | Submit Exam | Nộp bài |
| GET `/exams/{id}/submissions` | List Submissions | Danh sách bài nộp |
| **Game Packages** (`/game-packages`) | | |
| GET `/game-packages` | List Packages | Danh sách game packages |
| POST `/game-packages` | Create Package | Tạo game package |
| GET `/game-packages/{id}` | Get Package | Chi tiết package |
| POST `/game-packages/{id}/start` | Start Game | Bắt đầu chơi |
| POST `/game-packages/{id}/complete` | Complete Game | Hoàn thành |
| GET `/game-packages/{id}/leaderboard` | Leaderboard | Bảng xếp hạng |
| **Submissions** (`/submissions`) | | |
| GET `/submissions` | List Submissions | Danh sách bài nộp |
| GET `/submissions/{id}` | Get Submission | Chi tiết bài nộp |
| PATCH `/submissions/{id}/grade` | Grade Submission | Chấm điểm |
| **Interactive Books** (`/interactive-books`) | | |
| GET `/interactive-books` | List Books | Danh sách sách |
| POST `/interactive-books` | Create Book | Tạo sách mới |
| GET `/interactive-books/{id}` | Get Book | Chi tiết sách |
| PUT `/interactive-books/{id}` | Update Book | Cập nhật sách |
| POST `/interactive-books/{id}/publish` | Publish Book | Xuất bản sách |
| GET `/interactive-books/{id}/scenes` | List Scenes | Danh sách scenes |
| **Messages** (`/conversations`) | | |
| GET `/conversations` | List Conversations | Danh sách cuộc trò chuyện |
| POST `/conversations` | Create Conversation | Tạo cuộc trò chuyện |
| GET `/conversations/{id}/messages` | List Messages | Tin nhắn trong cuộc trò chuyện |
| POST `/conversations/{id}/messages` | Send Message | Gửi tin nhắn |
| **Notifications** (`/notifications`) | | |
| GET `/notifications` | List Notifications | Danh sách thông báo |
| PATCH `/notifications/{id}/read` | Mark as Read | Đánh dấu đã đọc |

### 3.3 Services & Logic

| Service | File | Mô Tả |
|---------|------|-------|
| **AuthService** | `app/services/auth_service.py` | Xử lý login, register, token |
| **ExamService** | `app/services/exam_service.py` | Logic thi, chấm điểm |
| **GradingService** | `app/services/grading_service.py` | Grading cho các loại câu hỏi |
| **GameAccessService** | `app/services/game_access_service.py` | Kiểm tra quyền chơi game |
| **GameRuntimeService** | `app/services/game_runtime_service.py` | Runtime cho game |
| **GameLeaderboardService** | `app/services/game_leaderboard_service.py` | Bảng xếp hạng |
| **InteractiveBookService** | `app/services/interactive_book_service.py` | Logic sách tương tác |

### 3.4 Authentication

**Flow Authentication:**

```
1. Register: 
   - Validate email uniqueness
   - Hash password (bcrypt)
   - Create user
   - Return UserPublic

2. Login:
   - Find user by email
   - Verify password
   - Create JWT token (24h expiration)
   - Return { token, user }

3. Request với Token:
   - Header: Authorization: Bearer <token>
   - Backend decode token
   - Get current user từ dependencies
```

**Dependencies quan trọng** (`backend/app/core/dependencies.py`):
- `get_current_user`: Lấy user từ JWT
- `require_teacher`: Kiểm tra role teacher
- `require_student`: Kiểm tra role student

---

## 4. Frontend - Chi Tiết

### 4.1 Routing

**Router chính** (`frontend/src/routes/index.tsx`):

```
/                           → Redirect to /login
/login                      → Login page
/register                   → Register page

/teacher                    → Dashboard Layout
├── /teacher/dashboard       → Teacher Dashboard
├── /teacher/library/system   → System Library
├── /teacher/library/personal → Personal Library
├── /teacher/classes         → Classes List
├── /teacher/classes/:id     → Class Detail
├── /teacher/classes/:classId/exams/create → Create Exam
├── /teacher/games          → Games List
├── /teacher/games/create    → Create Game Package
├── /teacher/games/:packageId → Game Package Detail
├── /teacher/exams/:id      → Exam Detail
├── /teacher/exams/:examId/submissions/:submissionId → Review Submission
├── /teacher/inbox          → Inbox
├── /teacher/settings       → Settings

/student                     → Dashboard Layout
├── /student/dashboard       → Student Dashboard
├── /student/classes         → Classes List
├── /student/classes/:id     → Class Detail
├── /student/library         → Library
├── /student/games           → Games List
├── /student/games/:packageId → Play Game
├── /student/exams          → Exams List
├── /student/exam/:id       → Take Exam
├── /student/inbox          → Inbox
├── /student/chatbot        → AI Chatbot
├── /student/settings       → Settings
```

### 4.2 State Management

**Stores** (`frontend/src/store/`):

| Store | File | Mô Tả |
|-------|------|-------|
| **AuthStore** | `auth.store.ts` | User, token, login/logout (persisted) |
| **ChatStore** | `chat.store.ts` | Unread message count |
| **NotificationStore** | `notification.store.ts` | Notifications state |
| **ClassStore** | `class.store.ts` | Class-related state |
| **ExamStore** | `exam.store.ts` | Exam-taking state |
| **ToastStore** | `toast.store.ts` | Toast notifications |

**AuthStore Interface:**
```typescript
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
}
```

### 4.3 API Services

**Axios Instance** (`frontend/src/services/api.ts`):
```typescript
// Request interceptor: attach JWT token
// Response interceptor: handle 401 → logout & redirect to login
```

| Service | File | Mô Tả |
|---------|------|-------|
| **api** | `api.ts` | Axios instance |
| **auth.service** | `auth.service.ts` | Login, register, getMe |
| **class.service** | `class.service.ts` | Class CRUD, chapters, materials |
| **exam.service** | `exam.service.ts` | Exams, questions, submissions |
| **game.service** | `game.service.ts` | Games, attempts, leaderboards |
| **library.service** | `library.service.ts` | Materials, folders |
| **chat.service** | `chat.service.ts` | Conversations, messages |
| **notification.service** | `notification.service.ts` | Notifications |
| **dashboard.service** | `dashboard.service.ts` | Dashboard stats |
| **interactive-book.service** | `interactive-book.service.ts` | Interactive books |

### 4.4 Components

**Layout Components** (`frontend/src/components/layout/`):
- `DashboardLayout.tsx`: Main layout with sidebar
- `Sidebar.tsx`: Navigation sidebar
- `Navbar.tsx`: Top navigation bar
- `NotificationBell.tsx`: Notification icon

**Common Components** (`frontend/src/components/common/`):
- `Button.tsx`: Reusable button
- `Card.tsx`: Card component
- `Input.tsx`: Input field
- `Modal.tsx`: Modal dialog
- `Table.tsx`: Table component
- `Badge.tsx`: Badge/chip
- `ToastViewport.tsx`: Toast container

**Feature Components:**

| Category | Components |
|----------|------------|
| **Classes** | `ClassCard.tsx`, `ChapterSection.tsx`, `AddMaterialToChapterModal.tsx`, `StudentTable.tsx` |
| **Exams** | `ExamCard.tsx`, `ExamTimer.tsx`, `QuestionEditor.tsx` |
| **Games** | `GameCard.tsx`, `GameQuestionEditor.tsx`, `GameQuestionModal.tsx`, `GamePlayerShell.tsx`, `MemoryCardPairEditor.tsx` |
| **Interactive Books** | `InteractiveBookPlayer.tsx`, `SceneLayerCanvas.tsx`, `editor/*` (full editor) |
| **Library** | `MaterialCard.tsx`, `UploadMaterialModal.tsx` |
| **Chat** | `ChatWindow.tsx`, `InboxPage.tsx`, `MessageItem.tsx` |

---

## 5. Mapping Tính Năng → Files

### 5.1 Authentication

| Tính năng | Backend | Frontend |
|-----------|---------|----------|
| Register | `app/api/v1/endpoints/auth.py`<br>`app/services/auth_service.py`<br>`app/models/user.py` | `pages/auth/Register.tsx`<br>`services/auth.service.ts` |
| Login | `app/api/v1/endpoints/auth.py`<br>`app/core/security.py` | `pages/auth/Login.tsx`<br>`store/auth.store.ts` |
| Logout | `app/api/v1/endpoints/auth.py` | `store/auth.store.ts` |
| JWT Validation | `app/core/dependencies.py` | `services/api.ts` |

### 5.2 Class Management

| Tính năng | Backend | Frontend |
|-----------|---------|----------|
| Tạo lớp | `app/api/v1/endpoints/classes.py`<br>`app/crud/class_crud.py`<br>`app/models/class_model.py` | `pages/teacher/Classes.tsx` |
| Thêm học sinh | `app/api/v1/endpoints/classes.py` | `components/classes/StudentTable.tsx` |
| Tạo chapter | `app/api/v1/endpoints/classes.py` | `components/classes/ChapterSection.tsx` |
| Thêm material | `app/api/v1/endpoints/classes.py` | `components/classes/AddMaterialToChapterModal.tsx` |

### 5.3 Material Library

| Tính năng | Backend | Frontend |
|-----------|---------|----------|
| Upload file | `app/api/v1/endpoints/upload.py`<br>`app/utils/file_upload.py` | `components/library/UploadMaterialModal.tsx` |
| Quản lý library | `app/api/v1/endpoints/library.py`<br>`app/crud/material.py` | `pages/teacher/Library.tsx`<br>`pages/student/Library.tsx` |

### 5.4 Exam System

| Tính năng | Backend | Frontend |
|-----------|---------|----------|
| Tạo exam | `app/api/v1/endpoints/exams.py`<br>`app/models/content_package.py` | `pages/teacher/CreateExam.tsx` |
| Thi exam | `app/api/v1/endpoints/exams.py`<br>`app/services/exam_service.py` | `pages/student/Exam.tsx` |
| Chấm điểm | `app/api/v1/endpoints/submissions.py`<br>`app/services/grading_service.py` | `pages/teacher/SubmissionReview.tsx` |
| Xem kết quả | `app/schemas/question.py` | `pages/student/exam/ExamReviewView.tsx` |
| **Auto-save draft** | - | `hooks/useAutoSave.ts`<br>`pages/teacher/ExamDetail.tsx`<br>`pages/teacher/CreateExam.tsx` |

### 5.5 Game System

| Tính năng | Backend | Frontend |
|-----------|---------|----------|
| Game registry | `app/models/game_module.py` | `public/game-modules/*/manifest.json` |
| Tạo game package | `app/api/v1/endpoints/game_packages.py` | `pages/teacher/GamePackageCreate.tsx` |
| Chơi game | `app/api/v1/endpoints/game_packages.py`<br>`app/services/game_runtime_service.py` | `pages/student/GamePlayer.tsx` |
| Game shell | - | `components/games/GamePlayerShell.tsx` |
| Game bridge | - | `features/games/bridge.ts` |
| Bảng xếp hạng | `app/services/game_leaderboard_service.py` | `components/games/GameCard.tsx` |

### 5.6 Interactive Books

| Tính năng | Backend | Frontend |
|-----------|---------|----------|
| Model | `app/models/interactive_book.py` | - |
| API | `app/api/v1/endpoints/interactive_books.py`<br>`app/services/interactive_book_service.py` | `services/interactive-book.service.ts` |
| Editor | - | `pages/teacher/InteractiveBookEditor.tsx`<br>`components/interactive-book/editor/*` |
| Player | - | `pages/student/InteractiveBook.tsx`<br>`components/interactive-book/InteractiveBookPlayer.tsx` |

### 5.7 Messaging

| Tính năng | Backend | Frontend |
|-----------|---------|----------|
| Conversations | `app/models/message.py` | `components/chat/InboxPage.tsx` |
| Messages | `app/api/v1/endpoints/messages.py` | `components/chat/ChatWindow.tsx` |

### 5.8 Notifications

| Tính năng | Backend | Frontend |
|-----------|---------|----------|
| Model | `app/models/notification.py` | - |
| API | `app/api/v1/endpoints/notifications.py` | `store/notification.store.ts` |
| UI | - | `components/layout/NotificationBell.tsx` |

---

## 6. Hệ Thống Game

### 6.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      Game Integration Architecture              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐      ┌─────────────────┐      ┌─────────────┐ │
│   │   Backend   │      │    Frontend     │      │ Game Bundle │ │
│   │             │      │                 │      │   (iframe)  │ │
│   │ game_modules│──────│ GamePlayerShell │──────│             │ │
│   │ content_pkg │      │    bridge.ts    │      │  gold-miner │ │
│   │ question_bk │      │                 │      │ memory-card │ │
│   └─────────────┘      └─────────────────┘      └─────────────┘ │
│         │                      │                        │       │
│         │                      │ postMessage             │       │
│         │                      ▼                        │       │
│         │              ┌─────────────────┐               │       │
│         │              │  Bridge Protocol │               │       │
│         │              │  - host:init      │               │       │
│         │              │  - host:pause    │               │       │
│         │              │  - host:resume    │               │       │
│         │              │  - host:restart   │               │       │
│         │              │  - game:ready     │               │       │
│         │              │  - game:complete  │               │       │
│         │              │  - game:question  │               │       │
│         │              └─────────────────┘               │       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Game Modules

**Registry** (`app/models/game_module.py`):
- `id`: UUID
- `slug`: unique identifier (gold-miner, memory-card)
- `title`: Display name
- `runtime_kind`: 'iframe' (hiện tại chỉ hỗ trợ iframe)
- `manifest_url`: Path to manifest.json

**Available Games:**

| Game | Path | Type | Features |
|------|------|------|----------|
| Gold Miner | `/game-modules/gold-miner/` | Canvas Arcade | Hook-dropping, questions at intervals |
| Memory Card | `/game-modules/memory-card/` | Card Matching | Teacher-created pairs |

### 6.3 Manifest Contract

**Required manifest fields:**

```json
{
  "id": "game-slug",
  "slug": "game-slug",
  "title": "Game Title",
  "description": "Game description",
  "entry": "/game-modules/game-slug/index.html",
  "runtime": {
    "kind": "iframe",
    "sandbox": "allow-scripts",
    "aspect_ratio": "16 / 9"
  },
  "bridge": {
    "enabled": true,
    "version": 1,
    "capabilities": ["ready", "state", "progress", "question-trigger", "complete", "pause", "resume", "restart"]
  }
}
```

### 6.4 Game Package Flow

```
1. Teacher tạo GamePackage:
   POST /api/v1/game-packages
   - title, description
   - game_module_id (gold-miner/memory-card)
   - Questions (QuestionBank)
   - Card pairs (cho memory-card)

2. Teacher gán cho class:
   POST /api/v1/classes/{id}/assignments

3. Student chơi:
   GET /api/v1/game-packages/{id} → Lấy manifest
   POST /api/v1/game-packages/{id}/start → Tạo attempt
   → GamePlayerShell load iframe
   → Bridge gửi questions khi cần
   POST /api/v1/game-packages/{id}/complete → Lưu kết quả
```

### 6.5 Game-Related Files

| Component | Backend Files | Frontend Files |
|-----------|---------------|----------------|
| **Registry** | `models/game_module.py` | - |
| **Package CRUD** | `api/endpoints/game_packages.py`<br>`crud/game.py` | `pages/teacher/Games.tsx`<br>`pages/teacher/GamePackageCreate.tsx` |
| **Runtime** | `services/game_runtime_service.py`<br>`services/game_access_service.py` | `components/games/GamePlayerShell.tsx`<br>`features/games/bridge.ts` |
| **Leaderboard** | `services/game_leaderboard_service.py` | `components/games/GameCard.tsx` |
| **Card Pairs** | `models/game_card.py`<br>`crud/game_card.py` | `components/games/MemoryCardPairEditor.tsx` |
| **Catalog** | - | `public/game-modules/catalog.json` |

### 6.6 Game Fullscreen Mode

**GamePlayerShell** tự động xử lý fullscreen theo flow sau:

1. **Auto Fullscreen**: Khi game chuyển sang trạng thái `running` (lần đầu), tự động yêu cầu fullscreen
2. **Nút Back**: Trong chế độ fullscreen, hiển thị overlay nút "Quay lại danh sách" góc trái trên
3. **Nút Fullscreen**: Header có nút bật/tắt fullscreen, thay đổi icon và label theo trạng thái
4. **Auto Exit**: Khi game hoàn thành (`runtimeStatus === 'completed'`), tự động thoát fullscreen
5. **Question Flow**: Khi question modal xuất hiện, tự động thoát fullscreen để hiển thị modal

**State tracked:**
- `isFullscreen`: Theo dõi trạng thái fullscreen qua `fullscreenchange` event
- `autoFullscreenTriggered`: Chỉ trigger auto fullscreen 1 lần mỗi session, reset khi restart

---

## 7. Interactive Books

### 7.1 Data Model

```
InteractiveBook
├── scenes[] (InteractiveBookScene)
│   ├── type: "timeline" | "media" | "quiz" | "choice" | etc.
│   ├── elements[] (InteractiveBookSceneElement)
│   │   ├── type: "text" | "image" | "quiz" | "action" | "media"
│   │   ├── quiz_id → InteractiveBookQuiz
│   │   ├── action_id → InteractiveBookAction
│   │   └── media_id → InteractiveBookMedia
│   └── transitions[]
├── quizzes[] (InteractiveBookQuiz)
│   ├── question
│   └── options[] (InteractiveBookQuizOption)
├── actions[] (InteractiveBookAction)
├── media[] (InteractiveBookMedia)
└── attempts[] (InteractiveBookAttempt)
    └── events[] (InteractiveBookEvent)
```

### 7.2 Scene Types

| Type | Mô Tả |
|------|-------|
| `timeline` | Scene dạng timeline |
| `media` | Scene với video/image |
| `quiz` | Scene chứa câu hỏi |
| `choice` | Scene với lựa chọn |

### 7.3 Interactive Book Flow

```
1. Teacher tạo InteractiveBook:
   POST /api/v1/interactive-books
   - Tạo Material (type: interactive_book)
   - Tạo InteractiveBook record

2. Teacher thêm scenes:
   POST /api/v1/interactive-books/{id}/scenes
   - Thêm elements (text, media, quiz, actions)

3. Teacher publish:
   POST /api/v1/interactive-books/{id}/publish

4. Student đọc:
   GET /api/v1/interactive-books/{id}
   - Lấy manifest với scenes
   - InteractiveBookPlayer render scenes
   - Track attempt progress
```

### 7.4 Interactive Book Files

| Component | Backend | Frontend |
|-----------|---------|----------|
| **Models** | `models/interactive_book.py` | - |
| **API** | `api/endpoints/interactive_books.py`<br>`services/interactive_book_service.py` | `services/interactive-book.service.ts` |
| **Editor** | - | `pages/teacher/InteractiveBookEditor.tsx` |
| **Editor Panels** | - | `components/interactive-book/editor/*` |
| **Player** | - | `pages/student/InteractiveBook.tsx` |
| **Player Component** | - | `components/interactive-book/InteractiveBookPlayer.tsx` |

---

## 8. Exam System

### 8.1 Exam Flow

```
1. Teacher tạo Exam:
   POST /api/v1/exams
   - Tạo ContentPackage (type: exam)
   - Tạo ExamPackageConfig
   - Thêm questions vào QuestionBank

2. Teacher gán cho class:
   POST /api/v1/classes/{id}/assignments

3. Student thi:
   GET /api/v1/exams/{id} → Lấy questions
   POST /api/v1/exams/{id}/start → Tạo submission
   PATCH /api/v1/exams/{id}/submit → Nộp bài

4. Teacher chấm:
   GET /api/v1/exams/{id}/submissions
   PATCH /api/v1/submissions/{id}/grade → Chấm điểm
```

### 8.2 Question Types

| Type | Description | Grading |
|------|-------------|---------|
| `single_choice` | Một đáp án đúng | Auto |
| `multi_choice` | Nhiều đáp án đúng | Auto |
| `matching` | Nối cặp trái-phải | Auto |
| `text` | Tự luận | Manual |

### 8.3 Exam Files

| Component | Backend | Frontend |
|-----------|---------|----------|
| **Models** | `models/content_package.py`<br>`models/question_bank.py` | - |
| **API** | `api/endpoints/exams.py`<br>`services/exam_service.py` | `services/exam.service.ts` |
| **Grading** | `services/grading_service.py` | - |
| **Create Exam** | - | `pages/teacher/CreateExam.tsx` |
| **Question Editor** | - | `components/exam/QuestionEditor.tsx` |
| **Take Exam** | - | `pages/student/Exam.tsx` |
| **Review** | - | `pages/teacher/SubmissionReview.tsx` |

---

## 9. Communication System

### 9.1 Messaging

```
Conversation (thread)
├── ConversationMember[] (participants)
└── Message[]
    ├── sender_id
    ├── content
    └── file_url (optional)
```

### 9.2 Notifications

```
Notification
├── user_id (recipient)
├── type: "new_exam" | "new_material" | "submission_received" | etc.
├── title
├── content
├── link (navigate to)
└── is_read
```

---

## 10. Hướng Dẫn Bảo Trì

### 10.1 Thêm Game Mới

1. Tạo bundle game trong `frontend/public/game-modules/<slug>/`
2. Tạo `manifest.json` với cấu trúc chuẩn
3. Thêm vào catalog `frontend/public/game-modules/catalog.json`
4. Đăng ký module: `POST /api/v1/game-modules`
5. Cập nhật `GamePlayerShell.tsx` nếu cần custom logic

### 10.2 Thêm Question Type

1. Thêm enum vào `app/utils/enums.py`
2. Thêm model fields trong `app/models/question_bank.py`
3. Thêm grading logic trong `app/services/grading_service.py`
4. Thêm UI trong `components/exam/QuestionEditor.tsx`

### 10.3 Thêm Scene Type cho Interactive Book

1. Thêm type vào enum
2. Thêm rendering logic trong `InteractiveBookPlayer.tsx`
3. Thêm editor trong `components/interactive-book/editor/`

### 10.4 Thêm API Endpoint

1. Tạo/Update router trong `app/api/v1/endpoints/`
2. Thêm vào `app/api/v1/router.py`
3. Tạo CRUD functions trong `app/crud/`
4. Thêm schemas trong `app/schemas/`
5. Tạo service nếu cần business logic

### 10.5 Database Migration

```bash
cd backend
# Tạo migration mới
alembic revision --autogenerate -m "description"

# Chạy migration
alembic upgrade head

# Rollback
alembic downgrade -1
```

### 10.6 Environment Variables

**Backend** (`backend/.env`):
```env
DATABASE_URL=postgresql://user:pass@localhost:5433/eduhub
SECRET_KEY=your-secret-key
CORS_ORIGINS=http://localhost:5173
CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx
```

**Frontend** (`frontend/.env`):
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

---

## Quick Reference - Đường Dẫn Quan Trọng

| Mục đích | Đường dẫn |
|----------|-----------|
| API Docs | http://localhost:8000/docs |
| Frontend Dev | http://localhost:5173 |
| Database | postgresql://localhost:5433/eduhub |
| Upload Folder | backend/uploads/ |
| Game Bundles | frontend/public/game-modules/ |

---

## Liên Hệ & Support

Khi cần hỗ trợ thêm, refer đến:
- Source code trong thư mục tương ứng
- API documentation tại `/docs`
- Database schema tại `eduhub.render.sql`
