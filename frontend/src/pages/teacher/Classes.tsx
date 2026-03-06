import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Search, Loader2, ImagePlus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ClassCard from '@/components/classes/ClassCard';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import { classService } from '@/services/class.service';
import { useDebounce } from '@/hooks/useDebounce';
import api from '@/services/api';
import type { Class } from '@/types';

export default function TeacherClasses() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const debouncedSearch = useDebounce(search);
  const navigate = useNavigate();

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
      setForm({ name: '', description: '' });
      removeThumbnail();
      if (newClassId) {
        navigate(`/teacher/classes/${newClassId}`);
      } else {
        fetchClasses();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Tạo lớp thất bại');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Lớp học</h1>
          <p className="text-gray-500 mt-1">Quản lý các lớp học của bạn</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> Tạo lớp mới
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm lớp học..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none text-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((cls) => (
            <ClassCard key={cls.id} classData={cls} onClick={() => navigate(`/teacher/classes/${cls.id}`)} />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">Không tìm thấy lớp học nào</p>
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Tạo lớp học mới" size="md">
        <div className="space-y-4">
          <Input
            label="Tên lớp"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="VD: Văn 6A1"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Mô tả ngắn về lớp học..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-blue-300 outline-none resize-none"
            />
          </div>

          {/* Thumbnail */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh đại diện lớp</label>
            {thumbnailPreview ? (
              <div className="relative w-full h-36 rounded-xl overflow-hidden border border-border">
                <img src={thumbnailPreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeThumbnail}
                  className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white"
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

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Hủy</Button>
            <Button onClick={handleCreate} disabled={!form.name || creating}>
              {creating ? 'Đang tạo...' : 'Tạo lớp'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
