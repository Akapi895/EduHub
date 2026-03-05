import { NavLink, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  Home,
  BookOpen,
  Users,
  Mail,
  Settings,
  ClipboardList,
  Bot,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  Globe,
  FolderOpen,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { cn } from '@/utils/helpers';

interface MenuItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  children?: { label: string; icon: React.ComponentType<{ className?: string }>; path: string }[];
}

const teacherMenu: MenuItem[] = [
  { label: 'Trang chủ', icon: Home, path: '/teacher/dashboard' },
  {
    label: 'Thư viện',
    icon: BookOpen,
    path: '/teacher/library',
    children: [
      { label: 'Tài liệu hệ thống', icon: Globe, path: '/teacher/library/system' },
      { label: 'Tài liệu cá nhân', icon: FolderOpen, path: '/teacher/library/personal' },
    ],
  },
  { label: 'Lớp học', icon: GraduationCap, path: '/teacher/classes' },
  { label: 'Hộp thư', icon: Mail, path: '/teacher/inbox' },
  { label: 'Cài đặt', icon: Settings, path: '/teacher/settings' },
];

const studentMenu: MenuItem[] = [
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
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    // Auto-expand if currently on a child route
    const expanded: string[] = [];
    for (const item of (user?.role === 'teacher' ? teacherMenu : studentMenu)) {
      if (item.children?.some((c) => location.pathname.startsWith(c.path))) {
        expanded.push(item.path);
      }
    }
    return expanded;
  });

  const toggleExpand = (path: string) => {
    setExpandedItems((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

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
        {menu.map((item) => {
          if (item.children && !collapsed) {
            const isExpanded = expandedItems.includes(item.path);
            const isChildActive = item.children.some((c) => location.pathname.startsWith(c.path));

            return (
              <div key={item.path}>
                <button
                  onClick={() => toggleExpand(item.path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                    isChildActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 hover:bg-primary-lighter hover:text-primary'
                  )}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {isExpanded && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200',
                            isActive
                              ? 'bg-primary text-white shadow-sm'
                              : 'text-gray-500 hover:bg-primary-lighter hover:text-primary'
                          )
                        }
                      >
                        <child.icon className="w-4 h-4 flex-shrink-0" />
                        <span>{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
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
          );
        })}
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
