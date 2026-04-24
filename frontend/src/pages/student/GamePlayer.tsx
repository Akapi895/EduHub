import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';

import GamePlayerShell from '@/components/games/GamePlayerShell';
import { loadGameBySlug } from '@/features/games/catalog';
import type { GameManifest } from '@/features/games/types';

export default function StudentGamePlayer() {
  const { slug } = useParams();
  const [game, setGame] = useState<GameManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!slug) {
      setLoading(false);
      setGame(null);
      return;
    }

    loadGameBySlug(slug)
      .then((result) => {
        if (!cancelled) {
          setGame(result);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message || 'Không thể tải trò chơi');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

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

  if (!game) {
    return <Navigate to="/student/games" replace />;
  }

  return <GamePlayerShell game={game} />;
}
