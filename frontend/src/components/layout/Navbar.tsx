import { LogOut, Menu } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useNavigate } from 'react-router-dom';
import { getInitials } from '@/utils/helpers';

interface NavbarProps {
  onToggleSidebar?: () => void;
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6 sticky top-0 z-20">
      <button
        onClick={onToggleSidebar}
        className="p-2 rounded-xl hover:bg-gray-100 transition-colors lg:hidden"
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-4">
        {user && (
          <div className="flex items-center gap-3">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="w-9 h-9 rounded-full object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
                {getInitials(user.full_name)}
              </div>
            )}
            <span className="hidden sm:block text-sm font-medium text-gray-700">
              {user.full_name}
            </span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="p-2 rounded-xl hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
          title="Đăng xuất"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
