import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { classService } from '@/services/class.service';

export default function CreateExam() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
  });

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
      // Navigate to exam detail to add questions
      navigate(`/teacher/exams/${newExam.id}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Tạo bài kiểm tra thất bại');
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
        <h1 className="text-2xl font-bold text-gray-800">Tạo bài kiểm tra</h1>
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
