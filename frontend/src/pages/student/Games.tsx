import { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import GameCard from '@/components/games/GameCard';
import { gameService } from '@/services/game.service';
import type { GamePackage } from '@/types';

export default function StudentGames() {
  const navigate = useNavigate();
  const [gamePackages, setGamePackages] = useState<GamePackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    gameService.getMyGamePackages()
      .then((response) => {
        if (cancelled) return;
        setGamePackages(Array.isArray(response.data.data) ? response.data.data : []);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Không thể tải danh sách trò chơi.');
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
            Trò chơi dành cho em
          </div>
          <div>
            <h1 className="text-3xl font-semibold sm:text-4xl">Chọn trò chơi và bắt đầu khám phá</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
              Đây là những trò chơi giáo viên đã giao cho lớp của em. Mỗi trò chơi sẽ lưu tiến độ và câu trả lời riêng.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Các trò chơi có thể chơi</h2>
          <p className="mt-1 text-sm text-slate-500">
            Chọn một trò chơi để tiếp tục phần chơi hoặc bắt đầu lượt mới.
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
        ) : gamePackages.length === 0 ? (
          <div className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-900">Chưa có trò chơi nào được giao</p>
            <p className="mt-2 text-sm text-slate-500">
              Khi giáo viên thêm trò chơi cho lớp, trò chơi sẽ xuất hiện tại đây.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {gamePackages.map((gamePackage) => (
              <GameCard
                key={gamePackage.id}
                gamePackage={gamePackage}
                onPlay={(packageId) => navigate(`/student/games/${packageId}`)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
