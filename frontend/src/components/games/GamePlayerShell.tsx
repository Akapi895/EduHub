import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Loader2,
  Maximize2,
  PauseCircle,
  PlayCircle,
  RefreshCcw,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import Button from '@/components/common/Button';
import GameQuestionModal from '@/components/games/GameQuestionModal';
import { loadGameManifest } from '@/features/games/catalog';
import {
  GAME_DIFFICULTY_BANDS,
  getAttemptMetric,
  getAttemptProgressPercent,
  getBandMeta,
  getDistributionModeLabel,
  getLevelDistributionLabel,
  getQuestionPlanPreview,
  resolveGameEntry,
  resolveGameModule,
  resolveManifestUrl,
  resolveRuntimeConfig,
} from '@/features/games/helpers';
import { createSessionId, postHostCommand } from '@/features/games/bridge';
import type {
  GameBridgeEnvelope,
  GameHostCommandType,
  GameManifest,
  GameQuestionTriggerPayload,
  GameRuntimeStatus,
} from '@/features/games/types';
import { isGameBridgeEnvelope } from '@/features/games/types';
import { gameService } from '@/services/game.service';
import { showErrorToast } from '@/store/toast.store';
import type {
  GamePackagePlayResponse,
  GameRuntimeAnswerRequest,
  GameRuntimeAnswerResponse,
  GameRuntimeQuestion,
  GameRuntimeTriggerResponse,
  MatchingLeftItem,
  MatchingRightItem,
  PackageAttempt,
  PackageAttemptTotals,
  PackageQuestionAttempt,
  GameStartAttemptResponse,
} from '@/types';

interface GamePlayerShellProps {
  playBundle: GamePackagePlayResponse;
  initialManifest?: GameManifest | null;
}

function unwrapApiData<T>(response: { data?: { data?: T } & T }): T {
  return (response.data?.data ?? response.data) as T;
}

function extractApiErrorMessage(error: unknown, fallback: string) {
  const responseData = (error as { response?: { data?: { detail?: string; message?: string } } })?.response?.data;
  return responseData?.detail || responseData?.message || (error as { message?: string })?.message || fallback;
}

function formatScalarValue(value: unknown) {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  }
  if (typeof value === 'boolean') {
    return value ? 'Có' : 'Không';
  }
  if (typeof value === 'string') {
    return value;
  }
  return '-';
}

function getRuntimeStatusLabel(status: GameRuntimeStatus) {
  switch (status) {
    case 'booting':
      return 'Đang khởi động';
    case 'ready':
      return 'Sẵn sàng';
    case 'running':
      return 'Đang chơi';
    case 'paused':
      return 'Đang tạm dừng';
    case 'completed':
      return 'Đã kết thúc';
    case 'error':
      return 'Có lỗi';
    default:
      return status;
  }
}

function getOutcomeLabel(value: unknown) {
  if (value === 'failed') return 'Chưa hoàn thành';
  if (value === 'completed' || value === 'success') return 'Hoàn thành';
  return 'Đang chơi';
}

function sanitizeSandboxPolicy(value?: string) {
  const tokens = (value ?? 'allow-scripts')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token !== 'allow-same-origin');

  return tokens.length > 0 ? tokens.join(' ') : 'allow-scripts';
}

function buildMatchingShape(question: GameRuntimeQuestion | null) {
  if (!question) {
    return { leftItems: [] as MatchingLeftItem[], rightItems: [] as MatchingRightItem[] };
  }

  if ((question.matching_left_items?.length ?? 0) > 0 && (question.matching_right_items?.length ?? 0) > 0) {
    return {
      leftItems: question.matching_left_items ?? [],
      rightItems: question.matching_right_items ?? [],
    };
  }

  const pairs = question.matching_pairs ?? [];
  return {
    leftItems: pairs.map((pair, index) => ({
      id: pair.id || `left-${index}`,
      content: pair.left_text,
      correct_right_key: pair.correct_match ?? pair.right_text,
      order_index: index,
    })),
    rightItems: pairs.map((pair, index) => ({
      id: `right-${pair.id || index}`,
      right_key: pair.correct_match ?? pair.right_text,
      content: pair.right_text,
      order_index: index,
    })),
  };
}

function createDraftState(question: GameRuntimeQuestion | null) {
  if (!question) {
    return {
      selectedOptionIds: [] as string[],
      textAnswer: '',
      uploadedImageUrl: '',
      matchingAnswers: {} as Record<string, string>,
    };
  }

  const { leftItems } = buildMatchingShape(question);
  return {
    selectedOptionIds: [] as string[],
    textAnswer: '',
    uploadedImageUrl: '',
    matchingAnswers: leftItems.reduce<Record<string, string>>((accumulator, item) => {
      accumulator[item.id] = '';
      return accumulator;
    }, {}),
  };
}

export default function GamePlayerShell({ playBundle, initialManifest = null }: GamePlayerShellProps) {
  const gamePackage = playBundle.package;
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const completionAttemptRef = useRef<string | null>(null);
  const initTokenRef = useRef<string>('');

  const [manifest, setManifest] = useState<GameManifest | null>(initialManifest);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState(() => createSessionId());
  const [sessionKey, setSessionKey] = useState(0);
  const [runtimeStatus, setRuntimeStatus] = useState<GameRuntimeStatus>('booting');
  const [runtimeSnapshot, setRuntimeSnapshot] = useState<Record<string, unknown>>({});
  const [bridgeReady, setBridgeReady] = useState(false);
  const [loadingAttempt, setLoadingAttempt] = useState(true);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [startBundle, setStartBundle] = useState<GameStartAttemptResponse | null>(null);
  const [attempt, setAttempt] = useState<PackageAttempt | null>(playBundle.current_attempt ?? null);
  const [attemptId, setAttemptId] = useState<string | null>(playBundle.current_attempt?.id ?? null);
  const [attemptTotals, setAttemptTotals] = useState<PackageAttemptTotals | null>(playBundle.current_attempt?.totals ?? null);
  const [questionFlow, setQuestionFlow] = useState<{
    question: GameRuntimeQuestion;
    questionAttempt: PackageQuestionAttempt;
    trigger: GameQuestionTriggerPayload;
  } | null>(null);
  const [questionBusy, setQuestionBusy] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [matchingAnswers, setMatchingAnswers] = useState<Record<string, string>>({});
  const [lastQuestionResult, setLastQuestionResult] = useState<GameRuntimeAnswerResponse | null>(null);

  const moduleEntry = resolveGameModule(playBundle, startBundle);
  const manifestUrl = resolveManifestUrl(playBundle, startBundle, moduleEntry);
  const runtimeConfig = resolveRuntimeConfig(playBundle, startBundle);
  const gameEntry = resolveGameEntry(manifest, playBundle, startBundle);
  const aspectRatio = manifest?.runtime?.aspect_ratio || '16 / 9';
  const sandboxPolicy = sanitizeSandboxPolicy(manifest?.runtime?.sandbox);
  const allowPolicy = manifest?.runtime?.allow || 'fullscreen';
  const questionFlowActive = Boolean(questionFlow) || questionBusy || submittingAnswer;
  const questionPlanPreview = getQuestionPlanPreview(gamePackage);
  const levelDistributionLabel = getLevelDistributionLabel(gamePackage);

  const sendHostCommand = (
    type: GameHostCommandType,
    reason: string,
    extraPayload: Record<string, unknown> = {},
  ) => {
    if (!manifest) return;

    postHostCommand(frameRef.current, manifest, type, {
      sessionId,
      attemptId: attemptId ?? undefined,
      packageId: gamePackage.id,
      route: window.location.pathname,
      issuedAt: new Date().toISOString(),
      reason,
      runtimeConfig,
      ...extraPayload,
    });
  };

  const logRuntimeEvent = async (eventType: string, eventPayload: Record<string, unknown>) => {
    if (!attemptId) return;

    try {
      await gameService.logRuntimeEvent(gamePackage.id, {
        attempt_id: attemptId,
        event_type: eventType,
        event_payload: eventPayload,
      });
    } catch {
      // Non-blocking telemetry.
    }
  };

  const pauseRuntime = (reason: string, eventPayload: Record<string, unknown> = {}) => {
    setRuntimeStatus((current) => (current === 'completed' || current === 'error' ? current : 'paused'));
    sendHostCommand('host:pause', reason, eventPayload);
    void logRuntimeEvent('pause', { reason, ...eventPayload });
  };

  const resumeRuntime = (reason: string, eventPayload: Record<string, unknown> = {}) => {
    setRuntimeStatus((current) => (current === 'completed' || current === 'error' ? current : 'running'));
    sendHostCommand('host:resume', reason, eventPayload);
    void logRuntimeEvent('resume', { reason, ...eventPayload });
  };

  const resetQuestionDraft = (question: GameRuntimeQuestion | null) => {
    const draft = createDraftState(question);
    setSelectedOptionIds(draft.selectedOptionIds);
    setTextAnswer(draft.textAnswer);
    setUploadedImageUrl(draft.uploadedImageUrl);
    setMatchingAnswers(draft.matchingAnswers);
  };

  const refreshAttemptFromBundle = (bundle: GameStartAttemptResponse | null) => {
    const bundledAttempt = bundle?.attempt ?? null;
    setAttempt(bundledAttempt);
    setAttemptId(bundle?.attempt_id ?? bundledAttempt?.id ?? null);
    if (bundledAttempt?.totals) {
      setAttemptTotals(bundledAttempt.totals);
    }
  };

  const handleQuestionTrigger = async (trigger: GameQuestionTriggerPayload) => {
    if (!attemptId || questionFlowActive) return;

    setQuestionBusy(true);
    pauseRuntime('question-trigger', { trigger });
    setLastQuestionResult(null);

    try {
      const response = await gameService.triggerRuntimeQuestion(gamePackage.id, {
        attempt_id: attemptId,
        trigger_type: trigger.triggerType,
        trigger_key: trigger.triggerKey,
        trigger_value: trigger.triggerValue,
        event_payload: trigger.eventPayload ?? null,
      });
      const data = unwrapApiData<GameRuntimeTriggerResponse>(response);
      setAttemptTotals(data.attempt_totals ?? null);

      if (data.action === 'ask_question') {
        resetQuestionDraft(data.question);
        setQuestionFlow({
          question: data.question,
          questionAttempt: data.question_attempt,
          trigger,
        });
        return;
      }

      resumeRuntime('question-skip', {
        trigger,
        reason: data.reason ?? 'no-matching-question',
        attemptTotals: data.attempt_totals ?? null,
      });
    } catch (error) {
      showErrorToast(extractApiErrorMessage(error, 'Không thể tải câu hỏi cho lượt chơi này.'));
      resumeRuntime('question-trigger-error', { trigger });
    } finally {
      setQuestionBusy(false);
    }
  };

  const handleAnswerSubmit = async () => {
    if (!questionFlow || !attemptId) return;

    const payload: GameRuntimeAnswerRequest = {
      attempt_id: attemptId,
      question_attempt_id: questionFlow.questionAttempt.id,
    };

    if (questionFlow.question.type === 'single_choice' || questionFlow.question.type === 'multi_choice') {
      payload.selected_option_ids = selectedOptionIds;
    }

    if (questionFlow.question.type === 'text') {
      payload.text_answer = textAnswer;
    }

    if (questionFlow.question.type === 'image_upload') {
      payload.uploaded_image_url = uploadedImageUrl;
    }

    if (questionFlow.question.type === 'matching') {
      const { leftItems } = buildMatchingShape(questionFlow.question);
      payload.matching_answers = leftItems
        .filter((item) => matchingAnswers[item.id])
        .map((item) => ({
          left_item_id: item.id,
          selected_right_key: matchingAnswers[item.id],
        }));
    }

    setSubmittingAnswer(true);
    try {
      const response = await gameService.submitRuntimeAnswer(gamePackage.id, payload);
      const data = unwrapApiData<GameRuntimeAnswerResponse>(response);
      setAttemptTotals(data.attempt_totals ?? null);
      setLastQuestionResult(data);
      setQuestionFlow(null);
      resetQuestionDraft(null);

      resumeRuntime('question-answered', {
        questionResult: data.resume_payload ?? {
          questionAttemptId: data.question_attempt_id,
          isCorrect: data.is_correct,
          scoreAwarded: data.score_awarded,
          feedbackMessage: data.feedback_message,
        },
        attemptTotals: data.attempt_totals ?? null,
      });
    } catch (error) {
      showErrorToast(extractApiErrorMessage(error, 'Không thể nộp câu trả lời.'));
    } finally {
      setSubmittingAnswer(false);
    }
  };

  useEffect(() => {
    setRuntimeStatus('booting');
    setRuntimeSnapshot({});
    setBridgeReady(false);
    setPlayerError(null);
    setManifestError(null);
    setQuestionFlow(null);
    setQuestionBusy(false);
    setSubmittingAnswer(false);
    setLastQuestionResult(null);
    resetQuestionDraft(null);
    completionAttemptRef.current = null;
    initTokenRef.current = '';
  }, [gamePackage.id, sessionKey]);

  useEffect(() => {
    if (initialManifest) {
      setManifest(initialManifest);
    }
  }, [initialManifest]);

  useEffect(() => {
    if (!manifestUrl) {
      setManifestError('Không tìm thấy dữ liệu để mở trò chơi.');
      return;
    }

    let cancelled = false;

    loadGameManifest(manifestUrl)
      .then((loadedManifest) => {
        if (!cancelled) {
          setManifest(loadedManifest);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setManifestError(extractApiErrorMessage(error, 'Không thể tải dữ liệu trò chơi.'));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [manifestUrl]);

  useEffect(() => {
    let cancelled = false;

    setLoadingAttempt(true);
    setPlayerError(null);

    gameService.startGamePackage(gamePackage.id)
      .then((response) => {
        if (cancelled) return;
        const data = unwrapApiData<GameStartAttemptResponse>(response);
        setStartBundle(data);
        refreshAttemptFromBundle(data);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setPlayerError(extractApiErrorMessage(error, 'Không thể bắt đầu trò chơi.'));
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingAttempt(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [gamePackage.id, sessionKey]);

  useEffect(() => {
    if (!bridgeReady || !attemptId || !manifest) return;

    const initToken = `${sessionId}:${attemptId}:${sessionKey}`;
    if (initTokenRef.current === initToken) return;

    initTokenRef.current = initToken;
    sendHostCommand('host:init', 'bridge-ready', {
      attemptId,
      packageId: gamePackage.id,
    });
  }, [attemptId, bridgeReady, gamePackage.id, manifest, sessionId, sessionKey]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (!isGameBridgeEnvelope(event.data)) return;
      const message = event.data as GameBridgeEnvelope;

      if (message.type === 'game:ready') {
        setBridgeReady(true);
        setRuntimeStatus('ready');
        setRuntimeSnapshot((current) => ({ ...current, ...(message.payload ?? {}) }));
        return;
      }

      if (message.type === 'game:state' || message.type === 'game:progress') {
        setRuntimeStatus(
          message.type === 'game:progress'
            ? 'running'
            : ((message.payload?.status as GameRuntimeStatus) || 'running'),
        );
        setRuntimeSnapshot((current) => ({ ...current, ...(message.payload ?? {}) }));
        return;
      }

      if (message.type === 'game:question-trigger') {
        const trigger = message.payload as GameQuestionTriggerPayload | undefined;
        if (!trigger) return;
        void handleQuestionTrigger(trigger);
        return;
      }

      if (message.type === 'game:complete') {
        const nextRuntimeSnapshot = {
          ...runtimeSnapshot,
          ...((message.payload as Record<string, unknown>) ?? {}),
        };
        setRuntimeStatus('completed');
        setRuntimeSnapshot(nextRuntimeSnapshot);

        if (!attemptId || completionAttemptRef.current === attemptId) return;

        completionAttemptRef.current = attemptId;
        void gameService.completeGamePackage(gamePackage.id, {
          attempt_id: attemptId,
          summary_payload: (message.payload as Record<string, unknown>) ?? {},
          runtime_state: nextRuntimeSnapshot,
        }).catch(() => {
          completionAttemptRef.current = null;
        });
        void logRuntimeEvent('complete', (message.payload as Record<string, unknown>) ?? {});
        return;
      }

      if (message.type === 'game:error') {
        setRuntimeStatus('error');
        setRuntimeSnapshot((current) => ({ ...current, ...(message.payload ?? {}) }));
        void logRuntimeEvent('error', (message.payload as Record<string, unknown>) ?? {});
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [attemptId, gamePackage.id, questionFlowActive, runtimeSnapshot]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        pauseRuntime('document-hidden');
        return;
      }

      if (questionFlowActive) return;
      resumeRuntime('document-visible');
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [questionFlowActive]);

  const runtimeFacts = [
    {
      label: 'Trạng thái',
      value: getRuntimeStatusLabel((runtimeSnapshot.status as GameRuntimeStatus) ?? runtimeStatus),
    },
    { label: 'Điểm hiện tại', value: runtimeSnapshot.score ?? 0 },
    { label: 'Màn chơi', value: runtimeSnapshot.level ?? 1 },
    { label: 'Câu còn lại trong màn', value: runtimeSnapshot.remainingQuestionsInLevel ?? '-' },
    { label: 'Mục tiêu', value: runtimeSnapshot.targetScore ?? '-' },
    { label: 'Thời gian còn lại', value: runtimeSnapshot.timeRemaining ?? '-' },
  ];

  const questionAnswered = getAttemptMetric(attemptTotals, ['questions_answered', 'answered_count']) ?? 0;
  const questionTotal = getAttemptMetric(attemptTotals, ['questions_total', 'questions_presented', 'total_questions']) ?? 0;
  const questionCorrect = getAttemptMetric(attemptTotals, ['questions_correct', 'correct_count']) ?? 0;
  const attemptScore = getAttemptMetric(attemptTotals, ['score_total', 'score_question']) ?? attempt?.score_total ?? 0;
  const progressPercent = getAttemptProgressPercent(attemptTotals);
  const outcomeLabel = getOutcomeLabel(runtimeSnapshot.outcome);

  const handleRestart = () => {
    sendHostCommand('host:restart', 'host-restart');
    void logRuntimeEvent('restart', { reason: 'host-restart' });
    setSessionId(createSessionId());
    setSessionKey((current) => current + 1);
  };

  const handleTogglePause = () => {
    if (questionFlowActive) return;

    if (runtimeStatus === 'paused') {
      resumeRuntime('host-toggle');
      return;
    }

    if (runtimeStatus === 'completed' || runtimeStatus === 'error') return;
    pauseRuntime('host-toggle');
  };

  const handleFullscreen = async () => {
    if (!viewportRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await viewportRef.current.requestFullscreen();
  };

  if (playerError || manifestError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.2),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_26%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_55%,#e2e8f0_100%)] px-4">
        <div className="w-full max-w-lg rounded-3xl border border-red-200 bg-white px-6 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
          <p className="text-lg font-semibold text-red-700">Không thể mở trò chơi</p>
          <p className="mt-2 text-sm text-slate-600">{playerError || manifestError}</p>
        </div>
      </div>
    );
  }

  if (loadingAttempt || !manifest || !gameEntry) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.2),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_26%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_55%,#e2e8f0_100%)] text-slate-700">
        <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm font-medium">Đang chuẩn bị trò chơi...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.22),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_26%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_55%,#e2e8f0_100%)] text-slate-900">
      <GameQuestionModal
        isOpen={Boolean(questionFlow)}
        question={questionFlow?.question ?? null}
        questionAttempt={questionFlow?.questionAttempt ?? null}
        totals={attemptTotals}
        selectedOptionIds={selectedOptionIds}
        textAnswer={textAnswer}
        uploadedImageUrl={uploadedImageUrl}
        matchingAnswers={matchingAnswers}
        submitting={submittingAnswer}
        onSingleChoiceSelect={(optionId) => setSelectedOptionIds([optionId])}
        onMultiChoiceToggle={(optionId) => {
          setSelectedOptionIds((current) => (
            current.includes(optionId)
              ? current.filter((value) => value !== optionId)
              : [...current, optionId]
          ));
        }}
        onTextChange={setTextAnswer}
        onImageUrlChange={setUploadedImageUrl}
        onMatchingChange={(leftItemId, rightKey) => {
          setMatchingAnswers((current) => ({ ...current, [leftItemId]: rightKey }));
        }}
        onSubmit={handleAnswerSubmit}
      />

      {questionBusy && !questionFlow && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.2)]">
            <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Đang chọn câu hỏi phù hợp...
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.95))] shadow-[0_30px_90px_rgba(15,23,42,0.12)]">
          <div className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
            <div className="max-w-3xl space-y-4">
              <Link to="/student/games" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
                <ArrowLeft className="h-4 w-4" />
                Quay lại danh sách trò chơi
              </Link>

              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/45 bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Không gian chơi riêng
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                    {gamePackage.title}
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                    {gamePackage.description || manifest.short_description || manifest.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(manifest.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
                {gamePackage.class_name && (
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
                    Lớp: {gamePackage.class_name}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={handleTogglePause}
                disabled={questionFlowActive}
                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              >
                {runtimeStatus === 'paused' ? (
                  <>
                    <PlayCircle className="mr-1.5 h-4 w-4" />
                    Tiếp tục
                  </>
                ) : (
                  <>
                    <PauseCircle className="mr-1.5 h-4 w-4" />
                    Tạm dừng
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleRestart}
                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              >
                <RefreshCcw className="mr-1.5 h-4 w-4" />
                Chơi lại
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleFullscreen}
                className="border-sky-300/60 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800"
              >
                <Maximize2 className="mr-1.5 h-4 w-4" />
                Toàn màn hình
              </Button>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Trophy className="h-3.5 w-3.5" />
                {outcomeLabel}
              </div>
            </div>
          </div>
        </header>

        <div className="mt-6 grid flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0 space-y-6">
            <div
              ref={viewportRef}
              className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.14)]"
            >
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                Mỗi lần bắt vật đều được hệ thống kiểm tra. Khi cần, trò chơi sẽ tạm dừng để em trả lời câu hỏi rồi mới tiếp tục.
              </div>
              <div className="relative w-full bg-black" style={{ aspectRatio }}>
                <iframe
                  key={`${gamePackage.id}-${sessionKey}`}
                  ref={frameRef}
                  title={gamePackage.title}
                  src={gameEntry}
                  className="h-full w-full border-0"
                  sandbox={sandboxPolicy}
                  allow={allowPolicy}
                  onLoad={() => {
                    setRuntimeStatus('booting');
                    initTokenRef.current = '';
                  }}
                />
              </div>
            </div>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
                <BookOpen className="h-4 w-4 text-sky-500" />
                Phân bổ câu hỏi
              </div>

              {questionPlanPreview && (
                <div className="mt-4 grid gap-3 md:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Kiểu phân bổ</p>
                    <p className="mt-1 font-semibold text-slate-900">
                      {getDistributionModeLabel(questionPlanPreview.distribution_mode)}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Số màn</p>
                    <p className="mt-1 font-semibold text-slate-900">{questionPlanPreview.level_count ?? 1}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Tổng câu hỏi</p>
                    <p className="mt-1 font-semibold text-slate-900">{questionPlanPreview.total_questions ?? 0}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Câu hỏi mỗi màn</p>
                    <p className="mt-1 font-semibold text-slate-900">{levelDistributionLabel}</p>
                  </div>
                </div>
              )}

              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {GAME_DIFFICULTY_BANDS.map((band) => {
                  const meta = getBandMeta(band);
                  const count = gamePackage.question_stats?.by_difficulty_band?.[band] ?? 0;

                  return (
                    <div
                      key={band}
                      className={`rounded-2xl border bg-gradient-to-r px-4 py-3 text-sm ${meta.accentClass} ${meta.softClass}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold">{meta.label}</span>
                        <strong>{count}</strong>
                      </div>
                      <p className="mt-1 text-xs leading-5 opacity-80">{meta.description}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {(manifest.instructions?.length ?? 0) > 0 && (
              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
                  <BookOpen className="h-4 w-4 text-sky-500" />
                  Hướng dẫn chơi
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {manifest.instructions?.map((instruction) => (
                    <div key={instruction} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                      {instruction}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </section>

          <aside className="space-y-6 self-start xl:sticky xl:top-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
                <Trophy className="h-4 w-4 text-amber-500" />
                Tiến trình của em
              </div>

              <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
                    <span>Câu đã trả lời</span>
                  <strong className="text-slate-900">
                    {questionAnswered}/{questionTotal || '-'}
                  </strong>
                </div>
                <div className="mt-3 h-2 rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-primary transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="mt-2 text-right text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {Math.round(progressPercent)}%
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <span>Câu đúng</span>
                    <strong className="text-slate-900">{questionCorrect}</strong>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <span>Điểm tích lũy</span>
                    <strong className="text-slate-900">{formatScalarValue(attemptScore)}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
                <Sparkles className="h-4 w-4 text-sky-500" />
                Thông tin ván chơi
              </div>
              <div className="mt-4 space-y-3">
                {runtimeFacts.map((fact, index) => (
                  <div
                    key={fact.label}
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      index === 0
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className={index === 0 ? 'text-emerald-700' : 'text-slate-500'}>
                        {fact.label}
                      </span>
                      <strong className="text-slate-900">{formatScalarValue(fact.value)}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {lastQuestionResult && (
              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
                  <Trophy className="h-4 w-4 text-amber-500" />
                  Kết quả câu hỏi gần nhất
                </div>
                <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-semibold text-slate-900">
                    {lastQuestionResult.is_correct ? 'Trả lời đúng' : 'Đã ghi nhận bài làm'}
                  </p>
                  {lastQuestionResult.feedback_message && (
                    <p className="mt-2 leading-6 text-slate-600">{lastQuestionResult.feedback_message}</p>
                  )}
                  {typeof lastQuestionResult.score_awarded === 'number' && (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Điểm nhận được: {lastQuestionResult.score_awarded}
                    </p>
                  )}
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
