import { useState, useMemo } from 'react';
import { Search, Upload, Filter } from 'lucide-react';
import MaterialCard from '@/components/library/MaterialCard';
import UploadMaterialModal from '@/components/library/UploadMaterialModal';
import Button from '@/components/common/Button';
import { mockMaterials } from '@/services/mockData';
import { useDebounce } from '@/hooks/useDebounce';
import { SUBJECTS } from '@/utils/constants';

const TYPES = [
  { value: '', label: 'Tất cả' },
  { value: 'book', label: 'Sách' },
  { value: 'exam', label: 'Đề thi' },
  { value: 'video', label: 'Video' },
  { value: 'reference', label: 'Tham khảo' },
  { value: 'document', label: 'Tài liệu' },
];

export default function TeacherLibrary() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const debouncedSearch = useDebounce(search);

  const filteredMaterials = useMemo(() => {
    return mockMaterials.filter((m) => {
      const matchSearch =
        !debouncedSearch ||
        m.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        m.description.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchType = !typeFilter || m.material_type === typeFilter;
      const matchSubject = !subjectFilter || m.subject === subjectFilter;
      return matchSearch && matchType && matchSubject;
    });
  }, [debouncedSearch, typeFilter, subjectFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Thư viện</h1>
          <p className="text-gray-500 mt-1">Quản lý tài liệu giảng dạy</p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Upload className="w-4 h-4 mr-2" /> Upload tài liệu
        </Button>
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

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredMaterials.map((material) => (
          <MaterialCard key={material.id} material={material} />
        ))}
      </div>

      {filteredMaterials.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">Không tìm thấy tài liệu nào</p>
          <p className="text-sm mt-1">Thử thay đổi bộ lọc hoặc tìm kiếm khác</p>
        </div>
      )}

      <UploadMaterialModal
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onSubmit={(data) => {
          console.log('Upload:', data);
          setShowUpload(false);
        }}
      />
    </div>
  );
}
