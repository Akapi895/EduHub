import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Send, AlertTriangle, Loader2, Eye, Play, ArrowLeft, CheckCircle2, Clock, XCircle } from 'lucide-react';
import ExamTimer from '@/components/exam/ExamTimer';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import Modal from '@/components/common/Modal';
import { examService } from '@/services/exam.service';
import { formatDate } from '@/utils/helpers';
import type { Exam, Question, Answer, Submission, SubmissionAnswer } from '@/types';

type Phase = 'loading' | 'history' | 'taking' | 'review' | 'submitted';

export default function StudentExam() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Shared state
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<Phase>('loading');

  // History state
  const [pastSubmissions, setPastSubmissions] = useState<Submission[]>([]);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [allowReview, setAllowReview] = useState(false);
  const [showAnswersPolicy, setShowAnswersPolicy] = useState('never');

  // Taking state
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitScore, setSubmitScore] = useState<number | null>(null);

  // Review state
  const [reviewAnswers, setReviewAnswers] = useState<SubmissionAnswer[]>([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);

  // Load exam and submission history
  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const [examRes, questionsRes, mySubs] = await Promise.all([
          examService.getExam(id),
          examService.getQuestions(id),
          examService.getMySubmissions(id),
        ]);
        const examData = examRes.data.data;
        setExam(examData);
        setQuestions(questionsRes.data.data || []);

        const subsData = mySubs.data.data;
        const subs: Submission[] = subsData.submissions || [];
        const maxAtt = subsData.max_attempts ?? 1;
        const canReview = subsData.allow_review ?? false;

        setPastSubmissions(subs);
        setMaxAttempts(maxAtt);
        setAllowReview(canReview);
        setShowAnswersPolicy(subsData.show_answers_policy ?? 'never');

        // If there's an in-progress submission and exam is still open, resume it
        const inProgress = subs.find((s) => s.status === 'in_progress');
        if (inProgress && examData.status === 'open') {
          setPhase('taking');
          return;
        }

        // Count completed attempts (submitted or graded)
        const done = subs.filter((s) => s.status !== 'in_progress').length;

        // If attempts exhausted, auto-review the latest completed attempt
        if (done >= maxAtt && done > 0) {
          const lastDone = subs.find((s) => s.status !== 'in_progress');
          if (lastDone && canReview) {
            try {
              const detail = await examService.getSubmissionDetail(lastDone.id);
              setReviewAnswers(detail.data.data.answers || []);
              setReviewIdx(0);
              setShowCorrect(
                subsData.show_answers_policy === 'never' ? false :
                subsData.show_answers_policy === 'after_attempts' ? true :
                subsData.show_answers_policy === 'after_deadline' ? examData.status === 'closed' :
                false
              );
              setPhase('review');
              return;
            } catch { /* fall through to history */ }
          }
          // If review not allowed or fails, show history (no start button)
          setPhase('history');
          return;
        }

        // Attempts remaining – show history with start button
        setPhase('history');
      } catch (err: any) {
        alert(err.response?.data?.message || 'Không thể tải bài thi');
        navigate('/student/classes');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, navigate]);

  const currentQ = questions[currentIdx];

  const handleAnswer = (qId: string, value: string) => {
    if (currentQ?.type === 'multi_choice') {
      const prev = (answers[qId] as string[]) || [];
      const updated = prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value];
      setAnswers({ ...answers, [qId]: updated });
    } else {
      setAnswers({ ...answers, [qId]: value });
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      const formattedAnswers: Answer[] = questions.map((q) => {
        const ans = answers[q.id];
        if (q.type === 'single_choice') {
          return { question_id: q.id, selected_option_ids: ans ? [ans as string] : [] };
        } else if (q.type === 'multi_choice') {
          return { question_id: q.id, selected_option_ids: (ans as string[]) || [] };
        } else if (q.type === 'matching') {
          return { question_id: q.id, text_answer: JSON.stringify(ans || []) };
        } else {
          return { question_id: q.id, text_answer: (ans as string) || '' };
        }
      });
      const res = await examService.submitExam(id, formattedAnswers);
      setSubmitScore(res.data.data?.total_score ?? null);
      setShowConfirm(false);
      setPhase('submitted');
      // Refresh submission history
      const mySubs = await examService.getMySubmissions(id);
      setPastSubmissions(mySubs.data.data.submissions || []);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Nộp bài thất bại');
    } finally {
      setSubmitting(false);
    }
  }, [id, answers, questions]);

  const answeredCount = Object.keys(answers).length;

  const completedCount = pastSubmissions.filter((s) => s.status !== 'in_progress').length;
  const canStartNew = completedCount < maxAttempts && exam?.status === 'open';

  const canShowAnswers = useCallback(() => {
    if (showAnswersPolicy === 'never') return false;
    if (showAnswersPolicy === 'after_attempts') return completedCount >= maxAttempts;
    if (showAnswersPolicy === 'after_deadline') return exam?.status === 'closed';
    if (showAnswersPolicy === 'after_all_complete') return exam?.status === 'closed';
    return false;
  }, [showAnswersPolicy, completedCount, maxAttempts, exam?.status]);

  const handleStartNew = async () => {
    if (!id) return;
    try {
      await examService.startExam(id);
      setAnswers({});
      setCurrentIdx(0);
      setPhase('taking');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể bắt đầu lượt làm mới');
    }
  };

  const handleReview = async (submissionId: string) => {
    try {
      const res = await examService.getSubmissionDetail(submissionId);
      setReviewAnswers(res.data.data.answers || []);
      setReviewIdx(0);
      setShowCorrect(canShowAnswers());
      setPhase('review');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xem bài làm');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Không tìm thấy bài thi</p>
        <Link to="/student/classes" className="text-primary hover:underline mt-2 inline-block">Quay lại</Link>
      </div>
    );
  }

  // === PHASE: SUBMITTED ===
  if (phase === 'submitted') {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Send className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Đã nộp bài!</h1>
        <p className="text-gray-500 mb-6">Bài làm của bạn đã được gửi thành công</p>
        {submitScore !== null && <p className="text-3xl font-bold text-primary mb-2">{submitScore} điểm</p>}
        <p className="text-sm text-gray-400 mb-6">Đã trả lời {answeredCount}/{questions.length} câu</p>
        <Button onClick={() => setPhase('history')}>Xem lịch sử bài làm</Button>
      </div>
    );
  }

  // === PHASE: HISTORY ===
  if (phase === 'history') {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{exam.title}</h1>
            <p className="text-sm text-gray-500">
              {questions.length} câu hỏi • Tối đa {maxAttempts} lượt • Đã làm {completedCount}/{maxAttempts}
            </p>
          </div>
        </div>

        {/* Attempt list */}
        <div className="bg-white rounded-card shadow-sm divide-y divide-border">
          {pastSubmissions.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <p className="mb-1">Bạn chưa làm bài thi này</p>
              <p className="text-xs">Nhấn nút bên dưới để bắt đầu</p>
            </div>
          ) : (
            pastSubmissions.map((sub, idx) => (
              <div key={sub.id} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    sub.status === 'graded' ? 'bg-green-100' : sub.status === 'submitted' ? 'bg-yellow-100' : 'bg-gray-100'
                  }`}>
                    {sub.status === 'graded' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
                     sub.status === 'submitted' ? <Clock className="w-5 h-5 text-yellow-600" /> :
                     <Play className="w-5 h-5 text-gray-500" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Lượt {pastSubmissions.length - idx}</p>
                    <p className="text-xs text-gray-400">
                      {sub.submitted_at ? `Nộp: ${formatDate(sub.submitted_at)}` : `Bắt đầu: ${formatDate(sub.started_at)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {sub.total_score != null && (
                    <span className="text-lg font-bold text-primary">{sub.total_score} điểm</span>
                  )}
                  <Badge variant={sub.status === 'graded' ? 'mint' : sub.status === 'submitted' ? 'yellow' : 'gray'}>
                    {sub.status === 'graded' ? 'Đã chấm' : sub.status === 'submitted' ? 'Đã nộp' : 'Đang làm'}
                  </Badge>
                  {allowReview && sub.status !== 'in_progress' && (
                    <Button size="sm" variant="secondary" onClick={() => handleReview(sub.id)}>
                      <Eye className="w-4 h-4 mr-1" /> Xem lại
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Start new attempt */}
        {canStartNew && (
          <Button onClick={handleStartNew} className="w-full">
            <Play className="w-4 h-4 mr-2" />
            {completedCount === 0 ? 'Bắt đầu làm bài' : 'Làm lại bài thi'}
          </Button>
        )}
        {!canStartNew && completedCount >= maxAttempts && (
          <p className="text-center text-sm text-gray-400">Bạn đã hết lượt làm bài</p>
        )}
        {!canStartNew && exam.status !== 'open' && completedCount < maxAttempts && (
          <p className="text-center text-sm text-gray-400">
            {exam.status === 'upcoming' ? 'Bài thi chưa mở' : 'Bài thi đã đóng'}
          </p>
        )}
      </div>
    );
  }

  // === PHASE: REVIEW ===
  if (phase === 'review') {
    const rq = questions[reviewIdx];
    const rAnswer = reviewAnswers.find((a) => a.question_id === rq?.id);

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-card p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setPhase('history')} className="text-gray-400 hover:text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">{exam.title} - Xem lại</h1>
              <p className="text-sm text-gray-500">{questions.length} câu hỏi</p>
            </div>
          </div>
          {rAnswer?.score != null && (
            <span className="text-sm font-medium text-gray-500">Điểm câu này: {rAnswer.score}/{rq?.points}</span>
          )}
        </div>

        <div className="flex gap-6">
          <div className="flex-1">
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
                      const isCorrect = opt.is_correct;
                      let borderClass = 'border-border';
                      if (wasSelected && showCorrect && isCorrect) borderClass = 'border-green-500 bg-green-50';
                      else if (wasSelected && showCorrect && !isCorrect) borderClass = 'border-red-400 bg-red-50';
                      else if (wasSelected) borderClass = 'border-primary bg-blue-50';
                      else if (showCorrect && isCorrect) borderClass = 'border-green-300 bg-green-50/50';

                      return (
                        <div key={opt.id} className={`px-4 py-3 rounded-xl border-2 ${borderClass} flex items-center justify-between`}>
                          <span className="text-sm">{opt.content}</span>
                          <div className="flex items-center gap-1">
                            {wasSelected && <span className="text-xs text-gray-400">Đã chọn</span>}
                            {showCorrect && isCorrect && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                            {showCorrect && wasSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-500" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {rq.type === 'text' && (
                  <div className="px-4 py-3 rounded-xl border border-border bg-gray-50 text-sm">
                    {rAnswer?.text_answer || <span className="text-gray-400 italic">Không trả lời</span>}
                  </div>
                )}

                {rq.type === 'matching' && rq.matching_pairs && (() => {
                  let matchVals: string[] = [];
                  try { matchVals = JSON.parse(rAnswer?.text_answer || '[]'); } catch { /* ignore */ }
                  return (
                    <div className="space-y-3">
                      {rq.matching_pairs.map((pair, pIdx) => (
                        <div key={pair.id} className="flex items-center gap-3">
                          <div className="flex-1 px-4 py-3 rounded-xl bg-gray-50 border border-border text-sm font-medium">
                            {pair.left_text}
                          </div>
                          <span className="text-gray-400">→</span>
                          <div className={`flex-1 px-4 py-3 rounded-xl border text-sm ${
                            showCorrect
                              ? matchVals[pIdx] === pair.right_text ? 'border-green-500 bg-green-50' : 'border-red-400 bg-red-50'
                              : 'border-border bg-gray-50'
                          }`}>
                            {matchVals[pIdx] || <span className="text-gray-400 italic">Chưa chọn</span>}
                            {showCorrect && matchVals[pIdx] !== pair.right_text && (
                              <span className="text-xs text-green-600 ml-2">({pair.right_text})</span>
                            )}
                          </div>
                        </div>
                      ))}
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
                    <Button variant="secondary" onClick={() => setPhase('history')}>Quay lại</Button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="w-48">
            <div className="bg-white rounded-card shadow-sm p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Câu hỏi</p>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const a = reviewAnswers.find((ra) => ra.question_id === q.id);
                  const hasAnswer = a && (a.text_answer || (a.selected_option_ids && a.selected_option_ids.length > 0));
                  return (
                    <button
                      key={q.id}
                      onClick={() => setReviewIdx(idx)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                        idx === reviewIdx ? 'bg-primary text-white' : hasAnswer ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
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

  // === PHASE: TAKING ===
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-card p-4 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{exam.title}</h1>
          <p className="text-sm text-gray-500">{questions.length} câu hỏi</p>
        </div>
        <ExamTimer endTime={exam.end_time} onTimeUp={handleSubmit} />
      </div>

      <div className="flex gap-6">
        <div className="flex-1">
          {currentQ && (
            <div className="bg-white rounded-card shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {currentIdx + 1}
                </span>
                <span className="text-sm text-gray-500">{currentQ.points} điểm</span>
              </div>
              <p className="text-lg font-medium mb-6">{currentQ.content}</p>

              {(currentQ.type === 'single_choice' || currentQ.type === 'multi_choice') && (
                <div className="space-y-3">
                  {currentQ.options?.map((opt) => {
                    const isSelected =
                      currentQ.type === 'multi_choice'
                        ? ((answers[currentQ.id] as string[]) || []).includes(opt.id)
                        : answers[currentQ.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleAnswer(currentQ.id, opt.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                          isSelected
                            ? 'border-primary bg-blue-50 text-primary'
                            : 'border-border hover:border-gray-300'
                        }`}
                      >
                        <span className="text-sm">{opt.content}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {currentQ.type === 'text' && (
                <textarea
                  value={(answers[currentQ.id] as string) || ''}
                  onChange={(e) => handleAnswer(currentQ.id, e.target.value)}
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
                            setAnswers({ ...answers, [currentQ.id]: newMatch });
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

        <div className="w-48">
          <div className="bg-white rounded-card shadow-sm p-4">
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

      <Modal isOpen={showConfirm} onClose={() => setShowConfirm(false)} title="Xác nhận nộp bài" size="sm">
        <div className="space-y-4">
          {answeredCount < questions.length && (
            <div className="flex items-start gap-3 bg-yellow-50 p-3 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Chưa hoàn thành</p>
                <p className="text-xs text-yellow-600">
                  Bạn đã trả lời {answeredCount}/{questions.length} câu hỏi
                </p>
              </div>
            </div>
          )}
          <p className="text-sm text-gray-600">Bạn có chắc muốn nộp bài? Sau khi nộp sẽ không thể sửa được.</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowConfirm(false)}>Tiếp tục làm</Button>
            <Button onClick={handleSubmit} disabled={submitting}>{submitting ? 'Đang nộp...' : 'Nộp bài'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
