import { NavLink } from 'react-router-dom';
import {
  Home,
  BookOpen,
  Users,
  Mail,
  Settings,
  ClipboardList,
  Bot,
  GraduationCap,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/utils/helpers';

const teacherMenu = [
  { label: 'Trang chủ', icon: Home, path: '/teacher/dashboard' },
  { label: 'Thư viện', icon: BookOpen, path: '/teacher/library' },
  { label: 'Lớp học', icon: GraduationCap, path: '/teacher/classes' },
  { label: 'Hộp thư', icon: Mail, path: '/teacher/inbox' },
  { label: 'Cài đặt', icon: Settings, path: '/teacher/settings' },
];

const studentMenu = [
  { label: 'Trang chủ', icon: Home, path: '/student/dashboard' },
  { label: 'Lớp học', icon: GraduationCap, path: '/student/classes' },
  { label: 'Bài thi', icon: ClipboardList, path: '/student/exams' },
  { label: 'Hộp thư', icon: Mail, path: '/student/inbox' },
  { label: 'Trợ lý AI', icon: Bot, path: '/student/chatbot' },
  { label: 'Cài đặt', icon: Settings, path: '/student/settings' },
];

interface SidebarProps {
  collapsed?: boolean;
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const user = useAuthStore((s) => s.user);
  const menu = user?.role === 'teacher' ? teacherMenu : studentMenu;

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-white border-r border-border flex flex-col z-30 transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-[240px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b border-border">
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <BookOpen className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-semibold text-lg text-primary">EduHub</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {menu.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-white shadow-md'
                  : 'text-gray-600 hover:bg-primary-lighter hover:text-primary'
              )
            }
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User info at bottom */}
      {!collapsed && user && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-light flex items-center justify-center text-primary text-sm font-semibold">
              {user.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {user.full_name}
              </p>
              <p className="text-xs text-gray-400 capitalize">{user.role}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
