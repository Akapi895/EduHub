import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Send, AlertTriangle, Loader2 } from 'lucide-react';
import ExamTimer from '@/components/exam/ExamTimer';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import { examService } from '@/services/exam.service';
import type { Exam, Question, Answer } from '@/types';

export default function StudentExam() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    const startExam = async () => {
      if (!id) return;
      try {
        // Start/resume exam attempt
        await examService.startExam(id);
        // Fetch exam details and questions
        const [examRes, questionsRes] = await Promise.all([
          examService.getExam(id),
          examService.getQuestions(id),
        ]);
        setExam(examRes.data.data);
        setQuestions(questionsRes.data.data || []);
      } catch (err: any) {
        alert(err.response?.data?.message || 'Không thể bắt đầu bài thi');
        navigate('/student/classes');
      } finally {
        setLoading(false);
      }
    };
    startExam();
  }, [id, navigate]);

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
        } else {
          return { question_id: q.id, text_answer: (ans as string) || '' };
        }
      });
      const res = await examService.submitExam(id, formattedAnswers);
      setScore(res.data.data?.total_score ?? null);
      setSubmitted(true);
      setShowConfirm(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Nộp bài thất bại');
    } finally {
      setSubmitting(false);
    }
  }, [id, answers, questions]);

  const answeredCount = Object.keys(answers).length;

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Send className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Đã nộp bài!</h1>
        <p className="text-gray-500 mb-6">Bài làm của bạn đã được gửi thành công</p>
        {score !== null && <p className="text-3xl font-bold text-primary mb-2">{score} điểm</p>}
        <p className="text-sm text-gray-400 mb-6">Đã trả lời {answeredCount}/{questions.length} câu</p>
        <Button onClick={() => navigate('/student/classes')}>Quay lại lớp học</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-card p-4 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{exam.title}</h1>
          <p className="text-sm text-gray-500">{questions.length} câu hỏi • {exam.question_count || questions.length} câu</p>
        </div>
        <ExamTimer endTime={exam.end_time} onTimeUp={handleSubmit} />
      </div>

      <div className="flex gap-6">
        {/* Question area */}
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

              {currentQ.type === 'matching' && (
                <p className="text-sm text-gray-500 italic">Chức năng nối cột sẽ được cập nhật</p>
              )}

              {/* Navigation */}
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

        {/* Question nav sidebar */}
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
