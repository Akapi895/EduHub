import { useState, useEffect } from 'react';
import { Users, BookOpen, ClipboardList, Plus, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { dashboardService } from '@/services/dashboard.service';

interface DashboardData {
  total_classes: number;
  total_students: number;
  total_exams: number;
  upcoming_exams: number;
  classes: { id: string; name: string; student_count: number }[];
}

export default function TeacherDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
    { label: 'Lớp học', value: data?.total_classes ?? 0, icon: Users, color: 'bg-blue-100 text-blue-600' },
    { label: 'Học sinh', value: data?.total_students ?? 0, icon: BookOpen, color: 'bg-purple-100 text-purple-600' },
    { label: 'Đề thi', value: data?.total_exams ?? 0, icon: ClipboardList, color: 'bg-mint text-green-700' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Trang chủ</h1>
        <Link to="/teacher/classes" className="btn-primary inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> Tạo lớp mới
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-card p-6 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Bài thi sắp tới</h2>
          <div className="space-y-3">
            {(data?.upcoming_exams ?? 0) > 0 ? (
              <div className="flex items-center justify-between p-3 bg-primary-lighter rounded-xl">
                <div>
                  <p className="font-medium text-gray-800">{data?.upcoming_exams} bài thi sắp mở</p>
                </div>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">Sắp mở</span>
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Chưa có bài thi sắp tới</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Các lớp học</h2>
          <div className="space-y-3">
            {data?.classes?.map((cls) => (
              <Link
                key={cls.id}
                to={`/teacher/classes/${cls.id}`}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50"
              >
                <p className="text-sm font-medium text-gray-800">{cls.name}</p>
                <span className="text-xs text-gray-500">{cls.student_count} học sinh</span>
              </Link>
            ))}
            {(!data?.classes || data.classes.length === 0) && (
              <p className="text-sm text-gray-400 text-center py-4">Chưa có lớp học nào</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
