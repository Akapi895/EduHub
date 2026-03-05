import { useState } from 'react';
import { Camera, Save } from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { useAuthStore } from '@/store/auth.store';

export default function TeacherSettings() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: '',
    bio: '',
  });
  const [password, setPassword] = useState({
    current: '',
    new_password: '',
    confirm: '',
  });

  const handleSaveProfile = () => {
    console.log('Save profile:', profile);
  };

  const handleChangePassword = () => {
    if (password.new_password !== password.confirm) {
      alert('Mật khẩu xác nhận không khớp');
      return;
    }
    console.log('Change password');
    setPassword({ current: '', new_password: '', confirm: '' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Cài đặt</h1>
        <p className="text-gray-500 mt-1">Quản lý thông tin cá nhân</p>
      </div>

      {/* Avatar */}
      <div className="bg-white rounded-card shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Ảnh đại diện</h2>
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-primary">
                  {user?.full_name?.charAt(0) || 'U'}
                </span>
              )}
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-md hover:bg-primary-hover">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div>
            <p className="font-medium">{user?.full_name}</p>
            <p className="text-sm text-gray-500">{user?.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}</p>
          </div>
        </div>
      </div>

      {/* Profile form */}
      <div className="bg-white rounded-card shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Thông tin cá nhân</h2>
        <div className="max-w-lg space-y-4">
          <Input
            label="Họ và tên"
            value={profile.full_name}
            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={profile.email}
            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
          />
          <Input
            label="Số điện thoại"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            placeholder="0912345678"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giới thiệu</label>
            <textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              rows={3}
              placeholder="Vài dòng giới thiệu về bạn..."
              className="w-full px-3 py-2.5 rounded-xl border border-border text-sm focus:ring-2 focus:ring-blue-300 outline-none resize-none"
            />
          </div>
          <Button onClick={handleSaveProfile}>
            <Save className="w-4 h-4 mr-2" /> Lưu thay đổi
          </Button>
        </div>
      </div>

      {/* Password */}
      <div className="bg-white rounded-card shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4">Đổi mật khẩu</h2>
        <div className="max-w-lg space-y-4">
          <Input
            label="Mật khẩu hiện tại"
            type="password"
            value={password.current}
            onChange={(e) => setPassword({ ...password, current: e.target.value })}
          />
          <Input
            label="Mật khẩu mới"
            type="password"
            value={password.new_password}
            onChange={(e) => setPassword({ ...password, new_password: e.target.value })}
          />
          <Input
            label="Xác nhận mật khẩu mới"
            type="password"
            value={password.confirm}
            onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
          />
          <Button onClick={handleChangePassword} disabled={!password.current || !password.new_password}>
            Đổi mật khẩu
          </Button>
        </div>
      </div>
    </div>
  );
}
