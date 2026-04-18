import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CirclePlay,
  Clock3,
  GitBranch,
  Layers3,
  PlayCircle,
  Sparkles,
  Volume2,
} from 'lucide-react';
import Button from '@/components/common/Button';
import type {
  InteractiveBookManifest,
  InteractiveInteraction,
  InteractiveScene,
} from '@/types';

type PlayerMode = 'student' | 'preview';
type PlayerPhase =
  | 'loading'
  | 'intro'
  | 'scene_active'
  | 'interaction_open'
  | 'transitioning'
  | 'paused'
  | 'completed'
  | 'error';

type ScoreSummary = {
  attempted: number;
  correct: number;
  score: number;
  [key: string]: unknown;
};

type RuntimeStateSnapshot = {
  visited_scenes: string[];
  branch_history: Array<Record<string, unknown>>;
  interaction_results: Array<Record<string, unknown>>;
  media_progress: Record<string, Record<string, unknown>>;
  derived_score: ScoreSummary;
  [key: string]: unknown;
};

export interface PlayerCheckpointPayload {
  currentSceneId: string;
  stateSnapshot: RuntimeStateSnapshot;
  completionPercent: number;
  scoreSummary: ScoreSummary;
}

export interface PlayerEventPayload {
  scene_id?: string;
  event_type: string;
  payload?: Record<string, unknown>;
}

interface StoredCheckpoint {
  currentSceneId: string;
  stateSnapshot: RuntimeStateSnapshot;
  completionPercent: number;
  scoreSummary: ScoreSummary;
  savedAt: string;
}

interface InteractiveBookPlayerProps {
  manifest: InteractiveBookManifest;
  title: string;
  mode?: PlayerMode;
  reviewOnly?: boolean;
  initialSceneId?: string | null;
  initialStateSnapshot?: Record<string, unknown> | null;
  initialScoreSummary?: Record<string, unknown> | null;
  initialCompletionPercent?: number;
  autosaveKey?: string;
  onCheckpoint?: (payload: PlayerCheckpointPayload) => Promise<void> | void;
  onComplete?: (payload: PlayerCheckpointPayload) => Promise<void> | void;
  onLogEvents?: (events: PlayerEventPayload[]) => Promise<void> | void;
  onSceneChange?: (sceneId: string) => void;
}

const AUTOSAVE_INTERVAL_MS = 25000;
const EVENT_FLUSH_INTERVAL_MS = 10000;
const MAX_EVENT_BATCH = 8;

function createDefaultScoreSummary(initial?: Record<string, unknown> | null): ScoreSummary {
  return {
    attempted: Number(initial?.attempted ?? 0),
    correct: Number(initial?.correct ?? 0),
    score: Number(initial?.score ?? 0),
    ...(initial ?? {}),
  };
}

function normalizeStateSnapshot(
  snapshot: Record<string, unknown> | null | undefined,
  entrySceneId: string,
): RuntimeStateSnapshot {
  const raw = snapshot ?? {};
  const visited = Array.isArray(raw.visited_scenes)
    ? raw.visited_scenes.filter((item): item is string => typeof item === 'string')
    : [];
  const branchHistory = Array.isArray(raw.branch_history)
    ? raw.branch_history.filter(
      (item): item is Record<string, unknown> => typeof item === 'object' && item !== null,
    )
    : [];
  const interactionResults = Array.isArray(raw.interaction_results)
    ? raw.interaction_results.filter(
      (item): item is Record<string, unknown> => typeof item === 'object' && item !== null,
    )
    : [];
  const mediaProgress = typeof raw.media_progress === 'object' && raw.media_progress
    ? raw.media_progress as Record<string, Record<string, unknown>>
    : {};
  const derived = typeof raw.derived_score === 'object' && raw.derived_score
    ? raw.derived_score as Record<string, unknown>
    : {};

  return {
    ...raw,
    visited_scenes: visited.length > 0 ? visited : [entrySceneId],
    branch_history: branchHistory,
    interaction_results: interactionResults,
    media_progress: mediaProgress,
    derived_score: createDefaultScoreSummary(derived),
  };
}

function readStoredCheckpoint(
  autosaveKey: string | undefined,
  manifest: InteractiveBookManifest,
): StoredCheckpoint | null {
  if (!autosaveKey) return null;
  try {
    const raw = window.localStorage.getItem(autosaveKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredCheckpoint>;
    if (!parsed.currentSceneId || typeof parsed.currentSceneId !== 'string') {
      return null;
    }
    const sceneIds = new Set(manifest.scenes.map((scene) => scene.id));
    if (!sceneIds.has(parsed.currentSceneId)) {
      return null;
    }
    return {
      currentSceneId: parsed.currentSceneId,
      stateSnapshot: normalizeStateSnapshot(parsed.stateSnapshot, manifest.entry_scene_id),
      completionPercent: Number(parsed.completionPercent ?? 0),
      scoreSummary: createDefaultScoreSummary(parsed.scoreSummary),
      savedAt: String(parsed.savedAt ?? new Date().toISOString()),
    };
  } catch {
    return null;
  }
}

function writeStoredCheckpoint(autosaveKey: string | undefined, payload: StoredCheckpoint) {
  if (!autosaveKey) return;
  try {
    window.localStorage.setItem(autosaveKey, JSON.stringify(payload));
  } catch {
    // ignore local storage quota errors
  }
}

function removeStoredCheckpoint(autosaveKey: string | undefined) {
  if (!autosaveKey) return;
  try {
    window.localStorage.removeItem(autosaveKey);
  } catch {
    // ignore
  }
}

function getInteractionKey(interaction: InteractiveInteraction, index: number): string {
  if (interaction.id) return interaction.id;
  return `${interaction.trigger}:${interaction.timecode ?? 'na'}:${interaction.type}:${index}`;
}

function hasHandledInteraction(
  stateSnapshot: RuntimeStateSnapshot,
  sceneId: string,
  interactionKey: string,
): boolean {
  const sceneProgress = stateSnapshot.media_progress[sceneId];
  const handled = Array.isArray(sceneProgress?.handled_interaction_ids)
    ? sceneProgress.handled_interaction_ids.filter((item): item is string => typeof item === 'string')
    : [];
  return handled.includes(interactionKey);
}

function markInteractionHandled(
  stateSnapshot: RuntimeStateSnapshot,
  sceneId: string,
  interactionKey: string,
): RuntimeStateSnapshot {
  const current = stateSnapshot.media_progress[sceneId] ?? {};
  const handled = Array.isArray(current.handled_interaction_ids)
    ? current.handled_interaction_ids.filter((item): item is string => typeof item === 'string')
    : [];
  if (handled.includes(interactionKey)) return stateSnapshot;

  return {
    ...stateSnapshot,
    media_progress: {
      ...stateSnapshot.media_progress,
      [sceneId]: {
        ...current,
        handled_interaction_ids: [...handled, interactionKey],
      },
    },
  };
}

function updateMediaProgress(
  stateSnapshot: RuntimeStateSnapshot,
  sceneId: string,
  patch: Record<string, unknown>,
): RuntimeStateSnapshot {
  return {
    ...stateSnapshot,
    media_progress: {
      ...stateSnapshot.media_progress,
      [sceneId]: {
        ...(stateSnapshot.media_progress[sceneId] ?? {}),
        ...patch,
      },
    },
  };
}

function ensureVisitedScene(
  stateSnapshot: RuntimeStateSnapshot,
  sceneId: string,
  totalScenes: number,
): { nextState: RuntimeStateSnapshot; completionPercent: number } {
  const visited = stateSnapshot.visited_scenes.includes(sceneId)
    ? stateSnapshot.visited_scenes
    : [...stateSnapshot.visited_scenes, sceneId];
  const nextState = {
    ...stateSnapshot,
    visited_scenes: visited,
  };
  const completionPercent = totalScenes > 0
    ? Math.min(100, Math.round((visited.length / totalScenes) * 100))
    : 0;
  return { nextState, completionPercent };
}

function appendInteractionResult(
  stateSnapshot: RuntimeStateSnapshot,
  result: Record<string, unknown>,
): RuntimeStateSnapshot {
  return {
    ...stateSnapshot,
    interaction_results: [...stateSnapshot.interaction_results, result],
  };
}

function appendBranchHistory(
  stateSnapshot: RuntimeStateSnapshot,
  historyItem: Record<string, unknown>,
): RuntimeStateSnapshot {
  return {
    ...stateSnapshot,
    branch_history: [...stateSnapshot.branch_history, historyItem],
  };
}

function getSceneText(scene: InteractiveScene): string {
  if (typeof scene.content === 'string') return scene.content;
  if (scene.content && typeof scene.content === 'object' && !Array.isArray(scene.content)) {
    const record = scene.content as Record<string, unknown>;
    const textValue = record.text ?? record.description ?? record.body ?? record.summary;
    if (typeof textValue === 'string') return textValue;
  }
  return '';
}

function getSceneList(scene: InteractiveScene, key: string): string[] {
  if (!scene.content || typeof scene.content !== 'object' || Array.isArray(scene.content)) {
    return [];
  }
  const record = scene.content as Record<string, unknown>;
  const value = record[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function getPrimaryImage(scene: InteractiveScene): string | undefined {
  if (scene.content && typeof scene.content === 'object' && !Array.isArray(scene.content)) {
    const record = scene.content as Record<string, unknown>;
    const image = record.image_url ?? record.poster_url ?? record.cover_url;
    if (typeof image === 'string') return image;
  }
  return scene.assets?.find((asset) => asset.kind === 'image')?.url;
}

function getSceneImageUrls(scene: InteractiveScene): string[] {
  const fromContent = getSceneList(scene, 'images');
  const fromAssets = scene.assets
    ?.filter((asset) => asset.kind === 'image' || /\.(png|jpe?g|gif|webp|svg)$/i.test(asset.url))
    .map((asset) => asset.url) ?? [];
  const fallback = getPrimaryImage(scene);
  return Array.from(new Set([
    ...fromContent,
    ...fromAssets,
    ...(fallback ? [fallback] : []),
  ]));
}

function getVideoUrl(scene: InteractiveScene): string | undefined {
  if (scene.content && typeof scene.content === 'object' && !Array.isArray(scene.content)) {
    const record = scene.content as Record<string, unknown>;
    const value = record.video_url ?? record.video;
    if (typeof value === 'string') return value;
  }
  return scene.assets?.find((asset) => asset.kind === 'video')?.url;
}

function getAudioUrl(scene: InteractiveScene): string | undefined {
  if (scene.content && typeof scene.content === 'object' && !Array.isArray(scene.content)) {
    const record = scene.content as Record<string, unknown>;
    const value = record.audio_url ?? record.background_audio_url;
    if (typeof value === 'string') return value;
  }
  return scene.assets?.find((asset) => asset.kind === 'audio')?.url;
}

function getBooleanFromContent(scene: InteractiveScene, key: string): boolean {
  if (!scene.content || typeof scene.content !== 'object' || Array.isArray(scene.content)) {
    return false;
  }
  const record = scene.content as Record<string, unknown>;
  return Boolean(record[key]);
}

function shouldAutoplayVideo(scene: InteractiveScene | undefined): boolean {
  if (!scene) return false;
  return getBooleanFromContent(scene, 'autoplay');
}

function shouldWaitForMediaEnd(scene: InteractiveScene | undefined): boolean {
  if (!scene || (scene.type !== 'branching' && scene.type !== 'quiz')) return false;
  return getBooleanFromContent(scene, 'wait_for_media_end');
}

function getTimelineCards(scene: InteractiveScene): Array<{
  id: string;
  title: string;
  description?: string;
  target_scene_id: string;
  image_url?: string;
  order_index: number;
}> {
  if (!scene.content || typeof scene.content !== 'object' || Array.isArray(scene.content)) {
    return [];
  }
  const record = scene.content as Record<string, unknown>;
  const cards = Array.isArray(record.cards)
    ? record.cards.filter(
      (
        item,
      ): item is {
        id: string;
        title: string;
        description?: string;
        target_scene_id: string;
        image_url?: string;
        order_index?: number;
      } => typeof item === 'object' && item !== null && typeof (item as Record<string, unknown>).target_scene_id === 'string',
    )
    : [];

  return cards
    .map((card, index) => ({
      id: card.id ?? `${card.target_scene_id}-${index}`,
      title: card.title ?? card.target_scene_id,
      description: card.description,
      target_scene_id: card.target_scene_id,
      image_url: card.image_url,
      order_index: Number(card.order_index ?? index),
    }))
    .sort((left, right) => left.order_index - right.order_index);
}

function getHotspotPosition(interaction: InteractiveInteraction): { x: number; y: number } {
  const x = Number(interaction.data?.x ?? interaction.data?.left ?? 50);
  const y = Number(interaction.data?.y ?? interaction.data?.top ?? 50);
  return {
    x: Math.min(95, Math.max(5, x)),
    y: Math.min(95, Math.max(5, y)),
  };
}

function getSceneTypeLabel(sceneType: InteractiveScene['type']): string {
  switch (sceneType) {
    case 'timeline':
      return 'Tổng quan';
    case 'slideshow':
      return 'Trình chiếu';
    case 'interactive_video':
      return 'Video tương tác';
    case 'branching':
      return 'Rẽ nhánh';
    case 'quiz':
      return 'Câu hỏi';
    case 'hotspot_audio':
      return 'Điểm chạm và âm thanh';
    case 'mini_game':
      return 'Mini game';
    case 'vr_scene':
      return 'Cảnh VR';
    default:
      return 'Cảnh';
  }
}

function resolveAudioFeedbackUrl(
  interaction: InteractiveInteraction,
  choice: NonNullable<InteractiveInteraction['choices']>[number],
  correct: boolean,
): string | undefined {
  if (typeof choice.feedback_audio_url === 'string') return choice.feedback_audio_url;
  if (correct && typeof interaction.data?.success_audio_url === 'string') return interaction.data.success_audio_url;
  if (!correct && typeof interaction.data?.error_audio_url === 'string') return interaction.data.error_audio_url;
  return undefined;
}

function getPhaseLabel(phase: PlayerPhase): string {
  switch (phase) {
    case 'loading':
      return 'Đang tải';
    case 'intro':
      return 'Mở đầu';
    case 'scene_active':
      return 'Đang xem cảnh';
    case 'interaction_open':
      return 'Đang mở tương tác';
    case 'transitioning':
      return 'Đang chuyển cảnh';
    case 'paused':
      return 'Tạm dừng';
    case 'completed':
      return 'Hoàn thành';
    case 'error':
      return 'Lỗi';
    default:
      return phase;
  }
}

function resolveDefaultNext(scene: InteractiveScene, orderedScenes: InteractiveScene[]): string | undefined {
  if (typeof scene.next === 'string') return scene.next;
  if (Array.isArray(scene.next)) {
    return scene.next.find((item): item is string => typeof item === 'string');
  }
  if (scene.next && typeof scene.next === 'object') {
    const record = scene.next as Record<string, unknown>;
      const candidate = record.scene_id ?? record.target_scene_id ?? record.default;
      if (typeof candidate === 'string') return candidate;
  }
  const currentIndex = orderedScenes.findIndex((item) => item.id === scene.id);
  if (currentIndex < 0) return undefined;
  return orderedScenes[currentIndex + 1]?.id;
}

export default function InteractiveBookPlayer({
  manifest,
  title,
  mode = 'student',
  reviewOnly = false,
  initialSceneId,
  initialStateSnapshot,
  initialScoreSummary,
  initialCompletionPercent = 0,
  autosaveKey,
  onCheckpoint,
  onComplete,
  onLogEvents,
  onSceneChange,
}: InteractiveBookPlayerProps) {
  const storedCheckpoint = useMemo(
    () => readStoredCheckpoint(autosaveKey, manifest),
    [autosaveKey, manifest],
  );
  const entrySceneId = manifest.entry_scene_id;
  const startingSceneId = initialSceneId
    ?? storedCheckpoint?.currentSceneId
    ?? entrySceneId;
  const baseSnapshot = storedCheckpoint?.stateSnapshot
    ?? normalizeStateSnapshot(initialStateSnapshot, entrySceneId);
  const initialVisited = ensureVisitedScene(baseSnapshot, startingSceneId, manifest.scenes.length);

  const [phase, setPhase] = useState<PlayerPhase>(
    startingSceneId === entrySceneId ? 'intro' : 'scene_active',
  );
  const [currentSceneId, setCurrentSceneId] = useState(startingSceneId);
  const [history, setHistory] = useState<string[]>([startingSceneId]);
  const [stateSnapshot, setStateSnapshot] = useState<RuntimeStateSnapshot>(initialVisited.nextState);
  const [completionPercent, setCompletionPercent] = useState(
    Math.max(initialCompletionPercent, storedCheckpoint?.completionPercent ?? initialVisited.completionPercent),
  );
  const [scoreSummary, setScoreSummary] = useState<ScoreSummary>(
    createDefaultScoreSummary(storedCheckpoint?.scoreSummary ?? initialScoreSummary),
  );
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [syncStatus, setSyncStatus] = useState<string | null>(
    storedCheckpoint ? 'Đang phục hồi tiến trình lưu tạm...' : null,
  );
  const [activeInteraction, setActiveInteraction] = useState<{
    interaction: InteractiveInteraction;
    interactionKey: string;
  } | null>(null);
  const [pendingAudioInteraction, setPendingAudioInteraction] = useState<{
    interaction: InteractiveInteraction;
    interactionKey: string;
  } | null>(null);
  const [interactionFeedback, setInteractionFeedback] = useState<string | null>(null);
  const [interactionFeedbackImage, setInteractionFeedbackImage] = useState<string | null>(null);
  const [pendingInteractionTargetSceneId, setPendingInteractionTargetSceneId] = useState<string | null>(null);
  const [interactionRequiresRetry, setInteractionRequiresRetry] = useState(false);
  const [hotspotSubtitle, setHotspotSubtitle] = useState<string | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);

  const sceneMap = useMemo(
    () => new Map(manifest.scenes.map((scene) => [scene.id, scene])),
    [manifest.scenes],
  );
  const currentScene = sceneMap.get(currentSceneId);
  const sceneIndex = manifest.scenes.findIndex((scene) => scene.id === currentSceneId);
  const slideImages = currentScene ? getSceneImageUrls(currentScene) : [];
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const interactionAudioRef = useRef<HTMLAudioElement | null>(null);
  const eventQueueRef = useRef<PlayerEventPayload[]>([]);
  const checkpointRef = useRef<PlayerCheckpointPayload>({
    currentSceneId: startingSceneId,
    stateSnapshot: initialVisited.nextState,
    completionPercent: Math.max(initialCompletionPercent, initialVisited.completionPercent),
    scoreSummary: createDefaultScoreSummary(initialScoreSummary),
  });
  const flushEventsRef = useRef<() => Promise<void>>(async () => {});
  const flushCheckpointRef = useRef<() => Promise<void>>(async () => {});
  const didMountSceneRef = useRef(false);

  const hasCompletedSceneMedia = (sceneId: string) => {
    const progress = checkpointRef.current.stateSnapshot.media_progress[sceneId];
    return progress?.scene_media_completed === true;
  };

  const markSceneMediaCompleted = (previous: RuntimeStateSnapshot, sceneId: string) => updateMediaProgress(previous, sceneId, {
    scene_media_completed: true,
    media_completed_at: new Date().toISOString(),
  });

  useEffect(() => {
    if (!currentScene) {
      setPlayerError('Không tìm thấy cảnh hợp lệ trong manifest.');
      setPhase('error');
      return;
    }
    setPlayerError(null);
  }, [currentScene]);

  useEffect(() => {
    if (!currentScene) return;
    onSceneChange?.(currentSceneId);
  }, [currentScene, currentSceneId, onSceneChange]);

  useEffect(() => {
    checkpointRef.current = {
      currentSceneId,
      stateSnapshot,
      completionPercent,
      scoreSummary,
    };
    writeStoredCheckpoint(autosaveKey, {
      currentSceneId,
      stateSnapshot,
      completionPercent,
      scoreSummary,
      savedAt: new Date().toISOString(),
    });
  }, [autosaveKey, completionPercent, currentSceneId, scoreSummary, stateSnapshot]);

  const queueEvent = (eventType: string, payload?: Record<string, unknown>, sceneId?: string) => {
    eventQueueRef.current.push({
      scene_id: sceneId ?? currentSceneId,
      event_type: eventType,
      payload,
    });
    if (eventQueueRef.current.length >= MAX_EVENT_BATCH) {
      void flushEventsRef.current();
    }
  };

  const flushEvents = async () => {
    if (!onLogEvents || eventQueueRef.current.length === 0 || reviewOnly) return;
    const pending = [...eventQueueRef.current];
    try {
      await onLogEvents(pending);
      eventQueueRef.current = eventQueueRef.current.slice(pending.length);
    } catch {
      // keep queue for the next retry
    }
  };
  flushEventsRef.current = flushEvents;

  const flushCheckpoint = async () => {
    if (!onCheckpoint || reviewOnly || phase === 'completed' || phase === 'error') return;
    try {
      await onCheckpoint(checkpointRef.current);
      setSyncStatus('Đã đồng bộ tiến trình');
    } catch {
      setSyncStatus('Đang giữ bản lưu tạm cục bộ');
    }
  };
  flushCheckpointRef.current = flushCheckpoint;

  useEffect(() => {
    if (!didMountSceneRef.current) {
      didMountSceneRef.current = true;
      if (storedCheckpoint) {
        queueEvent('resume_from_local', { saved_at: storedCheckpoint.savedAt }, currentSceneId);
      } else {
        queueEvent('scene_enter', { scene_type: currentScene?.type }, currentSceneId);
      }
      return;
    }
    queueEvent('scene_enter', { scene_type: currentScene?.type }, currentSceneId);
    void flushCheckpointRef.current();
  }, [currentScene?.type, currentSceneId]);

  useEffect(() => {
    const checkpointInterval = window.setInterval(() => {
      void flushCheckpointRef.current();
    }, AUTOSAVE_INTERVAL_MS);
    const eventInterval = window.setInterval(() => {
      void flushEventsRef.current();
    }, EVENT_FLUSH_INTERVAL_MS);

    return () => {
      window.clearInterval(checkpointInterval);
      window.clearInterval(eventInterval);
    };
  }, []);

  useEffect(() => () => {
    void flushEventsRef.current();
  }, []);

  useEffect(() => {
    setSlideIndex(0);
    setInteractionFeedback(null);
    setInteractionFeedbackImage(null);
    setPendingInteractionTargetSceneId(null);
    setInteractionRequiresRetry(false);
    setHotspotSubtitle(null);
    setPendingAudioInteraction(null);

    if (!currentScene) return;
    const sceneInteractions = currentScene.interactions ?? [];

    const onEnterInteraction = sceneInteractions
      .map((interaction, index) => ({ interaction, interactionKey: getInteractionKey(interaction, index) }))
      .find(
        ({ interaction, interactionKey }) =>
          interaction.trigger === 'on_enter'
          && !hasHandledInteraction(checkpointRef.current.stateSnapshot, currentScene.id, interactionKey),
      );

    if (onEnterInteraction) {
      const nextState = markInteractionHandled(
        checkpointRef.current.stateSnapshot,
        currentScene.id,
        onEnterInteraction.interactionKey,
      );
      setStateSnapshot(nextState);
      setActiveInteraction(onEnterInteraction);
      setPhase('interaction_open');
      return;
    }

    if ((currentScene.type === 'branching' || currentScene.type === 'quiz') && sceneInteractions.length > 0) {
      const hasSceneMediaToWait = Boolean(getVideoUrl(currentScene) || getAudioUrl(currentScene));
      if (shouldWaitForMediaEnd(currentScene) && !hasCompletedSceneMedia(currentScene.id) && hasSceneMediaToWait) {
        setActiveInteraction(null);
        setPhase(getVideoUrl(currentScene) ? 'paused' : 'scene_active');
        return;
      }
      const primary = sceneInteractions[0];
      setActiveInteraction({ interaction: primary, interactionKey: getInteractionKey(primary, 0) });
      setPhase('interaction_open');
      return;
    }

    if (currentScene.type === 'interactive_video') {
      setPhase('paused');
      return;
    }

    setActiveInteraction(null);
    setPhase(currentScene.id === entrySceneId ? 'intro' : 'scene_active');
  }, [currentScene, entrySceneId]);

  useEffect(() => {
    if (!currentScene || currentScene.type !== 'interactive_video' || !shouldAutoplayVideo(currentScene)) {
      return;
    }
    const timer = window.setTimeout(() => {
      void videoRef.current?.play().catch(() => {});
    }, 120);
    return () => window.clearTimeout(timer);
  }, [currentScene]);

  const updateSnapshot = (
    updater: (previous: RuntimeStateSnapshot) => RuntimeStateSnapshot,
    nextSceneOverride?: string,
  ) => {
    setStateSnapshot((previous) => {
      const updated = updater(previous);
      const { nextState, completionPercent: nextCompletion } = ensureVisitedScene(
        updated,
        nextSceneOverride ?? currentSceneId,
        manifest.scenes.length,
      );
      setCompletionPercent((currentValue) => Math.max(currentValue, nextCompletion));
      setScoreSummary(createDefaultScoreSummary(nextState.derived_score));
      return nextState;
    });
  };

  const transitionToScene = (targetSceneId: string, reason: string, extra?: Record<string, unknown>) => {
    if (!sceneMap.has(targetSceneId)) {
      setPlayerError('Cảnh đích không tồn tại trong manifest.');
      setPhase('error');
      return;
    }

    setPhase('transitioning');
    setActiveInteraction(null);
    setPendingInteractionTargetSceneId(null);
    setInteractionRequiresRetry(false);
    setInteractionFeedback(null);
    setInteractionFeedbackImage(null);
    updateSnapshot(
      (previous) =>
        appendBranchHistory(previous, {
          from_scene_id: currentSceneId,
          to_scene_id: targetSceneId,
          reason,
          at: new Date().toISOString(),
          ...extra,
        }),
      targetSceneId,
    );
    setHistory((previous) => [...previous, targetSceneId]);
    setCurrentSceneId(targetSceneId);
    queueEvent('scene_transition', { from: currentSceneId, to: targetSceneId, reason, ...extra }, targetSceneId);
  };

  const handleBack = () => {
    if (history.length <= 1) return;
    const nextHistory = [...history];
    nextHistory.pop();
    const previousSceneId = nextHistory[nextHistory.length - 1];
    setHistory(nextHistory);
    setCurrentSceneId(previousSceneId);
    setActiveInteraction(null);
    setPendingInteractionTargetSceneId(null);
    setInteractionRequiresRetry(false);
    setInteractionFeedback(null);
    setInteractionFeedbackImage(null);
    setPhase('transitioning');
    queueEvent('scene_backtrack', { to: previousSceneId }, previousSceneId);
  };

  const finalizeBook = async () => {
    const payload: PlayerCheckpointPayload = {
      currentSceneId,
      stateSnapshot: {
        ...checkpointRef.current.stateSnapshot,
        derived_score: checkpointRef.current.scoreSummary,
      },
      completionPercent: 100,
      scoreSummary: checkpointRef.current.scoreSummary,
    };

    setCompletionPercent(100);
    setPhase('completed');
    removeStoredCheckpoint(autosaveKey);
    queueEvent('book_completed', { title, completion_percent: 100 }, currentSceneId);
    setIsCompleting(true);

    try {
      if (!reviewOnly) {
        await onComplete?.(payload);
      }
      setSyncStatus('Đã hoàn thành và lưu tiến trình');
    } catch {
      setSyncStatus('Đã hoàn thành cục bộ, đang chờ đồng bộ lên server');
      writeStoredCheckpoint(autosaveKey, {
        ...payload,
        savedAt: new Date().toISOString(),
      });
    } finally {
      setIsCompleting(false);
      await flushEventsRef.current();
    }
  };

  const handleContinue = () => {
    if (!currentScene) return;
    const defaultNext = resolveDefaultNext(currentScene, manifest.scenes);
    if (defaultNext) {
      transitionToScene(defaultNext, 'default_next');
      return;
    }
    void finalizeBook();
  };

  const handleVideoEnded = () => {
    if (!currentScene) return;
    updateSnapshot((previous) => updateMediaProgress(previous, currentScene.id, {
      current_time: videoRef.current?.duration ?? videoRef.current?.currentTime ?? 0,
      ended_at: new Date().toISOString(),
    }));
    setPhase('scene_active');
    queueEvent('video_ended', { scene_id: currentScene.id }, currentScene.id);
  };

  const handleDeferredSceneInteraction = () => {
    if (!currentScene || (currentScene.type !== 'branching' && currentScene.type !== 'quiz')) return;
    const primary = (currentScene.interactions ?? [])[0];
    if (!primary) return;
    const interactionKey = getInteractionKey(primary, 0);
    if (hasHandledInteraction(checkpointRef.current.stateSnapshot, currentScene.id, interactionKey)) {
      setPhase('scene_active');
      return;
    }
    updateSnapshot((previous) => markSceneMediaCompleted(previous, currentScene.id));
    setActiveInteraction({ interaction: primary, interactionKey });
    setInteractionFeedback(null);
    setInteractionFeedbackImage(null);
    setPendingInteractionTargetSceneId(null);
    setInteractionRequiresRetry(false);
    setPhase('interaction_open');
    queueEvent('interaction_opened_after_media', { interaction_id: interactionKey }, currentScene.id);
  };

  const handleInteractionChoice = async (
    interaction: InteractiveInteraction,
    interactionKey: string,
    choice: NonNullable<InteractiveInteraction['choices']>[number],
  ) => {
    const correct = choice.is_correct ?? true;
    const nextScore: ScoreSummary = {
      ...scoreSummary,
      attempted: scoreSummary.attempted + 1,
      correct: scoreSummary.correct + (correct ? 1 : 0),
      score: scoreSummary.score + (choice.score_delta ?? (correct ? 1 : 0)),
    };

    updateSnapshot((previous) => {
      const withHandled = markInteractionHandled(previous, currentSceneId, interactionKey);
      const withResult = appendInteractionResult(withHandled, {
        scene_id: currentSceneId,
        interaction_id: interactionKey,
        choice_id: choice.id,
        is_correct: correct,
        at: new Date().toISOString(),
      });
      return {
        ...withResult,
        derived_score: nextScore,
      };
    });

    setScoreSummary(nextScore);
    const feedback = choice.feedback
      ?? (correct
        ? (typeof interaction.data?.correct_feedback_message === 'string' ? interaction.data.correct_feedback_message : 'Lựa chọn chính xác. Bạn có thể đi tiếp.')
        : (typeof interaction.data?.wrong_feedback_message === 'string' ? interaction.data.wrong_feedback_message : 'Chưa đúng. Hãy thử lại hoặc xem gợi ý.'));
    setInteractionFeedback(feedback);
    setInteractionFeedbackImage(choice.feedback_image_url ?? null);
    setPendingInteractionTargetSceneId(null);
    playEffectAudio(resolveAudioFeedbackUrl(interaction, choice, correct));
    queueEvent('interaction_choice', {
      interaction_id: interactionKey,
      choice_id: choice.id,
      correct,
    }, currentSceneId);

    if (!correct && choice.retry) {
      setInteractionRequiresRetry(true);
      return;
    }

    setInteractionRequiresRetry(false);
    const defaultNext = currentScene ? resolveDefaultNext(currentScene, manifest.scenes) : undefined;
    const targetSceneId = choice.target_scene_id
      || interaction.target_scene_id
      || ((currentScene?.type === 'quiz' || currentScene?.type === 'branching') ? defaultNext : undefined);
    setPendingInteractionTargetSceneId(targetSceneId ?? null);
  };

  const handleOpenInteraction = (interaction: InteractiveInteraction, interactionKey: string) => {
    setActiveInteraction({ interaction, interactionKey });
    setInteractionFeedback(null);
    setInteractionFeedbackImage(null);
    setPendingInteractionTargetSceneId(null);
    setInteractionRequiresRetry(false);
    setPhase('interaction_open');
    queueEvent('interaction_opened', { interaction_id: interactionKey, trigger: interaction.trigger }, currentSceneId);
  };

  const findSceneInteraction = (interactionId: string) => {
    if (!currentScene) return null;
    const found = (currentScene.interactions ?? [])
      .map((interaction, index) => ({ interaction, interactionKey: getInteractionKey(interaction, index) }))
      .find(({ interaction, interactionKey }) => interaction.id === interactionId || interactionKey === interactionId);
    return found ?? null;
  };

  const playEffectAudio = (url: string | undefined) => {
    if (!url || !interactionAudioRef.current) return;
    interactionAudioRef.current.src = url;
    void interactionAudioRef.current.play().catch(() => {});
  };

  const handleInteractionContinue = () => {
    if (!activeInteraction) {
      handleContinue();
      return;
    }

    updateSnapshot((previous) => markInteractionHandled(previous, currentSceneId, activeInteraction.interactionKey));
    setActiveInteraction(null);
    setInteractionFeedback(null);
    setInteractionFeedbackImage(null);
    setInteractionRequiresRetry(false);

    const targetSceneId = pendingInteractionTargetSceneId
      || activeInteraction.interaction.target_scene_id
      || (currentScene ? resolveDefaultNext(currentScene, manifest.scenes) : undefined);
    setPendingInteractionTargetSceneId(null);
    if (targetSceneId) {
      transitionToScene(targetSceneId, 'interaction_continue', {
        interaction_id: activeInteraction.interactionKey,
      });
      return;
    }

    setPhase('scene_active');
  };

  const handleHotspotClick = (interaction: InteractiveInteraction, interactionKey: string) => {
    const audioUrl = typeof interaction.data?.audio_url === 'string' ? interaction.data.audio_url : undefined;
    const subtitle = typeof interaction.data?.subtitle === 'string'
      ? interaction.data.subtitle
      : interaction.prompt ?? null;
    const followUpInteractionId = typeof interaction.data?.follow_up_interaction_id === 'string'
      ? interaction.data.follow_up_interaction_id
      : undefined;
    const shouldWaitForAudio = Boolean(interaction.data?.show_after_audio && audioUrl && followUpInteractionId);
    const followUpInteraction = followUpInteractionId ? findSceneInteraction(followUpInteractionId) : null;

    if (audioUrl) {
      playEffectAudio(audioUrl);
    }

    setHotspotSubtitle(subtitle);
    if (shouldWaitForAudio) {
      setPendingAudioInteraction(followUpInteraction);
      setPhase('paused');
      queueEvent('hotspot_audio_started', { interaction_id: interactionKey }, currentSceneId);
      return;
    }

    handleOpenInteraction(interaction, interactionKey);
  };

  const handleVideoTimeUpdate = () => {
    if (!currentScene || currentScene.type !== 'interactive_video' || !videoRef.current || activeInteraction) {
      return;
    }

    const timedInteraction = (currentScene.interactions ?? [])
      .map((interaction, index) => ({ interaction, key: getInteractionKey(interaction, index) }))
      .find(({ interaction, key }) => {
        if (interaction.trigger !== 'timecode') return false;
        if (hasHandledInteraction(checkpointRef.current.stateSnapshot, currentScene.id, key)) return false;
        return typeof interaction.timecode === 'number'
          ? videoRef.current!.currentTime >= interaction.timecode
          : false;
      });

    if (!timedInteraction) return;

    videoRef.current.pause();
    updateSnapshot((previous) => {
      const handled = markInteractionHandled(previous, currentScene.id, timedInteraction.key);
      return updateMediaProgress(handled, currentScene.id, {
        current_time: videoRef.current?.currentTime ?? 0,
      });
    });
    handleOpenInteraction(timedInteraction.interaction, timedInteraction.key);
  };

  const handleEffectAudioEnded = () => {
    if (pendingAudioInteraction) {
      const followUp = pendingAudioInteraction;
      setPendingAudioInteraction(null);
      handleOpenInteraction(followUp.interaction, followUp.interactionKey);
      return;
    }
    if (phase === 'paused' && currentScene?.type !== 'interactive_video') {
      setPhase('scene_active');
    }
  };

  const renderSceneVisual = () => {
    if (!currentScene) return null;

    const sceneText = getSceneText(currentScene);
    const backgroundAudio = getAudioUrl(currentScene);

    if (currentScene.type === 'timeline') {
      const cards = getTimelineCards(currentScene);
      const timelineHero = getPrimaryImage(currentScene);
      return (
        <div className="space-y-4">
          {timelineHero && (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
              <img
                src={timelineHero}
                alt={currentScene.title || 'Ảnh tổng quan'}
                className="h-[320px] w-full object-cover"
              />
            </div>
          )}
          {sceneText && (
            <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
              {sceneText}
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {cards.map((card) => {
              const visited = stateSnapshot.visited_scenes.includes(card.target_scene_id);
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => transitionToScene(card.target_scene_id, 'timeline_card_click', { card_id: card.id })}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
                >
                  {card.image_url ? (
                    <img src={card.image_url} alt={card.title} className="h-48 w-full object-cover" />
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-slate-100 text-slate-400">
                      Chưa có ảnh tổng quan
                    </div>
                  )}
                  <div className="space-y-2 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-base font-semibold text-slate-900">{card.title}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${visited ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {visited ? 'Đã mở' : 'Chưa mở'}
                      </span>
                    </div>
                    {card.description && (
                      <p className="text-sm leading-6 text-slate-600">{card.description}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {backgroundAudio && (
            <audio controls className="w-full" src={backgroundAudio}>
              Trình duyệt của bạn không hỗ trợ audio.
            </audio>
          )}
        </div>
      );
    }

    if (currentScene.type === 'interactive_video') {
      const videoUrl = getVideoUrl(currentScene);
      return (
        <div className="space-y-4">
          {videoUrl ? (
            <video
              ref={videoRef}
              controls
              className="w-full rounded-3xl border border-slate-200 bg-slate-950"
              poster={getPrimaryImage(currentScene)}
              src={videoUrl}
              preload="metadata"
              autoPlay={shouldAutoplayVideo(currentScene)}
              playsInline
              onTimeUpdate={handleVideoTimeUpdate}
              onPause={() => { if (phase !== 'interaction_open') setPhase('paused'); }}
              onPlay={() => setPhase('scene_active')}
              onEnded={handleVideoEnded}
            >
              Trình duyệt của bạn không hỗ trợ video.
            </video>
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
              Chưa có video cho cảnh này.
            </div>
          )}
          {sceneText && (
            <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
              {sceneText}
            </p>
          )}
          {backgroundAudio && (
            <audio controls className="w-full" src={backgroundAudio}>
              Trình duyệt của bạn không hỗ trợ audio.
            </audio>
          )}
        </div>
      );
    }

    if (currentScene.type === 'hotspot_audio') {
      const background = getPrimaryImage(currentScene);
      const hotspots = (currentScene.interactions ?? [])
        .map((interaction, index) => ({
          interaction,
          interactionKey: getInteractionKey(interaction, index),
        }))
        .filter(({ interaction }) => interaction.trigger === 'on_click' || interaction.trigger === 'on_choice');

      return (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
            {background ? (
              <img
                src={background}
                alt={currentScene.title || 'Scene image'}
                className="h-[420px] w-full object-cover"
              />
            ) : (
              <div className="flex h-[420px] items-center justify-center text-slate-400">
                Chưa có hình nền cho cảnh điểm chạm.
              </div>
            )}
            {hotspots.map(({ interaction, interactionKey }) => {
              const position = getHotspotPosition(interaction);
              return (
                <button
                  key={interactionKey}
                  type="button"
                  className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-sky-500/85 text-white shadow-lg transition-transform hover:scale-105"
                  style={{ left: `${position.x}%`, top: `${position.y}%` }}
                  onClick={() => handleHotspotClick(interaction, interactionKey)}
                >
                  <Volume2 className="h-5 w-5" />
                </button>
              );
            })}
          </div>
          {hotspotSubtitle && (
            <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              {hotspotSubtitle}
            </div>
          )}
          {backgroundAudio && (
            <audio controls className="w-full" src={backgroundAudio}>
              Trình duyệt của bạn không hỗ trợ audio.
            </audio>
          )}
        </div>
      );
    }

    if (currentScene.type === 'branching' || currentScene.type === 'quiz') {
      const videoUrl = getVideoUrl(currentScene);
      const previewImage = getPrimaryImage(currentScene);
      const waitForMediaEnd = shouldWaitForMediaEnd(currentScene) && !hasCompletedSceneMedia(currentScene.id);
      const shouldOpenQuestionAfterAudio = waitForMediaEnd && !videoUrl;

      return (
        <div className="space-y-4">
          {videoUrl ? (
            <video
              ref={videoRef}
              controls
              className="w-full rounded-3xl border border-slate-200 bg-slate-950"
              poster={previewImage}
              src={videoUrl}
              preload="metadata"
              autoPlay={shouldAutoplayVideo(currentScene) || waitForMediaEnd}
              playsInline
              onPlay={() => setPhase('scene_active')}
              onPause={() => {
                if (phase !== 'interaction_open') {
                  setPhase('paused');
                }
              }}
              onEnded={() => {
                handleVideoEnded();
                if (waitForMediaEnd) {
                  handleDeferredSceneInteraction();
                }
              }}
            >
              Trình duyệt của bạn không hỗ trợ video.
            </video>
          ) : previewImage ? (
            <img
              src={previewImage}
              alt={currentScene.title || 'Ảnh minh họa của cảnh'}
              className="h-[420px] w-full rounded-3xl border border-slate-200 object-cover"
            />
          ) : (
            <div className="flex h-[420px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
              Cảnh này chưa có tư liệu chính.
            </div>
          )}

          {sceneText && (
            <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
              {sceneText}
            </div>
          )}

          {backgroundAudio && (
            <audio
              controls
              className="w-full"
              src={backgroundAudio}
              autoPlay={shouldOpenQuestionAfterAudio}
              onEnded={() => {
                if (shouldOpenQuestionAfterAudio) {
                  handleDeferredSceneInteraction();
                }
              }}
            >
              Trình duyệt của bạn không hỗ trợ audio.
            </audio>
          )}
        </div>
      );
    }

    if (currentScene.type === 'slideshow') {
      const currentImage = slideImages[slideIndex];
      return (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
            {currentImage ? (
              <img
                src={currentImage}
                alt={currentScene.title || `Slide ${slideIndex + 1}`}
                className="h-[420px] w-full object-cover"
              />
            ) : (
              <div className="flex h-[420px] items-center justify-center text-slate-400">
                Chưa có ảnh trình chiếu cho cảnh này.
              </div>
            )}
          </div>
          {slideImages.length > 1 && (
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSlideIndex((current) => Math.max(0, current - 1))}
                disabled={slideIndex === 0}
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Slide trước
              </Button>
              <span className="text-sm text-slate-500">Slide {slideIndex + 1}/{slideImages.length}</span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSlideIndex((current) => Math.min(slideImages.length - 1, current + 1))}
                disabled={slideIndex >= slideImages.length - 1}
              >
                Slide tiếp
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          )}
          {sceneText && (
            <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
              {sceneText}
            </div>
          )}
        </div>
      );
    }

    const previewImage = getPrimaryImage(currentScene);
    return (
      <div className="space-y-4">
        {previewImage ? (
          <img
            src={previewImage}
            alt={currentScene.title || 'Scene image'}
            className="h-[420px] w-full rounded-3xl border border-slate-200 object-cover"
          />
        ) : (
          <div className="flex h-[420px] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
            Cảnh này chưa có tư liệu chính.
          </div>
        )}
        {sceneText && (
          <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
            {sceneText}
          </div>
        )}
      </div>
    );
  };

  const renderInteractionPanel = () => {
    const sceneType = currentScene ? getSceneTypeLabel(currentScene.type) : 'Cảnh';
    if (!currentScene) return null;
    if (phase === 'completed') {
      return (
        <div className="space-y-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            <div>
              <h3 className="text-lg font-semibold text-emerald-950">Đã hoàn thành sách tương tác</h3>
              <p className="text-sm text-emerald-800">Bạn có thể ở lại để xem lại nội dung.</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-2xl bg-white px-3 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Hoàn thành</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{completionPercent}%</p>
            </div>
            <div className="rounded-2xl bg-white px-3 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Đúng</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{scoreSummary.correct}</p>
            </div>
            <div className="rounded-2xl bg-white px-3 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Điểm</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{scoreSummary.score}</p>
            </div>
          </div>
        </div>
      );
    }

    if (!activeInteraction) {
      return (
        <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5">
          <div className="space-y-2">
            <div className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
              {sceneType}
            </div>
            <h3 className="text-xl font-semibold text-slate-900">{currentScene.title || `Cảnh ${sceneIndex + 1}`}</h3>
            <p className="text-sm leading-6 text-slate-600">
              {getSceneText(currentScene) || 'Cảnh này đang dùng cấu hình mở rộng từ manifest.'}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Trạng thái</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{getPhaseLabel(phase)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Đã xem</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{stateSnapshot.visited_scenes.length}/{manifest.scenes.length}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Điểm</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{scoreSummary.score}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Đồng bộ</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{syncStatus || 'Sẵn sàng'}</p>
            </div>
          </div>
        </div>
      );
    }

    const { interaction, interactionKey } = activeInteraction;
    const choices = interaction.choices ?? [];
    const canContinueInteraction = choices.length === 0
      || Boolean(pendingInteractionTargetSceneId)
      || ((!interactionRequiresRetry) && Boolean(interactionFeedback || interactionFeedbackImage));
    return (
      <div className="space-y-4 rounded-3xl border border-amber-200 bg-amber-50 p-5">
        <div className="space-y-2">
          <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-medium text-amber-700">Tương tác</div>
          <h3 className="text-xl font-semibold text-slate-900">{interaction.prompt || currentScene.title || 'Lời nhắc'}</h3>
          <p className="text-sm leading-6 text-slate-700">
            {typeof interaction.data?.subtitle === 'string' ? interaction.data.subtitle : 'Hãy xử lý tương tác này trước khi tiếp tục luồng học.'}
          </p>
        </div>
        {choices.length > 0 ? (
          <div className="space-y-2">
            {choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:border-amber-400 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={Boolean(pendingInteractionTargetSceneId)}
                onClick={() => { void handleInteractionChoice(interaction, interactionKey, choice); }}
              >
                {choice.label}
              </button>
            ))}
          </div>
        ) : (
          <Button type="button" onClick={handleInteractionContinue} className="w-full">Tiếp tục</Button>
        )}
        {(interactionFeedback || interactionFeedbackImage) && (
          <div className="rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm text-slate-700">
            {interactionFeedback && <p>{interactionFeedback}</p>}
            {interactionFeedbackImage && (
              <img
                src={interactionFeedbackImage}
                alt="Phản hồi của đáp án"
                className={`w-full rounded-2xl object-cover ${interactionFeedback ? 'mt-3 max-h-56' : 'max-h-72'}`}
              />
            )}
          </div>
        )}
        {choices.length > 0 && canContinueInteraction && (
          <Button type="button" variant="secondary" onClick={handleInteractionContinue} className="w-full">
            {pendingInteractionTargetSceneId ? 'Tiếp tục' : 'Đóng tương tác'}
          </Button>
        )}
      </div>
    );
  };

  if (!currentScene) {
    return (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
        Không thể hiển thị sách tương tác vì manifest không hợp lệ.
        </div>
    );
  }

  const defaultNext = resolveDefaultNext(currentScene, manifest.scenes);
  const visitedContentSceneCount = Array.from(new Set(
    stateSnapshot.visited_scenes.filter((sceneId) => {
      const scene = sceneMap.get(sceneId);
      return scene && scene.type !== 'timeline';
    }),
  )).length;
  const totalContentSceneCount = manifest.scenes.filter((scene) => scene.type !== 'timeline').length;
  const canCompleteFromTimeline = currentScene.type !== 'timeline' || visitedContentSceneCount >= totalContentSceneCount;
  const activeInteractionHasChoices = (activeInteraction?.interaction.choices?.length ?? 0) > 0;
  const canContinueActiveInteraction = !activeInteraction
    ? false
    : !activeInteractionHasChoices
      || Boolean(pendingInteractionTargetSceneId)
      || ((!interactionRequiresRetry) && Boolean(interactionFeedback || interactionFeedbackImage));
  const activeInteractionButtonLabel = pendingInteractionTargetSceneId ? 'Tiếp tục' : 'Đóng tương tác';

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-sky-50 via-white to-amber-50 px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 text-sky-500" />
                {mode === 'preview' ? 'Chế độ xem thử' : reviewOnly ? 'Chế độ xem lại' : 'Chế độ học'}
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">{title}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Cảnh {Math.max(sceneIndex + 1, 1)}/{manifest.scenes.length} - {getSceneTypeLabel(currentScene.type)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center justify-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  <Layers3 className="h-3.5 w-3.5" /> Tiến độ
                </div>
                <p className="mt-1 text-lg font-semibold text-slate-900">{completionPercent}%</p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center justify-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  <GitBranch className="h-3.5 w-3.5" /> Lựa chọn
                </div>
                <p className="mt-1 text-lg font-semibold text-slate-900">{stateSnapshot.branch_history.length}</p>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center justify-center gap-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                  <Clock3 className="h-3.5 w-3.5" /> Trạng thái
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-900">{getPhaseLabel(phase)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="mb-5 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all" style={{ width: `${completionPercent}%` }} />
          </div>
          {playerError && (
            <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-medium">Trình phát gặp sự cố</p>
                <p>{playerError}</p>
              </div>
            </div>
          )}
          {syncStatus && phase !== 'completed' && (
            <div className="mb-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{syncStatus}</div>
          )}

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_360px]">
            <section className="min-w-0">{renderSceneVisual()}</section>
            <aside className="min-w-0">{renderInteractionPanel()}</aside>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <CirclePlay className="h-4 w-4" />
              {currentScene.title || `Cảnh ${sceneIndex + 1}`}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="secondary" onClick={handleBack} disabled={history.length <= 1}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Quay lại
              </Button>
              {currentScene.id !== entrySceneId && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => transitionToScene(entrySceneId, 'return_to_overview')}
                >
                  Tổng quan
                </Button>
              )}
              {currentScene.type === 'interactive_video' && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (!videoRef.current) return;
                    if (videoRef.current.paused) {
                      void videoRef.current.play().catch(() => {});
                    } else {
                      videoRef.current.pause();
                    }
                  }}
                >
                  <PlayCircle className="mr-1.5 h-4 w-4" />
                  {videoRef.current?.paused ?? true ? 'Phát video' : 'Tạm dừng'}
                </Button>
              )}
              {phase !== 'completed' && (
                <Button
                  type="button"
                  disabled={activeInteraction ? !canContinueActiveInteraction : (!defaultNext && !canCompleteFromTimeline)}
                  onClick={() => {
                    if (activeInteraction) {
                      handleInteractionContinue();
                      return;
                    }
                    if (defaultNext) {
                      handleContinue();
                      return;
                    }
                    void finalizeBook();
                  }}
                  isLoading={isCompleting}
                >
                  {activeInteraction
                    ? activeInteractionButtonLabel
                    : defaultNext
                      ? 'Cảnh tiếp theo'
                      : canCompleteFromTimeline
                        ? 'Hoàn thành'
                        : 'Khám phá thêm'}
                  {!activeInteraction && defaultNext && <ArrowRight className="ml-1.5 h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <audio ref={interactionAudioRef} className="hidden" preload="none" onEnded={handleEffectAudioEnded} />
    </div>
  );
}
