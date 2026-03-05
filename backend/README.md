# EduHub Backend — API Reference

FastAPI + SQLite backend for the EduHub learning management platform.

- **Base URL (dev):** `http://127.0.0.1:8002`
- **Interactive docs:** `GET /docs` (Swagger UI) · `GET /redoc`
- **All endpoints are prefixed with `/api/v1`**

---

## Authentication

Most endpoints require a **Bearer token** in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

Tokens are obtained from `POST /api/v1/auth/login`.

---

## Standard Response Envelope

Every endpoint returns JSON in this shape:

```json
{
  "status": true,           // boolean — true = success, false = error
  "message": "Success",     // human-readable string
  "data": { ... }           // payload (object, array, or null)
}
```

Error responses have `"status": false` and no `"data"` key:

```json
{
  "status": false,
  "message": "Email already registered"
}
```

---

## Table of Contents

1. [Auth](#1-auth)
2. [Users](#2-users)
3. [Classes](#3-classes)
4. [Chapters](#4-chapters)
5. [Library (Materials)](#5-library-materials)
6. [Exams](#6-exams)
7. [Questions](#7-questions)
8. [Submissions](#8-submissions)
9. [Messages (Conversations)](#9-messages-conversations)
10. [Dashboard](#10-dashboard)
11. [Chatbot](#11-chatbot)
12. [Enums Reference](#12-enums-reference)
13. [Error Codes](#13-error-codes)
14. [Project Structure](#14-project-structure)

---

## 1. Auth

### `POST /api/v1/auth/register`

Register a new user account.

**Auth required:** No

**Request body:**

| Field       | Type                     | Required | Description                              |
| ----------- | ------------------------ | -------- | ---------------------------------------- |
| `full_name` | `string`                 | ✅       | Display name                             |
| `email`     | `string (email)`         | ✅       | Unique email address                     |
| `password`  | `string`                 | ✅       | Plain-text password (hashed server-side) |
| `role`      | `"teacher" \| "student"` | ✅       | Account role                             |

**Example request:**

```json
{
  "full_name": "Nguyen Van A",
  "email": "teacher@example.com",
  "password": "MySecurePass123",
  "role": "teacher"
}
```

**Response `201`:**

```json
{
  "status": true,
  "message": "Dang ky thanh cong",
  "data": {
    "user": {
      "id": "a1b2c3d4-...",
      "full_name": "Nguyen Van A",
      "email": "teacher@example.com",
      "role": "teacher",
      "avatar_url": null,
      "is_active": true,
      "created_at": "2026-03-05T10:00:00"
    }
  }
}
```

**Errors:** `400` — email already registered · `422` — invalid email format

---

### `POST /api/v1/auth/login`

Obtain a JWT access token.

**Auth required:** No

**Request body:**

| Field      | Type             | Required | Description      |
| ---------- | ---------------- | -------- | ---------------- |
| `email`    | `string (email)` | ✅       | Registered email |
| `password` | `string`         | ✅       | Account password |

**Example request:**

```json
{
  "email": "teacher@example.com",
  "password": "MySecurePass123"
}
```

**Response `200`:**

```json
{
  "status": true,
  "message": "Dang nhap thanh cong",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "a1b2c3d4-...",
      "full_name": "Nguyen Van A",
      "email": "teacher@example.com",
      "role": "teacher",
      "avatar_url": null,
      "is_active": true,
      "created_at": "2026-03-05T10:00:00"
    }
  }
}
```

**Errors:** `401` — wrong email or password · `403` — inactive account

---

### `GET /api/v1/auth/me`

Get the currently authenticated user's profile.

**Auth required:** Yes

**Response `200`:**

```json
{
  "status": true,
  "message": "Lay thong tin thanh cong",
  "data": {
    "id": "a1b2c3d4-...",
    "full_name": "Nguyen Van A",
    "email": "teacher@example.com",
    "role": "teacher",
    "avatar_url": null,
    "is_active": true,
    "created_at": "2026-03-05T10:00:00"
  }
}
```

**Errors:** `401` — missing or invalid token

---

### `POST /api/v1/auth/logout`

Invalidate the current session (stateless — client should discard the token).

**Auth required:** Yes

**Response `200`:**

```json
{
  "status": true,
  "message": "Dang xuat thanh cong",
  "data": null
}
```

---

## 2. Users

### `GET /api/v1/users/profile`

Get the authenticated user's full profile.

**Auth required:** Yes

**Response `200`:** Same shape as `GET /auth/me → data`.

---

### `PUT /api/v1/users/profile`

Update the authenticated user's display name or avatar.

**Auth required:** Yes

**Request body (all optional):**

| Field        | Type     | Description         |
| ------------ | -------- | ------------------- |
| `full_name`  | `string` | New display name    |
| `avatar_url` | `string` | URL to avatar image |

**Example request:**

```json
{
  "full_name": "Nguyen Van B",
  "avatar_url": "https://cdn.example.com/avatars/abc.png"
}
```

**Response `200`:** Updated user object (same shape as `UserPublic`).

---

### `PUT /api/v1/users/password`

Change the authenticated user's password.

**Auth required:** Yes

**Request body:**

| Field              | Type     | Required | Description                       |
| ------------------ | -------- | -------- | --------------------------------- |
| `current_password` | `string` | ✅       | Current password for verification |
| `new_password`     | `string` | ✅       | New password to set               |

**Example request:**

```json
{
  "current_password": "OldPass123",
  "new_password": "NewPass456"
}
```

**Response `200`:**

```json
{
  "status": true,
  "message": "Doi mat khau thanh cong",
  "data": null
}
```

**Errors:** `400` — current password incorrect

---

## 3. Classes

### `GET /api/v1/classes`

List classes for the current user.

- **Teacher:** returns classes they created.
- **Student:** returns classes they joined.

**Auth required:** Yes

**Response `200`:**

```json
{
  "status": true,
  "message": "Success",
  "data": [
    {
      "id": "cls-uuid-...",
      "name": "Math 101",
      "description": "Advanced calculus",
      "thumbnail_url": null,
      "teacher_id": "teacher-uuid-...",
      "join_code": "ABC123",
      "created_at": "2026-03-05T10:00:00"
    }
  ]
}
```

---

### `POST /api/v1/classes`

Create a new class.

**Auth required:** Yes · **Role required:** `teacher`

**Request body:**

| Field           | Type     | Required | Description          |
| --------------- | -------- | -------- | -------------------- |
| `name`          | `string` | ✅       | Class name           |
| `description`   | `string` | ❌       | Optional description |
| `thumbnail_url` | `string` | ❌       | Cover image URL      |

**Example request:**

```json
{
  "name": "Math 101",
  "description": "Advanced calculus for grade 10"
}
```

**Response `201`:**

```json
{
  "status": true,
  "message": "Success",
  "data": {
    "id": "cls-uuid-...",
    "name": "Math 101",
    "description": "Advanced calculus for grade 10",
    "thumbnail_url": null,
    "teacher_id": "teacher-uuid-...",
    "join_code": "XYZ789",
    "created_at": "2026-03-05T10:00:00"
  }
}
```

**Errors:** `403` — not a teacher

---

### `GET /api/v1/classes/{class_id}`

Get details of a single class.

**Auth required:** Yes

**Path params:** `class_id` (string UUID)

**Response `200`:** Single class object (same shape as in list).

**Errors:** `404` — class not found

---

### `PUT /api/v1/classes/{class_id}`

Update a class.

**Auth required:** Yes · **Role required:** `teacher` (must own the class)

**Path params:** `class_id` (string UUID)

**Request body (all optional):**

| Field           | Type     | Description         |
| --------------- | -------- | ------------------- |
| `name`          | `string` | New class name      |
| `description`   | `string` | New description     |
| `thumbnail_url` | `string` | New cover image URL |

**Response `200`:** Updated class object.

**Errors:** `403` — not a teacher · `404` — class not found / not owned

---

### `DELETE /api/v1/classes/{class_id}`

Delete a class (cascades to chapters, materials, exams).

**Auth required:** Yes · **Role required:** `teacher` (must own the class)

**Path params:** `class_id` (string UUID)

**Response `200`:**

```json
{ "status": true, "message": "Xoa lop thanh cong", "data": null }
```

---

### `POST /api/v1/classes/join`

Student joins a class using a join code.

**Auth required:** Yes · **Role required:** `student`

**Request body:**

| Field       | Type     | Required | Description                                 |
| ----------- | -------- | -------- | ------------------------------------------- |
| `join_code` | `string` | ✅       | The class join code (shown on class detail) |

**Example request:**

```json
{ "join_code": "XYZ789" }
```

**Response `200`:** Class object.

**Errors:** `400` — already a member · `403` — not a student · `404` — invalid join code

---

### `GET /api/v1/classes/{class_id}/students`

List all students in a class.

**Auth required:** Yes

**Path params:** `class_id` (string UUID)

**Response `200`:**

```json
{
  "status": true,
  "message": "Success",
  "data": [
    {
      "id": "student-uuid-...",
      "full_name": "Tran Thi B",
      "email": "student@example.com",
      "role": "student",
      "avatar_url": null,
      "is_active": true,
      "created_at": "2026-03-05T10:00:00"
    }
  ]
}
```

---

### `DELETE /api/v1/classes/{class_id}/students/{student_id}`

Remove a student from a class.

**Auth required:** Yes · **Role required:** `teacher` (must own the class)

**Path params:** `class_id`, `student_id` (string UUIDs)

**Response `200`:**

```json
{ "status": true, "message": "Da xoa hoc sinh khoi lop", "data": null }
```

**Errors:** `404` — student not in class

---

### `POST /api/v1/classes/{class_id}/chapters`

Add a chapter to a class.

**Auth required:** Yes · **Role required:** `teacher`

**Path params:** `class_id` (string UUID)

**Request body:**

| Field         | Type      | Required | Description             |
| ------------- | --------- | -------- | ----------------------- |
| `name`        | `string`  | ✅       | Chapter title           |
| `order_index` | `integer` | ❌       | Sort order (default: 0) |

**Example request:**

```json
{ "name": "Chapter 1: Limits", "order_index": 1 }
```

**Response `201`:**

```json
{
  "status": true,
  "message": "Success",
  "data": {
    "id": "chap-uuid-...",
    "class_id": "cls-uuid-...",
    "name": "Chapter 1: Limits",
    "order_index": 1,
    "created_at": "2026-03-05T10:00:00"
  }
}
```

---

### `POST /api/v1/classes/{class_id}/materials`

Attach a library material to a class (optionally to a chapter).

**Auth required:** Yes · **Role required:** `teacher`

**Path params:** `class_id` (string UUID)

**Request body:**

| Field         | Type     | Required | Description                         |
| ------------- | -------- | -------- | ----------------------------------- |
| `material_id` | `string` | ✅       | UUID of the material in the library |
| `chapter_id`  | `string` | ❌       | UUID of the chapter to attach to    |

**Example request:**

```json
{
  "material_id": "mat-uuid-...",
  "chapter_id": "chap-uuid-..."
}
```

**Response `201`:**

```json
{
  "status": true,
  "message": "Success",
  "data": {
    "id": "cm-uuid-...",
    "class_id": "cls-uuid-...",
    "material_id": "mat-uuid-...",
    "chapter_id": "chap-uuid-..."
  }
}
```

---

### `GET /api/v1/classes/{class_id}/materials`

List all materials attached to a class.

**Auth required:** Yes

**Response `200`:**

```json
{
  "status": true,
  "message": "Success",
  "data": [
    {
      "id": "cm-uuid-...",
      "material_id": "mat-uuid-...",
      "chapter_id": "chap-uuid-..."
    }
  ]
}
```

---

### `GET /api/v1/classes/{class_id}/exams`

List all exams belonging to a class.

**Auth required:** Yes

**Response `200`:** Array of exam objects (see [Exams](#6-exams) for schema).

---

### `POST /api/v1/classes/{class_id}/exams`

Create an exam in a class.

**Auth required:** Yes · **Role required:** `teacher` (must own the class)

**Path params:** `class_id` (string UUID)

**Request body:**

| Field           | Type                         | Required | Description          |
| --------------- | ---------------------------- | -------- | -------------------- |
| `title`         | `string`                     | ✅       | Exam title           |
| `description`   | `string`                     | ❌       | Optional description |
| `thumbnail_url` | `string`                     | ❌       | Cover image URL      |
| `start_time`    | `string (ISO 8601 datetime)` | ❌       | When exam opens      |
| `end_time`      | `string (ISO 8601 datetime)` | ❌       | When exam closes     |

**Example request:**

```json
{
  "title": "Midterm Exam",
  "start_time": "2026-03-10T08:00:00",
  "end_time": "2026-03-10T10:00:00"
}
```

**Response `201`:** Exam object (see below).

---

## 4. Chapters

### `PUT /api/v1/chapters/{chapter_id}`

Update a chapter title or order.

**Auth required:** Yes · **Role required:** `teacher`

**Path params:** `chapter_id` (string UUID)

**Request body (all optional):**

| Field         | Type      | Description       |
| ------------- | --------- | ----------------- |
| `name`        | `string`  | New chapter title |
| `order_index` | `integer` | New sort order    |

**Response `200`:** Updated chapter object.

---

### `DELETE /api/v1/chapters/{chapter_id}`

Delete a chapter.

**Auth required:** Yes · **Role required:** `teacher`

**Path params:** `chapter_id` (string UUID)

**Response `200`:**

```json
{ "status": true, "message": "Success", "data": null }
```

---

## 5. Library (Materials)

### `GET /api/v1/library`

List all library materials with optional filters.

**Auth required:** Yes

**Query parameters:**

| Param       | Type      | Description                                                                |
| ----------- | --------- | -------------------------------------------------------------------------- |
| `type`      | `string`  | Filter by material type (`book`, `exam`, `video`, `reference`, `document`) |
| `subject`   | `string`  | Filter by subject (e.g. `"Math"`)                                          |
| `grade`     | `string`  | Filter by grade (e.g. `"10"`)                                              |
| `search`    | `string`  | Search in title                                                            |
| `is_system` | `boolean` | Filter system materials (`true`/`false`)                                   |

**Example:** `GET /api/v1/library?subject=Math&grade=10`

**Response `200`:**

```json
{
  "status": true,
  "message": "Success",
  "data": [
    {
      "id": "mat-uuid-...",
      "title": "Calculus Textbook",
      "description": "Comprehensive calculus guide",
      "thumbnail_url": null,
      "file_url": "https://example.com/calc.pdf",
      "material_type": "book",
      "subject": "Math",
      "grade": "10",
      "is_system": false,
      "created_by": "teacher-uuid-...",
      "created_at": "2026-03-05T10:00:00"
    }
  ]
}
```

---

### `POST /api/v1/library`

Add a new material to the library.

**Auth required:** Yes · **Role required:** `teacher`

**Request body:**

| Field           | Type      | Required | Description                                                                |
| --------------- | --------- | -------- | -------------------------------------------------------------------------- |
| `title`         | `string`  | ✅       | Material title                                                             |
| `description`   | `string`  | ❌       | Optional description                                                       |
| `thumbnail_url` | `string`  | ❌       | Cover image URL                                                            |
| `file_url`      | `string`  | ❌       | URL to the file (PDF, video, etc.)                                         |
| `material_type` | `string`  | ❌       | `book` / `exam` / `video` / `reference` / `document` (default: `document`) |
| `subject`       | `string`  | ❌       | Subject name                                                               |
| `grade`         | `string`  | ❌       | Grade / level                                                              |
| `is_system`     | `boolean` | ❌       | Whether it's a system-provided material (default: `false`)                 |

**Example request:**

```json
{
  "title": "Calculus Textbook",
  "file_url": "https://example.com/calc.pdf",
  "material_type": "book",
  "subject": "Math",
  "grade": "10"
}
```

**Response `201`:** Material object (same shape as in list).

---

### `GET /api/v1/library/{material_id}`

Get a single material.

**Auth required:** Yes

**Path params:** `material_id` (string UUID)

**Response `200`:** Material object.

**Errors:** `404` — not found

---

### `PUT /api/v1/library/{material_id}`

Update a material.

**Auth required:** Yes · **Role required:** `teacher` (must be creator)

**Path params:** `material_id` (string UUID)

**Request body (all optional):** Same fields as create except `is_system`.

**Response `200`:** Updated material object.

---

### `DELETE /api/v1/library/{material_id}`

Delete a material (also removes it from all classes it was attached to).

**Auth required:** Yes · **Role required:** `teacher` (must be creator)

**Path params:** `material_id` (string UUID)

**Response `200`:**

```json
{ "status": true, "message": "Da xoa tai lieu", "data": null }
```

---

## 6. Exams

### Exam object schema

```json
{
  "id": "exam-uuid-...",
  "class_id": "cls-uuid-...",
  "title": "Midterm Exam",
  "description": null,
  "thumbnail_url": null,
  "start_time": "2026-03-10T08:00:00",
  "end_time": "2026-03-10T10:00:00",
  "status": "upcoming",
  "created_by": "teacher-uuid-...",
  "created_at": "2026-03-05T10:00:00"
}
```

**`status` values:** `upcoming` (before start) · `open` (during window) · `closed` (after end)

---

### `GET /api/v1/exams/{exam_id}`

Get exam details.

**Auth required:** Yes

**Path params:** `exam_id` (string UUID)

**Response `200`:** Exam object.

---

### `PUT /api/v1/exams/{exam_id}`

Update an exam.

**Auth required:** Yes · **Role required:** `teacher` (must be creator)

**Request body (all optional):**

| Field           | Type                | Description                                  |
| --------------- | ------------------- | -------------------------------------------- |
| `title`         | `string`            | New title                                    |
| `description`   | `string`            | New description                              |
| `thumbnail_url` | `string`            | New cover URL                                |
| `start_time`    | `string (ISO 8601)` | New start time                               |
| `end_time`      | `string (ISO 8601)` | New end time                                 |
| `status`        | `string`            | Override status (`upcoming`/`open`/`closed`) |

**Response `200`:** Updated exam object.

---

### `DELETE /api/v1/exams/{exam_id}`

Delete an exam and all its questions.

**Auth required:** Yes · **Role required:** `teacher`

**Response `200`:**

```json
{ "status": true, "message": "Da xoa de thi", "data": null }
```

---

## 7. Questions

### `GET /api/v1/exams/{exam_id}/questions`

List all questions in an exam (sorted by `order_index`).

**Auth required:** Yes

**Response `200`:**

```json
{
  "status": true,
  "message": "Success",
  "data": [
    {
      "id": "q-uuid-...",
      "exam_id": "exam-uuid-...",
      "type": "single_choice",
      "content": "What is 2 + 2?",
      "instruction": null,
      "points": 10,
      "required": true,
      "order_index": 0,
      "options": [
        { "id": "opt-uuid-1", "content": "3", "is_correct": false },
        { "id": "opt-uuid-2", "content": "4", "is_correct": true },
        { "id": "opt-uuid-3", "content": "5", "is_correct": false }
      ],
      "matching_pairs": []
    }
  ]
}
```

---

### `POST /api/v1/exams/{exam_id}/questions`

Add a question to an exam.

**Auth required:** Yes · **Role required:** `teacher`

**Request body:**

| Field            | Type      | Required | Description                                         |
| ---------------- | --------- | -------- | --------------------------------------------------- |
| `type`           | `string`  | ✅       | Question type (see [Enums](#12-enums-reference))    |
| `content`        | `string`  | ✅       | Question text                                       |
| `instruction`    | `string`  | ❌       | Optional instruction                                |
| `points`         | `integer` | ❌       | Points awarded (default: 1)                         |
| `required`       | `boolean` | ❌       | Whether student must answer (default: `true`)       |
| `order_index`    | `integer` | ❌       | Sort position (default: 0)                          |
| `options`        | `array`   | ❌       | Answer choices (for `single_choice`/`multi_choice`) |
| `matching_pairs` | `array`   | ❌       | Pairs (for `matching`)                              |

**`options` item:**

| Field        | Type      | Required | Description                                                  |
| ------------ | --------- | -------- | ------------------------------------------------------------ |
| `content`    | `string`  | ✅       | Option text                                                  |
| `is_correct` | `boolean` | ❌       | Whether this option is the correct answer (default: `false`) |

**`matching_pairs` item:**

| Field           | Type     | Required | Description                  |
| --------------- | -------- | -------- | ---------------------------- |
| `left_text`     | `string` | ✅       | Left column text             |
| `right_text`    | `string` | ✅       | Right column text            |
| `correct_match` | `string` | ✅       | The correct match identifier |

**Example request (single choice):**

```json
{
  "type": "single_choice",
  "content": "What is the capital of Vietnam?",
  "points": 5,
  "options": [
    { "content": "Ho Chi Minh City", "is_correct": false },
    { "content": "Hanoi", "is_correct": true },
    { "content": "Da Nang", "is_correct": false }
  ]
}
```

**Example request (text / open-ended):**

```json
{
  "type": "text",
  "content": "Describe the process of photosynthesis.",
  "points": 10,
  "options": []
}
```

**Response `201`:** Question object with populated `options` and `matching_pairs`.

---

### `PUT /api/v1/questions/{question_id}`

Update a question's metadata (does not update options).

**Auth required:** Yes · **Role required:** `teacher`

**Path params:** `question_id` (string UUID)

**Request body (all optional):**

| Field         | Type      | Description       |
| ------------- | --------- | ----------------- |
| `content`     | `string`  | New question text |
| `instruction` | `string`  | New instruction   |
| `points`      | `integer` | New point value   |
| `required`    | `boolean` | Required flag     |
| `order_index` | `integer` | New sort order    |

**Response `200`:** Updated question object.

---

### `DELETE /api/v1/questions/{question_id}`

Delete a question and its options / student answers.

**Auth required:** Yes · **Role required:** `teacher`

**Response `200`:**

```json
{ "status": true, "message": "Da xoa cau hoi", "data": null }
```

---

## 8. Submissions

### Submission object schema

```json
{
  "id": "sub-uuid-...",
  "exam_id": "exam-uuid-...",
  "student_id": "student-uuid-...",
  "started_at": "2026-03-10T08:05:00",
  "submitted_at": "2026-03-10T09:45:00",
  "total_score": 25.0,
  "status": "graded"
}
```

**`status` values:** `in_progress` · `submitted` · `graded`

---

### `POST /api/v1/exams/{exam_id}/start`

Start (or resume) an exam attempt.

**Auth required:** Yes

**Path params:** `exam_id` (string UUID)

> If the student already has an `in_progress` submission, it is returned instead of creating a new one.

**Response `200`:** Submission object with `status: "in_progress"`.

**Errors:** `400` — exam not yet open or already closed · `404` — exam not found

---

### `POST /api/v1/exams/{exam_id}/submit`

Submit exam answers. Auto-grades `single_choice` and `multi_choice` immediately.

**Auth required:** Yes

**Request body:**

| Field     | Type    | Required | Description            |
| --------- | ------- | -------- | ---------------------- |
| `answers` | `array` | ✅       | List of answer objects |

**Answer item:**

| Field                 | Type       | Required | Description                                                |
| --------------------- | ---------- | -------- | ---------------------------------------------------------- |
| `question_id`         | `string`   | ✅       | UUID of the question being answered                        |
| `text_answer`         | `string`   | ❌       | Free-text answer (for `type: "text"`)                      |
| `selected_option_ids` | `string[]` | ❌       | Option UUIDs selected (for `single_choice`/`multi_choice`) |
| `uploaded_image_url`  | `string`   | ❌       | URL for image-upload questions                             |

**Example request:**

```json
{
  "answers": [
    {
      "question_id": "q-uuid-1",
      "selected_option_ids": ["opt-uuid-2"]
    },
    {
      "question_id": "q-uuid-2",
      "text_answer": "Photosynthesis converts CO2 and water into glucose."
    }
  ]
}
```

**Response `200`:** Submission object with final `total_score` and `status: "graded"`.

---

### `GET /api/v1/exams/{exam_id}/submissions`

List all student submissions for an exam.

**Auth required:** Yes · **Role required:** `teacher`

**Response `200`:** Array of submission objects.

---

### `GET /api/v1/submissions/{submission_id}`

Get details of a single submission.

**Auth required:** Yes

**Path params:** `submission_id` (string UUID)

**Response `200`:** Submission object.

---

## 9. Messages (Conversations)

### `GET /api/v1/conversations`

List all conversations the current user is a member of.

**Auth required:** Yes

**Response `200`:**

```json
{
  "status": true,
  "message": "Success",
  "data": [
    {
      "id": "conv-uuid-...",
      "created_at": "2026-03-05T11:00:00",
      "member_ids": ["user-uuid-a", "user-uuid-b"]
    }
  ]
}
```

---

### `POST /api/v1/conversations`

Start a direct (1-to-1) conversation with another user. Idempotent — returns the existing conversation if it already exists.

**Auth required:** Yes

**Request body:**

| Field     | Type     | Required | Description                   |
| --------- | -------- | -------- | ----------------------------- |
| `user_id` | `string` | ✅       | UUID of the other participant |

**Example request:**

```json
{ "user_id": "student-uuid-..." }
```

**Response `201` (new) or `200` (existing):**

```json
{
  "status": true,
  "message": "Success",
  "data": {
    "id": "conv-uuid-...",
    "created_at": "2026-03-05T11:00:00",
    "member_ids": ["teacher-uuid-...", "student-uuid-..."]
  }
}
```

---

### `GET /api/v1/conversations/{conv_id}/messages`

Get all messages in a conversation.

**Auth required:** Yes (must be a member)

**Path params:** `conv_id` (string UUID)

**Response `200`:**

```json
{
  "status": true,
  "message": "Success",
  "data": [
    {
      "id": "msg-uuid-...",
      "conversation_id": "conv-uuid-...",
      "sender_id": "teacher-uuid-...",
      "content": "Hello!",
      "file_url": null,
      "is_read": false,
      "created_at": "2026-03-05T11:05:00"
    }
  ]
}
```

**Errors:** `403` — not a member of this conversation

---

### `POST /api/v1/conversations/{conv_id}/messages`

Send a message in a conversation.

**Auth required:** Yes (must be a member)

**Path params:** `conv_id` (string UUID)

**Request body:**

| Field      | Type     | Required | Description                 |
| ---------- | -------- | -------- | --------------------------- |
| `content`  | `string` | ❌\*     | Text content of the message |
| `file_url` | `string` | ❌\*     | URL of an attached file     |

> \* At least one of `content` or `file_url` should be provided.

**Example request:**

```json
{ "content": "Hello! Please review Chapter 2." }
```

**Response `201`:** Message object.

**Errors:** `403` — not a member of this conversation

---

## 10. Dashboard

### `GET /api/v1/dashboard/teacher`

Teacher-specific summary statistics.

**Auth required:** Yes

**Response `200`:**

```json
{
  "status": true,
  "message": "Success",
  "data": {
    "total_classes": 3,
    "total_students": 75,
    "total_exams": 10,
    "upcoming_exams": 2,
    "classes": [
      { "id": "cls-uuid-...", "name": "Math 101", "student_count": 30 },
      { "id": "cls-uuid-...", "name": "Physics", "student_count": 25 }
    ]
  }
}
```

**Field meanings:**

| Field            | Description                                |
| ---------------- | ------------------------------------------ |
| `total_classes`  | Number of classes the teacher owns         |
| `total_students` | Total enrolled students across all classes |
| `total_exams`    | Total exams created across all classes     |
| `upcoming_exams` | Exams with `status: "upcoming"`            |
| `classes`        | Summary of each class with student count   |

---

### `GET /api/v1/dashboard/student`

Student-specific summary statistics.

**Auth required:** Yes

**Response `200`:**

```json
{
  "status": true,
  "message": "Success",
  "data": {
    "total_classes": 4,
    "total_exams": 12,
    "upcoming_exams": 3,
    "pending_submissions": 1,
    "classes": [{ "id": "cls-uuid-...", "name": "Math 101" }]
  }
}
```

**Field meanings:**

| Field                 | Description                                         |
| --------------------- | --------------------------------------------------- |
| `total_classes`       | Number of classes the student is enrolled in        |
| `total_exams`         | Total exams available in those classes              |
| `upcoming_exams`      | Exams not yet open                                  |
| `pending_submissions` | Exams started but not yet submitted (`in_progress`) |
| `classes`             | List of enrolled classes                            |

---

## 11. Chatbot

### `POST /api/v1/chatbot/ask`

Ask the AI assistant a question.

> **Note:** The current implementation is a placeholder. Integrate an LLM/AI API (e.g. OpenAI, Azure OpenAI) to return real answers.

**Auth required:** Yes

**Request body:**

| Field      | Type     | Required | Description                      |
| ---------- | -------- | -------- | -------------------------------- |
| `question` | `string` | ✅       | Question text to ask the chatbot |

**Example request:**

```json
{ "question": "What is machine learning?" }
```

**Response `200`:**

```json
{
  "status": true,
  "message": "Tra loi thanh cong",
  "data": {
    "answer": "Xin chao Nguyen Van A! Day la phan hoi tu chatbot (placeholder)."
  }
}
```

---

## 12. Enums Reference

### `UserRole`

| Value     | Description                                  |
| --------- | -------------------------------------------- |
| `teacher` | Can create classes, exams, library materials |
| `student` | Can join classes, take exams, send messages  |
| `admin`   | Reserved for future admin panel              |

### `MaterialType`

| Value       | Description                |
| ----------- | -------------------------- |
| `book`      | Textbook / e-book          |
| `exam`      | Past exam / practice test  |
| `video`     | Video lecture              |
| `reference` | Reference document         |
| `document`  | Generic document (default) |

### `ExamStatus`

| Value      | Description                                   |
| ---------- | --------------------------------------------- |
| `upcoming` | Exam exists but `start_time` is in the future |
| `open`     | Exam is currently accepting submissions       |
| `closed`   | `end_time` has passed                         |

### `QuestionType`

| Value           | Description                       | Auto-graded |
| --------------- | --------------------------------- | ----------- |
| `single_choice` | One correct option from a list    | ✅          |
| `multi_choice`  | Multiple correct options          | ✅          |
| `text`          | Free-text open-ended answer       | ❌ Manual   |
| `image_upload`  | Student uploads an image          | ❌ Manual   |
| `matching`      | Match left column to right column | ❌ Manual   |

### `SubmissionStatus`

| Value         | Description                           |
| ------------- | ------------------------------------- |
| `in_progress` | Student started but has not submitted |
| `submitted`   | Submitted, awaiting manual grading    |
| `graded`      | Fully graded (auto or manual)         |

---

## 13. Error Codes

| HTTP Code | Meaning                                                                 |
| --------- | ----------------------------------------------------------------------- |
| `400`     | Bad request (e.g. duplicate email, wrong password, already joined)      |
| `401`     | Missing, invalid, or expired Bearer token                               |
| `403`     | Authenticated but insufficient role/permissions                         |
| `404`     | Resource not found                                                      |
| `422`     | Request body validation failed (invalid types, missing required fields) |
| `500`     | Unexpected server error                                                 |

---

## 14. Project Structure

```
backend/
├── .env                        # Environment variables (secret key, DB URL, etc.)
├── requirements.txt            # Python dependencies
├── app/
│   ├── main.py                 # FastAPI app init, CORS, lifespan
│   ├── api/
│   │   └── v1/
│   │       ├── router.py       # Combines all routers under /api/v1
│   │       └── endpoints/
│   │           ├── auth.py         # Register, login, me, logout
│   │           ├── users.py        # Profile, password change
│   │           ├── classes.py      # Classes + chapters + class materials
│   │           ├── library.py      # Library materials CRUD
│   │           ├── exams.py        # Exams + questions
│   │           ├── submissions.py  # Exam start/submit/list
│   │           ├── messages.py     # Conversations + messages
│   │           ├── dashboard.py    # Teacher & student dashboards
│   │           └── chatbot.py      # AI chatbot endpoint
│   ├── core/
│   │   ├── config.py           # Settings (pydantic-settings, reads .env)
│   │   ├── security.py         # JWT create/decode, password hash/verify
│   │   └── dependencies.py     # get_current_user, require_teacher, require_student
│   ├── crud/                   # Database access layer (one file per domain)
│   │   ├── user.py
│   │   ├── class_crud.py
│   │   ├── material.py
│   │   ├── exam.py
│   │   ├── submission.py
│   │   └── message.py
│   ├── db/
│   │   ├── base.py             # SQLAlchemy declarative Base
│   │   ├── session.py          # Engine, SessionLocal, get_db dependency
│   │   └── init_db.py          # create_tables() — called at startup
│   ├── models/                 # SQLAlchemy ORM models (14 tables)
│   ├── schemas/                # Pydantic request/response schemas
│   ├── services/
│   │   ├── auth_service.py     # register(), login() business logic
│   │   ├── exam_service.py     # start_exam(), submit_exam()
│   │   └── grading_service.py  # auto_grade() — scores single/multi choice
│   └── utils/
│       ├── enums.py            # All Enum definitions
│       ├── responses.py        # ok() / err() JSON envelope helpers
│       └── file_upload.py      # save_upload_file() — local file storage
└── tests/
    └── test_api.py             # 56-test sequential integration test suite
```

### Running the server

```bash
# 1. Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # macOS/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment (copy and edit)
copy .env .env.local            # Windows
cp .env .env.local              # macOS/Linux

# 4. Start the development server
uvicorn app.main:app --reload --port 8002

# 5. Run the full integration test suite
python tests/test_api.py --base-url http://127.0.0.1:8002
```

### Environment variables (`.env`)

| Variable                      | Default              | Description                                         |
| ----------------------------- | -------------------- | --------------------------------------------------- |
| `APP_NAME`                    | `EduHub`             | Application name shown in docs                      |
| `DEBUG`                       | `false`              | SQLAlchemy query logging                            |
| `SECRET_KEY`                  | _(change this)_      | JWT signing key — **must be changed in production** |
| `ALGORITHM`                   | `HS256`              | JWT algorithm                                       |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440`               | Token TTL (24 hours)                                |
| `DATABASE_URL`                | `sqlite:///./app.db` | SQLAlchemy connection string                        |
| `UPLOAD_DIR`                  | `uploads`            | Local directory for uploaded files                  |
| `MAX_UPLOAD_SIZE_MB`          | `10`                 | Max file upload size                                |
