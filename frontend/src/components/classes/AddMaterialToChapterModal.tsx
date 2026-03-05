import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, Check } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import UploadMaterialModal from '@/components/library/UploadMaterialModal';
import { libraryService } from '@/services/library.service';
import { classService } from '@/services/class.service';
import type { Material } from '@/types';

type TabKey = 'system' | 'personal' | 'upload';

interface AddMaterialToChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  chapterId: string;
  onAdded: () => void;
}

export default function AddMaterialToChapterModal({
  isOpen,
  onClose,
  classId,
  chapterId,
  onAdded,
}: AddMaterialToChapterModalProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('system');
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const fetchMaterials = useCallback(async (tab: TabKey) => {
    if (tab === 'upload') return;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (tab === 'system') params.is_system = 'true';
      else params.is_system = 'false';
      const res = await libraryService.getMaterials(params);
      setMaterials(res.data.data || []);
    } catch {
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchMaterials(activeTab);
      setSearch('');
    }
  }, [isOpen, activeTab, fetchMaterials]);

  const filtered = search
    ? materials.filter(
        (m) =>
          m.title.toLowerCase().includes(search.toLowerCase()) ||
          m.subject?.toLowerCase().includes(search.toLowerCase()),
      )
    : materials;

  const handleSelectMaterial = async (materialId: string) => {
    setAdding(materialId);
    try {
      await classService.addMaterial(classId, { material_id: materialId, chapter_id: chapterId });
      onAdded();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Thêm tài liệu thất bại');
    } finally {
      setAdding(null);
    }
  };

  const handleUploadSubmit = async (data: {
    title: string;
    description: string;
    material_type: string;
    subject: string;
    grade: string;
    thumbnail_url?: string;
    file_url?: string;
  }) => {
    // Create material in library first, then assign to chapter
    const res = await libraryService.createMaterial(data);
    const newMaterial = res.data.data;
    await classService.addMaterial(classId, { material_id: newMaterial.id, chapter_id: chapterId });
    setShowUploadModal(false);
    onAdded();
    onClose();
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'system', label: 'Thư viện hệ thống' },
    { key: 'personal', label: 'Thư viện cá nhân' },
    { key: 'upload', label: 'Upload mới' },
  ];

  return (
    <>
      <Modal isOpen={isOpen && !showUploadModal} onClose={onClose} title="Thêm tài liệu vào chương" size="lg">
        <div className="space-y-4">
          {/* Tab buttons */}
          <div className="flex border-b border-border">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  if (tab.key === 'upload') {
                    setShowUploadModal(true);
                  } else {
                    setActiveTab(tab.key);
                  }
                }}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key && tab.key !== 'upload'
                    ? 'text-primary border-primary'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm tài liệu..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none text-sm"
            />
          </div>

          {/* Material list */}
          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">Không tìm thấy tài liệu</p>
            ) : (
              filtered.map((mat) => (
                <div
                  key={mat.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary hover:bg-primary-lighter transition-colors cursor-pointer"
                  onClick={() => handleSelectMaterial(mat.id)}
                >
                  {mat.thumbnail_url ? (
                    <img
                      src={mat.thumbnail_url}
                      alt={mat.title}
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs text-gray-400">{mat.material_type}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{mat.title}</p>
                    <p className="text-xs text-gray-400">{mat.subject} • {mat.grade}</p>
                  </div>
                  {adding === mat.id ? (
                    <Loader2 className="w-5 h-5 animate-spin text-primary flex-shrink-0" />
                  ) : (
                    <Button size="sm" variant="ghost">
                      <Check className="w-4 h-4 mr-1" /> Chọn
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </Modal>

      <UploadMaterialModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSubmit={handleUploadSubmit}
      />
    </>
  );
}
