import { useState, useEffect, useCallback } from 'react';
import { Search, LogIn, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ClassCard from '@/components/classes/ClassCard';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import { classService } from '@/services/class.service';
import { useDebounce } from '@/hooks/useDebounce';
import type { Class } from '@/types';

export default function StudentClasses() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showJoin, setShowJoin] = useState(false);
  const [joining, setJoining] = useState(false);
  const [classCode, setClassCode] = useState('');
  const debouncedSearch = useDebounce(search);

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

  const handleJoin = async () => {
    setJoining(true);
    try {
      await classService.joinClass(classCode);
      setShowJoin(false);
      setClassCode('');
      fetchClasses();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Tham gia lớp thất bại');
    } finally {
      setJoining(false);
    }
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

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((cls) => (
            <ClassCard key={cls.id} classData={cls} onClick={() => navigate(`/student/classes/${cls.id}`)} />
          ))}
        </div>
      )}

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
            <Button onClick={handleJoin} disabled={!classCode || joining}>
              {joining ? 'Đang tham gia...' : 'Tham gia'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
