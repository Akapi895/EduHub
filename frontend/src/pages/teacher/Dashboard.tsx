import { useState, useEffect } from 'react';
import { Users, ClipboardList, Plus, Loader2, AlertCircle, Clock, ChevronRight, GraduationCap, BookOpen, TrendingUp, Inbox, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ClassCard from '@/components/classes/ClassCard';
import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
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
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
        <p className="text-gray-500">Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-red-600 font-medium">{error}</p>
      </div>
    );
  }

  const stats = [
    { label: 'Lớp học', value: data?.total_classes ?? 0, icon: GraduationCap, gradient: 'from-blue-500 to-blue-600', bg: 'bg-blue-50' },
    { label: 'Học sinh', value: data?.total_students ?? 0, icon: Users, gradient: 'from-purple-500 to-purple-600', bg: 'bg-purple-50' },
    { label: 'Đề thi', value: data?.total_exams ?? 0, icon: ClipboardList, gradient: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Chờ chấm', value: data?.ungraded_count ?? 0, icon: AlertCircle, gradient: (data?.ungraded_count ?? 0) > 0 ? 'from-red-500 to-red-600' : 'from-gray-400 to-gray-500', bg: (data?.ungraded_count ?? 0) > 0 ? 'bg-red-50' : 'bg-gray-50' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Trang chủ</h1>
          <p className="text-gray-500 mt-1">Chào mừng bạn quay trở lại</p>
        </div>
        <Button onClick={() => navigate('/teacher/classes')} className="gap-2">
          <Plus className="w-4 h-4" /> Tạo lớp mới
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100/80 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 font-medium">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          to="/teacher/classes"
          className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white hover:shadow-lg hover:shadow-blue-500/25 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
            <GraduationCap className="w-5 h-5" />
          </div>
          <p className="font-semibold">Quản lý lớp học</p>
          <p className="text-xs text-blue-100 mt-1">{data?.total_classes ?? 0} lớp đang hoạt động</p>
          <div className="flex items-center gap-1 mt-3 text-xs text-blue-100 group-hover:text-white">
            <span>Xem chi tiết</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
        <Link
          to="/teacher/library/personal"
          className="group bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-5 text-white hover:shadow-lg hover:shadow-purple-500/25 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5" />
          </div>
          <p className="font-semibold">Thư viện tài liệu</p>
          <p className="text-xs text-purple-100 mt-1">Quản lý tài liệu giảng dạy</p>
          <div className="flex items-center gap-1 mt-3 text-xs text-purple-100 group-hover:text-white">
            <span>Khám phá</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
        <Link
          to="/teacher/games"
          className="group bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl p-5 text-white hover:shadow-lg hover:shadow-amber-500/25 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="font-semibold">Trò chơi học tập</p>
          <p className="text-xs text-amber-100 mt-1">Tạo trò chơi cho học sinh</p>
          <div className="flex items-center gap-1 mt-3 text-xs text-amber-100 group-hover:text-white">
            <span>Tạo mới</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
        <Link
          to="/teacher/inbox"
          className="group bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-5 text-white hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mb-3">
            <Inbox className="w-5 h-5" />
          </div>
          <p className="font-semibold">Hộp thư</p>
          <p className="text-xs text-emerald-100 mt-1">Tin nhắn với học sinh</p>
          <div className="flex items-center gap-1 mt-3 text-xs text-emerald-100 group-hover:text-white">
            <span>Mở hộp thư</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Cần xử lý — ungraded submissions */}
      {(data?.ungraded_count ?? 0) > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Cần xử lý
                </h2>
                <p className="text-xs text-gray-500">{data?.ungraded_count} bài chờ chấm điểm</p>
              </div>
            </div>
            <Badge variant="red">{data?.ungraded_count} bài</Badge>
          </div>
          <div className="divide-y divide-gray-50">
            {data?.recent_submissions?.map((sub) => (
              <Link
                key={sub.id}
                to={`/teacher/exams/${sub.exam_id}`}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/80 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-blue-100 flex items-center justify-center text-sm font-bold text-primary">
                    {sub.student_name?.split(' ').pop()?.[0] ?? '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{sub.student_name}</p>
                    <p className="text-xs text-gray-500 truncate">{sub.exam_title} · {sub.class_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
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
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/80">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Bài thi sắp tới</h2>
              <p className="text-xs text-gray-500">{data?.upcoming_exams?.length ?? 0} bài thi được lên lịch</p>
            </div>
          </div>
          <div className="space-y-3">
            {data?.upcoming_exams && data.upcoming_exams.length > 0 ? (
              data.upcoming_exams.map((exam) => (
                <Link
                  key={exam.id}
                  to={`/teacher/exams/${exam.id}`}
                  className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors border border-gray-100 hover:border-gray-200"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{exam.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{exam.class_name} · {exam.question_count} câu</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    {exam.start_time && (
                      <span className="text-xs text-gray-500">{formatDateTime(exam.start_time)}</span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                  <Clock className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">Chưa có bài thi sắp tới</p>
              </div>
            )}
          </div>
        </div>

        {/* Các lớp học */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100/80">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Các lớp học</h2>
                <p className="text-xs text-gray-500">{data?.classes?.length ?? 0} lớp học</p>
              </div>
            </div>
            {(data?.classes?.length ?? 0) > 4 && (
              <Link to="/teacher/classes" className="text-sm text-primary hover:underline font-medium flex items-center gap-1">
                Xem tất cả <ArrowRight className="w-4 h-4" />
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
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <GraduationCap className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">Chưa có lớp học nào</p>
              <Button size="sm" className="mt-3" onClick={() => navigate('/teacher/classes')}>
                Tạo lớp đầu tiên
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
