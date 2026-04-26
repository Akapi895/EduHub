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


class GameApiFlowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls._tempdir = tempfile.TemporaryDirectory()
        db_path = Path(cls._tempdir.name) / "game-api.sqlite3"
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

    def _bootstrap_class_and_package(self, *, runtime_config: dict | None = None):
        unique_suffix = uuid.uuid4().hex
        teacher_email = f"teacher.game.{unique_suffix}@example.com"
        student_email = f"student.game.{unique_suffix}@example.com"
        password = "TestPass123"

        self._register(full_name="Game Teacher", email=teacher_email, password=password, role="teacher")
        self._register(full_name="Game Student", email=student_email, password=password, role="student")
        teacher_token = self._login(email=teacher_email, password=password)
        student_token = self._login(email=student_email, password=password)

        class_response = self.client.post(
            "/api/v1/classes",
            headers=self._auth_header(teacher_token),
            json={"name": "Game Class", "description": "Runtime test"},
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
        module = modules_response.json()["data"][0]

        package_response = self.client.post(
            f"/api/v1/classes/{class_id}/game-packages",
            headers=self._auth_header(teacher_token),
            json={
                "title": "Gold Miner Pack",
                "description": "Math practice in the mine",
                "game_module_id": module["id"],
                "runtime_config": runtime_config or {},
            },
        )
        self.assertEqual(package_response.status_code, 201, package_response.text)
        package_id = package_response.json()["data"]["id"]
        return teacher_token, student_token, package_id

    def test_game_package_runtime_flow(self):
        teacher_token, student_token, package_id = self._bootstrap_class_and_package(
            runtime_config={
                "question_distribution": {
                    "mode": "progressive",
                    "questions_per_level": 2,
                },
            },
        )

        recognition_question = self._create_game_question(
            package_id=package_id,
            teacher_token=teacher_token,
            payload={
                "type": "single_choice",
                "difficulty_band": "recognition",
                "content": "2 + 2 = ?",
                "points": 2,
                "order_index": 0,
                "options": [
                    {"content": "4", "is_correct": True},
                    {"content": "5", "is_correct": False},
                ],
            },
        )
        comprehension_question = self._create_game_question(
            package_id=package_id,
            teacher_token=teacher_token,
            payload={
                "type": "text",
                "difficulty_band": "comprehension",
                "content": "Gravity pulls objects toward the ____.",
                "points": 3,
                "order_index": 1,
                "text_config": {
                    "grading_mode": "normalized_exact",
                    "input_variant": "short_text",
                    "accepted_answers": ["earth"],
                    "keywords": [],
                },
            },
        )
        application_basic_question = self._create_game_question(
            package_id=package_id,
            teacher_token=teacher_token,
            payload={
                "type": "multi_choice",
                "difficulty_band": "application_basic",
                "content": "Select prime numbers.",
                "points": 2,
                "order_index": 2,
                "options": [
                    {"content": "2", "is_correct": True},
                    {"content": "4", "is_correct": False},
                    {"content": "5", "is_correct": True},
                ],
            },
        )
        application_advanced_question = self._create_game_question(
            package_id=package_id,
            teacher_token=teacher_token,
            payload={
                "type": "single_choice",
                "difficulty_band": "application_advanced",
                "content": "What is 9 x 9?",
                "points": 4,
                "order_index": 3,
                "options": [
                    {"content": "81", "is_correct": True},
                    {"content": "72", "is_correct": False},
                ],
            },
        )
        _ = (recognition_question, comprehension_question, application_basic_question, application_advanced_question)

        play_response = self.client.get(
            f"/api/v1/game-packages/{package_id}/play",
            headers=self._auth_header(student_token),
        )
        self.assertEqual(play_response.status_code, 200, play_response.text)
        self.assertIsNone(play_response.json()["data"]["attempt"])

        start_response = self.client.post(
            f"/api/v1/game-packages/{package_id}/start",
            headers=self._auth_header(student_token),
        )
        self.assertEqual(start_response.status_code, 200, start_response.text)
        start_data = start_response.json()["data"]
        attempt_id = start_data["attempt_id"]
        self.assertEqual(start_data["status"], "in_progress")
        self.assertEqual(start_data["attempt_totals"]["questions_total"], 4)

        question_plan = start_data["runtime_config"]["question_plan"]
        self.assertEqual(question_plan["level_count"], 2)
        self.assertEqual(question_plan["questions_per_level"], [2, 2])

        level_1_slots = question_plan["capture_slots_by_level"][0]
        level_2_slots = question_plan["capture_slots_by_level"][1]
        first_level_first_slot = level_1_slots[0]
        first_level_second_slot = level_1_slots[1]
        second_level_first_slot = level_2_slots[0]

        non_question_trigger_response = self.client.post(
            f"/api/v1/game-packages/{package_id}/runtime/trigger",
            headers=self._auth_header(student_token),
            json={
                "attempt_id": attempt_id,
                "trigger_type": "item_captured",
                "trigger_key": "item_type",
                "trigger_value": "rock",
                "event_payload": {
                    "item_instance_id": "level-1-item-1",
                    "level": 1,
                    "capture_index_in_level": 1,
                },
            },
        )
        self.assertEqual(non_question_trigger_response.status_code, 200, non_question_trigger_response.text)
        self.assertEqual(non_question_trigger_response.json()["data"]["action"], "resume")
        self.assertEqual(non_question_trigger_response.json()["data"]["reason"], "adaptive_skip")

        first_trigger_response = self.client.post(
            f"/api/v1/game-packages/{package_id}/runtime/trigger",
            headers=self._auth_header(student_token),
            json={
                "attempt_id": attempt_id,
                "trigger_type": "item_captured",
                "trigger_key": "item_type",
                "trigger_value": "rock",
                "event_payload": {
                    "item_instance_id": "level-1-item-a",
                    "level": 1,
                    "capture_index_in_level": first_level_first_slot,
                },
            },
        )
        self.assertEqual(first_trigger_response.status_code, 200, first_trigger_response.text)
        first_trigger_data = first_trigger_response.json()["data"]
        self.assertEqual(first_trigger_data["action"], "ask_question")
        first_question_attempt_id = first_trigger_data["question_attempt"]["id"]
        first_question = first_trigger_data["question"]
        correct_option_id = next(
            option["id"] for option in first_question["options"] if option["content"] == "4"
        )
        answer_response = self.client.post(
            f"/api/v1/game-packages/{package_id}/runtime/answers",
            headers=self._auth_header(student_token),
            json={
                "attempt_id": attempt_id,
                "question_attempt_id": first_question_attempt_id,
                "selected_option_ids": [correct_option_id],
            },
        )
        self.assertEqual(answer_response.status_code, 200, answer_response.text)
        self.assertTrue(answer_response.json()["data"]["is_correct"])

        repeat_trigger_response = self.client.post(
            f"/api/v1/game-packages/{package_id}/runtime/trigger",
            headers=self._auth_header(student_token),
            json={
                "attempt_id": attempt_id,
                "trigger_type": "item_captured",
                "trigger_key": "item_type",
                "trigger_value": "rock",
                "event_payload": {
                    "item_instance_id": "level-1-item-a",
                    "level": 1,
                    "capture_index_in_level": first_level_first_slot,
                },
            },
        )
        self.assertEqual(repeat_trigger_response.status_code, 200, repeat_trigger_response.text)
        self.assertEqual(repeat_trigger_response.json()["data"]["reason"], "trigger_already_handled")

        second_trigger_response = self.client.post(
            f"/api/v1/game-packages/{package_id}/runtime/trigger",
            headers=self._auth_header(student_token),
            json={
                "attempt_id": attempt_id,
                "trigger_type": "item_captured",
                "trigger_key": "item_type",
                "trigger_value": "small_gold",
                "event_payload": {
                    "item_instance_id": "level-1-item-b",
                    "level": 1,
                    "capture_index_in_level": first_level_second_slot,
                },
            },
        )
        self.assertEqual(second_trigger_response.status_code, 200, second_trigger_response.text)
        second_question_attempt_id = second_trigger_response.json()["data"]["question_attempt"]["id"]
        second_answer_response = self.client.post(
            f"/api/v1/game-packages/{package_id}/runtime/answers",
            headers=self._auth_header(student_token),
            json={
                "attempt_id": attempt_id,
                "question_attempt_id": second_question_attempt_id,
                "text_answer": "Earth",
            },
        )
        self.assertEqual(second_answer_response.status_code, 200, second_answer_response.text)
        self.assertTrue(second_answer_response.json()["data"]["is_correct"])

        level_2_trigger_response = self.client.post(
            f"/api/v1/game-packages/{package_id}/runtime/trigger",
            headers=self._auth_header(student_token),
            json={
                "attempt_id": attempt_id,
                "trigger_type": "item_captured",
                "trigger_key": "item_type",
                "trigger_value": "big_gold",
                "event_payload": {
                    "item_instance_id": "level-2-item-a",
                    "level": 2,
                    "capture_index_in_level": second_level_first_slot,
                },
            },
        )
        self.assertEqual(level_2_trigger_response.status_code, 200, level_2_trigger_response.text)
        level_2_question = level_2_trigger_response.json()["data"]["question"]
        selected_option_ids = sorted(
            option["id"] for option in level_2_question["options"] if option["content"] in {"2", "5"}
        )
        level_2_answer_response = self.client.post(
            f"/api/v1/game-packages/{package_id}/runtime/answers",
            headers=self._auth_header(student_token),
            json={
                "attempt_id": attempt_id,
                "question_attempt_id": level_2_trigger_response.json()["data"]["question_attempt"]["id"],
                "selected_option_ids": selected_option_ids,
            },
        )
        self.assertEqual(level_2_answer_response.status_code, 200, level_2_answer_response.text)
        self.assertTrue(level_2_answer_response.json()["data"]["is_correct"])
        self.assertEqual(level_2_answer_response.json()["data"]["attempt_totals"]["questions_answered"], 3)

        level_2_second_slot = level_2_slots[1]
        level_2_second_trigger_response = self.client.post(
            f"/api/v1/game-packages/{package_id}/runtime/trigger",
            headers=self._auth_header(student_token),
            json={
                "attempt_id": attempt_id,
                "trigger_type": "item_captured",
                "trigger_key": "item_type",
                "trigger_value": "diamond",
                "event_payload": {
                    "item_instance_id": "level-2-item-b",
                    "level": 2,
                    "capture_index_in_level": level_2_second_slot,
                },
            },
        )
        self.assertEqual(level_2_second_trigger_response.status_code, 200, level_2_second_trigger_response.text)
        level_2_second_question = level_2_second_trigger_response.json()["data"]["question"]
        level_2_second_correct_option_id = next(
            option["id"] for option in level_2_second_question["options"] if option["content"] == "81"
        )
        level_2_second_answer_response = self.client.post(
            f"/api/v1/game-packages/{package_id}/runtime/answers",
            headers=self._auth_header(student_token),
            json={
                "attempt_id": attempt_id,
                "question_attempt_id": level_2_second_trigger_response.json()["data"]["question_attempt"]["id"],
                "selected_option_ids": [level_2_second_correct_option_id],
            },
        )
        self.assertEqual(level_2_second_answer_response.status_code, 200, level_2_second_answer_response.text)
        self.assertTrue(level_2_second_answer_response.json()["data"]["is_correct"])
        self.assertEqual(level_2_second_answer_response.json()["data"]["attempt_totals"]["questions_answered"], 4)

        runtime_event_response = self.client.post(
            f"/api/v1/game-packages/{package_id}/runtime/events",
            headers=self._auth_header(student_token),
            json={
                "attempt_id": attempt_id,
                "event_type": "state_snapshot",
                "event_payload": {"runtime_state": {"score": 125, "level": 2}},
            },
        )
        self.assertEqual(runtime_event_response.status_code, 200, runtime_event_response.text)

        complete_response = self.client.post(
            f"/api/v1/game-packages/{package_id}/complete",
            headers=self._auth_header(student_token),
            json={
                "attempt_id": attempt_id,
                "summary_payload": {"score": 125, "outcome": "win"},
                "runtime_state": {"score": 125, "level": 2},
            },
        )
        self.assertEqual(complete_response.status_code, 200, complete_response.text)
        complete_data = complete_response.json()["data"]
        self.assertEqual(complete_data["status"], "completed")
        self.assertEqual(complete_data["score_context"], 125.0)
        self.assertEqual(complete_data["score_total"], 136.0)

        attempt_response = self.client.get(
            f"/api/v1/game-attempts/{attempt_id}",
            headers=self._auth_header(student_token),
        )
        self.assertEqual(attempt_response.status_code, 200, attempt_response.text)
        attempt_data = attempt_response.json()["data"]
        self.assertEqual(attempt_data["attempt_totals"]["questions_answered"], 4)
        self.assertEqual(attempt_data["runtime_state"]["question_plan"]["questions_per_level"], [2, 2])
        self.assertEqual(attempt_data["runtime_state"]["game"]["level"], 2)

    def test_gold_miner_success_completion_requires_all_planned_questions(self):
        teacher_token, student_token, package_id = self._bootstrap_class_and_package(
            runtime_config={
                "question_distribution": {
                    "mode": "progressive",
                    "questions_per_level": 2,
                },
            },
        )

        first_question = self._create_game_question(
            package_id=package_id,
            teacher_token=teacher_token,
            payload={
                "type": "single_choice",
                "difficulty_band": "recognition",
                "content": "1 + 1 = ?",
                "points": 1,
                "order_index": 0,
                "options": [
                    {"content": "2", "is_correct": True},
                    {"content": "3", "is_correct": False},
                ],
            },
        )
        second_question = self._create_game_question(
            package_id=package_id,
            teacher_token=teacher_token,
            payload={
                "type": "single_choice",
                "difficulty_band": "comprehension",
                "content": "The sky is __.",
                "points": 1,
                "order_index": 1,
                "options": [
                    {"content": "blue", "is_correct": True},
                    {"content": "green", "is_correct": False},
                ],
            },
        )
        _ = (first_question, second_question)

        start_response = self.client.post(
            f"/api/v1/game-packages/{package_id}/start",
            headers=self._auth_header(student_token),
        )
        self.assertEqual(start_response.status_code, 200, start_response.text)
        start_data = start_response.json()["data"]
        attempt_id = start_data["attempt_id"]
        question_plan = start_data["runtime_config"]["question_plan"]
        self.assertEqual(question_plan["questions_per_level"], [2])

        first_slot = question_plan["capture_slots_by_level"][0][0]
        trigger_response = self.client.post(
            f"/api/v1/game-packages/{package_id}/runtime/trigger",
            headers=self._auth_header(student_token),
            json={
                "attempt_id": attempt_id,
                "trigger_type": "item_captured",
                "trigger_key": "item_type",
                "trigger_value": "rock",
                "event_payload": {
                    "item_instance_id": "level-1-item-a",
                    "level": 1,
                    "capture_index_in_level": first_slot,
                },
            },
        )
        self.assertEqual(trigger_response.status_code, 200, trigger_response.text)
        question = trigger_response.json()["data"]["question"]
        correct_option_id = next(option["id"] for option in question["options"] if option["content"] == "2")
        answer_response = self.client.post(
            f"/api/v1/game-packages/{package_id}/runtime/answers",
            headers=self._auth_header(student_token),
            json={
                "attempt_id": attempt_id,
                "question_attempt_id": trigger_response.json()["data"]["question_attempt"]["id"],
                "selected_option_ids": [correct_option_id],
            },
        )
        self.assertEqual(answer_response.status_code, 200, answer_response.text)

        complete_response = self.client.post(
            f"/api/v1/game-packages/{package_id}/complete",
            headers=self._auth_header(student_token),
            json={
                "attempt_id": attempt_id,
                "summary_payload": {"score": 25, "outcome": "success"},
                "runtime_state": {"score": 25, "level": 1},
            },
        )
        self.assertEqual(complete_response.status_code, 400, complete_response.text)
        self.assertIn("hoàn thành toàn bộ câu hỏi", complete_response.text)

    def test_gold_miner_single_question_can_start(self):
        teacher_token, student_token, package_id = self._bootstrap_class_and_package(
            runtime_config={
                "question_distribution": {
                    "mode": "random",
                    "questions_per_level": 3,
                },
            },
        )

        self._create_game_question(
            package_id=package_id,
            teacher_token=teacher_token,
            payload={
                "type": "single_choice",
                "difficulty_band": "recognition",
                "content": "Only one question",
                "order_index": 0,
                "options": [
                    {"content": "A", "is_correct": True},
                    {"content": "B", "is_correct": False},
                ],
            },
        )

        play_response = self.client.get(
            f"/api/v1/game-packages/{package_id}/play",
            headers=self._auth_header(student_token),
        )
        self.assertEqual(play_response.status_code, 200, play_response.text)
        question_plan_preview = play_response.json()["data"]["runtime_config"]["question_plan"]
        self.assertEqual(question_plan_preview["level_count"], 1)
        self.assertEqual(question_plan_preview["questions_per_level"], [1])

        start_response = self.client.post(
            f"/api/v1/game-packages/{package_id}/start",
            headers=self._auth_header(student_token),
        )
        self.assertEqual(start_response.status_code, 200, start_response.text)
        start_data = start_response.json()["data"]
        self.assertEqual(start_data["attempt_totals"]["questions_total"], 1)
        self.assertEqual(start_data["runtime_config"]["question_plan"]["questions_per_level"], [1])
        self.assertEqual(start_data["runtime_config"]["question_distribution"]["mode"], "random")


if __name__ == "__main__":
    unittest.main()
