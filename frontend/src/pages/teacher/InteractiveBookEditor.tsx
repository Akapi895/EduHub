import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpDown,
  BarChart3,
  Copy,
  Eye,
  GitBranch,
  ImagePlus,
  Info,
  Loader2,
  Plus,
  PlusCircle,
  Rocket,
  Save,
  Trash2,
  UploadCloud,
} from 'lucide-react';

import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import InteractiveBookPlayer from '@/components/interactive-book/InteractiveBookPlayer';
import SceneLayerCanvas from '@/components/interactive-book/SceneLayerCanvas';
import api from '@/services/api';
import { classService } from '@/services/class.service';
import { interactiveBookService } from '@/services/interactive-book.service';
import { useAuthStore } from '@/store/auth.store';
import type {
  Chapter,
  Class,
  InteractiveBookBundle,
  InteractiveBookManifest,
  InteractiveBookReport,
  InteractiveChoice,
  InteractiveInteraction,
  InteractiveLayer,
  InteractiveScene,
  InteractiveSceneType,
} from '@/types';
import { GRADES, SUBJECTS } from '@/utils/constants';
import { validateInteractiveBookFlow } from '@/utils/interactiveBookFlow';

const DEFAULT_MANIFEST = {
  title: 'Sách tương tác mới',
  entry_scene_id: 'timeline',
  scenes: [
    {
      id: 'timeline',
      type: 'timeline',
      title: 'Tổng quan câu chuyện',
      content: {
        text: 'Đây là trang tổng quan. Giáo viên có thể chỉnh từng sự kiện ở cột bên trái, còn thẻ timeline sẽ tự đồng bộ theo thứ tự các sự kiện.',
        image_url: '',
        sync_from_scenes: true,
      },
    },
  ],
  metadata: {
    theme: 'storytelling',
    sync_timeline_cards: true,
  },
} satisfies InteractiveBookManifest;

const DEFAULT_MANIFEST_TEXT = JSON.stringify(DEFAULT_MANIFEST, null, 2);

type SceneMetaVariant = 'blue' | 'purple' | 'mint' | 'yellow' | 'pink' | 'gray';

const SCENE_TYPE_META: Array<{ value: InteractiveSceneType; label: string; variant: SceneMetaVariant }> = [
  { value: 'timeline', label: 'Tổng quan', variant: 'blue' },
  { value: 'media', label: 'Nội dung', variant: 'purple' },
  { value: 'interactive_video', label: 'Video tương tác', variant: 'purple' },
  { value: 'hotspot_audio', label: 'Điểm chạm + âm thanh', variant: 'pink' },
  { value: 'branching', label: 'Rẽ nhánh', variant: 'mint' },
  { value: 'quiz', label: 'Câu hỏi', variant: 'yellow' },
  { value: 'connect_the_dots', label: 'Nối điểm', variant: 'mint' },
  { value: 'slideshow', label: 'Trình chiếu', variant: 'blue' },
];

const SCENE_CREATION_OPTIONS: Array<{ value: InteractiveSceneType; label: string; variant: SceneMetaVariant }> = [
  { value: 'timeline', label: 'Tổng quan', variant: 'blue' },
  { value: 'media', label: 'Nội dung', variant: 'purple' },
  { value: 'connect_the_dots', label: 'Nối điểm', variant: 'mint' },
  { value: 'slideshow', label: 'Trình chiếu', variant: 'blue' },
];

interface FormState {
  title: string;
  description: string;
  subject: string;
  grade: string;
  thumbnail_url: string;
  estimated_duration: string;
  is_system: boolean;
}

type AssetTargetKey =
  | 'timeline_image'
  | 'scene_image'
  | 'connect_dots_background'
  | 'slideshow_image'
  | 'video_url'
  | 'poster_url'
  | 'background_audio'
  | 'hotspot_audio';

interface UploadedAssetItem {
  url: string;
  name: string;
  kind: 'image' | 'video' | 'audio' | 'file';
}

function createSceneId(sceneType: InteractiveSceneType, existingIds: Set<string>): string {
  const prefix = sceneType === 'timeline' ? 'timeline' : `scene-${sceneType.replace(/_/g, '-')}`;
  let nextIndex = 1;
  let candidate = prefix;
  while (existingIds.has(candidate)) {
    candidate = `${prefix}-${nextIndex}`;
    nextIndex += 1;
  }
  return candidate;
}

function createDefaultScene(sceneType: InteractiveSceneType, existingIds: Set<string>): InteractiveScene {
  const id = createSceneId(sceneType, existingIds);
  const titleByType: Record<InteractiveSceneType, string> = {
    timeline: 'Tổng quan câu chuyện',
    media: 'Nội dung mới',
    interactive_video: 'Video tương tác mới',
    hotspot_audio: 'Điểm chạm và âm thanh mới',
    branching: 'Cảnh rẽ nhánh mới',
    quiz: 'Câu hỏi mới',
    connect_the_dots: 'Nối điểm mới',
    slideshow: 'Trình chiếu mới',
    mini_game: 'Mini game mới',
    vr_scene: 'Cảnh VR mới',
  };

  switch (sceneType) {
    case 'timeline':
      return {
        id,
        type: 'timeline',
        title: titleByType.timeline,
        content: {
          text: 'Trang tổng quan để dẫn người học vào từng sự kiện.',
          image_url: '',
          background_audio_trigger: 'on_enter',
          sync_from_scenes: true,
        },
      };
    case 'media':
      return {
        id,
        type: 'media',
        title: titleByType.media,
        content: {
          text: 'Mô tả ngắn cho nội dung này.',
          media_kind: 'image',
          image_url: '',
          video_url: '',
          poster_url: '',
          background_audio_url: '',
          background_audio_trigger: 'on_enter',
          question_enabled: false,
        },
        interactions: [],
      };
    case 'interactive_video':
      return {
        id,
        type: 'interactive_video',
        title: titleByType.interactive_video,
        content: {
          text: 'Mô tả ngắn cho cảnh video này.',
          video_url: '',
          poster_url: '',
          autoplay: false,
        },
      };
    case 'hotspot_audio':
      return {
        id,
        type: 'hotspot_audio',
        title: titleByType.hotspot_audio,
        content: {
          text: 'Người học bấm vào điểm chạm để nghe lời thoại rồi trả lời câu hỏi.',
          image_url: '',
          background_audio_url: '',
        },
        interactions: [
          {
            id: `${id}-hotspot`,
            type: 'hotspot',
            trigger: 'on_click',
            prompt: 'Bấm vào điểm chạm để nghe lời thoại',
            data: {
              x: 50,
              y: 50,
              subtitle: 'Sau khi âm thanh kết thúc, câu hỏi sẽ hiện ra.',
              audio_url: '',
              show_after_audio: true,
              follow_up_interaction_id: `${id}-quiz`,
            },
          },
          {
            id: `${id}-quiz`,
            type: 'multiple_choice',
            trigger: 'on_complete',
            prompt: 'Câu hỏi sau khi nghe xong âm thanh',
            choices: [
              { id: `${id}-choice-1`, label: 'Lựa chọn 1', is_correct: false, retry: true, feedback: 'Chưa đúng, hãy thử lại.' },
              { id: `${id}-choice-2`, label: 'Lựa chọn 2', is_correct: true, score_delta: 1, feedback: 'Chính xác.' },
            ],
          },
        ],
      };
    case 'branching':
      return {
        id,
        type: 'branching',
        title: titleByType.branching,
        content: {
          text: 'Đưa ra các hướng lựa chọn để người học quyết định.',
          image_url: '',
          background_audio_url: '',
        },
        interactions: [
          {
            id: `${id}-branch`,
            type: 'branching_prompt',
            trigger: 'on_enter',
            prompt: 'Người học sẽ chọn hướng nào?',
            choices: [
              { id: `${id}-choice-1`, label: 'Lựa chọn 1', is_correct: false, retry: true, feedback: 'Chưa phù hợp, hãy cân nhắc lại.' },
              { id: `${id}-choice-2`, label: 'Lựa chọn 2', is_correct: true, score_delta: 1, feedback: 'Lựa chọn hợp lý.' },
            ],
          },
        ],
      };
    case 'quiz':
      return {
        id,
        type: 'quiz',
        title: titleByType.quiz,
        content: {
          text: 'Câu hỏi để củng cố nội dung vừa học.',
          image_url: '',
          background_audio_url: '',
        },
        interactions: [
          {
            id: `${id}-quiz`,
            type: 'quiz',
            trigger: 'on_enter',
            prompt: 'Nhập câu hỏi cho cảnh này',
            choices: [
              { id: `${id}-choice-1`, label: 'Đáp án 1', is_correct: false, retry: true, feedback: 'Chưa đúng.' },
              { id: `${id}-choice-2`, label: 'Đáp án 2', is_correct: true, score_delta: 1, feedback: 'Chính xác.' },
            ],
          },
        ],
      };
    case 'slideshow':
      return {
        id,
        type: 'slideshow',
        title: titleByType.slideshow,
        content: {
          text: 'Cảnh này dùng để trình chiếu một hoặc nhiều hình ảnh.',
          image_url: '',
          background_audio_url: '',
          background_audio_trigger: 'on_enter',
          images: [],
        },
      };
    case 'connect_the_dots':
      return {
        id,
        type: 'connect_the_dots',
        title: titleByType.connect_the_dots,
        content: {
          text: 'Học sinh nối các điểm theo đúng thứ tự để mở nhánh tiếp theo.',
          image_url: '',
          background_image_url: '',
          points: [
            { id: `${id}-point-1`, label: '1', x: 25, y: 50, order: 1 },
            { id: `${id}-point-2`, label: '2', x: 50, y: 35, order: 2 },
            { id: `${id}-point-3`, label: '3', x: 75, y: 55, order: 3 },
          ],
          success_target_scene_id: '',
          wrong_behavior: 'stay_current_point',
          complete_score: 1,
          wrong_penalty: 0,
        },
      };
    case 'mini_game':
      return {
        id,
        type: 'mini_game',
        title: titleByType.mini_game,
        content: {
          text: 'Cảnh mini game mở rộng.',
          image_url: '',
        },
      };
    case 'vr_scene':
      return {
        id,
        type: 'vr_scene',
        title: titleByType.vr_scene,
        content: {
          text: 'Cảnh thực tế ảo hoặc không gian 360 độ.',
          image_url: '',
        },
      };
    default:
      return {
        id,
        type: sceneType,
        title: 'Cảnh mới',
        content: { text: '' },
      };
  }
}

function getImplicitNextSceneId(manifest: InteractiveBookManifest, sceneId: string): string {
  const currentIndex = manifest.scenes.findIndex((scene) => scene.id === sceneId);
  if (currentIndex < 0) return '';
  return manifest.scenes[currentIndex + 1]?.id ?? '';
}

function getDisplayFileName(url: string): string {
  try {
    const normalized = url.split('?')[0];
    const name = normalized.split('/').filter(Boolean).pop();
    return name ? decodeURIComponent(name) : 'Tệp đã tải lên';
  } catch {
    return 'Tệp đã tải lên';
  }
}

function getAssetKindFromFile(file: File): UploadedAssetItem['kind'] {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'file';
}

function isManifestCandidate(value: unknown): value is InteractiveBookManifest {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.entry_scene_id === 'string' && Array.isArray(record.scenes);
}

function cloneManifest(manifest: InteractiveBookManifest): InteractiveBookManifest {
  return JSON.parse(JSON.stringify(manifest)) as InteractiveBookManifest;
}

function ensureContentRecord(scene: InteractiveScene): Record<string, unknown> {
  if (!scene.content || typeof scene.content !== 'object' || Array.isArray(scene.content)) {
    scene.content = typeof scene.content === 'string' ? { text: scene.content } : {};
  }
  return scene.content as Record<string, unknown>;
}

function ensureInteractions(scene: InteractiveScene): InteractiveInteraction[] {
  if (!Array.isArray(scene.interactions)) {
    scene.interactions = [];
  }
  return scene.interactions;
}

function getSceneLayers(scene: InteractiveScene): InteractiveLayer[] {
  const content = ensureContentRecord(scene);
  return Array.isArray(content.layers)
    ? content.layers.filter((item): item is InteractiveLayer => Boolean(item) && typeof item === 'object' && typeof (item as InteractiveLayer).id === 'string')
    : [];
}

function setSceneLayers(scene: InteractiveScene, layers: InteractiveLayer[]) {
  ensureContentRecord(scene).layers = layers;
}

function getConnectDotsPoints(scene: InteractiveScene) {
  const content = ensureContentRecord(scene);
  return Array.isArray(content.points)
    ? content.points
      .filter((item): item is { id: string; label?: string; x: number; y: number; order: number } =>
        Boolean(item) && typeof item === 'object' && typeof (item as { id?: unknown }).id === 'string',
      )
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

function createDefaultLayer(type: InteractiveLayer['type'], index: number): InteractiveLayer {
  const base = {
    id: `layer-${type}-${Date.now()}-${index + 1}`,
    type,
    x: 12 + index * 4,
    y: 12 + index * 4,
    width: type === 'button' ? 22 : type === 'image' ? 24 : 30,
    height: type === 'button' ? 10 : type === 'image' ? 20 : 14,
    z_index: index + 1,
  };

  if (type === 'button') {
    return {
      ...base,
      text: 'Đi tiếp',
      action: { type: 'go_to_scene', target_scene_id: '' },
      visibility_rule: { trigger: 'always' },
    };
  }

  return {
    ...base,
    text: type === 'text' ? 'Nhập chữ trên canvas' : type === 'image' ? 'Ảnh overlay' : type,
    visibility_rule: { trigger: 'always' },
  };
}

function summarizeVisibilityRule(layer: InteractiveLayer): string {
  const rule = layer.visibility_rule;
  if (!rule) return 'Hiện ngay';
  switch (rule.trigger) {
    case 'always':
    case 'on_scene_enter':
      return 'Hiện ngay';
    case 'after_delay':
    case 'after_time':
      return `Hiện sau ${Number(rule.delay_seconds ?? rule.timecode ?? 0)} giây`;
    case 'after_media_time':
      return `Hiện khi media tới giây ${Number(rule.timecode ?? 0)}`;
    case 'after_media_end':
      return 'Hiện sau khi media kết thúc';
    case 'after_click':
      return rule.interaction_id || rule.layer_id
        ? `Hiện sau click ${rule.interaction_id ?? rule.layer_id}`
        : 'Hiện sau khi có click trong scene';
    case 'after_choice':
      return rule.choice_id ? `Hiện sau lựa chọn ${rule.choice_id}` : 'Hiện sau khi học sinh chọn đáp án';
    case 'after_event':
      return rule.event_type ? `Hiện sau event ${rule.event_type}` : 'Hiện sau event';
    case 'manual':
      return 'Chỉ hiện khi button reveal gọi tới';
    case 'on_scene_state':
      return rule.state_key ? `Hiện khi state ${rule.state_key} khớp điều kiện` : 'Hiện theo scene state';
    default:
      return 'Hiện ngay';
  }
}

function getSceneText(scene: InteractiveScene): string {
  if (typeof scene.content === 'string') return scene.content;
  if (!scene.content || typeof scene.content !== 'object' || Array.isArray(scene.content)) return '';
  const content = scene.content as Record<string, unknown>;
  return typeof content.text === 'string' ? content.text : '';
}

function getStringFromContent(scene: InteractiveScene, key: string): string {
  if (!scene.content || typeof scene.content !== 'object' || Array.isArray(scene.content)) return '';
  const content = scene.content as Record<string, unknown>;
  return typeof content[key] === 'string' ? String(content[key]) : '';
}

function getStringListFromContent(scene: InteractiveScene, key: string): string[] {
  if (!scene.content || typeof scene.content !== 'object' || Array.isArray(scene.content)) return [];
  const content = scene.content as Record<string, unknown>;
  return Array.isArray(content[key]) ? content[key].filter((item): item is string => typeof item === 'string') : [];
}

function getBooleanFromContent(scene: InteractiveScene, key: string): boolean {
  if (!scene.content || typeof scene.content !== 'object' || Array.isArray(scene.content)) return false;
  const content = scene.content as Record<string, unknown>;
  return Boolean(content[key]);
}

type BackgroundAudioTrigger = 'on_enter' | 'on_slide_change' | 'manual';

function getBackgroundAudioTrigger(scene: InteractiveScene): BackgroundAudioTrigger {
  const trigger = getStringFromContent(scene, 'background_audio_trigger');
  if (trigger === 'on_enter' || trigger === 'on_slide_change' || trigger === 'manual') {
    return trigger;
  }
  return 'on_enter';
}

function getSceneNext(scene: InteractiveScene): string {
  if (typeof scene.next === 'string') return scene.next;
  if (scene.next && typeof scene.next === 'object' && !Array.isArray(scene.next)) {
    const next = scene.next as Record<string, unknown>;
    const candidate = next.scene_id ?? next.target_scene_id ?? next.default;
    return typeof candidate === 'string' ? candidate : '';
  }
  return '';
}

function getFirstMatchingInteraction(
  scene: InteractiveScene,
  predicate: (interaction: InteractiveInteraction) => boolean,
): InteractiveInteraction | null {
  const found = (scene.interactions ?? []).find(predicate);
  return found ?? null;
}

function isUnifiedMediaScene(sceneOrType: InteractiveScene | InteractiveSceneType | null | undefined): boolean {
  const sceneType = typeof sceneOrType === 'string' ? sceneOrType : sceneOrType?.type;
  return sceneType === 'media'
    || sceneType === 'interactive_video'
    || sceneType === 'hotspot_audio'
    || sceneType === 'branching'
    || sceneType === 'quiz';
}

function getSceneMediaKind(scene: InteractiveScene): 'image' | 'video' {
  const explicitKind = getStringFromContent(scene, 'media_kind');
  if (explicitKind === 'image' || explicitKind === 'video') {
    return explicitKind;
  }
  if (scene.type === 'interactive_video') {
    return 'video';
  }
  return getStringFromContent(scene, 'video_url') ? 'video' : 'image';
}

function createDefaultQuestionInteraction(sceneId: string): InteractiveInteraction {
  return {
    id: `${sceneId}-question`,
    type: 'multiple_choice',
    trigger: 'on_enter',
    prompt: 'Câu hỏi sau khi nghe xong âm thanh',
    choices: [
      { id: `${sceneId}-choice-1`, label: 'Lựa chọn 1', is_correct: false, retry: true, feedback: 'Chưa đúng, hãy thử lại.' },
      { id: `${sceneId}-choice-2`, label: 'Lựa chọn 2', is_correct: true, score_delta: 1, feedback: 'Chính xác.' },
    ],
  };
}

function getQuestionInteraction(scene: InteractiveScene): InteractiveInteraction | null {
  const interactions = scene.interactions ?? [];
  const content = scene.content && typeof scene.content === 'object' && !Array.isArray(scene.content)
    ? scene.content as Record<string, unknown>
    : {};
  const configuredId = typeof content.question_interaction_id === 'string' ? content.question_interaction_id : '';
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
      const followUpInteraction = interactions.find((interaction) => interaction.id === followUpId);
      if (followUpInteraction) return followUpInteraction;
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

function convertLegacySceneToUnifiedMedia(scene: InteractiveScene) {
  if (!isUnifiedMediaScene(scene) || scene.type === 'media') return;

  const previousType = scene.type;
  const content = ensureContentRecord(scene);
  const questionInteraction = getQuestionInteraction(scene);

  content.media_kind = getSceneMediaKind(scene);
  if (typeof content.background_audio_trigger !== 'string') {
    content.background_audio_trigger = 'on_enter';
  }
  if (previousType === 'hotspot_audio') {
    const hotspot = getFirstMatchingInteraction(scene, (interaction) => interaction.type === 'hotspot');
    const hotspotAudioUrl = typeof hotspot?.data?.audio_url === 'string' ? hotspot.data.audio_url : '';
    if (!getStringFromContent(scene, 'background_audio_url') && hotspotAudioUrl) {
      content.background_audio_url = hotspotAudioUrl;
    }
  }

  scene.interactions = questionInteraction ? [questionInteraction] : [];
  content.question_enabled = Boolean(questionInteraction);
  if (questionInteraction?.id) {
    content.question_interaction_id = questionInteraction.id;
  } else {
    delete content.question_interaction_id;
  }
  scene.type = 'media';
}

function isQuestionEnabled(scene: InteractiveScene): boolean {
  const content = scene.content && typeof scene.content === 'object' && !Array.isArray(scene.content)
    ? scene.content as Record<string, unknown>
    : {};
  if (typeof content.question_enabled === 'boolean') {
    return content.question_enabled;
  }
  return Boolean(getQuestionInteraction(scene));
}

function ensureQuestionInteraction(scene: InteractiveScene): InteractiveInteraction {
  convertLegacySceneToUnifiedMedia(scene);
  const content = ensureContentRecord(scene);
  const existing = getQuestionInteraction(scene);
  if (existing) {
    content.question_enabled = true;
    if (existing.id) {
      content.question_interaction_id = existing.id;
    }
    return existing;
  }

  const interaction = createDefaultQuestionInteraction(scene.id);
  ensureInteractions(scene).push(interaction);
  content.question_enabled = true;
  content.question_interaction_id = interaction.id;
  return interaction;
}

function disableQuestionInteraction(scene: InteractiveScene) {
  convertLegacySceneToUnifiedMedia(scene);
  const content = ensureContentRecord(scene);
  const existing = getQuestionInteraction(scene);
  if (existing?.id) {
    scene.interactions = (scene.interactions ?? []).filter((interaction) => interaction.id !== existing.id);
  } else {
    scene.interactions = [];
  }
  content.question_enabled = false;
  delete content.question_interaction_id;
}

function inferSceneImage(scene: InteractiveScene): string {
  const directImage = getStringFromContent(scene, 'image_url')
    || getStringFromContent(scene, 'poster_url')
    || getStringFromContent(scene, 'cover_url');
  if (directImage) return directImage;
  if (scene.assets && scene.assets.length > 0) {
    const imageAsset = scene.assets.find((asset) => asset.kind === 'image');
    if (imageAsset?.url) return imageAsset.url;
  }
  return '';
}

function getAssetTargetsForScene(scene: InteractiveScene | null): Array<{ key: AssetTargetKey; label: string }> {
  if (!scene) return [];
  if (isUnifiedMediaScene(scene)) {
    return getSceneMediaKind(scene) === 'video'
      ? [
        { key: 'video_url', label: 'Dùng làm video chính' },
        { key: 'poster_url', label: 'Dùng làm ảnh poster' },
        { key: 'background_audio', label: 'Dùng làm âm thanh nền' },
      ]
      : [
        { key: 'scene_image', label: 'Dùng làm ảnh chính' },
        { key: 'background_audio', label: 'Dùng làm âm thanh nền' },
      ];
  }
  switch (scene.type) {
    case 'timeline':
      return [
        { key: 'timeline_image', label: 'Dùng làm ảnh tổng quan' },
        { key: 'background_audio', label: 'Dùng làm âm thanh nền' },
      ];
    case 'connect_the_dots':
      return [
        { key: 'connect_dots_background', label: 'Dùng làm ảnh nền nối điểm' },
        { key: 'background_audio', label: 'Dùng làm âm thanh nền' },
      ];
    case 'slideshow':
      return [
        { key: 'slideshow_image', label: 'Thêm vào danh sách ảnh trình chiếu' },
        { key: 'background_audio', label: 'Dùng làm âm thanh nền' },
      ];
    case 'mini_game':
    case 'vr_scene':
      return [
        { key: 'scene_image', label: 'Dùng làm ảnh minh họa' },
        { key: 'background_audio', label: 'Dùng làm âm thanh nền' },
      ];
    default:
      return [{ key: 'scene_image', label: 'Dùng cho cảnh đang chọn' }];
  }
}

function isAssetCompatibleWithTarget(kind: UploadedAssetItem['kind'], target: AssetTargetKey): boolean {
  switch (target) {
    case 'timeline_image':
    case 'scene_image':
    case 'connect_dots_background':
    case 'slideshow_image':
    case 'poster_url':
      return kind === 'image';
    case 'video_url':
      return kind === 'video';
    case 'background_audio':
    case 'hotspot_audio':
      return kind === 'audio';
    default:
      return false;
  }
}

function summarizeScene(scene: InteractiveScene): string {
  const text = getSceneText(scene).trim();
  if (text) {
    return text.length > 90 ? `${text.slice(0, 87)}...` : text;
  }
  switch (scene.type) {
    case 'timeline':
      return 'Trang tổng quan dẫn vào các sự kiện.';
    case 'media':
      return 'Cảnh nội dung dùng ảnh hoặc video, có thể chèn text trực tiếp trên canvas.';
    case 'interactive_video':
      return 'Một cảnh dùng video hoặc GIF.';
    case 'hotspot_audio':
      return 'Người học bấm vào điểm chạm rồi nghe âm thanh.';
    case 'branching':
      return 'Cảnh có các nhánh lựa chọn.';
    case 'quiz':
      return 'Cảnh dùng câu hỏi trắc nghiệm.';
    case 'connect_the_dots':
      return 'Scene nối điểm theo thứ tự.';
    default:
      return 'Chưa có mô tả cho cảnh này.';
  }
}

function syncTimelineCards(manifest: InteractiveBookManifest): InteractiveBookManifest {
  const nextManifest = cloneManifest(manifest);
  const timelineScene = nextManifest.scenes.find((scene) => scene.type === 'timeline');
  if (!timelineScene) return nextManifest;

  const content = ensureContentRecord(timelineScene);
  if (content.sync_from_scenes === false) {
    return nextManifest;
  }

  const existingCards = Array.isArray(content.cards)
    ? content.cards.filter((card): card is Record<string, unknown> => typeof card === 'object' && card !== null)
    : [];
  const cardByTarget = new Map(
    existingCards
      .map((card) => {
        const target = typeof card.target_scene_id === 'string' ? card.target_scene_id : '';
        return target ? [target, card] as const : null;
      })
      .filter((entry): entry is readonly [string, Record<string, unknown>] => entry !== null),
  );

  const storyScenes = nextManifest.scenes.filter((scene) => scene.id !== timelineScene.id);
  content.cards = storyScenes.map((scene, index) => {
    const existing = cardByTarget.get(scene.id) ?? {};
    return {
      id: typeof existing.id === 'string' ? existing.id : `card-${scene.id}`,
      title: typeof existing.title === 'string' ? existing.title : '',
      description: typeof existing.description === 'string' && existing.description.trim()
        ? existing.description
        : '',
      target_scene_id: scene.id,
      image_url: typeof existing.image_url === 'string' && existing.image_url.trim()
        ? existing.image_url
        : inferSceneImage(scene),
      order_index: index + 1,
    };
  });

  return nextManifest;
}

function stringifyManifest(manifest: InteractiveBookManifest): string {
  return JSON.stringify(syncTimelineCards(manifest), null, 2);
}

function sceneTypeMeta(sceneType: InteractiveSceneType) {
  return SCENE_TYPE_META.find((option) => option.value === sceneType)
    ?? { value: sceneType, label: sceneType, variant: 'gray' as const };
}

function collectManifestWarnings(manifest: InteractiveBookManifest): string[] {
  const warnings: string[] = [];
  const sceneIds = manifest.scenes.map((scene) => scene.id);
  const duplicateIds = sceneIds.filter((sceneId, index) => sceneIds.indexOf(sceneId) !== index);
  const uniqueDuplicateIds = Array.from(new Set(duplicateIds));

  if (uniqueDuplicateIds.length > 0) {
    warnings.push(`Có cảnh bị trùng mã: ${uniqueDuplicateIds.join(', ')}.`);
  }

  if (!sceneIds.includes(manifest.entry_scene_id)) {
    warnings.push(`Cảnh bắt đầu "${manifest.entry_scene_id}" không tồn tại trong danh sách sự kiện.`);
  }

  manifest.scenes.forEach((scene, index) => {
    const sceneLabel = scene.title || `Cảnh ${index + 1}`;
    const nextSceneId = getSceneNext(scene);
    if (nextSceneId && !sceneIds.includes(nextSceneId)) {
      warnings.push(`${sceneLabel}: cảnh tiếp theo "${nextSceneId}" không tồn tại.`);
    }

    if (scene.type === 'interactive_video' && !getStringFromContent(scene, 'video_url')) {
      warnings.push(`${sceneLabel}: chưa có video.`);
    }

    if (scene.type === 'media') {
      const mediaKind = getSceneMediaKind(scene);
      if (mediaKind === 'video' && !getStringFromContent(scene, 'video_url')) {
        warnings.push(`${sceneLabel}: chưa có video.`);
      }
      if (mediaKind === 'image' && !getStringFromContent(scene, 'image_url')) {
        warnings.push(`${sceneLabel}: chưa có ảnh.`);
      }
      if (isQuestionEnabled(scene)) {
        const interaction = getQuestionInteraction(scene);
        if (!interaction || !Array.isArray(interaction.choices) || interaction.choices.length === 0) {
          warnings.push(`${sceneLabel}: đã bật câu hỏi nhưng chưa có lựa chọn.`);
        }
      }
    }

    if (scene.type === 'hotspot_audio') {
      if (!getStringFromContent(scene, 'image_url')) {
        warnings.push(`${sceneLabel}: chưa có ảnh nền cho hotspot.`);
      }
      const hotspot = getFirstMatchingInteraction(scene, (interaction) => interaction.type === 'hotspot');
      const hotspotQuiz = getFirstMatchingInteraction(scene, (interaction) => interaction.trigger === 'on_complete');
      if (!hotspot || typeof hotspot.data?.audio_url !== 'string' || !hotspot.data.audio_url) {
        warnings.push(`${sceneLabel}: chưa có âm thanh cho điểm chạm.`);
      }
      if (!hotspotQuiz || !Array.isArray(hotspotQuiz.choices) || hotspotQuiz.choices.length === 0) {
        warnings.push(`${sceneLabel}: chưa có câu hỏi nối tiếp sau hotspot.`);
      }
    }

    if (scene.type === 'quiz' || scene.type === 'branching') {
      const interaction = getFirstMatchingInteraction(scene, (item) => item.trigger === 'on_enter' || item.trigger === 'on_choice');
      if (!interaction || !Array.isArray(interaction.choices) || interaction.choices.length === 0) {
        warnings.push(`${sceneLabel}: chưa có lựa chọn cho câu hỏi.`);
      }
    }

    if (scene.type === 'slideshow' && getStringListFromContent(scene, 'images').length === 0 && !getStringFromContent(scene, 'image_url')) {
      warnings.push(`${sceneLabel}: chưa có ảnh trình chiếu.`);
    }

    (scene.interactions ?? []).forEach((interaction) => {
      (interaction.choices ?? []).forEach((choice) => {
        if (choice.target_scene_id && !sceneIds.includes(choice.target_scene_id)) {
          warnings.push(`${sceneLabel}: lựa chọn "${choice.label}" đang trỏ tới cảnh không tồn tại "${choice.target_scene_id}".`);
        }
      });
    });
  });

  return warnings;
}

export default function InteractiveBookEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const isNew = !id;
  const isPreviewMode = searchParams.get('mode') === 'preview';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [togglingSystemLibrary, setTogglingSystemLibrary] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  const [bundle, setBundle] = useState<InteractiveBookBundle | null>(null);
  const [manifestText, setManifestText] = useState(DEFAULT_MANIFEST_TEXT);
  const [manifestError, setManifestError] = useState<string | null>(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [uploadingFieldKey, setUploadingFieldKey] = useState<string | null>(null);
  const [assetLibrary, setAssetLibrary] = useState<UploadedAssetItem[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedSceneId, setSelectedSceneId] = useState('timeline');
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [showAdvancedJson, setShowAdvancedJson] = useState(false);
  const [newSceneType, setNewSceneType] = useState<InteractiveSceneType>('media');
  const [linkEditorByField, setLinkEditorByField] = useState<Record<string, boolean>>({});
  const [draggingSceneId, setDraggingSceneId] = useState<string | null>(null);
  const [showAssignToClass, setShowAssignToClass] = useState(false);
  const [classOptions, setClassOptions] = useState<Class[]>([]);
  const [chapterOptions, setChapterOptions] = useState<Chapter[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [assigningToClass, setAssigningToClass] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [report, setReport] = useState<InteractiveBookReport | null>(null);
  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    subject: SUBJECTS[0] ?? '',
    grade: GRADES[0] ?? '',
    thumbnail_url: '',
    estimated_duration: '10',
    is_system: false,
  });

  const syncFormFromBundle = (payload: InteractiveBookBundle) => {
    setForm({
      title: payload.material.title ?? '',
      description: payload.material.description ?? '',
      subject: payload.material.subject ?? SUBJECTS[0] ?? '',
      grade: payload.material.grade ?? GRADES[0] ?? '',
      thumbnail_url: payload.material.thumbnail_url ?? '',
      estimated_duration: String(payload.interactive_book.estimated_duration ?? 10),
      is_system: payload.material.is_system,
    });
  };

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const draftRes = await interactiveBookService.getBook(id, 'draft');
        const payload = draftRes.data.data as InteractiveBookBundle;
        setBundle(payload);
        setReadOnly(false);
        syncFormFromBundle(payload);
        setManifestText(stringifyManifest(payload.manifest));
      } catch {
        try {
          const publishedRes = await interactiveBookService.getBook(id, 'published');
          const payload = publishedRes.data.data as InteractiveBookBundle;
          setBundle(payload);
          setReadOnly(payload.material.created_by !== user?.id);
          syncFormFromBundle(payload);
          setManifestText(stringifyManifest(payload.manifest));
        } catch (error: any) {
          alert(error.response?.data?.message || 'Không thể tải sách tương tác');
          navigate('/teacher/library/personal');
        }
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [id, navigate, user?.id]);

  useEffect(() => {
    if (!id || !bundle || readOnly) {
      setReport(null);
      setReportError(null);
      return;
    }

    let cancelled = false;
    const loadReport = async () => {
      setReportLoading(true);
      setReportError(null);
      try {
        const response = await interactiveBookService.getReport(id);
        if (!cancelled) {
          setReport(response.data.data as InteractiveBookReport);
        }
      } catch (error: any) {
        if (!cancelled) {
          setReport(null);
          setReportError(error.response?.data?.message || 'Không thể tải báo cáo attempts.');
        }
      } finally {
        if (!cancelled) {
          setReportLoading(false);
        }
      }
    };

    void loadReport();
    return () => {
      cancelled = true;
    };
  }, [bundle, id, readOnly]);

  useEffect(() => {
    if (!showAssignToClass) return;
    classService.getClasses()
      .then((response) => setClassOptions(response.data.data || []))
      .catch(() => setClassOptions([]));
  }, [showAssignToClass]);

  useEffect(() => {
    if (!showAssignToClass || !selectedClassId) {
      setChapterOptions([]);
      return;
    }
    classService.getChapters(selectedClassId)
      .then((response) => setChapterOptions(response.data.data || []))
      .catch(() => setChapterOptions([]));
  }, [selectedClassId, showAssignToClass]);

  const previewManifest = useMemo(() => {
    try {
      const parsed = JSON.parse(manifestText) as unknown;
      if (!isManifestCandidate(parsed)) return null;
      return parsed;
    } catch {
      return null;
    }
  }, [manifestText]);

  useEffect(() => {
    if (!previewManifest) return;
    const hasSelectedScene = previewManifest.scenes.some((scene) => scene.id === selectedSceneId);
    if (!hasSelectedScene) {
      setSelectedSceneId(previewManifest.entry_scene_id || previewManifest.scenes[0]?.id || 'timeline');
    }
  }, [previewManifest, selectedSceneId]);

  const selectedScene = useMemo(
    () => previewManifest?.scenes.find((scene) => scene.id === selectedSceneId) ?? null,
    [previewManifest, selectedSceneId],
  );

  useEffect(() => {
    setSelectedLayerId(null);
  }, [selectedSceneId]);

  const previewKey = useMemo(() => {
    if (!previewManifest) return 'preview-empty';
    return `${bundle?.material.id ?? 'new'}:${previewManifest.entry_scene_id}:${previewManifest.scenes.map((scene) => scene.id).join(',')}:${manifestText.length}`;
  }, [bundle?.material.id, manifestText.length, previewManifest]);

  const sceneTypeCounts = useMemo(() => {
    if (!previewManifest) return [];
    const counts = new Map<InteractiveSceneType, number>();
    previewManifest.scenes.forEach((scene) => {
      counts.set(scene.type, (counts.get(scene.type) ?? 0) + 1);
    });
    return Array.from(counts.entries()).map(([type, count]) => ({
      type,
      count,
      ...sceneTypeMeta(type),
    }));
  }, [previewManifest]);

  const manifestWarnings = useMemo(
    () => (previewManifest ? collectManifestWarnings(previewManifest) : []),
    [previewManifest],
  );

  const flowValidation = useMemo(
    () => (previewManifest ? validateInteractiveBookFlow(previewManifest) : null),
    [previewManifest],
  );

  const blockingFlowErrors = flowValidation?.blockingErrors ?? [];
  const flowWarnings = flowValidation?.warnings ?? [];
  const hasBlockingFlowErrors = blockingFlowErrors.length > 0;

  const canAddTimeline = useMemo(
    () => !previewManifest?.scenes.some((scene) => scene.type === 'timeline'),
    [previewManifest],
  );

  const availableSceneTypes = useMemo(
    () => SCENE_CREATION_OPTIONS.filter((option) => option.value !== 'timeline' || canAddTimeline),
    [canAddTimeline],
  );

  useEffect(() => {
    if (!availableSceneTypes.some((option) => option.value === newSceneType)) {
      setNewSceneType(availableSceneTypes[0]?.value ?? 'media');
    }
  }, [availableSceneTypes, newSceneType]);

  const openPreviewMode = () => {
    if (!previewManifest) {
      alert('Manifest hiện chưa hợp lệ nên chưa thể xem thử.');
      return;
    }
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set('mode', 'preview');
    setSearchParams(nextSearchParams, { replace: true });
  };

  const closePreviewMode = () => {
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('mode');
    setSearchParams(nextSearchParams, { replace: true });
  };

  const uploadFile = async (file: File, subDir: string) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/upload?sub_dir=${subDir}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data.url as string;
  };

  const getUploadErrorMessage = (error: any, fallback: string) => (
    error?.response?.data?.detail
    || error?.response?.data?.message
    || error?.message
    || fallback
  );

  const setLinkEditorVisible = (fieldKey: string, visible: boolean) => {
    setLinkEditorByField((current) => ({ ...current, [fieldKey]: visible }));
  };

  const handleInlineUpload = async (
    fieldKey: string,
    file: File,
    subDir: string,
    onUploaded: (url: string) => void,
  ) => {
    setUploadingFieldKey(fieldKey);
    try {
      const url = await uploadFile(file, subDir);
      onUploaded(url);
      setAssetLibrary((current) => [
        {
          url,
          name: file.name,
          kind: getAssetKindFromFile(file),
        },
        ...current.filter((item) => item.url !== url),
      ]);
      setLinkEditorVisible(fieldKey, false);
    } catch (error: any) {
      alert(getUploadErrorMessage(error, 'Không thể tải tư liệu.'));
    } finally {
      setUploadingFieldKey(null);
    }
  };

  const appendSlideshowImage = (scene: InteractiveScene, url: string) => {
    const content = ensureContentRecord(scene);
    const images = Array.isArray(content.images)
      ? content.images.filter((item): item is string => typeof item === 'string')
      : [];
    if (!images.includes(url)) {
      content.images = [...images, url];
    }
    if (typeof content.image_url !== 'string' || !content.image_url) {
      content.image_url = url;
    }
  };

  const applyAssetToSelectedScene = (url: string, target: AssetTargetKey) => {
    if (!selectedScene || readOnly) return;
    updateSelectedScene((scene) => {
      if (isUnifiedMediaScene(scene) && target !== 'hotspot_audio') {
        convertLegacySceneToUnifiedMedia(scene);
      }
      const content = ensureContentRecord(scene);
      switch (target) {
        case 'timeline_image':
        case 'scene_image':
          if (scene.type === 'media') {
            content.media_kind = 'image';
          }
          content.image_url = url;
          break;
        case 'connect_dots_background':
          content.background_image_url = url;
          content.image_url = url;
          break;
        case 'slideshow_image':
          appendSlideshowImage(scene, url);
          break;
        case 'video_url':
          if (scene.type === 'media') {
            content.media_kind = 'video';
          }
          content.video_url = url;
          break;
        case 'poster_url':
          content.poster_url = url;
          break;
        case 'background_audio':
          content.background_audio_url = url;
          break;
        case 'hotspot_audio': {
          const interactions = ensureInteractions(scene);
          const hotspot = interactions.find((item) => item.type === 'hotspot');
          if (!hotspot) return;
          hotspot.data = { ...(hotspot.data ?? {}), audio_url: url };
          break;
        }
        default:
          break;
      }
    });
    setMessage(`Đã gán tư liệu vào cảnh "${selectedScene.title || selectedScene.id}".`);
  };

  const addScene = (sceneType: InteractiveSceneType) => {
    if (!previewManifest || readOnly) return;
    applyManifestUpdate((draft) => {
      const existingIds = new Set(draft.scenes.map((scene) => scene.id));
      const scene = createDefaultScene(sceneType, existingIds);
      if (sceneType === 'timeline') {
        draft.scenes.unshift(scene);
        draft.entry_scene_id = scene.id;
      } else {
        const selectedIndex = draft.scenes.findIndex((item) => item.id === selectedSceneId);
        const insertIndex = selectedIndex >= 0 ? selectedIndex + 1 : draft.scenes.length;
        draft.scenes.splice(insertIndex, 0, scene);
        if (!draft.entry_scene_id) {
          draft.entry_scene_id = scene.id;
        }
      }
      setSelectedSceneId(scene.id);
    });
    setMessage(`Đã thêm cảnh mới: ${sceneTypeMeta(sceneType).label}.`);
  };

  const removeSelectedScene = () => {
    if (!selectedScene || !previewManifest || readOnly) return;
    if (previewManifest.scenes.length <= 1) {
      alert('Sách cần ít nhất một cảnh. Không thể xóa cảnh cuối cùng.');
      return;
    }
    const sceneLabel = selectedScene.title || selectedScene.id;
    if (!window.confirm(`Bạn có chắc muốn xóa cảnh "${sceneLabel}" không?`)) {
      return;
    }

    applyManifestUpdate((draft) => {
      const currentIndex = draft.scenes.findIndex((scene) => scene.id === selectedScene.id);
      if (currentIndex < 0) return;
      draft.scenes.splice(currentIndex, 1);

      if (draft.entry_scene_id === selectedScene.id) {
        draft.entry_scene_id = draft.scenes[0]?.id ?? '';
      }

      const fallbackScene = draft.scenes[Math.min(currentIndex, draft.scenes.length - 1)];
      setSelectedSceneId(fallbackScene?.id ?? draft.entry_scene_id);
    });
    setMessage(`Đã xóa cảnh "${sceneLabel}".`);
  };

  const reorderScenes = (draggedId: string, targetId: string) => {
    if (!previewManifest || readOnly || draggedId === targetId) return;
    applyManifestUpdate((draft) => {
      const fromIndex = draft.scenes.findIndex((scene) => scene.id === draggedId);
      const toIndex = draft.scenes.findIndex((scene) => scene.id === targetId);
      if (fromIndex < 0 || toIndex < 0) return;
      const [draggedScene] = draft.scenes.splice(fromIndex, 1);
      draft.scenes.splice(toIndex, 0, draggedScene);
    });
  };

  const applyManifestUpdate = (updater: (draft: InteractiveBookManifest) => void) => {
    if (!previewManifest || readOnly) return;
    const draft = cloneManifest(previewManifest);
    updater(draft);
    setManifestText(stringifyManifest(draft));
    setManifestError(null);
  };

  const updateSelectedScene = (updater: (scene: InteractiveScene, manifest: InteractiveBookManifest) => void) => {
    applyManifestUpdate((draft) => {
      const scene = draft.scenes.find((item) => item.id === selectedSceneId);
      if (!scene) return;
      updater(scene, draft);
    });
  };

  const updateSelectedUnifiedMediaScene = (updater: (scene: InteractiveScene, manifest: InteractiveBookManifest) => void) => {
    updateSelectedScene((scene, manifest) => {
      convertLegacySceneToUnifiedMedia(scene);
      updater(scene, manifest);
    });
  };

  const moveSelectedScene = (direction: -1 | 1) => {
    if (!selectedScene || !previewManifest || readOnly) return;

    applyManifestUpdate((draft) => {
      const currentIndex = draft.scenes.findIndex((scene) => scene.id === selectedScene.id);
      const targetIndex = currentIndex + direction;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= draft.scenes.length) return;
      const [scene] = draft.scenes.splice(currentIndex, 1);
      draft.scenes.splice(targetIndex, 0, scene);
    });
  };

  const renderMediaField = ({
    fieldKey,
    label,
    url,
    accept,
    subDir,
    kind,
    description,
    disabled,
    onChange,
  }: {
    fieldKey: string;
    label: string;
    url: string;
    accept: string;
    subDir: string;
    kind: UploadedAssetItem['kind'];
    description?: string;
    disabled?: boolean;
    onChange: (url: string) => void;
  }) => {
    const showLinkEditor = Boolean(linkEditorByField[fieldKey]);
    const isUploading = uploadingFieldKey === fieldKey;
    const hasValue = Boolean(url);

    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">{label}</p>
            {description && <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>}
          </div>
          {hasValue && (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
              Đã gán tư liệu
            </span>
          )}
        </div>

        {hasValue && !showLinkEditor && (
          <div className="mt-4 space-y-3">
            {kind === 'image' && (
              <img
                src={url}
                alt={label}
                className="h-40 w-full rounded-2xl border border-slate-200 object-cover"
              />
            )}
            {kind === 'video' && (
              <video
                src={url}
                controls
                className="h-40 w-full rounded-2xl border border-slate-200 bg-slate-950 object-cover"
              />
            )}
            {kind === 'audio' && (
              <audio controls className="w-full" src={url}>
                Trình duyệt của bạn không hỗ trợ audio.
              </audio>
            )}
            <p className="text-xs text-slate-500">Tệp hiện tại: {getDisplayFileName(url)}</p>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <label className={`inline-flex cursor-pointer items-center rounded-button border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-white'}`}>
            <UploadCloud className="mr-2 h-4 w-4" />
            {isUploading ? 'Đang tải lên...' : hasValue ? 'Tải lại tệp' : 'Tải tệp lên'}
            <input
              type="file"
              accept={accept}
              className="hidden"
              disabled={disabled || isUploading}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                await handleInlineUpload(fieldKey, file, subDir, onChange);
                event.target.value = '';
              }}
            />
          </label>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => setLinkEditorVisible(fieldKey, !showLinkEditor)}
          >
            {showLinkEditor ? 'Ẩn nhập liên kết' : 'Dùng liên kết ngoài'}
          </Button>
          {hasValue && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={disabled}
              onClick={() => onChange('')}
            >
              Xóa tệp
            </Button>
          )}
        </div>

        {showLinkEditor && (
          <div className="mt-4">
            <Input
              label="Liên kết ngoài"
              value={url}
              disabled={disabled}
              onChange={(event) => onChange(event.target.value)}
              placeholder="https://..."
            />
          </div>
        )}
      </div>
    );
  };

  const parseManifestOrThrow = () => {
    try {
      const parsed = JSON.parse(manifestText) as unknown;
      if (!isManifestCandidate(parsed)) {
        throw new Error('Manifest cần có entry_scene_id và danh sách scenes[].');
      }
      const syncedManifest = syncTimelineCards(parsed as InteractiveBookManifest);
      const validation = validateInteractiveBookFlow(syncedManifest);
      if (validation.blockingErrors.length > 0) {
        throw new Error(`Flow chưa hợp lệ: ${validation.blockingErrors.map((issue) => issue.message).join(' | ')}`);
      }
      setManifestError(null);
      return syncedManifest;
    } catch (error: any) {
      const nextError = error.message || 'Manifest JSON không hợp lệ.';
      setManifestError(nextError);
      throw error;
    }
  };

  const persistDraft = async (formOverrides: Partial<FormState> = {}) => {
    const manifest = parseManifestOrThrow();
    const nextForm = { ...form, ...formOverrides };
    manifest.title = nextForm.title.trim() || manifest.title;

    const requestPayload = {
      title: nextForm.title.trim(),
      description: nextForm.description.trim() || undefined,
      subject: nextForm.subject || undefined,
      grade: nextForm.grade || undefined,
      thumbnail_url: nextForm.thumbnail_url || undefined,
      estimated_duration: Number(nextForm.estimated_duration) || undefined,
      is_system: nextForm.is_system,
      manifest,
    };

    if (isNew) {
      const response = await interactiveBookService.createBook(requestPayload);
      const payload = response.data.data as InteractiveBookBundle;
      setBundle(payload);
      syncFormFromBundle(payload);
      setManifestText(stringifyManifest(payload.manifest));
      navigate(`/teacher/interactive-books/${payload.material.id}`, { replace: true });
      return payload;
    }

    if (!id) {
      throw new Error('Không tìm thấy mã sách để lưu bản nháp.');
    }

    const response = await interactiveBookService.updateDraft(id, requestPayload);
    const payload = response.data.data as InteractiveBookBundle;
    setBundle(payload);
    syncFormFromBundle(payload);
    setManifestText(stringifyManifest(payload.manifest));
    return payload;
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      setMessage(null);
      const payload = await persistDraft();
      setMessage(isNew || !id ? 'Đã tạo bản nháp sách tương tác.' : 'Đã lưu thay đổi bản nháp.');
    } catch (error: any) {
      alert(error.response?.data?.message || error.message || 'Không thể lưu bản nháp.');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!window.confirm('Bạn có chắc muốn phát hành sách này cho học sinh?')) {
      return;
    }

    if (!id) {
      setPublishing(true);
      setMessage(null);
      try {
        const draftPayload = await persistDraft();
        const response = await interactiveBookService.publishBook(draftPayload.material.id);
        const payload = response.data.data as InteractiveBookBundle;
        setBundle(payload);
        syncFormFromBundle(payload);
        setManifestText(stringifyManifest(payload.manifest));
        setMessage('Đã phát hành sách tương tác.');
      } catch (error: any) {
        alert(error.response?.data?.message || 'Không thể phát hành sách tương tác.');
      } finally {
        setPublishing(false);
      }
      return;
    }
    setPublishing(true);
    setMessage(null);
    try {
      await persistDraft();
      const response = await interactiveBookService.publishBook(id);
      const payload = response.data.data as InteractiveBookBundle;
      setBundle(payload);
      syncFormFromBundle(payload);
      setManifestText(stringifyManifest(payload.manifest));
      setMessage('Đã phát hành sách tương tác.');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Không thể phát hành sách tương tác.');
    } finally {
      setPublishing(false);
    }
  };

  const handleToggleSystemLibrary = async (nextIsSystem: boolean) => {
    if (readOnly) return;
    setTogglingSystemLibrary(true);
    setMessage(null);
    try {
      await persistDraft({ is_system: nextIsSystem });
      setMessage(
        nextIsSystem
          ? 'Đã đưa sách tương tác vào thư viện hệ thống.'
          : 'Đã gỡ sách tương tác khỏi thư viện hệ thống.',
      );
    } catch (error: any) {
      alert(error.response?.data?.message || 'Không thể cập nhật trạng thái thư viện hệ thống.');
    } finally {
      setTogglingSystemLibrary(false);
    }
  };

  const handleOpenAssignToClass = () => {
    if (!bundle) {
      alert('Hãy lưu bản nháp sách tương tác trước khi gán vào lớp.');
      return;
    }
    if (bundle.interactive_book.status !== 'published') {
      alert('Hãy phát hành sách tương tác trước khi gán vào lớp học.');
      return;
    }
    setSelectedClassId('');
    setSelectedChapterId('');
    setShowAssignToClass(true);
  };

  const handleAssignToClass = async () => {
    if (!bundle || !selectedClassId) return;
    setAssigningToClass(true);
    try {
      await classService.addMaterial(selectedClassId, {
        material_id: bundle.material.id,
        chapter_id: selectedChapterId || undefined,
      });
      setShowAssignToClass(false);
      setSelectedClassId('');
      setSelectedChapterId('');
      setMessage('Đã gán sách tương tác vào lớp học.');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Không thể gán sách tương tác vào lớp.');
    } finally {
      setAssigningToClass(false);
    }
  };

  const renderFlowGraph = () => {
    if (!flowValidation) return null;
    const nodeTone: Record<string, string> = {
      reachable: 'border-emerald-300 bg-emerald-50 text-emerald-950',
      loop: 'border-violet-300 bg-violet-50 text-violet-950',
      blocking: 'border-red-300 bg-red-50 text-red-950',
      unreachable: 'border-amber-300 bg-amber-50 text-amber-950',
    };

    return (
      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-sky-600" />
              <h3 className="text-sm font-semibold text-slate-900">Graph View và Flow Safety</h3>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Graph này kiểm tra đường đi từ entry đến completion và chặn dead-end loop trước khi lưu.
            </p>
          </div>
          <div className={`rounded-full px-3 py-1 text-xs font-semibold ${
            hasBlockingFlowErrors ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
          }`}>
            {hasBlockingFlowErrors ? `${blockingFlowErrors.length} lỗi P0` : 'Flow hợp lệ'}
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {flowValidation.nodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setSelectedSceneId(node.id)}
                  className={`rounded-2xl border px-3 py-3 text-left transition hover:-translate-y-0.5 ${nodeTone[node.status]}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold uppercase">{node.status}</span>
                    <span className="text-xs opacity-70">{node.type}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold">{node.title}</p>
                  <p className="mt-1 break-all text-xs opacity-70">{node.id}</p>
                </button>
              ))}
            </div>

            <div className="mt-4 max-h-48 overflow-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Edges</p>
              <div className="mt-2 space-y-1 text-xs text-slate-600">
                {flowValidation.edges.length === 0 ? (
                  <p>No edges detected.</p>
                ) : flowValidation.edges.map((edge) => (
                  <button
                    key={edge.id}
                    type="button"
                    onClick={() => setSelectedSceneId(edge.from)}
                    className={`block w-full rounded-xl px-2 py-1 text-left ${edge.valid ? 'hover:bg-white' : 'bg-red-50 text-red-700'}`}
                  >
                    <span className="font-semibold">{edge.from}</span>
                    {' -> '}
                    <span className="font-semibold">{edge.to}</span>
                    <span className="ml-2 text-slate-400">({edge.kind}: {edge.label})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {blockingFlowErrors.length > 0 && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-red-900">
                  <AlertTriangle className="h-4 w-4" />
                  Blocking errors
                </div>
                <div className="mt-2 space-y-2">
                  {blockingFlowErrors.map((issue) => (
                    <button
                      key={issue.id}
                      type="button"
                      onClick={() => issue.sceneId && setSelectedSceneId(issue.sceneId)}
                      className="block w-full rounded-xl bg-white px-3 py-2 text-left text-xs text-red-800"
                    >
                      {issue.message}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {flowWarnings.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-semibold text-amber-900">Warnings</p>
                <div className="mt-2 space-y-2">
                  {flowWarnings.slice(0, 6).map((issue) => (
                    <button
                      key={issue.id}
                      type="button"
                      onClick={() => issue.sceneId && setSelectedSceneId(issue.sceneId)}
                      className="block w-full rounded-xl bg-white px-3 py-2 text-left text-xs text-amber-900"
                    >
                      {issue.message}
                    </button>
                  ))}
                  {flowWarnings.length > 6 && (
                    <p className="text-xs text-amber-800">+{flowWarnings.length - 6} warnings khác.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderReportPanel = () => {
    if (!id || readOnly) return null;

    return (
      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-sky-600" />
              <h3 className="text-sm font-semibold text-slate-900">Evidence và Attempts</h3>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Báo cáo này tổng hợp progress, wrong count, retry count và branch history từ dữ liệu attempt/event hiện có.
            </p>
          </div>
          {report && (
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {report.overview.total_attempts} attempts
            </div>
          )}
        </div>

        {reportLoading ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <Loader2 className="h-4 w-4 animate-spin" /> Đang tải báo cáo attempts...
          </div>
        ) : reportError ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {reportError}
          </div>
        ) : !report || report.overview.total_attempts === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            Chưa có attempt nào cho sách này. Báo cáo sẽ xuất hiện sau khi học sinh bắt đầu học.
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Hoàn thành</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{report.overview.completed_attempts}/{report.overview.total_attempts}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Điểm trung bình</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{report.overview.average_total_score}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Wrong trung bình</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{report.overview.average_wrong_count}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Retry trung bình</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{report.overview.average_retry_count}</p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              <div className="rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">Attempts gần nhất</p>
                </div>
                <div className="max-h-80 overflow-auto">
                  {report.attempts.map((attempt) => (
                    <div key={attempt.attempt_id} className="grid gap-3 border-b border-slate-100 px-4 py-3 md:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,0.8fr))]">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{attempt.student_name}</p>
                        <p className="text-xs text-slate-500">
                          {attempt.status} • {attempt.class_name || 'Không gắn lớp'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Điểm</p>
                        <p className="text-sm font-medium text-slate-900">{String(attempt.score_summary.total_score ?? 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Wrong</p>
                        <p className="text-sm font-medium text-slate-900">{String(attempt.score_summary.wrong_count ?? 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Retry</p>
                        <p className="text-sm font-medium text-slate-900">{String(attempt.score_summary.retry_count ?? 0)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-slate-400">Progress</p>
                        <p className="text-sm font-medium text-slate-900">{attempt.completion_percent}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">Scene statistics</p>
                </div>
                <div className="max-h-80 overflow-auto px-4 py-3">
                  <div className="space-y-3">
                    {report.scene_stats.map((sceneStat) => (
                      <div key={sceneStat.scene_id} className="rounded-2xl bg-slate-50 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{sceneStat.scene_title}</p>
                            <p className="text-xs text-slate-500">{sceneStat.scene_type}</p>
                          </div>
                          <p className="text-xs text-slate-500">{sceneStat.scene_id}</p>
                        </div>
                        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                          <div className="rounded-xl bg-white px-2 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-400">Enter</p>
                            <p className="text-sm font-semibold text-slate-900">{sceneStat.entered_count}</p>
                          </div>
                          <div className="rounded-xl bg-white px-2 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-400">Wrong</p>
                            <p className="text-sm font-semibold text-slate-900">{sceneStat.wrong_count}</p>
                          </div>
                          <div className="rounded-xl bg-white px-2 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-400">Retry</p>
                            <p className="text-sm font-semibold text-slate-900">{sceneStat.retry_count}</p>
                          </div>
                          <div className="rounded-xl bg-white px-2 py-2">
                            <p className="text-[11px] uppercase tracking-wide text-slate-400">Complete</p>
                            <p className="text-sm font-semibold text-slate-900">{sceneStat.completed_count}</p>
                          </div>
                        </div>
                        {sceneStat.choice_counts.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {sceneStat.choice_counts.map((choice) => (
                              <span key={`${sceneStat.scene_id}:${choice.choice_id}`} className="rounded-full bg-white px-3 py-1 text-xs text-slate-700">
                                {choice.label || choice.choice_id}: {choice.count}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderChoiceEditor = (
    scene: InteractiveScene,
    interaction: InteractiveInteraction | null,
    emptyLabel: string,
  ) => {
    const choices = interaction?.choices ?? [];
    if (!interaction) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
          {emptyLabel}
        </div>
      );
    }

    const updateChoice = (
      choiceId: string,
      updater: (choice: InteractiveChoice) => void,
    ) => {
      updateSelectedScene((currentScene) => {
        const interactions = ensureInteractions(currentScene);
        const targetInteraction = interactions.find((item) => item.id === interaction.id);
        if (!targetInteraction || !Array.isArray(targetInteraction.choices)) return;
        const targetChoice = targetInteraction.choices.find((item) => item.id === choiceId);
        if (!targetChoice) return;
        updater(targetChoice);
      });
    };

    const addChoice = () => {
      updateSelectedScene((currentScene) => {
        const interactions = ensureInteractions(currentScene);
        const targetInteraction = interactions.find((item) => item.id === interaction.id);
        if (!targetInteraction) return;
        if (!Array.isArray(targetInteraction.choices)) {
          targetInteraction.choices = [];
        }
        targetInteraction.choices.push({
          id: `choice-${targetInteraction.choices.length + 1}`,
          label: `Lựa chọn ${targetInteraction.choices.length + 1}`,
          is_correct: false,
          retry: true,
          feedback: '',
        });
      });
    };

    const removeChoice = (choiceId: string) => {
      updateSelectedScene((currentScene) => {
        const interactions = ensureInteractions(currentScene);
        const targetInteraction = interactions.find((item) => item.id === interaction.id);
        if (!targetInteraction || !Array.isArray(targetInteraction.choices)) return;
        targetInteraction.choices = targetInteraction.choices.filter((choice) => choice.id !== choiceId);
      });
    };

    return (
      <div className="space-y-3">
        {choices.map((choice, index) => (
          <div key={choice.id} className="rounded-3xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">Lựa chọn {index + 1}</p>
              {!readOnly && choices.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeChoice(choice.id)}>
                  Xóa
                </Button>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Nhãn hiển thị"
                value={choice.label}
                disabled={readOnly}
                onChange={(event) => updateChoice(choice.id, (draftChoice) => { draftChoice.label = event.target.value; })}
              />
              <Input
                label="Phản hồi ngắn"
                value={choice.feedback ?? ''}
                disabled={readOnly}
                onChange={(event) => updateChoice(choice.id, (draftChoice) => { draftChoice.feedback = event.target.value; })}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Đi tới cảnh</label>
                <select
                  value={choice.target_scene_id ?? ''}
                  disabled={readOnly}
                  onChange={(event) => updateChoice(choice.id, (draftChoice) => {
                    draftChoice.target_scene_id = event.target.value || undefined;
                  })}
                  className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">Không đổi cảnh</option>
                  {previewManifest?.scenes
                    .filter((item) => item.id !== selectedSceneId)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title || item.id}
                      </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {renderMediaField({
                fieldKey: `${selectedSceneId}:${interaction.id}:${choice.id}:feedback-image`,
                label: 'Ảnh phản hồi',
                url: choice.feedback_image_url ?? '',
                accept: 'image/*',
                subDir: 'interactive-books',
                kind: 'image',
                description: 'Nếu tải ảnh ở đây, hệ thống sẽ hiện ảnh này sau khi học sinh chọn đáp án.',
                disabled: readOnly,
                onChange: (url) => updateChoice(choice.id, (draftChoice) => {
                  draftChoice.feedback_image_url = url || undefined;
                }),
              })}
              {renderMediaField({
                fieldKey: `${selectedSceneId}:${interaction.id}:${choice.id}:feedback-audio`,
                label: 'Âm thanh phản hồi',
                url: choice.feedback_audio_url ?? '',
                accept: 'audio/*',
                subDir: 'interactive-books',
                kind: 'audio',
                disabled: readOnly,
                onChange: (url) => updateChoice(choice.id, (draftChoice) => {
                  draftChoice.feedback_audio_url = url || undefined;
                }),
              })}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(choice.is_correct)}
                  disabled={readOnly}
                  onChange={(event) => updateChoice(choice.id, (draftChoice) => { draftChoice.is_correct = event.target.checked; })}
                />
                Đây là đáp án đúng
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(choice.retry)}
                  disabled={readOnly}
                  onChange={(event) => updateChoice(choice.id, (draftChoice) => { draftChoice.retry = event.target.checked; })}
                />
                Cho phép làm lại
              </label>
              <Input
                label="Điểm cộng"
                type="number"
                value={String(choice.score_delta ?? 0)}
                disabled={readOnly}
                onChange={(event) => updateChoice(choice.id, (draftChoice) => {
                  const nextValue = Number(event.target.value);
                  draftChoice.score_delta = Number.isFinite(nextValue) ? nextValue : 0;
                })}
              />
            </div>
          </div>
        ))}

        {!readOnly && (
          <Button type="button" variant="secondary" onClick={addChoice}>
            Thêm lựa chọn
          </Button>
        )}
      </div>
    );
  };

  const renderCanvasLayerEditor = (scene: InteractiveScene) => {
    const layers = getSceneLayers(scene);
    const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) ?? null;
    const sceneChoices = (scene.interactions ?? []).flatMap((interaction) =>
      (interaction.choices ?? []).map((choice) => ({
        id: choice.id,
        label: `${interaction.prompt || interaction.id || 'Choice'} • ${choice.label}`,
      })),
    );

    const updateLayer = (layerId: string, updater: (layer: InteractiveLayer) => void) => {
      updateSelectedScene((currentScene) => {
        const nextLayers = getSceneLayers(currentScene).map((layer) => ({ ...layer, action: layer.action ? { ...layer.action } : undefined }));
        const targetLayer = nextLayers.find((layer) => layer.id === layerId);
        if (!targetLayer) return;
        updater(targetLayer);
        setSceneLayers(currentScene, nextLayers);
      });
    };

    const addLayer = (type: InteractiveLayer['type']) => {
      updateSelectedScene((currentScene) => {
        const nextLayers = getSceneLayers(currentScene);
        const layer = createDefaultLayer(type, nextLayers.length);
        setSceneLayers(currentScene, [...nextLayers, layer]);
        setSelectedLayerId(layer.id);
      });
    };

    const removeLayer = (layerId: string) => {
      updateSelectedScene((currentScene) => {
        setSceneLayers(currentScene, getSceneLayers(currentScene).filter((layer) => layer.id !== layerId));
      });
      setSelectedLayerId(null);
    };

    return (
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Canvas layers</p>
            <p className="mt-1 text-sm text-slate-500">
              Kéo thả layer trên canvas. Tọa độ chỉ được commit vào manifest khi thả chuột.
            </p>
          </div>
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => addLayer('text')}>
                Thêm text
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => addLayer('image')}>
                Thêm ảnh
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => addLayer('button')}>
                Thêm button
              </Button>
            </div>
          )}
        </div>

        <SceneLayerCanvas
          layers={layers}
          backgroundUrl={inferSceneImage(scene)}
          selectedLayerId={selectedLayerId}
          disabled={readOnly}
          onSelectLayer={setSelectedLayerId}
          onCommitLayerPosition={(layerId, position) => updateLayer(layerId, (layer) => {
            layer.x = position.x;
            layer.y = position.y;
          })}
        />

        {selectedLayer ? (
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2">
            <Input
              label="Nội dung layer"
              value={selectedLayer.text ?? ''}
              disabled={readOnly}
              onChange={(event) => updateLayer(selectedLayer.id, (layer) => { layer.text = event.target.value; })}
            />
            <Input
              label="Z-index"
              type="number"
              value={String(selectedLayer.z_index ?? 1)}
              disabled={readOnly}
              onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                layer.z_index = Number(event.target.value) || 1;
              })}
            />
            <Input
              label="Width (%)"
              type="number"
              value={String(selectedLayer.width)}
              disabled={readOnly}
              onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                layer.width = Number(event.target.value) || layer.width;
              })}
            />
            <Input
              label="Height (%)"
              type="number"
              value={String(selectedLayer.height)}
              disabled={readOnly}
              onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                layer.height = Number(event.target.value) || layer.height;
              })}
            />
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Visibility rule</label>
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={selectedLayer.visibility_rule?.trigger ?? 'always'}
                  disabled={readOnly}
                  onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                    layer.visibility_rule = { trigger: event.target.value as NonNullable<InteractiveLayer['visibility_rule']>['trigger'] };
                  })}
                  className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
                >
                  <option value="always">Hiện ngay</option>
                  <option value="after_delay">Hiện sau delay</option>
                  <option value="after_click">Hiện sau click</option>
                  <option value="after_choice">Hiện sau chọn đáp án</option>
                  <option value="after_media_time">Hiện khi media tới giây</option>
                  <option value="after_media_end">Hiện sau khi media kết thúc</option>
                  <option value="after_event">Hiện sau event</option>
                  <option value="manual">Manual reveal</option>
                </select>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {summarizeVisibilityRule(selectedLayer)}
                </div>
              </div>

              {(selectedLayer.visibility_rule?.trigger === 'after_delay' || selectedLayer.visibility_rule?.trigger === 'after_time') && (
                <div className="mt-3">
                  <Input
                    label="Delay (giây)"
                    type="number"
                    value={String(selectedLayer.visibility_rule?.delay_seconds ?? selectedLayer.visibility_rule?.timecode ?? 0)}
                    disabled={readOnly}
                    onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                      layer.visibility_rule = {
                        ...(layer.visibility_rule ?? { trigger: 'after_delay' }),
                        trigger: 'after_delay',
                        delay_seconds: Number(event.target.value) || 0,
                      };
                    })}
                  />
                </div>
              )}

              {selectedLayer.visibility_rule?.trigger === 'after_click' && (
                <div className="mt-3">
                  <Input
                    label="ID layer/hotspot kích hoạt"
                    value={selectedLayer.visibility_rule?.interaction_id ?? selectedLayer.visibility_rule?.layer_id ?? ''}
                    disabled={readOnly}
                    onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                      layer.visibility_rule = {
                        ...(layer.visibility_rule ?? { trigger: 'after_click' }),
                        trigger: 'after_click',
                        interaction_id: event.target.value,
                      };
                    })}
                    placeholder="Để trống nếu chỉ cần bất kỳ click trong scene"
                  />
                </div>
              )}

              {selectedLayer.visibility_rule?.trigger === 'after_choice' && (
                <div className="mt-3">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Lựa chọn kích hoạt</label>
                  <select
                    value={selectedLayer.visibility_rule?.choice_id ?? ''}
                    disabled={readOnly}
                    onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                      layer.visibility_rule = {
                        ...(layer.visibility_rule ?? { trigger: 'after_choice' }),
                        trigger: 'after_choice',
                        choice_id: event.target.value,
                      };
                    })}
                    className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="">Bất kỳ lựa chọn nào</option>
                    {sceneChoices.map((choice) => (
                      <option key={choice.id} value={choice.id}>{choice.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedLayer.visibility_rule?.trigger === 'after_media_time' && (
                <div className="mt-3">
                  <Input
                    label="Mốc media (giây)"
                    type="number"
                    value={String(selectedLayer.visibility_rule?.timecode ?? 0)}
                    disabled={readOnly}
                    onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                      layer.visibility_rule = {
                        ...(layer.visibility_rule ?? { trigger: 'after_media_time' }),
                        trigger: 'after_media_time',
                        timecode: Number(event.target.value) || 0,
                      };
                    })}
                  />
                </div>
              )}

              {selectedLayer.visibility_rule?.trigger === 'after_event' && (
                <div className="mt-3">
                  <Input
                    label="Event type"
                    value={selectedLayer.visibility_rule?.event_type ?? ''}
                    disabled={readOnly}
                    onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                      layer.visibility_rule = {
                        ...(layer.visibility_rule ?? { trigger: 'after_event' }),
                        trigger: 'after_event',
                        event_type: event.target.value,
                      };
                    })}
                    placeholder="Ví dụ: retry_clicked"
                  />
                </div>
              )}
            </div>
            {selectedLayer.type === 'image' && (
              <div className="md:col-span-2">
                {renderMediaField({
                  fieldKey: `${scene.id}:${selectedLayer.id}:image-layer`,
                  label: 'Ảnh của layer',
                  url: selectedLayer.url ?? '',
                  accept: 'image/*',
                  subDir: 'interactive-books',
                  kind: 'image',
                  disabled: readOnly,
                  onChange: (url) => updateLayer(selectedLayer.id, (layer) => { layer.url = url; }),
                })}
              </div>
            )}
            {selectedLayer.type === 'button' && (
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Hành động của button</label>
                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    value={selectedLayer.action?.type ?? 'go_to_scene'}
                    disabled={readOnly}
                    onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                      layer.action = { ...(layer.action ?? {}), type: event.target.value as NonNullable<InteractiveLayer['action']>['type'] };
                    })}
                    className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="go_to_scene">Đi tới scene</option>
                    <option value="open_interaction">Mở interaction</option>
                    <option value="reveal_layer">Hiện layer khác</option>
                    <option value="play_audio">Phát audio</option>
                  </select>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Button hiện hỗ trợ chuyển cảnh, bật interaction, reveal layer hoặc phát audio.
                  </div>
                </div>

                {(selectedLayer.action?.type ?? 'go_to_scene') === 'go_to_scene' && (
                  <div className="mt-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Scene đích</label>
                    <select
                      value={selectedLayer.action?.target_scene_id ?? ''}
                      disabled={readOnly}
                      onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                        layer.action = { ...(layer.action ?? { type: 'go_to_scene' }), type: 'go_to_scene', target_scene_id: event.target.value };
                      })}
                      className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
                    >
                      <option value="">Không đổi scene</option>
                      {previewManifest?.scenes
                        .filter((item) => item.id !== selectedSceneId)
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.title || item.id}
                          </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedLayer.action?.type === 'open_interaction' && (
                  <div className="mt-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Interaction cần mở</label>
                    <select
                      value={selectedLayer.action?.interaction_id ?? ''}
                      disabled={readOnly}
                      onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                        layer.action = { ...(layer.action ?? { type: 'open_interaction' }), type: 'open_interaction', interaction_id: event.target.value };
                      })}
                      className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
                    >
                      <option value="">Chọn interaction</option>
                      {(scene.interactions ?? []).map((interaction, index) => (
                        <option key={interaction.id ?? index} value={interaction.id ?? ''}>
                          {interaction.prompt || interaction.id || `Interaction ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedLayer.action?.type === 'reveal_layer' && (
                  <div className="mt-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Layer cần hiện</label>
                    <select
                      value={selectedLayer.action?.target_layer_id ?? ''}
                      disabled={readOnly}
                      onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                        layer.action = { ...(layer.action ?? { type: 'reveal_layer' }), type: 'reveal_layer', target_layer_id: event.target.value };
                      })}
                      className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
                    >
                      <option value="">Chọn layer</option>
                      {layers
                        .filter((item) => item.id !== selectedLayer.id)
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.text || item.id}
                          </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedLayer.action?.type === 'play_audio' && (
                  <div className="mt-3">
                    <Input
                      label="URL audio"
                      value={selectedLayer.action?.audio_url ?? ''}
                      disabled={readOnly}
                      onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                        layer.action = { ...(layer.action ?? { type: 'play_audio' }), type: 'play_audio', audio_url: event.target.value };
                      })}
                      placeholder="https://..."
                    />
                  </div>
                )}
              </div>
            )}
            {!readOnly && (
              <div className="md:col-span-2">
                <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => removeLayer(selectedLayer.id)}>
                  Xóa layer
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
            Chọn một layer trên canvas để sửa text, kích thước, z-index hoặc target của button.
          </p>
        )}
      </div>
    );
  };

  const renderBackgroundAudioTriggerField = (
    scene: InteractiveScene,
    onChange: (trigger: BackgroundAudioTrigger) => void,
  ) => {
    const currentTrigger = getBackgroundAudioTrigger(scene);
    const options: Array<{ value: BackgroundAudioTrigger; label: string; description: string }> = [
      {
        value: 'on_enter',
        label: 'Tự động khi mở nội dung',
        description: 'Hệ thống thử phát ngay khi scene mở.',
      },
      ...(scene.type === 'slideshow'
        ? [{
          value: 'on_slide_change' as const,
          label: 'Khi chuyển slide',
          description: 'Mỗi lần đổi slide sẽ phát lại âm thanh nền.',
        }]
        : []),
      {
        value: 'manual',
        label: 'Khi người dùng bấm',
        description: 'Không tự phát. Người học phải bấm nút phát.',
      },
    ];

    return (
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <label className="mb-2 block text-sm font-medium text-slate-700">Thời điểm phát âm thanh nền</label>
        <div className="grid gap-3">
          {options.map((option) => (
            <label key={`${scene.id}:${option.value}`} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              <input
                type="radio"
                name={`background-audio-trigger-${scene.id}`}
                checked={currentTrigger === option.value}
                disabled={readOnly}
                onChange={() => onChange(option.value)}
              />
              <span>
                <span className="block font-medium text-slate-900">{option.label}</span>
                <span className="mt-1 block text-xs text-slate-500">{option.description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  const renderUnifiedMediaEditor = (scene: InteractiveScene) => {
    const mediaKind = getSceneMediaKind(scene);
    const questionEnabled = isQuestionEnabled(scene);
    const questionInteraction = getQuestionInteraction(scene);
    const imageUrl = getStringFromContent(scene, 'image_url');
    const videoUrl = getStringFromContent(scene, 'video_url');
    const posterUrl = getStringFromContent(scene, 'poster_url');
    const backgroundAudioUrl = getStringFromContent(scene, 'background_audio_url');

    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <label className="mb-2 block text-sm font-medium text-slate-700">Loại nội dung chính</label>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <input
                  type="radio"
                  name={`media-kind-${scene.id}`}
                  checked={mediaKind === 'image'}
                  disabled={readOnly}
                  onChange={() => updateSelectedUnifiedMediaScene((currentScene) => {
                    ensureContentRecord(currentScene).media_kind = 'image';
                  })}
                />
                Dùng ảnh
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <input
                  type="radio"
                  name={`media-kind-${scene.id}`}
                  checked={mediaKind === 'video'}
                  disabled={readOnly}
                  onChange={() => updateSelectedUnifiedMediaScene((currentScene) => {
                    ensureContentRecord(currentScene).media_kind = 'video';
                  })}
                />
                Dùng video
              </label>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              Canvas phía trên vẫn dùng để chèn text, ghi chú hoặc nút trực tiếp lên nội dung.
            </p>
          </div>

          <div className="space-y-4">
            {renderMediaField({
              fieldKey: `${scene.id}:background-audio`,
              label: 'Âm thanh nền',
              url: backgroundAudioUrl,
              accept: 'audio/*',
              subDir: 'interactive-books',
              kind: 'audio',
              disabled: readOnly,
              onChange: (url) => updateSelectedUnifiedMediaScene((currentScene) => {
                ensureContentRecord(currentScene).background_audio_url = url;
              }),
            })}
            {renderBackgroundAudioTriggerField(scene, (trigger) => updateSelectedUnifiedMediaScene((currentScene) => {
              ensureContentRecord(currentScene).background_audio_trigger = trigger;
            }))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {mediaKind === 'video'
            ? renderMediaField({
              fieldKey: `${scene.id}:video`,
              label: 'Video chính',
              url: videoUrl,
              accept: 'video/*',
              subDir: 'interactive-books',
              kind: 'video',
              disabled: readOnly,
              onChange: (url) => updateSelectedUnifiedMediaScene((currentScene) => {
                const content = ensureContentRecord(currentScene);
                content.media_kind = 'video';
                content.video_url = url;
              }),
            })
            : renderMediaField({
              fieldKey: `${scene.id}:image`,
              label: 'Ảnh chính',
              url: imageUrl,
              accept: 'image/*',
              subDir: 'interactive-books',
              kind: 'image',
              disabled: readOnly,
              onChange: (url) => updateSelectedUnifiedMediaScene((currentScene) => {
                const content = ensureContentRecord(currentScene);
                content.media_kind = 'image';
                content.image_url = url;
              }),
            })}

          {mediaKind === 'video'
            ? (
              <div className="space-y-4">
                {renderMediaField({
                  fieldKey: `${scene.id}:poster`,
                  label: 'Ảnh poster',
                  url: posterUrl,
                  accept: 'image/*',
                  subDir: 'interactive-books',
                  kind: 'image',
                  disabled: readOnly,
                  onChange: (url) => updateSelectedUnifiedMediaScene((currentScene) => {
                    ensureContentRecord(currentScene).poster_url = url;
                  }),
                })}
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={getBooleanFromContent(scene, 'autoplay')}
                    disabled={readOnly}
                    onChange={(event) => updateSelectedUnifiedMediaScene((currentScene) => {
                      ensureContentRecord(currentScene).autoplay = event.target.checked;
                    })}
                  />
                  Tự phát video khi vào cảnh
                </label>
              </div>
            )
            : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                Ảnh chính sẽ hiển thị toàn màn hình. Giáo viên có thể chèn text hoặc ghi chú bằng canvas ở phía trên.
              </div>
            )}
        </div>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={questionEnabled}
            disabled={readOnly}
            onChange={(event) => updateSelectedUnifiedMediaScene((currentScene) => {
              if (event.target.checked) {
                ensureQuestionInteraction(currentScene);
              } else {
                disableQuestionInteraction(currentScene);
              }
            })}
          />
          Đặt câu hỏi cho học sinh sau khi nghe xong âm thanh
        </label>

        {questionEnabled && (
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Câu hỏi sau khi nghe xong âm thanh</p>
              <p className="mt-1 text-sm text-slate-500">
                Phần này chỉ xuất hiện khi giáo viên bật tùy chọn câu hỏi. Nếu cảnh có audio hoặc video, câu hỏi sẽ mở sau khi media kết thúc.
              </p>
            </div>
            <Input
              label="Câu hỏi trắc nghiệm"
              value={questionInteraction?.prompt ?? ''}
              disabled={readOnly}
              onChange={(event) => updateSelectedUnifiedMediaScene((currentScene) => {
                const interaction = ensureQuestionInteraction(currentScene);
                interaction.prompt = event.target.value;
              })}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Thông điệp mặc định khi trả lời sai"
                value={typeof questionInteraction?.data?.wrong_feedback_message === 'string' ? questionInteraction.data.wrong_feedback_message : ''}
                disabled={readOnly}
                onChange={(event) => updateSelectedUnifiedMediaScene((currentScene) => {
                  const interaction = ensureQuestionInteraction(currentScene);
                  interaction.data = { ...(interaction.data ?? {}), wrong_feedback_message: event.target.value };
                })}
                placeholder="Ví dụ: Câu trả lời này chưa đúng."
              />
              <Input
                label="Thông điệp mặc định khi trả lời đúng"
                value={typeof questionInteraction?.data?.correct_feedback_message === 'string' ? questionInteraction.data.correct_feedback_message : ''}
                disabled={readOnly}
                onChange={(event) => updateSelectedUnifiedMediaScene((currentScene) => {
                  const interaction = ensureQuestionInteraction(currentScene);
                  interaction.data = { ...(interaction.data ?? {}), correct_feedback_message: event.target.value };
                })}
                placeholder="Ví dụ: Chính xác, em tiếp tục nhé."
              />
            </div>
            {renderChoiceEditor(scene, questionInteraction, 'Cảnh này chưa có lựa chọn cho câu hỏi.')}
          </div>
        )}
      </div>
    );
  };

  const renderConnectDotsEditor = (scene: InteractiveScene, content: Record<string, unknown>) => {
    const points = getConnectDotsPoints(scene);
    const backgroundUrl = typeof content.background_image_url === 'string' && content.background_image_url
      ? content.background_image_url
      : getStringFromContent(scene, 'image_url');

    const updatePoint = (
      pointId: string,
      updater: (point: { id: string; label?: string; x: number; y: number; order: number }) => void,
    ) => {
      updateSelectedScene((currentScene) => {
        const nextPoints = getConnectDotsPoints(currentScene).map((point) => ({ ...point }));
        const targetPoint = nextPoints.find((point) => point.id === pointId);
        if (!targetPoint) return;
        updater(targetPoint);
        ensureContentRecord(currentScene).points = nextPoints.sort((left, right) => left.order - right.order);
      });
    };

    const addPointAt = (x: number, y: number) => {
      if (readOnly) return;
      updateSelectedScene((currentScene) => {
        const nextPoints = getConnectDotsPoints(currentScene);
        ensureContentRecord(currentScene).points = [
          ...nextPoints,
          {
            id: `${currentScene.id}-point-${Date.now()}`,
            label: String(nextPoints.length + 1),
            x,
            y,
            order: nextPoints.length + 1,
          },
        ];
      });
    };

    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {renderMediaField({
            fieldKey: `${scene.id}:connect-dots-background`,
            label: 'Ảnh nền nối điểm',
            url: backgroundUrl,
            accept: 'image/*',
            subDir: 'interactive-books',
            kind: 'image',
            disabled: readOnly,
            onChange: (url) => updateSelectedScene((currentScene) => {
              const currentContent = ensureContentRecord(currentScene);
              currentContent.background_image_url = url;
              currentContent.image_url = url;
            }),
          })}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Scene sau khi hoàn thành</label>
            <select
              value={typeof content.success_target_scene_id === 'string' ? content.success_target_scene_id : ''}
              disabled={readOnly}
              onChange={(event) => updateSelectedScene((currentScene) => {
                ensureContentRecord(currentScene).success_target_scene_id = event.target.value;
              })}
              className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
            >
              <option value="">Dừng ở scene này / nút tiếp theo mặc định</option>
              {previewManifest?.scenes
                .filter((item) => item.id !== scene.id)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title || item.id}
                  </option>
              ))}
            </select>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Input
                label="Điểm hoàn thành"
                type="number"
                value={String(content.complete_score ?? 1)}
                disabled={readOnly}
                onChange={(event) => updateSelectedScene((currentScene) => {
                  ensureContentRecord(currentScene).complete_score = Number(event.target.value) || 0;
                })}
              />
              <Input
                label="Phạt khi sai"
                type="number"
                value={String(content.wrong_penalty ?? 0)}
                disabled={readOnly}
                onChange={(event) => updateSelectedScene((currentScene) => {
                  ensureContentRecord(currentScene).wrong_penalty = Number(event.target.value) || 0;
                })}
              />
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-sm font-medium text-slate-700">Hành vi khi bấm sai thứ tự</label>
              <select
                value={typeof content.wrong_behavior === 'string' ? content.wrong_behavior : 'stay_current_point'}
                disabled={readOnly}
                onChange={(event) => updateSelectedScene((currentScene) => {
                  ensureContentRecord(currentScene).wrong_behavior = event.target.value;
                })}
                className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
              >
                <option value="stay_current_point">Giữ nguyên tiến độ hiện tại</option>
                <option value="restart_current_sequence">Quay lại chuỗi hiện tại</option>
                <option value="restart_from_beginning">Làm lại từ đầu</option>
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Canvas nối điểm</p>
              <p className="mt-1 text-sm text-slate-500">
                Click vào ảnh để thêm điểm. Học sinh phải chọn đúng theo thứ tự order.
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              {points.length} điểm
            </span>
          </div>

          <div
            className="relative mt-4 aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-white"
            onClick={(event) => {
              if (readOnly) return;
              const rect = event.currentTarget.getBoundingClientRect();
              const x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100;
              const y = ((event.clientY - rect.top) / Math.max(1, rect.height)) * 100;
              addPointAt(Math.round(x), Math.round(y));
            }}
          >
            {backgroundUrl ? (
              <img src={backgroundUrl} alt="Connect dots background" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                Chưa có ảnh nền. Tải ảnh trước khi đặt điểm.
              </div>
            )}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <polyline
                points={points.map((point) => `${point.x},${point.y}`).join(' ')}
                fill="none"
                stroke="rgb(14 165 233)"
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            {points.map((point) => (
              <div
                key={point.id}
                className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-sky-500 text-sm font-bold text-white shadow"
                style={{ left: `${point.x}%`, top: `${point.y}%` }}
              >
                {point.label || point.order}
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {points.map((point) => (
              <div key={point.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_90px_90px_90px_auto]">
                <Input
                  label="Label"
                  value={point.label ?? ''}
                  disabled={readOnly}
                  onChange={(event) => updatePoint(point.id, (draftPoint) => { draftPoint.label = event.target.value; })}
                />
                <Input
                  label="X"
                  type="number"
                  value={String(point.x)}
                  disabled={readOnly}
                  onChange={(event) => updatePoint(point.id, (draftPoint) => { draftPoint.x = Number(event.target.value) || 0; })}
                />
                <Input
                  label="Y"
                  type="number"
                  value={String(point.y)}
                  disabled={readOnly}
                  onChange={(event) => updatePoint(point.id, (draftPoint) => { draftPoint.y = Number(event.target.value) || 0; })}
                />
                <Input
                  label="Order"
                  type="number"
                  value={String(point.order)}
                  disabled={readOnly}
                  onChange={(event) => updatePoint(point.id, (draftPoint) => { draftPoint.order = Number(event.target.value) || 1; })}
                />
                {!readOnly && (
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => updateSelectedScene((currentScene) => {
                        ensureContentRecord(currentScene).points = getConnectDotsPoints(currentScene).filter((item) => item.id !== point.id);
                      })}
                    >
                      Xóa
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderSceneEditor = () => {
    if (!selectedScene || !previewManifest) {
      return (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-500">
          Chọn một sự kiện để bắt đầu chỉnh sửa.
        </div>
      );
    }

    const meta = sceneTypeMeta(selectedScene.type);
    const content = selectedScene.content && typeof selectedScene.content === 'object' && !Array.isArray(selectedScene.content)
      ? selectedScene.content as Record<string, unknown>
      : {};
    const sceneText = getSceneText(selectedScene);
    const nextSceneId = getSceneNext(selectedScene);
    const implicitNextSceneId = getImplicitNextSceneId(previewManifest, selectedScene.id);
    const resolvedNextSceneId = nextSceneId || implicitNextSceneId;
    const isTimeline = selectedScene.type === 'timeline';
    const isUnifiedMedia = isUnifiedMediaScene(selectedScene);
    const slideshowImages = Array.from(new Set([
      ...getStringListFromContent(selectedScene, 'images'),
      ...(
        getStringFromContent(selectedScene, 'image_url')
          ? [getStringFromContent(selectedScene, 'image_url')]
          : []
      ),
    ]));
    const sceneIndex = previewManifest.scenes.findIndex((scene) => scene.id === selectedScene.id);
    const canMoveUp = sceneIndex > 0;
    const canMoveDown = sceneIndex < previewManifest.scenes.length - 1;

    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={meta.variant}>{meta.label}</Badge>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                Mã cảnh: {selectedScene.id}
              </span>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-slate-900">{selectedScene.title || 'Cảnh chưa có tiêu đề'}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {isTimeline
                  ? 'Trang này là điểm vào của sách. Các thẻ sự kiện sẽ tự đồng bộ từ danh sách cảnh bên trái.'
                  : 'Giáo viên chỉnh trực tiếp nội dung, phương tiện và nhánh chuyển cảnh tại đây.'}
              </p>
            </div>
          </div>

          {!readOnly && (
            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => moveSelectedScene(-1)} disabled={!canMoveUp}>
                Đưa lên
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => moveSelectedScene(1)} disabled={!canMoveDown}>
                Đưa xuống
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={removeSelectedScene} className="text-red-600">
                <Trash2 className="mr-1.5 h-4 w-4" /> Xóa cảnh
              </Button>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Tên sự kiện"
              value={selectedScene.title ?? ''}
              disabled={readOnly}
              onChange={(event) => updateSelectedScene((scene) => { scene.title = event.target.value; })}
              placeholder="Ví dụ: Quan hỏi cậu bé"
            />

            {!isTimeline && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nút “Cảnh tiếp theo” sẽ đi tới</label>
                <select
                  value={resolvedNextSceneId}
                  disabled={readOnly}
                  onChange={(event) => updateSelectedScene((scene) => {
                    const chosenSceneId = event.target.value;
                    scene.next = !chosenSceneId || chosenSceneId === implicitNextSceneId
                      ? undefined
                      : chosenSceneId;
                  })}
                  className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
                >
                  <option value={implicitNextSceneId || ''}>
                    {implicitNextSceneId ? 'Theo thứ tự thẻ trên sidebar' : 'Không thiết lập'}
                  </option>
                  {previewManifest.scenes
                    .filter((scene) => scene.id !== selectedScene.id)
                    .map((scene) => (
                      <option key={scene.id} value={scene.id}>
                        {scene.title || scene.id}
                      </option>
                  ))}
                </select>
                {implicitNextSceneId && !nextSceneId && (
                  <p className="mt-2 text-xs text-slate-500">
                    Hiện tại chưa đặt thủ công. Nút này sẽ mặc định đi tới thẻ đứng ngay sau nó trên sidebar.
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Mô tả hoặc lời dẫn của sự kiện</label>
            <textarea
              value={sceneText}
              disabled={readOnly}
              onChange={(event) => updateSelectedScene((scene) => {
                ensureContentRecord(scene).text = event.target.value;
              })}
              rows={4}
              className="w-full rounded-3xl border border-border px-4 py-3 text-sm leading-6 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-blue-300 disabled:bg-slate-50"
              placeholder="Nhập nội dung giáo viên muốn hiển thị ở cảnh này..."
            />
          </div>

          {!isTimeline && renderCanvasLayerEditor(selectedScene)}

          {isUnifiedMedia && renderUnifiedMediaEditor(selectedScene)}

          {selectedScene.type === 'timeline' && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {renderMediaField({
                  fieldKey: `${selectedScene.id}:timeline-image`,
                  label: 'Ảnh tổng quan',
                  url: getStringFromContent(selectedScene, 'image_url'),
                  accept: 'image/*',
                  subDir: 'interactive-books',
                  kind: 'image',
                  disabled: readOnly,
                  onChange: (url) => updateSelectedScene((scene) => {
                    ensureContentRecord(scene).image_url = url;
                  }),
                })}
                {renderMediaField({
                  fieldKey: `${selectedScene.id}:timeline-audio`,
                  label: 'Âm thanh nền',
                  url: getStringFromContent(selectedScene, 'background_audio_url'),
                  accept: 'audio/*',
                  subDir: 'interactive-books',
                  kind: 'audio',
                  disabled: readOnly,
                  onChange: (url) => updateSelectedScene((scene) => {
                    ensureContentRecord(scene).background_audio_url = url;
                  }),
                })}
              </div>

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={content.sync_from_scenes !== false}
                  disabled={readOnly}
                  onChange={(event) => updateSelectedScene((scene) => {
                    ensureContentRecord(scene).sync_from_scenes = event.target.checked;
                  })}
                />
                Tự đồng bộ thẻ timeline từ danh sách sự kiện
              </label>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Thẻ sự kiện hiện tại</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {Array.isArray(content.cards) && content.cards.length > 0 ? (
                    content.cards.map((card, index) => {
                      const record = card as Record<string, unknown>;
                      return (
                        <div key={String(record.id ?? index)} className="rounded-2xl bg-white p-4 shadow-sm">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Sự kiện {index + 1}</p>
                          <p className="mt-1 font-semibold text-slate-900">{String(record.title ?? 'Chưa có tiêu đề')}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-500">{String(record.description ?? '')}</p>
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-slate-500">
                      Chưa có thẻ timeline. Hệ thống sẽ tạo thẻ sau khi giáo viên chỉnh các sự kiện còn lại.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {selectedScene.type === 'connect_the_dots' && renderConnectDotsEditor(selectedScene, content)}

          {selectedScene.type === 'slideshow' && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {renderMediaField({
                  fieldKey: `${selectedScene.id}:slideshow-audio`,
                  label: 'Âm thanh nền',
                  url: getStringFromContent(selectedScene, 'background_audio_url'),
                  accept: 'audio/*',
                  subDir: 'interactive-books',
                  kind: 'audio',
                  disabled: readOnly,
                  onChange: (url) => updateSelectedScene((scene) => {
                    ensureContentRecord(scene).background_audio_url = url;
                  }),
                })}
                {renderBackgroundAudioTriggerField(selectedScene, (trigger) => updateSelectedScene((scene) => {
                  ensureContentRecord(scene).background_audio_trigger = trigger;
                }))}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Danh sách ảnh trình chiếu</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Có thể tải nhiều ảnh. Trình phát sẽ hiển thị theo đúng thứ tự trong danh sách này.
                    </p>
                  </div>
                  {!readOnly && (
                    <label className="inline-flex cursor-pointer items-center rounded-button border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      <UploadCloud className="mr-2 h-4 w-4" />
                      {uploadingFieldKey === `${selectedScene.id}:slideshow-images` ? 'Đang tải ảnh...' : 'Tải thêm ảnh'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingFieldKey === `${selectedScene.id}:slideshow-images`}
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          await handleInlineUpload(
                            `${selectedScene.id}:slideshow-images`,
                            file,
                            'interactive-books',
                            (url) => updateSelectedScene((scene) => {
                              appendSlideshowImage(scene, url);
                            }),
                          );
                          event.target.value = '';
                        }}
                      />
                    </label>
                  )}
                </div>

                {slideshowImages.length > 0 ? (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {slideshowImages.map((imageUrl, index) => (
                      <div key={imageUrl} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                        <img
                          src={imageUrl}
                          alt={`Ảnh trình chiếu ${index + 1}`}
                          className="h-40 w-full rounded-2xl border border-slate-200 object-cover"
                        />
                        <div className="mt-3 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">Ảnh {index + 1}</p>
                            <p className="text-xs text-slate-500">{getDisplayFileName(imageUrl)}</p>
                          </div>
                          {!readOnly && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => updateSelectedScene((scene) => {
                                const contentRecord = ensureContentRecord(scene);
                                const nextImages = getStringListFromContent(scene, 'images').filter((item) => item !== imageUrl);
                                contentRecord.images = nextImages;
                                contentRecord.image_url = nextImages[0] ?? '';
                              })}
                            >
                              Xóa
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">
                    Chưa có ảnh trình chiếu. Giáo viên có thể tải ảnh trực tiếp ở đây hoặc dùng mục “Tải lên tư liệu” phía dưới để gán nhanh.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => navigate(-1)} className="mt-1 text-slate-400 hover:text-slate-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {isPreviewMode
                ? 'Xem thử sách tương tác'
                : isNew
                  ? 'Tạo sách tương tác'
                  : readOnly
                    ? 'Xem sách tương tác'
                    : 'Biên soạn sách tương tác'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {isPreviewMode
                ? 'Chế độ này dùng cùng trình phát mà học sinh sẽ trải nghiệm. Thoát xem thử để quay lại biên soạn.'
                : 'Giao diện này ưu tiên thao tác theo từng sự kiện, còn JSON được giữ lại như chế độ nâng cao để không làm hỏng runtime hiện có.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isPreviewMode ? (
            <Button type="button" variant="secondary" onClick={closePreviewMode}>
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Rời chế độ xem thử
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="secondary"
                onClick={handleOpenAssignToClass}
                disabled={!bundle || bundle.interactive_book.status !== 'published'}
              >
                <PlusCircle className="mr-1.5 h-4 w-4" /> Gán vào lớp
              </Button>
              {!readOnly && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { void handleToggleSystemLibrary(!form.is_system); }}
                  isLoading={togglingSystemLibrary}
                >
                  {form.is_system ? 'Gỡ khỏi thư viện hệ thống' : 'Đưa vào thư viện hệ thống'}
                </Button>
              )}
              <Button type="button" variant="secondary" onClick={openPreviewMode}>
                <Eye className="mr-1.5 h-4 w-4" /> Xem thử
              </Button>
              <Button type="button" variant="secondary" onClick={() => {
                if (!window.confirm('Nạp mẫu sẽ thay nội dung hiện tại trong trình biên soạn. Bạn có muốn tiếp tục không?')) {
                  return;
                }
                setManifestText(DEFAULT_MANIFEST_TEXT);
              }}>
                <Copy className="mr-1.5 h-4 w-4" /> Nạp mẫu 5 sự kiện
              </Button>
              {!readOnly && (
                <>
                  <Button type="button" variant="secondary" onClick={handleSaveDraft} isLoading={saving} disabled={hasBlockingFlowErrors}>
                    <Save className="mr-1.5 h-4 w-4" /> Lưu bản nháp
                  </Button>
                  <Button type="button" onClick={handlePublish} isLoading={publishing} disabled={hasBlockingFlowErrors}>
                    <Rocket className="mr-1.5 h-4 w-4" /> Phát hành
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {readOnly && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Bạn đang xem bản đã phát hành ở chế độ chỉ đọc vì đây không phải bản nháp của bạn.
        </div>
      )}

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </div>
      )}

      {bundle && (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Trạng thái phát hành</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5 text-sm text-slate-600">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Trạng thái</p>
              <p className="mt-1 font-medium text-slate-900">
                {bundle.interactive_book.status === 'published'
                  ? 'Đã phát hành'
                  : bundle.interactive_book.status === 'draft'
                    ? 'Bản nháp'
                    : 'Lưu trữ'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Phiên bản</p>
              <p className="mt-1 font-medium text-slate-900">{bundle.interactive_book.manifest_version}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Điểm bắt đầu</p>
              <p className="mt-1 font-medium text-slate-900">{previewManifest?.entry_scene_id || 'Chưa có'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Tổng số cảnh</p>
              <p className="mt-1 font-medium text-slate-900">{previewManifest?.scenes.length ?? 0}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-slate-400">Phạm vi</p>
              <p className="mt-1 font-medium text-slate-900">
                {bundle.material.is_system ? 'Thư viện hệ thống' : 'Thư viện cá nhân'}
              </p>
            </div>
          </div>
        </div>
      )}

      {isPreviewMode ? (
        <section className="space-y-6">
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            Chế độ xem thử sử dụng cùng runtime mà học sinh sẽ thấy khi học. Thoát xem thử để tiếp tục biên soạn nội dung.
          </div>

          {previewManifest ? (
            <InteractiveBookPlayer
              key={previewKey}
              manifest={previewManifest}
              title={form.title || previewManifest.title || 'Xem thử sách tương tác'}
              mode="preview"
              reviewOnly={readOnly}
              initialSceneId={previewManifest.entry_scene_id}
            />
          ) : (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-500">
              Manifest hiện chưa hợp lệ nên chưa thể xem thử.
            </div>
          )}
        </section>
      ) : (
        <section className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Thông tin chung</h2>
                <p className="mt-1 text-sm text-slate-500">Nhập thông tin mà giáo viên và học sinh nhìn thấy trước khi mở sách.</p>
              </div>
              {previewManifest && (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Điểm bắt đầu</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{previewManifest.entry_scene_id}</p>
                </div>
              )}
            </div>

            <div className="mt-5 space-y-4">
              <Input
                label="Tên sách"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Ví dụ: Cậu bé thông minh"
                disabled={readOnly}
              />

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Mô tả</label>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                  rows={4}
                  disabled={readOnly}
                  className="w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-blue-300 disabled:bg-slate-50"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Môn học</label>
                  <select
                    value={form.subject}
                    disabled={readOnly}
                    onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                    className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
                  >
                    {SUBJECTS.map((subject) => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Khối lớp</label>
                  <select
                    value={form.grade}
                    disabled={readOnly}
                    onChange={(event) => setForm((current) => ({ ...current, grade: event.target.value }))}
                    className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
                  >
                    {GRADES.map((grade) => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {renderMediaField({
                  fieldKey: 'book:thumbnail',
                  label: 'Ảnh bìa',
                  url: form.thumbnail_url,
                  accept: 'image/*',
                  subDir: 'thumbnails',
                  kind: 'image',
                  description: 'Ưu tiên tải ảnh lên trực tiếp. Chỉ dùng liên kết ngoài khi thực sự cần.',
                  disabled: readOnly,
                  onChange: (url) => setForm((current) => ({ ...current, thumbnail_url: url })),
                })}
                <Input
                  label="Thời lượng ước tính (phút)"
                  value={form.estimated_duration}
                  onChange={(event) => setForm((current) => ({ ...current, estimated_duration: event.target.value }))}
                  placeholder="10"
                  disabled={readOnly}
                />
              </div>

              {previewManifest && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Cảnh bắt đầu của sách</label>
                  <select
                    value={previewManifest.entry_scene_id}
                    disabled={readOnly}
                    onChange={(event) => applyManifestUpdate((draft) => {
                      draft.entry_scene_id = event.target.value;
                    })}
                    className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
                  >
                    {previewManifest.scenes.map((scene) => (
                      <option key={scene.id} value={scene.id}>
                        {scene.title || scene.id}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-slate-500">
                    Không bắt buộc phải đi từ trang Tổng quan. Giáo viên có thể chọn bất kỳ cảnh nào làm điểm vào.
                  </p>
                </div>
              )}

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.is_system}
                  disabled={readOnly}
                  onChange={(event) => setForm((current) => ({ ...current, is_system: event.target.checked }))}
                />
                Đưa sách này vào thư viện hệ thống
              </label>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Biên soạn theo sự kiện</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Giáo viên không cần sửa JSON để đổi tên cảnh, nội dung, video, điểm chạm hoặc câu hỏi.
                </p>
              </div>
              {previewManifest && (
                <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <ArrowUpDown className="h-4 w-4 text-slate-400" />
                  {previewManifest.scenes.length} cảnh
                </div>
              )}
            </div>

            {previewManifest ? (
              <>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Điểm bắt đầu</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{previewManifest.entry_scene_id}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Tổng số cảnh</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{previewManifest.scenes.length}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-slate-400">Loại cảnh</p>
                    <p className="mt-1 flex flex-wrap gap-1.5">
                      {sceneTypeCounts.map((item) => (
                        <Badge key={item.type} variant={item.variant}>
                          {item.label}: {item.count}
                        </Badge>
                      ))}
                    </p>
                  </div>
                </div>

                {renderFlowGraph()}
                {renderReportPanel()}

                <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-900">Checklist trước khi lưu hoặc phát hành</p>
                      {manifestWarnings.length === 0 ? (
                        <p className="text-sm text-emerald-700">Chưa phát hiện lỗi cấu trúc phổ biến. Giáo viên có thể lưu hoặc mở chế độ xem thử để kiểm tra runtime.</p>
                      ) : (
                        <div className="space-y-2">
                          {manifestWarnings.map((warning) => (
                            <p key={warning} className="text-sm text-amber-900">
                              • {warning}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                  <aside className="space-y-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Kéo thả để đổi thứ tự cảnh. Nếu chưa đặt thủ công “Cảnh tiếp theo”, hệ thống sẽ mặc định đi tới cảnh đứng ngay sau nó trong danh sách này.
                    </div>
                    {!readOnly && (
                      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">Thêm cảnh mới</p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          Chọn loại cảnh mà bài học này thật sự cần. Không bắt buộc phải có đủ mọi loại cảnh.
                        </p>
                        <div className="mt-4 space-y-3">
                          <select
                            value={newSceneType}
                            onChange={(event) => setNewSceneType(event.target.value as InteractiveSceneType)}
                            className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
                          >
                            {availableSceneTypes.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            className="w-full"
                            variant="secondary"
                            onClick={() => addScene(newSceneType)}
                          >
                            <Plus className="mr-1.5 h-4 w-4" /> Thêm cảnh theo loại đã chọn
                          </Button>
                        </div>
                      </div>
                    )}

                    {previewManifest.scenes.map((scene, index) => {
                      const meta = sceneTypeMeta(scene.type);
                      const active = scene.id === selectedSceneId;
                      const dragging = draggingSceneId === scene.id;
                      return (
                        <button
                          key={scene.id}
                          type="button"
                          draggable={!readOnly}
                          onClick={() => setSelectedSceneId(scene.id)}
                          onDragStart={() => setDraggingSceneId(scene.id)}
                          onDragOver={(event) => {
                            if (readOnly) return;
                            event.preventDefault();
                          }}
                          onDragEnd={() => setDraggingSceneId(null)}
                          onDrop={(event) => {
                            if (readOnly) return;
                            event.preventDefault();
                            if (draggingSceneId) {
                              reorderScenes(draggingSceneId, scene.id);
                            }
                            setDraggingSceneId(null);
                          }}
                          className={`w-full rounded-3xl border px-4 py-4 text-left transition ${active ? 'border-sky-300 bg-sky-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'} ${dragging ? 'opacity-60' : ''}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <Badge variant={meta.variant}>{meta.label}</Badge>
                            <span className="text-xs font-medium text-slate-400">#{index + 1}</span>
                          </div>
                          <p className="mt-3 font-semibold text-slate-900">{scene.title || `Cảnh ${index + 1}`}</p>
                          <p className="mt-1 text-sm leading-6 text-slate-500">{summarizeScene(scene)}</p>
                        </button>
                      );
                    })}
                  </aside>

                  <div>{renderSceneEditor()}</div>
                </div>
              </>
            ) : (
              <div className="mt-5 rounded-3xl border border-dashed border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
                Hệ thống chưa đọc được manifest hiện tại. Giáo viên có thể sửa ở phần JSON nâng cao cho đến khi dữ liệu hợp lệ trở lại.
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Tải lên tư liệu</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Tải ảnh, âm thanh hoặc video trước. Sau đó có thể gán nhanh trực tiếp vào cảnh đang chọn hoặc sao chép liên kết để dùng ở chỗ khác.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              {selectedScene && (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                  Đang biên soạn cảnh: <strong>{selectedScene.title || selectedScene.id}</strong>. Các nút bên dưới sẽ gán tư liệu trực tiếp vào cảnh này.
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <label className="inline-flex cursor-pointer items-center rounded-button border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <ImagePlus className="mr-2 h-4 w-4" />
                  {uploadingThumbnail ? 'Đang tải ảnh bìa...' : 'Tải ảnh bìa'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={readOnly || uploadingThumbnail}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setUploadingThumbnail(true);
                      try {
                        const url = await uploadFile(file, 'thumbnails');
                        setForm((current) => ({ ...current, thumbnail_url: url }));
                      } catch (error: any) {
                        alert(getUploadErrorMessage(error, 'Không thể tải ảnh bìa.'));
                      } finally {
                        setUploadingThumbnail(false);
                        event.target.value = '';
                      }
                    }}
                  />
                </label>

                <label className="inline-flex cursor-pointer items-center rounded-button border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  <UploadCloud className="mr-2 h-4 w-4" />
                  {uploadingAsset ? 'Đang tải tư liệu...' : 'Tải tư liệu cho sự kiện'}
                  <input
                    type="file"
                    className="hidden"
                    disabled={readOnly || uploadingAsset}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      setUploadingAsset(true);
                      try {
                        const url = await uploadFile(file, 'interactive-books');
                        setAssetLibrary((current) => [
                          {
                            url,
                            name: file.name,
                            kind: getAssetKindFromFile(file),
                          },
                          ...current.filter((item) => item.url !== url),
                        ]);
                      } catch (error: any) {
                        alert(getUploadErrorMessage(error, 'Không thể tải tư liệu.'));
                      } finally {
                        setUploadingAsset(false);
                        event.target.value = '';
                      }
                    }}
                  />
                </label>
              </div>

              {assetLibrary.length > 0 && (
                <div className="space-y-2">
                  {assetLibrary.map((asset) => (
                    <div key={asset.url} className="rounded-2xl border border-slate-200 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{asset.name}</p>
                          <p className="text-xs text-slate-500">Tệp đã tải lên và sẵn sàng gán vào cảnh hiện tại.</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          {asset.kind}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {getAssetTargetsForScene(selectedScene)
                          .filter((target) => isAssetCompatibleWithTarget(asset.kind, target.key))
                          .map((target) => (
                            <Button
                              key={`${asset.url}-${target.key}`}
                              type="button"
                              variant="secondary"
                            size="sm"
                            disabled={readOnly || !selectedScene}
                            onClick={() => applyAssetToSelectedScene(asset.url, target.key)}
                            >
                              {target.label}
                            </Button>
                          ))}
                        {getAssetTargetsForScene(selectedScene)
                          .filter((target) => isAssetCompatibleWithTarget(asset.kind, target.key))
                          .length === 0 && (
                            <p className="text-xs text-slate-500">
                              Tệp này không phù hợp với các vị trí gán của cảnh hiện tại.
                            </p>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <button
              type="button"
              onClick={() => setShowAdvancedJson((current) => !current)}
              className="flex w-full items-start justify-between gap-4 text-left"
            >
              <div>
                <h2 className="text-lg font-semibold text-slate-900">JSON nâng cao</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Phần này dành cho người rành kỹ thuật hoặc khi cần cấu hình đặc biệt vượt quá giao diện biên soạn.
                </p>
              </div>
              <Badge variant="gray">{showAdvancedJson ? 'Đang mở' : 'Đang ẩn'}</Badge>
            </button>

            {showAdvancedJson && (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                  <div className="flex items-start gap-3">
                    <Info className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>
                      Nếu giáo viên chỉ muốn sửa nội dung, video, câu hỏi hoặc thứ tự sự kiện thì nên dùng phần “Biên soạn theo sự kiện” bên trên.
                    </p>
                  </div>
                </div>

                <textarea
                  value={manifestText}
                  onChange={(event) => {
                    setManifestText(event.target.value);
                    if (manifestError) setManifestError(null);
                  }}
                  rows={26}
                  disabled={readOnly}
                  spellCheck={false}
                  className="w-full rounded-3xl border border-slate-200 bg-slate-950 px-4 py-4 font-mono text-sm leading-6 text-slate-100 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200 disabled:bg-slate-900"
                />
                {manifestError && <p className="text-sm text-red-600">{manifestError}</p>}
              </div>
            )}
          </div>
        </section>
      )}

      <Modal
        isOpen={showAssignToClass}
        onClose={() => {
          if (assigningToClass) return;
          setShowAssignToClass(false);
        }}
        title="Gán sách tương tác vào lớp"
        size="sm"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            Chỉ sách tương tác đã phát hành mới có thể gán cho lớp học để học sinh truy cập ổn định.
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Chọn lớp</label>
            <select
              value={selectedClassId}
              onChange={(event) => {
                setSelectedClassId(event.target.value);
                setSelectedChapterId('');
              }}
              className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
            >
              <option value="">-- Chọn lớp --</option>
              {classOptions.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>
                  {classItem.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Chọn chương</label>
            <select
              value={selectedChapterId}
              disabled={!selectedClassId}
              onChange={(event) => setSelectedChapterId(event.target.value)}
              className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300 disabled:bg-slate-50"
            >
              <option value="">-- Gắn trực tiếp vào lớp, chưa chọn chương --</option>
              {chapterOptions.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Có thể để trống nếu muốn sách xuất hiện trực tiếp trong lớp mà chưa thuộc chương cụ thể.
            </p>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowAssignToClass(false)}
              disabled={assigningToClass}
            >
              Hủy
            </Button>
            <Button
              type="button"
              onClick={handleAssignToClass}
              disabled={!selectedClassId || assigningToClass}
            >
              {assigningToClass ? 'Đang gán...' : 'Gán vào lớp'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
