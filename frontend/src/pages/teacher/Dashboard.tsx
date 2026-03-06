import { useState, useEffect } from 'react';
import { Users, ClipboardList, Plus, Loader2, AlertCircle, Clock, ChevronRight, GraduationCap } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ClassCard from '@/components/classes/ClassCard';
import Badge from '@/components/common/Badge';
import { dashboardService } from '@/services/dashboard.service';
import { formatDateTime } from '@/utils/helpers';
import type { Class } from '@/types';

interface RecentSubmission {
  id: string;
  student_name: string | null;
  exam_id: string;
  exam_title: string | null;
  class_name: string | null;
  submitted_at: string | null;
  total_score: number | null;
}

interface UpcomingExam {
  id: string;
  title: string;
  class_name: string | null;
  start_time: string | null;
  question_count: number;
}

interface DashboardClass {
  id: string;
  name: string;
  description?: string;
  thumbnail_url?: string;
  student_count: number;
  material_count: number;
  exam_count: number;
}

interface DashboardData {
  total_classes: number;
  total_students: number;
  total_exams: number;
  ungraded_count: number;
  recent_submissions: RecentSubmission[];
  upcoming_exams: UpcomingExam[];
  classes: DashboardClass[];
}

export default function TeacherDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await dashboardService.getTeacherDashboard();
        setData(res.data.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Không thể tải dữ liệu');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const stats = [
    { label: 'Lớp học', value: data?.total_classes ?? 0, icon: GraduationCap, color: 'bg-blue-100 text-blue-600' },
    { label: 'Học sinh', value: data?.total_students ?? 0, icon: Users, color: 'bg-purple-100 text-purple-600' },
    { label: 'Đề thi', value: data?.total_exams ?? 0, icon: ClipboardList, color: 'bg-green-100 text-green-600' },
    { label: 'Chờ chấm điểm', value: data?.ungraded_count ?? 0, icon: AlertCircle, color: (data?.ungraded_count ?? 0) > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Trang chủ</h1>
        <Link to="/teacher/classes" className="btn-primary inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> Tạo lớp mới
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-card p-5 shadow-sm flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cần xử lý — ungraded submissions */}
      {(data?.ungraded_count ?? 0) > 0 && (
        <div className="bg-white rounded-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-800">
                Cần xử lý
              </h2>
              <Badge variant="red">{data?.ungraded_count} bài</Badge>
            </div>
          </div>
          <div className="divide-y divide-border">
            {data?.recent_submissions?.map((sub) => (
              <Link
                key={sub.id}
                to={`/teacher/exams/${sub.exam_id}`}
                className="flex items-center justify-between px-6 py-3.5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-xs font-semibold text-purple-700 shrink-0">
                    {sub.student_name?.split(' ').pop()?.[0] ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{sub.student_name}</p>
                    <p className="text-xs text-gray-400 truncate">{sub.exam_title} · {sub.class_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {sub.submitted_at && (
                    <span className="text-xs text-gray-400">{formatDateTime(sub.submitted_at)}</span>
                  )}
                  <Badge variant="yellow">Chờ chấm</Badge>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottom grid: Upcoming exams + Classes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bài thi sắp tới */}
        <div className="bg-white rounded-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-gray-800">Bài thi sắp tới</h2>
          </div>
          <div className="space-y-3">
            {data?.upcoming_exams && data.upcoming_exams.length > 0 ? (
              data.upcoming_exams.map((exam) => (
                <Link
                  key={exam.id}
                  to={`/teacher/exams/${exam.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-border"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{exam.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{exam.class_name} · {exam.question_count} câu</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {exam.start_time && (
                      <span className="text-xs text-gray-500">{formatDateTime(exam.start_time)}</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Chưa có bài thi sắp tới</p>
            )}
          </div>
        </div>

        {/* Các lớp học */}
        <div className="bg-white rounded-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-800">Các lớp học</h2>
            </div>
            {(data?.classes?.length ?? 0) > 4 && (
              <Link to="/teacher/classes" className="text-xs text-primary hover:underline">
                Xem tất cả →
              </Link>
            )}
          </div>
          {data?.classes && data.classes.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {data.classes.slice(0, 4).map((cls) => (
                <ClassCard
                  key={cls.id}
                  classData={cls as Class}
                  onClick={() => navigate(`/teacher/classes/${cls.id}`)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Chưa có lớp học nào</p>
          )}
        </div>
      </div>
    </div>
  );
}
