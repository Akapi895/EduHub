import { useState, useMemo } from 'react';
import { Search, LogIn } from 'lucide-react';
import ClassCard from '@/components/classes/ClassCard';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import { mockClasses } from '@/services/mockData';
import { useDebounce } from '@/hooks/useDebounce';

export default function StudentClasses() {
  const [search, setSearch] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [classCode, setClassCode] = useState('');
  const debouncedSearch = useDebounce(search);

  const filtered = useMemo(() => {
    if (!debouncedSearch) return mockClasses;
    return mockClasses.filter(
      (c) =>
        c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(debouncedSearch.toLowerCase()),
    );
  }, [debouncedSearch]);

  const handleJoin = () => {
    console.log('Join class:', classCode);
    setShowJoin(false);
    setClassCode('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Lớp học của tôi</h1>
          <p className="text-gray-500 mt-1">Danh sách lớp đang tham gia</p>
        </div>
        <Button onClick={() => setShowJoin(true)}>
          <LogIn className="w-4 h-4 mr-2" /> Tham gia lớp
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm lớp..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((cls) => (
          <ClassCard key={cls.id} classData={cls} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">Chưa tham gia lớp nào</p>
          <p className="text-sm mt-1">Nhập mã lớp để tham gia</p>
        </div>
      )}

      <Modal isOpen={showJoin} onClose={() => setShowJoin(false)} title="Tham gia lớp học" size="sm">
        <div className="space-y-4">
          <Input
            label="Mã lớp"
            value={classCode}
            onChange={(e) => setClassCode(e.target.value.toUpperCase())}
            placeholder="VD: ABC123"
          />
          <p className="text-xs text-gray-500">Nhập mã lớp được giáo viên cung cấp để tham gia lớp học</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowJoin(false)}>Hủy</Button>
            <Button onClick={handleJoin} disabled={!classCode}>Tham gia</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
