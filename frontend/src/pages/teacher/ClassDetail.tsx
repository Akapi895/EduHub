import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  BookOpen,
  FileText,
  Plus,
  Copy,
  Check,
  Loader2,
  Settings,
  Gamepad2,
  GraduationCap,
  Layers,
  Send,
  Trash2,
} from 'lucide-react';

import ChapterSection from '@/components/classes/ChapterSection';
import StudentTable from '@/components/classes/StudentTable';
import ExamCard from '@/components/exam/ExamCard';
import TeacherGamePackageCard from '@/components/games/TeacherGamePackageCard';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import Badge from '@/components/common/Badge';
import { classService } from '@/services/class.service';
import { gameService } from '@/services/game.service';
import { showErrorToast } from '@/store/toast.store';
import type { Class, Chapter, Exam, GamePackage, User } from '@/types';

type Tab = 'materials' | 'exams' | 'games' | 'students' | 'settings';

function isValidTab(value: string | null): value is Tab {
  return value === 'materials' || value === 'exams' || value === 'games' || value === 'students' || value === 'settings';
}

export default function TeacherClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [classItem, setClassItem] = useState<Class | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [gamePackages, setGamePackages] = useState<GamePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>(isValidTab(searchParams.get('tab')) ? (searchParams.get('tab') as Tab) : 'materials');
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [newChapter, setNewChapter] = useState('');
  const [copied, setCopied] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);

  const fetchClassData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    try {
      const [classRes, studentsRes, examsRes, chaptersRes, gamePackagesRes] = await Promise.all([
        classService.getClass(id),
        classService.getStudents(id),
        classService.getExams(id),
        classService.getChapters(id),
        gameService.getClassGamePackages(id).catch(() => null),
      ]);

      setClassItem(classRes.data.data);
      const currentClass = classRes.data.data;
      setEditForm({ name: currentClass?.name || '', description: currentClass?.description || '' });
      setStudents(studentsRes.data.data || []);
      setExams(examsRes.data.data || []);
      setChapters(chaptersRes.data.data || []);
      setGamePackages(gamePackagesRes?.data?.data || []);
    } catch {
      setClassItem(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClassData();
  }, [fetchClassData]);

  useEffect(() => {
    const nextTab = searchParams.get('tab');
    if (isValidTab(nextTab)) {
      setActiveTab(nextTab);
      return;
    }
    setActiveTab('materials');
  }, [searchParams]);

  const handleTabChange = (nextTab: Tab) => {
    setActiveTab(nextTab);
    const nextParams = new URLSearchParams(searchParams);
    if (nextTab === 'materials') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', nextTab);
    }
    setSearchParams(nextParams);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
        <p className="text-gray-500">Đang tải thông tin lớp học...</p>
      </div>
    );
  }

  if (!classItem) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <GraduationCap className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-lg font-medium text-gray-900 mb-4">Không tìm thấy lớp học</p>
        <Link to="/teacher/classes" className="text-primary hover:underline">
          Quay lại danh sách lớp học
        </Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { key: 'materials', label: 'Tài liệu', icon: BookOpen },
    { key: 'exams', label: 'Bài kiểm tra', icon: FileText },
    { key: 'games', label: 'Trò chơi', icon: Gamepad2 },
    { key: 'students', label: 'Học sinh', icon: Users },
    { key: 'settings', label: 'Cài đặt', icon: Settings },
  ];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(classItem.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/teacher/classes" className="mt-1.5 p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{classItem.name}</h1>
            {classItem.subject && <Badge variant="blue">{classItem.subject}</Badge>}
          </div>
          {classItem.description && <p className="text-gray-500 mt-1">{classItem.description}</p>}
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-2.5 border border-gray-100">
          <div className="text-right">
            <p className="text-xs text-gray-500">Mã lớp</p>
            <p className="font-mono font-bold text-primary text-lg">{classItem.join_code}</p>
          </div>
          <button onClick={handleCopyCode} className="p-2 rounded-lg hover:bg-gray-200 transition-colors text-gray-400 hover:text-primary">
            {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/80 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-center">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-2">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{students.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Học sinh</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/80 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-center">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mx-auto mb-2">
            <Layers className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{chapters.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Chương</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/80 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-center">
          <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center mx-auto mb-2">
            <FileText className="w-5 h-5 text-pink-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{exams.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Bài kiểm tra</p>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/80 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-center">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mx-auto mb-2">
            <Gamepad2 className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{gamePackages.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Trò chơi</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? 'text-primary border-b-2 border-primary bg-primary/5'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'materials' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setShowAddChapter(true)}>
                  <Plus className="mr-1 h-4 w-4" /> Thêm chương
                </Button>
              </div>
              {chapters.length > 0 ? (
                chapters.map((chapter) => (
                  <ChapterSection
                    key={chapter.id}
                    chapter={chapter}
                    classId={id!}
                    onMaterialAdded={async () => {
                      const response = await classService.getChapters(id!);
                      setChapters(response.data.data || []);
                    }}
                    onChapterDeleted={async () => {
                      const response = await classService.getChapters(id!);
                      setChapters(response.data.data || []);
                    }}
                  />
                ))
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500">Chưa có chương nào</p>
                  <Button size="sm" className="mt-3" onClick={() => setShowAddChapter(true)}>
                    <Plus className="mr-1 h-4 w-4" /> Thêm chương đầu tiên
                  </Button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'exams' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => navigate(`/teacher/classes/${id}/exams/create`)}>
                  <Plus className="mr-1 h-4 w-4" /> Tạo bài kiểm tra
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exams.map((exam) => (
                  <ExamCard key={exam.id} exam={exam} onClick={() => navigate(`/teacher/exams/${exam.id}`)} />
                ))}
                {exams.length === 0 && (
                  <div className="col-span-2 text-center py-12">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500">Chưa có bài kiểm tra nào</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'games' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => navigate(`/teacher/classes/${id}/games/create`)}>
                  <Plus className="mr-1 h-4 w-4" /> Tạo gói trò chơi
                </Button>
              </div>

              {gamePackages.length === 0 ? (
                <div className="text-center py-12 rounded-2xl border border-dashed border-gray-300 bg-gray-50/50">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Gamepad2 className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-2">Chưa có gói trò chơi nào</p>
                  <p className="text-sm text-gray-400 mb-4">Tạo gói mới với 4 cấp độ để học sinh có thể chơi</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {gamePackages.map((gamePackage) => (
                    <TeacherGamePackageCard
                      key={gamePackage.id}
                      gamePackage={gamePackage}
                      onOpen={(targetPackageId) => navigate(`/teacher/games/${targetPackageId}`)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'students' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{students.length} học sinh</p>
              </div>
              <StudentTable
                students={students.map((student) => ({
                  id: student.id,
                  student_id: student.id,
                  full_name: student.full_name,
                  email: student.email,
                  avatar_url: student.avatar_url,
                  joined_at: student.created_at,
                }))}
                onRemove={async (studentId) => {
                  try {
                    await classService.removeStudent(id!, studentId);
                    fetchClassData();
                  } catch (err: any) {
                    showErrorToast(err.response?.data?.message || 'Xóa học sinh thất bại');
                  }
                }}
              />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-lg space-y-6">
              <div className="space-y-4">
                <Input
                  label="Tên lớp"
                  value={editForm.name}
                  onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
                />
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Mô tả</label>
                  <textarea
                    value={editForm.description}
                    onChange={(event) => setEditForm({ ...editForm, description: event.target.value })}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all bg-gray-50/50 focus:bg-white"
                    placeholder="Mô tả ngắn về lớp học..."
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await classService.updateClass(id!, editForm);
                      await fetchClassData();
                    } catch (err: any) {
                      showErrorToast(err.response?.data?.message || 'Cập nhật thất bại');
                    } finally {
                      setSaving(false);
                    }
                  }}
                  disabled={!editForm.name || saving}
                >
                  {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    if (!window.confirm('Bạn có chắc chắn muốn xóa lớp học này?')) return;
                    try {
                      await classService.deleteClass(id!);
                      navigate('/teacher/classes');
                    } catch (err: any) {
                      showErrorToast(err.response?.data?.message || 'Xóa lớp thất bại');
                    }
                  }}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Xóa lớp học
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Chapter Modal */}
      <Modal isOpen={showAddChapter} onClose={() => setShowAddChapter(false)} title="Thêm chương mới" size="sm">
        <div className="space-y-4">
          <Input
            label="Tên chương"
            value={newChapter}
            onChange={(event) => setNewChapter(event.target.value)}
            placeholder="VD: Chương 4 - Giới hạn"
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowAddChapter(false)}>
              Hủy
            </Button>
            <Button
              onClick={async () => {
                try {
                  await classService.createChapter(id!, { name: newChapter });
                  setShowAddChapter(false);
                  setNewChapter('');
                  const response = await classService.getChapters(id!);
                  setChapters(response.data.data || []);
                } catch (err: any) {
                  showErrorToast(err.response?.data?.message || 'Thêm chương thất bại');
                }
              }}
              disabled={!newChapter}
            >
              Thêm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
