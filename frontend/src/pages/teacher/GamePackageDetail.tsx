import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  EyeOff,
  Globe2,
  Layers3,
  Loader2,
  PlayCircle,
  Plus,
  Save,
  Sparkles,
  Trophy,
  Trash2,
  UploadCloud,
  BarChart3,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import GameEditorLayout, { GameEditorStepDefinition } from '@/components/games/editor/GameEditorLayout';
import GameQuestionEditor from '@/components/games/GameQuestionEditor';
import MemoryCardPairEditor from '@/components/games/MemoryCardPairEditor';
import TeacherGamePreviewModal from '@/components/games/TeacherGamePreviewModal';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import {
  GAME_DIFFICULTY_BANDS,
  getBandMeta,
  getDistributionModeLabel,
  getLevelDistributionLabel,
  getQuestionPlanPreview,
} from '@/features/games/helpers';
import api from '@/services/api';
import { gameService } from '@/services/game.service';
import { showErrorToast, showSuccessToast } from '@/store/toast.store';
import type {
  DifficultyBand,
  GameLeaderboardResponse,
  GamePackage,
  Question,
  QuestionTypeValue,
} from '@/types';
import { generateId } from '@/utils/helpers';

function unwrapApiData<T>(response: { data?: { data?: T } & T }): T {
  return (response.data?.data ?? response.data) as T;
}

function createEmptyQuestion(
  band: DifficultyBand,
  type: QuestionTypeValue,
  orderIndex: number,
  points: number = 1,
): Question {
  const buildDefaultOptions = () => [
    { id: generateId(), content: 'Đáp án A', is_correct: true },
    { id: generateId(), content: 'Đáp án B', is_correct: false },
  ];

  const buildDefaultPairs = () => [
    { id: generateId(), left_text: '', right_text: '' },
    { id: generateId(), left_text: '', right_text: '' },
  ];

  const buildDefaultTextConfig = () => ({
    input_variant: 'short_text' as const,
    grading_mode: 'normalized_exact' as const,
    min_length: null,
    max_length: 160,
    case_sensitive: false,
    accent_sensitive: false,
    trim_whitespace: true,
    ignore_punctuation: true,
    manual_grading_required: false,
    accepted_answers: [''],
    keywords: [] as string[],
  });

  const baseQuestion = {
    id: generateId(),
    package_id: '',
    content: 'Câu hỏi mới',
    instruction: '',
    explanation: '',
    difficulty_band: band,
    points,
    required: true,
    order_index: orderIndex,
  };

  switch (type) {
    case 'single_choice':
    case 'multi_choice':
      return {
        ...baseQuestion,
        type,
        options: buildDefaultOptions(),
        matching_pairs: [],
        text_config: null,
      };
    case 'matching':
      return {
        ...baseQuestion,
        type: 'matching',
        options: [],
        matching_pairs: buildDefaultPairs(),
        text_config: null,
      };
    case 'text':
    default:
      return {
        ...baseQuestion,
        type: 'text',
        options: [],
        matching_pairs: [],
        text_config: buildDefaultTextConfig(),
      };
  }
}

function toQuestionPayload(question: Question, orderIndex: number) {
  const normalizeMultilineValues = (values?: string[]) => (values ?? [])
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return {
    type: question.type,
    content: question.content,
    instruction: question.instruction || undefined,
    explanation: question.explanation || undefined,
    difficulty_band: question.difficulty_band ?? null,
    points: question.points,
    required: question.required,
    order_index: orderIndex,
    options: (question.options ?? []).map((option) => ({
      content: option.content,
      is_correct: option.is_correct,
    })),
    matching_pairs: (question.matching_pairs ?? []).map((pair) => ({
      left_text: pair.left_text,
      right_text: pair.right_text,
      correct_match: pair.right_text,
    })),
    text_config: question.text_config
      ? {
          input_variant: question.text_config.input_variant,
          grading_mode: question.text_config.grading_mode,
          min_length: question.text_config.min_length ?? null,
          max_length: question.text_config.max_length ?? null,
          case_sensitive: question.text_config.case_sensitive ?? false,
          accent_sensitive: question.text_config.accent_sensitive ?? false,
          trim_whitespace: question.text_config.trim_whitespace ?? true,
          ignore_punctuation: question.text_config.ignore_punctuation ?? true,
          accepted_answers: normalizeMultilineValues(question.text_config.accepted_answers),
          keywords: normalizeMultilineValues(question.text_config.keywords),
        }
      : null,
  };
}

const EDITOR_STEPS: GameEditorStepDefinition[] = [
  { key: 'overview', label: 'Tổng quan', description: 'Thông tin gói trò chơi & bộ câu hỏi' },
  { key: 'questions', label: 'Câu hỏi', description: 'Danh sách & chỉnh sửa câu hỏi' },
  { key: 'results', label: 'Kết quả', description: 'Thống kê & điểm số học sinh' },
];

type EditorStepKey = typeof EDITOR_STEPS[number]['key'];

const DEFAULT_QUESTION_TYPE: QuestionTypeValue = 'single_choice';

export default function TeacherGamePackageDetail() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const [gamePackage, setGamePackage] = useState<GamePackage | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pendingQuestions, setPendingQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [leaderboard, setLeaderboard] = useState<GameLeaderboardResponse | null>(null);
  const [activeBand, setActiveBand] = useState<DifficultyBand>('recognition');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  // Memory card custom images
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [cardBackImageUrl, setCardBackImageUrl] = useState('');
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [uploadingCardBack, setUploadingCardBack] = useState(false);

  // Memory card pair count
  const [memoryCardPairCount, setMemoryCardPairCount] = useState(0);

  // Unpublish confirmation modal
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);

  // Leaderboard data for results tab
  const [leaderboardFull, setLeaderboardFull] = useState<GameLeaderboardResponse | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<GameLeaderboardResponse['entries'][0] | null>(null);
  const [studentStats, setStudentStats] = useState<any>(null);
  const [loadingStudentStats, setLoadingStudentStats] = useState(false);

  // Tab state
  const [activeStep, setActiveStep] = useState<EditorStepKey>('overview');

  // Ref for scroll detection at bottom of questions list
  const questionsListRef = useRef<HTMLDivElement>(null);
  const [showStickyAddButton, setShowStickyAddButton] = useState(false);
  const newQuestionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    if (!packageId) {
      setLoading(false);
      return;
    }

    Promise.all([
      gameService.getGamePackage(packageId),
      gameService.getGamePackageQuestions(packageId),
      gameService.getGameLeaderboard(packageId, { limit: 5 }).catch(() => null),
    ])
      .then(([packageResponse, questionsResponse, leaderboardResponse]) => {
        if (cancelled) return;
        const packageData = unwrapApiData<GamePackage>(packageResponse);
        const questionItems = unwrapApiData<Question[]>(questionsResponse) ?? [];
        setGamePackage(packageData);
        setQuestions(questionItems);
        setTitle(packageData.title);
        setDescription(packageData.description || '');
        setThumbnailUrl(packageData.thumbnail_url || '');
        // Load Memory Card specific settings from runtime_config
        const packageIsMemoryCard = packageData.game_module?.slug === 'memory-card';
        if (packageIsMemoryCard) {
          const rc = packageData.runtime_config as Record<string, unknown> | null;
          setBackgroundImageUrl((rc?.background_image_url as string) || '');
          setCardBackImageUrl((rc?.card_back_image_url as string) || '');
        }
        if (leaderboardResponse) {
          setLeaderboard(unwrapApiData<GameLeaderboardResponse>(leaderboardResponse));
        }
      })
      .catch(() => {
        if (cancelled) return;
        showErrorToast('Không thể tải chi tiết gói trò chơi.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [packageId]);

  const orderedQuestions = useMemo(
    () => GAME_DIFFICULTY_BANDS.flatMap((band) => (
      questions
        .filter((question) => question.difficulty_band === band)
        .sort((left, right) => left.order_index - right.order_index)
    )),
    [questions],
  );

  const questionsByBand = useMemo(() => (
    GAME_DIFFICULTY_BANDS.reduce<Record<DifficultyBand, Question[]>>((accumulator, band) => {
      const saved = questions
        .filter((question) => question.difficulty_band === band)
        .sort((left, right) => left.order_index - right.order_index);
      const pending = pendingQuestions
        .filter((question) => question.difficulty_band === band);
      accumulator[band] = [...saved, ...pending];
      return accumulator;
    }, {
      recognition: [],
      comprehension: [],
      application_basic: [],
      application_advanced: [],
    })
  ), [questions, pendingQuestions]);

  // Current band's questions (questionsByBand already includes pending)
  const currentBandQuestions = questionsByBand[activeBand];

  const questionPlanPreview = getQuestionPlanPreview(gamePackage);
  const levelDistributionLabel = getLevelDistributionLabel(gamePackage);
  const classLink = gamePackage?.class_id
    ?? gamePackage?.assignment?.class_id
    ?? gamePackage?.assignments?.[0]?.class_id
    ?? null;
  const gameModuleName = gamePackage?.game_module?.title || 'Trò chơi';
  const hasQuestionDistribution = gamePackage?.game_module?.slug !== undefined;
  const goldMinerPackage = gamePackage?.game_module?.slug === 'gold-miner' ||
    gamePackage?.game_module_id === 'gold-miner';
  const isMemoryCard = gamePackage?.game_module?.slug === 'memory-card';

  // Calculate step meta
  const totalQuestions = isMemoryCard
    ? memoryCardPairCount
    : questions.length + pendingQuestions.length;
  const stepMeta = useMemo(() => ({
    overview: {
      badgeLabel: totalQuestions > 0 ? `${totalQuestions} cặp` : 'Chưa có',
      badgeVariant: totalQuestions > 0 ? 'mint' as const : 'yellow' as const,
    },
    questions: {
      badgeLabel: isMemoryCard
        ? `${memoryCardPairCount} cặp`
        : `${currentBandQuestions.length} câu hiện tại`,
      badgeVariant: (isMemoryCard ? memoryCardPairCount : currentBandQuestions.length) > 0 ? 'mint' as const : 'yellow' as const,
    },
    results: {
      badgeLabel: leaderboard?.total_entries ? `${leaderboard.total_entries} học sinh` : 'Chưa có',
      badgeVariant: (leaderboard?.total_entries ?? 0) > 0 ? 'mint' as const : 'yellow' as const,
    },
  }), [totalQuestions, memoryCardPairCount, isMemoryCard, currentBandQuestions.length, leaderboard]);

  // Fetch full leaderboard when switching to results tab
  useEffect(() => {
    if (activeStep === 'results' && packageId && !leaderboardFull) {
      gameService.getGameLeaderboard(packageId, { limit: 100 })
        .then((res) => {
          setLeaderboardFull(unwrapApiData<GameLeaderboardResponse>(res));
        })
        .catch(() => {
          showErrorToast('Không thể tải kết quả học sinh.');
        });
    }
  }, [activeStep, packageId, leaderboardFull]);

  // Scroll detection for sticky button
  useEffect(() => {
    const handleScroll = () => {
      if (!questionsListRef.current) return;
      const { scrollTop, scrollHeight, clientHeight } = questionsListRef.current;
      setShowStickyAddButton(scrollHeight - scrollTop - clientHeight < 150);
    };

    const listElement = questionsListRef.current;
    if (listElement) {
      listElement.addEventListener('scroll', handleScroll);
      return () => listElement.removeEventListener('scroll', handleScroll);
    }
  }, [questions, pendingQuestions]);

  const handleThumbnailUpload = async (file: File) => {
    setUploadingThumbnail(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/upload?sub_dir=thumbnails', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedUrl = response.data?.data?.url;
      if (!uploadedUrl) {
        throw new Error('Upload response is missing url');
      }
      setThumbnailUrl(uploadedUrl);
      showSuccessToast('Đã tải ảnh đại diện.');
    } catch {
      showErrorToast('Không thể tải ảnh đại diện.');
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleBackgroundUpload = async (file: File) => {
    setUploadingBackground(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/upload?sub_dir=backgrounds', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedUrl = response.data?.data?.url;
      if (!uploadedUrl) {
        throw new Error('Upload response is missing url');
      }
      setBackgroundImageUrl(uploadedUrl);
      showSuccessToast('Đã tải ảnh nền.');
    } catch {
      showErrorToast('Không thể tải ảnh nền.');
    } finally {
      setUploadingBackground(false);
    }
  };

  const handleCardBackUpload = async (file: File) => {
    setUploadingCardBack(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/upload?sub_dir=card-backs', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedUrl = response.data?.data?.url;
      if (!uploadedUrl) {
        throw new Error('Upload response is missing url');
      }
      setCardBackImageUrl(uploadedUrl);
      showSuccessToast('Đã tải ảnh mặt lưng thẻ.');
    } catch {
      showErrorToast('Không thể tải ảnh mặt lưng thẻ.');
    } finally {
      setUploadingCardBack(false);
    }
  };

  const handleSaveMeta = async () => {
    if (!packageId || !gamePackage || uploadingThumbnail) return;

    setSavingMeta(true);
    try {
      const saveIsMemoryCard = gamePackage?.game_module?.slug === 'memory-card';
      const updatePayload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || undefined,
        thumbnail_url: thumbnailUrl.trim() || undefined,
      };
      // Add Memory Card specific settings
      if (saveIsMemoryCard) {
        updatePayload.background_image_url = backgroundImageUrl.trim() || undefined;
        updatePayload.card_back_image_url = cardBackImageUrl.trim() || undefined;
      }
      const response = await gameService.updateGamePackage(packageId, updatePayload);
      const updatedPackage = unwrapApiData<GamePackage>(response);
      setGamePackage(updatedPackage);
      showSuccessToast('Đã lưu thông tin gói trò chơi.');
    } catch {
      showErrorToast('Không thể cập nhật gói trò chơi.');
    } finally {
      setSavingMeta(false);
    }
  };

  const handleToggleHubPublication = async () => {
    if (!packageId || !gamePackage) return;

    // If unpublishing, show confirmation first
    if (gamePackage.published_to_hub) {
      setShowUnpublishConfirm(true);
      return;
    }

    // Publish directly
    setPublishing(true);
    try {
      const response = await gameService.updateGamePackagePublication(packageId, {
        published: true,
        visibility: gamePackage.hub_publication?.visibility === 'unlisted' ? 'unlisted' : 'public',
        featured: gamePackage.hub_publication?.featured ?? false,
        sort_order: gamePackage.hub_publication?.sort_order ?? 0,
        metadata_json: gamePackage.hub_publication?.metadata_json ?? null,
      });
      const updatedPackage = unwrapApiData<GamePackage>(response);
      setGamePackage(updatedPackage);
      showSuccessToast('Đã publish trò chơi lên Game Hub.');
    } catch {
      showErrorToast('Không thể cập nhật trạng thái publish.');
    } finally {
      setPublishing(false);
    }
  };

  const handleConfirmUnpublish = async () => {
    if (!packageId || !gamePackage) return;
    setShowUnpublishConfirm(false);
    setPublishing(true);
    try {
      const response = await gameService.updateGamePackagePublication(packageId, {
        published: false,
        visibility: gamePackage.hub_publication?.visibility === 'unlisted' ? 'unlisted' : 'public',
        featured: gamePackage.hub_publication?.featured ?? false,
        sort_order: gamePackage.hub_publication?.sort_order ?? 0,
        metadata_json: gamePackage.hub_publication?.metadata_json ?? null,
      });
      const updatedPackage = unwrapApiData<GamePackage>(response);
      setGamePackage(updatedPackage);
      showSuccessToast('Đã gỡ trò chơi khỏi Game Hub.');
    } catch {
      showErrorToast('Không thể cập nhật trạng thái publish.');
    } finally {
      setPublishing(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!packageId) return;

    try {
      // Create pending question locally first
      const orderIndex = orderedQuestions.length + pendingQuestions.length;
      const newQuestion = createEmptyQuestion(activeBand, DEFAULT_QUESTION_TYPE, orderIndex, 1);

      // Add to pending questions (will be saved when user clicks "Lưu bộ câu hỏi")
      setPendingQuestions((current) => [...current, newQuestion]);

      // Switch to questions tab
      setActiveStep('questions');

      // Scroll to bottom after render
      setTimeout(() => {
        if (questionsListRef.current) {
          questionsListRef.current.scrollTop = questionsListRef.current.scrollHeight;
        }
      }, 100);
    } catch {
      showErrorToast('Không thể tạo câu hỏi mới.');
    }
  };

  const handleUpdatePendingQuestion = (questionId: string, updatedQuestion: Question) => {
    setPendingQuestions((current) =>
      current.map((q) => q.id === questionId ? updatedQuestion : q)
    );
  };

  const handleDeletePendingQuestion = (questionId: string) => {
    setPendingQuestions((current) => current.filter((q) => q.id !== questionId));
  };

  const handleSaveQuestions = async () => {
    if (!packageId) return;

    setSavingQuestions(true);
    try {
      // Save pending questions first
      for (const question of pendingQuestions) {
        const orderIndex = orderedQuestions.length + pendingQuestions.indexOf(question);
        await gameService.createGamePackageQuestion(
          packageId,
          toQuestionPayload(question, orderIndex),
        );
      }

      // Update existing questions
      for (const [index, question] of orderedQuestions.entries()) {
        await gameService.updateGameQuestion(question.id, toQuestionPayload(question, index));
      }

      // Reload questions from server
      const questionsResponse = await gameService.getGamePackageQuestions(packageId);
      const questionItems = unwrapApiData<Question[]>(questionsResponse) ?? [];
      setQuestions(questionItems);
      setPendingQuestions([]);

      showSuccessToast('Đã lưu bộ câu hỏi.');
    } catch {
      showErrorToast('Không thể lưu bộ câu hỏi.');
    } finally {
      setSavingQuestions(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      await gameService.deleteGameQuestion(questionId);
      setQuestions((current) => current.filter((question) => question.id !== questionId));
      showSuccessToast('Đã xóa câu hỏi.');
    } catch {
      showErrorToast('Không thể xóa câu hỏi.');
    }
  };

  const handleDeletePackage = async () => {
    if (!packageId || !window.confirm('Xóa gói trò chơi này? Hành động này không thể hoàn tác.')) {
      return;
    }

    setDeleting(true);
    try {
      await gameService.deleteGamePackage(packageId);
      showSuccessToast('Đã xóa gói trò chơi.');
      navigate(classLink ? `/teacher/classes/${classLink}?tab=games` : '/teacher/games');
    } catch {
      showErrorToast('Không thể xóa gói trò chơi.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!gamePackage) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white px-6 py-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-slate-900">Không tìm thấy gói trò chơi</p>
        <Link to="/teacher/games" className="mt-2 inline-block text-sm font-medium text-primary hover:underline">
          Quay lại danh sách trò chơi
        </Link>
      </div>
    );
  }

  const renderOverviewTab = () => (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
      <div className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Thông tin gói trò chơi</h2>
          <p className="mt-1 text-sm text-slate-500">
            Những nội dung này sẽ hiển thị ở danh sách trò chơi và màn hình trước khi học sinh bắt đầu.
          </p>
        </div>

        <div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Tiêu đề</label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-200"
                placeholder="VD: Memory Card - Từ vựng chủ đề động vật"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Mô tả</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-200"
                placeholder="Mô tả ngắn về mục tiêu học tập và trải nghiệm của học sinh."
              />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <label className="whitespace-nowrap text-sm font-medium text-slate-700">Ảnh đại diện</label>
            <label
              className={`inline-flex h-10 items-center justify-center rounded-2xl border border-primary px-5 text-sm font-medium text-primary transition ${
                uploadingThumbnail ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-primary hover:text-white'
              }`}
            >
              {uploadingThumbnail ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="mr-2 h-4 w-4" />
              )}
              {uploadingThumbnail ? 'Đang tải...' : 'Tải ảnh'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingThumbnail}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  await handleThumbnailUpload(file);
                  event.target.value = '';
                }}
              />
            </label>
          </div>
          {thumbnailUrl && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <img
                src={thumbnailUrl}
                alt="Ảnh đại diện"
                className="h-48 w-full object-cover"
              />
            </div>
          )}

          {/* Memory Card specific settings */}
          {isMemoryCard && (
            <div className="mt-6 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-sm font-semibold text-slate-900">Cài đặt Memory Card</h3>
              
              {/* Background & Card Back Image Upload - Same Row */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Background Image Upload */}
                <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 transition hover:border-primary">
                  <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-xl bg-slate-100">
                    {backgroundImageUrl ? (
                      <img
                        src={backgroundImageUrl}
                        alt="Ảnh nền"
                        className="h-full w-full rounded-xl object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <UploadCloud className="h-10 w-10 text-slate-400" />
                    )}
                  </div>
                  <span className="mb-4 text-sm font-medium text-slate-700">Ảnh nền trò chơi</span>
                  <label
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary px-6 py-2.5 text-sm font-medium text-primary transition ${
                      uploadingBackground ? 'pointer-events-none opacity-50' : 'hover:bg-primary hover:text-white'
                    }`}
                  >
                    {uploadingBackground ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tải...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-4 w-4" />
                        {backgroundImageUrl ? 'Đổi ảnh' : 'Tải ảnh'}
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingBackground}
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        await handleBackgroundUpload(file);
                        event.target.value = '';
                      }}
                    />
                  </label>
                </div>

                {/* Card Back Image Upload */}
                <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 transition hover:border-primary">
                  <div className="mb-4 flex h-24 w-24 items-center justify-center rounded-xl bg-slate-100">
                    {cardBackImageUrl ? (
                      <img
                        src={cardBackImageUrl}
                        alt="Ảnh mặt lưng"
                        className="h-full w-full rounded-xl object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <span className="text-4xl font-bold text-slate-400">?</span>
                    )}
                  </div>
                  <span className="mb-4 text-sm font-medium text-slate-700">Ảnh mặt lưng thẻ</span>
                  <label
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary px-6 py-2.5 text-sm font-medium text-primary transition ${
                      uploadingCardBack ? 'pointer-events-none opacity-50' : 'hover:bg-primary hover:text-white'
                    }`}
                  >
                    {uploadingCardBack ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Đang tải...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="h-4 w-4" />
                        {cardBackImageUrl ? 'Đổi ảnh' : 'Tải ảnh'}
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingCardBack}
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        await handleCardBackUpload(file);
                        event.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          <Layers3 className="h-4 w-4 text-sky-500" />
          Tổng quan bộ câu hỏi
        </div>

        {isMemoryCard ? (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-center">
            <p className="text-sm text-slate-600">
              <span className="text-2xl font-bold text-primary">{memoryCardPairCount}</span>
              <span className="ml-2">cặp thẻ</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Nhấn vào tab "Câu hỏi" để chỉnh sửa các cặp thẻ
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {GAME_DIFFICULTY_BANDS.map((band) => {
              const meta = getBandMeta(band);
              const count = questionsByBand[band].length;

              return (
                <button
                  key={band}
                  type="button"
                  onClick={() => {
                    setActiveBand(band);
                    setActiveStep('questions');
                  }}
                  className={`rounded-3xl border px-4 py-4 text-left transition ${
                    activeBand === band && activeStep === 'questions'
                      ? 'border-primary bg-blue-50 shadow-sm'
                      : `border-slate-200 bg-white hover:border-slate-300 ${meta.accentClass}`
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-900">{meta.label}</span>
                    <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
                      {count}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{meta.description}</p>
                </button>
              );
            })}
          </div>
        )}

        {hasQuestionDistribution && (
          <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">{gameModuleName} sẽ phân phối câu hỏi theo mức độ</p>
            <p className="mt-2 leading-6">
              Giáo viên chỉ cần soạn bộ câu hỏi tổng thể. Hệ thống sẽ tự chia theo từng phần chơi,
              cho phép có mục không kèm câu hỏi nhưng vẫn bảo đảm học sinh làm hết toàn bộ bộ câu hỏi
              khi hoàn thành hết trò chơi.
            </p>
            {questionPlanPreview && (
              <div className="mt-3 grid gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 sm:grid-cols-3">
                <div>
                  <p className="uppercase tracking-[0.16em] text-slate-400">Kiểu phân phối</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {getDistributionModeLabel(questionPlanPreview.distribution_mode)}
                  </p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.16em] text-slate-400">Số màn dự kiến</p>
                  <p className="mt-1 font-semibold text-slate-900">{questionPlanPreview.level_count ?? 1}</p>
                </div>
                <div>
                  <p className="uppercase tracking-[0.16em] text-slate-400">Câu hỏi mỗi màn</p>
                  <p className="mt-1 font-semibold text-slate-900">{levelDistributionLabel}</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-center">
          <p className="text-sm text-slate-600">
            <span className="text-2xl font-bold text-primary">{totalQuestions}</span>
            <span className="ml-2">{isMemoryCard ? 'cặp thẻ' : 'câu hỏi'} trong bộ</span>
          </p>
          {!isMemoryCard && pendingQuestions.length > 0 && (
            <p className="mt-1 text-xs text-amber-600">
              ({pendingQuestions.length} câu hỏi mới chưa lưu)
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            {isMemoryCard
              ? 'Nhấn vào tab "Câu hỏi" để chỉnh sửa các cặp thẻ'
              : 'Nhấn vào mức độ bên trên để chỉnh sửa câu hỏi cụ thể'}
          </p>
        </div>
      </div>
    </div>
  );

  const renderQuestionsTab = () => (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      {isMemoryCard ? (
        <MemoryCardPairEditor packageId={packageId!} onPairCountChange={setMemoryCardPairCount} />
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <select
                  value={activeBand}
                  onChange={(event) => setActiveBand(event.target.value as DifficultyBand)}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-200"
                >
                  {GAME_DIFFICULTY_BANDS.map((band) => {
                    const meta = getBandMeta(band);
                    const count = questionsByBand[band].length;
                    return (
                      <option key={band} value={band}>
                        {meta.label} ({count} câu)
                      </option>
                    );
                  })}
                </select>
                <span className="text-sm text-slate-500">
                  {getBandMeta(activeBand).description}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleAddQuestion}
                className="inline-flex items-center justify-center rounded-button border border-primary px-5 py-2.5 text-sm font-medium text-primary transition hover:bg-primary-lighter"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Thêm câu hỏi
              </button>
              <button
                type="button"
                onClick={handleSaveQuestions}
                disabled={savingQuestions || pendingQuestions.length === 0}
                className="inline-flex items-center justify-center rounded-button bg-primary px-5 py-2.5 text-sm font-medium text-white transition hover:bg-primary-dark disabled:opacity-50"
              >
                {savingQuestions ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Lưu bộ câu hỏi
              </button>
            </div>
          </div>

          <div
            ref={questionsListRef}
            className="max-h-[75vh] space-y-4 overflow-y-auto pr-2 scroll-smooth"
          >
            {questionsByBand[activeBand].length === 0 && pendingQuestions.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                <p className="text-lg font-semibold text-slate-900">Mức độ này chưa có câu hỏi</p>
                <p className="mt-2 text-sm text-slate-500">
                  Nhấn "Thêm câu hỏi" để tạo câu hỏi mới cho mức độ này.
                </p>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="mt-4 inline-flex items-center justify-center rounded-button bg-primary px-6 py-3 text-sm font-medium text-white transition hover:bg-primary-dark"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Thêm câu hỏi đầu tiên
                </button>
              </div>
            ) : (
              <>
                {/* Saved questions - sorted by order_index */}
                {questions
                  .filter((q) => q.difficulty_band === activeBand)
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((question) => (
                    <GameQuestionEditor
                      key={question.id}
                      question={question}
                      index={question.order_index}
                      band={activeBand}
                      onChange={(updatedQuestion) => {
                        setQuestions((current) => current.map((item) => (
                          item.id === updatedQuestion.id ? updatedQuestion : item
                        )));
                      }}
                      onDelete={() => handleDeleteQuestion(question.id)}
                      warnOnManualText={goldMinerPackage}
                    />
                  ))}

                {/* Pending questions - index continues from last saved */}
                {pendingQuestions.map((question, index) => (
                  <div key={question.id} ref={index === pendingQuestions.length - 1 ? newQuestionRef : undefined}>
                    <GameQuestionEditor
                      question={question}
                      index={orderedQuestions.length + index}
                      band={question.difficulty_band ?? activeBand}
                      onChange={(updated) => handleUpdatePendingQuestion(question.id, updated)}
                      onDelete={() => handleDeletePendingQuestion(question.id)}
                      warnOnManualText={goldMinerPackage}
                      highlightNew
                    />
                  </div>
                ))}

                {/* Sticky button at bottom */}
                <div
                  className={`sticky bottom-4 flex justify-center transition-all duration-300 ${
                    showStickyAddButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
                  }`}
                >
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="inline-flex items-center justify-center rounded-full bg-primary px-8 py-4 text-base font-medium text-white shadow-lg transition hover:bg-primary-dark"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Thêm câu hỏi
                  </button>
                </div>
              </>
            )}
          </div>

          {pendingQuestions.length > 0 && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Bạn có <strong>{pendingQuestions.length}</strong> câu hỏi mới chưa lưu. Nhấn "Lưu bộ câu hỏi" để lưu lại.
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderResultsTab = () => (
    <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
        <Trophy className="h-4 w-4 text-amber-500" />
        Kết quả học sinh
      </div>

      {!leaderboardFull && !loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="h-16 w-16 text-slate-300 mb-4" />
          <p className="text-lg font-semibold text-slate-900">Chưa có dữ liệu kết quả</p>
          <p className="mt-2 text-sm text-slate-500 text-center max-w-md">
            Kết quả chơi của học sinh sẽ xuất hiện sau khi có học sinh hoàn thành trò chơi.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Student list */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-slate-700">Danh sách học sinh đã chơi</h3>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
              {leaderboardFull?.entries.map((entry) => (
                <button
                  key={entry.user_id}
                  onClick={() => setSelectedStudent(entry)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    selectedStudent?.user_id === entry.user_id
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                        entry.rank === 1 ? 'bg-amber-100 text-amber-600' :
                        entry.rank === 2 ? 'bg-slate-200 text-slate-600' :
                        entry.rank === 3 ? 'bg-orange-100 text-orange-600' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        #{entry.rank}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{entry.student_name || 'Học sinh'}</p>
                        <p className="text-xs text-slate-500">
                          {entry.attempts_count} lượt chơi • {entry.best_duration_ms ? `${Math.round(entry.best_duration_ms / 1000)}s` : '-'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">{entry.best_score_total ?? 0}</p>
                      <p className="text-xs text-slate-500">điểm cao nhất</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Student detail */}
          <div>
            {selectedStudent ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">{selectedStudent.student_name?.charAt(0) || '?'}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{selectedStudent.student_name || 'Học sinh'}</h3>
                    <p className="text-sm text-slate-500">
                      {selectedStudent.attempts_count} lượt chơi • Xếp hạng #{selectedStudent.rank}
                    </p>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="rounded-xl bg-white p-4 border border-slate-200">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Điểm cao nhất</p>
                    <p className="text-2xl font-bold text-primary">{selectedStudent.best_score_total ?? 0}</p>
                  </div>
                  <div className="rounded-xl bg-white p-4 border border-slate-200">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Thời gian tốt nhất</p>
                    <p className="text-2xl font-bold text-emerald-600">
                      {selectedStudent.best_duration_ms ? `${Math.round(selectedStudent.best_duration_ms / 1000)}s` : '-'}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-4 border border-slate-200">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Điểm kiến thức</p>
                    <p className="text-2xl font-bold text-blue-600">{selectedStudent.best_score_question ?? 0}</p>
                  </div>
                  <div className="rounded-xl bg-white p-4 border border-slate-200">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Điểm ngữ cảnh</p>
                    <p className="text-2xl font-bold text-purple-600">{selectedStudent.best_score_context ?? 0}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <p>Chơi lần cuối: {selectedStudent.last_played_at ? new Date(selectedStudent.last_played_at).toLocaleString('vi-VN') : '-'}</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12">
                <Trophy className="h-12 w-12 text-slate-300 mb-3" />
                <p className="text-sm text-slate-500">Chọn một học sinh để xem chi tiết</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Link to={classLink ? `/teacher/classes/${classLink}?tab=games` : '/teacher/games'} className="mt-1.5 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            <Sparkles className="h-3.5 w-3.5" />
            Quản lý gói trò chơi
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-slate-900">{gamePackage.title}</h1>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {gamePackage.game_module?.title ?? gamePackage.game_module_id ?? 'Trò chơi'}
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
            Soạn bộ câu hỏi theo 4 mức độ từ nhận biết đến vận dụng cao để học sinh vừa chơi vừa học.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center justify-center rounded-button border border-primary bg-primary px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-dark"
          >
            <PlayCircle className="mr-2 h-4 w-4" />
            Xem trước
          </button>
          <button
            type="button"
            onClick={handleSaveMeta}
            disabled={savingMeta || uploadingThumbnail}
            className="inline-flex items-center justify-center rounded-button border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {savingMeta ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Lưu thông tin
          </button>
          <button
            type="button"
            onClick={handleDeletePackage}
            disabled={deleting}
            className="inline-flex items-center justify-center rounded-button border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Xóa gói
          </button>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                <Globe2 className="h-4 w-4 text-sky-500" />
                Game Hub
              </div>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                {gamePackage.published_to_hub ? 'Đang mở cho mọi học sinh' : 'Chưa publish lên khu game chung'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Publish để học sinh có thể thấy trò chơi trong Game Hub mà không cần thuộc lớp nào.
              </p>
            </div>
            <button
              type="button"
              onClick={handleToggleHubPublication}
              disabled={publishing}
              className={`inline-flex items-center justify-center rounded-button px-5 py-2.5 text-sm font-medium transition disabled:opacity-50 ${
                gamePackage.published_to_hub
                  ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  : 'bg-primary text-white hover:bg-primary-dark'
              }`}
            >
              {publishing ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : gamePackage.published_to_hub ? (
                <EyeOff className="mr-1.5 h-4 w-4" />
              ) : (
                <Globe2 className="mr-1.5 h-4 w-4" />
              )}
              {gamePackage.published_to_hub ? 'Gỡ khỏi Game Hub' : 'Publish Game Hub'}
            </button>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              <Trophy className="h-4 w-4 text-amber-500" />
              Leaderboard
            </div>
            {leaderboard?.entries?.length ? (
              <button
                onClick={() => setActiveStep('results')}
                className="text-xs text-primary hover:underline font-medium"
              >
                Xem tất cả →
              </button>
            ) : null}
          </div>
          {leaderboard?.entries?.length ? (
            <div className="mt-4 space-y-2">
              {leaderboard.entries.slice(0, 3).map((entry) => (
                <div key={entry.user_id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-700">#{entry.rank} {entry.student_name || 'Học sinh'}</span>
                  <strong className="text-slate-900">{entry.best_score_total ?? 0}</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Bảng xếp hạng sẽ xuất hiện sau khi học sinh hoàn thành lượt chơi đầu tiên.
            </p>
          )}
        </div>
      </section>

      <GameEditorLayout
        title="Biên soạn trò chơi"
        description="Chia thành 3 phần: tổng quan thông tin, bộ câu hỏi và kết quả học sinh."
        steps={EDITOR_STEPS}
        activeStep={activeStep}
        onStepChange={setActiveStep}
        stepMeta={stepMeta}
      >
        {activeStep === 'overview' ? renderOverviewTab() : activeStep === 'questions' ? renderQuestionsTab() : renderResultsTab()}
      </GameEditorLayout>

      {/* Unpublish confirmation modal */}
      <Modal isOpen={showUnpublishConfirm} onClose={() => setShowUnpublishConfirm(false)} title="Gỡ khỏi Game Hub?" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl">
            <Globe2 className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">Xác nhận gỡ trò chơi khỏi Game Hub?</p>
              <p className="mt-2 text-sm text-gray-600">
                Khi gỡ khỏi Game Hub, tất cả nội dung liên quan đến <strong>Bảng xếp hạng sẽ bị biến mất hoàn toàn</strong>.
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Trò chơi vẫn được giữ lại và có thể publish lại sau.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowUnpublishConfirm(false)}>Hủy</Button>
            <Button
              onClick={handleConfirmUnpublish}
              disabled={publishing}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {publishing ? 'Đang xử lý...' : 'Gỡ khỏi Game Hub'}
            </Button>
          </div>
        </div>
      </Modal>

      <TeacherGamePreviewModal
        packageId={packageId ?? ''}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
}
