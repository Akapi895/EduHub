import { useState, useCallback, useEffect } from 'react';
import { Loader2, UploadCloud, X } from 'lucide-react';

import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import api from '@/services/api';
import { gameService } from '@/services/game.service';
import { showErrorToast, showSuccessToast } from '@/store/toast.store';

interface Props {
  packageId: string;
  totalCardPairs: number;
  onConfigUpdate?: (config: MemoryCardRuntimeConfig) => void;
}

export interface MemoryCardRuntimeConfig {
  background_image_url?: string;
  move_limit?: number | 'unlimited';
  max_moves?: number | 'unlimited';
}

export default function MemoryCardGameConfig({ packageId, totalCardPairs, onConfigUpdate }: Props) {
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [moveLimitMode, setMoveLimitMode] = useState<'unlimited' | 'limited'>('unlimited');
  const [moveLimit, setMoveLimit] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load config from backend
  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    gameService.getGamePackage(packageId)
      .then((res) => {
        if (cancelled) return;
        const pkg = res.data?.data;
        if (pkg?.runtime_config) {
          const cfg = pkg.runtime_config as MemoryCardRuntimeConfig;
          if (cfg.background_image_url) {
            setBackgroundImageUrl(cfg.background_image_url);
          }
          const rawMoveLimit = cfg.move_limit ?? cfg.max_moves;
          if (rawMoveLimit && rawMoveLimit !== 'unlimited') {
            setMoveLimitMode('limited');
            setMoveLimit(String(rawMoveLimit));
          } else {
            setMoveLimitMode('unlimited');
            setMoveLimit('');
          }
        }
      })
      .catch(() => showErrorToast('Không thể tải cấu hình trò chơi.'))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [packageId]);

  // Upload background image
  const handleUploadBackground = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/upload?sub_dir=game-backgrounds', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.data?.url as string | undefined;
      if (!url) throw new Error('No URL returned');
      setBackgroundImageUrl(url);
      showSuccessToast('Đã tải ảnh nền.');
    } catch {
      showErrorToast('Không thể tải ảnh nền.');
    } finally {
      setUploading(false);
    }
  }, []);

  // Validate and save config
  const handleSaveConfig = useCallback(async () => {
    // Validate move_limit
    if (moveLimitMode === 'limited') {
      const limit = parseInt(moveLimit, 10);
      if (!Number.isFinite(limit) || limit < 1) {
        showErrorToast('Giới hạn lượt chơi phải là số dương.');
        return;
      }
      // Each card pair has 2 cards, so minimum moves needed is totalCardPairs
      // We allow moveLimit >= totalCardPairs
      if (limit < totalCardPairs) {
        showErrorToast(`Giới hạn lượt chơi phải >= ${totalCardPairs} (tổng số cặp thẻ).`);
        return;
      }
    }

    setSaving(true);
    try {
      const runtimeConfig: MemoryCardRuntimeConfig = {};

      if (backgroundImageUrl.trim()) {
        runtimeConfig.background_image_url = backgroundImageUrl.trim();
      }

      if (moveLimitMode === 'limited') {
        runtimeConfig.move_limit = parseInt(moveLimit, 10);
      } else {
        runtimeConfig.move_limit = 'unlimited';
      }

      // Call backend to update runtime_config
      await gameService.updateGamePackage(packageId, { runtime_config: runtimeConfig as Record<string, unknown> });
      showSuccessToast('Đã lưu cấu hình trò chơi.');
      onConfigUpdate?.(runtimeConfig);
    } catch {
      showErrorToast('Không thể lưu cấu hình.');
    } finally {
      setSaving(false);
    }
  }, [packageId, backgroundImageUrl, moveLimitMode, moveLimit, totalCardPairs, onConfigUpdate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Cấu hình Memory Card</h2>
        <p className="mt-1 text-sm text-slate-500">
          Tùy chỉnh ảnh nền và giới hạn lượt chơi cho trò chơi.
        </p>
      </div>

      {/* Background image section */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-slate-700">
          Ảnh nền (tùy chọn)
        </label>
        <p className="text-xs text-slate-500">
          Ảnh nền sẽ được hiển thị phía sau lưới thẻ. Khuyến cáo: ảnh có độ phân giải cao, nền mờ hoặc pattern.
        </p>

        <label
          className={`inline-flex items-center justify-center rounded-button border border-primary px-4 py-2.5 text-sm font-medium text-primary transition ${
            uploading ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-primary-lighter'
          }`}
        >
          {uploading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud className="mr-2 h-4 w-4" />
          )}
          {uploading ? 'Đang tải...' : 'Tải ảnh'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await handleUploadBackground(file);
              e.target.value = '';
            }}
          />
        </label>

        {backgroundImageUrl && (
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <img
              src={backgroundImageUrl}
              alt="Game background preview"
              className="h-32 w-full object-cover"
            />
            <button
              type="button"
              onClick={() => setBackgroundImageUrl('')}
              className="absolute right-2 top-2 rounded-lg bg-white/80 p-1.5 hover:bg-white"
              title="Xóa ảnh"
            >
              <X className="h-4 w-4 text-slate-600" />
            </button>
          </div>
        )}
      </div>

      {/* Move limit section */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-slate-700">
          Giới hạn lượt chơi (Moves)
        </label>
        <p className="text-xs text-slate-500">
          Một "lượt" = lật hai thẻ (đúng hoặc sai). Hiện tại bạn có <strong>{totalCardPairs} cặp thẻ</strong>, vì vậy tối thiểu cần <strong>{totalCardPairs} lượt</strong>.
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="moveLimit"
                value="unlimited"
                checked={moveLimitMode === 'unlimited'}
                onChange={() => setMoveLimitMode('unlimited')}
                className="h-4 w-4 border-slate-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-slate-700">Không giới hạn</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="moveLimit"
                value="limited"
                checked={moveLimitMode === 'limited'}
                onChange={() => setMoveLimitMode('limited')}
                className="h-4 w-4 border-slate-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-slate-700">Giới hạn số lượt</span>
            </label>
          </div>

          {moveLimitMode === 'limited' && (
            <Input
              type="number"
              min={totalCardPairs}
              value={moveLimit}
              onChange={(e) => setMoveLimit(e.target.value)}
              placeholder={`Tối thiểu: ${totalCardPairs}`}
              label="Số lượt tối đa"
            />
          )}
        </div>
      </div>

      {/* Save button */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Button onClick={handleSaveConfig} isLoading={saving}>
          Lưu cấu hình
        </Button>
      </div>
    </div>
  );
}
