import type {
  GameCatalogIndex,
  GameCatalogIndexEntry,
  GameManifest,
} from '@/features/games/types';
import { isGameManifest } from '@/features/games/types';

const configuredCatalogUrl = import.meta.env.VITE_GAME_CATALOG_URL?.trim();
const GAME_CATALOG_URL = configuredCatalogUrl || '/game-modules/catalog.json';

let catalogPromise: Promise<GameManifest[]> | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(`Khong the tai du lieu tu ${url}`);
  }
  return response.json() as Promise<T>;
}

async function loadGameManifest(entry: GameCatalogIndexEntry): Promise<GameManifest> {
  const rawManifest = await fetchJson<unknown>(entry.manifest);
  if (!isGameManifest(rawManifest)) {
    throw new Error(`Manifest cua game ${entry.slug} khong hop le`);
  }
  return {
    ...rawManifest,
    slug: rawManifest.slug || entry.slug,
    featured: entry.featured ?? rawManifest.featured ?? false,
  };
}

export async function loadGameCatalog(force = false): Promise<GameManifest[]> {
  if (!catalogPromise || force) {
    catalogPromise = fetchJson<GameCatalogIndex>(GAME_CATALOG_URL).then(async (index) => {
      const manifests = await Promise.all(index.games.map((entry) => loadGameManifest(entry)));
      return manifests.sort((left, right) => Number(right.featured) - Number(left.featured));
    });
  }

  return catalogPromise;
}

export async function loadGameBySlug(slug: string): Promise<GameManifest | null> {
  const catalog = await loadGameCatalog();
  return catalog.find((game) => game.slug === slug) ?? null;
}
