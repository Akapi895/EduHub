import { NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Home,
  BookOpen,
  Mail,
  Settings,
  ClipboardList,
  Bot,
  GraduationCap,
  Gamepad2,
  ChevronDown,
  ChevronRight,
  Globe,
  FolderOpen,
  LogOut,
} from 'lucide-react';

import { useAuthStore } from '@/store/auth.store';
import { useChatStore } from '@/store/chat.store';
import { chatService } from '@/services/chat.service';
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
  { label: 'Trò chơi', icon: Gamepad2, path: '/teacher/games' },
  { label: 'Hộp thư', icon: Mail, path: '/teacher/inbox' },
  { label: 'Cài đặt', icon: Settings, path: '/teacher/settings' },
];

const studentMenu: MenuItem[] = [
  { label: 'Trang chủ', icon: Home, path: '/student/dashboard' },
  { label: 'Lớp học', icon: GraduationCap, path: '/student/classes' },
  { label: 'Thư viện', icon: BookOpen, path: '/student/library' },
  { label: 'Trò chơi', icon: Gamepad2, path: '/student/games' },
  { label: 'Bài thi', icon: ClipboardList, path: '/student/exams' },
  { label: 'Hộp thư', icon: Mail, path: '/student/inbox' },
  { label: 'Trợ lý AI', icon: Bot, path: '/student/chatbot' },
  { label: 'Cài đặt', icon: Settings, path: '/student/settings' },
];

interface SidebarProps {
  collapsed?: boolean;
}

function getRoleLabel(role: string) {
  if (role === 'teacher') return 'Giáo viên';
  if (role === 'student') return 'Học sinh';
  return role;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const menu = user?.role === 'teacher' ? teacherMenu : studentMenu;
  const location = useLocation();
  const { unreadCount, setUnreadCount } = useChatStore();
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    const expanded: string[] = [];
    for (const item of (user?.role === 'teacher' ? teacherMenu : studentMenu)) {
      if (item.children?.some((child) => location.pathname.startsWith(child.path))) {
        expanded.push(item.path);
      }
    }
    return expanded;
  });

  const toggleExpand = (path: string) => {
    setExpandedItems((current) => (
      current.includes(path)
        ? current.filter((itemPath) => itemPath !== path)
        : [...current, path]
    ));
  };

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const response = await chatService.getUnreadCount();
        setUnreadCount(response.data.data?.total || 0);
      } catch {
        // Silent refresh.
      }
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [setUnreadCount]);

  const showBadge = unreadCount > 0;

  const isMenuItemActive = (path: string, isActive: boolean) => {
    const currentTeacherTab = new URLSearchParams(location.search).get('tab');
    const isTeacherGameCreatePath = /^\/teacher\/classes\/[^/]+\/games(\/.*)?$/.test(location.pathname);
    const isTeacherGameTab = location.pathname.startsWith('/teacher/classes/') && currentTeacherTab === 'games';

    if (user?.role === 'teacher') {
      if (path === '/teacher/games') {
        return (
          isActive
          || location.pathname.startsWith('/teacher/games/')
          || isTeacherGameCreatePath
          || isTeacherGameTab
        );
      }

      if (path === '/teacher/classes' && (location.pathname.startsWith('/teacher/games') || isTeacherGameCreatePath || isTeacherGameTab)) {
        return false;
      }
    }

    return isActive;
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-30 flex h-screen flex-col bg-white border-r border-gray-200/80 font-sans transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-[260px]',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-4 border-b border-gray-100">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-600 shadow-lg shadow-primary/20">
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-lg font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Thế giới cổ tích
            </span>
            <span className="text-[10px] text-gray-400 font-medium -mt-0.5">Nền tảng học tập</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {menu.map((item) => {
          if (item.children && !collapsed) {
            const isExpanded = expandedItems.includes(item.path);
            const isChildActive = item.children.some((child) => location.pathname.startsWith(child.path));

            return (
              <div key={item.path}>
                <button
                  onClick={() => toggleExpand(item.path)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isChildActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>

                {isExpanded && (
                  <div className="ml-2 mt-1 space-y-0.5 border-l-2 border-gray-100 pl-3">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) => cn(
                          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                          isActive
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900',
                        )}
                      >
                        <child.icon className="h-4 w-4 flex-shrink-0" />
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
              className={({ isActive }) => cn(
                'relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isMenuItemActive(item.path, isActive)
                  ? 'bg-primary/10 text-primary shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {showBadge && item.path.endsWith('/inbox') && (
                    <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </>
              )}
              {collapsed && showBadge && item.path.endsWith('/inbox') && (
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile */}
      {!collapsed && user && (
        <div className="border-t border-gray-100 p-3">
          <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition-colors">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-blue-100 text-sm font-bold text-primary shadow-sm">
              {getInitials(user.full_name || 'U')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900">{user.full_name}</p>
              <p className="text-xs text-gray-500">{getRoleLabel(user.role)}</p>
            </div>
          </div>
          
          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-5 w-5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      )}
    </aside>
  );
}
