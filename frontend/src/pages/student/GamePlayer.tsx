import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';

import GamePlayerShell from '@/components/games/GamePlayerShell';
import { gameService } from '@/services/game.service';
import type { GamePackagePlayResponse } from '@/types';

function unwrapApiData<T>(response: { data?: { data?: T } & T }): T {
  return (response.data?.data ?? response.data) as T;
}

function extractApiErrorMessage(error: unknown, fallback: string) {
  const responseData = (error as { response?: { data?: { detail?: string; message?: string } } })?.response?.data;
  return responseData?.detail || responseData?.message || (error as { message?: string })?.message || fallback;
}

export default function StudentGamePlayer() {
  const { packageId } = useParams();
  const [playBundle, setPlayBundle] = useState<GamePackagePlayResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!packageId) {
      setLoading(false);
      setPlayBundle(null);
      return;
    }

    gameService.getGamePackagePlay(packageId)
      .then((response) => {
        if (cancelled) return;
        setPlayBundle(unwrapApiData<GamePackagePlayResponse>(response));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setError(extractApiErrorMessage(error, 'Không thể tải trò chơi này.'));
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [packageId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.2),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_26%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_55%,#e2e8f0_100%)] text-slate-700">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.2),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_26%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_55%,#e2e8f0_100%)] px-4">
        <div className="w-full max-w-lg rounded-3xl border border-red-200 bg-white px-6 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
          <p className="text-lg font-semibold text-red-700">Không thể mở trò chơi</p>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!playBundle) {
    return <Navigate to="/student/games" replace />;
  }

  if (playBundle.access && playBundle.access.allowed === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.2),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.16),_transparent_26%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_55%,#e2e8f0_100%)] px-4">
        <div className="w-full max-w-lg rounded-3xl border border-amber-200 bg-white px-6 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
          <p className="text-lg font-semibold text-slate-900">Trò chơi chưa sẵn sàng</p>
          <p className="mt-2 text-sm text-slate-600">
            {playBundle.access.reason || playBundle.package.access_reason || 'Hiện tại em chưa thể vào chơi trò chơi này.'}
          </p>
        </div>
      </div>
    );
  }

  return <GamePlayerShell playBundle={playBundle} />;
}
