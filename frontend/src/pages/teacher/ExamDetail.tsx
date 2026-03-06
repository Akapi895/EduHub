import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Clock, Users, FileText, Settings, Loader2, Eye } from 'lucide-react';
import QuestionEditor from '@/components/exam/QuestionEditor';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import { examService } from '@/services/exam.service';
import { formatDate } from '@/utils/helpers';
import type { Question, Exam, Submission } from '@/types';
import { generateId } from '@/utils/helpers';

export default function TeacherExamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'questions' | 'settings' | 'results'>('questions');
  const [settings, setSettings] = useState({
    duration_minutes: 45, shuffle_questions: false, max_attempts: 1,
    start_time: '', end_time: '',
    allow_review: true, show_answers_policy: 'never',
  });
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const fetchExamData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [examRes, questionsRes] = await Promise.all([
        examService.getExam(id),
        examService.getQuestions(id),
      ]);
      const examData = examRes.data.data;
      setExam(examData);
      setQuestions(questionsRes.data.data || []);
      setSettings({
        duration_minutes: examData.duration_minutes ?? 45,
        shuffle_questions: examData.shuffle_questions ?? false,
        max_attempts: examData.max_attempts ?? 1,
        start_time: examData.start_time ? examData.start_time.slice(0, 16) : '',
        end_time: examData.end_time ? examData.end_time.slice(0, 16) : '',
        allow_review: examData.allow_review ?? true,
        show_answers_policy: examData.show_answers_policy ?? 'never',
      });
      // Fetch submissions
      try {
        const subsRes = await examService.getSubmissions(examData.id);
        setSubmissions(subsRes.data.data || []);
      } catch { /* ignore if forbidden */ }
    } catch {
      setExam(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchExamData();
  }, [fetchExamData]);

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
        <p className="text-gray-500 text-lg">Không tìm thấy bài kiểm tra</p>
        <Link to="/teacher/classes" className="text-primary hover:underline mt-2 inline-block">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const statusColor = exam.status === 'open' ? 'mint' : exam.status === 'upcoming' ? 'yellow' : 'gray';
  const statusLabel = exam.status === 'open' ? 'Đang mở' : exam.status === 'upcoming' ? 'Sắp tới' : 'Đã đóng';

  const handleAddQuestion = async () => {
    try {
      const res = await examService.createQuestion(exam.id, {
        type: 'single_choice',
        content: 'Câu hỏi mới',
        points: 1,
        required: true,
        order_index: questions.length,
        options: [
          { content: 'Đáp án A', is_correct: false },
          { content: 'Đáp án B', is_correct: false },
        ],
      });
      setQuestions([...questions, res.data.data]);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Thêm câu hỏi thất bại');
    }
  };

  const handleChangeQuestion = async (updated: Question) => {
    setQuestions(questions.map((q) => (q.id === updated.id ? updated : q)));
  };

  const handleDeleteQuestion = async (qId: string) => {
    try {
      await examService.deleteQuestion(qId);
      setQuestions(questions.filter((q) => q.id !== qId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Xóa câu hỏi thất bại');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await examService.updateExam(exam.id, settings);
      for (const q of questions) {
        const payload: Record<string, unknown> = {
          type: q.type,
          content: q.content,
          instruction: q.instruction,
          points: q.points,
          required: q.required,
          order_index: q.order_index,
          options: q.options.map((o) => ({ content: o.content, is_correct: o.is_correct })),
        };
        if (q.type === 'matching' && q.matching_pairs) {
          payload.matching_pairs = q.matching_pairs.map((p) => ({ left_text: p.left_text, right_text: p.right_text, correct_match: p.right_text }));
        }
        await examService.updateQuestion(q.id, payload);
      }
      alert('Đã lưu thành công!');
      fetchExamData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to={`/teacher/classes/${exam.class_id}`} className="mt-1.5 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">{exam.title}</h1>
            <Badge variant={statusColor}>{statusLabel}</Badge>
          </div>
          <p className="text-gray-500 mt-1">{exam.description}</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </div>

      {/* Exam meta */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-card p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-lg font-bold">{questions.length}</p>
            <p className="text-xs text-gray-500">Câu hỏi</p>
          </div>
        </div>
        <div className="bg-white rounded-card p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <Settings className="w-5 h-5 text-accent-purple" />
          </div>
          <div>
            <p className="text-lg font-bold">{totalPoints}</p>
            <p className="text-xs text-gray-500">Tổng điểm</p>
          </div>
        </div>
        <div className="bg-white rounded-card p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
            <Clock className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-lg font-bold">{settings.duration_minutes}'</p>
            <p className="text-xs text-gray-500">Thời gian</p>
          </div>
        </div>
        <div className="bg-white rounded-card p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center">
            <Users className="w-5 h-5 text-accent-pink" />
          </div>
          <div>
            <p className="text-lg font-bold">{settings.start_time ? formatDate(settings.start_time) : 'Chưa đặt'}</p>
            <p className="text-xs text-gray-500">Ngày thi</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-card shadow-sm">
        <div className="flex border-b border-border">
          {(['questions', 'settings', 'results'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab ? 'text-primary border-primary' : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              {tab === 'questions' ? 'Câu hỏi' : tab === 'settings' ? 'Cài đặt' : 'Kết quả'}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'questions' && (
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <QuestionEditor
                  key={q.id}
                  question={q}
                  index={idx}
                  onChange={handleChangeQuestion}
                  onDelete={() => handleDeleteQuestion(q.id)}
                />
              ))}
              <button
                onClick={handleAddQuestion}
                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-card text-gray-400 hover:text-primary hover:border-primary transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> Thêm câu hỏi
              </button>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-lg space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu</label>
                <input
                  type="datetime-local"
                  value={settings.start_time}
                  onChange={(e) => setSettings({ ...settings, start_time: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-blue-300 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc</label>
                <input
                  type="datetime-local"
                  value={settings.end_time}
                  onChange={(e) => setSettings({ ...settings, end_time: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-blue-300 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian làm bài (phút)</label>
                <input
                  type="number"
                  value={settings.duration_minutes}
                  onChange={(e) => setSettings({ ...settings, duration_minutes: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-blue-300 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trộn câu hỏi</label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.shuffle_questions}
                    onChange={(e) => setSettings({ ...settings, shuffle_questions: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-600">Trộn thứ tự câu hỏi cho mỗi học sinh</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số lần làm tối đa</label>
                <input
                  type="number"
                  value={settings.max_attempts}
                  onChange={(e) => setSettings({ ...settings, max_attempts: Number(e.target.value) })}
                  min={1}
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-blue-300 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cho phép xem lại bài làm</label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.allow_review}
                    onChange={(e) => setSettings({ ...settings, allow_review: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-600">Học sinh có thể xem lại bài đã làm</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hiển thị đáp án đúng</label>
                <select
                  value={settings.show_answers_policy}
                  onChange={(e) => setSettings({ ...settings, show_answers_policy: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-blue-300 outline-none"
                >
                  <option value="never">Không hiển thị</option>
                  <option value="after_attempts">Sau khi hết lượt làm cá nhân</option>
                  <option value="after_deadline">Sau khi hết hạn làm bài</option>
                  <option value="after_all_complete">Sau khi toàn bộ HS hoàn thành</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'results' && (
            <div>
              {submissions.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <p>Chưa có kết quả nào</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-3 font-medium text-gray-500">Học sinh</th>
                        <th className="pb-3 font-medium text-gray-500">Trạng thái</th>
                        <th className="pb-3 font-medium text-gray-500">Bắt đầu</th>
                        <th className="pb-3 font-medium text-gray-500">Nộp bài</th>
                        <th className="pb-3 font-medium text-gray-500 text-right">Điểm</th>
                        <th className="pb-3 font-medium text-gray-500 text-center">Chi tiết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {submissions.map((sub) => (
                        <tr
                          key={sub.id}
                          onClick={() => sub.status !== 'in_progress' && navigate(`/teacher/exams/${exam.id}/submissions/${sub.id}`)}
                          className={`hover:bg-gray-50 ${sub.status !== 'in_progress' ? 'cursor-pointer' : ''}`}
                        >
                          <td className="py-3 font-medium text-gray-800">{sub.student_name || sub.student_id}</td>
                          <td className="py-3">
                            <Badge variant={sub.status === 'graded' ? 'mint' : sub.status === 'submitted' ? 'yellow' : 'gray'}>
                              {sub.status === 'graded' ? 'Đã chấm' : sub.status === 'submitted' ? 'Đã nộp' : 'Đang làm'}
                            </Badge>
                          </td>
                          <td className="py-3 text-gray-500">{formatDate(sub.started_at)}</td>
                          <td className="py-3 text-gray-500">{sub.submitted_at ? formatDate(sub.submitted_at) : '-'}</td>
                          <td className="py-3 text-right font-bold text-primary">{sub.total_score != null ? sub.total_score : '-'}</td>
                          <td className="py-3 text-center">
                            {sub.status !== 'in_progress' && (
                              <Eye className="w-4 h-4 text-gray-400 inline-block" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
