import { useState, useEffect } from 'react';
import { BookOpen, ClipboardList, Bell, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { dashboardService } from '@/services/dashboard.service';

interface DashboardData {
  total_classes: number;
  total_exams: number;
  upcoming_exams: number;
  pending_submissions: number;
  classes: { id: string; name: string }[];
}

export default function StudentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Xin chào! 🌟</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-card p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{data?.total_classes ?? 0}</p>
            <p className="text-sm text-gray-500">Lớp đang học</p>
          </div>
        </div>
        <div className="bg-white rounded-card p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-yellow flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-yellow-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{data?.upcoming_exams ?? 0}</p>
            <p className="text-sm text-gray-500">Bài thi sắp tới</p>
          </div>
        </div>
        <div className="bg-white rounded-card p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-pink flex items-center justify-center">
            <Bell className="w-6 h-6 text-pink-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{data?.pending_submissions ?? 0}</p>
            <p className="text-sm text-gray-500">Bài chưa nộp</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Các lớp học</h2>
        <div className="space-y-3">
          {data?.classes?.map((cls) => (
            <Link
              key={cls.id}
              to={`/student/classes`}
              className="flex items-center justify-between p-3 bg-primary-lighter rounded-xl hover:bg-blue-100 transition-colors"
            >
              <p className="font-medium text-gray-800">{cls.name}</p>
            </Link>
          ))}
          {(!data?.classes || data.classes.length === 0) && (
            <p className="text-sm text-gray-400 text-center py-4">Chưa tham gia lớp nào</p>
          )}
        </div>
      </div>
    </div>
  );
}
