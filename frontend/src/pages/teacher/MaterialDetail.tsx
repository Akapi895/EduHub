import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  Download,
  FileText,
  Loader2,
  Pencil,
  PlusCircle,
  Sparkles,
  Trash2,
  Video,
} from 'lucide-react';

import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import { classService } from '@/services/class.service';
import { libraryService } from '@/services/library.service';
import { useAuthStore } from '@/store/auth.store';
import { showErrorToast } from '@/store/toast.store';
import type { Chapter, Class, Material, MaterialFileAccess } from '@/types';
import { formatDate } from '@/utils/helpers';
import { getMaterialRoute } from '@/utils/materialRoutes';
import { GRADES, SUBJECTS } from '@/utils/constants';

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
  interactive_book: { label: 'Sách tương tác', variant: 'purple' },
};

const documentPreviewFrameClass = 'h-[68vh] min-h-[420px] w-full rounded-xl border border-border md:h-[78vh] md:min-h-[680px] lg:h-[calc(100vh-12rem)] lg:min-h-[820px]';
const imagePreviewClass = 'w-full rounded-xl border border-border object-contain max-h-[70vh] min-h-[320px] md:max-h-[78vh] lg:max-h-[calc(100vh-12rem)]';

function inferDirectPreviewKind(material: Material): MaterialFileAccess['preview_kind'] {
  if (material.material_type === 'video') {
    return 'video';
  }
  const fileUrl = material.file_url || '';
  if (/\.(png|jpe?g|gif|webp)(?:$|\?)/i.test(fileUrl)) {
    return 'image';
  }
  if (/\.(mp3|wav|ogg|m4a|aac|flac)(?:$|\?)/i.test(fileUrl)) {
    return 'audio';
  }
  return 'none';
}

function inferFileExtensionFromUrl(fileUrl?: string | null): string | null {
  if (!fileUrl) return null;
  const match = fileUrl.match(/\.([a-z0-9]+)(?:$|\?)/i);
  return match?.[1]?.toLowerCase() || null;
}

function buildDownloadName(material: Material): string {
  const extension = inferFileExtensionFromUrl(material.file_url) || 'bin';
  const safeTitle = material.title
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9-_]/g, '');
  return `${safeTitle || 'material'}.${extension}`;
}

export default function MaterialDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isTeacher = user?.role === 'teacher';

  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileAccess, setFileAccess] = useState<MaterialFileAccess | null>(null);
  const [fileAccessLoading, setFileAccessLoading] = useState(false);
  const [downloadingFile, setDownloadingFile] = useState(false);

  const [showAddToClass, setShowAddToClass] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [addingToClass, setAddingToClass] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      .then((response) => setMaterial(response.data.data as Material))
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

  useEffect(() => {
    if (!material?.file_url || material.material_type === 'interactive_book') {
      setFileAccess(null);
      return;
    }

    let cancelled = false;
    setFileAccessLoading(true);
    libraryService
      .getMaterialFileAccess(material.id)
      .then((response) => {
        if (!cancelled) {
          setFileAccess(response.data.data as MaterialFileAccess);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFileAccess(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setFileAccessLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [material?.file_url, material?.id, material?.material_type]);

  useEffect(() => {
    if (!showAddToClass) return;
    classService.getClasses()
      .then((response) => setClasses(response.data.data || []))
      .catch(() => setClasses([]));
  }, [showAddToClass]);

  useEffect(() => {
    if (!selectedClass) {
      setChapters([]);
      return;
    }
    classService.getChapters(selectedClass)
      .then((response) => setChapters(response.data.data || []))
      .catch(() => setChapters([]));
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
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Thêm tài liệu vào lớp thất bại');
    } finally {
      setAddingToClass(false);
    }
  };

  const handleDelete = async () => {
    if (!material) return;
    try {
      await libraryService.deleteMaterial(material.id);
      navigate(-1);
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Xóa tài liệu thất bại');
    }
  };

  const handleUnshare = async () => {
    if (!material) return;
    try {
      await libraryService.unshareMaterial(material.id);
      navigate('/teacher/library/system');
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Gỡ tài liệu khỏi thư viện chung thất bại');
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
    } catch (error: any) {
      showErrorToast(error.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadFile = async () => {
    const targetMaterial = material;
    if (!targetMaterial || !downloadUrl) return;
    setDownloadingFile(true);
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Download failed');
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = buildDownloadName(targetMaterial);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloadingFile(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!material) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-gray-500">Không tìm thấy tài liệu</p>
        <button onClick={() => navigate(-1)} className="mt-2 inline-block text-primary hover:underline">
          Quay lại
        </button>
      </div>
    );
  }

  const Icon = typeIcons[material.material_type] || FileText;
  const badge = typeBadge[material.material_type];
  const isOwner = isTeacher && !material.is_system && material.created_by === user?.id;
  const canUnshare = isTeacher && material.is_system && material.shared_by === user?.id;
  const previewKind = fileAccess?.preview_kind || inferDirectPreviewKind(material);
  const previewUrl = fileAccess?.preview_url || material.file_url;
  const downloadUrl = fileAccess?.download_url || (!fileAccessLoading ? material.file_url : '');

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Chi tiết tài liệu</h1>
        </div>

        {isTeacher && (
          <div className="flex items-center gap-2">
            {canUnshare && (
              <Button variant="secondary" onClick={handleUnshare}>
                <Trash2 className="mr-1.5 h-4 w-4" /> Gỡ khỏi thư viện chung
              </Button>
            )}

            {isOwner && (
              <>
                <Button variant="secondary" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="mr-1.5 h-4 w-4" /> Xóa
                </Button>
                <Button variant="secondary" onClick={openEditModal}>
                  <Pencil className="mr-1.5 h-4 w-4" /> Chỉnh sửa
                </Button>
              </>
            )}

            <Button onClick={() => setShowAddToClass(true)}>
              <PlusCircle className="mr-1.5 h-4 w-4" /> Thêm vào lớp
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-card bg-white shadow-sm">
        {material.thumbnail_url && (
          <div className="h-64 bg-gray-100">
            <img
              src={material.thumbnail_url}
              alt={material.title}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        <div className="space-y-4 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Icon className="h-6 w-6 text-primary" />
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
            <div className="border-t border-border pt-4">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                {downloadUrl ? (
                  <button
                    type="button"
                    onClick={handleDownloadFile}
                    disabled={downloadingFile}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
                  >
                    <Download className="h-4 w-4" />
                    {downloadingFile ? 'Đang tải xuống...' : 'Tải xuống tài liệu'}
                  </button>
                ) : (
                  <Button type="button" disabled>
                    <Download className="mr-1.5 h-4 w-4" />
                    Đang chuẩn bị file...
                  </Button>
                )}
                {previewKind === 'none' && (
                  <span className="text-sm text-gray-500">
                    Định dạng này chưa hỗ trợ xem trực tiếp trong trình duyệt.
                  </span>
                )}
              </div>

              {fileAccessLoading ? (
                <div className="flex items-center justify-center rounded-xl border border-border py-12 text-gray-500">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Đang chuẩn bị nội dung xem trước...
                </div>
              ) : previewKind === 'video' && previewUrl ? (
                <video controls className="w-full rounded-xl" src={previewUrl}>
                  Trình duyệt không hỗ trợ video.
                </video>
              ) : previewKind === 'pdf' && previewUrl ? (
                <iframe
                  src={previewUrl}
                  title={material.title}
                  className={documentPreviewFrameClass}
                />
              ) : previewKind === 'image' && previewUrl ? (
                <img
                  src={previewUrl}
                  alt={material.title}
                  className={imagePreviewClass}
                />
              ) : previewKind === 'audio' && previewUrl ? (
                <div className="rounded-xl border border-border bg-slate-50 p-6">
                  <audio controls className="w-full" src={previewUrl}>
                    Trình duyệt không hỗ trợ audio.
                  </audio>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-slate-50 px-5 py-10 text-center text-sm text-gray-500">
                  Không thể xem trước trực tiếp tài liệu này. Bạn vẫn có thể tải file về để mở đầy đủ.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showAddToClass} onClose={() => setShowAddToClass(false)} title="Thêm tài liệu vào lớp" size="sm">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Chọn lớp</label>
            <select
              value={selectedClass}
              onChange={(event) => {
                setSelectedClass(event.target.value);
                setSelectedChapter('');
              }}
              className="w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
            >
              <option value="">-- Chọn lớp --</option>
              {classes.map((classItem) => (
                <option key={classItem.id} value={classItem.id}>{classItem.name}</option>
              ))}
            </select>
          </div>

          {selectedClass && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Chọn chương</label>
              <select
                value={selectedChapter}
                onChange={(event) => setSelectedChapter(event.target.value)}
                className="w-full rounded-xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
              >
                <option value="">-- Chọn chương --</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id} value={chapter.id}>{chapter.name}</option>
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

      <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Xóa tài liệu" size="sm">
        <p className="mb-4 text-gray-600">
          Bạn có chắc muốn xóa tài liệu này? Tài liệu sẽ bị gỡ khỏi tất cả các lớp đã gắn.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>Hủy</Button>
          <Button onClick={handleDelete}>Xóa tài liệu</Button>
        </div>
      </Modal>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Chỉnh sửa tài liệu" size="sm">
        <div className="space-y-4">
          <Input
            label="Tên tài liệu"
            value={editTitle}
            onChange={(event) => setEditTitle(event.target.value)}
            required
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Mô tả</label>
            <textarea
              value={editDescription}
              onChange={(event) => setEditDescription(event.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-border px-4 py-2.5 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-blue-300"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Môn học</label>
              <select
                value={editSubject}
                onChange={(event) => setEditSubject(event.target.value)}
                className="w-full rounded-xl border border-border px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
              >
                <option value="">Không chọn</option>
                {SUBJECTS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Khối lớp</label>
              <select
                value={editGrade}
                onChange={(event) => setEditGrade(event.target.value)}
                className="w-full rounded-xl border border-border px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
              >
                <option value="">Không chọn</option>
                {GRADES.map((item) => (
                  <option key={item} value={item}>{item}</option>
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
