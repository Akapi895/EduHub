import { useEffect, useState } from 'react';
import {
  Gamepad2,
  Loader2,
  Plus,
  Sparkles,
  Trophy,
  Zap,
  BarChart3,
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
    <div className="space-y-6">
      {/* Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 px-6 py-8 text-white shadow-2xl">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute top-10 right-20 w-4 h-4 bg-amber-400 rounded-full animate-pulse" />
        <div className="absolute bottom-20 left-20 w-3 h-3 bg-pink-400 rounded-full animate-pulse" />
        
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-blue-200 mb-4">
              <Sparkles className="h-4 w-4 text-amber-400" />
              Game Hub
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              Tạo trò chơi học tập
            </h1>
            <p className="text-blue-200 leading-relaxed">
              Thiết kế trò chơi với 4 cấp độ khó, theo dõi bảng xếp hạng và xem thống kê chi tiết của học sinh.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => navigate('/teacher/games/create')}
            className="shrink-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-xl hover:shadow-2xl lg:w-auto"
          >
            <Plus className="mr-2 h-5 w-5" />
            Tạo trò chơi mới
          </Button>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Tổng gói game</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{gamePackages.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Đã publish</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{publishedCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100/80 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Đang phát triển</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{draftCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </section>

      {/* Games List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100/80 bg-white py-20 shadow-sm">
          <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin mb-4" />
          <p className="text-gray-500">Đang tải danh sách trò chơi...</p>
        </div>
      ) : gamePackages.length === 0 ? (
        <section className="rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 px-6 py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Gamepad2 className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Chưa có trò chơi nào</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Tạo trò chơi đầu tiên, soạn câu hỏi theo 4 cấp độ và publish lên Game Hub khi đã sẵn sàng.
          </p>
          <Button onClick={() => navigate('/teacher/games/create')}>
            <Plus className="mr-2 h-4 w-4" />
            Tạo trò chơi đầu tiên
          </Button>
        </section>
      ) : (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Trò chơi của bạn</h2>
              <p className="text-sm text-gray-500">{gamePackages.length} trò chơi</p>
            </div>
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
