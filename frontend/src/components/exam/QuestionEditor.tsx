import { useState } from 'react';
import type { Question, QuestionOption, MatchingPair } from '@/types';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Badge from '@/components/common/Badge';
import { Trash2, Plus, GripVertical } from 'lucide-react';
import { generateId } from '@/utils/helpers';

interface QuestionEditorProps {
  question: Question;
  index: number;
  onChange: (question: Question) => void;
  onDelete: () => void;
}

const typeLabels = {
  single_choice: 'Trắc nghiệm',
  multi_choice: 'Nhiều đáp án',
  text: 'Tự luận',
  image_upload: 'Tải ảnh',
  matching: 'Nối cột',
};

export default function QuestionEditor({
  question,
  index,
  onChange,
  onDelete,
}: QuestionEditorProps) {
  const [collapsed, setCollapsed] = useState(false);

  const updateField = <K extends keyof Question>(key: K, value: Question[K]) => {
    onChange({ ...question, [key]: value });
  };

  const addOption = () => {
    const newOption: QuestionOption = {
      id: generateId(),
      content: '',
      is_correct: false,
    };
    updateField('options', [...question.options, newOption]);
  };

  const updateOption = (optionId: string, data: Partial<QuestionOption>) => {
    updateField(
      'options',
      question.options.map((o) => (o.id === optionId ? { ...o, ...data } : o))
    );
  };

  const removeOption = (optionId: string) => {
    updateField(
      'options',
      question.options.filter((o) => o.id !== optionId)
    );
  };

  const toggleCorrect = (optionId: string) => {
    if (question.type === 'single_choice') {
      updateField(
        'options',
        question.options.map((o) => ({ ...o, is_correct: o.id === optionId }))
      );
    } else {
      updateOption(optionId, {
        is_correct: !question.options.find((o) => o.id === optionId)?.is_correct,
      });
    }
  };

  const pairs = question.matching_pairs || [];

  const addPair = () => {
    const newPair: MatchingPair = { id: generateId(), left_text: '', right_text: '' };
    onChange({ ...question, matching_pairs: [...pairs, newPair] });
  };

  const updatePair = (pairId: string, data: Partial<MatchingPair>) => {
    onChange({ ...question, matching_pairs: pairs.map((p) => (p.id === pairId ? { ...p, ...data } : p)) });
  };

  const removePair = (pairId: string) => {
    onChange({ ...question, matching_pairs: pairs.filter((p) => p.id !== pairId) });
  };

  return (
    <div className="bg-white rounded-card border border-border shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
        <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
          {index + 1}
        </div>
        <Badge variant="blue">{typeLabels[question.type]}</Badge>
        <span className="text-sm text-gray-400">{question.points} điểm</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="text-sm text-primary hover:underline"
          >
            {collapsed ? 'Mở rộng' : 'Thu gọn'}
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung câu hỏi</label>
            <textarea
              value={question.content}
              onChange={(e) => updateField('content', e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none transition-all resize-none"
              placeholder="Nhập câu hỏi..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Điểm"
              type="number"
              value={question.points}
              onChange={(e) => updateField('points', Number(e.target.value))}
              min={0}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loại câu hỏi</label>
              <select
                value={question.type}
                onChange={(e) =>
                  updateField('type', e.target.value as Question['type'])
                }
                className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none"
              >
                <option value="single_choice">Trắc nghiệm (1 đáp án)</option>
                <option value="multi_choice">Nhiều đáp án</option>
                <option value="text">Tự luận</option>
                <option value="matching">Nối cột</option>
              </select>
            </div>
          </div>

          {(question.type === 'single_choice' || question.type === 'multi_choice') && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Đáp án</label>
              {question.options.map((option, idx) => (
                <div key={option.id} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleCorrect(option.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      option.is_correct
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    {option.is_correct && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                      </svg>
                    )}
                  </button>
                  <span className="text-sm text-gray-400 w-6">{String.fromCharCode(65 + idx)}</span>
                  <input
                    value={option.content}
                    onChange={(e) => updateOption(option.id, { content: e.target.value })}
                    placeholder={`Đáp án ${String.fromCharCode(65 + idx)}`}
                    className="flex-1 px-3 py-2 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none text-sm"
                  />
                  <button
                    onClick={() => removeOption(option.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={addOption}>
                <Plus className="w-4 h-4 mr-1" /> Thêm đáp án
              </Button>
            </div>
          )}

          {question.type === 'matching' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Các cặp nối</label>
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-medium text-gray-500 px-1">
                <span>Cột trái</span>
                <span>Cột phải</span>
                <span className="w-8" />
              </div>
              {pairs.map((pair) => (
                <div key={pair.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
                  <input
                    value={pair.left_text}
                    onChange={(e) => updatePair(pair.id, { left_text: e.target.value })}
                    placeholder="Nội dung trái"
                    className="px-3 py-2 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none text-sm"
                  />
                  <input
                    value={pair.right_text}
                    onChange={(e) => updatePair(pair.id, { right_text: e.target.value })}
                    placeholder="Nội dung phải"
                    className="px-3 py-2 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none text-sm"
                  />
                  <button
                    onClick={() => removePair(pair.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={addPair}>
                <Plus className="w-4 h-4 mr-1" /> Thêm cặp nối
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
