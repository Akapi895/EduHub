import type {
  DifficultyBand,
  GameModuleRegistryEntry,
  GamePackage,
  GamePackagePlayResponse,
  GameStartAttemptResponse,
  PackageAttemptTotals,
} from '@/types';
import type { GameManifest } from '@/features/games/types';

export const GAME_DIFFICULTY_BANDS: DifficultyBand[] = [
  'recognition',
  'comprehension',
  'application_basic',
  'application_advanced',
];

export const GAME_DIFFICULTY_BAND_META: Record<
  DifficultyBand,
  {
    label: string;
    shortLabel: string;
    description: string;
    accentClass: string;
    softClass: string;
  }
> = {
  recognition: {
    label: 'Nhận biết',
    shortLabel: 'NB',
    description: 'Câu hỏi gợi nhớ, nhận diện và phân biệt kiến thức cơ bản.',
    accentClass: 'text-sky-700 border-sky-200 bg-sky-50',
    softClass: 'from-sky-100 to-white',
  },
  comprehension: {
    label: 'Thông hiểu',
    shortLabel: 'TH',
    description: 'Kiểm tra khả năng diễn giải và hiểu ý nghĩa của kiến thức.',
    accentClass: 'text-emerald-700 border-emerald-200 bg-emerald-50',
    softClass: 'from-emerald-100 to-white',
  },
  application_basic: {
    label: 'Vận dụng thấp',
    shortLabel: 'VD1',
    description: 'Áp dụng kiến thức vào tình huống quen thuộc và bài tập cơ bản.',
    accentClass: 'text-amber-700 border-amber-200 bg-amber-50',
    softClass: 'from-amber-100 to-white',
  },
  application_advanced: {
    label: 'Vận dụng cao',
    shortLabel: 'VD2',
    description: 'Tình huống nâng cao, cần tổng hợp thông tin và suy luận.',
    accentClass: 'text-rose-700 border-rose-200 bg-rose-50',
    softClass: 'from-rose-100 to-white',
  },
};

export function getBandMeta(band: DifficultyBand) {
  return GAME_DIFFICULTY_BAND_META[band];
}

export function getQuestionCountForBand(gamePackage: GamePackage | null | undefined, band: DifficultyBand) {
  return gamePackage?.question_stats?.by_difficulty_band?.[band]
    ?? gamePackage?.question_stats_by_difficulty?.[band]
    ?? 0;
}

export function getQuestionPlanPreview(gamePackage: GamePackage | null | undefined) {
  return gamePackage?.question_stats?.question_plan_preview ?? null;
}

export function getLevelDistributionLabel(gamePackage: GamePackage | null | undefined) {
  const preview = getQuestionPlanPreview(gamePackage);
  const levels = preview?.questions_per_level ?? [];
  if (levels.length === 0) return 'Chưa cấu hình phân phối câu hỏi';
  return levels.join(' - ');
}

export function getDistributionModeLabel(mode: string | null | undefined) {
  return mode === 'random' ? 'Ngẫu nhiên' : 'Tăng dần độ khó';
}

export function getAttemptMetric(
  totals: PackageAttemptTotals | null | undefined,
  keys: string[],
) {
  if (!totals) return null;

  for (const key of keys) {
    const value = totals[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

export function getAttemptProgressPercent(totals: PackageAttemptTotals | null | undefined) {
  const explicit = getAttemptMetric(totals, ['progress_percent', 'progressPercent']);
  if (explicit != null) {
    return Math.max(0, Math.min(100, explicit));
  }

  const answered = getAttemptMetric(totals, ['questions_answered', 'answered_count']);
  const total = getAttemptMetric(totals, ['questions_total', 'questions_presented', 'total_questions']);
  if (!answered || !total) return 0;
  return Math.max(0, Math.min(100, (answered / total) * 100));
}

export function prettyPrintJson(value: Record<string, unknown> | null | undefined) {
  if (!value || Object.keys(value).length === 0) {
    return '';
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '';
  }
}

export function parseJsonInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return { parsed: null as Record<string, unknown> | null, error: null as string | null };
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { parsed: null, error: 'Runtime config phải là một JSON object.' };
    }

    return { parsed: parsed as Record<string, unknown>, error: null };
  } catch {
    return { parsed: null, error: 'Runtime config không phải JSON hợp lệ.' };
  }
}

export function resolveGameModule(
  playBundle: GamePackagePlayResponse | null,
  startBundle: GameStartAttemptResponse | null,
) {
  return startBundle?.module
    ?? playBundle?.module
    ?? playBundle?.package.game_module
    ?? null;
}

export function resolveManifestUrl(
  playBundle: GamePackagePlayResponse | null,
  startBundle: GameStartAttemptResponse | null,
  module: GameModuleRegistryEntry | null,
) {
  return startBundle?.manifest_url
    ?? playBundle?.manifest_url
    ?? module?.manifest_url
    ?? null;
}

export function resolveRuntimeConfig(
  playBundle: GamePackagePlayResponse | null,
  startBundle: GameStartAttemptResponse | null,
) {
  return startBundle?.runtime_config
    ?? playBundle?.runtime_config
    ?? playBundle?.package.runtime_config
    ?? null;
}

export function resolveGameEntry(
  manifest: GameManifest | null,
  playBundle: GamePackagePlayResponse | null,
  startBundle: GameStartAttemptResponse | null,
) {
  return startBundle?.entry ?? playBundle?.entry ?? manifest?.entry ?? null;
}
