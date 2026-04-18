import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpDown,
  Copy,
  Eye,
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
import api from '@/services/api';
import { classService } from '@/services/class.service';
import { interactiveBookService } from '@/services/interactive-book.service';
import { useAuthStore } from '@/store/auth.store';
import type {
  Chapter,
  Class,
  InteractiveBookBundle,
  InteractiveBookManifest,
  InteractiveChoice,
  InteractiveInteraction,
  InteractiveScene,
  InteractiveSceneType,
} from '@/types';
import { GRADES, SUBJECTS } from '@/utils/constants';

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

const SCENE_TYPE_OPTIONS: Array<{ value: InteractiveSceneType; label: string; variant: 'blue' | 'purple' | 'mint' | 'yellow' | 'pink' }> = [
  { value: 'timeline', label: 'Tổng quan', variant: 'blue' },
  { value: 'interactive_video', label: 'Video tương tác', variant: 'purple' },
  { value: 'hotspot_audio', label: 'Điểm chạm + âm thanh', variant: 'pink' },
  { value: 'branching', label: 'Rẽ nhánh', variant: 'mint' },
  { value: 'quiz', label: 'Câu hỏi', variant: 'yellow' },
  { value: 'slideshow', label: 'Trình chiếu', variant: 'blue' },
  { value: 'mini_game', label: 'Mini game', variant: 'purple' },
  { value: 'vr_scene', label: 'VR', variant: 'mint' },
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
    interactive_video: 'Video tương tác mới',
    hotspot_audio: 'Điểm chạm và âm thanh mới',
    branching: 'Cảnh rẽ nhánh mới',
    quiz: 'Câu hỏi mới',
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
          sync_from_scenes: true,
        },
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
          images: [],
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
  switch (scene.type) {
    case 'timeline':
      return [
        { key: 'timeline_image', label: 'Dùng làm ảnh tổng quan' },
        { key: 'background_audio', label: 'Dùng làm âm thanh nền' },
      ];
    case 'interactive_video':
      return [
        { key: 'video_url', label: 'Dùng làm video chính' },
        { key: 'poster_url', label: 'Dùng làm ảnh poster' },
        { key: 'background_audio', label: 'Dùng làm âm thanh nền' },
      ];
    case 'hotspot_audio':
      return [
        { key: 'scene_image', label: 'Dùng làm ảnh nền' },
        { key: 'background_audio', label: 'Dùng làm âm thanh nền' },
        { key: 'hotspot_audio', label: 'Dùng làm lời thoại hotspot' },
      ];
    case 'branching':
    case 'quiz':
      return [
        { key: 'scene_image', label: 'Dùng làm ảnh minh họa' },
        { key: 'video_url', label: 'Dùng làm video của cảnh' },
        { key: 'poster_url', label: 'Dùng làm ảnh poster' },
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
    case 'interactive_video':
      return 'Một cảnh dùng video hoặc GIF.';
    case 'hotspot_audio':
      return 'Người học bấm vào điểm chạm rồi nghe âm thanh.';
    case 'branching':
      return 'Cảnh có các nhánh lựa chọn.';
    case 'quiz':
      return 'Cảnh dùng câu hỏi trắc nghiệm.';
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
      title: typeof existing.title === 'string' && existing.title.trim() ? existing.title : (scene.title || `Sự kiện ${index + 1}`),
      description: typeof existing.description === 'string' && existing.description.trim()
        ? existing.description
        : summarizeScene(scene),
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
  return SCENE_TYPE_OPTIONS.find((option) => option.value === sceneType)
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
    if (!scene.title?.trim()) {
      warnings.push(`${sceneLabel}: chưa có tên sự kiện.`);
    }
    if (nextSceneId && !sceneIds.includes(nextSceneId)) {
      warnings.push(`${sceneLabel}: cảnh tiếp theo "${nextSceneId}" không tồn tại.`);
    }

    if (scene.type === 'interactive_video' && !getStringFromContent(scene, 'video_url')) {
      warnings.push(`${sceneLabel}: chưa có video.`);
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
  const [showAdvancedJson, setShowAdvancedJson] = useState(false);
  const [newSceneType, setNewSceneType] = useState<InteractiveSceneType>('interactive_video');
  const [linkEditorByField, setLinkEditorByField] = useState<Record<string, boolean>>({});
  const [draggingSceneId, setDraggingSceneId] = useState<string | null>(null);
  const [showAssignToClass, setShowAssignToClass] = useState(false);
  const [classOptions, setClassOptions] = useState<Class[]>([]);
  const [chapterOptions, setChapterOptions] = useState<Chapter[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [assigningToClass, setAssigningToClass] = useState(false);
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

  const canAddTimeline = useMemo(
    () => !previewManifest?.scenes.some((scene) => scene.type === 'timeline'),
    [previewManifest],
  );

  const availableSceneTypes = useMemo(
    () => SCENE_TYPE_OPTIONS.filter((option) => option.value !== 'timeline' || canAddTimeline),
    [canAddTimeline],
  );

  useEffect(() => {
    if (!availableSceneTypes.some((option) => option.value === newSceneType)) {
      setNewSceneType(availableSceneTypes[0]?.value ?? 'interactive_video');
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
    } catch {
      alert('Không thể tải tư liệu.');
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
      const content = ensureContentRecord(scene);
      switch (target) {
        case 'timeline_image':
        case 'scene_image':
          content.image_url = url;
          break;
        case 'slideshow_image':
          appendSlideshowImage(scene, url);
          break;
        case 'video_url':
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
    const timecodeInteraction = getFirstMatchingInteraction(selectedScene, (interaction) => interaction.trigger === 'timecode');
    const hotspotInteraction = getFirstMatchingInteraction(selectedScene, (interaction) => interaction.id === 'hotspot-1' || interaction.type === 'hotspot');
    const hotspotQuizInteraction = getFirstMatchingInteraction(selectedScene, (interaction) => interaction.id === 'hotspot-quiz' || interaction.trigger === 'on_complete');
    const branchingInteraction = getFirstMatchingInteraction(selectedScene, (interaction) => interaction.trigger === 'on_enter' || interaction.trigger === 'on_choice');
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

          {selectedScene.type === 'interactive_video' && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {renderMediaField({
                  fieldKey: `${selectedScene.id}:video`,
                  label: 'Video chính',
                  url: getStringFromContent(selectedScene, 'video_url'),
                  accept: 'video/*',
                  subDir: 'interactive-books',
                  kind: 'video',
                  disabled: readOnly,
                  onChange: (url) => updateSelectedScene((scene) => {
                    ensureContentRecord(scene).video_url = url;
                  }),
                })}
                {renderMediaField({
                  fieldKey: `${selectedScene.id}:poster`,
                  label: 'Ảnh poster',
                  url: getStringFromContent(selectedScene, 'poster_url'),
                  accept: 'image/*',
                  subDir: 'interactive-books',
                  kind: 'image',
                  disabled: readOnly,
                  onChange: (url) => updateSelectedScene((scene) => {
                    ensureContentRecord(scene).poster_url = url;
                  }),
                })}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {renderMediaField({
                  fieldKey: `${selectedScene.id}:background-audio`,
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
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={getBooleanFromContent(selectedScene, 'autoplay')}
                    disabled={readOnly}
                    onChange={(event) => updateSelectedScene((scene) => {
                      ensureContentRecord(scene).autoplay = event.target.checked;
                    })}
                  />
                  Tự phát video khi vào cảnh
                </label>
              </div>

              {timecodeInteraction && (
                <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Lựa chọn xuất hiện giữa video</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Dùng cho cảnh kiểu “video dừng tại thời điểm X để học sinh chọn hướng xử lý”.
                    </p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      label="Thời điểm dừng video (giây)"
                      type="number"
                      value={String(timecodeInteraction.timecode ?? 0)}
                      disabled={readOnly}
                      onChange={(event) => updateSelectedScene((scene) => {
                        const interactions = ensureInteractions(scene);
                        const interaction = interactions.find((item) => item.id === timecodeInteraction.id);
                        if (!interaction) return;
                        interaction.timecode = Number(event.target.value) || 0;
                      })}
                    />
                    <Input
                      label="Câu hỏi trên màn hình"
                      value={timecodeInteraction.prompt ?? ''}
                      disabled={readOnly}
                      onChange={(event) => updateSelectedScene((scene) => {
                        const interactions = ensureInteractions(scene);
                        const interaction = interactions.find((item) => item.id === timecodeInteraction.id);
                        if (!interaction) return;
                        interaction.prompt = event.target.value;
                      })}
                    />
                  </div>
                  {renderChoiceEditor(selectedScene, timecodeInteraction, 'Cảnh video này chưa có lựa chọn giữa video.')}
                </div>
              )}
            </>
          )}

          {selectedScene.type === 'hotspot_audio' && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {renderMediaField({
                  fieldKey: `${selectedScene.id}:hotspot-image`,
                  label: 'Ảnh nền của cảnh',
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
                  fieldKey: `${selectedScene.id}:hotspot-background-audio`,
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

              <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Điểm chạm và lời thoại</p>
                  <p className="mt-1 text-sm text-slate-500">Học sinh bấm vào điểm chạm trước, sau đó hệ thống mới mở câu hỏi.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Input
                    label="Tọa độ ngang (%)"
                    type="number"
                    value={String((hotspotInteraction?.data?.x as number | undefined) ?? 50)}
                    disabled={readOnly}
                    onChange={(event) => updateSelectedScene((scene) => {
                      const interactions = ensureInteractions(scene);
                      const interaction = interactions.find((item) => item.id === hotspotInteraction?.id);
                      if (!interaction) return;
                      interaction.data = { ...(interaction.data ?? {}), x: Number(event.target.value) || 0 };
                    })}
                  />
                  <Input
                    label="Tọa độ dọc (%)"
                    type="number"
                    value={String((hotspotInteraction?.data?.y as number | undefined) ?? 50)}
                    disabled={readOnly}
                    onChange={(event) => updateSelectedScene((scene) => {
                      const interactions = ensureInteractions(scene);
                      const interaction = interactions.find((item) => item.id === hotspotInteraction?.id);
                      if (!interaction) return;
                      interaction.data = { ...(interaction.data ?? {}), y: Number(event.target.value) || 0 };
                    })}
                  />
                  <Input
                    label="Lời gợi ý ngắn"
                    value={typeof hotspotInteraction?.data?.subtitle === 'string' ? hotspotInteraction.data.subtitle : ''}
                    disabled={readOnly}
                    onChange={(event) => updateSelectedScene((scene) => {
                      const interactions = ensureInteractions(scene);
                      const interaction = interactions.find((item) => item.id === hotspotInteraction?.id);
                      if (!interaction) return;
                      interaction.data = { ...(interaction.data ?? {}), subtitle: event.target.value };
                    })}
                  />
                </div>
                {renderMediaField({
                  fieldKey: `${selectedScene.id}:hotspot-dialogue-audio`,
                  label: 'Âm thanh lời thoại',
                  url: typeof hotspotInteraction?.data?.audio_url === 'string' ? hotspotInteraction.data.audio_url : '',
                  accept: 'audio/*',
                  subDir: 'interactive-books',
                  kind: 'audio',
                  disabled: readOnly,
                  onChange: (url) => updateSelectedScene((scene) => {
                    const interactions = ensureInteractions(scene);
                    const interaction = interactions.find((item) => item.id === hotspotInteraction?.id);
                    if (!interaction) return;
                    interaction.data = { ...(interaction.data ?? {}), audio_url: url };
                  }),
                })}
              </div>

              <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Câu hỏi sau khi nghe xong âm thanh</p>
                  <p className="mt-1 text-sm text-slate-500">Phần này được mở tự động sau khi hotspot audio kết thúc.</p>
                </div>
                <Input
                  label="Câu hỏi trắc nghiệm"
                  value={hotspotQuizInteraction?.prompt ?? ''}
                  disabled={readOnly}
                  onChange={(event) => updateSelectedScene((scene) => {
                    const interactions = ensureInteractions(scene);
                    const interaction = interactions.find((item) => item.id === hotspotQuizInteraction?.id);
                    if (!interaction) return;
                    interaction.prompt = event.target.value;
                  })}
                />
                {renderChoiceEditor(selectedScene, hotspotQuizInteraction, 'Cảnh hotspot này chưa có câu hỏi nối tiếp.')}
              </div>
            </>
          )}

          {(selectedScene.type === 'branching' || selectedScene.type === 'quiz') && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {renderMediaField({
                  fieldKey: `${selectedScene.id}:image`,
                  label: 'Ảnh minh họa',
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
                  fieldKey: `${selectedScene.id}:video`,
                  label: 'Video của cảnh',
                  url: getStringFromContent(selectedScene, 'video_url'),
                  accept: 'video/*',
                  subDir: 'interactive-books',
                  kind: 'video',
                  description: 'Nếu có video, trình phát sẽ ưu tiên dùng video thay cho ảnh tĩnh.',
                  disabled: readOnly,
                  onChange: (url) => updateSelectedScene((scene) => {
                    ensureContentRecord(scene).video_url = url;
                  }),
                })}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {renderMediaField({
                  fieldKey: `${selectedScene.id}:poster`,
                  label: 'Ảnh poster cho video',
                  url: getStringFromContent(selectedScene, 'poster_url'),
                  accept: 'image/*',
                  subDir: 'interactive-books',
                  kind: 'image',
                  disabled: readOnly,
                  onChange: (url) => updateSelectedScene((scene) => {
                    ensureContentRecord(scene).poster_url = url;
                  }),
                })}
                {renderMediaField({
                  fieldKey: `${selectedScene.id}:background-audio`,
                  label: 'Âm thanh nền hoặc lời dẫn',
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
                  checked={getBooleanFromContent(selectedScene, 'wait_for_media_end')}
                  disabled={readOnly}
                  onChange={(event) => updateSelectedScene((scene) => {
                    ensureContentRecord(scene).wait_for_media_end = event.target.checked;
                  })}
                />
                Chỉ hiện câu hỏi sau khi video hoặc âm thanh của cảnh kết thúc
              </label>

              <p className="text-sm text-slate-500">
                Nếu không bật tùy chọn này, câu hỏi sẽ hiện ngay khi vào cảnh. Nếu bật, người học xem xong media rồi mới thấy câu hỏi.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Thông điệp mặc định khi trả lời sai"
                  value={typeof branchingInteraction?.data?.wrong_feedback_message === 'string' ? branchingInteraction.data.wrong_feedback_message : ''}
                  disabled={readOnly}
                  onChange={(event) => updateSelectedScene((scene) => {
                    const interactions = ensureInteractions(scene);
                    const interaction = interactions.find((item) => item.id === branchingInteraction?.id);
                    if (!interaction) return;
                    interaction.data = { ...(interaction.data ?? {}), wrong_feedback_message: event.target.value };
                  })}
                  placeholder="Ví dụ: Câu trả lời này chưa đúng."
                />
                <Input
                  label="Thông điệp mặc định khi trả lời đúng"
                  value={typeof branchingInteraction?.data?.correct_feedback_message === 'string' ? branchingInteraction.data.correct_feedback_message : ''}
                  disabled={readOnly}
                  onChange={(event) => updateSelectedScene((scene) => {
                    const interactions = ensureInteractions(scene);
                    const interaction = interactions.find((item) => item.id === branchingInteraction?.id);
                    if (!interaction) return;
                    interaction.data = { ...(interaction.data ?? {}), correct_feedback_message: event.target.value };
                  })}
                  placeholder="Ví dụ: Chính xác, em tiếp tục nhé."
                />
              </div>

              <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <Input
                  label="Câu hỏi hoặc lời dẫn"
                  value={branchingInteraction?.prompt ?? ''}
                  disabled={readOnly}
                  onChange={(event) => updateSelectedScene((scene) => {
                    const interactions = ensureInteractions(scene);
                    const interaction = interactions.find((item) => item.id === branchingInteraction?.id);
                    if (!interaction) return;
                    interaction.prompt = event.target.value;
                  })}
                />
                {renderChoiceEditor(
                  selectedScene,
                  branchingInteraction,
                  'Cảnh này chưa có lựa chọn. Giáo viên có thể bổ sung trong phần JSON nâng cao nếu cần cấu trúc phức tạp hơn.',
                )}
              </div>
            </>
          )}

          {selectedScene.type === 'slideshow' && (
            <div className="space-y-4">
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
                  <Button type="button" variant="secondary" onClick={handleSaveDraft} isLoading={saving}>
                    <Save className="mr-1.5 h-4 w-4" /> Lưu bản nháp
                  </Button>
                  <Button type="button" onClick={handlePublish} isLoading={publishing}>
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
                      } catch {
                        alert('Không thể tải ảnh bìa.');
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
                      } catch {
                        alert('Không thể tải tư liệu.');
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
