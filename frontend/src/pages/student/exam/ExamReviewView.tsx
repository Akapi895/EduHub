import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import Button from '@/components/common/Button';
import type { Question, SubmissionAnswer } from '@/types';

interface Props {
  examTitle: string;
  questions: Question[];
  reviewAnswers: SubmissionAnswer[];
  reviewIdx: number;
  setReviewIdx: (idx: number) => void;
  showCorrect: boolean;
  onBack: () => void;
}

export default function ExamReviewView({
  examTitle, questions, reviewAnswers, reviewIdx, setReviewIdx, showCorrect, onBack,
}: Props) {
  const rq = questions[reviewIdx];
  const rAnswer = reviewAnswers.find((a) => a.question_id === rq?.id);
  const correctIds = new Set(rAnswer?.correct_option_ids || []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-card p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">{examTitle} - Xem lại</h1>
            <p className="text-sm text-gray-500">{questions.length} câu hỏi</p>
          </div>
        </div>
        {rAnswer?.score != null && (
          <span className={`text-sm font-medium ${rAnswer.score > 0 ? 'text-green-600' : 'text-red-500'}`}>
            Điểm câu này: {rAnswer.score}/{rq?.points}
          </span>
        )}
      </div>

      <div className="flex gap-6">
        <div className="flex-1 min-w-0">
          {rq && (
            <div className="bg-white rounded-card shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {reviewIdx + 1}
                </span>
                <span className="text-sm text-gray-500">{rq.points} điểm</span>
              </div>
              <p className="text-lg font-medium mb-6">{rq.content}</p>

              {(rq.type === 'single_choice' || rq.type === 'multi_choice') && (
                <div className="space-y-3">
                  {rq.options?.map((opt) => {
                    const wasSelected = (rAnswer?.selected_option_ids || []).includes(opt.id);
                    const isCorrect = correctIds.has(opt.id);
                    let borderClass = 'border-border';
                    if (wasSelected && isCorrect) borderClass = 'border-green-500 bg-green-50';
                    else if (wasSelected && !isCorrect) borderClass = 'border-red-400 bg-red-50';
                    else if (showCorrect && isCorrect) borderClass = 'border-green-300 bg-green-50/50';

                    return (
                      <div key={opt.id} className={`px-4 py-3 rounded-xl border-2 ${borderClass} flex items-center justify-between`}>
                        <span className="text-sm">{opt.content}</span>
                        <div className="flex items-center gap-1">
                          {wasSelected && isCorrect && (
                            <>
                              <span className="text-xs text-green-600 font-medium">Đúng</span>
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            </>
                          )}
                          {wasSelected && !isCorrect && (
                            <>
                              <span className="text-xs text-red-500 font-medium">Sai</span>
                              <XCircle className="w-4 h-4 text-red-500" />
                            </>
                          )}
                          {!wasSelected && showCorrect && isCorrect && (
                            <>
                              <span className="text-xs text-green-600">Đáp án đúng</span>
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {rq.type === 'text' && (
                <div className="space-y-2">
                  <div className="px-4 py-3 rounded-xl border border-border bg-gray-50 text-sm whitespace-pre-wrap">
                    {rAnswer?.text_answer || <span className="text-gray-400 italic">Không trả lời</span>}
                  </div>
                  {rAnswer?.score != null && (
                    <p className={`text-sm font-medium ${rAnswer.score > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                      Điểm: {rAnswer.score}/{rq.points}
                    </p>
                  )}
                  {rAnswer?.score == null && (
                    <p className="text-sm text-yellow-600">Chờ giáo viên chấm điểm</p>
                  )}
                </div>
              )}

              {rq.type === 'matching' && rq.matching_pairs && (() => {
                let matchVals: string[] = [];
                try { matchVals = JSON.parse(rAnswer?.text_answer || '[]'); } catch { /* ignore */ }
                const correctMatches = rAnswer?.correct_matches || [];
                return (
                  <div className="space-y-3">
                    {rq.matching_pairs.map((pair, pIdx) => {
                      const studentVal = matchVals[pIdx] || '';
                      const correctVal = correctMatches[pIdx] || pair.right_text;
                      const isRight = studentVal === correctVal;
                      return (
                        <div key={pair.id} className="flex items-center gap-3">
                          <div className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border border-border text-sm font-medium">
                            {pair.left_text}
                          </div>
                          <span className="text-gray-400">→</span>
                          <div className={`flex-1 px-4 py-3 rounded-xl border text-sm ${
                            isRight ? 'border-green-500 bg-green-50' : 'border-red-400 bg-red-50'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span>{studentVal || <span className="text-gray-400 italic">Chưa chọn</span>}</span>
                              {isRight
                                ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                                : <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                              }
                            </div>
                            {!isRight && showCorrect && (
                              <p className="text-xs text-green-600 mt-1">Đáp án đúng: {correctVal}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <div className="flex justify-between mt-6">
                <Button variant="secondary" onClick={() => setReviewIdx(Math.max(0, reviewIdx - 1))} disabled={reviewIdx === 0}>
                  Câu trước
                </Button>
                {reviewIdx < questions.length - 1 ? (
                  <Button onClick={() => setReviewIdx(reviewIdx + 1)}>Câu tiếp</Button>
                ) : (
                  <Button variant="secondary" onClick={onBack}>Quay lại</Button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="w-48 hidden md:block">
          <div className="bg-white rounded-card shadow-sm p-4 sticky top-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Câu hỏi</p>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const a = reviewAnswers.find((ra) => ra.question_id === q.id);
                const isCorrectQ = a?.score != null && a.score > 0;
                const isWrongQ = a?.score != null && a.score === 0;
                return (
                  <button
                    key={q.id}
                    onClick={() => setReviewIdx(idx)}
                    className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                      idx === reviewIdx ? 'bg-primary text-white'
                        : isCorrectQ ? 'bg-green-100 text-green-700'
                        : isWrongQ ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
