import { BookOpen, ClipboardList, Bell } from 'lucide-react';

export default function StudentDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Xin chào! 🌟</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-card p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">3</p>
            <p className="text-sm text-gray-500">Lớp đang học</p>
          </div>
        </div>
        <div className="bg-white rounded-card p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-yellow flex items-center justify-center">
            <ClipboardList className="w-6 h-6 text-yellow-700" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">2</p>
            <p className="text-sm text-gray-500">Bài thi sắp tới</p>
          </div>
        </div>
        <div className="bg-white rounded-card p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-pink flex items-center justify-center">
            <Bell className="w-6 h-6 text-pink-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">5</p>
            <p className="text-sm text-gray-500">Thông báo mới</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Bài thi sắp mở</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-primary-lighter rounded-xl">
            <div>
              <p className="font-medium text-gray-800">Kiểm tra Toán giữa kỳ</p>
              <p className="text-sm text-gray-500">Lớp 6A • 10/03/2026</p>
            </div>
            <span className="text-xs bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full font-medium">Sắp mở</span>
          </div>
        </div>
      </div>
    </div>
  );
}
