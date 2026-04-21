import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import InteractiveBookPlayer, {
  type PlayerCheckpointPayload,
  type PlayerEventPayload,
} from '@/components/interactive-book/InteractiveBookPlayer';
import { interactiveBookService } from '@/services/interactive-book.service';
import type { InteractiveBookAttemptBundle } from '@/types';

export default function StudentInteractiveBook() {
  const { id, sceneId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const classId = searchParams.get('classId') || undefined;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bundle, setBundle] = useState<InteractiveBookAttemptBundle | null>(null);
  const [attemptStatus, setAttemptStatus] = useState<'in_progress' | 'completed' | 'abandoned' | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const response = await interactiveBookService.startAttempt(id, classId);
        const payload = response.data.data as InteractiveBookAttemptBundle;
        setBundle(payload);
        setAttemptStatus(payload.attempt.status);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Không thể vào sách tương tác');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [classId, id]);

  const validSceneIds = useMemo(
    () => new Set(bundle?.manifest.scenes.map((scene) => scene.id) ?? []),
    [bundle?.manifest.scenes],
  );

  const handleCheckpoint = async (payload: PlayerCheckpointPayload) => {
    if (!bundle) return;
    await interactiveBookService.saveCheckpoint(bundle.attempt.id, {
      current_scene_id: payload.currentSceneId,
      state_snapshot: payload.stateSnapshot,
      completion_percent: payload.completionPercent,
      score_summary: payload.scoreSummary,
    });
  };

  const handleComplete = async (payload: PlayerCheckpointPayload) => {
    if (!bundle) return;
    await interactiveBookService.completeAttempt(bundle.attempt.id, {
      current_scene_id: payload.currentSceneId,
      state_snapshot: payload.stateSnapshot,
      completion_percent: payload.completionPercent,
      score_summary: payload.scoreSummary,
    });
    setAttemptStatus('completed');
  };

  const handleLogEvents = async (events: PlayerEventPayload[]) => {
    if (!bundle || events.length === 0) return;
    await interactiveBookService.logEvents(bundle.attempt.id, events);
  };

  const handleBack = () => {
    if (classId) {
      navigate(`/student/classes/${classId}?tab=materials`);
      return;
    }
    navigate('/student/library');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-sky-300" />
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-lg rounded-lg border border-red-300 bg-red-50 p-6 text-red-900">
          <p className="text-lg font-semibold">Không thể mở sách tương tác</p>
          <p className="mt-2 text-sm text-red-700">{error || 'Dữ liệu từ backend không hợp lệ.'}</p>
          <button type="button" onClick={handleBack} className="mt-4 text-sm font-semibold text-red-800 underline">
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  const isReviewOnly = attemptStatus === 'completed';
  const autosaveKey = `interactive_book_attempt_${bundle.attempt.id}`;
  const initialSceneId = sceneId && validSceneIds.has(sceneId)
    ? sceneId
    : bundle.attempt.current_scene_id;

  const buildScenePath = (nextSceneId: string) => {
    const basePath = nextSceneId === bundle.manifest.entry_scene_id
      ? `/student/interactive-books/${bundle.material.id}`
      : `/student/interactive-books/${bundle.material.id}/scenes/${nextSceneId}`;
    return classId ? `${basePath}?classId=${encodeURIComponent(classId)}` : basePath;
  };

  const handleSceneChange = (nextSceneId: string) => {
    const currentPath = buildScenePath(sceneId && validSceneIds.has(sceneId) ? sceneId : bundle.manifest.entry_scene_id);
    const nextPath = buildScenePath(nextSceneId);
    if (currentPath === nextPath) return;
    navigate(nextPath, { replace: true });
  };

  return (
    <InteractiveBookPlayer
      manifest={bundle.manifest}
      title={bundle.material.title}
      mode="student"
      immersive
      reviewOnly={isReviewOnly}
      initialSceneId={initialSceneId}
      initialStateSnapshot={bundle.attempt.state_snapshot}
      initialScoreSummary={bundle.attempt.score_summary}
      initialCompletionPercent={bundle.attempt.completion_percent}
      autosaveKey={autosaveKey}
      onCheckpoint={handleCheckpoint}
      onComplete={handleComplete}
      onLogEvents={handleLogEvents}
      onSceneChange={handleSceneChange}
      onExit={handleBack}
    />
  );
}
