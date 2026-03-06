import { ChevronDown, ChevronRight, FileText, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Chapter } from '@/types';
import { classService } from '@/services/class.service';
import AddMaterialToChapterModal from './AddMaterialToChapterModal';

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

  const handleRemoveMaterial = async (materialId: string) => {
    const classMaterialId = chapter.class_material_ids?.[materialId];
    if (!classMaterialId) return;
    if (!confirm('Gỡ tài liệu này khỏi chương?')) return;
    try {
      await classService.removeMaterial(classId, classMaterialId);
      onMaterialAdded?.();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gỡ tài liệu thất bại');
    }
  };

  const handleDeleteChapter = async () => {
    if (!confirm(`Xóa chương "${chapter.name}"? Các tài liệu sẽ được gỡ khỏi chương nhưng không bị xóa khỏi hệ thống.`)) return;
    try {
      await classService.deleteChapter(classId, chapter.id);
      onChapterDeleted?.();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Xóa chương thất bại');
    }
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
            onClick={handleDeleteChapter}
            className="p-2 mr-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
            title="Xóa chương"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="divide-y divide-border">
          {chapter.materials.map((mat) => (
            <div
              key={mat.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors group cursor-pointer"
              onClick={() => navigate(`${materialBasePath}/${mat.id}`)}
            >
              <FileText className="w-4 h-4 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{mat.title}</p>
                <p className="text-xs text-gray-400">{mat.subject} • {mat.material_type}</p>
              </div>
              {!readOnly && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemoveMaterial(mat.id); }}
                  className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Gỡ khỏi chương"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
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
    </div>
  );
}
