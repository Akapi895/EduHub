import { useState, useEffect, useCallback } from 'react';
import { Search, Upload, Filter, Loader2, FolderPlus, Folder, ArrowLeft, Trash2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MaterialCard from '@/components/library/MaterialCard';
import UploadMaterialModal from '@/components/library/UploadMaterialModal';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import { libraryService } from '@/services/library.service';
import { useDebounce } from '@/hooks/useDebounce';
import { SUBJECTS } from '@/utils/constants';
import type { Material, Folder as FolderType } from '@/types';

const TYPES = [
  { value: '', label: 'Tất cả' },
  { value: 'book', label: 'Sách' },
  { value: 'exam', label: 'Đề thi' },
  { value: 'video', label: 'Video' },
  { value: 'reference', label: 'Tham khảo' },
  { value: 'document', label: 'Tài liệu' },
];

interface Props {
  mode?: 'system' | 'personal';
}

export default function TeacherLibrary({ mode = 'personal' }: Props) {
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
  const debouncedSearch = useDebounce(search);
  const navigate = useNavigate();

  const isSystem = mode === 'system';
  const isPersonal = mode === 'personal';

  const fetchFolders = useCallback(async () => {
    if (!isPersonal) return;
    try {
      const res = await libraryService.getFolders();
      setFolders(res.data.data || []);
    } catch {
      setFolders([]);
    }
  }, [isPersonal]);

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
      const res = await libraryService.getMaterials(params);
      setMaterials(res.data.data || []);
    } catch {
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, typeFilter, subjectFilter, isSystem, currentFolder]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

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
      alert(err.response?.data?.message || 'Tạo thư mục thất bại');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async (folder: FolderType) => {
    if (!confirm(`Xóa thư mục "${folder.name}"? Tài liệu bên trong sẽ không bị xóa.`)) return;
    try {
      await libraryService.deleteFolder(folder.id);
      if (currentFolder?.id === folder.id) setSearchParams({});
      fetchFolders();
      fetchMaterials();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Xóa thư mục thất bại');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          {currentFolder ? (
            <div className="flex items-center gap-3">
              <button onClick={() => setSearchParams({})} className="text-gray-400 hover:text-gray-600">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">{currentFolder.name}</h1>
                <p className="text-gray-500 mt-1">{currentFolder.material_count} tài liệu</p>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                {isSystem ? 'Tài liệu hệ thống' : 'Tài liệu cá nhân'}
              </h1>
              <p className="text-gray-500 mt-1">
                {isSystem ? 'Tài liệu chung dùng cho tất cả' : 'Quản lý tài liệu giảng dạy của bạn'}
              </p>
            </div>
          )}
        </div>
        {isPersonal && (
          <div className="flex items-center gap-2">
            {!currentFolder && (
              <Button variant="secondary" onClick={() => setShowCreateFolder(true)}>
                <FolderPlus className="w-4 h-4 mr-2" /> Tạo thư mục
              </Button>
            )}
            <Button onClick={() => setShowUpload(true)}>
              <Upload className="w-4 h-4 mr-2" /> Upload tài liệu
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-card p-4 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm tài liệu..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-blue-300 outline-none"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-blue-300 outline-none"
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
          <h2 className="text-sm font-medium text-gray-500 mb-3">Thư mục</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {folders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => setSearchParams({ folder: folder.id })}
                className="bg-white rounded-card shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer p-4 flex items-center gap-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Folder className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{folder.name}</p>
                  <p className="text-xs text-gray-400">{folder.material_count} tài liệu</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder); }}
                  className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Materials grid */}
      {isPersonal && !currentFolder && folders.length > 0 && (
        <h2 className="text-sm font-medium text-gray-500">Tài liệu chưa phân loại</h2>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {materials.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              onClick={() => navigate(`/teacher/library/${material.id}`)}
            />
          ))}
        </div>
      )}

      {!loading && materials.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">Không tìm thấy tài liệu nào</p>
          <p className="text-sm mt-1">
            {currentFolder ? 'Thư mục này chưa có tài liệu' : 'Thử thay đổi bộ lọc hoặc tìm kiếm khác'}
          </p>
        </div>
      )}

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
              alert(err.response?.data?.message || 'Thêm tài liệu thất bại');
            }
          }}
        />
      )}

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
    </div>
  );
}
