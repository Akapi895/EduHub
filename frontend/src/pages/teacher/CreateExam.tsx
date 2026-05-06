import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, Cloud, X } from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { classService } from '@/services/class.service';
import { showErrorToast } from '@/store/toast.store';

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
      const res = await classService.createExam(classId, payload);
      const newExam = res.data.data;
      clearDraft(classId);
      navigate(`/teacher/exams/${newExam.id}`);
    } catch (err: any) {
      showErrorToast(err.response?.data?.message || 'Tạo bài kiểm tra thất bại');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link to={`/teacher/classes/${classId}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">Tạo bài kiểm tra</h1>
          {hasDraft && (
            <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-emerald-600">
              <Cloud className="w-3.5 h-3.5" />
              <span>Đã lưu bản nháp</span>
              <button
                type="button"
                onClick={handleClearDraft}
                className="ml-0.5 rounded bg-emerald-100 px-1.5 py-0.5 hover:bg-emerald-200"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-card shadow-sm p-6 space-y-5">
        <Input
          label="Tên bài kiểm tra"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="VD: Kiểm tra giữa kỳ - Chương 1-3"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Mô tả ngắn về bài kiểm tra..."
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none transition-all resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian bắt đầu</label>
            <input
              type="datetime-local"
              value={form.start_time}
              onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian kết thúc</label>
            <input
              type="datetime-local"
              value={form.end_time}
              onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={() => navigate(`/teacher/classes/${classId}`)}>
            Hủy
          </Button>
          <Button onClick={handleCreate} disabled={!form.title || creating}>
            {creating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tạo...
              </>
            ) : (
              'Tạo & thêm câu hỏi'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
