import { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import GameCard from '@/components/games/GameCard';
import { loadGameCatalog } from '@/features/games/catalog';
import type { GameManifest } from '@/features/games/types';

export default function StudentGames() {
  const navigate = useNavigate();
  const [games, setGames] = useState<GameManifest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadGameCatalog()
      .then((catalog) => {
        if (!cancelled) {
          setGames(catalog);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err.message || 'Không thể tải danh sách trò chơi');
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
  }, []);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.22),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.18),_transparent_26%),linear-gradient(135deg,#0f172a,#1e293b)] px-6 py-7 text-white shadow-xl sm:px-8">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Khu trò chơi
          </div>
          <div>
            <h1 className="text-3xl font-semibold sm:text-4xl">Khám phá trò chơi dành cho học sinh</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
              Chọn trò chơi em muốn thử, đọc hướng dẫn nhanh rồi bắt đầu luyện phản xạ, tư duy và khả năng chinh phục mục tiêu.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Danh sách trò chơi</h2>
          <p className="mt-1 text-sm text-slate-500">
            Mỗi trò chơi đều có khu vực chơi riêng để em tập trung trải nghiệm mà không bị ảnh hưởng bởi các phần khác của hệ thống.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center rounded-[28px] border border-slate-200 bg-white py-20 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="rounded-[28px] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {games.map((game) => (
              <GameCard
                key={game.slug}
                game={game}
                onPlay={(slug) => navigate(`/student/games/${slug}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
