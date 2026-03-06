import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import ExamTimer from '@/components/exam/ExamTimer';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import type { Question } from '@/types';

interface Props {
  examTitle: string;
  questions: Question[];
  answers: Record<string, string | string[]>;
  currentIdx: number;
  setCurrentIdx: (idx: number) => void;
  deadline: string | null;
  answeredCount: number;
  showConfirm: boolean;
  setShowConfirm: (show: boolean) => void;
  submitting: boolean;
  onAnswer: (questionId: string, value: string) => void;
  onMatchAnswer: (questionId: string, newMatch: string[]) => void;
  onSubmit: () => void;
  onTimeUp: () => void;
}

export default function ExamTakingView({
  examTitle, questions, answers, currentIdx, setCurrentIdx,
  deadline, answeredCount, showConfirm, setShowConfirm,
  submitting, onAnswer, onMatchAnswer, onSubmit, onTimeUp,
}: Props) {
  const currentQ = questions[currentIdx];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-card p-4 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{examTitle}</h1>
          <p className="text-sm text-gray-500">{questions.length} câu hỏi</p>
        </div>
        {deadline && <ExamTimer endTime={deadline} onTimeUp={onTimeUp} />}
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-card shadow-sm p-4">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>Tiến độ: {answeredCount}/{questions.length} câu</span>
          <span>{Math.round((answeredCount / questions.length) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          {currentQ && (
            <div className="bg-white rounded-card shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {currentIdx + 1}
                </span>
                <span className="text-sm text-gray-500">{currentQ.points} điểm</span>
              </div>
              <p className="text-lg font-medium mb-4">{currentQ.content}</p>

              {(currentQ.type === 'single_choice' || currentQ.type === 'multi_choice') && (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400 mb-1">
                    {currentQ.type === 'single_choice' ? 'Chọn một đáp án đúng' : 'Chọn tất cả đáp án đúng'}
                  </p>
                  {currentQ.options?.map((opt) => {
                    const isSelected =
                      currentQ.type === 'multi_choice'
                        ? ((answers[currentQ.id] as string[]) || []).includes(opt.id)
                        : answers[currentQ.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => onAnswer(currentQ.id, opt.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all flex items-center gap-3 ${
                          isSelected
                            ? 'border-primary bg-blue-50 text-primary'
                            : 'border-border hover:border-gray-300'
                        }`}
                      >
                        {currentQ.type === 'single_choice' ? (
                          <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'border-primary' : 'border-gray-300'
                          }`}>
                            {isSelected && <span className="w-2.5 h-2.5 rounded-full bg-primary" />}
                          </span>
                        ) : (
                          <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'border-primary bg-primary' : 'border-gray-300'
                          }`}>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                          </span>
                        )}
                        <span className="text-sm">{opt.content}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {currentQ.type === 'text' && (
                <textarea
                  value={(answers[currentQ.id] as string) || ''}
                  onChange={(e) => onAnswer(currentQ.id, e.target.value)}
                  rows={4}
                  placeholder="Nhập câu trả lời..."
                  className="w-full px-4 py-3 rounded-xl border border-border text-sm focus:ring-2 focus:ring-blue-300 outline-none resize-none"
                />
              )}

              {currentQ.type === 'matching' && currentQ.matching_pairs && (
                <div className="space-y-3">
                  {(() => {
                    const matchAnswers = (answers[currentQ.id] as string[] | undefined) || [];
                    const rightItems = currentQ.matching_pairs!.map((p) => p.right_text);
                    return currentQ.matching_pairs!.map((pair, pIdx) => (
                      <div key={pair.id} className="flex items-center gap-3">
                        <div className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border border-border text-sm font-medium">
                          {pair.left_text}
                        </div>
                        <span className="text-gray-400">→</span>
                        <select
                          value={matchAnswers[pIdx] || ''}
                          onChange={(e) => {
                            const newMatch = [...matchAnswers];
                            while (newMatch.length <= pIdx) newMatch.push('');
                            newMatch[pIdx] = e.target.value;
                            onMatchAnswer(currentQ.id, newMatch);
                          }}
                          className="flex-1 px-4 py-3 rounded-xl border border-border text-sm focus:ring-2 focus:ring-blue-300 outline-none"
                        >
                          <option value="">-- Chọn --</option>
                          {rightItems.map((rt, ri) => (
                            <option key={ri} value={rt}>{rt}</option>
                          ))}
                        </select>
                      </div>
                    ));
                  })()}
                </div>
              )}

              <div className="flex justify-between mt-6">
                <Button
                  variant="secondary"
                  onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                  disabled={currentIdx === 0}
                >
                  Câu trước
                </Button>
                {currentIdx < questions.length - 1 ? (
                  <Button onClick={() => setCurrentIdx(currentIdx + 1)}>Câu tiếp</Button>
                ) : (
                  <Button onClick={() => setShowConfirm(true)}>Nộp bài</Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - question navigator */}
        <div className="w-48 hidden md:block">
          <div className="bg-white rounded-card shadow-sm p-4 sticky top-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Câu hỏi</p>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    idx === currentIdx
                      ? 'bg-primary text-white'
                      : answers[q.id]
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-gray-500">Đã làm: {answeredCount}/{questions.length}</p>
              <Button size="sm" className="w-full mt-2" onClick={() => setShowConfirm(true)}>
                Nộp bài
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-border p-3 flex items-center justify-between z-10">
        <p className="text-xs text-gray-500">Đã làm: {answeredCount}/{questions.length}</p>
        <Button size="sm" onClick={() => setShowConfirm(true)}>Nộp bài</Button>
      </div>

      {/* Submit confirmation modal */}
      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Xác nhận nộp bài" size="sm">
        <div className="space-y-4">
          {answeredCount < questions.length && (
            <div className="bg-yellow-50 p-3 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">Chưa hoàn thành</p>
                  <p className="text-xs text-yellow-600 mb-2">
                    Bạn đã trả lời {answeredCount}/{questions.length} câu hỏi
                  </p>
                  {/* List unanswered questions */}
                  <div className="flex flex-wrap gap-1.5">
                    {questions.map((q, idx) => {
                      const ans = answers[q.id];
                      const isAnswered = (() => {
                        if (!ans) return false;
                        if (q.type === 'multi_choice') return (ans as string[]).length > 0;
                        if (q.type === 'text') return (ans as string).trim().length > 0;
                        if (q.type === 'matching') return (ans as string[]).some((v) => v);
                        return true;
                      })();
                      if (isAnswered) return null;
                      return (
                        <button
                          key={q.id}
                          onClick={() => { setCurrentIdx(idx); setShowConfirm(false); }}
                          className="w-7 h-7 rounded bg-yellow-200 text-yellow-800 text-xs font-medium hover:bg-yellow-300 transition-colors"
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
          <p className="text-sm text-gray-600">Bạn có chắc muốn nộp bài? Sau khi nộp sẽ không thể sửa được.</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>Tiếp tục làm</Button>
            <Button onClick={onSubmit} disabled={submitting}>{submitting ? 'Đang nộp...' : 'Nộp bài'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
