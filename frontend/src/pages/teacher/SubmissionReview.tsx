import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, Loader2, Save } from 'lucide-react';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import { examService } from '@/services/exam.service';
import { formatDateTime } from '@/utils/helpers';
import type { Question, Submission, SubmissionAnswer } from '@/types';

export default function TeacherSubmissionReview() {
  const { examId, submissionId } = useParams();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<SubmissionAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!examId || !submissionId) return;
    const load = async () => {
      try {
        const [examRes, questionsRes, detailRes] = await Promise.all([
          examService.getExam(examId),
          examService.getQuestions(examId),
          examService.getSubmissionDetail(submissionId),
        ]);
        const detail = detailRes.data.data;
        setSubmission(detail);
        setQuestions(questionsRes.data.data || []);
        setAnswers(detail.answers || []);
      } catch {
        setSubmission(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [examId, submissionId]);

  const handleGrade = async (answerId: string, maxPoints: number) => {
    const val = parseFloat(gradeInputs[answerId] ?? '');
    if (isNaN(val) || val < 0 || val > maxPoints) {
      alert(`Điểm phải từ 0 đến ${maxPoints}`);
      return;
    }
    setSaving((s) => ({ ...s, [answerId]: true }));
    try {
      const res = await examService.gradeAnswer(answerId, val);
      const data = res.data.data;
      setAnswers((prev) => prev.map((a) => a.id === answerId ? { ...a, score: data.score } : a));
      setSubmission((s) => s ? {
        ...s,
        total_score: data.submission_total_score,
        status: data.submission_status,
      } : s);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Chấm điểm thất bại');
    } finally {
      setSaving((s) => ({ ...s, [answerId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Không tìm thấy bài làm</p>
        <Link to={`/teacher/exams/${examId}`} className="text-primary hover:underline mt-2 inline-block">
          Quay lại
        </Link>
      </div>
    );
  }

  const statusBadge = submission.status === 'graded'
    ? { label: 'Đã chấm', variant: 'mint' as const }
    : submission.status === 'submitted'
    ? { label: 'Chờ chấm', variant: 'yellow' as const }
    : { label: 'Đang làm', variant: 'gray' as const };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to={`/teacher/exams/${examId}`} className="mt-1.5 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-800">
            Bài làm của {submission.student_name || 'Học sinh'}
          </h1>
          <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
            <span>Bắt đầu: {formatDateTime(submission.started_at)}</span>
            {submission.submitted_at && <span>Nộp: {formatDateTime(submission.submitted_at)}</span>}
            <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
            {submission.total_score != null && (
              <span className="font-bold text-primary text-base">{submission.total_score} điểm</span>
            )}
          </div>
        </div>
      </div>

      {/* Questions & Answers */}
      <div className="space-y-4">
        {questions.map((q, idx) => {
          const ans = answers.find((a) => a.question_id === q.id);
          const isText = q.type === 'text' || q.type === 'image_upload';
          const needsGrading = isText && (ans?.score == null);

          return (
            <div key={q.id} className={`bg-white rounded-card shadow-sm p-5 ${needsGrading ? 'ring-2 ring-yellow-300' : ''}`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-bold">
                  {idx + 1}
                </span>
                <span className="text-xs text-gray-400 uppercase">{q.type.replace('_', ' ')}</span>
                <span className="text-xs text-gray-500">{q.points} điểm</span>
                {ans?.score != null && (
                  <span className={`text-sm font-semibold ml-auto ${ans.score > 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {ans.score}/{q.points}
                  </span>
                )}
                {needsGrading && (
                  <span className="text-xs text-yellow-600 font-medium ml-auto">Chưa chấm</span>
                )}
              </div>

              <p className="text-gray-800 font-medium mb-4">{q.content}</p>

              {/* Single/Multi choice */}
              {(q.type === 'single_choice' || q.type === 'multi_choice') && (
                <div className="space-y-2">
                  {q.options?.map((opt) => {
                    const wasSelected = (ans?.selected_option_ids || []).includes(opt.id);
                    const isCorrect = opt.is_correct;
                    let cls = 'border-border';
                    if (wasSelected && isCorrect) cls = 'border-green-500 bg-green-50';
                    else if (wasSelected && !isCorrect) cls = 'border-red-400 bg-red-50';
                    else if (isCorrect) cls = 'border-green-300 bg-green-50/50';

                    return (
                      <div key={opt.id} className={`px-4 py-2.5 rounded-xl border-2 ${cls} flex items-center justify-between`}>
                        <span className="text-sm">{opt.content}</span>
                        <div className="flex items-center gap-1">
                          {wasSelected && isCorrect && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                          {wasSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-500" />}
                          {!wasSelected && isCorrect && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Matching */}
              {q.type === 'matching' && q.matching_pairs && (() => {
                let matchVals: string[] = [];
                try { matchVals = JSON.parse(ans?.text_answer || '[]'); } catch { /* ignore */ }
                return (
                  <div className="space-y-2">
                    {q.matching_pairs.map((pair, pIdx) => (
                      <div key={pair.id} className="flex items-center gap-3">
                        <div className="flex-1 px-3 py-2 rounded-xl bg-gray-50 border border-border text-sm">
                          {pair.left_text}
                        </div>
                        <span className="text-gray-400">→</span>
                        <div className={`flex-1 px-3 py-2 rounded-xl border text-sm ${
                          matchVals[pIdx] === pair.right_text ? 'border-green-500 bg-green-50' : 'border-red-400 bg-red-50'
                        }`}>
                          {matchVals[pIdx] || <span className="text-gray-400 italic">Chưa chọn</span>}
                          {matchVals[pIdx] !== pair.right_text && (
                            <span className="text-xs text-green-600 ml-2">({pair.right_text})</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Text */}
              {q.type === 'text' && (
                <div className="space-y-3">
                  <div className="px-4 py-3 rounded-xl border border-border bg-gray-50 text-sm whitespace-pre-wrap">
                    {ans?.text_answer || <span className="text-gray-400 italic">Không trả lời</span>}
                  </div>
                  {/* Grading input */}
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-600">Chấm điểm:</label>
                    <input
                      type="number"
                      min={0}
                      max={q.points}
                      step={0.5}
                      value={gradeInputs[ans?.id ?? ''] ?? (ans?.score != null ? String(ans.score) : '')}
                      onChange={(e) => setGradeInputs({ ...gradeInputs, [ans?.id ?? '']: e.target.value })}
                      className="w-20 px-2 py-1.5 rounded-lg border border-border text-sm focus:ring-2 focus:ring-blue-300 outline-none"
                      placeholder={`0-${q.points}`}
                    />
                    <span className="text-xs text-gray-400">/ {q.points}</span>
                    {ans && (
                      <Button
                        size="sm"
                        onClick={() => handleGrade(ans.id, q.points)}
                        disabled={saving[ans.id]}
                      >
                        <Save className="w-3.5 h-3.5 mr-1" />
                        {saving[ans.id] ? 'Đang lưu...' : 'Lưu điểm'}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
