import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Layers3,
  Loader2,
  Save,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import GameQuestionEditor from '@/components/games/GameQuestionEditor';
import {
  GAME_DIFFICULTY_BANDS,
  getBandMeta,
  getDistributionModeLabel,
  getLevelDistributionLabel,
  getQuestionPlanPreview,
  parseJsonInput,
  prettyPrintJson,
} from '@/features/games/helpers';
import { gameService } from '@/services/game.service';
import { showErrorToast, showSuccessToast } from '@/store/toast.store';
import type { DifficultyBand, GamePackage, Question } from '@/types';
import { generateId } from '@/utils/helpers';

function unwrapApiData<T>(response: { data?: { data?: T } & T }): T {
  return (response.data?.data ?? response.data) as T;
}

function createEmptyQuestion(band: DifficultyBand, orderIndex: number): Question {
  return {
    id: generateId(),
    package_id: '',
    type: 'single_choice',
    content: 'Câu hỏi mới',
    instruction: '',
    explanation: '',
    difficulty_band: band,
    points: 1,
    required: true,
    order_index: orderIndex,
    options: [
      { id: generateId(), content: 'Đáp án A', is_correct: true },
      { id: generateId(), content: 'Đáp án B', is_correct: false },
    ],
    matching_pairs: [],
    text_config: null,
  };
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

export default function TeacherGamePackageDetail() {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const [gamePackage, setGamePackage] = useState<GamePackage | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeBand, setActiveBand] = useState<DifficultyBand>('recognition');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [runtimeConfigText, setRuntimeConfigText] = useState('');
  const [runtimeConfigError, setRuntimeConfigError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!packageId) {
      setLoading(false);
      return;
    }

    Promise.all([
      gameService.getGamePackage(packageId),
      gameService.getGamePackageQuestions(packageId),
    ])
      .then(([packageResponse, questionsResponse]) => {
        if (cancelled) return;
        const packageData = unwrapApiData<GamePackage>(packageResponse);
        const questionItems = unwrapApiData<Question[]>(questionsResponse) ?? [];
        setGamePackage(packageData);
        setQuestions(questionItems);
        setTitle(packageData.title);
        setDescription(packageData.description || '');
        setThumbnailUrl(packageData.thumbnail_url || '');
        setRuntimeConfigText(prettyPrintJson(packageData.runtime_config ?? null));
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
      accumulator[band] = questions
        .filter((question) => question.difficulty_band === band)
        .sort((left, right) => left.order_index - right.order_index);
      return accumulator;
    }, {
      recognition: [],
      comprehension: [],
      application_basic: [],
      application_advanced: [],
    })
  ), [questions]);

  const currentBandQuestions = questionsByBand[activeBand];
  const questionPlanPreview = getQuestionPlanPreview(gamePackage);
  const levelDistributionLabel = getLevelDistributionLabel(gamePackage);
  const classLink = gamePackage?.class_id
    ?? gamePackage?.assignment?.class_id
    ?? gamePackage?.assignments?.[0]?.class_id
    ?? null;
  const goldMinerPackage = gamePackage?.game_module?.slug === 'gold-miner';

  const handleSaveMeta = async () => {
    if (!packageId || !gamePackage) return;

    const parsedConfig = parseJsonInput(runtimeConfigText);
    setRuntimeConfigError(parsedConfig.error);
    if (parsedConfig.error) return;

    setSavingMeta(true);
    try {
      const response = await gameService.updateGamePackage(packageId, {
        title: title.trim(),
        description: description.trim() || undefined,
        thumbnail_url: thumbnailUrl.trim() || undefined,
        runtime_config: parsedConfig.parsed,
      });
      const updatedPackage = unwrapApiData<GamePackage>(response);
      setGamePackage(updatedPackage);
      showSuccessToast('Đã lưu thông tin gói trò chơi.');
    } catch {
      showErrorToast('Không thể cập nhật gói trò chơi.');
    } finally {
      setSavingMeta(false);
    }
  };

  const handleAddQuestion = async (band: DifficultyBand) => {
    if (!packageId) return;

    try {
      const orderIndex = orderedQuestions.length;
      const response = await gameService.createGamePackageQuestion(
        packageId,
        toQuestionPayload(createEmptyQuestion(band, orderIndex), orderIndex),
      );
      const createdQuestion = unwrapApiData<Question>(response);
      setQuestions((current) => [...current, createdQuestion]);
      setActiveBand(band);
    } catch {
      showErrorToast('Không thể tạo câu hỏi mới.');
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

  const handleSaveQuestions = async () => {
    setSavingQuestions(true);
    try {
      for (const [index, question] of orderedQuestions.entries()) {
        await gameService.updateGameQuestion(question.id, toQuestionPayload(question, index));
      }
      showSuccessToast('Đã lưu bộ câu hỏi.');
    } catch {
      showErrorToast('Không thể lưu bộ câu hỏi.');
    } finally {
      setSavingQuestions(false);
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
          <Button variant="secondary" onClick={handleSaveMeta} isLoading={savingMeta}>
            <Save className="mr-2 h-4 w-4" />
            Lưu thông tin
          </Button>
          <Button variant="danger" onClick={handleDeletePackage} isLoading={deleting}>
            <Trash2 className="mr-2 h-4 w-4" />
            Xóa gói
          </Button>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
        <div className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Thông tin gói trò chơi</h2>
            <p className="mt-1 text-sm text-slate-500">
              Những nội dung này sẽ hiển thị ở danh sách trò chơi và màn hình trước khi học sinh bắt đầu.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input label="Tiêu đề" value={title} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Mô tả</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <div className="md:col-span-2">
              <Input
                label="Ảnh đại diện"
                value={thumbnailUrl}
                onChange={(event) => setThumbnailUrl(event.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Thiết lập nâng cao (JSON)</label>
              <textarea
                value={runtimeConfigText}
                onChange={(event) => {
                  setRuntimeConfigText(event.target.value);
                  if (runtimeConfigError) {
                    setRuntimeConfigError(null);
                  }
                }}
                rows={10}
                className={`w-full rounded-2xl border px-4 py-3 font-mono text-sm outline-none transition ${
                  runtimeConfigError
                    ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200'
                    : 'border-slate-200 focus:border-primary focus:ring-2 focus:ring-blue-200'
                }`}
                placeholder={prettyPrintJson(gamePackage.runtime_config ?? {})}
              />
              {runtimeConfigError && <p className="mt-2 text-sm text-red-600">{runtimeConfigError}</p>}
            </div>
          </div>
        </div>

        <div className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Layers3 className="h-4 w-4 text-sky-500" />
            Tổng quan bộ câu hỏi
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {GAME_DIFFICULTY_BANDS.map((band) => {
              const meta = getBandMeta(band);
              const count = questionsByBand[band].length;

              return (
                <button
                  key={band}
                  type="button"
                  onClick={() => setActiveBand(band)}
                  className={`rounded-3xl border px-4 py-4 text-left transition ${
                    activeBand === band
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

          {goldMinerPackage && (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">Gold Miner sẽ phân phối câu hỏi theo level</p>
              <p className="mt-2 leading-6">
                Giáo viên chỉ cần soạn bộ câu hỏi tổng thể. Hệ thống sẽ tự chia theo từng màn chơi,
                cho phép có vật phẩm không kèm câu hỏi nhưng vẫn bảo đảm học sinh làm hết toàn bộ bộ câu hỏi
                khi hoàn thành hết các màn.
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
        </div>
      </section>

      <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Đang chỉnh sửa
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">{getBandMeta(activeBand).label}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {getBandMeta(activeBand).description}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => handleAddQuestion(activeBand)}>
              Thêm câu hỏi mới
            </Button>
            <Button onClick={handleSaveQuestions} isLoading={savingQuestions}>
              <Save className="mr-2 h-4 w-4" />
              Lưu bộ câu hỏi
            </Button>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {currentBandQuestions.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
              <p className="text-lg font-semibold text-slate-900">Mức độ này chưa có câu hỏi</p>
              <p className="mt-2 text-sm text-slate-500">
                Tạo ít nhất một câu hỏi để học sinh có nội dung làm bài khi chơi tới mức độ này.
              </p>
              <Button className="mt-4" onClick={() => handleAddQuestion(activeBand)}>
                Thêm câu hỏi đầu tiên
              </Button>
            </div>
          ) : (
            currentBandQuestions.map((question, index) => (
              <GameQuestionEditor
                key={question.id}
                question={question}
                index={index}
                band={activeBand}
                warnOnManualText={goldMinerPackage}
                onChange={(updatedQuestion) => {
                  setQuestions((current) => current.map((item) => (
                    item.id === updatedQuestion.id ? updatedQuestion : item
                  )));
                }}
                onDelete={() => handleDeleteQuestion(question.id)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
