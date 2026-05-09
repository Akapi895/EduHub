import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Loader2, ImagePlus, X, Users, BookOpen, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ClassCard from '@/components/classes/ClassCard';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import { classService } from '@/services/class.service';
import { useDebounce } from '@/hooks/useDebounce';
import api from '@/services/api';
import { showErrorToast, showSuccessToast } from '@/store/toast.store';
import type { Class } from '@/types';

export default function TeacherClasses() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', subject: '' });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search);
  const navigate = useNavigate();

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<Class | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Stats
  const totalStudents = classes.reduce((sum, c) => sum + (c.student_count ?? 0), 0);
  const totalMaterials = classes.reduce((sum, c) => sum + (c.material_count ?? 0), 0);

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    const reader = new FileReader();
    reader.onload = () => setThumbnailPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
  };

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await classService.getClasses();
      setClasses(res.data.data || []);
    } catch {
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const filtered = debouncedSearch
    ? classes.filter(
        (c) =>
          c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          (c.description || '').toLowerCase().includes(debouncedSearch.toLowerCase()),
      )
    : classes;

  const handleCreate = async () => {
    setCreating(true);
    try {
      let thumbnail_url: string | undefined;
      if (thumbnailFile) {
        const fd = new FormData();
        fd.append('file', thumbnailFile);
        const uploadRes = await api.post('/upload?sub_dir=thumbnails', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        thumbnail_url = uploadRes.data.data.url;
      }
      const res = await classService.createClass({
        name: form.name,
        description: form.description,
        thumbnail_url,
      });
      const newClassId = res.data.data?.id;
      setShowCreate(false);
      setForm({ name: '', description: '', subject: '' });
      removeThumbnail();
      if (newClassId) {
        navigate(`/teacher/classes/${newClassId}`);
      } else {
        fetchClasses();
      }
    } catch (err: any) {
      showErrorToast(err.response?.data?.message || 'Tạo lớp thất bại');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteClass = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await classService.deleteClass(deleteTarget.id);
      showSuccessToast(`Đã xóa lớp "${deleteTarget.name}"`);
      setDeleteTarget(null);
      fetchClasses();
    } catch (err: any) {
      showErrorToast(err.response?.data?.message || 'Xóa lớp thất bại');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Lớp học</h1>
          <p className="text-gray-500 mt-1">Quản lý các lớp học của bạn</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> Tạo lớp mới
        </Button>
      </div>

      {/* Stats bar */}
      {!loading && classes.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{classes.length}</p>
              <p className="text-sm text-gray-500">Lớp học</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{totalStudents}</p>
              <p className="text-sm text-gray-500">Học sinh</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{totalMaterials}</p>
              <p className="text-sm text-gray-500">Tài liệu đã gắn</p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm lớp học..."
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm shadow-sm"
        />
      </div>

      {/* Classes grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((cls) => (
            <ClassCard
              key={cls.id}
              classData={cls}
              onClick={() => navigate(`/teacher/classes/${cls.id}`)}
              onDelete={(id) => setDeleteTarget(cls)}
              showDelete={true}
            />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-600">
            {search ? 'Không tìm thấy lớp học nào' : 'Chưa có lớp học nào'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {search ? 'Thử tìm kiếm với từ khóa khác' : 'Tạo lớp học đầu tiên để bắt đầu'}
          </p>
          {!search && (
            <Button onClick={() => setShowCreate(true)} className="mt-4">
              <Plus className="w-4 h-4 mr-2" /> Tạo lớp mới
            </Button>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Tạo lớp học mới" size="md">
        <div className="space-y-5">
          <Input
            label="Tên lớp"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="VD: Toán 10A"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Môn học</label>
            <select
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            >
              <option value="">Chọn môn học</option>
              <option value="Toán">Toán</option>
              <option value="Ngữ văn">Ngữ văn</option>
              <option value="Tiếng Anh">Tiếng Anh</option>
              <option value="Vật lý">Vật lý</option>
              <option value="Hóa học">Hóa học</option>
              <option value="Sinh học">Sinh học</option>
              <option value="Lịch sử">Lịch sử</option>
              <option value="Địa lý">Địa lý</option>
              <option value="GDCD">GDCD</option>
              <option value="Công nghệ">Công nghệ</option>
              <option value="Tin học">Tin học</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Mô tả ngắn về lớp học..."
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
          </div>

          {/* Thumbnail */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Ảnh đại diện</label>
            {thumbnailPreview ? (
              <div className="relative w-full h-36 rounded-xl overflow-hidden border border-border">
                <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeThumbnail}
                  className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white transition-colors"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => thumbnailInputRef.current?.click()}
                className="w-full h-28 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary hover:text-primary transition-colors"
              >
                <ImagePlus className="w-7 h-7" />
                <span className="text-sm">Chọn ảnh</span>
              </button>
            )}
            <input
              ref={thumbnailInputRef}
              type="file"
              accept="image/*"
              onChange={handleThumbnailChange}
              className="hidden"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button onClick={handleCreate} disabled={!form.name || creating}>
              {creating ? 'Đang tạo...' : 'Tạo lớp'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Xóa lớp học" size="sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <p className="font-medium text-gray-800">Xóa lớp "{deleteTarget?.name}"?</p>
              <p className="text-sm text-gray-500 mt-0.5">
                Học sinh và tài liệu trong lớp sẽ bị gỡ. Hành động này không thể hoàn tác.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Hủy</Button>
            <Button
              onClick={handleDeleteClass}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deleting ? 'Đang xóa...' : 'Xóa lớp'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
