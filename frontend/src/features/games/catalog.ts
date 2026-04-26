import type { GameManifest } from '@/features/games/types';
import { isGameManifest } from '@/features/games/types';

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(`Khong the tai du lieu tu ${url}`);
  }
  return response.json() as Promise<T>;
}

function resolveAssetUrl(baseUrl: string, value?: string) {
  if (!value) return value;

  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

export async function loadGameManifest(manifestUrl: string): Promise<GameManifest> {
  const rawManifest = await fetchJson<unknown>(manifestUrl);
  if (!isGameManifest(rawManifest)) {
    throw new Error(`Manifest cua game tai ${manifestUrl} khong hop le`);
  }

  return {
    ...rawManifest,
    entry: resolveAssetUrl(manifestUrl, rawManifest.entry) || rawManifest.entry,
    thumbnail: resolveAssetUrl(manifestUrl, rawManifest.thumbnail),
  };
}
