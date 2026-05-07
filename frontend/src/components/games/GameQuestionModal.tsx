import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, UploadCloud } from 'lucide-react';

import { getAttemptMetric, getAttemptProgressPercent } from '@/features/games/helpers';
import type {
  GameRuntimeQuestion,
  MatchingLeftItem,
  MatchingRightItem,
  PackageAttemptTotals,
  PackageQuestionAttempt,
} from '@/types';

interface GameQuestionModalProps {
  isOpen: boolean;
  portalContainer?: HTMLElement | null;
  question: GameRuntimeQuestion | null;
  questionAttempt: PackageQuestionAttempt | null;
  totals?: PackageAttemptTotals | null;
  selectedOptionIds: string[];
  textAnswer: string;
  uploadedImageUrl: string;
  matchingAnswers: Record<string, string>;
  submitting: boolean;
  onSingleChoiceSelect: (optionId: string) => void;
  onMultiChoiceToggle: (optionId: string) => void;
  onTextChange: (value: string) => void;
  onImageUrlChange: (value: string) => void;
  onMatchingChange: (leftItemId: string, rightKey: string) => void;
  onSubmit: () => void;
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

function getQuestionTypeLabel(type: GameRuntimeQuestion['type']) {
  if (type === 'single_choice') return 'Trắc nghiệm một đáp án';
  if (type === 'multi_choice') return 'Trắc nghiệm nhiều đáp án';
  if (type === 'matching') return 'Nối cột';
  if (type === 'image_upload') return 'Tải ảnh';
  return 'Tự luận';
}

function canSubmitQuestion(
  question: GameRuntimeQuestion | null,
  selectedOptionIds: string[],
  textAnswer: string,
  uploadedImageUrl: string,
  matchingAnswers: Record<string, string>,
) {
  if (!question) return false;

  switch (question.type) {
    case 'single_choice':
      return selectedOptionIds.length === 1;
    case 'multi_choice':
      return selectedOptionIds.length > 0;
    case 'text':
      return textAnswer.trim().length > 0;
    case 'image_upload':
      return uploadedImageUrl.trim().length > 0;
    case 'matching': {
      const { leftItems } = buildMatchingShape(question);
      return leftItems.length > 0 && leftItems.every((item) => Boolean(matchingAnswers[item.id]));
    }
    default:
      return false;
  }
}

export default function GameQuestionModal({
  isOpen,
  portalContainer,
  question,
  questionAttempt,
  totals,
  selectedOptionIds,
  textAnswer,
  uploadedImageUrl,
  matchingAnswers,
  submitting,
  onSingleChoiceSelect,
  onMultiChoiceToggle,
  onTextChange,
  onImageUrlChange,
  onMatchingChange,
  onSubmit,
}: GameQuestionModalProps) {
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const isRenderable = Boolean(isOpen && question && questionAttempt);
  const answered = getAttemptMetric(totals, ['questions_answered', 'answered_count']) ?? 0;
  const total = getAttemptMetric(totals, ['questions_total', 'questions_presented', 'total_questions']) ?? 0;
  const progressPercent = getAttemptProgressPercent(totals);
  const { leftItems, rightItems } = buildMatchingShape(question);
  const assignedLeftByKey = Object.entries(matchingAnswers || {}).reduce<Record<string, string>>((acc, [leftId, key]) => {
    if (key) acc[key] = leftId;
    return acc;
  }, {});
  const submitDisabled = submitting || !canSubmitQuestion(
    question,
    selectedOptionIds,
    textAnswer,
    uploadedImageUrl,
    matchingAnswers,
  );

  const portalTarget = portalContainer ?? document.body;
  const overlayClass = 'fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm';

  useEffect(() => {
    if (!isRenderable || !question || !questionAttempt) return;

    console.info('[QFLOW] modal:mount', {
      questionId: question.id,
      questionAttemptId: questionAttempt.id,
      hasPortalContainer: Boolean(portalContainer),
      portalTag: portalTarget.tagName,
      fullscreenTag: document.fullscreenElement?.tagName ?? null,
      overlayMode: portalContainer ? 'fixed-in-viewport-portal' : 'fixed-in-body-portal',
    });

    return () => {
      console.info('[QFLOW] modal:unmount', {
        questionId: question.id,
        questionAttemptId: questionAttempt.id,
      });
    };
  }, [isRenderable, portalContainer, portalTarget, question, questionAttempt]);

  if (!isRenderable || !question || !questionAttempt) return null;

  return createPortal(
    <div className={overlayClass}>
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_25px_60px_rgba(15,23,42,0.25)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-question-title"
      >
        <div className="border-b border-slate-200 bg-[linear-gradient(135deg,#0f172a,#1e293b)] px-5 py-4 text-white sm:px-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Câu hỏi
              </p>
              <h2 id="game-question-title" className="text-lg font-semibold">
                Trả lời để tiếp tục
              </h2>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-xs">
              <span className="text-slate-200">Tiến độ: </span>
              <strong className="text-white">{answered}/{total || '-'}</strong>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-5 py-5 sm:px-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-medium text-slate-700">
                {getQuestionTypeLabel(question.type)}
              </span>
              {typeof question.points === 'number' && (
                <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 font-medium text-amber-800">
                  {question.points} điểm
                </span>
              )}
            </div>
            <p className="text-base font-semibold leading-6 text-slate-900">
              {question.content}
            </p>
            {question.instruction && (
              <p className="mt-2 text-xs leading-5 text-slate-600">{question.instruction}</p>
            )}
          </div>

          {(question.type === 'single_choice' || question.type === 'multi_choice') && (
            <div className="space-y-3">
              {question.options?.map((option) => {
                const isSelected = selectedOptionIds.includes(option.id);

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => (
                      question.type === 'single_choice'
                        ? onSingleChoiceSelect(option.id)
                        : onMultiChoiceToggle(option.id)
                    )}
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-colors ${
                      isSelected
                        ? 'border-primary bg-blue-50 text-primary'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
                        isSelected
                          ? 'border-primary bg-primary text-white'
                          : 'border-slate-300 text-transparent'
                      }`}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                    <span className="text-sm font-medium">{option.content}</span>
                  </button>
                );
              })}
            </div>
          )}

          {question.type === 'text' && (
            <textarea
              value={textAnswer}
              onChange={(event) => onTextChange(event.target.value)}
              rows={question.text_config?.input_variant === 'paragraph' ? 6 : 3}
              placeholder="Nhập câu trả lời của em..."
              className="w-full rounded-3xl border border-slate-200 px-4 py-4 text-sm leading-6 text-slate-700 outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-200"
            />
          )}

          {question.type === 'image_upload' && (
            <label className="block rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 cursor-pointer hover:border-primary hover:bg-blue-50 transition">
              <div className="flex items-start gap-3">
                <UploadCloud className="mt-0.5 h-5 w-5 text-slate-500" />
                <div className="w-full space-y-2">
                  <p className="text-sm font-medium text-slate-800">Tải lên hình ảnh</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          const dataUrl = e.target?.result as string;
                          onImageUrlChange(dataUrl);
                        };
                        reader.readAsDataURL(file);
                      }
                      // Reset input after handling
                      event.target.value = '';
                    }}
                    className="hidden"
                  />
                  {uploadedImageUrl && (
                    <p className="text-xs text-slate-500">✓ Ảnh đã được tải lên</p>
                  )}
                  {!uploadedImageUrl && (
                    <p className="text-xs text-slate-500">Chọn file ảnh (JPG, PNG, GIF, ...)</p>
                  )}
                </div>
              </div>
            </label>
          )}

          {question.type === 'matching' && (
            <div className="space-y-4">
              {/* Pool of right-side choices (draggable) */}
              <div className="flex flex-wrap gap-2">
                {rightItems.map((r) => {
                  const key = r.right_key ?? r.content;
                  const assigned = Boolean(assignedLeftByKey[key]);
                  return (
                    <button
                      key={r.id}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', key);
                        setDraggingKey(key);
                      }}
                      onDragEnd={() => setDraggingKey(null)}
                      onClick={() => {
                        // assign to first unassigned left item as fallback
                        const firstUnassigned = leftItems.find((li) => !matchingAnswers[li.id]);
                        if (firstUnassigned) {
                          // clear previous owner
                          Object.entries(matchingAnswers).forEach(([lId, k]) => {
                            if (k === key) onMatchingChange(lId, '');
                          });
                          onMatchingChange(firstUnassigned.id, key);
                        }
                      }}
                      className={`rounded-2xl border px-3 py-2 text-sm font-medium bg-white ${assigned ? 'opacity-40' : 'hover:bg-slate-50'} transition`}
                    >
                      {r.content}
                    </button>
                  );
                })}
              </div>

              {leftItems.map((item) => (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)]"
                >
                  <div className="rounded-2xl bg-white px-4 py-3 text-sm font-medium text-slate-800">
                    {item.content}
                  </div>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const key = e.dataTransfer.getData('text/plain');
                      if (!key) return;
                      // remove key from previous left if assigned
                      Object.entries(matchingAnswers).forEach(([lId, k]) => {
                        if (k === key) onMatchingChange(lId, '');
                      });
                      onMatchingChange(item.id, key);
                      setDraggingKey(null);
                    }}
                    className={`w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition ${draggingKey ? 'ring-2 ring-primary/40' : ''}`}
                  >
                    {matchingAnswers[item.id]
                      ? rightItems.find((r) => (r.right_key ?? r.content) === matchingAnswers[item.id])?.content ?? matchingAnswers[item.id]
                      : 'Kéo đáp án vào đây'}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-400">
              Hệ thống sẽ ghi nhận câu trả lời.
            </p>
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitDisabled}
              className={`inline-flex min-w-[140px] items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
                submitDisabled
                  ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                  : 'bg-primary text-white hover:bg-primary-hover'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                'Nộp câu trả lời'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
