import { useState } from 'react';
import { ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from 'lucide-react';

import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { getBandMeta } from '@/features/games/helpers';
import type { DifficultyBand, MatchingPair, Question, QuestionOption, QuestionTextConfig } from '@/types';
import { generateId } from '@/utils/helpers';

interface GameQuestionEditorProps {
  question: Question;
  index: number;
  band: DifficultyBand;
  onChange: (question: Question) => void;
  onDelete: () => void;
  warnOnManualText?: boolean;
}

const typeLabels = {
  single_choice: 'Trắc nghiệm một đáp án',
  multi_choice: 'Trắc nghiệm nhiều đáp án',
  text: 'Tự luận',
  matching: 'Nối cột',
} as const;

function buildDefaultOptions(): QuestionOption[] {
  return [
    { id: generateId(), content: '', is_correct: true },
    { id: generateId(), content: '', is_correct: false },
  ];
}

function buildDefaultPairs(): MatchingPair[] {
  return [
    { id: generateId(), left_text: '', right_text: '' },
    { id: generateId(), left_text: '', right_text: '' },
  ];
}

function buildDefaultTextConfig(): QuestionTextConfig {
  return {
    input_variant: 'short_text',
    grading_mode: 'normalized_exact',
    min_length: null,
    max_length: 160,
    case_sensitive: false,
    accent_sensitive: false,
    trim_whitespace: true,
    ignore_punctuation: true,
    manual_grading_required: false,
    accepted_answers: [''],
    keywords: [],
  };
}

function normalizeQuestionType(question: Question, nextType: Question['type']) {
  if (nextType === 'single_choice' || nextType === 'multi_choice') {
    const options = (question.options?.length ?? 0) >= 2 ? question.options : buildDefaultOptions();
    const selectedOptionId = options.find((option) => option.is_correct)?.id ?? options[0]?.id;
    return {
      ...question,
      type: nextType,
      options: nextType === 'single_choice'
        ? options.map((option) => ({ ...option, is_correct: option.id === selectedOptionId }))
        : options,
      matching_pairs: [],
      text_config: null,
    };
  }

  if (nextType === 'matching') {
    return {
      ...question,
      type: nextType,
      options: [],
      matching_pairs: (question.matching_pairs?.length ?? 0) >= 2 ? question.matching_pairs : buildDefaultPairs(),
      text_config: null,
    };
  }

  return {
    ...question,
    type: nextType,
    options: [],
    matching_pairs: [],
    text_config: question.text_config ?? buildDefaultTextConfig(),
  };
}

function toTextareaValue(values: string[] | undefined) {
  return (values ?? []).join('\n');
}

function toArrayValue(value: string) {
  return value.split('\n');
}

export default function GameQuestionEditor({
  question,
  index,
  band,
  onChange,
  onDelete,
  warnOnManualText = false,
}: GameQuestionEditorProps) {
  const [collapsed, setCollapsed] = useState(false);
  const bandMeta = getBandMeta(band);

  const updateField = <K extends keyof Question>(key: K, value: Question[K]) => {
    onChange({ ...question, [key]: value });
  };

  const updateTextConfig = (patch: Partial<QuestionTextConfig>) => {
    onChange({
      ...question,
      text_config: {
        ...buildDefaultTextConfig(),
        ...(question.text_config ?? {}),
        ...patch,
      },
    });
  };

  const addOption = () => {
    updateField('options', [
      ...(question.options ?? []),
      { id: generateId(), content: '', is_correct: false },
    ]);
  };

  const updateOption = (optionId: string, patch: Partial<QuestionOption>) => {
    updateField(
      'options',
      (question.options ?? []).map((option) => (
        option.id === optionId ? { ...option, ...patch } : option
      )),
    );
  };

  const toggleCorrect = (optionId: string) => {
    if (question.type === 'single_choice') {
      updateField(
        'options',
        (question.options ?? []).map((option) => ({ ...option, is_correct: option.id === optionId })),
      );
      return;
    }

    const target = question.options.find((option) => option.id === optionId);
    updateOption(optionId, { is_correct: !target?.is_correct });
  };

  const removeOption = (optionId: string) => {
    updateField(
      'options',
      (question.options ?? []).filter((option) => option.id !== optionId),
    );
  };

  const addPair = () => {
    onChange({
      ...question,
      matching_pairs: [...(question.matching_pairs ?? []), { id: generateId(), left_text: '', right_text: '' }],
    });
  };

  const updatePair = (pairId: string, patch: Partial<MatchingPair>) => {
    onChange({
      ...question,
      matching_pairs: (question.matching_pairs ?? []).map((pair) => (
        pair.id === pairId ? { ...pair, ...patch } : pair
      )),
    });
  };

  const removePair = (pairId: string) => {
    onChange({
      ...question,
      matching_pairs: (question.matching_pairs ?? []).filter((pair) => pair.id !== pairId),
    });
  };

  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-4">
        <GripVertical className="h-4 w-4 text-slate-300" />
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
          {index + 1}
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${bandMeta.accentClass}`}>
          {bandMeta.label}
        </span>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          {typeLabels[question.type as keyof typeof typeLabels] ?? question.type}
        </span>
        <span className="text-sm text-slate-400">{question.points} điểm</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCollapsed((current) => !current)}
            className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            {collapsed ? (
              <>
                <ChevronDown className="h-4 w-4" />
                Mở rộng
              </>
            ) : (
              <>
                <ChevronUp className="h-4 w-4" />
                Thu gọn
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {!collapsed && (
        <div className="space-y-5 p-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Nội dung câu hỏi</label>
                <textarea
                  value={question.content}
                  onChange={(event) => updateField('content', event.target.value)}
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-200"
                  placeholder="Nhập câu hỏi mà học sinh sẽ nhìn thấy khi trò chơi dừng lại."
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Hướng dẫn thêm</label>
                  <textarea
                    value={question.instruction ?? ''}
                    onChange={(event) => updateField('instruction', event.target.value)}
                    rows={2}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-200"
                    placeholder="Gợi ý cách làm hoặc yêu cầu bổ sung."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Giải thích / phản hồi</label>
                  <textarea
                    value={question.explanation ?? ''}
                    onChange={(event) => updateField('explanation', event.target.value)}
                    rows={2}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-200"
                    placeholder="Thông điệp ngắn sau khi học sinh nộp câu trả lời."
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Loại câu hỏi</label>
                <select
                  value={question.type}
                  onChange={(event) => onChange(normalizeQuestionType(question, event.target.value as Question['type']))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-200"
                >
                  <option value="single_choice">Trắc nghiệm một đáp án</option>
                  <option value="multi_choice">Trắc nghiệm nhiều đáp án</option>
                  <option value="text">Tự luận</option>
                  <option value="matching">Nối cột</option>
                </select>
              </div>

              <Input
                label="Số điểm"
                type="number"
                min={1}
                value={question.points}
                onChange={(event) => updateField('points', Number(event.target.value) || 1)}
              />

              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={question.required}
                  onChange={(event) => updateField('required', event.target.checked)}
                  className="rounded border-slate-300"
                />
                Bắt buộc trả lời khi câu hỏi hiện ra
              </label>
            </div>
          </div>

          {(question.type === 'single_choice' || question.type === 'multi_choice') && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Lựa chọn đáp án</h3>
                  <p className="text-xs text-slate-500">
                    {question.type === 'single_choice'
                      ? 'Chỉ đánh dấu một đáp án đúng.'
                      : 'Có thể đánh dấu nhiều đáp án đúng.'}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={addOption}>
                  <Plus className="mr-1 h-4 w-4" />
                  Thêm lựa chọn
                </Button>
              </div>

              <div className="space-y-3">
                {(question.options ?? []).map((option, optionIndex) => (
                  <div key={option.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleCorrect(option.id)}
                      className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${
                        option.is_correct
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : 'border-slate-300 text-transparent'
                      }`}
                    >
                      <span className="text-xs font-bold">✓</span>
                    </button>
                    <span className="w-6 text-sm font-medium text-slate-400">
                      {String.fromCharCode(65 + optionIndex)}
                    </span>
                    <input
                      value={option.content}
                      onChange={(event) => updateOption(option.id, { content: event.target.value })}
                      placeholder={`Lựa chọn ${String.fromCharCode(65 + optionIndex)}`}
                      className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeOption(option.id)}
                      className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {question.type === 'matching' && (
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Các cặp nối</h3>
                  <p className="text-xs text-slate-500">
                    Mỗi dòng bên trái sẽ được nối với một đáp án bên phải.
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={addPair}>
                  <Plus className="mr-1 h-4 w-4" />
                  Thêm cặp nối
                </Button>
              </div>

              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 px-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                <span>Vế trái</span>
                <span>Vế phải</span>
                <span />
              </div>

              {(question.matching_pairs ?? []).map((pair) => (
                <div key={pair.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-3">
                  <input
                    value={pair.left_text}
                    onChange={(event) => updatePair(pair.id, { left_text: event.target.value })}
                    placeholder="Nội dung bên trái"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-200"
                  />
                  <input
                    value={pair.right_text}
                    onChange={(event) => updatePair(pair.id, { right_text: event.target.value })}
                    placeholder="Đáp án bên phải"
                    className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-200"
                  />
                  <button
                    type="button"
                    onClick={() => removePair(pair.id)}
                    className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </section>
          )}

          {question.type === 'text' && (
            <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Kiểu nhập</label>
                  <select
                    value={question.text_config?.input_variant ?? 'short_text'}
                    onChange={(event) => updateTextConfig({ input_variant: event.target.value as QuestionTextConfig['input_variant'] })}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="short_text">Ngắn</option>
                    <option value="paragraph">Đoạn văn</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Chế độ chấm</label>
                  <select
                    value={question.text_config?.grading_mode ?? 'normalized_exact'}
                    onChange={(event) => updateTextConfig({ grading_mode: event.target.value as QuestionTextConfig['grading_mode'] })}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="exact_match">Khớp chính xác</option>
                    <option value="normalized_exact">Khớp chuẩn hóa</option>
                    <option value="keyword">Theo từ khóa</option>
                    <option value="hybrid">Kết hợp</option>
                    <option value="manual">Chấm tay</option>
                  </select>
                </div>
              </div>

              {warnOnManualText && question.text_config?.grading_mode === 'manual' && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Với Gold Miner, không nên dùng câu hỏi tự luận chấm tay. Hãy chuyển sang chế độ chấm tự động trước khi giao cho học sinh.
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="Độ dài tối thiểu"
                  type="number"
                  min={0}
                  value={question.text_config?.min_length ?? ''}
                  onChange={(event) => updateTextConfig({
                    min_length: event.target.value ? Number(event.target.value) : null,
                  })}
                />
                <Input
                  label="Độ dài tối đa"
                  type="number"
                  min={1}
                  value={question.text_config?.max_length ?? ''}
                  onChange={(event) => updateTextConfig({
                    max_length: event.target.value ? Number(event.target.value) : null,
                  })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={question.text_config?.trim_whitespace ?? true}
                    onChange={(event) => updateTextConfig({ trim_whitespace: event.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Tự động bỏ khoảng trắng thừa
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={question.text_config?.ignore_punctuation ?? true}
                    onChange={(event) => updateTextConfig({ ignore_punctuation: event.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Bỏ qua dấu câu khi chấm
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Đáp án chấp nhận (mỗi dòng một đáp án)
                  </label>
                  <textarea
                    value={toTextareaValue(question.text_config?.accepted_answers)}
                    onChange={(event) => updateTextConfig({ accepted_answers: toArrayValue(event.target.value) })}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-200"
                    placeholder={'Đáp án 1\nĐáp án 2'}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Từ khóa chấm nhanh (mỗi dòng một từ)
                  </label>
                  <textarea
                    value={toTextareaValue(question.text_config?.keywords)}
                    onChange={(event) => updateTextConfig({ keywords: toArrayValue(event.target.value) })}
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-200"
                    placeholder={'Từ khóa 1\nTừ khóa 2'}
                  />
                </div>
              </div>
            </section>
          )}
        </div>
      )}
    </article>
  );
}
