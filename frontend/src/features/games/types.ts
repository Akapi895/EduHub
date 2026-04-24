export const EDUHUB_GAME_CHANNEL = 'eduhub:game-bridge';

export type GameBridgeCapability =
  | 'ready'
  | 'state'
  | 'progress'
  | 'complete'
  | 'error'
  | 'pause'
  | 'resume'
  | 'restart';

export type GameRuntimeStatus =
  | 'booting'
  | 'ready'
  | 'running'
  | 'paused'
  | 'completed'
  | 'error';

export interface GameCatalogIndexEntry {
  slug: string;
  manifest: string;
  featured?: boolean;
}

export interface GameCatalogIndex {
  games: GameCatalogIndexEntry[];
}

export interface GameManifest {
  id: string;
  slug: string;
  title: string;
  description: string;
  short_description?: string;
  thumbnail: string;
  entry: string;
  tags?: string[];
  instructions?: string[];
  featured?: boolean;
  runtime?: {
    kind?: 'iframe';
    sandbox?: string;
    allow?: string;
    aspect_ratio?: string;
    target_origin?: string;
  };
  bridge?: {
    enabled?: boolean;
    version?: number;
    capabilities?: GameBridgeCapability[];
  };
}

export interface GameBridgeEnvelope<TType extends string = string, TPayload = Record<string, unknown>> {
  channel: typeof EDUHUB_GAME_CHANNEL;
  type: TType;
  gameId?: string;
  timestamp: string;
  payload?: TPayload;
}

export interface GameHostCommandPayload {
  sessionId: string;
  route?: string;
  issuedAt: string;
  reason?: string;
}

export type GameHostCommandType =
  | 'host:init'
  | 'host:pause'
  | 'host:resume'
  | 'host:restart'
  | 'host:ping';

export interface GameRuntimeEvent {
  id: string;
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export function isGameManifest(value: unknown): value is GameManifest {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string'
    && typeof candidate.slug === 'string'
    && typeof candidate.title === 'string'
    && typeof candidate.description === 'string'
    && typeof candidate.thumbnail === 'string'
    && typeof candidate.entry === 'string'
  );
}

export function isGameBridgeEnvelope(value: unknown): value is GameBridgeEnvelope {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return candidate.channel === EDUHUB_GAME_CHANNEL && typeof candidate.type === 'string';
}
