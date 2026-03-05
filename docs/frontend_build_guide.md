# FRONTEND BUILD GUIDE
Project: Thế giới cổ tích
Tech stack: Vite + React + TailwindCSS

Goal:
Agent sẽ xây dựng hoàn chỉnh frontend UI trước khi kết nối API backend.
Trong giai đoạn này, sử dụng **mock data** để test UI.

==================================================
PHASE 0 — PROJECT SETUP
==================================================

Step 1: Tạo project

npm create vite@latest frontend
cd frontend
npm install

Step 2: Cài dependencies

npm install react-router-dom axios
npm install lucide-react
npm install zustand
npm install classnames

Step 3: Cài Tailwind

npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

Step 4: Cấu hình tailwind.config.js

Theme colors:

primary: #3B82F6
primary-hover: #2563EB
background: #F3F4F6
card: #FFFFFF

borderRadius:
card: 20px
button: 12px

Step 5: Global CSS

Body background:
bg-gray-100

Font:
"Be Vietnam Pro"

==================================================
PHASE 1 — BASE LAYOUT
==================================================

Goal:
Tạo layout chung cho toàn bộ website.

Components cần tạo:

/components/layout/

Navbar.tsx
Sidebar.tsx
DashboardLayout.tsx

Sidebar menu:

Teacher:
- Home
- Library
- Classes
- Inbox
- Settings

Student:
- Dashboard
- Classes
- Exam
- Inbox
- Chatbot
- Settings

Yêu cầu UI:

Sidebar
- width 240px
- icon + text
- active highlight

Navbar
- avatar user
- logout button

==================================================
PHASE 2 — ROUTING SYSTEM
==================================================

Cấu hình React Router

Routes:

/login
/register

Teacher routes:

/teacher/dashboard
/teacher/library
/teacher/classes
/teacher/classes/:id
/teacher/exams/:id
/teacher/inbox
/teacher/settings

Student routes:

/student/dashboard
/student/classes
/student/exam/:id
/student/inbox
/student/chatbot
/student/settings

==================================================
PHASE 3 — UI COMPONENT LIBRARY
==================================================

Tạo reusable components.

Folder:

/components/common/

Button.tsx
Input.tsx
Modal.tsx
Card.tsx
Badge.tsx
Table.tsx

Style rules:

Button
- rounded-xl
- hover transition

Card
- rounded-2xl
- shadow-md

Modal
- overlay opacity 40%

==================================================
PHASE 4 — LIBRARY PAGE
==================================================

Path:
teacher/library

Layout:

Top bar:
- search
- filter dropdown

Filters:

- subject
- type (book / exam / video)

Material card:

thumbnail
title
description
date

Grid layout:

3 columns desktop

Mock data:

10 materials.

==================================================
PHASE 5 — CLASSES PAGE
==================================================

Path:

teacher/classes

Class card:

thumbnail
class name
teacher name
student count

Click card → class detail page

==================================================
PHASE 6 — CLASS DETAIL
==================================================

Tabs:

- Materials
- Exams
- Students

Materials tab

Grouped by:

Chapter

Exam tab

Exam card:

thumbnail
title
start time
end time

Students tab

Table:

Avatar
Name
Email

==================================================
PHASE 7 — EXAM CREATION
==================================================

Page:

/teacher/exams/:id

Teacher có thể:

Add question

Question types:

- single choice
- multiple choice
- text

UI:

Question card

Option input fields

Add option button

==================================================
PHASE 8 — STUDENT EXAM PAGE
==================================================

Path:

/student/exam/:id

UI:

Exam header
Timer

Question cards

Submit button

Answer input:

radio
checkbox
text

==================================================
PHASE 9 — INBOX UI
==================================================

Layout:

Left:
conversation list

Right:
chat window

Message bubble

Avatar
time

==================================================
PHASE 10 — SETTINGS PAGE
==================================================

User info

Avatar upload

Change password form

==================================================
PHASE 11 — STATE MANAGEMENT
==================================================

Zustand stores:

authStore
classStore
examStore

Mock login state.

==================================================
PHASE 12 — MOCK API LAYER
==================================================

Create:

/services/mockApi.ts

Simulate API responses.

Example:

getClasses()
getMaterials()
getExams()

==================================================
PHASE 13 — UI TEST
==================================================

Checklist:

- All pages render
- Navigation works
- Modals open
- Forms validate
- Mock data loads

==================================================
DONE CRITERIA
==================================================

Frontend considered complete when:

- All pages render correctly
- Mock data works
- Layout responsive
- No runtime errors