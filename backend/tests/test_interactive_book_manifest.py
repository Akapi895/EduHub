import unittest

from pydantic import ValidationError

from app.schemas.interactive_book import InteractiveBookManifest


def build_manifest():
    return {
        "entry_scene_id": "intro",
        "scenes": [
            {
                "id": "intro",
                "type": "slideshow",
                "content": {"text": "Intro"},
                "next": "video-1",
            },
            {
                "id": "video-1",
                "type": "interactive_video",
                "content": {"video_url": "https://cdn.example.com/video.mp4"},
                "interactions": [
                    {
                        "id": "timeline-quiz",
                        "type": "quiz",
                        "trigger": "timecode",
                        "timecode": 5,
                        "prompt": "Cau hoi",
                        "choices": [
                            {"id": "a", "label": "A", "is_correct": False, "retry": True},
                            {"id": "b", "label": "B", "is_correct": True, "target_scene_id": "ending"},
                        ],
                    }
                ],
            },
            {
                "id": "ending",
                "type": "quiz",
                "interactions": [
                    {
                        "id": "final",
                        "type": "quiz",
                        "trigger": "on_click",
                        "choices": [
                            {"id": "done", "label": "Xong", "is_correct": True},
                        ],
                    }
                ],
            },
        ],
    }


class InteractiveBookManifestValidationTests(unittest.TestCase):
    def test_valid_manifest_passes(self):
        manifest = InteractiveBookManifest.model_validate(build_manifest())
        self.assertEqual(manifest.entry_scene_id, "intro")
        self.assertEqual(len(manifest.scenes), 3)

    def test_entry_scene_must_exist(self):
        payload = build_manifest()
        payload["entry_scene_id"] = "missing"

        with self.assertRaises(ValidationError):
            InteractiveBookManifest.model_validate(payload)

    def test_unknown_transition_is_rejected(self):
        payload = build_manifest()
        payload["scenes"][1]["interactions"][0]["choices"][1]["target_scene_id"] = "ghost-scene"

        with self.assertRaises(ValidationError):
            InteractiveBookManifest.model_validate(payload)

    def test_negative_timecode_is_rejected(self):
        payload = build_manifest()
        payload["scenes"][1]["interactions"][0]["timecode"] = -1

        with self.assertRaises(ValidationError):
            InteractiveBookManifest.model_validate(payload)

    def test_duplicate_timeline_trigger_is_rejected(self):
        payload = build_manifest()
        payload["scenes"][1]["interactions"].append(
            {
                "id": "timeline-duplicate",
                "type": "quiz",
                "trigger": "timecode",
                "timecode": 5,
                "choices": [{"id": "c", "label": "C", "is_correct": True}],
            }
        )

        with self.assertRaises(ValidationError):
            InteractiveBookManifest.model_validate(payload)


if __name__ == "__main__":
    unittest.main()
