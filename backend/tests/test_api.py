"""
EduHub Backend — Full API Test Suite
=====================================
Runs sequentially against a live server.  Each test logs PASS / FAIL / ERROR.

Usage (from backend/ directory with venv activated):
    python tests/test_api.py [--base-url http://127.0.0.1:8001]

Exit code 0 = all tests passed, 1 = one or more failures.
"""

import sys
import json
import time
import argparse
import textwrap
import traceback
from datetime import datetime, timedelta, timezone
from typing import Any

import requests

# ── colours ──────────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

# ── shared state (filled in during test run) ──────────────────────────────────
STATE: dict[str, Any] = {}

# ── result tracking ────────────────────────────────────────────────────────────
results: list[dict] = []


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _label(name: str) -> str:
    return f"{BOLD}{name:<55}{RESET}"


def record(name: str, passed: bool, note: str = ""):
    status = f"{GREEN}PASS{RESET}" if passed else f"{RED}FAIL{RESET}"
    suffix = f"  {YELLOW}{note}{RESET}" if note else ""
    print(f"  {status}  {_label(name)}{suffix}")
    results.append({"name": name, "passed": passed, "note": note})


def api(method: str, path: str, base_url: str, **kwargs) -> requests.Response:
    """Thin wrapper so tests stay DRY."""
    url = base_url.rstrip("/") + path
    return requests.request(method, url, timeout=15, **kwargs)


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def j(data: Any) -> str:
    """Compact JSON serialiser for request bodies."""
    return json.dumps(data)


# ─────────────────────────────────────────────────────────────────────────────
# Individual test functions
# ─────────────────────────────────────────────────────────────────────────────

def test_register_teacher(base: str):
    ts = int(time.time())
    email = f"teacher_{ts}@example.com"
    r = api("POST", "/api/v1/auth/register", base, json={
        "full_name": "Test Teacher",
        "email": email,
        "password": "TestPass123",
        "role": "teacher",
    })
    ok = r.status_code == 201 and r.json().get("status") is True
    if ok:
        STATE["teacher_email"] = email
        STATE["teacher_id"] = r.json()["data"]["user"]["id"]
    record("POST /auth/register (teacher)", ok,
           f"status={r.status_code}" if not ok else "")


def test_register_student(base: str):
    ts = int(time.time())
    email = f"student_{ts}@example.com"
    r = api("POST", "/api/v1/auth/register", base, json={
        "full_name": "Test Student",
        "email": email,
        "password": "TestPass123",
        "role": "student",
    })
    ok = r.status_code == 201 and r.json().get("status") is True
    if ok:
        STATE["student_email"] = email
        STATE["student_id"] = r.json()["data"]["user"]["id"]
    record("POST /auth/register (student)", ok,
           f"status={r.status_code}" if not ok else "")


def test_register_duplicate(base: str):
    email = STATE.get("teacher_email", "x@x.com")
    r = api("POST", "/api/v1/auth/register", base, json={
        "full_name": "Dup", "email": email,
        "password": "TestPass123", "role": "teacher",
    })
    ok = r.status_code == 400
    record("POST /auth/register duplicate → 400", ok,
           f"status={r.status_code}" if not ok else "")


def test_login_teacher(base: str):
    r = api("POST", "/api/v1/auth/login", base, json={
        "email": STATE.get("teacher_email", ""),
        "password": "TestPass123",
    })
    ok = r.status_code == 200 and "access_token" in r.json().get("data", {})
    if ok:
        STATE["teacher_token"] = r.json()["data"]["access_token"]
    record("POST /auth/login (teacher)", ok,
           f"status={r.status_code}" if not ok else "")


def test_login_student(base: str):
    r = api("POST", "/api/v1/auth/login", base, json={
        "email": STATE.get("student_email", ""),
        "password": "TestPass123",
    })
    ok = r.status_code == 200 and "access_token" in r.json().get("data", {})
    if ok:
        STATE["student_token"] = r.json()["data"]["access_token"]
    record("POST /auth/login (student)", ok,
           f"status={r.status_code}" if not ok else "")


def test_login_wrong_password(base: str):
    r = api("POST", "/api/v1/auth/login", base, json={
        "email": STATE.get("teacher_email", "x@x.com"),
        "password": "WrongPass",
    })
    ok = r.status_code in (400, 401)
    record("POST /auth/login wrong password → 4xx", ok,
           f"status={r.status_code}" if not ok else "")


def test_me(base: str):
    tok = STATE.get("teacher_token", "")
    r = api("GET", "/api/v1/auth/me", base, headers=auth_header(tok))
    d = r.json().get("data", {})
    ok = r.status_code == 200 and d.get("email") == STATE.get("teacher_email")
    record("GET /auth/me", ok, f"status={r.status_code}" if not ok else "")


def test_me_no_token(base: str):
    r = api("GET", "/api/v1/auth/me", base)
    ok = r.status_code in (401, 403)
    record("GET /auth/me no token → 401/403", ok,
           f"status={r.status_code}" if not ok else "")


def test_logout(base: str):
    tok = STATE.get("teacher_token", "")
    r = api("POST", "/api/v1/auth/logout", base, headers=auth_header(tok))
    ok = r.status_code == 200
    record("POST /auth/logout", ok, f"status={r.status_code}" if not ok else "")


# ── Users ─────────────────────────────────────────────────────────────────────

def test_get_profile(base: str):
    tok = STATE.get("teacher_token", "")
    r = api("GET", "/api/v1/users/profile", base, headers=auth_header(tok))
    ok = r.status_code == 200 and "email" in r.json().get("data", {})
    record("GET /users/profile", ok, f"status={r.status_code}" if not ok else "")


def test_update_profile(base: str):
    tok = STATE.get("teacher_token", "")
    r = api("PUT", "/api/v1/users/profile", base,
            headers=auth_header(tok),
            json={"full_name": "Teacher Updated"})
    ok = r.status_code == 200
    record("PUT /users/profile", ok, f"status={r.status_code}" if not ok else "")


def test_change_password(base: str):
    tok = STATE.get("teacher_token", "")
    r = api("PUT", "/api/v1/users/password", base,
            headers=auth_header(tok),
            json={"current_password": "TestPass123", "new_password": "TestPass123"})
    ok = r.status_code == 200
    record("PUT /users/password", ok, f"status={r.status_code}" if not ok else "")


# ── Classes ───────────────────────────────────────────────────────────────────

def test_create_class(base: str):
    tok = STATE.get("teacher_token", "")
    r = api("POST", "/api/v1/classes", base,
            headers=auth_header(tok),
            json={"name": "Math 101", "description": "Integration test class"})
    ok = r.status_code == 201 and "id" in r.json().get("data", {})
    if ok:
        d = r.json()["data"]
        STATE["class_id"] = d["id"]
        STATE["join_code"] = d["join_code"]
    record("POST /classes", ok, f"status={r.status_code}" if not ok else "")


def test_list_classes_teacher(base: str):
    tok = STATE.get("teacher_token", "")
    r = api("GET", "/api/v1/classes", base, headers=auth_header(tok))
    ok = r.status_code == 200 and isinstance(r.json().get("data"), list)
    record("GET /classes (teacher)", ok, f"status={r.status_code}" if not ok else "")


def test_get_class(base: str):
    tok = STATE.get("teacher_token", "")
    cid = STATE.get("class_id", "")
    r = api("GET", f"/api/v1/classes/{cid}", base, headers=auth_header(tok))
    ok = r.status_code == 200 and r.json().get("data", {}).get("id") == cid
    record("GET /classes/{id}", ok, f"status={r.status_code}" if not ok else "")


def test_update_class(base: str):
    tok = STATE.get("teacher_token", "")
    cid = STATE.get("class_id", "")
    r = api("PUT", f"/api/v1/classes/{cid}", base,
            headers=auth_header(tok),
            json={"name": "Math 101 Updated"})
    ok = r.status_code == 200
    record("PUT /classes/{id}", ok, f"status={r.status_code}" if not ok else "")


def test_student_join_class(base: str):
    tok = STATE.get("student_token", "")
    r = api("POST", "/api/v1/classes/join", base,
            headers=auth_header(tok),
            json={"join_code": STATE.get("join_code", "")})
    ok = r.status_code == 200
    record("POST /classes/join (student)", ok,
           f"status={r.status_code} body={r.text[:120]}" if not ok else "")


def test_list_students(base: str):
    tok = STATE.get("teacher_token", "")
    cid = STATE.get("class_id", "")
    r = api("GET", f"/api/v1/classes/{cid}/students", base, headers=auth_header(tok))
    ok = r.status_code == 200 and isinstance(r.json().get("data"), list)
    record("GET /classes/{id}/students", ok,
           f"status={r.status_code}" if not ok else "")


def test_list_classes_student(base: str):
    tok = STATE.get("student_token", "")
    r = api("GET", "/api/v1/classes", base, headers=auth_header(tok))
    ok = r.status_code == 200 and isinstance(r.json().get("data"), list)
    record("GET /classes (student after join)", ok,
           f"status={r.status_code}" if not ok else "")


# ── Chapters ──────────────────────────────────────────────────────────────────

def test_create_chapter(base: str):
    tok = STATE.get("teacher_token", "")
    cid = STATE.get("class_id", "")
    r = api("POST", f"/api/v1/classes/{cid}/chapters", base,
            headers=auth_header(tok),
            json={"name": "Chapter 1", "order_index": 1})
    ok = r.status_code == 201 and "id" in r.json().get("data", {})
    if ok:
        STATE["chapter_id"] = r.json()["data"]["id"]
    record("POST /classes/{id}/chapters", ok,
           f"status={r.status_code}" if not ok else "")


def test_update_chapter(base: str):
    tok = STATE.get("teacher_token", "")
    chid = STATE.get("chapter_id", "")
    r = api("PUT", f"/api/v1/chapters/{chid}", base,
            headers=auth_header(tok),
            json={"name": "Chapter 1 Updated"})
    ok = r.status_code == 200
    record("PUT /chapters/{id}", ok, f"status={r.status_code}" if not ok else "")


# ── Library ───────────────────────────────────────────────────────────────────

def test_create_material(base: str):
    tok = STATE.get("teacher_token", "")
    r = api("POST", "/api/v1/library", base,
            headers=auth_header(tok),
            json={
                "title": "Test Book",
                "file_url": "http://example.com/book.pdf",
                "material_type": "book",
                "subject": "Math",
                "grade": "10",
                "is_system": False,
            })
    ok = r.status_code == 201 and "id" in r.json().get("data", {})
    if ok:
        STATE["material_id"] = r.json()["data"]["id"]
    record("POST /library", ok, f"status={r.status_code}" if not ok else "")


def test_list_library(base: str):
    tok = STATE.get("teacher_token", "")
    r = api("GET", "/api/v1/library?subject=Math", base, headers=auth_header(tok))
    ok = r.status_code == 200 and isinstance(r.json().get("data"), list)
    record("GET /library?subject=Math", ok, f"status={r.status_code}" if not ok else "")


def test_get_material(base: str):
    tok = STATE.get("teacher_token", "")
    mid = STATE.get("material_id", "")
    r = api("GET", f"/api/v1/library/{mid}", base, headers=auth_header(tok))
    ok = r.status_code == 200 and r.json().get("data", {}).get("id") == mid
    record("GET /library/{id}", ok, f"status={r.status_code}" if not ok else "")


def test_update_material(base: str):
    tok = STATE.get("teacher_token", "")
    mid = STATE.get("material_id", "")
    r = api("PUT", f"/api/v1/library/{mid}", base,
            headers=auth_header(tok),
            json={"title": "Test Book Updated"})
    ok = r.status_code == 200
    record("PUT /library/{id}", ok, f"status={r.status_code}" if not ok else "")


def test_add_material_to_class(base: str):
    tok = STATE.get("teacher_token", "")
    cid = STATE.get("class_id", "")
    mid = STATE.get("material_id", "")
    r = api("POST", f"/api/v1/classes/{cid}/materials", base,
            headers=auth_header(tok),
            json={"material_id": mid, "chapter_id": STATE.get("chapter_id")})
    ok = r.status_code == 201
    record("POST /classes/{id}/materials", ok,
           f"status={r.status_code}" if not ok else "")


def test_list_class_materials(base: str):
    tok = STATE.get("teacher_token", "")
    cid = STATE.get("class_id", "")
    r = api("GET", f"/api/v1/classes/{cid}/materials", base, headers=auth_header(tok))
    ok = r.status_code == 200 and isinstance(r.json().get("data"), list)
    record("GET /classes/{id}/materials", ok,
           f"status={r.status_code}" if not ok else "")


# ── Exams ─────────────────────────────────────────────────────────────────────

def test_create_exam(base: str):
    tok = STATE.get("teacher_token", "")
    cid = STATE.get("class_id", "")
    now = datetime.now(timezone.utc)
    r = api("POST", f"/api/v1/classes/{cid}/exams", base,
            headers=auth_header(tok),
            json={
                "title": "Integration Exam",
                "start_time": (now - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%S"),
                "end_time":   (now + timedelta(hours=2)).strftime("%Y-%m-%dT%H:%M:%S"),
            })
    ok = r.status_code == 201 and "id" in r.json().get("data", {})
    if ok:
        STATE["exam_id"] = r.json()["data"]["id"]
    record("POST /classes/{id}/exams", ok,
           f"status={r.status_code}" if not ok else "")


def test_list_exams(base: str):
    tok = STATE.get("teacher_token", "")
    cid = STATE.get("class_id", "")
    r = api("GET", f"/api/v1/classes/{cid}/exams", base, headers=auth_header(tok))
    ok = r.status_code == 200 and isinstance(r.json().get("data"), list)
    record("GET /classes/{id}/exams", ok, f"status={r.status_code}" if not ok else "")


def test_get_exam(base: str):
    tok = STATE.get("teacher_token", "")
    eid = STATE.get("exam_id", "")
    r = api("GET", f"/api/v1/exams/{eid}", base, headers=auth_header(tok))
    ok = r.status_code == 200 and r.json().get("data", {}).get("id") == eid
    record("GET /exams/{id}", ok, f"status={r.status_code}" if not ok else "")


def test_update_exam(base: str):
    tok = STATE.get("teacher_token", "")
    eid = STATE.get("exam_id", "")
    r = api("PUT", f"/api/v1/exams/{eid}", base,
            headers=auth_header(tok),
            json={"title": "Integration Exam Updated"})
    ok = r.status_code == 200
    record("PUT /exams/{id}", ok, f"status={r.status_code}" if not ok else "")


# ── Questions ─────────────────────────────────────────────────────────────────

def test_create_question_single_choice(base: str):
    tok = STATE.get("teacher_token", "")
    eid = STATE.get("exam_id", "")
    r = api("POST", f"/api/v1/exams/{eid}/questions", base,
            headers=auth_header(tok),
            json={
                "type": "single_choice",
                "content": "What is 2 + 2?",
                "points": 10,
                "options": [
                    {"content": "3", "is_correct": False},
                    {"content": "4", "is_correct": True},
                    {"content": "5", "is_correct": False},
                ],
            })
    ok = r.status_code == 201 and "id" in r.json().get("data", {})
    if ok:
        d = r.json()["data"]
        STATE["question_id"] = d["id"]
        # store the id of the correct option for submission test
        STATE["correct_option_id"] = next(
            (o["id"] for o in d.get("options", []) if o["is_correct"]), None
        )
    record("POST /exams/{id}/questions (single_choice)", ok,
           f"status={r.status_code}" if not ok else "")


def test_create_question_text(base: str):
    tok = STATE.get("teacher_token", "")
    eid = STATE.get("exam_id", "")
    r = api("POST", f"/api/v1/exams/{eid}/questions", base,
            headers=auth_header(tok),
            json={
                "type": "text",
                "content": "Describe photosynthesis.",
                "points": 5,
                "options": [],
            })
    ok = r.status_code == 201
    if ok:
        STATE["text_question_id"] = r.json()["data"]["id"]
    record("POST /exams/{id}/questions (text)", ok,
           f"status={r.status_code}" if not ok else "")


def test_list_questions(base: str):
    tok = STATE.get("teacher_token", "")
    eid = STATE.get("exam_id", "")
    r = api("GET", f"/api/v1/exams/{eid}/questions", base, headers=auth_header(tok))
    ok = r.status_code == 200 and isinstance(r.json().get("data"), list)
    record("GET /exams/{id}/questions", ok, f"status={r.status_code}" if not ok else "")


def test_update_question(base: str):
    tok = STATE.get("teacher_token", "")
    qid = STATE.get("question_id", "")
    r = api("PUT", f"/api/v1/questions/{qid}", base,
            headers=auth_header(tok),
            json={"content": "What is 2 + 2? (updated)", "points": 10})
    ok = r.status_code == 200
    record("PUT /questions/{id}", ok, f"status={r.status_code}" if not ok else "")


# ── Submissions ───────────────────────────────────────────────────────────────

def test_start_exam(base: str):
    tok = STATE.get("student_token", "")
    eid = STATE.get("exam_id", "")
    r = api("POST", f"/api/v1/exams/{eid}/start", base, headers=auth_header(tok))
    ok = r.status_code == 200 and r.json().get("data", {}).get("status") == "in_progress"
    if ok:
        STATE["submission_id"] = r.json()["data"]["id"]
    record("POST /exams/{id}/start", ok,
           f"status={r.status_code} body={r.text[:120]}" if not ok else "")


def test_start_exam_duplicate(base: str):
    """Second call should return existing in_progress submission or 400."""
    tok = STATE.get("student_token", "")
    eid = STATE.get("exam_id", "")
    r = api("POST", f"/api/v1/exams/{eid}/start", base, headers=auth_header(tok))
    # 200 (return same submission) or 400 (already started) are both acceptable
    ok = r.status_code in (200, 400)
    record("POST /exams/{id}/start duplicate → 200/400", ok,
           f"status={r.status_code}" if not ok else "")


def test_submit_exam(base: str):
    tok = STATE.get("student_token", "")
    eid = STATE.get("exam_id", "")
    answers = []
    if STATE.get("question_id") and STATE.get("correct_option_id"):
        answers.append({
            "question_id": STATE["question_id"],
            "selected_option_ids": [STATE["correct_option_id"]],
        })
    if STATE.get("text_question_id"):
        answers.append({
            "question_id": STATE["text_question_id"],
            "text_answer": "Plants use sunlight to produce glucose.",
        })
    r = api("POST", f"/api/v1/exams/{eid}/submit", base,
            headers=auth_header(tok),
            json={"answers": answers})
    d = r.json().get("data", {})
    ok = r.status_code == 200 and d.get("status") in ("graded", "submitted")
    record("POST /exams/{id}/submit", ok,
           f"status={r.status_code} body={r.text[:150]}" if not ok else f"score={d.get('total_score')}")


def test_list_submissions_teacher(base: str):
    tok = STATE.get("teacher_token", "")
    eid = STATE.get("exam_id", "")
    r = api("GET", f"/api/v1/exams/{eid}/submissions", base, headers=auth_header(tok))
    ok = r.status_code == 200 and isinstance(r.json().get("data"), list)
    record("GET /exams/{id}/submissions (teacher)", ok,
           f"status={r.status_code}" if not ok else "")


def test_get_submission(base: str):
    tok = STATE.get("student_token", "")
    sid = STATE.get("submission_id", "")
    r = api("GET", f"/api/v1/submissions/{sid}", base, headers=auth_header(tok))
    ok = r.status_code == 200 and r.json().get("data", {}).get("id") == sid
    record("GET /submissions/{id}", ok, f"status={r.status_code}" if not ok else "")


# ── Messages ──────────────────────────────────────────────────────────────────

def test_list_conversations_empty(base: str):
    tok = STATE.get("teacher_token", "")
    r = api("GET", "/api/v1/conversations", base, headers=auth_header(tok))
    ok = r.status_code == 200 and isinstance(r.json().get("data"), list)
    record("GET /conversations (empty)", ok, f"status={r.status_code}" if not ok else "")


def test_create_conversation(base: str):
    tok = STATE.get("teacher_token", "")
    sid = STATE.get("student_id", "")
    r = api("POST", "/api/v1/conversations", base,
            headers=auth_header(tok),
            json={"user_id": sid})
    ok = r.status_code == 201 and "id" in r.json().get("data", {})
    if ok:
        STATE["conversation_id"] = r.json()["data"]["id"]
    record("POST /conversations", ok,
           f"status={r.status_code} body={r.text[:120]}" if not ok else "")


def test_create_conversation_idempotent(base: str):
    """Creating the same 1-to-1 again should return same conversation."""
    tok = STATE.get("teacher_token", "")
    sid = STATE.get("student_id", "")
    r = api("POST", "/api/v1/conversations", base,
            headers=auth_header(tok),
            json={"user_id": sid})
    ok = r.status_code in (200, 201) and "id" in r.json().get("data", {})
    record("POST /conversations (idempotent)", ok,
           f"status={r.status_code}" if not ok else "")


def test_send_message(base: str):
    tok = STATE.get("teacher_token", "")
    cvid = STATE.get("conversation_id", "")
    r = api("POST", f"/api/v1/conversations/{cvid}/messages", base,
            headers=auth_header(tok),
            json={"content": "Hello from teacher!"})
    ok = r.status_code == 201 and "id" in r.json().get("data", {})
    if ok:
        STATE["message_id"] = r.json()["data"]["id"]
    record("POST /conversations/{id}/messages", ok,
           f"status={r.status_code}" if not ok else "")


def test_list_messages(base: str):
    tok = STATE.get("teacher_token", "")
    cvid = STATE.get("conversation_id", "")
    r = api("GET", f"/api/v1/conversations/{cvid}/messages", base, headers=auth_header(tok))
    ok = r.status_code == 200 and isinstance(r.json().get("data"), list) and len(r.json()["data"]) >= 1
    record("GET /conversations/{id}/messages", ok,
           f"status={r.status_code}" if not ok else "")


def test_list_conversations_after(base: str):
    tok = STATE.get("teacher_token", "")
    r = api("GET", "/api/v1/conversations", base, headers=auth_header(tok))
    ok = r.status_code == 200 and len(r.json().get("data", [])) >= 1
    record("GET /conversations (after create)", ok,
           f"status={r.status_code}" if not ok else "")


# ── Dashboard ─────────────────────────────────────────────────────────────────

def test_teacher_dashboard(base: str):
    tok = STATE.get("teacher_token", "")
    r = api("GET", "/api/v1/dashboard/teacher", base, headers=auth_header(tok))
    d = r.json().get("data", {})
    ok = (r.status_code == 200
          and "total_classes" in d
          and "total_exams" in d
          and isinstance(d.get("classes"), list))
    record("GET /dashboard/teacher", ok,
           f"status={r.status_code}" if not ok else
           f"classes={d.get('total_classes')} exams={d.get('total_exams')}")


def test_student_dashboard(base: str):
    tok = STATE.get("student_token", "")
    r = api("GET", "/api/v1/dashboard/student", base, headers=auth_header(tok))
    d = r.json().get("data", {})
    ok = (r.status_code == 200
          and "total_classes" in d
          and isinstance(d.get("classes"), list))
    record("GET /dashboard/student", ok,
           f"status={r.status_code}" if not ok else
           f"classes={d.get('total_classes')}")


# ── Chatbot ───────────────────────────────────────────────────────────────────

def test_chatbot(base: str):
    tok = STATE.get("teacher_token", "")
    r = api("POST", "/api/v1/chatbot/ask", base,
            headers=auth_header(tok),
            json={"question": "What is machine learning?"})
    ok = r.status_code == 200 and "answer" in r.json().get("data", {})
    record("POST /chatbot/ask", ok, f"status={r.status_code}" if not ok else "")


def test_chatbot_no_token(base: str):
    r = api("POST", "/api/v1/chatbot/ask", base,
            json={"question": "hello"})
    ok = r.status_code in (401, 403)
    record("POST /chatbot/ask no token → 401/403", ok,
           f"status={r.status_code}" if not ok else "")


# ── Delete (cleanup last so dependent tests run first) ────────────────────────

def test_delete_question(base: str):
    tok = STATE.get("teacher_token", "")
    qid = STATE.get("text_question_id", "")
    if not qid:
        record("DELETE /questions/{id}", False, "no text_question_id in state")
        return
    r = api("DELETE", f"/api/v1/questions/{qid}", base, headers=auth_header(tok))
    ok = r.status_code == 200
    record("DELETE /questions/{id}", ok, f"status={r.status_code}" if not ok else "")


def test_delete_exam(base: str):
    tok = STATE.get("teacher_token", "")
    eid = STATE.get("exam_id", "")
    r = api("DELETE", f"/api/v1/exams/{eid}", base, headers=auth_header(tok))
    ok = r.status_code == 200
    record("DELETE /exams/{id}", ok, f"status={r.status_code}" if not ok else "")


def test_delete_chapter(base: str):
    tok = STATE.get("teacher_token", "")
    chid = STATE.get("chapter_id", "")
    r = api("DELETE", f"/api/v1/chapters/{chid}", base, headers=auth_header(tok))
    ok = r.status_code == 200
    record("DELETE /chapters/{id}", ok, f"status={r.status_code}" if not ok else "")


def test_delete_material(base: str):
    tok = STATE.get("teacher_token", "")
    mid = STATE.get("material_id", "")
    r = api("DELETE", f"/api/v1/library/{mid}", base, headers=auth_header(tok))
    ok = r.status_code == 200
    record("DELETE /library/{id}", ok, f"status={r.status_code}" if not ok else "")


def test_remove_student(base: str):
    tok = STATE.get("teacher_token", "")
    cid = STATE.get("class_id", "")
    sid = STATE.get("student_id", "")
    r = api("DELETE", f"/api/v1/classes/{cid}/students/{sid}", base,
            headers=auth_header(tok))
    ok = r.status_code == 200
    record("DELETE /classes/{id}/students/{student_id}", ok,
           f"status={r.status_code}" if not ok else "")


def test_delete_class(base: str):
    tok = STATE.get("teacher_token", "")
    cid = STATE.get("class_id", "")
    r = api("DELETE", f"/api/v1/classes/{cid}", base, headers=auth_header(tok))
    ok = r.status_code == 200
    record("DELETE /classes/{id}", ok, f"status={r.status_code}" if not ok else "")


# ─────────────────────────────────────────────────────────────────────────────
# Master test list (ordered)
# ─────────────────────────────────────────────────────────────────────────────

TESTS = [
    # Auth
    test_register_teacher,
    test_register_student,
    test_register_duplicate,
    test_login_teacher,
    test_login_student,
    test_login_wrong_password,
    test_me,
    test_me_no_token,
    test_logout,
    # Users
    test_get_profile,
    test_update_profile,
    test_change_password,
    # Classes
    test_create_class,
    test_list_classes_teacher,
    test_get_class,
    test_update_class,
    test_student_join_class,
    test_list_students,
    test_list_classes_student,
    # Chapters
    test_create_chapter,
    test_update_chapter,
    # Library
    test_create_material,
    test_list_library,
    test_get_material,
    test_update_material,
    test_add_material_to_class,
    test_list_class_materials,
    # Exams
    test_create_exam,
    test_list_exams,
    test_get_exam,
    test_update_exam,
    # Questions
    test_create_question_single_choice,
    test_create_question_text,
    test_list_questions,
    test_update_question,
    # Submissions
    test_start_exam,
    test_start_exam_duplicate,
    test_submit_exam,
    test_list_submissions_teacher,
    test_get_submission,
    # Messages
    test_list_conversations_empty,
    test_create_conversation,
    test_create_conversation_idempotent,
    test_send_message,
    test_list_messages,
    test_list_conversations_after,
    # Dashboard
    test_teacher_dashboard,
    test_student_dashboard,
    # Chatbot
    test_chatbot,
    test_chatbot_no_token,
    # Cleanup (delete operations)
    test_delete_question,
    test_delete_exam,
    test_delete_chapter,
    test_delete_material,
    test_remove_student,
    test_delete_class,
]


# ─────────────────────────────────────────────────────────────────────────────
# Runner
# ─────────────────────────────────────────────────────────────────────────────

def wait_for_server(base: str, timeout: int = 30) -> bool:
    print(f"{CYAN}Waiting for server at {base} ...{RESET}", end="", flush=True)
    for _ in range(timeout):
        try:
            r = requests.get(f"{base}/api/v1/auth/me", timeout=2)
            # any response (even 401) means the server is up
            print(f" {GREEN}ready{RESET}")
            return True
        except Exception:
            time.sleep(1)
            print(".", end="", flush=True)
    print(f" {RED}timed out{RESET}")
    return False


def run_all(base: str):
    print(f"\n{BOLD}{CYAN}{'='*65}{RESET}")
    print(f"{BOLD}{CYAN}  EduHub API Test Suite  —  {base}{RESET}")
    print(f"{BOLD}{CYAN}{'='*65}{RESET}\n")

    for fn in TESTS:
        try:
            fn(base)
        except Exception as exc:
            name = fn.__name__.replace("test_", "").replace("_", " ")
            print(f"  {RED}ERR {RESET} {_label(name)}  {YELLOW}{exc}{RESET}")
            results.append({"name": name, "passed": False, "note": str(exc)})

    # ── Summary ──────────────────────────────────────────────────────────────
    total  = len(results)
    passed = sum(1 for r in results if r["passed"])
    failed = total - passed

    print(f"\n{BOLD}{CYAN}{'='*65}{RESET}")
    print(f"  Total: {total}  |  {GREEN}Passed: {passed}{RESET}  |  {RED}Failed: {failed}{RESET}")
    print(f"{BOLD}{CYAN}{'='*65}{RESET}\n")

    if failed:
        print(f"{RED}Failed tests:{RESET}")
        for r in results:
            if not r["passed"]:
                note = f"  → {r['note']}" if r["note"] else ""
                print(f"  • {r['name']}{note}")
        print()

    return failed == 0


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="EduHub API test runner")
    parser.add_argument(
        "--base-url", default="http://127.0.0.1:8002",
        help="Base URL of the running FastAPI server",
    )
    parser.add_argument(
        "--no-wait", action="store_true",
        help="Skip server readiness check",
    )
    args = parser.parse_args()

    if not args.no_wait:
        if not wait_for_server(args.base_url):
            sys.exit(2)

    success = run_all(args.base_url)
    sys.exit(0 if success else 1)
