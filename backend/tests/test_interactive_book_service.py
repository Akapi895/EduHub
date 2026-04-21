import unittest
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.services.interactive_book_service import (
    _default_state_snapshot,
    _normalize_score_summary,
    _normalize_state_snapshot,
    start_attempt,
)
from app.utils.enums import InteractiveBookAttemptStatus, InteractiveBookStatus, MaterialType


class InteractiveBookServiceNormalizationTests(unittest.TestCase):
    def test_default_state_snapshot_contains_retry_history_and_extended_score(self):
        snapshot = _default_state_snapshot("timeline")
        self.assertEqual(snapshot["visited_scenes"], ["timeline"])
        self.assertEqual(snapshot["retry_history"], [])
        self.assertEqual(snapshot["derived_score"]["retry_count"], 0)
        self.assertEqual(snapshot["derived_score"]["completed_scene_count"], 1)

    def test_normalize_score_summary_backfills_new_fields(self):
        snapshot = _normalize_state_snapshot(
            {
                "visited_scenes": ["timeline", "ending"],
                "branch_history": [{"from_scene_id": "timeline", "to_scene_id": "ending"}],
                "retry_history": [{"scene_id": "quiz-1"}],
            },
            "timeline",
        )
        normalized = _normalize_score_summary(
            {
                "attempted": 3,
                "correct": 2,
                "score": 2,
            },
            state_snapshot=snapshot,
        )
        self.assertEqual(normalized["total_score"], 2)
        self.assertEqual(normalized["correct_count"], 2)
        self.assertEqual(normalized["wrong_count"], 1)
        self.assertEqual(normalized["retry_count"], 1)
        self.assertEqual(normalized["completed_scene_count"], 2)
        self.assertEqual(len(normalized["branch_history"]), 1)


class InteractiveBookStartAttemptTests(unittest.TestCase):
    @patch("app.services.interactive_book_service._resolve_runtime_manifest")
    @patch("app.services.interactive_book_service.interactive_book_crud.create_attempt")
    @patch("app.services.interactive_book_service.interactive_book_crud.get_active_attempt_for_student")
    @patch("app.services.interactive_book_service.interactive_book_crud.get_by_material_id")
    @patch("app.services.interactive_book_service.material_crud.student_can_access")
    @patch("app.services.interactive_book_service.material_crud.get_by_id")
    def test_starts_new_attempt_when_no_active_attempt_exists(
        self,
        mock_get_material,
        mock_student_can_access,
        mock_get_book,
        mock_get_active_attempt,
        mock_create_attempt,
        mock_resolve_manifest,
    ):
        material = SimpleNamespace(
            id="material-1",
            title="Interactive book",
            description=None,
            thumbnail_url=None,
            file_url=None,
            material_type=MaterialType.interactive_book,
            subject=None,
            grade=None,
            is_system=True,
            folder_id=None,
            created_by="teacher-1",
            shared_by=None,
            source_id=None,
            created_at=None,
            interactive_book=None,
        )
        interactive_book = SimpleNamespace(
            id="book-1",
            material_id="material-1",
            status=InteractiveBookStatus.published,
            manifest_version=4,
            entry_scene_id="timeline",
            estimated_duration=12,
            published_at=None,
            created_at=None,
            updated_at=None,
        )
        created_attempt = SimpleNamespace(
            id="attempt-new",
            interactive_book_id="book-1",
            student_id="student-1",
            class_id=None,
            manifest_version=4,
            status=InteractiveBookAttemptStatus.in_progress,
            current_scene_id="timeline",
            state_snapshot={"visited_scenes": ["timeline"], "branch_history": [], "interaction_results": [], "retry_history": [], "media_progress": {}, "derived_score": {}},
            score_summary={},
            completion_percent=0.0,
            started_at=None,
            last_seen_at=None,
            completed_at=None,
            interactive_book=interactive_book,
        )
        manifest = {
            "entry_scene_id": "timeline",
            "scenes": [
                {"id": "timeline", "type": "timeline", "content": {}},
                {"id": "ending", "type": "media", "content": {"image_url": "https://example.com/scene.png"}},
            ],
        }

        mock_get_material.return_value = material
        mock_student_can_access.return_value = True
        mock_get_book.return_value = interactive_book
        mock_get_active_attempt.return_value = None
        mock_resolve_manifest.return_value = manifest
        mock_create_attempt.return_value = created_attempt

        result = start_attempt(
            MagicMock(),
            material_id="material-1",
            student=SimpleNamespace(id="student-1"),
            class_id=None,
        )

        self.assertFalse(result["resume"])
        self.assertEqual(result["attempt"]["id"], "attempt-new")
        self.assertEqual(result["attempt"]["status"], InteractiveBookAttemptStatus.in_progress)
        mock_create_attempt.assert_called_once()
        create_kwargs = mock_create_attempt.call_args.kwargs
        self.assertEqual(create_kwargs["interactive_book_id"], "book-1")
        self.assertEqual(create_kwargs["student_id"], "student-1")
        self.assertEqual(create_kwargs["current_scene_id"], "timeline")
        self.assertEqual(create_kwargs["state_snapshot"]["visited_scenes"], ["timeline"])


if __name__ == "__main__":
    unittest.main()
