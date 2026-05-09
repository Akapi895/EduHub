import { useState, useCallback, useEffect } from 'react';
import { Loader2, UploadCloud, X, Image } from 'lucide-react';

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
  card_back_image_url?: string;
  move_limit?: number | 'unlimited';
  max_moves?: number | 'unlimited';
}

export default function MemoryCardGameConfig({ packageId, totalCardPairs, onConfigUpdate }: Props) {
  const [backgroundImageUrl, setBackgroundImageUrl] = useState('');
  const [cardBackImageUrl, setCardBackImageUrl] = useState('');
  const [moveLimitMode, setMoveLimitMode] = useState<'unlimited' | 'limited'>('unlimited');
  const [moveLimit, setMoveLimit] = useState('');
  const [uploadingBackground, setUploadingBackground] = useState(false);
  const [uploadingCardBack, setUploadingCardBack] = useState(false);
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
          if (cfg.card_back_image_url) {
            setCardBackImageUrl(cfg.card_back_image_url);
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
    setUploadingBackground(true);
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
      setUploadingBackground(false);
    }
  }, []);

  // Upload card back image
  const handleUploadCardBack = useCallback(async (file: File) => {
    setUploadingCardBack(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/upload?sub_dir=card-backs', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.data?.url as string | undefined;
      if (!url) throw new Error('No URL returned');
      setCardBackImageUrl(url);
      showSuccessToast('Đã tải ảnh mặt thẻ.');
    } catch {
      showErrorToast('Không thể tải ảnh mặt thẻ.');
    } finally {
      setUploadingCardBack(false);
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

      if (cardBackImageUrl.trim()) {
        runtimeConfig.card_back_image_url = cardBackImageUrl.trim();
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
  }, [packageId, backgroundImageUrl, cardBackImageUrl, moveLimitMode, moveLimit, totalCardPairs, onConfigUpdate]);

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
          Tùy chỉnh ảnh nền, mặt thẻ và giới hạn lượt chơi cho trò chơi.
        </p>
      </div>

      {/* Card back image section */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-slate-700">
          <span className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Ảnh mặt sấp thẻ (tùy chọn)
          </span>
        </label>
        <p className="text-xs text-slate-500">
          Ảnh hiển thị khi thẻ chưa được lật. Nếu không chọn, sẽ dùng ảnh mặc định.
        </p>

        <div className="flex items-center gap-4">
          <label
            className={`inline-flex items-center justify-center rounded-button border border-primary px-4 py-2.5 text-sm font-medium text-primary transition ${
              uploadingCardBack ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-primary-lighter'
            }`}
          >
            {uploadingCardBack ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="mr-2 h-4 w-4" />
            )}
            {uploadingCardBack ? 'Đang tải...' : 'Chọn ảnh mặt thẻ'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingCardBack}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await handleUploadCardBack(file);
                e.target.value = '';
              }}
            />
          </label>

          {cardBackImageUrl && (
            <div className="relative flex items-center gap-2">
              <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <img
                  src={cardBackImageUrl}
                  alt="Card back preview"
                  className="h-12 w-12 object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => setCardBackImageUrl('')}
                className="rounded-lg bg-white p-1.5 shadow hover:bg-slate-50"
                title="Xóa ảnh"
              >
                <X className="h-4 w-4 text-slate-600" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Background image section */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-slate-700">
          Ảnh nền (tùy chọn)
        </label>
        <p className="text-xs text-slate-500">
          Ảnh nền sẽ được hiển thị phía sau lưới thẻ. Khuyến cáo: ảnh có độ phân giải cao, nền mờ hoặc pattern.
        </p>

        <div className="flex items-center gap-4">
          <label
            className={`inline-flex items-center justify-center rounded-button border border-primary px-4 py-2.5 text-sm font-medium text-primary transition ${
              uploadingBackground ? 'pointer-events-none opacity-50' : 'cursor-pointer hover:bg-primary-lighter'
            }`}
          >
            {uploadingBackground ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="mr-2 h-4 w-4" />
            )}
            {uploadingBackground ? 'Đang tải...' : 'Chọn ảnh nền'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploadingBackground}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) await handleUploadBackground(file);
                e.target.value = '';
              }}
            />
          </label>

          {backgroundImageUrl && (
            <div className="relative flex items-center gap-2">
              <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <img
                  src={backgroundImageUrl}
                  alt="Game background preview"
                  className="h-12 w-20 object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => setBackgroundImageUrl('')}
                className="rounded-lg bg-white p-1.5 shadow hover:bg-slate-50"
                title="Xóa ảnh"
              >
                <X className="h-4 w-4 text-slate-600" />
              </button>
            </div>
          )}
        </div>
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
