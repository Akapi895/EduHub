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
} from 'lucide-react';

import ChapterSection from '@/components/classes/ChapterSection';
import StudentTable from '@/components/classes/StudentTable';
import ExamCard from '@/components/exam/ExamCard';
import TeacherGamePackageCard from '@/components/games/TeacherGamePackageCard';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!classItem) {
    return (
      <div className="py-12 text-center">
        <p className="text-lg text-gray-500">Không tìm thấy lớp học</p>
        <Link to="/teacher/classes" className="mt-2 inline-block text-primary hover:underline">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'materials', label: 'Tài liệu', icon: <BookOpen className="h-4 w-4" /> },
    { key: 'exams', label: 'Bài kiểm tra', icon: <FileText className="h-4 w-4" /> },
    { key: 'games', label: 'Trò chơi', icon: <Gamepad2 className="h-4 w-4" /> },
    { key: 'students', label: 'Học sinh', icon: <Users className="h-4 w-4" /> },
    { key: 'settings', label: 'Cài đặt', icon: <Settings className="h-4 w-4" /> },
  ];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(classItem.join_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Link to="/teacher/classes" className="mt-1.5 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">{classItem.name}</h1>
          <p className="mt-1 text-gray-500">{classItem.description}</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-2">
          <span className="text-sm text-gray-500">Mã lớp:</span>
          <span className="font-mono font-bold text-primary">{classItem.join_code}</span>
          <button onClick={handleCopyCode} className="text-gray-400 hover:text-primary">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-card bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-primary">{students.length}</p>
          <p className="text-sm text-gray-500">Học sinh</p>
        </div>
        <div className="rounded-card bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-accent-purple">{chapters.length}</p>
          <p className="text-sm text-gray-500">Chương</p>
        </div>
        <div className="rounded-card bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-accent-pink">{exams.length}</p>
          <p className="text-sm text-gray-500">Bài kiểm tra</p>
        </div>
        <div className="rounded-card bg-white p-4 text-center shadow-sm">
          <p className="text-2xl font-bold text-sky-600">{gamePackages.length}</p>
          <p className="text-sm text-gray-500">Trò chơi</p>
        </div>
      </div>

      <div className="rounded-card bg-white shadow-sm">
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-5">
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
                <p className="py-8 text-center text-gray-400">Chưa có chương nào</p>
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {exams.map((exam) => (
                  <ExamCard key={exam.id} exam={exam} onClick={() => navigate(`/teacher/exams/${exam.id}`)} />
                ))}
                {exams.length === 0 && (
                  <p className="col-span-2 py-8 text-center text-gray-400">Chưa có bài kiểm tra nào</p>
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
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
                  <p className="text-lg font-semibold text-slate-900">Chưa có gói trò chơi nào</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Tạo gói mới rồi soạn câu hỏi theo 4 mức độ để học sinh có thể vào chơi ngay.
                  </p>
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
              <Input
                label="Tên lớp"
                value={editForm.name}
                onChange={(event) => setEditForm({ ...editForm, name: event.target.value })}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Mô tả</label>
                <textarea
                  value={editForm.description}
                  onChange={(event) => setEditForm({ ...editForm, description: event.target.value })}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div className="flex items-center gap-3">
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
                  className="!border-red-200 !text-red-600 hover:!bg-red-50"
                >
                  Xóa lớp học
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

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
