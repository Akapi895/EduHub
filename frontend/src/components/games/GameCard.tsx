import { BookOpen, Play, Sparkles, Trophy } from 'lucide-react';

import Button from '@/components/common/Button';
import { getQuestionPlanPreview } from '@/features/games/helpers';
import type { GamePackage } from '@/types';

interface GameCardProps {
  gamePackage: GamePackage;
  onPlay: (packageId: string) => void;
}

function getAttemptLabel(gamePackage: GamePackage) {
  const attempt = gamePackage.current_attempt ?? gamePackage.latest_attempt;
  if (!attempt?.status) return 'Sẵn sàng để chơi';
  if (attempt.status === 'in_progress') return 'Đang chơi, em có thể tiếp tục ngay';
  if (attempt.status === 'completed') return 'Em đã hoàn thành ít nhất một lượt chơi';
  return 'Sẵn sàng để chơi';
}

function getStatusLabel(status: GamePackage['status']) {
  if (status === 'published') return 'Sẵn sàng';
  if (status === 'draft') return 'Bản nháp';
  if (status === 'archived') return 'Lưu trữ';
  return status;
}

export default function GameCard({ gamePackage, onPlay }: GameCardProps) {
  const questionCount = gamePackage.question_count
    ?? Object.values(gamePackage.question_stats?.by_difficulty_band ?? {}).reduce((sum, value) => sum + (value ?? 0), 0);
  const moduleTitle = gamePackage.game_module?.title ?? 'Gói trò chơi';
  const thumbnail = gamePackage.thumbnail_url;
  const preview = getQuestionPlanPreview(gamePackage);

  return (
    <article className="group overflow-hidden rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_28px_70px_rgba(15,23,42,0.14)]">
      <div className="relative h-52 overflow-hidden bg-slate-950">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={gamePackage.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.4),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.35),_transparent_30%),linear-gradient(135deg,#0f172a,#1e293b)] text-center text-2xl font-semibold text-white">
            {gamePackage.title}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/15 to-transparent" />
        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/92 px-3 py-1 text-xs font-semibold text-slate-800">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          {gamePackage.access_context === 'class_assignment' ? 'Trò chơi từ lớp học' : 'Game Hub'}
        </div>
        {gamePackage.class_name && (
          <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/55 px-3 py-1 text-xs font-medium text-white backdrop-blur">
            <BookOpen className="h-3.5 w-3.5 text-sky-300" />
            {gamePackage.class_name}
          </div>
        )}
      </div>

      <div className="space-y-4 p-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-950">{gamePackage.title}</h2>
            {gamePackage.status && (
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                {getStatusLabel(gamePackage.status)}
              </span>
            )}
          </div>
          <p className="text-sm leading-6 text-slate-600">
            {gamePackage.description || 'Mở trò chơi này để bắt đầu hoặc tiếp tục phần chơi của em.'}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Trò chơi</p>
            <p className="mt-1 font-medium text-slate-900">{moduleTitle}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Câu hỏi</p>
            <p className="mt-1 font-medium text-slate-900">{questionCount || 0}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
          <div className="flex items-center gap-2 font-medium text-slate-800">
            <Trophy className="h-4 w-4 text-amber-500" />
            {getAttemptLabel(gamePackage)}
          </div>
          <p className="mt-1">
            {preview
              ? `Bộ câu hỏi sẽ được phân bổ theo ${preview.level_count ?? 1} màn chơi.`
              : 'Tiến độ của em sẽ được lưu riêng cho trò chơi này.'}
          </p>
        </div>

        <Button
          type="button"
          onClick={() => onPlay(gamePackage.id)}
          className="w-full justify-center"
        >
          <Play className="mr-1.5 h-4 w-4" />
          Vào chơi
        </Button>
      </div>
    </article>
  );
}
