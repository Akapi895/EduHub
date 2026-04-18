import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, BookOpen, Video, ClipboardList, Download, Loader2, PlusCircle, Pencil, Trash2, Sparkles } from 'lucide-react';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import { libraryService } from '@/services/library.service';
import { classService } from '@/services/class.service';
import { formatDate } from '@/utils/helpers';
import { useAuthStore } from '@/store/auth.store';
import { SUBJECTS, GRADES } from '@/utils/constants';
import type { Material, Class, Chapter } from '@/types';
import { getMaterialRoute } from '@/utils/materialRoutes';

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  book: BookOpen,
  exam: ClipboardList,
  video: Video,
  reference: FileText,
  document: FileText,
  interactive_book: Sparkles,
};

const typeBadge: Record<string, { label: string; variant: 'blue' | 'pink' | 'purple' | 'mint' | 'yellow' }> = {
  book: { label: 'Sách', variant: 'blue' },
  exam: { label: 'Đề thi', variant: 'pink' },
  video: { label: 'Video', variant: 'purple' },
  reference: { label: 'Tham khảo', variant: 'mint' },
  document: { label: 'Tài liệu', variant: 'yellow' },
};

export default function MaterialDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isTeacher = user?.role === 'teacher';

  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);

  // Add-to-class modal state
  const [showAddToClass, setShowAddToClass] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [addingToClass, setAddingToClass] = useState(false);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit modal state
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editGrade, setEditGrade] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchMaterial = useCallback(() => {
    if (!id) return;
    setLoading(true);
    libraryService
      .getMaterial(id)
      .then((res) => setMaterial(res.data.data))
      .catch(() => setMaterial(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchMaterial();
  }, [fetchMaterial]);

  useEffect(() => {
    if (!material || material.material_type !== 'interactive_book' || !user) return;
    navigate(getMaterialRoute(material, user.role), { replace: true });
  }, [material, navigate, user]);

  // Fetch classes when add-to-class modal opens
  useEffect(() => {
    if (!showAddToClass) return;
    classService.getClasses().then((res) => {
      setClasses(res.data.data || []);
    }).catch(() => setClasses([]));
  }, [showAddToClass]);

  // Fetch chapters when a class is selected
  useEffect(() => {
    if (!selectedClass) { setChapters([]); return; }
    classService.getChapters(selectedClass).then((res) => {
      setChapters(res.data.data || []);
    }).catch(() => setChapters([]));
  }, [selectedClass]);

  const handleAddToClass = async () => {
    if (!selectedClass || !selectedChapter || !material) return;
    setAddingToClass(true);
    try {
      await classService.addMaterial(selectedClass, {
        material_id: material.id,
        chapter_id: selectedChapter,
      });
      setShowAddToClass(false);
      setSelectedClass('');
      setSelectedChapter('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Thêm tài liệu vào lớp thất bại');
    } finally {
      setAddingToClass(false);
    }
  };

  const handleDelete = async () => {
    if (!material) return;
    try {
      await libraryService.deleteMaterial(material.id);
      navigate(-1);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Xóa tài liệu thất bại');
    }
  };

  const openEditModal = () => {
    if (!material) return;
    setEditTitle(material.title);
    setEditDescription(material.description || '');
    setEditSubject(material.subject || '');
    setEditGrade(material.grade || '');
    setShowEdit(true);
  };

  const handleSaveEdit = async () => {
    if (!material) return;
    setSaving(true);
    try {
      await libraryService.updateMaterial(material.id, {
        title: editTitle,
        description: editDescription,
        subject: editSubject,
        grade: editGrade,
      });
      setShowEdit(false);
      fetchMaterial();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!material) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Không tìm thấy tài liệu</p>
        <button onClick={() => navigate(-1)} className="text-primary hover:underline mt-2 inline-block">
          Quay lại
        </button>
      </div>
    );
  }

  const Icon = typeIcons[material.material_type] || FileText;
  const badge = typeBadge[material.material_type];
  const isOwner = isTeacher && material.created_by === user?.id;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Chi tiết tài liệu</h1>
        </div>
        {isTeacher && (
          <div className="flex items-center gap-2">
            {isOwner && (
              <>
                <Button variant="secondary" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="w-4 h-4 mr-1.5" /> Xóa
                </Button>
                <Button variant="secondary" onClick={openEditModal}>
                  <Pencil className="w-4 h-4 mr-1.5" /> Chỉnh sửa
                </Button>
              </>
            )}
            <Button onClick={() => setShowAddToClass(true)}>
              <PlusCircle className="w-4 h-4 mr-1.5" /> Thêm vào lớp
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-card shadow-sm overflow-hidden">
        {material.thumbnail_url && (
          <div className="h-64 bg-gray-100">
            <img
              src={material.thumbnail_url}
              alt={material.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Icon className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold text-gray-800">{material.title}</h2>
            </div>
            {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
          </div>

          {material.description && (
            <p className="text-gray-600">{material.description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            {material.subject && <span>Môn: {material.subject}</span>}
            {material.grade && <span>Khối: {material.grade}</span>}
            <span>Ngày tạo: {formatDate(material.created_at)}</span>
          </div>

          {material.file_url && (
            <div className="pt-4 border-t border-border">
              {material.material_type === 'video' ? (
                <video controls className="w-full rounded-xl" src={material.file_url}>
                  Trình duyệt không hỗ trợ video.
                </video>
              ) : material.file_url.endsWith('.pdf') ? (
                <iframe
                  src={material.file_url}
                  title={material.title}
                  className="w-full h-[600px] rounded-xl border border-border"
                />
              ) : (
                <a
                  href={material.file_url}
                  download
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Tải xuống tài liệu
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add to class modal */}
      <Modal isOpen={showAddToClass} onClose={() => setShowAddToClass(false)} title="Thêm tài liệu vào lớp" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chọn lớp</label>
            <select
              value={selectedClass}
              onChange={(e) => { setSelectedClass(e.target.value); setSelectedChapter(''); }}
              className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none"
            >
              <option value="">-- Chọn lớp --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {selectedClass && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chọn chương</label>
              <select
                value={selectedChapter}
                onChange={(e) => setSelectedChapter(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none"
              >
                <option value="">-- Chọn chương --</option>
                {chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>{ch.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowAddToClass(false)}>Hủy</Button>
            <Button onClick={handleAddToClass} disabled={!selectedClass || !selectedChapter || addingToClass}>
              {addingToClass ? 'Đang thêm...' : 'Thêm vào lớp'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Xóa tài liệu" size="sm">
        <p className="text-gray-600 mb-4">Bạn có chắc muốn xóa tài liệu này? Tài liệu sẽ bị gỡ khỏi tất cả các lớp đã gắn.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Hủy</Button>
          <Button onClick={handleDelete}>Xóa tài liệu</Button>
        </div>
      </Modal>

      {/* Edit material modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Chỉnh sửa tài liệu" size="sm">
        <div className="space-y-4">
          <Input
            label="Tên tài liệu"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none transition-all resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Môn học</label>
              <select
                value={editSubject}
                onChange={(e) => setEditSubject(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none"
              >
                <option value="">Không chọn</option>
                {SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Khối lớp</label>
              <select
                value={editGrade}
                onChange={(e) => setEditGrade(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none"
              >
                <option value="">Không chọn</option>
                {GRADES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowEdit(false)}>Hủy</Button>
            <Button onClick={handleSaveEdit} disabled={!editTitle.trim() || saving}>
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
