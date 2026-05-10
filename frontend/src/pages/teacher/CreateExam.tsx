import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Cloud, X, FileText, Clock, Calendar } from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';

const DRAFT_KEY = 'exam-create-draft:';

interface DraftData {
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  savedAt: number;
}

function loadDraft(classId: string): DraftData | null {
  try {
    const raw = localStorage.getItem(`${DRAFT_KEY}${classId}`);
    if (!raw) return null;
    const data = JSON.parse(raw) as DraftData;
    if (Date.now() - data.savedAt > 7 * 24 * 60 * 60 * 1000) {
      localStorage.removeItem(`${DRAFT_KEY}${classId}`);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function saveDraft(classId: string, data: Omit<DraftData, 'savedAt'>) {
  try {
    localStorage.setItem(`${DRAFT_KEY}${classId}`, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch { /* ignore */ }
}

function clearDraft(classId: string) {
  try { localStorage.removeItem(`${DRAFT_KEY}${classId}`); } catch { /* ignore */ }
}

export default function CreateExam() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
  });

  // Load draft on mount
  useEffect(() => {
    if (!classId) return;
    const draft = loadDraft(classId);
    if (draft) {
      setForm({
        title: draft.title,
        description: draft.description,
        start_time: draft.start_time,
        end_time: draft.end_time,
      });
      setHasDraft(true);
    }
  }, [classId]);

  // Auto-save draft on form change
  useEffect(() => {
    if (!classId) return;
    const timeout = setTimeout(() => {
      saveDraft(classId, form);
      setHasDraft(true);
    }, 500);
    return () => clearTimeout(timeout);
  }, [form, classId]);

  const handleClearDraft = () => {
    if (!classId) return;
    clearDraft(classId);
    setHasDraft(false);
    setForm({ title: '', description: '', start_time: '', end_time: '' });
  };

  const handleCreate = async () => {
    if (!classId || !form.title) return;
    setCreating(true);
    try {
      const payload: Record<string, unknown> = {
        title: form.title,
        description: form.description || undefined,
        start_time: form.start_time || undefined,
        end_time: form.end_time || undefined,
      };
      const res = await (await import('@/services/class.service')).classService.createExam(classId, payload);
      const newExam = res.data.data;
      clearDraft(classId);
      navigate(`/teacher/exams/${newExam.id}`);
    } catch (err: any) {
      const { showErrorToast } = await import('@/store/toast.store');
      showErrorToast(err.response?.data?.message || 'Tạo bài kiểm tra thất bại');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={`/teacher/classes/${classId}`} className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Tạo bài kiểm tra mới</h1>
          {hasDraft && (
            <div className="mt-2 inline-flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
              <Cloud className="w-4 h-4" />
              <span>Bản nháp đã được lưu</span>
              <button
                type="button"
                onClick={handleClearDraft}
                className="ml-1 p-0.5 rounded hover:bg-emerald-100"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6 space-y-6">
        <Input
          label="Tên bài kiểm tra"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="VD: Kiểm tra giữa kỳ - Chương 1-3"
          required
        />

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Mô tả</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Mô tả ngắn về bài kiểm tra (không bắt buộc)..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none text-sm bg-gray-50/50 focus:bg-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                Thời gian bắt đầu
              </div>
            </label>
            <input
              type="datetime-local"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm bg-gray-50/50 focus:bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                Thời gian kết thúc
              </div>
            </label>
            <input
              type="datetime-local"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm bg-gray-50/50 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={() => navigate(`/teacher/classes/${classId}`)}>
            Hủy
          </Button>
          <Button onClick={handleCreate} disabled={!form.title || creating} className="flex-1 sm:flex-none">
            {creating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Đang tạo...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Tạo & thêm câu hỏi
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Help text */}
      <div className="text-center text-sm text-gray-500">
        <p>Bạn có thể thiết lập thời gian, số lần làm và các tùy chọn khác sau khi tạo bài kiểm tra.</p>
      </div>
    </div>
  );
}
