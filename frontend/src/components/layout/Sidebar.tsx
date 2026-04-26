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

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const user = useAuthStore((state) => state.user);
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

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-border bg-white font-sans transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-[240px]',
      )}
    >
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
          <BookOpen className="h-4 w-4 text-white" />
        </div>
        {!collapsed && <span className="text-lg font-semibold text-primary">EduHub</span>}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4">
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
                      : 'text-gray-600 hover:bg-primary-lighter hover:text-primary',
                  )}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>

                {isExpanded && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) => cn(
                          'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                          isActive
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-gray-500 hover:bg-primary-lighter hover:text-primary',
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
                  ? 'bg-primary text-white shadow-md'
                  : 'text-gray-600 hover:bg-primary-lighter hover:text-primary',
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.label}</span>
                  {showBadge && item.path.endsWith('/inbox') && (
                    <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </>
              )}
              {collapsed && showBadge && item.path.endsWith('/inbox') && (
                <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
              )}
            </NavLink>
          );
        })}
      </nav>

      {!collapsed && user && (
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-light text-sm font-semibold text-primary">
              {user.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-800">{user.full_name}</p>
              <p className="text-xs text-gray-400">{getRoleLabel(user.role)}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
