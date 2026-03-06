import { useState, useEffect } from 'react';
import { ClipboardList, Loader2, Star, GraduationCap, CheckCircle2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { dashboardService } from '@/services/dashboard.service';
import { useAuthStore } from '@/store/auth.store';
import ClassCard from '@/components/classes/ClassCard';
import ExamCard from '@/components/exam/ExamCard';
import Badge from '@/components/common/Badge';
import type { Class, Exam } from '@/types';

interface TodoExam {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  class_name: string | null;
  status: 'upcoming' | 'open' | 'closed';
  start_time: string | null;
  end_time: string | null;
  question_count: number;
  student_status: 'not_started' | 'in_progress';
  best_score: null;
}

interface RecentResult {
  submission_id: string;
  exam_id: string;
  exam_title: string | null;
  class_name: string | null;
  total_score: number | null;
  status: string;
  submitted_at: string | null;
  allow_review: boolean;
}

interface DashboardClass {
  id: string;
  name: string;
  description?: string;
  thumbnail_url?: string;
  teacher_name?: string;
  student_count: number;
  material_count: number;
  exam_count: number;
}

interface DashboardData {
  total_classes: number;
  completed_exams: number;
  average_score: number | null;
  todo_exam_count: number;
  todo_exams: TodoExam[];
  recent_results: RecentResult[];
  classes: DashboardClass[];
  // backward compat
  total_exams: number;
  upcoming_exams: number;
  pending_submissions: number;
}

export default function StudentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await dashboardService.getStudentDashboard();
        setData(res.data.data);
      } catch {
        // ignore
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

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Chào buổi sáng';
    if (hour < 18) return 'Chào buổi chiều';
    return 'Chào buổi tối';
  })();

  const firstName = user?.full_name?.split(' ').pop() ?? '';

  const stats = [
    { label: 'Lớp học', value: data?.total_classes ?? 0, icon: GraduationCap, color: 'bg-blue-100 text-blue-600' },
    { label: 'Đã hoàn thành', value: data?.completed_exams ?? 0, icon: CheckCircle2, color: 'bg-green-100 text-green-600' },
    { label: 'Điểm TB', value: data?.average_score != null ? data.average_score : '—', icon: Star, color: 'bg-yellow-100 text-yellow-600' },
    { label: 'Bài cần làm', value: data?.todo_exam_count ?? 0, icon: ClipboardList, color: (data?.todo_exam_count ?? 0) > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500' },
  ];

  const resultStatusLabel: Record<string, { text: string; variant: 'mint' | 'yellow' | 'blue' }> = {
    graded: { text: 'Đã chấm', variant: 'mint' },
    submitted: { text: 'Chờ chấm', variant: 'yellow' },
    in_progress: { text: 'Đang làm', variant: 'blue' },
  };

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <h1 className="text-2xl font-bold text-gray-800">
        {greeting}, {firstName}! 🌟
      </h1>

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

      {/* Bài thi cần làm */}
      {data?.todo_exams && data.todo_exams.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-800">Bài thi cần làm</h2>
              <Badge variant="red">{data.todo_exam_count}</Badge>
            </div>
            <Link to="/student/exams" className="text-xs text-primary hover:underline">
              Xem tất cả →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.todo_exams.slice(0, 6).map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam as unknown as Exam}
                onClick={() => navigate(`/student/exams/${exam.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bottom grid: Recent results + Classes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kết quả gần đây */}
        <div className="bg-white rounded-card p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-gray-800">Kết quả gần đây</h2>
          </div>
          {data?.recent_results && data.recent_results.length > 0 ? (
            <div className="space-y-3">
              {data.recent_results.map((r) => {
                const statusInfo = resultStatusLabel[r.status] ?? { text: r.status, variant: 'blue' as const };
                return (
                  <Link
                    key={r.submission_id}
                    to={r.allow_review ? `/student/exams/${r.exam_id}/review` : '#'}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-border"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{r.exam_title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{r.class_name}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {r.total_score != null && (
                        <span className="text-sm font-bold text-primary">{r.total_score} đ</span>
                      )}
                      <Badge variant={statusInfo.variant}>{statusInfo.text}</Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Chưa có kết quả nào</p>
          )}
        </div>

        {/* Lớp học của em */}
        <div className="bg-white rounded-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-800">Lớp học của em</h2>
            </div>
            {(data?.classes?.length ?? 0) > 4 && (
              <Link to="/student/classes" className="text-xs text-primary hover:underline">
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
                  onClick={() => navigate(`/student/classes/${cls.id}`)}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">Chưa tham gia lớp nào</p>
          )}
        </div>
      </div>
    </div>
  );
}
