import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, UserPlus, LogIn, Lock, GraduationCap, Users, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import type { Role } from '@/utils/constants';
import type { AxiosError } from 'axios';

type AuthMode = 'login' | 'register';

type ApiValidationError = {
  loc?: Array<string | number>;
  msg?: string;
  type?: string;
};

type RegisterErrorResponse = {
  message?: string;
  detail?: string | ApiValidationError[];
};

function getRegisterErrorMessage(error: unknown) {
  const data = (error as AxiosError<RegisterErrorResponse>).response?.data;
  if (!data) {
    return 'Đăng ký thất bại. Vui lòng thử lại.';
  }

  if (typeof data.message === 'string' && data.message.trim()) {
    return data.message;
  }

  if (typeof data.detail === 'string' && data.detail.trim()) {
    if (data.detail.toLowerCase().includes('email already registered')) {
      return 'Email này đã được đăng ký.';
    }
    return data.detail;
  }

  if (Array.isArray(data.detail) && data.detail.length > 0) {
    const firstError = data.detail[0];
    const location = (firstError.loc ?? []).map(String);

    if (location.includes('full_name')) {
      return 'Vui lòng nhập họ và tên.';
    }
    if (location.includes('email')) {
      return 'Email không hợp lệ.';
    }
    if (location.includes('password')) {
      return 'Mật khẩu cần có ít nhất 8 ký tự.';
    }
    if (location.includes('role')) {
      return 'Vui lòng chọn vai trò hợp lệ.';
    }

    return firstError.msg || 'Thông tin đăng ký chưa hợp lệ.';
  }

  return 'Đăng ký thất bại. Vui lòng thử lại.';
}

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [isAnimating, setIsAnimating] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);

  const loginAction = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const switchMode = (newMode: AuthMode) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setLoginError('');
    setRegisterError('');
    setMode(newMode);
    setTimeout(() => setIsAnimating(false), 700);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!email || !password) {
      setLoginError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    setLoginLoading(true);
    try {
      const res = await authService.login(email, password);
      const { access_token, user } = res.data.data;
      loginAction(user, access_token);
      navigate(user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng thử lại.';
      setLoginError(msg);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');

    const normalizedFullName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedFullName || !normalizedEmail || !password) {
      setRegisterError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setRegisterError('Email không hợp lệ.');
      return;
    }
    if (password.length < 8) {
      setRegisterError('Mật khẩu cần có ít nhất 8 ký tự.');
      return;
    }
    if (confirmPassword !== password) {
      setRegisterError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setRegisterLoading(true);
    try {
      await authService.register({
        full_name: normalizedFullName,
        email: normalizedEmail,
        password,
        role,
      });
      const loginRes = await authService.login(normalizedEmail, password);
      const { access_token, user } = loginRes.data.data;
      loginAction(user, access_token);
      navigate(user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
    } catch (err) {
      setRegisterError(getRegisterErrorMessage(err));
    } finally {
      setRegisterLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 py-10 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/4 -left-1/4 w-[50%] h-[50%] bg-blue-500 rounded-full blur-[100px] opacity-30" />
        <div className="absolute bottom-0 right-0 w-[40%] h-[40%] bg-purple-500 rounded-full blur-[100px] opacity-20" />
      </div>

      {/* Main Card */}
      <div className="relative bg-white rounded-4xl shadow-2xl w-full max-w-[1000px] min-h-[650px] overflow-hidden flex flex-col md:flex-row z-10">
        
        {/* Back to Landing */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 z-30 flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-primary transition-colors bg-white/80 backdrop-blur-sm rounded-xl shadow-sm hover:shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Quay về</span>
        </button>

        {/* HEADER MOBILE */}
        <div className="md:hidden p-6 pb-0 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-2">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-primary">Thế giới cổ tích</h1>
        </div>

        {/* LEFT SIDE: LOGIN FORM */}
        <div className={`w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center transition-all duration-700 absolute md:relative top-0 left-0 h-full bg-white
          ${mode === 'login' 
            ? 'z-10 opacity-100 translate-x-0 pointer-events-auto' 
            : 'z-0 opacity-0 pointer-events-none'
          }
          ${mode === 'register' && 'hidden md:flex'} 
        `}>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-primary mb-2">Chào mừng trở lại!</h2>
            <p className="text-gray-500">Đăng nhập để tiếp tục hành trình học tập</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-5 relative z-10">
            {loginError && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
                {loginError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none transition-all bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none transition-all bg-gray-50"
              />
            </div>

            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300 text-primary" />
                Ghi nhớ đăng nhập
              </label>
              <Link to="/forgot-password" className="text-blue-500 font-semibold hover:underline">
                Quên mật khẩu?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl py-3 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              {loginLoading ? (
                'Đang đăng nhập...'
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Đăng nhập
                </>
              )}
            </button>
          </form>
        </div>

        {/* RIGHT SIDE: REGISTER FORM */}
        <div className={`w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center transition-all duration-700 absolute md:relative top-0 right-0 h-full bg-white
          ${mode === 'register'
            ? 'z-10 opacity-100 translate-x-0 pointer-events-auto' 
            : 'z-0 opacity-0 pointer-events-none'
          }
          ${mode === 'login' && 'hidden md:flex'}
        `}>
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-primary mb-2">Tạo tài khoản</h2>
            <p className="text-gray-500">
              Tham gia cộng đồng Thế giới cổ tích ngay hôm nay!
            </p>
          </div>

          <form onSubmit={handleRegisterSubmit} className="space-y-4 relative z-10">
            {registerError && (
              <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">
                {registerError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nguyễn Văn A"
                autoComplete="name"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none transition-all bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none transition-all bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 8 ký tự"
                autoComplete="new-password"
                minLength={8}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none transition-all bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Xác nhận mật khẩu</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu"
                autoComplete="new-password"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none transition-all bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bạn là</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('student')}
                  className={`py-3 rounded-xl border-2 font-medium transition-all flex items-center justify-center gap-2 ${
                    role === 'student'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <GraduationCap className="w-5 h-5" />
                  Học sinh
                </button>
                <button
                  type="button"
                  onClick={() => setRole('teacher')}
                  className={`py-3 rounded-xl border-2 font-medium transition-all flex items-center justify-center gap-2 ${
                    role === 'teacher'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <Users className="w-5 h-5" />
                  Giáo viên
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={registerLoading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold rounded-xl py-3 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              {registerLoading ? (
                'Đang đăng ký...'
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Tạo tài khoản
                </>
              )}
            </button>
          </form>
        </div>

        {/* SLIDING OVERLAY */}
        <div 
          className={`hidden md:block absolute top-0 h-full w-[55%] transition-all duration-700 ease-in-out z-20 shadow-2xl text-white overflow-hidden
            ${mode === 'login' 
              ? 'left-1/2' 
              : '-left-[5%]'
            }`}
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            clipPath: mode === 'login' 
              ? 'polygon(15% 0, 100% 0, 100% 100%, 0% 100%)'
              : 'polygon(0 0, 100% 0, 85% 100%, 0% 100%)'
          }}
        >
          {/* Overlay Background Decor */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

          {/* CONTENT: SWITCH TO REGISTER (Shown when Login mode) */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center p-12 text-center transition-all duration-700 px-20
            ${mode === 'login' ? 'opacity-100 translate-x-0 delay-100 pointer-events-auto' : 'opacity-0 translate-x-[20%] pointer-events-none'}
          `}>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md mb-6 border border-white/20 shadow-lg">
              <UserPlus className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold mb-4 text-white">
              Mới tham gia?
            </h2>
            <p className="text-blue-100 mb-8 text-lg">
              Đăng ký ngay để bắt đầu hành trình học tập thú vị cùng Thế giới cổ tích!
            </p>
            
            <button 
              onClick={() => switchMode('register')}
              className="relative z-50 bg-white text-primary hover:bg-blue-50 rounded-full px-10 py-3 font-bold text-lg shadow-lg transform transition hover:scale-105 cursor-pointer"
            >
              Đăng ký ngay
            </button>
          </div>

          {/* CONTENT: SWITCH TO LOGIN (Shown when Register mode) */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center p-12 text-center transition-all duration-700 px-20
            ${mode === 'register' ? 'opacity-100 translate-x-0 delay-100 pointer-events-auto' : 'opacity-0 -translate-x-[20%] pointer-events-none'}
          `}>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-md mb-6 border border-white/20 shadow-lg">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-4xl font-bold mb-4 text-white">
              Chào mừng trở lại!
            </h2>
            <p className="text-blue-100 mb-8 text-lg">
              Đã có tài khoản? Đăng nhập để tiếp tục học tập.
            </p>
            
            <button 
              onClick={() => switchMode('login')}
              className="relative z-50 bg-white text-primary hover:bg-blue-50 rounded-full px-10 py-3 font-bold text-lg shadow-lg transform transition hover:scale-105 cursor-pointer"
            >
              Đăng nhập
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
