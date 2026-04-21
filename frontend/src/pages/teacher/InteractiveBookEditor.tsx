import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Copy,
  Eye,
  Loader2,
  PlusCircle,
  Rocket,
  Save,
} from 'lucide-react';

import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import InteractiveBookPlayer from '@/components/interactive-book/InteractiveBookPlayer';
import InteractiveBookEditorLayout from '@/components/interactive-book/editor/InteractiveBookEditorLayout';
import InteractiveBookStepGeneral from '@/components/interactive-book/editor/InteractiveBookStepGeneral';
import InteractiveBookStepReview, { type ReviewProgressItem } from '@/components/interactive-book/editor/InteractiveBookStepReview';
import InteractiveBookStepScenes from '@/components/interactive-book/editor/InteractiveBookStepScenes';
import InteractiveBookStepWorkspace from '@/components/interactive-book/editor/InteractiveBookStepWorkspace';
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
  InteractiveScene,
  InteractiveSceneType,
} from '@/types';
import { GRADES, SUBJECTS } from '@/utils/constants';
import { INTERACTIVE_BOOK_EDITOR_STEPS, type EditorStepKey } from '@/utils/interactiveBookEditorLabels';
import {
  DEFAULT_MANIFEST_TEXT,
  SCENE_CREATION_OPTIONS,
  cloneManifest,
  collectManifestWarnings,
  convertLegacySceneToUnifiedMedia,
  createDefaultScene,
  duplicateSceneWithNewIds,
  ensureContentRecord,
  ensureInteractions,
  getAssetKindFromFile,
  getSceneReadiness,
  isManifestCandidate,
  isUnifiedMediaScene,
  sceneTypeMeta,
  stringifyManifest,
  type AssetTargetKey,
  type FormState,
  type UploadedAssetItem,
} from '@/utils/interactiveBookEditorHelpers';
import { validateInteractiveBookFlow } from '@/utils/interactiveBookFlow';

export default function InteractiveBookEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const isNew = !id;
  const isPreviewMode = searchParams.get('mode') === 'preview';

  const [activeStep, setActiveStep] = useState<EditorStepKey>('general');
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
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
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
  const flowBlockingSceneIds = useMemo(
    () => new Set(blockingFlowErrors.map((issue) => issue.sceneId).filter((item): item is string => Boolean(item))),
    [blockingFlowErrors],
  );
  const flowWarningSceneIds = useMemo(
    () => new Set(flowWarnings.map((issue) => issue.sceneId).filter((item): item is string => Boolean(item))),
    [flowWarnings],
  );

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

  const readySceneCount = useMemo(() => {
    if (!previewManifest) return 0;
    return previewManifest.scenes.filter((scene) => getSceneReadiness(scene, previewManifest, flowValidation).tone === 'ready').length;
  }, [flowValidation, previewManifest]);

  const progressItems = useMemo<ReviewProgressItem[]>(() => {
    const hasValidEntry = Boolean(previewManifest?.scenes.some((scene) => scene.id === previewManifest.entry_scene_id));
    const hasSceneContent = Boolean(previewManifest && readySceneCount === previewManifest.scenes.length && previewManifest.scenes.length > 0);
    return [
      {
        id: 'title',
        label: 'Đã đặt tên sách',
        done: Boolean(form.title.trim()),
        hint: 'Tên sách giúp giáo viên và học sinh dễ nhận diện trong thư viện.',
      },
      {
        id: 'cover',
        label: 'Đã có ảnh bìa',
        done: Boolean(form.thumbnail_url),
        hint: 'Ảnh bìa giúp phân biệt sách khi gán vào lớp hoặc tìm trong thư viện.',
      },
      {
        id: 'entry',
        label: 'Đã chọn cảnh bắt đầu',
        done: hasValidEntry,
        hint: 'Bài học cần có điểm vào rõ ràng để học sinh không bị kẹt ngay từ đầu.',
      },
      {
        id: 'scene-count',
        label: 'Đã có ít nhất một cảnh',
        done: Boolean(previewManifest && previewManifest.scenes.length > 0),
      },
      {
        id: 'scene-content',
        label: 'Các cảnh đã có nội dung tối thiểu',
        done: hasSceneContent,
        hint: previewManifest ? `${readySceneCount}/${previewManifest.scenes.length} cảnh đang ở trạng thái đã ổn.` : undefined,
      },
      {
        id: 'flow',
        label: 'Không còn lỗi chặn luồng học',
        done: !hasBlockingFlowErrors,
        hint: hasBlockingFlowErrors ? 'Cần sửa các lỗi luồng học trước khi phát hành.' : 'Luồng học đã có đường đi tới đích.',
      },
    ];
  }, [form.thumbnail_url, form.title, hasBlockingFlowErrors, previewManifest, readySceneCount]);

  const stepMeta = useMemo(() => {
    const hasValidEntry = Boolean(previewManifest?.scenes.some((scene) => scene.id === previewManifest.entry_scene_id));
    return {
      general: {
        badgeLabel: form.title.trim() && form.thumbnail_url ? 'Đã nhập' : 'Cần bổ sung',
        badgeVariant: form.title.trim() && form.thumbnail_url ? 'mint' : 'yellow',
      },
      scenes: {
        badgeLabel: previewManifest && previewManifest.scenes.length > 0 && hasValidEntry ? 'Đã đủ' : 'Thiếu',
        badgeVariant: previewManifest && previewManifest.scenes.length > 0 && hasValidEntry ? 'mint' : 'yellow',
      },
      workspace: {
        badgeLabel: previewManifest ? `${readySceneCount}/${previewManifest.scenes.length} ổn` : 'Chưa có',
        badgeVariant: previewManifest && readySceneCount === previewManifest.scenes.length && readySceneCount > 0 ? 'mint' : 'blue',
      },
      review: {
        badgeLabel: hasBlockingFlowErrors ? 'Có lỗi chặn' : 'Sẵn sàng',
        badgeVariant: hasBlockingFlowErrors ? 'red' : 'mint',
      },
    } satisfies Record<EditorStepKey, { badgeLabel: string; badgeVariant: 'blue' | 'pink' | 'purple' | 'mint' | 'yellow' | 'gray' | 'red' }>;
  }, [form.thumbnail_url, form.title, hasBlockingFlowErrors, previewManifest, readySceneCount]);

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
    setMessage(`Đã gắn tư liệu vào cảnh "${selectedScene.title || selectedScene.id}".`);
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
      setActiveStep('workspace');
    });
    setMessage(`Đã thêm cảnh mới: ${sceneTypeMeta(sceneType).label}.`);
  };

  const duplicateScene = (sceneId: string) => {
    if (!previewManifest || readOnly) return;
    let duplicatedId = '';
    applyManifestUpdate((draft) => {
      const sourceScene = draft.scenes.find((scene) => scene.id === sceneId);
      if (!sourceScene) return;
      const duplicate = duplicateSceneWithNewIds(sourceScene, new Set(draft.scenes.map((scene) => scene.id)));
      const sourceIndex = draft.scenes.findIndex((scene) => scene.id === sceneId);
      draft.scenes.splice(sourceIndex + 1, 0, duplicate);
      duplicatedId = duplicate.id;
    });
    if (duplicatedId) {
      setSelectedSceneId(duplicatedId);
      setActiveStep('scenes');
      setMessage('Đã nhân bản cảnh hiện tại.');
    }
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

  const renameScene = (sceneId: string, title: string) => {
    applyManifestUpdate((draft) => {
      const scene = draft.scenes.find((item) => item.id === sceneId);
      if (!scene) return;
      scene.title = title;
    });
  };

  const parseManifestOrThrow = () => {
    try {
      const parsed = JSON.parse(manifestText) as unknown;
      if (!isManifestCandidate(parsed)) {
        throw new Error('Manifest cần có entry_scene_id và danh sách scenes[].');
      }
      const syncedManifest = parsed as InteractiveBookManifest;
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
      await persistDraft();
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

  const handleUploadCover = async (file: File) => {
    setUploadingThumbnail(true);
    try {
      const url = await uploadFile(file, 'thumbnails');
      setForm((current) => ({ ...current, thumbnail_url: url }));
    } catch (error: any) {
      alert(getUploadErrorMessage(error, 'Không thể tải ảnh bìa.'));
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleUploadSceneAsset = async (file: File) => {
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
    }
  };

  const handleSelectSceneFromReview = (sceneId: string) => {
    setSelectedSceneId(sceneId);
    setActiveStep('workspace');
  };

  const renderActiveStep = () => {
    if (activeStep === 'general') {
      return (
        <InteractiveBookStepGeneral
          form={form}
          readOnly={readOnly}
          previewManifest={previewManifest}
          onFormChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
          onUploadCover={handleUploadCover}
          onChangeCoverUrl={(url) => setForm((current) => ({ ...current, thumbnail_url: url }))}
          coverUploading={uploadingThumbnail}
        />
      );
    }

    if (!previewManifest) {
      return (
        <div className="rounded-[28px] border border-dashed border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          Hệ thống chưa đọc được manifest hiện tại. Hãy sang bước “Kiểm tra và phát hành” để mở chỉnh sửa nâng cao.
        </div>
      );
    }

    if (activeStep === 'scenes') {
      return (
        <InteractiveBookStepScenes
          previewManifest={previewManifest}
          selectedSceneId={selectedSceneId}
          readOnly={readOnly}
          draggingSceneId={draggingSceneId}
          newSceneType={newSceneType}
          availableSceneTypes={availableSceneTypes}
          sceneTypeCounts={sceneTypeCounts}
          flowBlockingSceneIds={flowBlockingSceneIds}
          flowWarningSceneIds={flowWarningSceneIds}
          onSelectedSceneChange={setSelectedSceneId}
          onDraggingSceneChange={setDraggingSceneId}
          onNewSceneTypeChange={setNewSceneType}
          onAddScene={addScene}
          onReorderScenes={reorderScenes}
          onDuplicateScene={duplicateScene}
          onRenameScene={renameScene}
          onEntrySceneChange={(sceneId) => applyManifestUpdate((draft) => {
            draft.entry_scene_id = sceneId;
          })}
        />
      );
    }

    if (activeStep === 'workspace') {
      return (
        <InteractiveBookStepWorkspace
          previewManifest={previewManifest}
          selectedScene={selectedScene}
          selectedSceneId={selectedSceneId}
          selectedLayerId={selectedLayerId}
          readOnly={readOnly}
          draggingSceneId={draggingSceneId}
          uploadingAsset={uploadingAsset}
          uploadingFieldKey={uploadingFieldKey}
          linkEditorByField={linkEditorByField}
          assetLibrary={assetLibrary}
          flowBlockingSceneIds={flowBlockingSceneIds}
          flowWarningSceneIds={flowWarningSceneIds}
          onSelectedSceneChange={setSelectedSceneId}
          onSelectedLayerChange={setSelectedLayerId}
          onDraggingSceneChange={setDraggingSceneId}
          onReorderScenes={reorderScenes}
          onDuplicateScene={duplicateScene}
          onToggleLinkEditor={setLinkEditorVisible}
          onInlineUpload={handleInlineUpload}
          onUploadSceneAsset={handleUploadSceneAsset}
          onApplyAssetToScene={applyAssetToSelectedScene}
          updateSelectedScene={updateSelectedScene}
          updateSelectedUnifiedMediaScene={updateSelectedUnifiedMediaScene}
          moveSelectedScene={moveSelectedScene}
          removeSelectedScene={removeSelectedScene}
        />
      );
    }

    return (
      <InteractiveBookStepReview
        previewManifest={previewManifest}
        readOnly={readOnly}
        manifestWarnings={manifestWarnings}
        flowValidation={flowValidation}
        hasBlockingFlowErrors={hasBlockingFlowErrors}
        progressItems={progressItems}
        showAdvancedTools={showAdvancedTools}
        manifestText={manifestText}
        manifestError={manifestError}
        saving={saving}
        publishing={publishing}
        canAssignToClass={Boolean(bundle && bundle.interactive_book.status === 'published')}
        reportLoading={reportLoading}
        reportError={reportError}
        report={report}
        onOpenPreview={openPreviewMode}
        onSelectScene={handleSelectSceneFromReview}
        onToggleAdvancedTools={() => setShowAdvancedTools((current) => !current)}
        onManifestTextChange={(text) => {
          setManifestText(text);
          if (manifestError) setManifestError(null);
        }}
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
        onOpenAssignToClass={handleOpenAssignToClass}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isPreviewMode) {
    return (
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <button type="button" onClick={() => navigate(-1)} className="mt-1 text-slate-400 hover:text-slate-700">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Xem thử sách tương tác</h1>
            <p className="mt-1 text-sm text-slate-500">
              Chế độ này dùng cùng trình phát mà học sinh sẽ trải nghiệm. Thoát xem thử để quay lại biên soạn.
            </p>
          </div>
        </div>

        <section className="space-y-6">
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            Chế độ xem thử sử dụng cùng runtime mà học sinh sẽ thấy khi học. Thoát xem thử để tiếp tục biên soạn nội dung.
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={closePreviewMode}>
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Rời chế độ xem thử
            </Button>
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
      </div>
    );
  }

  const pageTitle = isNew
    ? 'Tạo sách tương tác'
    : readOnly
      ? 'Xem sách tương tác'
      : 'Biên soạn sách tương tác';
  const pageDescription = 'Giao diện mới chia theo từng bước để giáo viên tập trung vào đúng việc ở từng thời điểm. Các công cụ nâng cao được chuyển xuống bước kiểm tra.';

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <button type="button" onClick={() => navigate(-1)} className="mt-1 text-slate-400 hover:text-slate-700">
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1 space-y-6">
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

          <InteractiveBookEditorLayout
            title={pageTitle}
            description={pageDescription}
            steps={INTERACTIVE_BOOK_EDITOR_STEPS}
            activeStep={activeStep}
            onStepChange={setActiveStep}
            stepMeta={stepMeta}
            actions={(
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
                  setActiveStep('scenes');
                }}>
                  <Copy className="mr-1.5 h-4 w-4" /> Nạp mẫu
                </Button>
                {!readOnly && (
                  <Button type="button" variant="secondary" onClick={handleSaveDraft} isLoading={saving} disabled={hasBlockingFlowErrors}>
                    <Save className="mr-1.5 h-4 w-4" /> Lưu bản nháp
                  </Button>
                )}
                {!readOnly && activeStep === 'review' && (
                  <Button type="button" onClick={handlePublish} isLoading={publishing} disabled={hasBlockingFlowErrors}>
                    <Rocket className="mr-1.5 h-4 w-4" /> Phát hành
                  </Button>
                )}
              </>
            )}
          >
            {renderActiveStep()}
          </InteractiveBookEditorLayout>
        </div>
      </div>

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
