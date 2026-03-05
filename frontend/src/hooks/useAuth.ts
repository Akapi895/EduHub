import { useAuthStore } from '@/store/auth.store';

export function useAuth() {
  const { user, token, isAuthenticated, login, logout, updateUser } =
    useAuthStore();

  return {
    user,
    token,
    isAuthenticated,
    isTeacher: user?.role === 'teacher',
    isStudent: user?.role === 'student',
    login,
    logout,
    updateUser,
  };
}
