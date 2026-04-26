import { ChevronRight, Layers3, Target, Trophy } from 'lucide-react';

import {
  GAME_DIFFICULTY_BANDS,
  getBandMeta,
  getDistributionModeLabel,
  getLevelDistributionLabel,
  getQuestionCountForBand,
  getQuestionPlanPreview,
} from '@/features/games/helpers';
import type { GamePackage } from '@/types';

interface TeacherGamePackageCardProps {
  gamePackage: GamePackage;
  onOpen: (packageId: string) => void;
}

function getStatusLabel(status: GamePackage['status']) {
  if (status === 'published') return 'Sẵn sàng';
  if (status === 'draft') return 'Bản nháp';
  if (status === 'archived') return 'Lưu trữ';
  return status;
}

export default function TeacherGamePackageCard({
  gamePackage,
  onOpen,
}: TeacherGamePackageCardProps) {
  const totalQuestions = gamePackage.question_count
    ?? Object.values(gamePackage.question_stats?.by_difficulty_band ?? {}).reduce((sum, value) => sum + (value ?? 0), 0);
  const preview = getQuestionPlanPreview(gamePackage);

  return (
    <button
      type="button"
      onClick={() => onOpen(gamePackage.id)}
      className="w-full rounded-[28px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {gamePackage.game_module?.title ?? 'Gói trò chơi'}
            </span>
            {gamePackage.status && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {getStatusLabel(gamePackage.status)}
              </span>
            )}
          </div>

          <div>
            <h3 className="text-xl font-semibold text-slate-900">{gamePackage.title}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {gamePackage.description || 'Chưa có mô tả cho gói trò chơi này.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {GAME_DIFFICULTY_BANDS.map((band) => {
              const meta = getBandMeta(band);
              const count = getQuestionCountForBand(gamePackage, band);

              return (
                <span
                  key={band}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${meta.accentClass}`}
                >
                  {meta.shortLabel}: {count}
                </span>
              );
            })}
          </div>
        </div>

        <div className="grid min-w-[240px] gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-sky-500" />
              Tổng câu hỏi
            </span>
            <strong className="text-slate-900">{totalQuestions}</strong>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-500" />
              Số màn dự kiến
            </span>
            <strong className="text-slate-900">{preview?.level_count ?? 1}</strong>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-emerald-500" />
              Kiểu phân phối
            </span>
            <strong className="text-slate-900">{getDistributionModeLabel(preview?.distribution_mode)}</strong>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500">
            Mỗi màn: <strong className="text-slate-900">{getLevelDistributionLabel(gamePackage)}</strong>
          </div>
          <div className="pt-1 text-right text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Mở chi tiết <ChevronRight className="ml-1 inline h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </button>
  );
}
