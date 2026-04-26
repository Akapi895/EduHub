# EduHub

Nền tảng học tập trực tuyến cho giáo viên và học sinh, gồm các domain chính như thư viện học liệu, lớp học, đề kiểm tra, sách tương tác và game học tập.

## Tech stack

- Frontend: Vite, React, TypeScript, Tailwind CSS
- Backend: FastAPI, SQLAlchemy, PostgreSQL

## Cấu trúc dự án

```text
EduHub/
├── frontend/   # Ứng dụng React cho teacher và student
├── backend/    # API FastAPI, models, services, migrations
└── docs/       # Tài liệu kỹ thuật đang còn hiệu lực
```

### Frontend

- `src/routes`: khai báo route theo vai trò.
- `src/pages`: page-level container cho teacher và student.
- `src/components`: UI dùng lại và runtime shell.
- `src/features`: logic theo domain, hiện có `games`.
- `src/services`: HTTP client tới backend.
- `public/game-modules`: runtime artifact của các game được nhúng qua `iframe`.

### Backend

- `app/api/v1`: router và endpoint.
- `app/services`: business flow và orchestration.
- `app/crud`: truy cập dữ liệu theo domain.
- `app/models`: schema ORM chuẩn hóa.
- `app/schemas`: request/response schema.
- `alembic/versions`: migration lịch sử.

## Tài liệu nên đọc

- [docs/game-question-system-requirements.md](docs/game-question-system-requirements.md): kiến trúc dữ liệu unified cho exam và game.
- [docs/game-runtime-contract.md](docs/game-runtime-contract.md): contract runtime giữa game, frontend shell và backend.
- [docs/game-modules.md](docs/game-modules.md): cách tổ chức, build và phân phối game module.
- [docs/interactive-book-testing.md](docs/interactive-book-testing.md): tài khoản và smoke test local cho interactive book.

## Chạy local

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```
