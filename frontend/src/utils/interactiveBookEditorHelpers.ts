import type {
  FlowValidationResult,
  InteractiveBookManifest,
  InteractiveChoice,
  InteractiveInteraction,
  InteractiveLayer,
  InteractiveScene,
  InteractiveSceneType,
} from '@/types';

export const DEFAULT_MANIFEST = {
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

export const DEFAULT_MANIFEST_TEXT = JSON.stringify(DEFAULT_MANIFEST, null, 2);

export type SceneMetaVariant = 'blue' | 'purple' | 'mint' | 'yellow' | 'pink' | 'gray';

export interface SceneMetaOption {
  value: InteractiveSceneType;
  label: string;
  variant: SceneMetaVariant;
}

export const SCENE_TYPE_META: SceneMetaOption[] = [
  { value: 'timeline', label: 'Tổng quan', variant: 'blue' },
  { value: 'media', label: 'Nội dung', variant: 'purple' },
  { value: 'interactive_video', label: 'Video tương tác', variant: 'purple' },
  { value: 'hotspot_audio', label: 'Điểm chạm + âm thanh', variant: 'pink' },
  { value: 'branching', label: 'Rẽ nhánh', variant: 'mint' },
  { value: 'quiz', label: 'Câu hỏi', variant: 'yellow' },
  { value: 'connect_the_dots', label: 'Nối điểm', variant: 'mint' },
  { value: 'slideshow', label: 'Trình chiếu', variant: 'blue' },
];

export const SCENE_CREATION_OPTIONS: SceneMetaOption[] = [
  { value: 'timeline', label: 'Tổng quan', variant: 'blue' },
  { value: 'media', label: 'Nội dung', variant: 'purple' },
  { value: 'connect_the_dots', label: 'Nối điểm', variant: 'mint' },
  { value: 'slideshow', label: 'Trình chiếu', variant: 'blue' },
];

export interface FormState {
  title: string;
  description: string;
  subject: string;
  grade: string;
  thumbnail_url: string;
  estimated_duration: string;
}

export type AssetTargetKey =
  | 'timeline_image'
  | 'scene_image'
  | 'connect_dots_background'
  | 'slideshow_image'
  | 'video_url'
  | 'poster_url'
  | 'background_audio'
  | 'hotspot_audio';

export interface UploadedAssetItem {
  url: string;
  name: string;
  kind: 'image' | 'video' | 'audio' | 'file';
}

export type BackgroundAudioTrigger = 'on_enter' | 'on_slide_change' | 'manual';
export type SceneReadinessTone = 'ready' | 'needs_attention' | 'draft';

export interface SceneReadiness {
  tone: SceneReadinessTone;
  label: string;
  details: string[];
}

export function createSceneId(sceneType: InteractiveSceneType, existingIds: Set<string>): string {
  const prefix = sceneType === 'timeline' ? 'timeline' : `scene-${sceneType.replace(/_/g, '-')}`;
  let nextIndex = 1;
  let candidate = prefix;
  while (existingIds.has(candidate)) {
    candidate = `${prefix}-${nextIndex}`;
    nextIndex += 1;
  }
  return candidate;
}

export function createDefaultScene(sceneType: InteractiveSceneType, existingIds: Set<string>): InteractiveScene {
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

export function getImplicitNextSceneId(manifest: InteractiveBookManifest, sceneId: string): string {
  const currentIndex = manifest.scenes.findIndex((scene) => scene.id === sceneId);
  if (currentIndex < 0) return '';
  return manifest.scenes[currentIndex + 1]?.id ?? '';
}

export function getDisplayFileName(url: string): string {
  try {
    const normalized = url.split('?')[0];
    const name = normalized.split('/').filter(Boolean).pop();
    return name ? decodeURIComponent(name) : 'Tệp đã tải lên';
  } catch {
    return 'Tệp đã tải lên';
  }
}

export function getAssetKindFromFile(file: File): UploadedAssetItem['kind'] {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return 'file';
}

export function isManifestCandidate(value: unknown): value is InteractiveBookManifest {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.entry_scene_id === 'string' && Array.isArray(record.scenes);
}

export function cloneManifest(manifest: InteractiveBookManifest): InteractiveBookManifest {
  return JSON.parse(JSON.stringify(manifest)) as InteractiveBookManifest;
}

export function ensureContentRecord(scene: InteractiveScene): Record<string, unknown> {
  if (!scene.content || typeof scene.content !== 'object' || Array.isArray(scene.content)) {
    scene.content = typeof scene.content === 'string' ? { text: scene.content } : {};
  }
  return scene.content as Record<string, unknown>;
}

export function ensureInteractions(scene: InteractiveScene): InteractiveInteraction[] {
  if (!Array.isArray(scene.interactions)) {
    scene.interactions = [];
  }
  return scene.interactions;
}

export function getSceneLayers(scene: InteractiveScene): InteractiveLayer[] {
  const content = ensureContentRecord(scene);
  return Array.isArray(content.layers)
    ? content.layers.filter((item): item is InteractiveLayer => Boolean(item) && typeof item === 'object' && typeof (item as InteractiveLayer).id === 'string')
    : [];
}

export function setSceneLayers(scene: InteractiveScene, layers: InteractiveLayer[]) {
  ensureContentRecord(scene).layers = layers;
}

export function getConnectDotsPoints(scene: InteractiveScene) {
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

export function createDefaultLayer(type: InteractiveLayer['type'], index: number): InteractiveLayer {
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

export function summarizeVisibilityRule(layer: InteractiveLayer): string {
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
        : 'Hiện sau khi có click trong cảnh';
    case 'after_choice':
      return rule.choice_id ? `Hiện sau lựa chọn ${rule.choice_id}` : 'Hiện sau khi học sinh chọn đáp án';
    case 'after_event':
      return rule.event_type ? `Hiện sau sự kiện ${rule.event_type}` : 'Hiện sau sự kiện';
    case 'manual':
      return 'Chỉ hiện khi nút gọi tới';
    case 'on_scene_state':
      return rule.state_key ? `Hiện khi trạng thái ${rule.state_key} khớp điều kiện` : 'Hiện theo trạng thái cảnh';
    default:
      return 'Hiện ngay';
  }
}

export function getSceneText(scene: InteractiveScene): string {
  if (typeof scene.content === 'string') return scene.content;
  if (!scene.content || typeof scene.content !== 'object' || Array.isArray(scene.content)) return '';
  const content = scene.content as Record<string, unknown>;
  return typeof content.text === 'string' ? content.text : '';
}

export function getStringFromContent(scene: InteractiveScene, key: string): string {
  if (!scene.content || typeof scene.content !== 'object' || Array.isArray(scene.content)) return '';
  const content = scene.content as Record<string, unknown>;
  return typeof content[key] === 'string' ? String(content[key]) : '';
}

export function getStringListFromContent(scene: InteractiveScene, key: string): string[] {
  if (!scene.content || typeof scene.content !== 'object' || Array.isArray(scene.content)) return [];
  const content = scene.content as Record<string, unknown>;
  return Array.isArray(content[key]) ? content[key].filter((item): item is string => typeof item === 'string') : [];
}

export function getBooleanFromContent(scene: InteractiveScene, key: string): boolean {
  if (!scene.content || typeof scene.content !== 'object' || Array.isArray(scene.content)) return false;
  const content = scene.content as Record<string, unknown>;
  return Boolean(content[key]);
}

export function getBackgroundAudioTrigger(scene: InteractiveScene): BackgroundAudioTrigger {
  const trigger = getStringFromContent(scene, 'background_audio_trigger');
  if (trigger === 'on_enter' || trigger === 'on_slide_change' || trigger === 'manual') {
    return trigger;
  }
  return 'on_enter';
}

export function getSceneNext(scene: InteractiveScene): string {
  if (typeof scene.next === 'string') return scene.next;
  if (scene.next && typeof scene.next === 'object' && !Array.isArray(scene.next)) {
    const next = scene.next as Record<string, unknown>;
    const candidate = next.scene_id ?? next.target_scene_id ?? next.default;
    return typeof candidate === 'string' ? candidate : '';
  }
  return '';
}

export function getFirstMatchingInteraction(
  scene: InteractiveScene,
  predicate: (interaction: InteractiveInteraction) => boolean,
): InteractiveInteraction | null {
  const found = (scene.interactions ?? []).find(predicate);
  return found ?? null;
}

export function isUnifiedMediaScene(sceneOrType: InteractiveScene | InteractiveSceneType | null | undefined): boolean {
  const sceneType = typeof sceneOrType === 'string' ? sceneOrType : sceneOrType?.type;
  return sceneType === 'media'
    || sceneType === 'interactive_video'
    || sceneType === 'hotspot_audio'
    || sceneType === 'branching'
    || sceneType === 'quiz';
}

export function getSceneMediaKind(scene: InteractiveScene): 'image' | 'video' {
  const explicitKind = getStringFromContent(scene, 'media_kind');
  if (explicitKind === 'image' || explicitKind === 'video') {
    return explicitKind;
  }
  if (scene.type === 'interactive_video') {
    return 'video';
  }
  return getStringFromContent(scene, 'video_url') ? 'video' : 'image';
}

export function createDefaultQuestionInteraction(sceneId: string): InteractiveInteraction {
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

export function getQuestionInteraction(scene: InteractiveScene): InteractiveInteraction | null {
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

export function convertLegacySceneToUnifiedMedia(scene: InteractiveScene) {
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

export function isQuestionEnabled(scene: InteractiveScene): boolean {
  const content = scene.content && typeof scene.content === 'object' && !Array.isArray(scene.content)
    ? scene.content as Record<string, unknown>
    : {};
  if (typeof content.question_enabled === 'boolean') {
    return content.question_enabled;
  }
  return Boolean(getQuestionInteraction(scene));
}

export function ensureQuestionInteraction(scene: InteractiveScene): InteractiveInteraction {
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

export function disableQuestionInteraction(scene: InteractiveScene) {
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

export function inferSceneImage(scene: InteractiveScene): string {
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

export function getAssetTargetsForScene(scene: InteractiveScene | null): Array<{ key: AssetTargetKey; label: string }> {
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

export function isAssetCompatibleWithTarget(kind: UploadedAssetItem['kind'], target: AssetTargetKey): boolean {
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

export function summarizeScene(scene: InteractiveScene): string {
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
      return 'Cảnh nối điểm theo thứ tự.';
    case 'slideshow':
      return 'Cảnh trình chiếu nhiều hình ảnh.';
    default:
      return 'Chưa có mô tả cho cảnh này.';
  }
}

export function syncTimelineCards(manifest: InteractiveBookManifest): InteractiveBookManifest {
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

export function stringifyManifest(manifest: InteractiveBookManifest): string {
  return JSON.stringify(syncTimelineCards(manifest), null, 2);
}

export function sceneTypeMeta(sceneType: InteractiveSceneType) {
  return SCENE_TYPE_META.find((option) => option.value === sceneType)
    ?? { value: sceneType, label: sceneType, variant: 'gray' as const };
}

export function collectManifestWarnings(manifest: InteractiveBookManifest): string[] {
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
    warnings.push(...collectSceneWarnings(scene, manifest, index));
  });

  return warnings;
}

export function collectSceneWarnings(
  scene: InteractiveScene,
  manifest: InteractiveBookManifest,
  index?: number,
): string[] {
  const warnings: string[] = [];
  const sceneIds = manifest.scenes.map((item) => item.id);
  const sceneLabel = scene.title || `Cảnh ${(index ?? manifest.scenes.findIndex((item) => item.id === scene.id)) + 1}`;
  const nextSceneId = getSceneNext(scene);

  if (!scene.title?.trim()) {
    warnings.push(`${sceneLabel}: chưa có tên cảnh rõ ràng.`);
  }

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

  return warnings;
}

export function getSceneReadiness(scene: InteractiveScene, manifest: InteractiveBookManifest, flowValidation?: FlowValidationResult | null): SceneReadiness {
  const details = collectSceneWarnings(scene, manifest);
  const hasBlockingIssue = Boolean(flowValidation?.blockingErrors.some((issue) => issue.sceneId === scene.id));
  const hasFlowWarning = Boolean(flowValidation?.warnings.some((issue) => issue.sceneId === scene.id));
  const hasMeaningfulContent = Boolean(
    scene.title?.trim()
    || getSceneText(scene).trim()
    || inferSceneImage(scene)
    || getStringFromContent(scene, 'video_url')
    || getSceneLayers(scene).length
    || (scene.interactions?.length ?? 0) > 0
  );

  if (hasBlockingIssue) {
    return {
      tone: 'needs_attention',
      label: 'Cần sửa gấp',
      details,
    };
  }

  if (details.length > 0 || hasFlowWarning) {
    return {
      tone: 'needs_attention',
      label: 'Cần kiểm tra',
      details,
    };
  }

  if (hasMeaningfulContent) {
    return {
      tone: 'ready',
      label: 'Đã ổn',
      details: [],
    };
  }

  return {
    tone: 'draft',
    label: 'Đang soạn',
    details: [],
  };
}

export function duplicateSceneWithNewIds(scene: InteractiveScene, existingIds: Set<string>): InteractiveScene {
  const originalSceneId = scene.id;
  const duplicated = cloneManifest({ entry_scene_id: scene.id, scenes: [scene] }).scenes[0];
  const newSceneId = createSceneId(scene.type, existingIds);
  duplicated.id = newSceneId;
  duplicated.title = scene.title?.trim()
    ? `${scene.title} (Bản sao)`
    : `${sceneTypeMeta(scene.type).label} (Bản sao)`;

  const interactionIdMap = new Map<string, string>();
  (duplicated.interactions ?? []).forEach((interaction, interactionIndex) => {
    const oldId = interaction.id;
    const nextId = `${newSceneId}-interaction-${interactionIndex + 1}`;
    if (oldId) {
      interactionIdMap.set(oldId, nextId);
    }
    interaction.id = nextId;
  });

  (duplicated.interactions ?? []).forEach((interaction, interactionIndex) => {
    if (interaction.target_scene_id === originalSceneId) {
      interaction.target_scene_id = newSceneId;
    }

    if (interaction.data && typeof interaction.data === 'object') {
      const data = interaction.data as Record<string, unknown>;
      const followUp = typeof data.follow_up_interaction_id === 'string' ? data.follow_up_interaction_id : '';
      if (followUp && interactionIdMap.has(followUp)) {
        data.follow_up_interaction_id = interactionIdMap.get(followUp);
      }
      const sceneTarget = typeof data.scene_id === 'string' ? data.scene_id : '';
      if (sceneTarget === originalSceneId) {
        data.scene_id = newSceneId;
      }
      const targetScene = typeof data.target_scene_id === 'string' ? data.target_scene_id : '';
      if (targetScene === originalSceneId) {
        data.target_scene_id = newSceneId;
      }
    }

    interaction.choices?.forEach((choice, choiceIndex) => {
      choice.id = `${newSceneId}-choice-${interactionIndex + 1}-${choiceIndex + 1}`;
      if (choice.target_scene_id === originalSceneId) {
        choice.target_scene_id = newSceneId;
      }
    });
  });

  const layerIdMap = new Map<string, string>();
  const layers = getSceneLayers(duplicated).map((layer, layerIndex) => {
    const nextId = `${newSceneId}-layer-${layer.type}-${layerIndex + 1}`;
    layerIdMap.set(layer.id, nextId);
    return {
      ...layer,
      id: nextId,
      action: layer.action ? { ...layer.action } : undefined,
      visibility_rule: layer.visibility_rule ? { ...layer.visibility_rule } : undefined,
    };
  });

  layers.forEach((layer) => {
    if (layer.action?.target_scene_id === originalSceneId) {
      layer.action.target_scene_id = newSceneId;
    }
    if (layer.action?.scene_id === originalSceneId) {
      layer.action.scene_id = newSceneId;
    }
    if (layer.action?.target_layer_id && layerIdMap.has(layer.action.target_layer_id)) {
      layer.action.target_layer_id = layerIdMap.get(layer.action.target_layer_id);
    }
    if (layer.visibility_rule?.interaction_id && interactionIdMap.has(layer.visibility_rule.interaction_id)) {
      layer.visibility_rule.interaction_id = interactionIdMap.get(layer.visibility_rule.interaction_id);
    }
    if (layer.visibility_rule?.layer_id && layerIdMap.has(layer.visibility_rule.layer_id)) {
      layer.visibility_rule.layer_id = layerIdMap.get(layer.visibility_rule.layer_id);
    }
  });
  setSceneLayers(duplicated, layers);

  const points = getConnectDotsPoints(duplicated).map((point, pointIndex) => ({
    ...point,
    id: `${newSceneId}-point-${pointIndex + 1}`,
  }));
  if (points.length > 0) {
    ensureContentRecord(duplicated).points = points;
  }

  const content = ensureContentRecord(duplicated);
  if (typeof content.question_interaction_id === 'string' && interactionIdMap.has(content.question_interaction_id)) {
    content.question_interaction_id = interactionIdMap.get(content.question_interaction_id);
  }
  if (typeof content.success_target_scene_id === 'string' && content.success_target_scene_id === originalSceneId) {
    content.success_target_scene_id = newSceneId;
  }

  if (typeof duplicated.next === 'string' && duplicated.next === originalSceneId) {
    duplicated.next = newSceneId;
  } else if (duplicated.next && typeof duplicated.next === 'object' && !Array.isArray(duplicated.next)) {
    const nextRecord = duplicated.next as Record<string, unknown>;
    if (nextRecord.scene_id === originalSceneId) nextRecord.scene_id = newSceneId;
    if (nextRecord.target_scene_id === originalSceneId) nextRecord.target_scene_id = newSceneId;
    if (nextRecord.default === originalSceneId) nextRecord.default = newSceneId;
  }

  return duplicated;
}
