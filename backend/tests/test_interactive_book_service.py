import unittest

from app.services.interactive_book_service import (
    _default_state_snapshot,
    _normalize_score_summary,
    _normalize_state_snapshot,
)


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


if __name__ == "__main__":
    unittest.main()
