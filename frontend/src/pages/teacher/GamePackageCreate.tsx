import { useEffect, useState } from 'react';
import { ArrowLeft, Gamepad2, Loader2, Sparkles, UploadCloud } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import api from '@/services/api';
import { classService } from '@/services/class.service';
import { gameService } from '@/services/game.service';
import { showErrorToast, showSuccessToast } from '@/store/toast.store';
import type { Class, GameModuleRegistryEntry } from '@/types';

function unwrapApiData<T>(response: { data?: { data?: T } & T }): T {
  return (response.data?.data ?? response.data) as T;
}

export default function TeacherGamePackageCreate() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [classItem, setClassItem] = useState<Class | null>(null);
  const [modules, setModules] = useState<GameModuleRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedModuleId, setSelectedModuleId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      classId ? classService.getClass(classId).catch(() => null) : Promise.resolve(null),
      gameService.getGameModules(),
    ])
      .then(([classResponse, modulesResponse]) => {
        if (cancelled) return;
        const moduleItems = unwrapApiData<GameModuleRegistryEntry[]>(modulesResponse) ?? [];
        setModules(moduleItems);
        setSelectedModuleId(moduleItems[0]?.id ?? '');
        if (classResponse) {
          setClassItem(unwrapApiData<Class>(classResponse));
        }
      })
      .catch(() => {
        if (cancelled) return;
        showErrorToast('Không thể tải thông tin trò chơi.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [classId]);

  const handleThumbnailUpload = async (file: File) => {
    setUploadingThumbnail(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/upload?sub_dir=thumbnails', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const uploadedUrl = response.data?.data?.url;
      if (!uploadedUrl) {
        throw new Error('Upload response is missing url');
      }
      setThumbnailUrl(uploadedUrl);
      showSuccessToast('Đã tải ảnh đại diện.');
    } catch {
      showErrorToast('Không thể tải ảnh đại diện.');
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedModuleId || !title.trim() || uploadingThumbnail) return;

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        game_module_id: selectedModuleId,
        thumbnail_url: thumbnailUrl.trim() || undefined,
      };
      const response = classId
        ? await gameService.createClassGamePackage(classId, payload)
        : await gameService.createGamePackage(payload);
      const createdPackage = unwrapApiData<{ id: string }>(response);
      showSuccessToast('Đã tạo gói trò chơi.');
      navigate(`/teacher/games/${createdPackage.id}`);
    } catch {
      showErrorToast('Không thể tạo gói trò chơi.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Link to={classId ? `/teacher/classes/${classId}?tab=games` : '/teacher/games'} className="mt-1.5 text-gray-400 hover:text-gray-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            <Sparkles className="h-3.5 w-3.5" />
            Gói trò chơi mới
          </div>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">
            {classId ? 'Tạo trò chơi cho lớp học' : 'Tạo trò chơi cho Game Hub'}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
            {classId
              ? `Gói này sẽ được gắn vào lớp ${classItem?.name ? `"${classItem.name}"` : 'hiện tại'} để học sinh vào chơi và trả lời câu hỏi theo từng mức độ.`
              : 'Gói này sẽ được tạo độc lập. Sau khi soạn xong, bạn có thể publish lên Game Hub để mọi học sinh cùng truy cập.'}
          </p>
        </div>
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Thông tin gói trò chơi</h2>
            <p className="mt-1 text-sm text-slate-500">
              Phần này sẽ hiển thị ở danh sách trò chơi của học sinh trước khi các em bắt đầu.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Input
                label="Tiêu đề"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="VD: Gold Miner - Từ vựng chủ đề động vật"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Mô tả</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-blue-200"
                placeholder="Mô tả ngắn về mục tiêu học tập và trải nghiệm của học sinh."
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Ảnh đại diện (tùy chọn)</label>
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <Input
                  value={thumbnailUrl}
                  onChange={(event) => setThumbnailUrl(event.target.value)}
                  placeholder="Dán liên kết ảnh hoặc tải file lên"
                />
                <label
                  className={`inline-flex h-[42px] items-center justify-center rounded-button border border-primary px-4 text-sm font-medium text-primary transition ${
                    uploadingThumbnail ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-primary-lighter'
                  }`}
                >
                  {uploadingThumbnail ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UploadCloud className="mr-2 h-4 w-4" />
                  )}
                  {uploadingThumbnail ? 'Đang tải...' : 'Tải ảnh'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingThumbnail}
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      await handleThumbnailUpload(file);
                      event.target.value = '';
                    }}
                  />
                </label>
              </div>
              {thumbnailUrl && (
                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  <img
                    src={thumbnailUrl}
                    alt="Ảnh đại diện trò chơi"
                    className="h-40 w-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Chọn trò chơi</h2>
            <p className="mt-1 text-sm text-slate-500">
              Giáo viên chỉ cần chọn trò chơi phù hợp. Hệ thống sẽ tự ghép câu hỏi theo từng mức độ khi học sinh chơi.
            </p>
          </div>

          {modules.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
              Chưa có trò chơi nào sẵn sàng để sử dụng.
            </div>
          ) : (
            <div className="space-y-3">
              {modules.map((moduleItem) => (
                <button
                  key={moduleItem.id}
                  type="button"
                  onClick={() => setSelectedModuleId(moduleItem.id)}
                  className={`w-full rounded-3xl border px-5 py-4 text-left transition ${
                    selectedModuleId === moduleItem.id
                      ? 'border-primary bg-blue-50 shadow-sm'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                      <Gamepad2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{moduleItem.title}</h3>
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-500">
                          {moduleItem.slug}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {moduleItem.description || 'Chưa có mô tả cho trò chơi này.'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => navigate(classId ? `/teacher/classes/${classId}?tab=games` : '/teacher/games')}>
              Hủy
            </Button>
            <Button onClick={handleCreate} disabled={!selectedModuleId || !title.trim() || uploadingThumbnail} isLoading={saving}>
              Tạo gói trò chơi
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
