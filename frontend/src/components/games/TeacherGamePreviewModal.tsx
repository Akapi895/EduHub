import { useEffect, useState } from 'react';
import { Loader2, X, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

import Button from '@/components/common/Button';
import Modal from '@/components/common/Modal';
import GamePlayerShell from '@/components/games/GamePlayerShell';
import { gameService } from '@/services/game.service';
import type { GamePackagePlayResponse } from '@/types';

interface TeacherGamePreviewModalProps {
  packageId: string;
  open: boolean;
  onClose: () => void;
}

function unwrapApiData<T>(response: { data?: { data?: T } & T }): T {
  return (response.data?.data ?? response.data) as T;
}

export default function TeacherGamePreviewModal({ packageId, open, onClose }: TeacherGamePreviewModalProps) {
  const [playBundle, setPlayBundle] = useState<GamePackagePlayResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !packageId) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setPlayBundle(null);

    gameService
      .getGamePackagePlay(packageId)
      .then((response) => {
        if (cancelled) return;
        setPlayBundle(unwrapApiData<GamePackagePlayResponse>(response));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const data = (err as { response?: { data?: { detail?: string; message?: string } } })?.response?.data;
        setError(data?.detail || data?.message || (err as { message?: string })?.message || 'Không thể tải trò chơi.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, packageId]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Xem trước trò chơi"
      size="full"
      showCloseButton={true}
    >
      <div className="flex flex-col" style={{ height: 'calc(100vh - 140px)' }}>
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">
              Chế độ xem trước — Thử chơi như học sinh
            </span>
          </div>
          <div className="flex items-center gap-2">
            {playBundle && (
              <a
                href={`/student/games/${packageId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Mở tab mới
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Đóng
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6">
              <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-5 text-center">
                <p className="text-lg font-semibold text-red-700">Không thể mở trò chơi</p>
                <p className="mt-2 text-sm text-slate-600">{error}</p>
              </div>
              <Button variant="secondary" onClick={onClose}>
                Đóng
              </Button>
            </div>
          )}

          {!loading && !error && playBundle && (
            <div className="h-full">
              <GamePlayerShell playBundle={playBundle} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
