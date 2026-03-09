import { ChevronDown, ChevronRight, FileText, Plus, Trash2, BookOpen, Video, ClipboardList, Eye } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Chapter, MaterialViewStudent } from '@/types';
import Badge from '@/components/common/Badge';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import { classService } from '@/services/class.service';
import { libraryService } from '@/services/library.service';
import AddMaterialToChapterModal from './AddMaterialToChapterModal';

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  book: BookOpen,
  exam: ClipboardList,
  video: Video,
  reference: FileText,
  document: FileText,
};

const typeBadge: Record<string, { label: string; variant: 'blue' | 'pink' | 'purple' | 'mint' | 'yellow' }> = {
  book: { label: 'Sách', variant: 'blue' },
  exam: { label: 'Đề thi', variant: 'pink' },
  video: { label: 'Video', variant: 'purple' },
  reference: { label: 'Tham khảo', variant: 'mint' },
  document: { label: 'Tài liệu', variant: 'yellow' },
};

interface ChapterSectionProps {
  chapter: Chapter;
  classId: string;
  onMaterialAdded?: () => void;
  onChapterDeleted?: () => void;
  readOnly?: boolean;
  materialBasePath?: string;
}

export default function ChapterSection({ chapter, classId, onMaterialAdded, onChapterDeleted, readOnly, materialBasePath = '/teacher/library' }: ChapterSectionProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [confirmDeleteChapter, setConfirmDeleteChapter] = useState(false);
  const [viewModal, setViewModal] = useState<{ materialId: string; title: string } | null>(null);
  const [viewStudents, setViewStudents] = useState<MaterialViewStudent[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  const studentCount = chapter.student_count ?? 0;

  const handleRemoveMaterial = async (materialId: string) => {
    const classMaterialId = chapter.class_material_ids?.[materialId];
    if (!classMaterialId) return;
    try {
      await classService.removeMaterial(classId, classMaterialId);
      onMaterialAdded?.();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gỡ tài liệu thất bại');
    } finally {
      setConfirmRemove(null);
    }
  };

  const handleDeleteChapter = async () => {
    try {
      await classService.deleteChapter(classId, chapter.id);
      onChapterDeleted?.();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Xóa chương thất bại');
    } finally {
      setConfirmDeleteChapter(false);
    }
  };

  const openViewModal = async (materialId: string, title: string) => {
    setViewModal({ materialId, title });
    setViewLoading(true);
    try {
      const res = await classService.getMaterialViews(classId, materialId);
      setViewStudents(res.data.data || []);
    } catch {
      setViewStudents([]);
    } finally {
      setViewLoading(false);
    }
  };

  const handleMaterialClick = async (materialId: string) => {
    if (readOnly) {
      try {
        await libraryService.recordView(materialId, classId);
      } catch { /* silent */ }
    }
    navigate(`${materialBasePath}/${materialId}`);
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <div className="flex items-center bg-primary-lighter hover:bg-primary-light transition-colors">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 flex items-center gap-3 px-4 py-3"
        >
          {isOpen ? (
            <ChevronDown className="w-5 h-5 text-primary" />
          ) : (
            <ChevronRight className="w-5 h-5 text-primary" />
          )}
          <span className="font-medium text-gray-800">{chapter.name}</span>
          <span className="text-sm text-gray-400 ml-auto">
            {chapter.materials.length} tài liệu
          </span>
        </button>
        {!readOnly && (
          <button
            onClick={() => setConfirmDeleteChapter(true)}
            className="p-2 mr-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            title="Xóa chương"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="divide-y divide-border">
          {chapter.materials.map((mat) => {
            const Icon = typeIcons[mat.material_type] || FileText;
            const badge = typeBadge[mat.material_type];
            return (
            <div
              key={mat.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group cursor-pointer"
              onClick={() => handleMaterialClick(mat.id)}
            >
              {mat.thumbnail_url ? (
                <img
                  src={mat.thumbnail_url}
                  alt={mat.title}
                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-gray-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{mat.title}</p>
                <p className="text-xs text-gray-400">{mat.subject}</p>
              </div>
              {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
              {!readOnly && studentCount > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); openViewModal(mat.id, mat.title); }}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-gray-500 hover:bg-blue-50 hover:text-primary transition-colors"
                  title="Xem chi tiết lượt xem"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {mat.view_count ?? 0}/{studentCount}
                </button>
              )}
              {!readOnly && (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmRemove(mat.id); }}
                  className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Gỡ khỏi chương"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            );
          })}
          {chapter.materials.length === 0 && (
            <div className="px-4 py-6 text-center text-gray-400 text-sm">
              Chưa có tài liệu nào
            </div>
          )}
          {!readOnly && (
            <div className="px-4 py-2">
              <button
                onClick={() => setShowAddMaterial(true)}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark transition-colors py-1"
              >
                <Plus className="w-4 h-4" /> Thêm tài liệu
              </button>
            </div>
          )}
        </div>
      )}

      <AddMaterialToChapterModal
        isOpen={showAddMaterial}
        onClose={() => setShowAddMaterial(false)}
        classId={classId}
        chapterId={chapter.id}
        onAdded={() => {
          setShowAddMaterial(false);
          onMaterialAdded?.();
        }}
      />

      {/* Confirm remove material */}
      <Modal isOpen={!!confirmRemove} onClose={() => setConfirmRemove(null)} title="Gỡ tài liệu" size="sm">
        <p className="text-gray-600 mb-4">Gỡ tài liệu này khỏi chương?</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmRemove(null)}>Hủy</Button>
          <Button onClick={() => confirmRemove && handleRemoveMaterial(confirmRemove)}>Xác nhận</Button>
        </div>
      </Modal>

      {/* Confirm delete chapter */}
      <Modal isOpen={confirmDeleteChapter} onClose={() => setConfirmDeleteChapter(false)} title="Xóa chương" size="sm">
        <p className="text-gray-600 mb-4">Xóa chương &ldquo;{chapter.name}&rdquo;? Các tài liệu sẽ được gỡ khỏi chương nhưng không bị xóa khỏi hệ thống.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmDeleteChapter(false)}>Hủy</Button>
          <Button onClick={handleDeleteChapter}>Xóa chương</Button>
        </div>
      </Modal>

      {/* Material view detail modal */}
      <Modal
        isOpen={!!viewModal}
        onClose={() => setViewModal(null)}
        title={`Lượt xem: ${viewModal?.title || ''}`}
        size="md"
      >
        {viewLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {viewStudents.length === 0 ? (
              <p className="text-gray-400 text-center py-6">Chưa có học sinh nào</p>
            ) : (
              viewStudents.map((s) => (
                <div key={s.student_id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
                  {s.avatar_url ? (
                    <img src={s.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-500">
                      {s.full_name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-700 truncate">{s.full_name}</p>
                    <p className="text-xs text-gray-400">{s.email}</p>
                  </div>
                  {s.viewed ? (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-medium">Đã xem</span>
                  ) : (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Chưa xem</span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
