import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, FileText, Loader2 } from 'lucide-react';
import ChapterSection from '@/components/classes/ChapterSection';
import ExamCard from '@/components/exam/ExamCard';
import { classService } from '@/services/class.service';
import type { Class, Chapter, Exam } from '@/types';

type Tab = 'materials' | 'exams';

export default function StudentClassDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [classItem, setClassItem] = useState<Class | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('materials');

  const fetchClassData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [classRes, examsRes, chaptersRes] = await Promise.all([
        classService.getClass(id),
        classService.getExams(id),
        classService.getChapters(id),
      ]);
      setClassItem(classRes.data.data);
      setExams(examsRes.data.data || []);
      setChapters(chaptersRes.data.data || []);
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
        <Link to="/student/classes" className="text-primary hover:underline mt-2 inline-block">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'materials', label: 'Tài liệu', icon: <BookOpen className="w-4 h-4" /> },
    { key: 'exams', label: 'Bài kiểm tra', icon: <FileText className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/student/classes" className="mt-1.5 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-800">{classItem.name}</h1>
          <p className="text-gray-500 mt-1">{classItem.description}</p>
          {classItem.teacher_name && (
            <p className="text-sm text-gray-400 mt-1">Giáo viên: {classItem.teacher_name}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
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
              {chapters.length > 0 ? (
                chapters.map((chapter) => (
                  <ChapterSection
                    key={chapter.id}
                    chapter={chapter}
                    classId={id!}
                    readOnly
                  />
                ))
              ) : (
                <p className="text-center text-gray-400 py-8">Chưa có tài liệu nào</p>
              )}
            </div>
          )}

          {activeTab === 'exams' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exams.map((exam) => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  onClick={() => navigate(`/student/exam/${exam.id}`)}
                />
              ))}
              {exams.length === 0 && (
                <p className="text-center text-gray-400 py-8 col-span-2">Chưa có bài kiểm tra nào</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
