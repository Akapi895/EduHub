import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpenText, Loader2 } from 'lucide-react';
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="space-y-4 rounded-[28px] border border-red-200 bg-red-50 p-6">
        <p className="text-lg font-semibold text-red-900">Không thể mở sách tương tác</p>
        <p className="text-sm text-red-700">{error || 'Dữ liệu từ backend không hợp lệ.'}</p>
        <div>
          <Link to="/student/library" className="text-sm font-medium text-red-800 underline">
            Quay lại thư viện
          </Link>
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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <button type="button" onClick={handleBack} className="mt-1 text-slate-400 hover:text-slate-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{bundle.material.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {classId ? 'Đang học từ trong lớp học' : 'Đang học từ thư viện'} - phiên bản {bundle.interactive_book.manifest_version}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <BookOpenText className="h-5 w-5 text-sky-600" />
          <div className="text-sm">
            <p className="font-medium text-slate-900">
              {bundle.resume ? 'Tiếp tục tiến trình' : isReviewOnly ? 'Xem lại lần học đã hoàn thành' : 'Bắt đầu lần học mới'}
            </p>
            <p className="text-slate-500">
              Tiến độ hiện tại: {Math.round(bundle.attempt.completion_percent)}%
            </p>
          </div>
        </div>
      </div>

      {isReviewOnly && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Lần học này đã hoàn thành. Trình phát đang mở ở chế độ xem lại để giữ nguyên phiên bản manifest và kết quả cũ.
        </div>
      )}

      <InteractiveBookPlayer
        manifest={bundle.manifest}
        title={bundle.material.title}
        mode="student"
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
      />
    </div>
  );
}
