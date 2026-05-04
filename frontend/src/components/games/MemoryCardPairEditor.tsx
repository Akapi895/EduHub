import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, GripVertical, ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react';

import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import api from '@/services/api';
import { gameService } from '@/services/game.service';
import { showErrorToast, showSuccessToast } from '@/store/toast.store';
import type { GameCardPair } from '@/types';
import { generateId } from '@/utils/helpers';

interface Props {
  packageId: string;
}

interface DraftPair {
  _localId: string;          // used for React key while unsaved
  id: string | null;         // null = not yet persisted
  left_label: string;
  left_image_url: string;
  right_label: string;
  right_image_url: string;
  order_index: number;
  saving: boolean;
  dirty: boolean;
}

function unwrap<T>(response: { data?: { data?: T } & T }): T {
  return (response.data?.data ?? response.data) as T;
}

function pairToDraft(pair: GameCardPair): DraftPair {
  return {
    _localId: pair.id,
    id: pair.id,
    left_label: pair.left_label ?? '',
    left_image_url: pair.left_image_url ?? '',
    right_label: pair.right_label ?? '',
    right_image_url: pair.right_image_url ?? '',
    order_index: pair.order_index,
    saving: false,
    dirty: false,
  };
}

function CardSide({
  label, imageUrl, side,
  onLabelChange, onImageUrlChange, onImageUpload,
  uploading,
}: {
  label: string;
  imageUrl: string;
  side: 'left' | 'right';
  onLabelChange: (v: string) => void;
  onImageUrlChange: (v: string) => void;
  onImageUpload: (file: File) => void;
  uploading: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-1 flex-col gap-2 min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
        {side === 'left' ? 'Thẻ A (câu hỏi / gợi ý)' : 'Thẻ B (câu trả lời)'}
      </p>

      {/* Image preview */}
      <div
        className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center cursor-pointer hover:border-primary hover:bg-blue-50 transition-all"
        style={{ aspectRatio: '4/3' }}
        onClick={() => fileRef.current?.click()}
        title="Nhấn để tải ảnh lên"
      >
        {imageUrl ? (
          <img src={imageUrl} alt="card" className="absolute inset-0 w-full h-full object-cover rounded-2xl" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-400 pointer-events-none">
            <ImagePlus className="h-6 w-6" />
            <span className="text-xs">Thêm ảnh</span>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-2xl">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onImageUpload(f);
            e.target.value = '';
          }}
        />
      </div>

      <Input
        placeholder="URL ảnh"
        value={imageUrl}
        onChange={(e) => onImageUrlChange(e.target.value)}
        className="text-xs"
      />
      <Input
        placeholder="Nhãn văn bản (tuỳ chọn)"
        value={label}
        onChange={(e) => onLabelChange(e.target.value)}
        className="text-xs"
      />
    </div>
  );
}

export default function MemoryCardPairEditor({ packageId }: Props) {
  const [pairs, setPairs] = useState<DraftPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // fetch
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    gameService.getCardPairs(packageId)
      .then((res) => {
        if (cancelled) return;
        const data = unwrap<GameCardPair[]>(res) ?? [];
        setPairs(data.map(pairToDraft));
      })
      .catch(() => !cancelled && showErrorToast('Không thể tải danh sách cặp thẻ.'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [packageId]);

  // update a field of one draft pair
  const update = useCallback((localId: string, field: keyof DraftPair, value: string) => {
    setPairs((prev) =>
      prev.map((p) => p._localId === localId ? { ...p, [field]: value, dirty: true } : p),
    );
  }, []);

  // save (create or update) a single pair
  const savePair = useCallback(async (localId: string) => {
    const pair = pairs.find((p) => p._localId === localId);
    if (!pair || pair.saving) return;
    setPairs((prev) => prev.map((p) => p._localId === localId ? { ...p, saving: true } : p));

    const payload = {
      left_label: pair.left_label.trim() || null,
      left_image_url: pair.left_image_url.trim() || null,
      right_label: pair.right_label.trim() || null,
      right_image_url: pair.right_image_url.trim() || null,
      order_index: pair.order_index,
    };

    try {
      if (pair.id) {
        const res = await gameService.updateCardPair(pair.id, payload);
        const updated = unwrap<GameCardPair>(res);
        setPairs((prev) => prev.map((p) =>
          p._localId === localId ? { ...pairToDraft(updated), dirty: false } : p,
        ));
      } else {
        const res = await gameService.createCardPair(packageId, payload);
        const created = unwrap<GameCardPair>(res);
        setPairs((prev) => prev.map((p) =>
          p._localId === localId ? { ...pairToDraft(created), dirty: false } : p,
        ));
      }
      showSuccessToast('Đã lưu cặp thẻ.');
    } catch {
      showErrorToast('Không thể lưu cặp thẻ.');
    } finally {
      setPairs((prev) => prev.map((p) => p._localId === localId ? { ...p, saving: false } : p));
    }
  }, [pairs, packageId]);

  // delete a pair
  const deletePair = useCallback(async (localId: string) => {
    const pair = pairs.find((p) => p._localId === localId);
    if (!pair) return;

    if (pair.id) {
      try {
        await gameService.deleteCardPair(pair.id);
        showSuccessToast('Đã xóa cặp thẻ.');
      } catch {
        showErrorToast('Không thể xóa cặp thẻ.');
        return;
      }
    }
    setPairs((prev) => prev.filter((p) => p._localId !== localId));
  }, [pairs]);

  // add new empty pair
  const addPair = useCallback(() => {
    const newPair: DraftPair = {
      _localId: generateId(),
      id: null,
      left_label: '',
      left_image_url: '',
      right_label: '',
      right_image_url: '',
      order_index: pairs.length,
      saving: false,
      dirty: true,
    };
    setPairs((prev) => [...prev, newPair]);
  }, [pairs.length]);

  // upload image
  const uploadImage = useCallback(async (localId: string, side: 'left' | 'right', file: File) => {
    setUploadingId(`${localId}-${side}`);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/upload?sub_dir=card-pairs', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.data?.url as string | undefined;
      if (!url) throw new Error('No URL returned');
      const field = side === 'left' ? 'left_image_url' : 'right_image_url';
      update(localId, field, url);
    } catch {
      showErrorToast('Không thể tải ảnh lên.');
    } finally {
      setUploadingId(null);
    }
  }, [update]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Cặp thẻ Memory Card</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Mỗi cặp gồm 2 thẻ khác nhau. Học sinh lật và khớp đúng 2 thẻ cùng cặp để được điểm.
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold text-slate-600">
          {pairs.length} cặp
        </span>
      </div>

      {/* Pair list */}
      {pairs.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
          <p className="text-lg font-semibold text-slate-700">Chưa có cặp thẻ nào</p>
          <p className="mt-1 text-sm text-slate-500">
            Tạo ít nhất 2 cặp để học sinh có thể bắt đầu chơi.
          </p>
          <Button className="mt-4" onClick={addPair}>
            <Plus className="mr-2 h-4 w-4" />
            Thêm cặp thẻ đầu tiên
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {pairs.map((pair, index) => (
            <div
              key={pair._localId}
              className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              {/* Pair header */}
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 text-slate-300" />
                  <span className="text-sm font-semibold text-slate-600">Cặp {index + 1}</span>
                  {pair.dirty && !pair.saving && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      Chưa lưu
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => deletePair(pair._localId)}
                  className="rounded-xl p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                  title="Xóa cặp"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Left / Right sides */}
              <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr]">
                <CardSide
                  label={pair.left_label}
                  imageUrl={pair.left_image_url}
                  side="left"
                  onLabelChange={(v) => update(pair._localId, 'left_label', v)}
                  onImageUrlChange={(v) => update(pair._localId, 'left_image_url', v)}
                  onImageUpload={(f) => uploadImage(pair._localId, 'left', f)}
                  uploading={uploadingId === `${pair._localId}-left`}
                />

                <div className="flex items-center justify-center py-4">
                  <div className="rounded-full border border-slate-200 bg-slate-50 p-2">
                    <ArrowLeftRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <CardSide
                  label={pair.right_label}
                  imageUrl={pair.right_image_url}
                  side="right"
                  onLabelChange={(v) => update(pair._localId, 'right_label', v)}
                  onImageUrlChange={(v) => update(pair._localId, 'right_image_url', v)}
                  onImageUpload={(f) => uploadImage(pair._localId, 'right', f)}
                  uploading={uploadingId === `${pair._localId}-right`}
                />
              </div>

              {/* Save button */}
              {pair.dirty && (
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={() => savePair(pair._localId)}
                    isLoading={pair.saving}
                    className="text-sm"
                  >
                    Lưu cặp thẻ này
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add pair button */}
      {pairs.length > 0 && (
        <button
          type="button"
          onClick={addPair}
          className="flex w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-slate-200 py-4 text-sm font-medium text-slate-500 transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          Thêm cặp thẻ
        </button>
      )}
    </div>
  );
}
