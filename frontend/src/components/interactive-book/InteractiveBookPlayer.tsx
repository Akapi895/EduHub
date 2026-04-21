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
  PauseCircle,
  PlayCircle,
  Sparkles,
  Volume2,
} from 'lucide-react';
import Button from '@/components/common/Button';
import type {
  ConnectTheDotsPoint,
  InteractiveBookManifest,
  InteractiveInteraction,
  InteractiveLayer,
  InteractiveScoreSummary,
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

type ScoreSummary = InteractiveScoreSummary;

type RuntimeStateSnapshot = {
  visited_scenes: string[];
  branch_history: Array<Record<string, unknown>>;
  interaction_results: Array<Record<string, unknown>>;
  retry_history: Array<Record<string, unknown>>;
  media_progress: Record<string, Record<string, unknown>>;
  derived_score: ScoreSummary;
  [key: string]: unknown;
};

type RuntimeEvent = {
  scene_id?: string;
  event_type: string;
  payload?: Record<string, unknown>;
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
  onExit?: () => void;
  onRestart?: () => void;
  immersive?: boolean;
}

const AUTOSAVE_INTERVAL_MS = 25000;
const EVENT_FLUSH_INTERVAL_MS = 10000;
const MAX_EVENT_BATCH = 8;

function createDefaultScoreSummary(initial?: Record<string, unknown> | null): ScoreSummary {
  const score = Number(initial?.score ?? initial?.total_score ?? 0);
  const correct = Number(initial?.correct ?? initial?.correct_count ?? 0);
  const attempted = Number(initial?.attempted ?? 0);
  const wrong = Number(initial?.wrong_count ?? Math.max(0, attempted - correct));
  return {
    ...(initial ?? {}),
    attempted,
    correct,
    score,
    total_score: Number(initial?.total_score ?? score),
    max_score: Number(initial?.max_score ?? 0),
    correct_count: Number(initial?.correct_count ?? correct),
    wrong_count: wrong,
    retry_count: Number(initial?.retry_count ?? 0),
    completed_scene_count: Number(initial?.completed_scene_count ?? 0),
    branch_history: Array.isArray(initial?.branch_history)
      ? initial.branch_history.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null)
      : [],
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
  const retryHistory = Array.isArray(raw.retry_history)
    ? raw.retry_history.filter(
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
    retry_history: retryHistory,
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

function appendRetryHistory(
  stateSnapshot: RuntimeStateSnapshot,
  retryItem: Record<string, unknown>,
): RuntimeStateSnapshot {
  return {
    ...stateSnapshot,
    retry_history: [...stateSnapshot.retry_history, retryItem],
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

function getOptionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getVisibleSceneTitle(scene: InteractiveScene): string | null {
  return getOptionalText(scene.title);
}

function getVisibleSceneText(scene: InteractiveScene): string | null {
  return getOptionalText(getSceneText(scene));
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

type BackgroundAudioTrigger = 'on_enter' | 'on_slide_change' | 'manual';

function getBackgroundAudioTrigger(scene: InteractiveScene | undefined): BackgroundAudioTrigger {
  if (!scene) return 'on_enter';
  const record = getContentRecord(scene);
  const trigger = record.background_audio_trigger;
  if (trigger === 'on_enter' || trigger === 'on_slide_change' || trigger === 'manual') {
    return trigger;
  }
  return 'on_enter';
}

function getSceneMediaKind(scene: InteractiveScene): 'image' | 'video' {
  if (scene.type === 'media') {
    const record = getContentRecord(scene);
    if (record.media_kind === 'image' || record.media_kind === 'video') {
      return record.media_kind;
    }
  }
  if (scene.type === 'interactive_video') {
    return 'video';
  }
  return getVideoUrl(scene) ? 'video' : 'image';
}

function getQuestionInteraction(scene: InteractiveScene): InteractiveInteraction | null {
  const interactions = scene.interactions ?? [];
  const record = getContentRecord(scene);
  const configuredId = typeof record.question_interaction_id === 'string' ? record.question_interaction_id : '';
  if (configuredId) {
    const configured = interactions.find((interaction) => interaction.id === configuredId);
    if (configured) return configured;
  }

  if (scene.type === 'hotspot_audio') {
    const hotspot = interactions.find((interaction) => interaction.type === 'hotspot');
    const followUpId = typeof hotspot?.data?.follow_up_interaction_id === 'string'
      ? hotspot.data.follow_up_interaction_id
      : '';
    if (followUpId) {
      const followUp = interactions.find((interaction) => interaction.id === followUpId);
      if (followUp) return followUp;
    }
  }

  return interactions.find((interaction) => (interaction.choices?.length ?? 0) > 0)
    ?? interactions.find((interaction) => (
      interaction.type === 'quiz'
      || interaction.type === 'multiple_choice'
      || interaction.type === 'branching_prompt'
    ))
    ?? null;
}

function isQuestionEnabled(scene: InteractiveScene): boolean {
  const record = getContentRecord(scene);
  if (typeof record.question_enabled === 'boolean') {
    return record.question_enabled;
  }
  return Boolean(getQuestionInteraction(scene));
}

function getPrimarySceneQuestion(scene: InteractiveScene): InteractiveInteraction | null {
  if (scene.type === 'media') return isQuestionEnabled(scene) ? getQuestionInteraction(scene) : null;
  if (scene.type === 'branching' || scene.type === 'quiz') {
    return (scene.interactions ?? [])[0] ?? null;
  }
  return null;
}

function getRenderableVideoUrl(scene: InteractiveScene): string | undefined {
  if (scene.type === 'media' && getSceneMediaKind(scene) !== 'video') {
    return undefined;
  }
  return getVideoUrl(scene);
}

function getRenderableImageUrl(scene: InteractiveScene): string | undefined {
  if (scene.type === 'media' && getSceneMediaKind(scene) === 'video') {
    return getPrimaryImage(scene);
  }
  return getPrimaryImage(scene);
}

function getContentRecord(scene: InteractiveScene): Record<string, unknown> {
  if (!scene.content || typeof scene.content !== 'object' || Array.isArray(scene.content)) return {};
  return scene.content as Record<string, unknown>;
}

function getSceneLayers(scene: InteractiveScene): InteractiveLayer[] {
  const layers = getContentRecord(scene).layers;
  return Array.isArray(layers)
    ? layers.filter((item): item is InteractiveLayer => Boolean(item) && typeof item === 'object' && typeof (item as InteractiveLayer).id === 'string')
    : [];
}

function getConnectDotsPoints(scene: InteractiveScene): ConnectTheDotsPoint[] {
  const points = getContentRecord(scene).points;
  return Array.isArray(points)
    ? points
      .filter((item): item is ConnectTheDotsPoint => Boolean(item) && typeof item === 'object' && typeof (item as ConnectTheDotsPoint).id === 'string')
      .map((point, index) => ({
        id: point.id,
        label: typeof point.label === 'string' ? point.label : String(index + 1),
        x: Number.isFinite(Number(point.x)) ? Number(point.x) : 50,
        y: Number.isFinite(Number(point.y)) ? Number(point.y) : 50,
        order: Number.isFinite(Number(point.order)) ? Number(point.order) : index + 1,
      }))
      .sort((left, right) => left.order - right.order)
    : [];
}

function getConnectDotsBackground(scene: InteractiveScene): string | undefined {
  const record = getContentRecord(scene);
  const background = record.background_image_url ?? record.image_url;
  return typeof background === 'string' ? background : getPrimaryImage(scene);
}

function getConnectDotsSuccessTarget(scene: InteractiveScene): string | undefined {
  const target = getContentRecord(scene).success_target_scene_id;
  return typeof target === 'string' && target.trim() ? target : undefined;
}

function getNumberFromContent(scene: InteractiveScene, key: string, fallback = 0): number {
  const value = getContentRecord(scene)[key];
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function estimateMaxScore(manifest: InteractiveBookManifest): number {
  return manifest.scenes.reduce((total, scene) => {
    const choiceScores = (scene.interactions ?? []).reduce((sum, interaction) => {
      const bestChoiceScore = Math.max(
        0,
        ...(interaction.choices ?? []).map((choice) => Number(choice.score_delta ?? (choice.is_correct ? 1 : 0))),
      );
      return sum + bestChoiceScore;
    }, 0);
    const connectScore = scene.type === 'connect_the_dots' ? getNumberFromContent(scene, 'complete_score', 1) : 0;
    return total + choiceScores + connectScore;
  }, 0);
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
  if (!scene) return false;
  if (scene.type === 'media') {
    return isQuestionEnabled(scene) && Boolean(getRenderableVideoUrl(scene) || getAudioUrl(scene));
  }
  if (scene.type !== 'branching' && scene.type !== 'quiz') return false;
  return getBooleanFromContent(scene, 'wait_for_media_end');
}

function normalizeVisibilityTrigger(trigger: string | undefined) {
  switch (trigger) {
    case 'always':
    case 'on_scene_enter':
      return 'always';
    case 'after_time':
      return 'after_delay';
    default:
      return trigger ?? 'always';
  }
}

function getCompletionMessage(scoreSummary: ScoreSummary, maxScore: number) {
  const safeMax = Math.max(1, maxScore);
  const ratio = Number(scoreSummary.total_score ?? 0) / safeMax;
  if (ratio >= 0.85) return 'Hoàn thành tốt. Em đã nắm được luồng chính của câu chuyện.';
  if (ratio >= 0.5) return 'Đã hoàn thành. Có thể xem lại các nhánh sai để hiểu kỹ hơn.';
  return 'Đã hoàn thành. Nên thử lại để giảm số lỗi sai và tăng điểm tổng kết.';
}

function getTimelineCards(scene: InteractiveScene): Array<{
  id: string;
  title?: string;
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
      title: typeof card.title === 'string' ? card.title : undefined,
      description: typeof card.description === 'string' ? card.description : undefined,
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
    case 'media':
      return 'Nội dung';
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
    case 'connect_the_dots':
      return 'Nối điểm';
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
  onExit,
  onRestart,
  immersive: immersiveProp,
}: InteractiveBookPlayerProps) {
  const immersive = immersiveProp ?? mode === 'student';
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
  const [runtimeEvents, setRuntimeEvents] = useState<RuntimeEvent[]>([]);
  const [sceneElapsedMs, setSceneElapsedMs] = useState(0);
  const [currentMediaTime, setCurrentMediaTime] = useState(0);
  const [sceneAudioPlaying, setSceneAudioPlaying] = useState(false);
  const [pendingSceneAudioAutoplay, setPendingSceneAudioAutoplay] = useState(false);
  const [sceneAudioNotice, setSceneAudioNotice] = useState<string | null>(null);
  const [connectDotsState, setConnectDotsState] = useState<{
    sceneId: string;
    completedPointIds: string[];
    feedback?: string;
  }>({ sceneId: startingSceneId, completedPointIds: [] });

  const sceneMap = useMemo(
    () => new Map(manifest.scenes.map((scene) => [scene.id, scene])),
    [manifest.scenes],
  );
  const maxScore = useMemo(() => estimateMaxScore(manifest), [manifest]);
  const currentScene = sceneMap.get(currentSceneId);
  const sceneIndex = manifest.scenes.findIndex((scene) => scene.id === currentSceneId);
  const visibleSceneTitle = currentScene ? getVisibleSceneTitle(currentScene) : null;
  const slideImages = currentScene ? getSceneImageUrls(currentScene) : [];
  const backgroundAudioUrl = currentScene ? getAudioUrl(currentScene) : undefined;
  const backgroundAudioTrigger = getBackgroundAudioTrigger(currentScene);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const sceneAudioRef = useRef<HTMLAudioElement | null>(null);
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
  const sceneEnteredAtRef = useRef(Date.now());

  const getSceneMediaRequirements = (scene: InteractiveScene | undefined) => ({
    requiresVideo: Boolean(scene && getRenderableVideoUrl(scene)),
    requiresAudio: Boolean(scene && getAudioUrl(scene)),
  });

  const hasCompletedSceneMedia = (scene: InteractiveScene | undefined, snapshot = stateSnapshot) => {
    if (!scene) return true;
    const progress = snapshot.media_progress[scene.id] ?? {};
    const { requiresVideo, requiresAudio } = getSceneMediaRequirements(scene);
    if (!requiresVideo && !requiresAudio) return true;
    if (requiresVideo && progress.video_completed !== true) return false;
    if (requiresAudio && progress.audio_completed !== true) return false;
    return true;
  };

  const markSceneVideoCompleted = (previous: RuntimeStateSnapshot, sceneId: string) => updateMediaProgress(previous, sceneId, {
    video_completed: true,
    video_completed_at: new Date().toISOString(),
  });

  const markSceneAudioCompleted = (previous: RuntimeStateSnapshot, sceneId: string) => updateMediaProgress(previous, sceneId, {
    audio_completed: true,
    audio_completed_at: new Date().toISOString(),
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
    const event = {
      scene_id: sceneId ?? currentSceneId,
      event_type: eventType,
      payload,
    };
    eventQueueRef.current.push(event);
    setRuntimeEvents((previous) => [...previous.slice(-119), event]);
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

  const pauseSceneAudio = () => {
    if (!sceneAudioRef.current) return;
    sceneAudioRef.current.pause();
    setSceneAudioPlaying(false);
  };

  const tryPlaySceneAudio = async (reason: 'auto' | 'manual') => {
    if (!sceneAudioRef.current || !backgroundAudioUrl) return false;
    try {
      sceneAudioRef.current.src = backgroundAudioUrl;
      if (reason === 'manual' || sceneAudioRef.current.ended) {
        sceneAudioRef.current.currentTime = 0;
      }
      await sceneAudioRef.current.play();
      setSceneAudioPlaying(true);
      setPendingSceneAudioAutoplay(false);
      setSceneAudioNotice(null);
      queueEvent('background_audio_started', { trigger: backgroundAudioTrigger, reason }, currentSceneId);
      return true;
    } catch {
      setSceneAudioPlaying(false);
      if (reason === 'auto') {
        setPendingSceneAudioAutoplay(true);
        setSceneAudioNotice('Trình duyệt đang chặn tự phát. Cần một thao tác bấm để phát âm thanh nền.');
      } else {
        setSceneAudioNotice('Không thể phát âm thanh nền trong trình duyệt hiện tại.');
      }
      return false;
    }
  };

  const toggleSceneAudioPlayback = () => {
    if (!backgroundAudioUrl) return;
    if (sceneAudioPlaying) {
      pauseSceneAudio();
      queueEvent('background_audio_paused', { trigger: backgroundAudioTrigger }, currentSceneId);
      return;
    }
    void tryPlaySceneAudio('manual');
  };

  useEffect(() => {
    if (!didMountSceneRef.current) {
      didMountSceneRef.current = true;
      if (storedCheckpoint) {
        queueEvent('resume_from_local', { saved_at: storedCheckpoint.savedAt }, currentSceneId);
      } else {
        queueEvent('scene_entered', { scene_type: currentScene?.type }, currentSceneId);
      }
      return;
    }
    queueEvent('scene_entered', { scene_type: currentScene?.type }, currentSceneId);
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
    sceneEnteredAtRef.current = Date.now();
    setSceneElapsedMs(0);
    setCurrentMediaTime(0);
  }, [currentSceneId]);

  useEffect(() => {
    if (!currentScene) return;
    const hasDelayLayers = getSceneLayers(currentScene).some((layer) => {
      const trigger = normalizeVisibilityTrigger(layer.visibility_rule?.trigger);
      return trigger === 'after_delay';
    });
    if (!hasDelayLayers) return;
    const intervalId = window.setInterval(() => {
      setSceneElapsedMs(Date.now() - sceneEnteredAtRef.current);
    }, 200);
    return () => window.clearInterval(intervalId);
  }, [currentScene]);

  useEffect(() => {
    if (phase !== 'interaction_open' || !videoRef.current) return;
    videoRef.current.pause();
  }, [phase]);

  useEffect(() => {
    setSlideIndex(0);
    setInteractionFeedback(null);
    setInteractionFeedbackImage(null);
    setPendingInteractionTargetSceneId(null);
    setInteractionRequiresRetry(false);
    setHotspotSubtitle(null);
    setPendingAudioInteraction(null);
    setConnectDotsState({ sceneId: currentScene?.id ?? currentSceneId, completedPointIds: [] });

    if (!currentScene) return;
    const sceneInteractions = currentScene.interactions ?? [];

    const primaryQuestion = getPrimarySceneQuestion(currentScene);
    if (primaryQuestion) {
      const primaryIndex = Math.max(
        0,
        sceneInteractions.findIndex((interaction) => interaction === primaryQuestion || interaction.id === primaryQuestion.id),
      );
      const interactionKey = getInteractionKey(primaryQuestion, primaryIndex);
      if (hasHandledInteraction(checkpointRef.current.stateSnapshot, currentScene.id, interactionKey)) {
        setActiveInteraction(null);
        if (getRenderableVideoUrl(currentScene)) {
          setPhase('paused');
          return;
        }
        setPhase(currentScene.id === entrySceneId ? 'intro' : 'scene_active');
        return;
      }
      const hasSceneMediaToWait = Boolean(getRenderableVideoUrl(currentScene) || getAudioUrl(currentScene));
      if (shouldWaitForMediaEnd(currentScene) && !hasCompletedSceneMedia(currentScene, checkpointRef.current.stateSnapshot) && hasSceneMediaToWait) {
        setActiveInteraction(null);
        setPhase(getRenderableVideoUrl(currentScene) ? 'paused' : 'scene_active');
        return;
      }
      setActiveInteraction({ interaction: primaryQuestion, interactionKey });
      setPhase('interaction_open');
      return;
    }

    const onEnterInteraction = sceneInteractions
      .map((interaction, index) => ({ interaction, interactionKey: getInteractionKey(interaction, index) }))
      .find(
        ({ interaction, interactionKey }) =>
          interaction.trigger === 'on_enter'
          && !hasHandledInteraction(checkpointRef.current.stateSnapshot, currentScene.id, interactionKey),
      );

    if (onEnterInteraction) {
      setActiveInteraction(onEnterInteraction);
      setPhase('interaction_open');
      return;
    }

    if (getRenderableVideoUrl(currentScene)) {
      setPhase('paused');
      return;
    }

    setActiveInteraction(null);
    setPhase(currentScene.id === entrySceneId ? 'intro' : 'scene_active');
  }, [currentScene, entrySceneId]);

  useEffect(() => {
    if (!currentScene || !getRenderableVideoUrl(currentScene) || !shouldAutoplayVideo(currentScene)) {
      return;
    }
    const timer = window.setTimeout(() => {
      void videoRef.current?.play().catch(() => {});
    }, 120);
    return () => window.clearTimeout(timer);
  }, [currentScene]);

  useEffect(() => {
    if (!sceneAudioRef.current) return;
    if (!backgroundAudioUrl) {
      pauseSceneAudio();
      sceneAudioRef.current.removeAttribute('src');
      sceneAudioRef.current.load();
      setPendingSceneAudioAutoplay(false);
      setSceneAudioNotice(null);
      return;
    }

    sceneAudioRef.current.src = backgroundAudioUrl;
    sceneAudioRef.current.currentTime = 0;
    setSceneAudioPlaying(false);
    setPendingSceneAudioAutoplay(false);
    setSceneAudioNotice(null);

    if (backgroundAudioTrigger === 'manual') {
      return;
    }

    if (backgroundAudioTrigger === 'on_slide_change' && currentScene?.type !== 'slideshow') {
      void tryPlaySceneAudio('auto');
      return;
    }

    if (backgroundAudioTrigger === 'on_enter' || backgroundAudioTrigger === 'on_slide_change') {
      void tryPlaySceneAudio('auto');
    }
  }, [backgroundAudioTrigger, backgroundAudioUrl, currentScene?.id, currentScene?.type, slideIndex]);

  useEffect(() => {
    if (!pendingSceneAudioAutoplay) return;
    const unlock = () => {
      void tryPlaySceneAudio('auto');
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [pendingSceneAudioAutoplay, backgroundAudioUrl, currentSceneId, slideIndex]);

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
    const finalScoreSummary: ScoreSummary = {
      ...checkpointRef.current.scoreSummary,
      total_score: checkpointRef.current.scoreSummary.score,
      max_score: Math.max(checkpointRef.current.scoreSummary.max_score, maxScore),
      correct_count: checkpointRef.current.scoreSummary.correct,
      wrong_count: checkpointRef.current.scoreSummary.wrong_count,
      completed_scene_count: checkpointRef.current.stateSnapshot.visited_scenes.length,
      branch_history: checkpointRef.current.stateSnapshot.branch_history,
    };
    const payload: PlayerCheckpointPayload = {
      currentSceneId,
      stateSnapshot: {
        ...checkpointRef.current.stateSnapshot,
        derived_score: finalScoreSummary,
      },
      completionPercent: 100,
      scoreSummary: finalScoreSummary,
    };

    setCompletionPercent(100);
    setScoreSummary(finalScoreSummary);
    setPhase('completed');
    removeStoredCheckpoint(autosaveKey);
    queueEvent('book_completed', {
      title,
      completion_percent: 100,
      total_score: finalScoreSummary.total_score,
      wrong_count: finalScoreSummary.wrong_count,
      retry_count: finalScoreSummary.retry_count,
    }, currentSceneId);
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
    if (!hasCompletedSceneMedia(currentScene)) {
      setSceneAudioNotice('Em cần xem hoặc nghe xong nội dung hiện tại trước khi sang trang tiếp theo.');
      return;
    }
    const defaultNext = resolveDefaultNext(currentScene, manifest.scenes);
    if (defaultNext) {
      transitionToScene(defaultNext, 'default_next');
      return;
    }
    void finalizeBook();
  };

  const handleVideoEnded = () => {
    if (!currentScene) return;
    updateSnapshot((previous) => markSceneVideoCompleted(
      updateMediaProgress(previous, currentScene.id, {
        current_time: videoRef.current?.duration ?? videoRef.current?.currentTime ?? 0,
        ended_at: new Date().toISOString(),
      }),
      currentScene.id,
    ));
    setPhase('scene_active');
    queueEvent('video_ended', { scene_id: currentScene.id }, currentScene.id);
  };

  const handleSceneAudioEnded = () => {
    if (!currentScene) return;
    updateSnapshot((previous) => markSceneAudioCompleted(
      updateMediaProgress(previous, currentScene.id, {
        ended_at: new Date().toISOString(),
      }),
      currentScene.id,
    ));
    if (shouldWaitForMediaEnd(currentScene) && !getRenderableVideoUrl(currentScene)) {
      handleDeferredSceneInteraction();
    }
  };

  const handleDeferredSceneInteraction = () => {
    if (!currentScene) return;
    const primary = getPrimarySceneQuestion(currentScene);
    if (!primary) return;
    const primaryIndex = Math.max(
      0,
      (currentScene.interactions ?? []).findIndex((interaction) => interaction === primary || interaction.id === primary.id),
    );
    const interactionKey = getInteractionKey(primary, primaryIndex);
    if (hasHandledInteraction(checkpointRef.current.stateSnapshot, currentScene.id, interactionKey)) {
      setPhase('scene_active');
      return;
    }
    if (getRenderableVideoUrl(currentScene)) {
      updateSnapshot((previous) => markSceneVideoCompleted(previous, currentScene.id));
    }
    if (getAudioUrl(currentScene)) {
      updateSnapshot((previous) => markSceneAudioCompleted(previous, currentScene.id));
    }
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
    const nextAttempted = scoreSummary.attempted + 1;
    const nextCorrect = scoreSummary.correct + (correct ? 1 : 0);
    const nextScoreValue = scoreSummary.score + (choice.score_delta ?? (correct ? 1 : 0));
    const nextScore: ScoreSummary = {
      ...scoreSummary,
      attempted: nextAttempted,
      correct: nextCorrect,
      score: nextScoreValue,
      total_score: nextScoreValue,
      max_score: Math.max(scoreSummary.max_score, maxScore),
      correct_count: nextCorrect,
      wrong_count: scoreSummary.wrong_count + (correct ? 0 : 1),
      completed_scene_count: new Set([...stateSnapshot.visited_scenes, currentSceneId]).size,
      branch_history: stateSnapshot.branch_history,
    };

    updateSnapshot((previous) => {
      const withResult = appendInteractionResult(previous, {
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
    queueEvent('choice_selected', {
      interaction_id: interactionKey,
      choice_id: choice.id,
      correct,
    }, currentSceneId);
    queueEvent(correct ? 'answer_correct' : 'answer_wrong', {
      interaction_id: interactionKey,
      choice_id: choice.id,
      score_delta: choice.score_delta ?? (correct ? 1 : 0),
    }, currentSceneId);

    if (!correct && choice.retry) {
      setInteractionRequiresRetry(true);
      setPendingInteractionTargetSceneId(null);
      return;
    }

    setInteractionRequiresRetry(false);
    const defaultNext = currentScene ? resolveDefaultNext(currentScene, manifest.scenes) : undefined;
    const targetSceneId = choice.target_scene_id
      || interaction.target_scene_id
      || ((currentScene?.type === 'quiz' || currentScene?.type === 'branching' || currentScene?.type === 'media') ? defaultNext : undefined);
    setPendingInteractionTargetSceneId(targetSceneId ?? null);
  };

  const handleRetryInteraction = () => {
    const retryItem = {
      scene_id: currentSceneId,
      interaction_id: activeInteraction?.interactionKey,
      at: new Date().toISOString(),
    };
    const nextScore = {
      ...scoreSummary,
      retry_count: scoreSummary.retry_count + 1,
    };
    setScoreSummary(nextScore);
    updateSnapshot((previous) => {
      const withRetryHistory = appendRetryHistory(previous, retryItem);
      return {
        ...withRetryHistory,
        derived_score: nextScore,
      };
    });
    setInteractionFeedback(null);
    setInteractionFeedbackImage(null);
    setPendingInteractionTargetSceneId(null);
    setInteractionRequiresRetry(false);
    setPhase('interaction_open');
    queueEvent('retry_clicked', retryItem, currentSceneId);
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
    if (videoRef.current && !videoRef.current.ended) {
      void videoRef.current.play().catch(() => {});
    }
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
    recordSceneProgressValue(currentSceneId, 'clicked_targets', interaction.id ?? interactionKey);
    queueEvent('hotspot_clicked', { interaction_id: interaction.id ?? interactionKey }, currentSceneId);

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
    if (!videoRef.current) {
      return;
    }
    setCurrentMediaTime(videoRef.current.currentTime ?? 0);
    if (!currentScene || currentScene.type !== 'interactive_video' || activeInteraction) {
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

  const handleLayerAction = (layer: InteractiveLayer) => {
    recordSceneProgressValue(currentSceneId, 'clicked_targets', layer.id);
    queueEvent('layer_clicked', { layer_id: layer.id, action_type: layer.action?.type }, currentSceneId);

    if (layer.action?.type === 'play_audio') {
      playEffectAudio(layer.action.audio_url);
      return;
    }

    if (layer.action?.type === 'open_interaction' && layer.action.interaction_id) {
      const targetInteraction = findSceneInteraction(layer.action.interaction_id);
      if (targetInteraction) {
        handleOpenInteraction(targetInteraction.interaction, targetInteraction.interactionKey);
      }
      return;
    }

    if (layer.action?.type === 'reveal_layer' && layer.action.target_layer_id) {
      revealLayer(currentSceneId, layer.action.target_layer_id);
      queueEvent('layer_revealed', {
        layer_id: layer.id,
        target_layer_id: layer.action.target_layer_id,
      }, currentSceneId);
      return;
    }

    const targetSceneId = layer.action?.target_scene_id || layer.action?.scene_id;
    if (targetSceneId) {
      transitionToScene(targetSceneId, 'layer_action', { layer_id: layer.id });
    }
  };

  const handleConnectDotClick = (point: ConnectTheDotsPoint) => {
    if (!currentScene || currentScene.type !== 'connect_the_dots') return;
    const points = getConnectDotsPoints(currentScene);
    const currentProgress = connectDotsState.sceneId === currentScene.id
      ? connectDotsState.completedPointIds
      : [];
    const expectedPoint = points[currentProgress.length];
    const timestamp = new Date().toISOString();

    queueEvent('connect_dot_clicked', {
      point_id: point.id,
      expected_point_id: expectedPoint?.id,
      selected_order: point.order,
      expected_order: expectedPoint?.order,
      at: timestamp,
    }, currentScene.id);

    if (!expectedPoint || point.id !== expectedPoint.id) {
      const wrongPenalty = getNumberFromContent(currentScene, 'wrong_penalty', 0);
      const wrongBehavior = String(getContentRecord(currentScene).wrong_behavior ?? 'stay_current_point');
      const nextScoreValue = scoreSummary.score - wrongPenalty;
      const nextScore: ScoreSummary = {
        ...scoreSummary,
        attempted: scoreSummary.attempted + 1,
        score: nextScoreValue,
        total_score: nextScoreValue,
        max_score: Math.max(scoreSummary.max_score, maxScore),
        wrong_count: scoreSummary.wrong_count + 1,
      };
      setScoreSummary(nextScore);
      updateSnapshot((previous) => ({
        ...appendInteractionResult(previous, {
          scene_id: currentScene.id,
          type: 'connect_the_dots',
          selected_point_id: point.id,
          expected_point_id: expectedPoint?.id,
          is_correct: false,
          at: timestamp,
        }),
        derived_score: nextScore,
      }));
      setConnectDotsState({
        sceneId: currentScene.id,
        completedPointIds: wrongBehavior === 'restart_from_beginning' || wrongBehavior === 'restart_current_sequence'
          ? []
          : currentProgress,
        feedback: wrongBehavior === 'restart_from_beginning'
          ? 'Sai thứ tự. Em cần nối lại từ đầu.'
          : 'Chưa đúng thứ tự. Hãy thử lại điểm đang sáng.',
      });
      queueEvent('connect_dot_wrong_order', {
        selected_point_id: point.id,
        expected_point_id: expectedPoint?.id,
        scene_id: currentScene.id,
        wrong_behavior: wrongBehavior,
        at: timestamp,
      }, currentScene.id);
      queueEvent('answer_wrong', {
        interaction_id: 'connect_the_dots',
        selected_point_id: point.id,
        expected_point_id: expectedPoint?.id,
      }, currentScene.id);
      return;
    }

    const nextCompleted = [...currentProgress, point.id];
    const completed = nextCompleted.length >= points.length;
    setConnectDotsState({
      sceneId: currentScene.id,
      completedPointIds: nextCompleted,
      feedback: completed ? 'Da noi dung tat ca cac diem.' : 'Dung roi, tiep tuc diem ke tiep.',
    });

    if (!completed) return;

    const scoreDelta = getNumberFromContent(currentScene, 'complete_score', 1);
    const nextScoreValue = scoreSummary.score + scoreDelta;
    const nextScore: ScoreSummary = {
      ...scoreSummary,
      attempted: scoreSummary.attempted + 1,
      correct: scoreSummary.correct + 1,
      score: nextScoreValue,
      total_score: nextScoreValue,
      max_score: Math.max(scoreSummary.max_score, maxScore),
      correct_count: scoreSummary.correct_count + 1,
      completed_scene_count: new Set([...stateSnapshot.visited_scenes, currentScene.id]).size,
      branch_history: stateSnapshot.branch_history,
    };
    setScoreSummary(nextScore);
    updateSnapshot((previous) => ({
      ...appendInteractionResult(previous, {
        scene_id: currentScene.id,
        type: 'connect_the_dots',
        completed_point_ids: nextCompleted,
        is_correct: true,
        at: timestamp,
      }),
      derived_score: nextScore,
    }));
    queueEvent('answer_correct', {
      interaction_id: 'connect_the_dots',
      completed_point_ids: nextCompleted,
      score_delta: scoreDelta,
    }, currentScene.id);

    const successTarget = getConnectDotsSuccessTarget(currentScene);
    if (successTarget) {
      window.setTimeout(() => transitionToScene(successTarget, 'connect_the_dots_completed'), 500);
    }
  };

  const recordSceneProgressValue = (sceneId: string, key: string, value: string) => {
    updateSnapshot((previous) => {
      const sceneProgress = previous.media_progress[sceneId] ?? {};
      const currentValues = Array.isArray(sceneProgress[key])
        ? sceneProgress[key].filter((item): item is string => typeof item === 'string')
        : [];
      if (currentValues.includes(value)) {
        return previous;
      }
      return updateMediaProgress(previous, sceneId, {
        [key]: [...currentValues, value],
      });
    });
  };

  const revealLayer = (sceneId: string, layerId: string) => {
    recordSceneProgressValue(sceneId, 'manual_visible_layer_ids', layerId);
  };

  const isLayerVisible = (scene: InteractiveScene, layer: InteractiveLayer) => {
    const rule = layer.visibility_rule;
    if (!rule) return true;

    const trigger = normalizeVisibilityTrigger(rule.trigger);
    const sceneProgress = stateSnapshot.media_progress[scene.id] ?? {};
    const clickedTargets = Array.isArray(sceneProgress.clicked_targets)
      ? sceneProgress.clicked_targets.filter((item): item is string => typeof item === 'string')
      : [];
    const revealedLayerIds = Array.isArray(sceneProgress.manual_visible_layer_ids)
      ? sceneProgress.manual_visible_layer_ids.filter((item): item is string => typeof item === 'string')
      : [];

    switch (trigger) {
      case 'always':
        return true;
      case 'after_delay':
        return sceneElapsedMs >= Number(rule.delay_seconds ?? rule.timecode ?? 0) * 1000;
      case 'after_media_time':
        return currentMediaTime >= Number(rule.timecode ?? 0);
      case 'after_media_end':
        return hasCompletedSceneMedia(scene);
      case 'after_click': {
        const targetId = rule.layer_id || rule.interaction_id;
        return targetId ? clickedTargets.includes(targetId) : clickedTargets.length > 0;
      }
      case 'after_choice':
        return stateSnapshot.interaction_results.some((item) => (
          item.scene_id === scene.id
          && (typeof rule.choice_id !== 'string' || !rule.choice_id || item.choice_id === rule.choice_id)
        ));
      case 'after_event':
        return runtimeEvents.some((item) => (
          item.scene_id === scene.id
          && item.event_type === rule.event_type
        ));
      case 'on_scene_state': {
        if (!rule.state_key) return false;
        const actualValue = sceneProgress[rule.state_key] ?? stateSnapshot[rule.state_key];
        if (typeof rule.expected_value === 'undefined') {
          return Boolean(actualValue);
        }
        return JSON.stringify(actualValue) === JSON.stringify(rule.expected_value);
      }
      case 'manual':
        return revealedLayerIds.includes(layer.id);
      default:
        return true;
    }
  };

  const renderLayerOverlay = (scene: InteractiveScene, theme: 'light' | 'dark' = 'light') => {
    const layers = getSceneLayers(scene);
    if (layers.length === 0) return null;
    return (
      <div className="pointer-events-none absolute inset-0">
        {layers
          .slice()
          .sort((left, right) => (left.z_index ?? 0) - (right.z_index ?? 0))
          .filter((layer) => isLayerVisible(scene, layer))
          .map((layer) => {
            const isButton = layer.type === 'button';
            const content = layer.type === 'image' && layer.url
              ? <img src={layer.url} alt={layer.text || layer.id} className="h-full w-full object-cover" />
              : <span>{layer.text || layer.type}</span>;
            return (
              <button
                key={layer.id}
                type="button"
                disabled={!isButton}
                onClick={() => isButton && handleLayerAction(layer)}
                className={`pointer-events-auto absolute flex items-center justify-center overflow-hidden border px-3 py-2 text-center text-sm font-semibold shadow-lg ${
                  isButton
                    ? 'border-sky-300 bg-sky-500 text-white hover:bg-sky-600'
                    : theme === 'dark'
                      ? 'border-white/30 bg-black/45 text-white'
                      : 'border-white/80 bg-white/90 text-slate-900'
                }`}
                style={{
                  left: `${layer.x}%`,
                  top: `${layer.y}%`,
                  width: `${layer.width}%`,
                  height: `${layer.height}%`,
                  zIndex: layer.z_index ?? 1,
                }}
              >
                {content}
              </button>
            );
          })}
      </div>
    );
  };

  const renderSceneVisual = () => {
    if (!currentScene) return null;

    const sceneText = getVisibleSceneText(currentScene);
    const feedbackTitle = interactionRequiresRetry ? 'Chưa đúng' : 'Chính xác';
    const feedbackToneClass = interactionRequiresRetry
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700';
    const feedbackVisual = hasInteractionFeedback ? (
      <div className="space-y-4">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
          {interactionFeedbackImage ? (
            <img
              src={interactionFeedbackImage}
              alt={interactionRequiresRetry ? 'Phản hồi sai' : 'Phản hồi đúng'}
              className="h-[420px] w-full object-cover"
            />
          ) : (
            <div className={`flex h-[420px] items-center justify-center ${feedbackToneClass}`}>
              <div className="text-center">
                {interactionRequiresRetry ? (
                  <AlertCircle className="mx-auto h-16 w-16" />
                ) : (
                  <CheckCircle2 className="mx-auto h-16 w-16" />
                )}
                <p className="mt-4 text-2xl font-bold">{feedbackTitle}</p>
              </div>
            </div>
          )}
        </div>
        {interactionFeedback && (
          <div className={`rounded-2xl border px-4 py-4 text-sm leading-6 ${feedbackToneClass}`}>
            {interactionFeedback}
          </div>
        )}
      </div>
    ) : null;

    if (feedbackVisual) {
      return feedbackVisual;
    }

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
              const cardTitle = getOptionalText(card.title);
              const cardDescription = getOptionalText(card.description);
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => transitionToScene(card.target_scene_id, 'timeline_card_click', { card_id: card.id })}
                  aria-label={cardTitle ?? `Mở nội dung ${card.order_index}`}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
                >
                  {card.image_url ? (
                    <img src={card.image_url} alt={cardTitle || 'Ảnh tổng quan'} className="h-48 w-full object-cover" />
                  ) : (
                    <div className="flex h-48 items-center justify-center bg-slate-100 text-slate-400">
                      Chưa có ảnh tổng quan
                    </div>
                  )}
                  <div className="space-y-2 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      {cardTitle && <h3 className="text-base font-semibold text-slate-900">{cardTitle}</h3>}
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${visited ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {visited ? 'Đã mở' : 'Chưa mở'}
                      </span>
                    </div>
                    {cardDescription && (
                      <p className="text-sm leading-6 text-slate-600">{cardDescription}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
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
        </div>
      );
    }

    if (currentScene.type === 'branching' || currentScene.type === 'quiz' || currentScene.type === 'media') {
      const videoUrl = getRenderableVideoUrl(currentScene);
      const previewImage = getRenderableImageUrl(currentScene);
      const waitForMediaEnd = shouldWaitForMediaEnd(currentScene) && !hasCompletedSceneMedia(currentScene);

      return (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
            {videoUrl ? (
              <video
                ref={videoRef}
                controls
                className="h-[420px] w-full bg-slate-950 object-cover"
                poster={previewImage}
                src={videoUrl}
                preload="metadata"
                autoPlay={shouldAutoplayVideo(currentScene) || waitForMediaEnd}
                playsInline
                onTimeUpdate={handleVideoTimeUpdate}
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
                className="h-[420px] w-full object-cover"
              />
            ) : (
              <div className="flex h-[420px] items-center justify-center text-slate-400">
                Cảnh này chưa có tư liệu chính.
              </div>
            )}
            {renderLayerOverlay(currentScene)}
          </div>

          {sceneText && (
            <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
              {sceneText}
            </div>
          )}

        </div>
      );
    }

    if (currentScene.type === 'connect_the_dots') {
      const background = getConnectDotsBackground(currentScene);
      const points = getConnectDotsPoints(currentScene);
      const currentProgress = connectDotsState.sceneId === currentScene.id ? connectDotsState.completedPointIds : [];
      const nextPoint = points[currentProgress.length];
      return (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
            {background ? (
              <img src={background} alt={currentScene.title || 'Connect dots'} className="h-[420px] w-full object-cover" />
            ) : (
              <div className="flex h-[420px] items-center justify-center text-slate-400">
                Chưa có hình nền cho scene nối điểm.
              </div>
            )}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline
                points={points
                  .filter((point) => currentProgress.includes(point.id))
                  .map((point) => `${point.x},${point.y}`)
                  .join(' ')}
                fill="none"
                stroke="rgb(14 165 233)"
                strokeWidth="1.8"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {points.map((point) => {
              const completed = currentProgress.includes(point.id);
              const active = nextPoint?.id === point.id;
              return (
                <button
                  key={point.id}
                  type="button"
                  onClick={() => handleConnectDotClick(point)}
                  className={`absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-sm font-bold shadow-lg transition ${
                    completed
                      ? 'border-emerald-100 bg-emerald-500 text-white'
                      : active
                        ? 'border-white bg-sky-500 text-white ring-4 ring-sky-200'
                        : 'border-white bg-slate-700/70 text-white'
                  }`}
                  style={{ left: `${point.x}%`, top: `${point.y}%` }}
                >
                  {point.label || point.order}
                </button>
              );
            })}
          </div>
          {connectDotsState.feedback && connectDotsState.sceneId === currentScene.id && (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              {connectDotsState.feedback}
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

  const renderSceneAudioControl = (theme: 'light' | 'dark' = 'light') => {
    if (!backgroundAudioUrl) return null;
    const triggerLabel = backgroundAudioTrigger === 'manual'
      ? 'Phát khi người học bấm'
      : backgroundAudioTrigger === 'on_slide_change'
        ? 'Phát khi slide thay đổi'
        : 'Tự phát khi mở nội dung';
    const baseClass = theme === 'dark'
      ? 'border-white/20 bg-black/40 text-white'
      : 'border-slate-200 bg-white text-slate-900';
    const noteClass = theme === 'dark'
      ? 'text-slate-200'
      : 'text-slate-500';

    return (
      <div className={`rounded-2xl border px-4 py-3 ${baseClass}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Volume2 className="h-4 w-4" />
              Âm thanh nền
            </div>
            <p className={`mt-1 text-xs ${noteClass}`}>{triggerLabel}</p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={toggleSceneAudioPlayback}>
            {sceneAudioPlaying ? (
              <>
                <PauseCircle className="mr-1.5 h-4 w-4" />
                Tạm dừng
              </>
            ) : (
              <>
                <PlayCircle className="mr-1.5 h-4 w-4" />
                Phát
              </>
            )}
          </Button>
        </div>
        {sceneAudioNotice && (
          <p className={`mt-2 text-xs ${noteClass}`}>{sceneAudioNotice}</p>
        )}
      </div>
    );
  };

  const renderInteractionPanel = () => {
    const sceneType = currentScene ? getSceneTypeLabel(currentScene.type) : 'Cảnh';
    if (!currentScene) return null;
    const sceneTitle = getVisibleSceneTitle(currentScene);
    const sceneText = getVisibleSceneText(currentScene);
    if (phase === 'completed') {
      const completionMessage = getCompletionMessage(scoreSummary, Math.max(scoreSummary.max_score, maxScore));
      return (
        <div className="space-y-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            <div>
              <h3 className="text-lg font-semibold text-emerald-950">Đã hoàn thành sách tương tác</h3>
              <p className="text-sm text-emerald-800">Bạn có thể ở lại để xem lại nội dung.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center md:grid-cols-3">
            <div className="rounded-2xl bg-white px-3 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Tổng điểm</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{scoreSummary.total_score}/{Math.max(scoreSummary.max_score, maxScore)}</p>
            </div>
            <div className="rounded-2xl bg-white px-3 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Thử lại</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{scoreSummary.retry_count}</p>
            </div>
            <div className="rounded-2xl bg-white px-3 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Lỗi sai</p>
              <p className="mt-1 text-2xl font-bold text-red-600">{scoreSummary.wrong_count}</p>
            </div>
            <div className="rounded-2xl bg-white px-3 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Đúng</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{scoreSummary.correct_count}</p>
            </div>
            <div className="rounded-2xl bg-white px-3 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Scene đã xem</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{scoreSummary.completed_scene_count || stateSnapshot.visited_scenes.length}</p>
            </div>
            <div className="rounded-2xl bg-white px-3 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Nhánh</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{stateSnapshot.branch_history.length}</p>
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-sm text-emerald-900">
            {completionMessage}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" onClick={onRestart} className="flex-1" disabled={!onRestart}>
              Thử lại
            </Button>
            <Button type="button" variant="secondary" onClick={() => transitionToScene(entrySceneId, 'review_from_completion')} className="flex-1">
              Về trang tổng quan
            </Button>
          </div>
        </div>
      );
    }

    if (!activeInteraction) {
      const mediaLocked = Boolean((getRenderableVideoUrl(currentScene) || getAudioUrl(currentScene)) && !hasCompletedSceneMedia(currentScene));
      return (
        <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5">
          <div className="space-y-2">
            <div className="inline-flex rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
              {sceneType}
            </div>
            {sceneTitle && <h3 className="text-xl font-semibold text-slate-900">{sceneTitle}</h3>}
            {sceneText && (
              <p className="text-sm leading-6 text-slate-600">
                {sceneText}
              </p>
            )}
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
              <p className="mt-1 text-sm font-medium text-slate-900">{scoreSummary.total_score}/{Math.max(scoreSummary.max_score, maxScore)}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Đồng bộ</p>
              <p className="mt-1 text-sm font-medium text-slate-900">{syncStatus || 'Sẵn sàng'}</p>
            </div>
          </div>
          {renderSceneAudioControl()}
          {mediaLocked && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Em cần xem hoặc nghe xong nội dung hiện tại trước khi sang trang tiếp theo.
            </div>
          )}
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
          <h3 className="text-xl font-semibold text-slate-900">{getOptionalText(interaction.prompt) ?? sceneTitle ?? 'Tương tác'}</h3>
          <p className="text-sm leading-6 text-slate-700">
            {getOptionalText(interaction.data?.subtitle) ?? 'Hãy xử lý tương tác này trước khi tiếp tục luồng học.'}
          </p>
        </div>
        {choices.length > 0 ? (
          <div className="space-y-2">
            {choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className="w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:border-amber-400 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={Boolean(pendingInteractionTargetSceneId) || interactionRequiresRetry}
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
        {interactionRequiresRetry && (
          <Button type="button" variant="secondary" onClick={handleRetryInteraction} className="w-full">
            Thử lại
          </Button>
        )}
        {choices.length > 0 && canContinueInteraction && (
          <Button type="button" variant="secondary" onClick={handleInteractionContinue} className="w-full">
            {pendingInteractionTargetSceneId ? 'Tiếp tục' : 'Đóng tương tác'}
          </Button>
        )}
      </div>
    );
  };

  const renderImmersiveSceneVisual = () => {
    if (!currentScene) return null;
    const sceneTitle = getVisibleSceneTitle(currentScene);
    const sceneText = getVisibleSceneText(currentScene);
    const videoUrl = getRenderableVideoUrl(currentScene);
    const imageUrl = currentScene.type === 'connect_the_dots'
      ? getConnectDotsBackground(currentScene)
      : getRenderableImageUrl(currentScene);
    const feedbackVisual = hasInteractionFeedback ? (
      <div className="absolute inset-0 bg-slate-950">
        {interactionFeedbackImage ? (
          <img
            src={interactionFeedbackImage}
            alt={interactionRequiresRetry ? 'Phản hồi sai' : 'Phản hồi đúng'}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className={`flex h-full w-full items-center justify-center ${
            interactionRequiresRetry ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'
          }`}>
            <div className="text-center">
              {interactionRequiresRetry ? (
                <AlertCircle className="mx-auto h-20 w-20" />
              ) : (
                <CheckCircle2 className="mx-auto h-20 w-20" />
              )}
              <p className="mt-5 text-4xl font-bold">{interactionRequiresRetry ? 'Chưa đúng' : 'Chính xác'}</p>
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/80 to-transparent" />
        {interactionFeedback && (
          <div className="absolute inset-x-4 bottom-24 z-10 mx-auto max-w-3xl rounded-lg bg-black/60 px-5 py-4 text-center text-base text-white">
            {interactionFeedback}
          </div>
        )}
      </div>
    ) : null;

    if (feedbackVisual) {
      return feedbackVisual;
    }

    if (currentScene.type === 'timeline') {
      const cards = getTimelineCards(currentScene);
      const timelineHero = getPrimaryImage(currentScene);
      return (
        <div className="absolute inset-0 bg-slate-950">
          {timelineHero ? (
            <img src={timelineHero} alt={currentScene.title || title} className="h-full w-full object-cover opacity-70" />
          ) : (
            <div className="h-full w-full bg-slate-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/40" />
          <div className="absolute inset-x-4 bottom-24 z-10 mx-auto max-w-5xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-sky-200">{title}</p>
            {sceneTitle && <h2 className="mt-2 text-3xl font-bold text-white">{sceneTitle}</h2>}
            {sceneText && <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-100">{sceneText}</p>}
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {cards.map((card) => {
                const cardTitle = getOptionalText(card.title);
                const cardDescription = getOptionalText(card.description);
                return (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => transitionToScene(card.target_scene_id, 'timeline_card_click', { card_id: card.id })}
                    aria-label={cardTitle ?? `Mở nội dung ${card.order_index}`}
                    className="overflow-hidden rounded-lg border border-white/20 bg-white/90 text-left shadow-lg transition hover:bg-white"
                  >
                    {card.image_url && <img src={card.image_url} alt={cardTitle || 'Ảnh tổng quan'} className="h-28 w-full object-cover" />}
                    {(cardTitle || cardDescription) && (
                      <div className="p-3">
                        {cardTitle && <p className="text-sm font-semibold text-slate-900">{cardTitle}</p>}
                        {cardDescription && <p className="mt-1 line-clamp-2 text-xs text-slate-600">{cardDescription}</p>}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (currentScene.type === 'connect_the_dots') {
      const points = getConnectDotsPoints(currentScene);
      const currentProgress = connectDotsState.sceneId === currentScene.id ? connectDotsState.completedPointIds : [];
      const nextPoint = points[currentProgress.length];
      return (
        <div className="absolute inset-0 bg-slate-950">
          {imageUrl ? (
            <img src={imageUrl} alt={currentScene.title || 'Connect dots'} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400">Chưa có hình nền nối điểm.</div>
          )}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline
              points={points
                .filter((point) => currentProgress.includes(point.id))
                .map((point) => `${point.x},${point.y}`)
                .join(' ')}
              fill="none"
              stroke="rgb(56 189 248)"
              strokeWidth="1.8"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {points.map((point) => {
            const completed = currentProgress.includes(point.id);
            const active = nextPoint?.id === point.id;
            return (
              <button
                key={point.id}
                type="button"
                onClick={() => handleConnectDotClick(point)}
                className={`absolute z-20 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-sm font-bold shadow-xl transition ${
                  completed
                    ? 'border-emerald-100 bg-emerald-500 text-white'
                    : active
                      ? 'border-white bg-sky-500 text-white ring-4 ring-sky-200'
                      : 'border-white/80 bg-slate-900/70 text-white'
                }`}
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
              >
                {point.label || point.order}
              </button>
            );
          })}
          {connectDotsState.feedback && connectDotsState.sceneId === currentScene.id && (
            <div className="absolute bottom-28 left-1/2 z-30 max-w-lg -translate-x-1/2 rounded-lg border border-white/20 bg-black/70 px-4 py-3 text-center text-sm text-white">
              {connectDotsState.feedback}
            </div>
          )}
          {renderLayerOverlay(currentScene, 'dark')}
        </div>
      );
    }

    if (currentScene.type === 'hotspot_audio') {
      const hotspots = (currentScene.interactions ?? [])
        .map((interaction, index) => ({ interaction, interactionKey: getInteractionKey(interaction, index) }))
        .filter(({ interaction }) => interaction.trigger === 'on_click' || interaction.trigger === 'on_choice');
      return (
        <div className="absolute inset-0 bg-slate-950">
          {imageUrl ? (
            <img src={imageUrl} alt={currentScene.title || 'Scene'} className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-400">Chưa có hình nền hotspot.</div>
          )}
          {hotspots.map(({ interaction, interactionKey }) => {
            const position = getHotspotPosition(interaction);
            return (
              <button
                key={interactionKey}
                type="button"
                className="absolute z-20 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/80 bg-sky-500/90 text-white shadow-xl transition hover:scale-105"
                style={{ left: `${position.x}%`, top: `${position.y}%` }}
                onClick={() => handleHotspotClick(interaction, interactionKey)}
              >
                <Volume2 className="h-5 w-5" />
              </button>
            );
          })}
          {hotspotSubtitle && (
            <div className="absolute bottom-28 left-1/2 z-30 max-w-xl -translate-x-1/2 rounded-lg bg-black/70 px-4 py-3 text-center text-sm text-white">
              {hotspotSubtitle}
            </div>
          )}
          {renderLayerOverlay(currentScene, 'dark')}
        </div>
      );
    }

    return (
      <div className="absolute inset-0 bg-slate-950">
        {videoUrl ? (
          <video
            ref={videoRef}
            controls
            className="h-full w-full object-contain"
            poster={imageUrl}
            src={videoUrl}
            preload="metadata"
            autoPlay={shouldAutoplayVideo(currentScene) || shouldWaitForMediaEnd(currentScene)}
            playsInline
            onTimeUpdate={handleVideoTimeUpdate}
            onPlay={() => setPhase('scene_active')}
            onPause={() => { if (phase !== 'interaction_open') setPhase('paused'); }}
            onEnded={() => {
              handleVideoEnded();
              if ((currentScene.type === 'branching' || currentScene.type === 'quiz' || currentScene.type === 'media') && shouldWaitForMediaEnd(currentScene)) {
                handleDeferredSceneInteraction();
              }
            }}
          >
            Trình duyệt của bạn không hỗ trợ video.
          </video>
        ) : imageUrl ? (
          <img src={imageUrl} alt={currentScene.title || 'Scene'} className="h-full w-full object-contain" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-400">
            Scene này chưa có tư liệu chính.
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 to-transparent" />
        {sceneText && !activeInteraction && (
          <div className="absolute bottom-24 left-5 z-10 max-w-2xl rounded-lg bg-black/55 px-4 py-3 text-sm leading-6 text-white">
            {sceneText}
          </div>
        )}
        {renderLayerOverlay(currentScene, 'dark')}
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
  const isOverviewScene = currentScene.id === entrySceneId;
  const nextSceneButtonLabel = isOverviewScene && defaultNext ? 'Bắt đầu đọc sách' : 'Cảnh tiếp theo';
  const currentSceneRequiresMediaCompletion = Boolean(getRenderableVideoUrl(currentScene) || getAudioUrl(currentScene));
  const isBlockedByIncompleteMedia = currentSceneRequiresMediaCompletion && !hasCompletedSceneMedia(currentScene);
  const visitedContentSceneCount = Array.from(new Set(
    stateSnapshot.visited_scenes.filter((sceneId) => {
      const scene = sceneMap.get(sceneId);
      return scene && scene.type !== 'timeline';
    }),
  )).length;
  const totalContentSceneCount = manifest.scenes.filter((scene) => scene.type !== 'timeline').length;
  const canCompleteFromTimeline = currentScene.type !== 'timeline' || visitedContentSceneCount >= totalContentSceneCount;
  const activeInteractionHasChoices = (activeInteraction?.interaction.choices?.length ?? 0) > 0;
  const hasInteractionFeedback = Boolean(interactionFeedback || interactionFeedbackImage);
  const canContinueActiveInteraction = !activeInteraction
    ? false
    : interactionRequiresRetry
      || !activeInteractionHasChoices
      || Boolean(pendingInteractionTargetSceneId)
      || hasInteractionFeedback;
  const activeInteractionButtonLabel = interactionRequiresRetry
    ? 'Thử lại'
    : (pendingInteractionTargetSceneId || hasInteractionFeedback)
      ? 'Tiếp tục'
      : 'Đóng tương tác';

  const handleGoToOverview = () => {
    if (currentScene.id === entrySceneId) return;
    transitionToScene(entrySceneId, 'return_to_overview');
  };

  const renderImmersiveInteractionOverlay = () => {
    if (!activeInteraction || phase === 'completed') return null;
    if (hasInteractionFeedback) return null;

    const { interaction, interactionKey } = activeInteraction;
    const choices = interaction.choices ?? [];
    const prompt = getOptionalText(interaction.prompt) ?? getVisibleSceneTitle(currentScene) ?? 'Tương tác';
    const subtitle = getOptionalText(interaction.data?.subtitle);

    return (
      <div className="pointer-events-none absolute inset-x-4 top-24 bottom-32 z-50 flex justify-center">
        <div className="pointer-events-auto flex w-full max-w-3xl self-end overflow-hidden rounded-lg border border-amber-200 bg-white/95 text-slate-900 shadow-2xl backdrop-blur">
          <div className="max-h-full w-full overflow-y-auto p-4">
          <div className="space-y-2">
            <div className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">Tương tác</div>
            <h3 className="text-xl font-semibold text-slate-950">{prompt}</h3>
            {subtitle && <p className="text-sm leading-6 text-slate-600">{subtitle}</p>}
          </div>
          {choices.length > 0 ? (
            <div className="mt-4 grid gap-2">
              {choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className="w-full rounded-lg border border-amber-200 bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 transition-colors hover:border-amber-400 hover:bg-amber-50"
                  onClick={() => { void handleInteractionChoice(interaction, interactionKey, choice); }}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <Button type="button" onClick={handleInteractionContinue}>
                Tiếp tục
              </Button>
            </div>
          )}
          </div>
        </div>
      </div>
    );
  };

  if (immersive) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 text-white">
        <div className="relative h-full w-full overflow-hidden">
          {renderImmersiveSceneVisual()}

          <header className="absolute inset-x-0 top-0 z-40 flex items-start justify-between gap-4 bg-gradient-to-b from-black/80 to-transparent px-4 py-4">
            <div className="flex min-w-0 items-center gap-2">
              {onExit && (
                <button
                  type="button"
                  onClick={onExit}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-black/35 text-white hover:bg-black/55"
                  aria-label="Thoát"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{title}</p>
                <p className="text-xs text-slate-200">
                  Cảnh {Math.max(sceneIndex + 1, 1)}/{manifest.scenes.length} - {getSceneTypeLabel(currentScene.type)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full bg-white/15 px-3 py-1 font-semibold text-white">{completionPercent}%</span>
              <span className="rounded-full bg-white/15 px-3 py-1 font-semibold text-white">
                {scoreSummary.total_score}/{Math.max(scoreSummary.max_score, maxScore)}
              </span>
              {syncStatus && phase !== 'completed' && (
                <span className="hidden rounded-full bg-white/15 px-3 py-1 text-white md:inline-flex">{syncStatus}</span>
              )}
            </div>
          </header>

          {playerError && (
            <div className="absolute left-1/2 top-24 z-40 w-[min(92vw,640px)] -translate-x-1/2 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              {playerError}
            </div>
          )}

          {renderImmersiveInteractionOverlay()}

          {phase === 'completed' && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/45 px-4 py-20">
              <div className="w-full max-w-2xl">
                {renderInteractionPanel()}
              </div>
            </div>
          )}

          {phase !== 'completed' && (
            <footer className="absolute inset-x-0 bottom-0 z-40 flex flex-col gap-3 bg-gradient-to-t from-black/85 to-transparent px-4 pb-4 pt-12 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                {visibleSceneTitle && <p className="truncate text-lg font-semibold text-white">{visibleSceneTitle}</p>}
                <div className="mt-2 h-1.5 w-64 max-w-[70vw] overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-sky-400 transition-all" style={{ width: `${completionPercent}%` }} />
                </div>
                {backgroundAudioUrl && (
                  <div className="mt-3 max-w-sm">
                    {renderSceneAudioControl('dark')}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button type="button" variant="secondary" onClick={handleBack} disabled={history.length <= 1}>
                  <ArrowLeft className="mr-1.5 h-4 w-4" /> Quay lại
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleGoToOverview}
                  disabled={isOverviewScene}
                >
                  Tổng quan
                </Button>
                {Boolean(getRenderableVideoUrl(currentScene)) && (
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
                <Button
                  type="button"
                  disabled={activeInteraction ? !canContinueActiveInteraction : (isBlockedByIncompleteMedia || (!defaultNext && !canCompleteFromTimeline))}
                  onClick={() => {
                    if (activeInteraction) {
                      if (interactionRequiresRetry) {
                        handleRetryInteraction();
                        return;
                      }
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
                      ? nextSceneButtonLabel
                      : canCompleteFromTimeline
                        ? 'Hoàn thành'
                        : 'Khám phá thêm'}
                  {!activeInteraction && defaultNext && <ArrowRight className="ml-1.5 h-4 w-4" />}
                </Button>
              </div>
            </footer>
          )}
        </div>

        <audio
          ref={sceneAudioRef}
          className="hidden"
          preload="auto"
          onPlay={() => setSceneAudioPlaying(true)}
          onPause={() => setSceneAudioPlaying(false)}
          onEnded={() => {
            setSceneAudioPlaying(false);
            handleSceneAudioEnded();
          }}
        />
        <audio ref={interactionAudioRef} className="hidden" preload="none" onEnded={handleEffectAudioEnded} />
      </div>
    );
  }

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
            {visibleSceneTitle ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CirclePlay className="h-4 w-4" />
                {visibleSceneTitle}
              </div>
            ) : (
              <div />
            )}
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button type="button" variant="secondary" onClick={handleBack} disabled={history.length <= 1}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Quay lại
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleGoToOverview}
                disabled={isOverviewScene}
              >
                Tổng quan
              </Button>
              {Boolean(getRenderableVideoUrl(currentScene)) && (
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
                  disabled={activeInteraction ? !canContinueActiveInteraction : (isBlockedByIncompleteMedia || (!defaultNext && !canCompleteFromTimeline))}
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
                      ? nextSceneButtonLabel
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

      <audio
        ref={sceneAudioRef}
        className="hidden"
        preload="auto"
        onPlay={() => setSceneAudioPlaying(true)}
        onPause={() => setSceneAudioPlaying(false)}
        onEnded={() => {
          setSceneAudioPlaying(false);
          handleSceneAudioEnded();
        }}
      />
      <audio ref={interactionAudioRef} className="hidden" preload="none" onEnded={handleEffectAudioEnded} />
    </div>
  );
}
