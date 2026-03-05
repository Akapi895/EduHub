import { Users, BookOpen, ClipboardList, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

const stats = [
  { label: 'Lớp học', value: 5, icon: Users, color: 'bg-blue-100 text-blue-600' },
  { label: 'Tài liệu', value: 24, icon: BookOpen, color: 'bg-purple-100 text-purple-600' },
  { label: 'Đề thi', value: 12, icon: ClipboardList, color: 'bg-mint text-green-700' },
];

export default function TeacherDashboard() {
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
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Đề thi sắp mở</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-primary-lighter rounded-xl">
              <div>
                <p className="font-medium text-gray-800">Kiểm tra Toán giữa kỳ</p>
                <p className="text-sm text-gray-500">Lớp 6A • 10/03/2026</p>
              </div>
              <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">Sắp mở</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-primary-lighter rounded-xl">
              <div>
                <p className="font-medium text-gray-800">Kiểm tra Văn 15 phút</p>
                <p className="text-sm text-gray-500">Lớp 6B • 12/03/2026</p>
              </div>
              <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">Sắp mở</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Hoạt động gần đây</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50">
              <div className="w-8 h-8 rounded-full bg-accent-mint flex items-center justify-center text-sm">TB</div>
              <div>
                <p className="text-sm text-gray-800">Trần Văn B đã nộp bài thi</p>
                <p className="text-xs text-gray-400">2 phút trước</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50">
              <div className="w-8 h-8 rounded-full bg-accent-pink flex items-center justify-center text-sm">LC</div>
              <div>
                <p className="text-sm text-gray-800">Lê Thị C đã tham gia lớp 6A</p>
                <p className="text-xs text-gray-400">15 phút trước</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
