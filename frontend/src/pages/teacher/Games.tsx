import { useEffect, useState } from 'react';
import {
  Gamepad2,
  Loader2,
  Plus,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import Button from '@/components/common/Button';
import TeacherGamePackageCard from '@/components/games/TeacherGamePackageCard';
import { gameService } from '@/services/game.service';
import { showErrorToast } from '@/store/toast.store';
import type { GamePackage } from '@/types';

export default function TeacherGames() {
  const navigate = useNavigate();
  const [gamePackages, setGamePackages] = useState<GamePackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    gameService.getTeacherGamePackages()
      .then((response) => {
        if (cancelled) return;
        setGamePackages(Array.isArray(response.data.data) ? response.data.data : []);
      })
      .catch(() => {
        if (cancelled) return;
        setGamePackages([]);
        showErrorToast('Không thể tải danh sách trò chơi.');
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

  const publishedCount = gamePackages.filter((item) => item.published_to_hub).length;
  const draftCount = gamePackages.filter((item) => item.status === 'draft' || !item.published_to_hub).length;

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.22),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.18),_transparent_28%),linear-gradient(135deg,#0f172a,#1e293b)] px-6 py-7 text-white shadow-xl sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Game Hub
            </div>
            <div>
              <h1 className="text-3xl font-semibold sm:text-4xl">Tạo và publish trò chơi cho mọi học sinh</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
                Trò chơi được tạo độc lập với lớp học. Khi đã sẵn sàng, bạn publish lên Game Hub để học sinh có thể truy cập và chơi trực tiếp.
              </p>
            </div>
          </div>
          <Button
            type="button"
            className="w-full justify-center bg-white text-slate-950 hover:bg-slate-100 lg:w-auto"
            onClick={() => navigate('/teacher/games/create')}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Tạo trò chơi
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-500">Tổng gói game</span>
            <Gamepad2 className="h-4 w-4 text-sky-500" />
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{gamePackages.length}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-500">Đã publish</span>
            <Sparkles className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{publishedCount}</p>
        </div>
        <div className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-slate-500">Cần hoàn thiện</span>
            <Trophy className="h-4 w-4 text-amber-500" />
          </div>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{draftCount}</p>
        </div>
      </section>

      {loading ? (
        <div className="flex justify-center rounded-[28px] border border-slate-200 bg-white py-20 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : gamePackages.length === 0 ? (
        <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">Chưa có trò chơi nào</p>
          <p className="mt-2 text-sm text-slate-500">
            Tạo trò chơi đầu tiên, soạn câu hỏi rồi publish lên Game Hub khi đã sẵn sàng.
          </p>
          <Button className="mt-5" onClick={() => navigate('/teacher/games/create')}>
            <Plus className="mr-1.5 h-4 w-4" />
            Tạo trò chơi
          </Button>
        </section>
      ) : (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Trò chơi của bạn</h2>
            <p className="mt-1 text-sm text-slate-500">
              Mở từng gói để chỉnh nội dung, publish hoặc xem bảng xếp hạng.
            </p>
          </div>

          <div className="space-y-4">
            {gamePackages.map((gamePackage) => (
              <TeacherGamePackageCard
                key={gamePackage.id}
                gamePackage={gamePackage}
                onOpen={(targetPackageId) => navigate(`/teacher/games/${targetPackageId}`)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
