import { Play, Sparkles, Trophy } from 'lucide-react';
import Button from '@/components/common/Button';
import type { GameManifest } from '@/features/games/types';

interface GameCardProps {
  game: GameManifest;
  onPlay: (slug: string) => void;
}

export default function GameCard({ game, onPlay }: GameCardProps) {
  const tags = game.tags ?? [];

  return (
    <article className="group overflow-hidden rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_28px_70px_rgba(15,23,42,0.14)]">
      <div className="relative h-52 overflow-hidden bg-slate-950">
        <img
          src={game.thumbnail}
          alt={game.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/15 to-transparent" />
        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/92 px-3 py-1 text-xs font-semibold text-slate-800">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          Trò chơi học tập
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-slate-950">{game.title}</h2>
            {game.featured && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                Nổi bật
              </span>
            )}
          </div>
          <p className="text-sm leading-6 text-slate-600">{game.short_description || game.description}</p>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
          <div className="flex items-center gap-2 font-medium text-slate-800">
            <Trophy className="h-4 w-4 text-amber-500" />
            Sẵn sàng để chơi
          </div>
          <p className="mt-1">
            Mở toàn màn hình, làm theo hướng dẫn và bắt đầu chinh phục thử thách.
          </p>
        </div>

        <Button type="button" onClick={() => onPlay(game.slug)} className="w-full justify-center">
          <Play className="mr-1.5 h-4 w-4" />
          Chơi ngay
        </Button>
      </div>
    </article>
  );
}
