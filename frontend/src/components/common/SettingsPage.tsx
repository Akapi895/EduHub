import { useState, useRef } from 'react';
import { Camera, Save, Loader2, User, Lock, Shield } from 'lucide-react';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { useAuthStore } from '@/store/auth.store';
import { showErrorToast, showSuccessToast, showWarningToast } from '@/store/toast.store';
import { userService } from '@/services/user.service';
import api from '@/services/api';

interface SettingsPageProps {
  showBio?: boolean;
}

export default function SettingsPage({ showBio = false }: SettingsPageProps) {
  const { user, updateUser } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
  });
  const [password, setPassword] = useState({
    current: '',
    new_password: '',
    confirm: '',
  });

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const uploadRes = await api.post('/upload?sub_dir=avatars', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const avatar_url = uploadRes.data.data.url;
      const res = await userService.updateProfile({ avatar_url });
      updateUser(res.data.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload avatar thất bại';
      showErrorToast((err as { response?: { data?: { message?: string } } })?.response?.data?.message || message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const payload: Record<string, string | undefined> = {
        full_name: profile.full_name,
        phone: profile.phone || undefined,
      };
      if (showBio) {
        payload.bio = profile.bio || undefined;
      }
      const res = await userService.updateProfile(payload);
      updateUser(res.data.data);
      showSuccessToast('Cập nhật thành công!');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Cập nhật thất bại';
      showErrorToast((err as { response?: { data?: { message?: string } } })?.response?.data?.message || message);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (password.new_password !== password.confirm) {
      showWarningToast('Mật khẩu xác nhận không khớp');
      return;
    }
    setChangingPw(true);
    try {
      await userService.changePassword({
        current_password: password.current,
        new_password: password.new_password,
      });
      showSuccessToast('Đổi mật khẩu thành công!');
      setPassword({ current: '', new_password: '', confirm: '' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đổi mật khẩu thất bại';
      showErrorToast((err as { response?: { data?: { message?: string } } })?.response?.data?.message || message);
    } finally {
      setChangingPw(false);
    }
  };

  const roleLabel = user?.role === 'teacher' ? 'Giáo viên' : 'Học sinh';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cài đặt tài khoản</h1>
        <p className="text-gray-500 mt-1">Quản lý thông tin cá nhân và bảo mật</p>
      </div>

      {/* Avatar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Ảnh đại diện</h2>
            <p className="text-sm text-gray-500">Cập nhật hình ảnh hồ sơ của bạn</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center overflow-hidden shadow-lg">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-full h-full rounded-2xl object-cover" />
              ) : (
                <span className="text-3xl font-bold text-white">
                  {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-2 -right-2 w-10 h-10 bg-white border-2 border-primary text-primary rounded-xl flex items-center justify-center shadow-lg hover:bg-primary hover:text-white transition-colors"
            >
              {uploadingAvatar ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{user?.full_name}</p>
            <p className="text-sm text-gray-500">{roleLabel}</p>
            <p className="text-sm text-gray-400 mt-1">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Profile and Password - 2 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <User className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Thông tin cá nhân</h2>
              <p className="text-sm text-gray-500">Cập nhật thông tin hồ sơ của bạn</p>
            </div>
          </div>
          <div className="space-y-5">
            <Input
              label="Họ và tên"
              value={profile.full_name}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              placeholder="Nhập họ và tên của bạn"
            />
            <Input
              label="Email"
              type="email"
              value={profile.email}
              disabled
            />
            <Input
              label="Số điện thoại"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="0912345678"
            />
            {showBio && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Giới thiệu</label>
                <textarea
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  rows={3}
                  placeholder="Vài dòng giới thiệu về bạn..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none text-sm bg-gray-50/50 focus:bg-white"
                />
              </div>
            )}
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang lưu...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" /> Lưu thay đổi
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Password */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Đổi mật khẩu</h2>
              <p className="text-sm text-gray-500">Cập nhật mật khẩu để bảo vệ tài khoản</p>
            </div>
          </div>
          <div className="space-y-5">
            <Input
              label="Mật khẩu hiện tại"
              type="password"
              value={password.current}
              onChange={(e) => setPassword({ ...password, current: e.target.value })}
              placeholder="Nhập mật khẩu hiện tại"
            />
            <Input
              label="Mật khẩu mới"
              type="password"
              value={password.new_password}
              onChange={(e) => setPassword({ ...password, new_password: e.target.value })}
              placeholder="Nhập mật khẩu mới"
            />
            <Input
              label="Xác nhận mật khẩu mới"
              type="password"
              value={password.confirm}
              onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
              placeholder="Nhập lại mật khẩu mới"
            />
            <Button
              onClick={handleChangePassword}
              disabled={!password.current || !password.new_password || changingPw}
            >
              {changingPw ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" /> Đang xử lý...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" /> Đổi mật khẩu
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
