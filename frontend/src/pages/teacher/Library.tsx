import { useState, useEffect, useCallback } from 'react';
import { Search, Upload, Filter, Loader2, FolderPlus, Folder, ArrowLeft, Trash2, FileText, BookOpen, Video, HelpCircle, File, Sparkles } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MaterialCard from '@/components/library/MaterialCard';
import UploadMaterialModal from '@/components/library/UploadMaterialModal';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import { libraryService } from '@/services/library.service';
import { useAuthStore } from '@/store/auth.store';
import { showErrorToast, showSuccessToast } from '@/store/toast.store';
import { useDebounce } from '@/hooks/useDebounce';
import { SUBJECTS } from '@/utils/constants';
import type { Material, Folder as FolderType } from '@/types';
import { getMaterialRoute } from '@/utils/materialRoutes';

const TYPES = [
  { value: '', label: 'Tất cả', icon: FileText },
  { value: 'book', label: 'Sách', icon: BookOpen },
  { value: 'exam', label: 'Đề thi', icon: HelpCircle },
  { value: 'video', label: 'Video', icon: Video },
  { value: 'reference', label: 'Tham khảo', icon: File },
  { value: 'document', label: 'Tài liệu', icon: FileText },
  { value: 'interactive_book', label: 'Sách tương tác', icon: Sparkles },
];

interface Props {
  mode?: 'system' | 'personal';
}

export default function TeacherLibrary({ mode = 'personal' }: Props) {
  const user = useAuthStore((state) => state.user);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [currentFolder, setCurrentFolder] = useState<FolderType | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [saveMaterialId, setSaveMaterialId] = useState<string | null>(null);
  const [saveFolderId, setSaveFolderId] = useState('');
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const debouncedSearch = useDebounce(search);
  const navigate = useNavigate();

  const isSystem = mode === 'system';
  const isPersonal = mode === 'personal';

  const fetchFolders = useCallback(async () => {
    try {
      const res = await libraryService.getFolders();
      setFolders(res.data.data || []);
    } catch { setFolders([]); }
  }, []);

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (typeFilter) params.type = typeFilter;
      if (subjectFilter) params.subject = subjectFilter;
      if (isSystem) params.is_system = 'true';
      else params.is_system = 'false';
      if (currentFolder) params.folder_id = currentFolder.id;
      else if (isPersonal) params.exclude_folder_copies = 'true';
      const res = await libraryService.getMaterials(params);
      const resData = res.data.data;
      setMaterials(Array.isArray(resData) ? resData : resData?.items || []);
    } catch {
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, typeFilter, subjectFilter, isSystem, isPersonal, currentFolder]);

  useEffect(() => { fetchMaterials(); }, [fetchMaterials]);
  useEffect(() => { fetchFolders(); }, [fetchFolders]);

  // Restore folder context from URL search params
  useEffect(() => {
    const folderId = searchParams.get('folder');
    if (folderId && isPersonal && folders.length > 0) {
      const found = folders.find((f) => f.id === folderId);
      if (found) setCurrentFolder(found);
    } else if (!folderId) {
      setCurrentFolder(null);
    }
  }, [searchParams, folders, isPersonal]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    try {
      await libraryService.createFolder({ name: newFolderName.trim() });
      setShowCreateFolder(false);
      setNewFolderName('');
      fetchFolders();
    } catch (err: any) {
      showErrorToast(err.response?.data?.message || 'Tạo thư mục thất bại');
    } finally {
      setCreatingFolder(false);
    }
  };

  const [folderToDelete, setFolderToDelete] = useState<FolderType | null>(null);

  const handleDeleteFolder = async (folder: FolderType) => {
    try {
      await libraryService.deleteFolder(folder.id);
      if (currentFolder?.id === folder.id) setSearchParams({});
      setFolderToDelete(null);
      fetchFolders();
      fetchMaterials();
    } catch (err: any) {
      showErrorToast(err.response?.data?.message || 'Xóa thư mục thất bại');
    }
  };

  // Drag-and-drop: copy into folder
  const handleDropOnFolder = async (folderId: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverFolder(null);
    const materialId = e.dataTransfer.getData('materialId');
    if (!materialId) return;
    try {
      await libraryService.copyMaterial(materialId, { folder_id: folderId });
      fetchMaterials();
      fetchFolders();
    } catch (err: any) {
      showErrorToast(err.response?.data?.message || 'Tạo bản sao thất bại');
    }
  };

  // Context-menu: remove from folder (delete copy or clear folder_id)
  const handleRemoveFromFolder = async (materialId: string) => {
    const mat = materials.find((m) => m.id === materialId);
    try {
      if (mat?.source_id) {
        await libraryService.deleteMaterial(materialId);
      } else {
        await libraryService.updateMaterial(materialId, { folder_id: null });
      }
      fetchMaterials();
      fetchFolders();
    } catch (err: any) {
      showErrorToast(err.response?.data?.message || 'Thao tác thất bại');
    }
  };

  const handleCopy = async (materialId: string, folderId: string) => {
    try {
      await libraryService.copyMaterial(materialId, { folder_id: folderId });
      fetchFolders();
    } catch (err: any) {
      showErrorToast(err.response?.data?.message || 'Tạo bản sao thất bại');
    }
  };

  const handleShare = async (materialId: string) => {
    try {
      await libraryService.shareMaterial(materialId);
      fetchMaterials();
      showSuccessToast('Đã đẩy tài liệu lên thư viện chung. Nếu tài liệu đã tồn tại ở đó, hệ thống đã cập nhật bản chia sẻ.');
    } catch (err: any) {
      showErrorToast(err.response?.data?.message || 'Đẩy tài liệu lên thư viện chung thất bại');
    }
  };

  const handleUnshare = async (materialId: string) => {
    try {
      await libraryService.unshareMaterial(materialId);
      fetchMaterials();
      showSuccessToast('Đã gỡ tài liệu khỏi thư viện chung.');
    } catch (err: any) {
      showErrorToast(err.response?.data?.message || 'Gỡ tài liệu khỏi thư viện chung thất bại');
    }
  };

  const handleDeleteMaterial = async () => {
    if (!deleteTarget) return;
    try {
      await libraryService.deleteMaterial(deleteTarget);
      setDeleteTarget(null);
      fetchMaterials();
      fetchFolders();
    } catch (err: any) {
      showErrorToast(err.response?.data?.message || 'Xóa tài liệu thất bại');
    }
  };

  const handleSaveConfirm = async () => {
    if (!saveMaterialId) return;
    try {
      await libraryService.saveMaterial(saveMaterialId, { folder_id: saveFolderId || undefined });
      setSaveMaterialId(null);
      setSaveFolderId('');
      showSuccessToast('Đã lưu tài liệu về thư viện cá nhân');
    } catch (err: any) {
      showErrorToast(err.response?.data?.message || 'Lưu tài liệu thất bại');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          {currentFolder ? (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSearchParams({})} 
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{currentFolder.name}</h1>
                <p className="text-gray-500 text-sm">{currentFolder.material_count} tài liệu</p>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isSystem ? 'Tài liệu hệ thống' : 'Tài liệu cá nhân'}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {isSystem ? 'Tài liệu chung dùng cho tất cả giáo viên' : 'Quản lý tài liệu giảng dạy của bạn'}
              </p>
            </div>
          )}
        </div>
        {isPersonal && (
          <div className="flex items-center gap-3">
            {!currentFolder && (
              <Button variant="secondary" onClick={() => setShowCreateFolder(true)}>
                <FolderPlus className="w-4 h-4 mr-2" /> Tạo thư mục
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate('/teacher/interactive-books/new')}>
              Tạo sách tương tác
            </Button>
            <Button onClick={() => setShowUpload(true)}>
              <Upload className="w-4 h-4 mr-2" /> Upload tài liệu
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/80">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm tài liệu..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:ring-2 focus:ring-primary/20 focus:border-primary focus:bg-white outline-none text-sm transition-all"
            />
          </div>
          
          {/* Filter buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 lg:pb-0">
            {TYPES.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.value}
                  onClick={() => setTypeFilter(t.value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                    typeFilter === t.value
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'bg-gray-50 text-gray-600 border border-transparent hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Subject filter */}
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
          >
            <option value="">Tất cả môn</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Folders grid (only in personal mode, root level) */}
      {isPersonal && !currentFolder && folders.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 mb-3 px-1">Thư mục</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {folders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => setSearchParams({ folder: folder.id })}
                onDragOver={(e) => { e.preventDefault(); setDragOverFolder(folder.id); }}
                onDragLeave={() => setDragOverFolder(null)}
                onDrop={(e) => handleDropOnFolder(folder.id, e)}
                className={`bg-white rounded-2xl p-4 shadow-sm border transition-all duration-200 cursor-pointer group hover:shadow-md hover:border-primary/30 ${
                  dragOverFolder === folder.id ? 'ring-2 ring-primary bg-primary/5' : 'border-gray-100/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Folder className="w-6 h-6 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{folder.name}</p>
                    <p className="text-xs text-gray-500">{folder.material_count} tài liệu</p>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setFolderToDelete(folder); }}
                  className="absolute top-3 right-3 p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Materials section header */}
      {(isPersonal && !currentFolder && folders.length > 0) || (loading && materials.length > 0) ? (
        <h2 className="text-sm font-semibold text-gray-500 mb-3 px-1">
          {currentFolder ? 'Tài liệu trong thư mục' : 'Tất cả tài liệu'}
        </h2>
      ) : null}

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
          <p className="text-gray-500">Đang tải tài liệu...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {materials.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              onClick={() => navigate(getMaterialRoute(material, 'teacher'))}
              folders={isPersonal ? folders : undefined}
              onRemoveFromFolder={isPersonal && currentFolder ? handleRemoveFromFolder : undefined}
              onCopy={isPersonal ? handleCopy : undefined}
              onShare={isPersonal ? handleShare : undefined}
              onUnshare={isSystem ? handleUnshare : undefined}
              onDelete={isPersonal ? (id) => setDeleteTarget(id) : undefined}
              onSave={isSystem ? (id) => { setSaveMaterialId(id); setSaveFolderId(''); } : undefined}
              canSave={!isSystem || material.shared_by !== user?.id}
              canUnshare={isSystem && material.shared_by === user?.id}
              shareLabel="Đẩy lên thư viện chung"
              mode={mode}
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && materials.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100/80">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-gray-400" />
          </div>
          <p className="text-lg font-semibold text-gray-900 mb-2">Không tìm thấy tài liệu nào</p>
          <p className="text-sm text-gray-500 mb-6">
            {currentFolder ? 'Thư mục này chưa có tài liệu' : 'Thử thay đổi bộ lọc hoặc tìm kiếm khác'}
          </p>
          {isPersonal && !search && !currentFolder && (
            <Button onClick={() => setShowUpload(true)}>
              <Upload className="w-4 h-4 mr-2" /> Upload tài liệu đầu tiên
            </Button>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {isPersonal && (
        <UploadMaterialModal
          isOpen={showUpload}
          onClose={() => setShowUpload(false)}
          folderId={currentFolder?.id}
          onSubmit={async (data) => {
            try {
              await libraryService.createMaterial(data);
              setShowUpload(false);
              fetchMaterials();
              if (currentFolder) fetchFolders();
            } catch (err: any) {
              showErrorToast(err.response?.data?.message || 'Thêm tài liệu thất bại');
            }
          }}
        />
      )}

      {/* Create Folder Modal */}
      <Modal isOpen={showCreateFolder} onClose={() => setShowCreateFolder(false)} title="Tạo thư mục mới" size="sm">
        <div className="space-y-4">
          <Input
            label="Tên thư mục"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="VD: Đề thi giữa kỳ"
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowCreateFolder(false)}>Hủy</Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || creatingFolder}>
              {creatingFolder ? 'Đang tạo...' : 'Tạo thư mục'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Folder Modal */}
      <Modal isOpen={!!folderToDelete} onClose={() => setFolderToDelete(null)} title="Xóa thư mục" size="sm">
        <p className="text-gray-600 mb-4">Xóa thư mục &ldquo;{folderToDelete?.name}&rdquo;? Tài liệu bên trong sẽ không bị xóa.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setFolderToDelete(null)}>Hủy</Button>
          <Button onClick={() => folderToDelete && handleDeleteFolder(folderToDelete)}>Xóa thư mục</Button>
        </div>
      </Modal>

      {/* Delete material confirmation */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Xóa tài liệu" size="sm">
        <p className="text-gray-600 mb-4">Bạn có chắc muốn xóa tài liệu này? Tài liệu sẽ bị gỡ khỏi tất cả các lớp đã gắn.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Hủy</Button>
          <Button onClick={handleDeleteMaterial}>Xóa tài liệu</Button>
        </div>
      </Modal>

      {/* Save-to-personal modal (system mode) */}
      <Modal isOpen={!!saveMaterialId} onClose={() => setSaveMaterialId(null)} title="Lưu về thư viện cá nhân" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Chọn thư mục để lưu (không bắt buộc):</p>
          <select
            value={saveFolderId}
            onChange={(e) => setSaveFolderId(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-sm"
          >
            <option value="">— Không phân loại —</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setSaveMaterialId(null)}>Hủy</Button>
            <Button onClick={handleSaveConfirm}>Lưu tài liệu</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
