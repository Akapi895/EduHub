import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Send, Loader2 } from 'lucide-react';
import Button from '@/components/common/Button';
import { examService } from '@/services/exam.service';
import type { Exam, Question, Answer, Submission, SubmissionAnswer } from '@/types';

import ExamStartScreen from './exam/ExamStartScreen';
import ExamHistoryView from './exam/ExamHistoryView';
import ExamTakingView from './exam/ExamTakingView';
import ExamReviewView from './exam/ExamReviewView';

type Phase = 'loading' | 'history' | 'start-confirm' | 'taking' | 'review' | 'submitted';

const ANSWERS_STORAGE_PREFIX = 'exam_answers_';

export default function StudentExam() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const goBack = () => {
    const from = searchParams.get('from');
    const classId = searchParams.get('classId');
    if (from === 'class' && classId) {
      navigate(`/student/classes/${classId}?tab=exams`);
    } else {
      navigate('/student/exams');
    }
  };

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
  const [deadline, setDeadline] = useState<string | null>(null);

  // Review state
  const [reviewAnswers, setReviewAnswers] = useState<SubmissionAnswer[]>([]);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);

  // Compute deadline from submission started_at + exam config
  const computeDeadline = (examData: Exam, startedAt: string) => {
    const candidates: number[] = [];
    if (examData.end_time) candidates.push(new Date(examData.end_time).getTime());
    if (examData.duration_minutes && startedAt) {
      candidates.push(new Date(startedAt).getTime() + examData.duration_minutes * 60 * 1000);
    }
    if (candidates.length > 0) {
      return new Date(Math.min(...candidates)).toISOString();
    }
    return examData.end_time || null;
  };

  // Load questions (only when entering taking phase)
  const loadQuestions = async (examId: string) => {
    const res = await examService.getQuestions(examId);
    setQuestions(res.data.data || []);
  };

  // Load exam and submission history (NO questions loaded here)
  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const [examRes, mySubs] = await Promise.all([
          examService.getExam(id),
          examService.getMySubmissions(id),
        ]);
        const examData = examRes.data.data;
        setExam(examData);

        const subsData = mySubs.data.data;
        const subs: Submission[] = subsData.submissions || [];
        const maxAtt = subsData.max_attempts ?? 1;
        const canReview = subsData.allow_review ?? false;

        setPastSubmissions(subs);
        setMaxAttempts(maxAtt);
        setAllowReview(canReview);
        setShowAnswersPolicy(subsData.show_answers_policy ?? 'never');

        // If there's an in-progress submission and exam is still open, resume + load questions
        const inProgress = subs.find((s) => s.status === 'in_progress');
        if (inProgress && examData.status === 'open') {
          await loadQuestions(id);
          // Restore saved answers from localStorage
          try {
            const saved = localStorage.getItem(ANSWERS_STORAGE_PREFIX + id);
            if (saved) setAnswers(JSON.parse(saved));
          } catch { /* ignore */ }
          setDeadline(computeDeadline(examData, inProgress.started_at));
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
              await loadQuestions(id);
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
    let newAnswers: Record<string, string | string[]>;
    if (currentQ?.type === 'multi_choice') {
      const prev = (answers[qId] as string[]) || [];
      const updated = prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value];
      newAnswers = { ...answers, [qId]: updated };
    } else {
      newAnswers = { ...answers, [qId]: value };
    }
    setAnswers(newAnswers);
    if (id) {
      try { localStorage.setItem(ANSWERS_STORAGE_PREFIX + id, JSON.stringify(newAnswers)); } catch { /* ignore */ }
    }
  };

  const handleMatchAnswer = (qId: string, newMatch: string[]) => {
    const newAnswers = { ...answers, [qId]: newMatch };
    setAnswers(newAnswers);
    if (id) {
      try { localStorage.setItem(ANSWERS_STORAGE_PREFIX + id, JSON.stringify(newAnswers)); } catch { /* ignore */ }
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
      localStorage.removeItem(ANSWERS_STORAGE_PREFIX + id);
      const mySubs = await examService.getMySubmissions(id);
      setPastSubmissions(mySubs.data.data.submissions || []);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Nộp bài thất bại');
    } finally {
      setSubmitting(false);
    }
  }, [id, answers, questions]);

  const answeredCount = questions.reduce((count, q) => {
    const ans = answers[q.id];
    if (!ans) return count;
    if (q.type === 'multi_choice') return count + ((ans as string[]).length > 0 ? 1 : 0);
    if (q.type === 'text') return count + ((ans as string).trim().length > 0 ? 1 : 0);
    if (q.type === 'matching') return count + ((ans as string[]).some((v) => v) ? 1 : 0);
    return count + 1;
  }, 0);

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
    if (!id || !exam) return;
    try {
      const res = await examService.startExam(id);
      const submission = res.data.data;
      await loadQuestions(id);
      setAnswers({});
      setCurrentIdx(0);
      setDeadline(computeDeadline(exam, submission.started_at));
      setPhase('taking');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể bắt đầu lượt làm mới');
    }
  };

  const handleReview = async (submissionId: string) => {
    if (!id) return;
    try {
      // Load questions if not already loaded (needed for review rendering)
      if (questions.length === 0) {
        await loadQuestions(id);
      }
      const res = await examService.getSubmissionDetail(submissionId);
      setReviewAnswers(res.data.data.answers || []);
      setReviewIdx(0);
      setShowCorrect(canShowAnswers());
      setPhase('review');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xem bài làm');
    }
  };

  // === LOADING ===
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

  // === PHASE ROUTING ===
  if (phase === 'start-confirm') {
    return (
      <ExamStartScreen
        exam={exam}
        maxAttempts={maxAttempts}
        completedCount={completedCount}
        onStart={handleStartNew}
        onBack={() => setPhase('history')}
      />
    );
  }

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

  if (phase === 'history') {
    return (
      <ExamHistoryView
        exam={exam}
        pastSubmissions={pastSubmissions}
        maxAttempts={maxAttempts}
        completedCount={completedCount}
        canStartNew={canStartNew}
        allowReview={allowReview}
        onStartNew={() => setPhase('start-confirm')}
        onReview={handleReview}
        onBack={goBack}
      />
    );
  }

  if (phase === 'review') {
    return (
      <ExamReviewView
        examTitle={exam.title}
        questions={questions}
        reviewAnswers={reviewAnswers}
        reviewIdx={reviewIdx}
        setReviewIdx={setReviewIdx}
        showCorrect={showCorrect}
        onBack={goBack}
      />
    );
  }

  // === PHASE: TAKING (default) ===
  return (
    <ExamTakingView
      examTitle={exam.title}
      questions={questions}
      answers={answers}
      currentIdx={currentIdx}
      setCurrentIdx={setCurrentIdx}
      deadline={deadline}
      answeredCount={answeredCount}
      showConfirm={showConfirm}
      setShowConfirm={setShowConfirm}
      submitting={submitting}
      onAnswer={handleAnswer}
      onMatchAnswer={handleMatchAnswer}
      onSubmit={handleSubmit}
      onTimeUp={handleSubmit}
    />
  );
}
