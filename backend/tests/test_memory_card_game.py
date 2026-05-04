"""
Memory Card game integration tests.
Tests module registration, play flow, question triggering, publishing, and leaderboards.
"""
import tempfile
import unittest
import uuid
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.core.dependencies import get_db
from app.db.base import Base
from app.main import app


class MemoryCardGameTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._tempdir = tempfile.TemporaryDirectory()
        db_path = Path(cls._tempdir.name) / "memory-card-test.sqlite3"
        cls.engine = create_engine(
            f"sqlite:///{db_path}",
            connect_args={"check_same_thread": False},
        )

        @event.listens_for(cls.engine, "connect")
        def _set_sqlite_pragma(dbapi_conn, connection_record):
            _ = connection_record
            cursor = dbapi_conn.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()

        cls.SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=cls.engine)
        Base.metadata.create_all(bind=cls.engine)

        def override_get_db():
            db = cls.SessionLocal()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_get_db
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        cls.client.close()
        app.dependency_overrides.clear()
        Base.metadata.drop_all(bind=cls.engine)
        cls.engine.dispose()
        cls._tempdir.cleanup()

    def _auth_header(self, token: str) -> dict[str, str]:
        return {"Authorization": f"Bearer {token}"}

    def _register(self, *, full_name: str, email: str, password: str, role: str):
        response = self.client.post(
            "/api/v1/auth/register",
            json={
                "full_name": full_name,
                "email": email,
                "password": password,
                "role": role,
            },
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["data"]["user"]

    def _login(self, *, email: str, password: str) -> str:
        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()["data"]["access_token"]

    def _create_game_question(self, *, package_id: str, teacher_token: str, payload: dict):
        response = self.client.post(
            f"/api/v1/game-packages/{package_id}/questions",
            headers=self._auth_header(teacher_token),
            json=payload,
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["data"]

    def test_memory_card_module_available(self):
        """Verify Memory Card module is registered in the system."""
        unique_suffix = uuid.uuid4().hex
        teacher_email = f"teacher.mctest.{unique_suffix}@example.com"
        password = "TestPass123"

        self._register(full_name="MC Teacher", email=teacher_email, password=password, role="teacher")
        teacher_token = self._login(email=teacher_email, password=password)

        modules_response = self.client.get(
            "/api/v1/game-modules",
            headers=self._auth_header(teacher_token),
        )
        self.assertEqual(modules_response.status_code, 200, modules_response.text)
        modules = modules_response.json()["data"]
        memory_card_module = next((m for m in modules if m["slug"] == "memory-card"), None)
        self.assertIsNotNone(memory_card_module, "Memory Card module not found in list")
        self.assertEqual(memory_card_module["name"], "Memory Card")
        self.assertIn("capabilities", memory_card_module)

    def test_memory_card_play_flow(self):
        """Test Memory Card game play flow with question triggering."""
        unique_suffix = uuid.uuid4().hex
        teacher_email = f"teacher.mcplay.{unique_suffix}@example.com"
        student_email = f"student.mcplay.{unique_suffix}@example.com"
        password = "TestPass123"

        self._register(full_name="MC Play Teacher", email=teacher_email, password=password, role="teacher")
        self._register(full_name="MC Play Student", email=student_email, password=password, role="student")
        teacher_token = self._login(email=teacher_email, password=password)
        student_token = self._login(email=student_email, password=password)

        class_response = self.client.post(
            "/api/v1/classes",
            headers=self._auth_header(teacher_token),
            json={"name": "MC Play Class", "description": "Memory Card play test"},
        )
        self.assertEqual(class_response.status_code, 201, class_response.text)
        class_data = class_response.json()["data"]
        class_id = class_data["id"]

        join_response = self.client.post(
            "/api/v1/classes/join",
            headers=self._auth_header(student_token),
            json={"join_code": class_data["join_code"]},
        )
        self.assertEqual(join_response.status_code, 200, join_response.text)

        modules_response = self.client.get(
            "/api/v1/game-modules",
            headers=self._auth_header(teacher_token),
        )
        self.assertEqual(modules_response.status_code, 200, modules_response.text)
        memory_card_module = next(
            (m for m in modules_response.json()["data"] if m["slug"] == "memory-card"),
            None,
        )
        self.assertIsNotNone(memory_card_module)

        package_response = self.client.post(
            f"/api/v1/classes/{class_id}/game-packages",
            headers=self._auth_header(teacher_token),
            json={
                "title": "Memory Card Vocabulary",
                "description": "Pair matching with questions",
                "game_module_id": memory_card_module["id"],
                "runtime_config": {
                    "memory_card": {"board_pair_count": 4},
                    "session": {"time_limit_seconds": 120},
                },
            },
        )
        self.assertEqual(package_response.status_code, 201, package_response.text)
        package_id = package_response.json()["data"]["id"]

        self._create_game_question(
            package_id=package_id,
            teacher_token=teacher_token,
            payload={
                "type": "single_choice",
                "difficulty_band": "very_easy",
                "content": "What is the capital of France?",
                "points": 1,
                "order_index": 0,
                "options": [
                    {"content": "Paris", "is_correct": True},
                    {"content": "London", "is_correct": False},
                ],
            },
        )

        play_response = self.client.get(
            f"/api/v1/game-packages/{package_id}/play",
            headers=self._auth_header(student_token),
        )
        self.assertEqual(play_response.status_code, 200, play_response.text)
        play_data = play_response.json()["data"]
        self.assertIn("runtime_config", play_data)
        runtime_config = play_data["runtime_config"]
        self.assertIn("question_plan", runtime_config)
        question_plan = runtime_config["question_plan"]
        self.assertEqual(question_plan["level_count"], 4)
        self.assertEqual(len(question_plan["questions_per_level"]), 4)
        self.assertGreaterEqual(question_plan["total_questions"], 1)

        start_response = self.client.post(
            f"/api/v1/game-packages/{package_id}/start",
            headers=self._auth_header(student_token),
        )
        self.assertEqual(start_response.status_code, 200, start_response.text)
        start_data = start_response.json()["data"]
        self.assertEqual(start_data["status"], "in_progress")
        self.assertIn("attempt_id", start_data)
        attempt_id = start_data["attempt_id"]
        self.assertEqual(start_data["runtime_config"]["memory_card"]["board_pair_count"], 4)

        trigger_response = self.client.post(
            f"/api/v1/game-packages/{package_id}/trigger",
            headers=self._auth_header(student_token),
            json={
                "attempt_id": attempt_id,
                "trigger_type": "pair_matched",
                "difficulty_band": "very_easy",
                "item_instance_id": "pair-1",
            },
        )
        self.assertEqual(trigger_response.status_code, 200, trigger_response.text)
        trigger_data = trigger_response.json()["data"]
        self.assertIn("question", trigger_data)

    def test_memory_card_hub_publish_and_leaderboard(self):
        """Test Memory Card publish to game hub and leaderboard."""
        unique_suffix = uuid.uuid4().hex
        teacher_email = f"teacher.mchub.{unique_suffix}@example.com"
        student_email = f"student.mchub.{unique_suffix}@example.com"
        password = "TestPass123"

        self._register(full_name="MC Hub Teacher", email=teacher_email, password=password, role="teacher")
        self._register(full_name="MC Hub Student", email=student_email, password=password, role="student")
        teacher_token = self._login(email=teacher_email, password=password)
        student_token = self._login(email=student_email, password=password)

        modules_response = self.client.get(
            "/api/v1/game-modules",
            headers=self._auth_header(teacher_token),
        )
        self.assertEqual(modules_response.status_code, 200, modules_response.text)
        memory_card_module = next(
            (m for m in modules_response.json()["data"] if m["slug"] == "memory-card"),
            None,
        )
        self.assertIsNotNone(memory_card_module)

        package_response = self.client.post(
            "/api/v1/game-packages",
            headers=self._auth_header(teacher_token),
            json={
                "title": "Public Memory Card Hub",
                "description": "Visible in the shared game hub",
                "game_module_id": memory_card_module["id"],
                "runtime_config": {"memory_card": {"board_pair_count": 6}},
            },
        )
        self.assertEqual(package_response.status_code, 201, package_response.text)
        package_id = package_response.json()["data"]["id"]

        self._create_game_question(
            package_id=package_id,
            teacher_token=teacher_token,
            payload={
                "type": "single_choice",
                "difficulty_band": "easy",
                "content": "2 + 2 = ?",
                "points": 2,
                "order_index": 0,
                "options": [
                    {"content": "4", "is_correct": True},
                    {"content": "5", "is_correct": False},
                ],
            },
        )

        publish_response = self.client.put(
            f"/api/v1/game-packages/{package_id}/publication",
            headers=self._auth_header(teacher_token),
            json={"channel": "game_hub", "access_rule": "all_students"},
        )
        self.assertEqual(publish_response.status_code, 200, publish_response.text)

        start_response = self.client.post(
            f"/api/v1/game-packages/{package_id}/start",
            headers=self._auth_header(student_token),
        )
        self.assertEqual(start_response.status_code, 200, start_response.text)
        attempt_id = start_response.json()["data"]["attempt_id"]

        complete_response = self.client.post(
            f"/api/v1/game-packages/{package_id}/complete",
            headers=self._auth_header(student_token),
            json={
                "attempt_id": attempt_id,
                "score_context": 85.0,
                "duration_ms": 45000,
            },
        )
        self.assertEqual(complete_response.status_code, 200, complete_response.text)
        complete_data = complete_response.json()["data"]
        self.assertEqual(complete_data["status"], "completed")
        self.assertEqual(complete_data["score_total"], 85.0)

        leaderboard_response = self.client.get(
            f"/api/v1/game-packages/{package_id}/leaderboard",
            headers=self._auth_header(student_token),
        )
        self.assertEqual(leaderboard_response.status_code, 200, leaderboard_response.text)
        leaderboard = leaderboard_response.json()["data"]
        self.assertEqual(leaderboard["total_entries"], 1)
        self.assertEqual(leaderboard["entries"][0]["best_score_total"], 85.0)


if __name__ == "__main__":
    unittest.main()
