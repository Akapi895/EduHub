import { useState, type FormEvent } from 'react';
import type { AxiosError } from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import type { Role } from '@/utils/constants';

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

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const loginAction = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const normalizedFullName = fullName.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedFullName || !normalizedEmail || !password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Email không hợp lệ.');
      return;
    }
    if (password.length < 8) {
      setError('Mật khẩu cần có ít nhất 8 ký tự.');
      return;
    }

    setLoading(true);
    try {
      // Register
      await authService.register({
        full_name: normalizedFullName,
        email: normalizedEmail,
        password,
        role,
      });
      // Auto-login after registration
      const loginRes = await authService.login(normalizedEmail, password);
      const { access_token, user } = loginRes.data.data;
      loginAction(user, access_token);
      navigate(user.role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard');
    } catch (err) {
      setError(getRegisterErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Tạo tài khoản</h1>
          <p className="text-gray-500 mt-1">Tham gia thế giới cổ tích ✨</p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="bg-white rounded-card shadow-md p-8 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Họ và tên</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nguyễn Văn A"
              autoComplete="name"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none transition-all"
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
              required
              className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              minLength={8}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none transition-all"
            />
            <p className="mt-1 text-xs text-gray-500">Tối thiểu 8 ký tự.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Bạn là</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('student')}
                aria-pressed={role === 'student'}
                className={`py-3 rounded-xl border-2 font-medium transition-all ${
                  role === 'student'
                    ? 'border-primary bg-primary-lighter text-primary'
                    : 'border-border text-gray-500 hover:border-gray-300'
                }`}
              >
                🎒 Học sinh
              </button>
              <button
                type="button"
                onClick={() => setRole('teacher')}
                aria-pressed={role === 'teacher'}
                className={`py-3 rounded-xl border-2 font-medium transition-all ${
                  role === 'teacher'
                    ? 'border-primary bg-primary-lighter text-primary'
                    : 'border-border text-gray-500 hover:border-gray-300'
                }`}
              >
                👩‍🏫 Giáo viên
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full py-3" disabled={loading}>
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Đăng nhập
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
