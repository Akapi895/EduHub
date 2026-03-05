# BACKEND BUILD GUIDE
Project: Thế giới cổ tích
Tech stack: FastAPI + SQLite

Goal:
Build backend API independently.
Test APIs using Swagger or Postman.

==================================================
PHASE 0 — PROJECT SETUP
==================================================

Create project:

backend/

Create virtual env:

python -m venv venv
source venv/bin/activate

Install dependencies:

pip install fastapi
pip install uvicorn
pip install sqlalchemy
pip install pydantic
pip install python-jose
pip install passlib[bcrypt]

==================================================
PHASE 1 — PROJECT STRUCTURE
==================================================

app/

main.py

core/
config.py
security.py

db/
session.py
base.py

models/
schemas/
crud/
api/

==================================================
PHASE 2 — DATABASE SETUP
==================================================

SQLite database:

app.db

SQLAlchemy setup:

create_engine
SessionLocal

==================================================
PHASE 3 — USER MODEL
==================================================

Fields:

id
email
password_hash
full_name
role
created_at

Roles:

teacher
student

==================================================
PHASE 4 — AUTH SYSTEM
==================================================

Implement:

POST /auth/register
POST /auth/login
GET /auth/me

Features:

password hashing
JWT token

==================================================
PHASE 5 — CLASSES MODULE
==================================================

Model:

Class
ClassStudent

APIs:

GET /classes
POST /classes
GET /classes/{id}
POST /classes/join

==================================================
PHASE 6 — LIBRARY MODULE
==================================================

Model:

Material

Fields:

title
description
file_url
thumbnail
material_type

APIs:

GET /library
POST /library
DELETE /library/{id}

==================================================
PHASE 7 — EXAM MODULE
==================================================

Models:

Exam
Question
Option

APIs:

POST /exams
GET /exams/{id}
POST /exams/{id}/questions

==================================================
PHASE 8 — SUBMISSION
==================================================

Models:

Submission
Answer

APIs:

POST /exams/{id}/submit
GET /submissions/{id}

==================================================
PHASE 9 — MESSAGE MODULE
==================================================

Models:

Conversation
Message

APIs:

GET /conversations
POST /messages

==================================================
PHASE 10 — DASHBOARD API
==================================================

Teacher:

GET /dashboard/teacher

Student:

GET /dashboard/student

==================================================
PHASE 11 — TESTING
==================================================

Run server:

uvicorn app.main:app --reload

Open:

/docs

Test every API.

==================================================
DONE CRITERIA
==================================================

Backend considered complete when:

- All endpoints respond correctly
- JWT auth works
- Database CRUD works
- Swagger shows full API