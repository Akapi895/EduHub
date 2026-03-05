import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, BookOpen, FileText, Plus, Copy, Check, Loader2 } from 'lucide-react';
import ChapterSection from '@/components/classes/ChapterSection';
import StudentTable from '@/components/classes/StudentTable';
import ExamCard from '@/components/exam/ExamCard';
import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import Input from '@/components/common/Input';
import { classService } from '@/services/class.service';
import type { Class, Chapter, Exam, User } from '@/types';

type Tab = 'materials' | 'exams' | 'students';

export default function TeacherClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [classItem, setClassItem] = useState<Class | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('materials');
  const [showAddChapter, setShowAddChapter] = useState(false);
  const [newChapter, setNewChapter] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchClassData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [classRes, studentsRes, examsRes] = await Promise.all([
        classService.getClass(id),
        classService.getStudents(id),
        classService.getExams(id),
      ]);
      setClassItem(classRes.data.data);
      setStudents(studentsRes.data.data || []);
      setExams(examsRes.data.data || []);
    } catch {
      setClassItem(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClassData();
  }, [fetchClassData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!classItem) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Không tìm thấy lớp học</p>
        <Link to="/teacher/classes" className="text-primary hover:underline mt-2 inline-block">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'materials', label: 'Tài liệu', icon: <BookOpen className="w-4 h-4" /> },
    { key: 'exams', label: 'Bài kiểm tra', icon: <FileText className="w-4 h-4" /> },
    { key: 'students', label: 'Học sinh', icon: <Users className="w-4 h-4" /> },
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
        <Link to="/teacher/classes" className="mt-1.5 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">{classItem.name}</h1>
          <p className="text-gray-500 mt-1">{classItem.description}</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl">
          <span className="text-sm text-gray-500">Mã lớp:</span>
          <span className="font-mono font-bold text-primary">{classItem.join_code}</span>
          <button onClick={handleCopyCode} className="text-gray-400 hover:text-primary">
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-card p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-primary">{students.length}</p>
          <p className="text-sm text-gray-500">Học sinh</p>
        </div>
        <div className="bg-white rounded-card p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-accent-purple">{chapters.length}</p>
          <p className="text-sm text-gray-500">Chương</p>
        </div>
        <div className="bg-white rounded-card p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-accent-pink">{exams.length}</p>
          <p className="text-sm text-gray-500">Bài kiểm tra</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-card shadow-sm">
        <div className="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-6 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.key
                  ? 'text-primary border-primary'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
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
                  <Plus className="w-4 h-4 mr-1" /> Thêm chương
                </Button>
              </div>
              {chapters.length > 0 ? (
                chapters.map((chapter) => (
                  <ChapterSection key={chapter.id} chapter={chapter} />
                ))
              ) : (
                <p className="text-center text-gray-400 py-8">Chưa có chương nào</p>
              )}
            </div>
          )}

          {activeTab === 'exams' && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Tạo bài kiểm tra
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exams.map((exam) => (
                  <ExamCard key={exam.id} exam={exam} onClick={() => navigate(`/teacher/exams/${exam.id}`)} />
                ))}
                {exams.length === 0 && (
                  <p className="text-center text-gray-400 py-8 col-span-2">Chưa có bài kiểm tra nào</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{students.length} học sinh</p>
              </div>
              <StudentTable
                students={students.map((s) => ({
                  id: s.id,
                  student_id: s.id,
                  full_name: s.full_name,
                  email: s.email,
                  avatar_url: s.avatar_url,
                  joined_at: s.created_at,
                }))}
                onRemove={async (studentId) => {
                  try {
                    await classService.removeStudent(id!, studentId);
                    fetchClassData();
                  } catch (err: any) {
                    alert(err.response?.data?.message || 'Xóa học sinh thất bại');
                  }
                }}
              />
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showAddChapter} onClose={() => setShowAddChapter(false)} title="Thêm chương mới" size="sm">
        <div className="space-y-4">
          <Input
            label="Tên chương"
            value={newChapter}
            onChange={(e) => setNewChapter(e.target.value)}
            placeholder="VD: Chương 4 - Giới hạn"
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowAddChapter(false)}>Hủy</Button>
            <Button onClick={async () => {
              try {
                await classService.createChapter(id!, { name: newChapter });
                setShowAddChapter(false);
                setNewChapter('');
                fetchClassData();
              } catch (err: any) {
                alert(err.response?.data?.message || 'Thêm chương thất bại');
              }
            }} disabled={!newChapter}>
              Thêm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
