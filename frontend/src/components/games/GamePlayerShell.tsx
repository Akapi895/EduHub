import { useEffect, useRef, useState, useCallback } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Loader2,
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
import { showErrorToast, showWarningToast } from '@/store/toast.store';
import type {
  GamePackagePlayResponse,
  GameLeaderboardResponse,
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

const startAttemptRequests = new Map<string, Promise<GameStartAttemptResponse>>();
const INIT_HANDSHAKE_FALLBACK_MS = 800;
const MAX_AUTO_FRAME_RECOVERIES = 2;
const RESUME_WATCHDOG_MS = 1_500;
const RESUME_RECOVERY_MS = 4_000;
const QUESTION_BUSY_VISIBILITY_DELAY_MS = 180;

function getStartAttemptRequest(packageId: string, sessionKey: number) {
  const requestKey = `${packageId}:${sessionKey}`;
  const cachedRequest = startAttemptRequests.get(requestKey);
  if (cachedRequest) {
    return cachedRequest;
  }

  const request = gameService
    .startGamePackage(packageId)
    .then((response) => unwrapApiData<GameStartAttemptResponse>(response));

  startAttemptRequests.set(requestKey, request);
  request.then(
    () => {
      if (startAttemptRequests.get(requestKey) === request) {
        startAttemptRequests.delete(requestKey);
      }
    },
    () => {
      if (startAttemptRequests.get(requestKey) === request) {
        startAttemptRequests.delete(requestKey);
      }
    },
  );

  return request;
}

function extractApiErrorMessage(error: unknown, fallback: string) {
  const responseData = (error as { response?: { data?: { detail?: string; message?: string } } })?.response?.data;
  return responseData?.detail || responseData?.message || (error as { message?: string })?.message || fallback;
}

function buildRestoredQuestionTrigger(questionAttempt: PackageQuestionAttempt): GameQuestionTriggerPayload {
  return {
    triggerType: 'restored_question',
    triggerKey: 'question_attempt_id',
    triggerValue: questionAttempt.id,
    eventPayload: {
      question_attempt_id: questionAttempt.id,
      restored: true,
    },
  };
}

function getTriggerIdentity(trigger: GameQuestionTriggerPayload) {
  const eventPayload = trigger.eventPayload ?? {};
  const itemInstanceId = eventPayload.item_instance_id;
  if (typeof itemInstanceId === 'string' && itemInstanceId.trim()) {
    return `${trigger.triggerType}:item:${itemInstanceId}`;
  }

  const captureIndex = eventPayload.capture_index_in_level;
  const level = eventPayload.level;
  if (typeof captureIndex !== 'undefined' && typeof level !== 'undefined') {
    return `${trigger.triggerType}:level:${String(level)}:capture:${String(captureIndex)}`;
  }

  return `${trigger.triggerType}:${trigger.triggerKey}:${trigger.triggerValue}:${JSON.stringify(eventPayload)}`;
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
  const tokens = (value ?? 'allow-scripts allow-same-origin')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  // Ensure allow-scripts is always present - games need JS execution
  if (!tokens.includes('allow-scripts')) {
    tokens.push('allow-scripts');
  }
  // NOTE: allow-same-origin is required for postMessage bridge to work correctly
  // when iframe loads from same-origin (localhost). Without it, postMessage may fail
  // because the browser considers the iframe as a unique origin even if same URL.
  // Security consideration: This allows iframe to access cookies/storage of its origin.
  // For untrusted game content, consider using a separate domain instead.
  if (!tokens.includes('allow-same-origin')) {
    tokens.push('allow-same-origin');
  }

  return tokens.join(' ');
}

function sanitizeAllowPolicy(value?: string) {
  const raw = (value ?? 'fullscreen').trim();
  if (!raw) return '';

  // Remove fullscreen permission from iframe so fullscreen ownership stays at host viewport.
  // This guarantees host overlays (question modal) remain visible in fullscreen mode.
  const normalized = raw
    .split(/[;,\s]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.toLowerCase() !== 'fullscreen');

  return normalized.join('; ');
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
  const postGameInfoRef = useRef<HTMLDivElement | null>(null);
  const [viewportEl, setViewportEl] = useState<HTMLDivElement | null>(null);
  const completionAttemptRef = useRef<string | null>(null);
  const initTokenRef = useRef<string>('');
  const questionFlowActiveRef = useRef(false);
  const triggerInFlightRef = useRef(false);
  const handledTriggerIdsRef = useRef<Set<string>>(new Set());
  const restoredQuestionPauseRef = useRef<string | null>(null);
  const autoFrameRecoveriesRef = useRef(0);
  const lastRunningGameMessageAtRef = useRef(0);
  const resumeRetryIssuedAtRef = useRef(0);
  const telemetryOfflineUntilRef = useRef(0);
  const questionBusyTimerRef = useRef<number | null>(null);
  const exitConfirmedRef = useRef(false);
  const isFirstRenderRef = useRef(true);

  const [manifest, setManifest] = useState<GameManifest | null>(initialManifest);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState(() => createSessionId());
  const [sessionKey, setSessionKey] = useState(0);
  const [runtimeStatus, setRuntimeStatus] = useState<GameRuntimeStatus>('booting');
  const [runtimeSnapshot, setRuntimeSnapshot] = useState<Record<string, unknown>>({});
  const [bridgeReady, setBridgeReady] = useState(false);
  const [frameLoaded, setFrameLoaded] = useState(false);
  const [loadingAttempt, setLoadingAttempt] = useState(true);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [startBundle, setStartBundle] = useState<GameStartAttemptResponse | null>(null);
  const initialAttempt = playBundle.current_attempt ?? playBundle.attempt ?? null;
  const [attempt, setAttempt] = useState<PackageAttempt | null>(initialAttempt);
  const [attemptId, setAttemptId] = useState<string | null>(initialAttempt?.id ?? null);
  const [attemptTotals, setAttemptTotals] = useState<PackageAttemptTotals | null>(initialAttempt?.totals ?? null);
  const [questionFlow, setQuestionFlow] = useState<{
    question: GameRuntimeQuestion;
    questionAttempt: PackageQuestionAttempt;
    trigger: GameQuestionTriggerPayload;
  } | null>(null);
  const [questionBusy, setQuestionBusy] = useState(false);
  const [questionBusyVisible, setQuestionBusyVisible] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [uploadedImageUrl, setUploadedImageUrl] = useState('');
  const [matchingAnswers, setMatchingAnswers] = useState<Record<string, string>>({});
  const [lastQuestionResult, setLastQuestionResult] = useState<GameRuntimeAnswerResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<GameLeaderboardResponse | null>(null);
  const [gameOverModalOpen, setGameOverModalOpen] = useState(false);
  const [gameOverData, setGameOverData] = useState<{
    score: number;
    level: number;
    reason: string;
  } | null>(null);

  const moduleEntry = resolveGameModule(playBundle, startBundle);
  const manifestUrl = resolveManifestUrl(playBundle, startBundle, moduleEntry);
  const runtimeConfig = resolveRuntimeConfig(playBundle, startBundle);
  const gameEntry = resolveGameEntry(manifest, playBundle, startBundle);
  const aspectRatio = manifest?.runtime?.aspect_ratio || '16 / 9';
  const sandboxPolicy = sanitizeSandboxPolicy(manifest?.runtime?.sandbox);
  const allowPolicy = sanitizeAllowPolicy(manifest?.runtime?.allow);
  const questionFlowActive = Boolean(questionFlow) || questionBusy || submittingAnswer;
  const questionPlanPreview = getQuestionPlanPreview(gamePackage);
  const levelDistributionLabel = getLevelDistributionLabel(gamePackage);
  const isMemoryCardGame = manifest?.id === 'memory-card' ||
    (gamePackage as { game_module?: { slug?: string } })?.game_module?.slug === 'memory-card';

  const setViewportNode = useCallback((node: HTMLDivElement | null) => {
    viewportRef.current = node;
    setViewportEl(node);
    console.info('[QFLOW] viewportRef:update', {
      hasNode: Boolean(node),
    });
  }, []);

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
    if (Date.now() < telemetryOfflineUntilRef.current) return;

    try {
      await gameService.logRuntimeEvent(gamePackage.id, {
        attempt_id: attemptId,
        event_type: eventType,
        event_payload: eventPayload,
      });
    } catch {
      telemetryOfflineUntilRef.current = Date.now() + 30_000;
    }
  };

  const pauseRuntime = (reason: string, eventPayload: Record<string, unknown> = {}) => {
    setRuntimeStatus((current) => (current === 'completed' || current === 'error' ? current : 'paused'));
    sendHostCommand('host:pause', reason, eventPayload);
  };

  const resumeRuntime = (
    reason: string,
    eventPayload: Record<string, unknown> = {},
    options: { watchdog?: boolean } = {},
  ) => {
    const issuedAt = Date.now();
    setRuntimeStatus((current) => (current === 'completed' || current === 'error' ? current : 'running'));
    sendHostCommand('host:resume', reason, eventPayload);

    if (!options.watchdog) return;

    window.setTimeout(() => {
      if (questionFlowActiveRef.current || lastRunningGameMessageAtRef.current >= issuedAt) return;

      resumeRetryIssuedAtRef.current = Date.now();
      sendHostCommand('host:resume', 'resume-watchdog', {
        ...eventPayload,
        originalReason: reason,
        watchdog: true,
      });
    }, RESUME_WATCHDOG_MS);

    window.setTimeout(() => {
      const retryIssuedAt = resumeRetryIssuedAtRef.current || issuedAt;
      if (questionFlowActiveRef.current || lastRunningGameMessageAtRef.current >= retryIssuedAt) return;

      recoverGameFrame('resume-timeout', {
        originalReason: reason,
        lastRunningGameMessageAt: lastRunningGameMessageAtRef.current,
      });
    }, RESUME_RECOVERY_MS);
  };

  const resetQuestionDraft = (question: GameRuntimeQuestion | null) => {
    const draft = createDraftState(question);
    setSelectedOptionIds(draft.selectedOptionIds);
    setTextAnswer(draft.textAnswer);
    setUploadedImageUrl(draft.uploadedImageUrl);
    setMatchingAnswers(draft.matchingAnswers);
  };

  const loadLeaderboard = async () => {
    try {
      const response = await gameService.getGameLeaderboard(gamePackage.id, { limit: 5 });
      setLeaderboard(unwrapApiData<GameLeaderboardResponse>(response));
    } catch {
      setLeaderboard(null);
    }
  };

  const clearQuestionBusyTimer = () => {
    if (questionBusyTimerRef.current !== null) {
      window.clearTimeout(questionBusyTimerRef.current);
      questionBusyTimerRef.current = null;
    }
  };

  const beginQuestionLookup = () => {
    setQuestionBusy(true);
    setQuestionBusyVisible(false);
    clearQuestionBusyTimer();
    questionBusyTimerRef.current = window.setTimeout(() => {
      questionBusyTimerRef.current = null;
      if (triggerInFlightRef.current) {
        setQuestionBusyVisible(true);
      }
    }, QUESTION_BUSY_VISIBILITY_DELAY_MS);
  };

  const endQuestionLookup = () => {
    clearQuestionBusyTimer();
    setQuestionBusy(false);
    setQuestionBusyVisible(false);
  };

  const restoreActiveQuestion = (
    activeQuestion: GameRuntimeQuestion | null | undefined,
    activeQuestionAttempt: PackageQuestionAttempt | null | undefined,
  ) => {
    if (!activeQuestion || !activeQuestionAttempt) return false;

    setQuestionFlow({
      question: activeQuestion,
      questionAttempt: activeQuestionAttempt,
      trigger: buildRestoredQuestionTrigger(activeQuestionAttempt),
    });
    resetQuestionDraft(activeQuestion);
    setRuntimeStatus('paused');
    return true;
  };

  const refreshAttemptFromBundle = (bundle: GameStartAttemptResponse | null) => {
    const bundledAttempt = bundle?.attempt ?? null;
    setAttempt(bundledAttempt);
    setAttemptId(bundle?.attempt_id ?? bundledAttempt?.id ?? null);
    if (bundle?.attempt_totals) {
      setAttemptTotals(bundle.attempt_totals);
    } else if (bundledAttempt?.totals) {
      setAttemptTotals(bundledAttempt.totals);
    }

    restoreActiveQuestion(bundle?.active_question, bundle?.active_question_attempt);
  };

  const handleQuestionTrigger = async (trigger: GameQuestionTriggerPayload) => {
    console.info('[QFLOW] trigger:received', {
      triggerType: trigger.triggerType,
      triggerKey: trigger.triggerKey,
      triggerValue: trigger.triggerValue,
      hasAttemptId: Boolean(attemptId),
      hasViewportEl: Boolean(viewportEl),
    });

    if (!attemptId) {
      resumeRuntime('question-trigger-without-attempt', { trigger });
      return;
    }

    const triggerIdentity = getTriggerIdentity(trigger);
    if (
      triggerInFlightRef.current
      || questionFlowActiveRef.current
      || handledTriggerIdsRef.current.has(triggerIdentity)
    ) {
      return;
    }

    triggerInFlightRef.current = true;
    handledTriggerIdsRef.current.add(triggerIdentity);
    beginQuestionLookup();
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
        console.info('[QFLOW] trigger:ask_question', {
          questionId: data.question?.id,
          questionAttemptId: data.question_attempt?.id,
          hasViewportEl: Boolean(viewportEl),
        });

        resetQuestionDraft(data.question);
        setQuestionFlow({
          question: data.question,
          questionAttempt: data.question_attempt,
          trigger,
        });

        // Keep fullscreen active; modal is rendered via portal into the fullscreen element.
        return;
      }

      // Handle resume action (item already had a question, just resume game)
      if (data.action === 'resume') {
        console.info('[QFLOW] trigger:resume', { reason: data.reason });
        resumeRuntime('trigger-resume', {
          trigger,
          reason: data.reason ?? 'already-handled',
          attemptTotals: data.attempt_totals ?? null,
        }, { watchdog: true });
        return;
      }

      if (data.action === 'game_over') {
        console.info('[QFLOW] trigger:game_over', {
          reason: data.reason,
          wrongAttempts: data.wrong_attempts,
        });
        resumeRuntime('game-over', {
          trigger,
          reason: data.reason ?? 'max_wrong_attempts',
          attemptTotals: data.attempt_totals ?? null,
        }, { watchdog: true });
        return;
      }

      resumeRuntime('question-skip', {
        trigger,
        reason: data.reason ?? 'no-matching-question',
        attemptTotals: data.attempt_totals ?? null,
      }, { watchdog: true });
    } catch (error) {
      showErrorToast(extractApiErrorMessage(error, 'Không thể tải câu hỏi cho lượt chơi này.'));
      resumeRuntime('question-trigger-error', { trigger }, { watchdog: true });
    } finally {
      triggerInFlightRef.current = false;
      endQuestionLookup();
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

      // Show feedback toast for wrong answers
      if (data.is_correct === false) {
        const remainingLives = data.wrong_attempts != null ? Math.max(0, 3 - data.wrong_attempts) : 0;
        showWarningToast(`Sai rồi! Còn ${remainingLives} lượt thử.`);
      }

      questionFlowActiveRef.current = false;
      setQuestionFlow(null);
      endQuestionLookup();
      setSubmittingAnswer(false);
      resetQuestionDraft(null);

      resumeRuntime('question-answered', {
        questionResult: data.resume_payload ?? {
          questionAttemptId: data.question_attempt_id,
          isCorrect: data.is_correct,
          scoreAwarded: data.score_awarded,
          feedbackMessage: data.feedback_message,
        },
        attemptTotals: data.attempt_totals ?? null,
        wrong_attempts: data.wrong_attempts,
        game_over: data.game_over,
      }, { watchdog: true });
    } catch (error) {
      showErrorToast(extractApiErrorMessage(error, 'Không thể nộp câu trả lời.'));
    } finally {
      setSubmittingAnswer(false);
    }
  };

  useEffect(() => {
    questionFlowActiveRef.current = questionFlowActive;
  }, [questionFlowActive]);

  useEffect(() => {
    setRuntimeStatus('booting');
    setRuntimeSnapshot({});
    setBridgeReady(false);
    setFrameLoaded(false);
    setPlayerError(null);
    setManifestError(null);
    setQuestionFlow(null);
    setQuestionBusyVisible(false);
    setSubmittingAnswer(false);
    setLastQuestionResult(null);
    resetQuestionDraft(null);
    completionAttemptRef.current = null;
    initTokenRef.current = '';
    triggerInFlightRef.current = false;
    handledTriggerIdsRef.current.clear();
    restoredQuestionPauseRef.current = null;
    lastRunningGameMessageAtRef.current = 0;
    resumeRetryIssuedAtRef.current = 0;
    clearQuestionBusyTimer();
  }, [gamePackage.id, sessionKey]);

  useEffect(() => () => {
    clearQuestionBusyTimer();
  }, []);

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

    getStartAttemptRequest(gamePackage.id, sessionKey)
      .then((data) => {
        if (cancelled) return;
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
    if (!attemptId || !manifest || !frameLoaded) return;

    const initToken = `${sessionId}:${attemptId}:${sessionKey}`;
    if (initTokenRef.current === initToken) return;

    const sendInit = (reason: string, extraPayload: Record<string, unknown> = {}) => {
      if (initTokenRef.current === initToken) return;
      initTokenRef.current = initToken;
      sendHostCommand('host:init', reason, {
        attemptId,
        packageId: gamePackage.id,
        attemptTotals,
        ...extraPayload,
      });
    };

    if (bridgeReady) {
      sendInit('bridge-ready');
      return;
    }

    const fallbackTimer = window.setTimeout(() => {
      sendInit('bridge-ready-timeout', { handshakeFallback: true });
    }, INIT_HANDSHAKE_FALLBACK_MS);

    return () => window.clearTimeout(fallbackTimer);
  }, [attemptId, attemptTotals, bridgeReady, frameLoaded, gamePackage.id, manifest, sessionId, sessionKey]);

  useEffect(() => {
    if (!bridgeReady || !questionFlow || !attemptId) return;
    const questionAttemptId = questionFlow.questionAttempt.id;
    if (restoredQuestionPauseRef.current === questionAttemptId) return;

    restoredQuestionPauseRef.current = questionAttemptId;
    pauseRuntime('active-question-restored', {
      question_attempt_id: questionAttemptId,
      question_id: questionFlow.question.id,
    });
  }, [attemptId, bridgeReady, questionFlow?.question.id, questionFlow?.questionAttempt.id]);

  const recoverGameFrame = (reason: string, eventPayload: Record<string, unknown> = {}) => {
    if (autoFrameRecoveriesRef.current >= MAX_AUTO_FRAME_RECOVERIES) {
      showErrorToast('Module trÃ² chÆ¡i Ä‘ang gáº·p lá»—i. HÃ£y báº¥m ChÆ¡i láº¡i Ä‘á»ƒ táº£i láº¡i mÃ n chÆ¡i.');
      return;
    }

    autoFrameRecoveriesRef.current += 1;
    void logRuntimeEvent('frame_recovery', { reason, ...eventPayload });
    setBridgeReady(false);
    setFrameLoaded(false);
    initTokenRef.current = '';
    setRuntimeStatus('booting');
    setSessionId(createSessionId());
    setSessionKey((current) => current + 1);
  };

  useEffect(() => {
    if (!attemptId || !manifest || !frameLoaded || bridgeReady) return;

    const recoveryTimer = window.setTimeout(() => {
      if (!bridgeReady && !initTokenRef.current) {
        recoverGameFrame('bridge-init-timeout');
      }
    }, INIT_HANDSHAKE_FALLBACK_MS * 5);

    return () => window.clearTimeout(recoveryTimer);
  }, [attemptId, bridgeReady, frameLoaded, manifest, sessionKey]);

  useEffect(() => {
    if (!bridgeReady) return;

    const stableFrameTimer = window.setTimeout(() => {
      autoFrameRecoveriesRef.current = 0;
    }, 10_000);

    return () => window.clearTimeout(stableFrameTimer);
  }, [bridgeReady, sessionKey]);

  useEffect(() => {
    // Skip restoration on first render (page load) to allow game to start fresh
    // Only restore active question on tab visibility changes (user comes back to tab)
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }

    if (playBundle.active_question && playBundle.active_question_attempt) {
      restoreActiveQuestion(playBundle.active_question, playBundle.active_question_attempt);
    }
  }, [playBundle.active_question?.id, playBundle.active_question_attempt?.id]);

  useEffect(() => {
    if (!questionFlow) {
      restoredQuestionPauseRef.current = null;
    }
  }, [questionFlow]);

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
        const nextStatus = (
          message.type === 'game:progress'
            ? 'running'
            : ((message.payload?.status as GameRuntimeStatus) || 'running')
        );
        if (nextStatus === 'running') {
          lastRunningGameMessageAtRef.current = Date.now();
        }
        setRuntimeStatus(nextStatus);
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

        // Check for game_over outcome
        const payload = message.payload as Record<string, unknown>;
        const outcome = payload?.outcome as string | undefined;
        if (outcome === 'game_over') {
          setGameOverData({
            score: (payload?.score as number) ?? 0,
            level: (payload?.level as number) ?? 1,
            reason: (payload?.reason as string) ?? 'max_wrong_attempts',
          });
          setGameOverModalOpen(true);
        }

        if (!attemptId || completionAttemptRef.current === attemptId) return;

        completionAttemptRef.current = attemptId;

        // Always complete the attempt (both success and game_over) to update leaderboard
        void gameService.completeGamePackage(gamePackage.id, {
          attempt_id: attemptId,
          summary_payload: (message.payload as Record<string, unknown>) ?? {},
          runtime_state: nextRuntimeSnapshot,
        }).then(() => {
          // On success, reload leaderboard
          void loadLeaderboard();
        }).catch((error: unknown) => {
          completionAttemptRef.current = null;
          // Only show error toast if not game_over (game_over doesn't require completion)
          if (outcome !== 'game_over') {
            setRuntimeStatus('running');
            showErrorToast(extractApiErrorMessage(error, 'Em cần hoàn thành toàn bộ câu hỏi trước khi kết thúc trò chơi.'));
            sendHostCommand('host:resume', 'completion-rejected', {
              attemptTotals,
            });
          }
        });
        void logRuntimeEvent('complete', (message.payload as Record<string, unknown>) ?? {});
        return;
      }

      if (message.type === 'game:error') {
        const errorPayload = (message.payload as Record<string, unknown>) ?? {};
        setRuntimeStatus('error');
        setRuntimeSnapshot((current) => ({ ...current, ...errorPayload }));
        void logRuntimeEvent('error', errorPayload);
        recoverGameFrame('iframe-error', errorPayload);
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [attemptId, attemptTotals, gamePackage.id, questionFlowActive, runtimeSnapshot]);

  useEffect(() => {
    void loadLeaderboard();
  }, [gamePackage.id]);

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

  // Handle page unload / back navigation - ask user before leaving
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Skip if already confirmed via handleExitToList (to avoid double confirmation)
      if (exitConfirmedRef.current) {
        return;
      }

      // Only warn if game is in progress
      if (runtimeStatus === 'completed' || runtimeStatus === 'error') {
        return;
      }

      // Call abandon API before leaving
      if (attemptId) {
        // Use sendBeacon for reliable delivery even during page unload
        const data = new URLSearchParams({ attempt_id: attemptId });
        navigator.sendBeacon(`/api/v1/game-attempts/${attemptId}/abandon`, data);
      }

      // Show browser's default confirmation dialog
      event.preventDefault();
      event.returnValue = 'Ban co dang choi game. Ban co chac muon thoat?';
      return event.returnValue;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [attemptId, runtimeStatus]);

  const runtimeFacts = [
    {
      label: 'Trạng thái',
      value: getRuntimeStatusLabel((runtimeSnapshot.status as GameRuntimeStatus) ?? runtimeStatus),
    },
    { label: 'Điểm hiện tại', value: runtimeSnapshot.score ?? 0 },
    { label: 'Màn chơi', value: runtimeSnapshot.level ?? 1 },
    { label: 'Câu còn lại trong màn', value: runtimeSnapshot.remainingQuestionsInLevel ?? '-' },
    { label: 'Mục tiêu', value: runtimeSnapshot.targetScore ?? '-' },
    { label: 'Thời gian', value: runtimeSnapshot.elapsedTime ?? runtimeSnapshot.elapsedTimePrecise ?? '0' },
    { label: 'Mạng', value: `${runtimeSnapshot.lives ?? 3}/${runtimeSnapshot.maxLives ?? 3}` },
  ];

  const questionAnswered = getAttemptMetric(attemptTotals, ['questions_answered', 'answered_count']) ?? 0;
  const questionTotal = getAttemptMetric(attemptTotals, ['questions_total', 'questions_presented', 'total_questions']) ?? 0;
  const questionCorrect = getAttemptMetric(attemptTotals, ['questions_correct', 'correct_count']) ?? 0;
  const attemptScore = getAttemptMetric(attemptTotals, ['score_total', 'score_question']) ?? attempt?.score_total ?? 0;
  const progressPercent = getAttemptProgressPercent(attemptTotals);
  const outcomeLabel = runtimeStatus === 'completed'
    ? getOutcomeLabel(runtimeSnapshot.outcome ?? 'completed')
    : getOutcomeLabel(runtimeSnapshot.outcome);

  const handleRestart = async () => {
    // Abandon current attempt first to reset progress
    if (attemptId) {
      try {
        await gameService.abandonGameAttempt(attemptId);
      } catch {
        // Continue anyway - restart is still valid
      }
    }

    sendHostCommand('host:restart', 'host-restart');
    void logRuntimeEvent('restart', { reason: 'host-restart' });
    setAttemptId(null);
    setSessionId(createSessionId());
    setSessionKey((current) => current + 1);
  };

  const handleExitToList = async () => {
    // Mark as exiting to prevent beforeunload from showing another confirmation
    exitConfirmedRef.current = true;

    // Confirm with user if game is in progress
    if (runtimeStatus !== 'completed' && runtimeStatus !== 'error' && runtimeStatus !== 'booting') {
      const confirmed = window.confirm('Ban co dang choi game. Ban co chac muon thoat? Tien do se bi mat va phai choi lai tu dau.');
      if (!confirmed) {
        exitConfirmedRef.current = false;
        return;
      }

      // Abandon current attempt
      if (attemptId) {
        try {
          await gameService.abandonGameAttempt(attemptId);
        } catch {
          // Continue anyway - user already confirmed
        }
      }
    }

    // Navigate to list
    window.location.href = '/student/games';
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

  useEffect(() => {
    if (!questionFlow) return;

    console.info('[QFLOW] modal:intent-open', {
      questionId: questionFlow.question.id,
      questionAttemptId: questionFlow.questionAttempt.id,
      runtimeStatus,
      hasViewportEl: Boolean(viewportEl),
    });
  }, [questionFlow, runtimeStatus, viewportEl]);

  useEffect(() => {
    if (runtimeStatus !== 'completed') return;
    window.requestAnimationFrame(() => {
      postGameInfoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [runtimeStatus]);

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
        portalContainer={null}
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

      {/* Game Over Modal */}
      {gameOverModalOpen && gameOverData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-6 shadow-[0_25px_70px_rgba(15,23,42,0.25)]">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-8 w-8 text-red-500" />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-slate-900">Hết mạng!</h2>
              <p className="mt-2 text-slate-600">
                Kết quả của bạn đã được ghi vào bảng xếp hạng.
              </p>
              <div className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm text-slate-500">Điểm đạt được</p>
                <p className="text-3xl font-bold text-slate-900">{gameOverData.score}</p>
              </div>
              <div className="mt-6 flex w-full flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setGameOverModalOpen(false)}
                  className="flex-1 border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                >
                  Xem bảng xếp hạng
                </Button>
                <div className="flex gap-3 sm:flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setGameOverModalOpen(false);
                      window.location.href = '/student/games';
                    }}
                    className="flex-1 border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    Thoát
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => {
                      setGameOverModalOpen(false);
                      handleRestart();
                    }}
                    className="flex-1"
                  >
                    <RefreshCcw className="mr-1.5 h-4 w-4" />
                    Chơi lại
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {questionBusyVisible && !questionFlow && (
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
              <button
                type="button"
                onClick={handleExitToList}
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại danh sách trò chơi
              </button>

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
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Trophy className="h-3.5 w-3.5" />
                {outcomeLabel}
              </div>
            </div>
          </div>
        </header>

        <div className="mt-6 flex flex-1 flex-col gap-6">
          <section className="min-w-0 space-y-6">
            <div
              ref={setViewportNode}
              className="relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.14)]"
            >
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                {manifest.short_description || manifest.description
                  || 'Trò chơi sẽ tạm dừng khi cần để em trả lời câu hỏi rồi mới tiếp tục.'}
              </div>
              <div
                className="relative w-full bg-black"
                style={{ aspectRatio, minHeight: 'clamp(520px, 72vh, 920px)' }}
              >
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
                    setBridgeReady(false);
                    setFrameLoaded(true);
                    initTokenRef.current = '';
                  }}
                />
              </div>
            </div>

            {!isMemoryCardGame && (
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
            )}

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

          <section ref={postGameInfoRef} className="space-y-6">
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
                <Trophy className="h-4 w-4 text-amber-500" />
                Bảng xếp hạng
              </div>
              {leaderboard?.entries?.length ? (
                <div className="mt-4 space-y-2">
                  {leaderboard.entries.slice(0, 5).map((entry) => (
                    <div
                      key={entry.user_id}
                      className={`flex items-center justify-between gap-3 rounded-2xl border px-3 py-2 text-sm ${
                        entry.is_current_user
                          ? 'border-amber-200 bg-amber-50 text-amber-800'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span className="truncate font-medium">#{entry.rank} {entry.student_name || 'Học sinh'}</span>
                      <strong className="text-slate-900">{formatScalarValue(entry.best_score_total ?? 0)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Hoàn thành lượt chơi đầu tiên để ghi tên lên bảng xếp hạng.
                </p>
              )}
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
          </section>
        </div>
      </div>
    </div>
  );
}
