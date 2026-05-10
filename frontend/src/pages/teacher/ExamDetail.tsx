import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Clock, Users, FileText, Settings, Loader2, Eye, Cloud, CheckCircle, AlertCircle } from 'lucide-react';
import QuestionEditor from '@/components/exam/QuestionEditor';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import { examService } from '@/services/exam.service';
import { showErrorToast, showSuccessToast } from '@/store/toast.store';
import { formatDate } from '@/utils/helpers';
import { useAutoSave } from '@/hooks/useAutoSave';
import type { Question, Exam, Submission } from '@/types';

export default function TeacherExamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastAutoSaved, setLastAutoSaved] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'questions' | 'settings' | 'results'>('questions');
  const [settings, setSettings] = useState({
    duration_minutes: 45, shuffle_questions: false, max_attempts: 1,
    start_time: '', end_time: '',
    allow_review: true, show_answers_policy: 'never',
  });
  const [submissions, setSubmissions] = useState<Submission[]>([]);

  const settingsRef = useRef(settings);
  const questionsRef = useRef(questions);
  settingsRef.current = settings;
  questionsRef.current = questions;

  const doAutoSave = useCallback(async () => {
    if (!id) return;
    setAutoSaving(true);
    try {
      await examService.updateExam(id, settingsRef.current);
      const currentQuestions = questionsRef.current;
      for (const q of currentQuestions) {
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
          payload.matching_pairs = q.matching_pairs.map((p) => ({
            left_text: p.left_text,
            right_text: p.right_text,
            correct_match: p.right_text,
          }));
        }
        await examService.updateQuestion(q.id, payload);
      }
      setLastAutoSaved(new Date());
    } catch {
      // Silent fail for auto-save
    } finally {
      setAutoSaving(false);
    }
  }, [id]);

  const { trigger: triggerAutoSave, saveNow: saveNow } = useAutoSave({
    delay: 3000,
    onSave: doAutoSave,
    disabled: !id,
  });

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
      try {
        const subsRes = await examService.getSubmissions(examData.id);
        setSubmissions(subsRes.data.data || []);
      } catch { /* ignore */ }
    } catch {
      setExam(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchExamData();
  }, [fetchExamData]);

  useEffect(() => {
    if (loading) return;
    triggerAutoSave();
  }, [questions, triggerAutoSave, loading]);

  useEffect(() => {
    if (loading) return;
    triggerAutoSave();
  }, [settings, triggerAutoSave, loading]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
        <p className="text-gray-500">Đang tải thông tin bài kiểm tra...</p>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-lg font-medium text-gray-900 mb-4">Không tìm thấy bài kiểm tra</p>
        <Link to="/teacher/classes" className="text-primary hover:underline">
          Quay lại danh sách lớp học
        </Link>
      </div>
    );
  }

  const statusConfig = {
    open: { variant: 'green' as const, label: 'Đang mở' },
    upcoming: { variant: 'yellow' as const, label: 'Sắp tới' },
    closed: { variant: 'gray' as const, label: 'Đã đóng' },
  };
  const status = exam.status === 'open' ? statusConfig.open : exam.status === 'upcoming' ? statusConfig.upcoming : statusConfig.closed;

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
      triggerAutoSave();
    } catch (err: any) {
      showErrorToast(err.response?.data?.message || 'Thêm câu hỏi thất bại');
    }
  };

  const handleChangeQuestion = async (updated: Question) => {
    setQuestions((prev) => {
      const next = prev.map((q) => (q.id === updated.id ? updated : q));
      return next;
    });
    triggerAutoSave();
  };

  const handleDeleteQuestion = async (qId: string) => {
    try {
      await examService.deleteQuestion(qId);
      const next = questions.filter((q) => q.id !== qId);
      setQuestions(next);
      triggerAutoSave();
    } catch (err: any) {
      showErrorToast(err.response?.data?.message || 'Xóa câu hỏi thất bại');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveNow();
      await examService.updateExam(exam!.id, settings);
      showSuccessToast('Đã lưu thành công!');
      fetchExamData();
    } catch (err: any) {
      showErrorToast(err.response?.data?.message || 'Lưu thất bại');
    } finally {
      setSaving(false);
    }
  };

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  const formatAutoSaveTime = (date: Date | null) => {
    if (!date) return '';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    if (diffMs < 60_000) return 'vừa xong';
    const mins = Math.floor(diffMs / 60_000);
    return `${mins} phút trước`;
  };

  const tabs = [
    { key: 'questions' as const, label: 'Câu hỏi', icon: FileText },
    { key: 'settings' as const, label: 'Cài đặt', icon: Settings },
    { key: 'results' as const, label: 'Kết quả', icon: CheckCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <Link to={`/teacher/classes/${exam.class_id}`} className="mt-1 p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{exam.title}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="text-gray-500 mt-1">{exam.description}</p>
          {(lastAutoSaved || autoSaving) && (
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
              <Cloud className="w-3.5 h-3.5" />
              <span>
                {autoSaving ? 'Đang lưu...' : `Đã lưu tự động ${formatAutoSaveTime(lastAutoSaved)}`}
              </span>
            </div>
          )}
        </div>
        <Button onClick={handleSave} disabled={saving || autoSaving} className="shrink-0">
          <Save className="w-4 h-4 mr-2" /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </div>

      {/* Exam meta */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{questions.length}</p>
            <p className="text-xs text-gray-500">Câu hỏi</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
            <Settings className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{totalPoints}</p>
            <p className="text-xs text-gray-500">Tổng điểm</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
            <Clock className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{settings.duration_minutes}'</p>
            <p className="text-xs text-gray-500">Thời gian</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center">
            <Users className="w-5 h-5 text-pink-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{submissions.length}</p>
            <p className="text-xs text-gray-500">Lượt làm</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
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
                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:text-primary hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" /> Thêm câu hỏi mới
              </button>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-lg space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Ngày bắt đầu</label>
                  <input
                    type="datetime-local"
                    value={settings.start_time}
                    onChange={(e) => setSettings({ ...settings, start_time: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Ngày kết thúc</label>
                  <input
                    type="datetime-local"
                    value={settings.end_time}
                    onChange={(e) => setSettings({ ...settings, end_time: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Thời gian làm bài (phút)</label>
                <input
                  type="number"
                  value={settings.duration_minutes}
                  onChange={(e) => setSettings({ ...settings, duration_minutes: Number(e.target.value) })}
                  min={1}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Số lần làm tối đa</label>
                <input
                  type="number"
                  value={settings.max_attempts}
                  onChange={(e) => setSettings({ ...settings, max_attempts: Number(e.target.value) })}
                  min={1}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.shuffle_questions}
                    onChange={(e) => setSettings({ ...settings, shuffle_questions: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Trộn câu hỏi</p>
                    <p className="text-xs text-gray-500">Mỗi học sinh sẽ nhận thứ tự câu hỏi khác nhau</p>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.allow_review}
                    onChange={(e) => setSettings({ ...settings, allow_review: e.target.checked })}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Cho phép xem lại bài</p>
                    <p className="text-xs text-gray-500">Học sinh có thể xem lại bài đã làm</p>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Hiển thị đáp án đúng</label>
                <select
                  value={settings.show_answers_policy}
                  onChange={(e) => setSettings({ ...settings, show_answers_policy: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
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
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">Chưa có kết quả nào</p>
                  <p className="text-sm text-gray-400 mt-1">Kết quả sẽ hiển thị sau khi học sinh nộp bài</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left">
                        <th className="pb-3 font-semibold text-gray-600">Học sinh</th>
                        <th className="pb-3 font-semibold text-gray-600">Trạng thái</th>
                        <th className="pb-3 font-semibold text-gray-600">Bắt đầu</th>
                        <th className="pb-3 font-semibold text-gray-600">Nộp bài</th>
                        <th className="pb-3 font-semibold text-gray-600 text-right">Điểm</th>
                        <th className="pb-3"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {submissions.map((sub) => (
                        <tr
                          key={sub.id}
                          onClick={() => sub.status !== 'in_progress' && navigate(`/teacher/exams/${exam.id}/submissions/${sub.id}`)}
                          className={`hover:bg-gray-50/50 ${sub.status !== 'in_progress' ? 'cursor-pointer' : ''}`}
                        >
                          <td className="py-3 font-medium text-gray-900">{sub.student_name || sub.student_id}</td>
                          <td className="py-3">
                            <Badge variant={sub.status === 'graded' ? 'green' : sub.status === 'submitted' ? 'yellow' : 'gray'}>
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
