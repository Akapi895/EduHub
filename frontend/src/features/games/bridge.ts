import type {
  GameBridgeEnvelope,
  GameHostCommandPayload,
  GameHostCommandType,
  GameManifest,
} from '@/features/games/types';
import { EDUHUB_GAME_CHANNEL } from '@/features/games/types';

export function createSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `game-session-${Date.now()}`;
}

export function buildHostCommand(
  type: GameHostCommandType,
  game: GameManifest,
  payload: GameHostCommandPayload,
): GameBridgeEnvelope<GameHostCommandType, GameHostCommandPayload> {
  return {
    channel: EDUHUB_GAME_CHANNEL,
    type,
    gameId: game.id,
    timestamp: new Date().toISOString(),
    payload,
  };
}

export function resolveGameTargetOrigin(game: GameManifest) {
  if (game.runtime?.target_origin) {
    return game.runtime.target_origin;
  }

  try {
    return new URL(game.entry, window.location.origin).origin;
  } catch {
    return '*';
  }
}

export function postHostCommand(
  frame: HTMLIFrameElement | null,
  game: GameManifest,
  type: GameHostCommandType,
  payload: GameHostCommandPayload,
) {
  if (!frame?.contentWindow) return;
  frame.contentWindow.postMessage(
    buildHostCommand(type, game, payload),
    resolveGameTargetOrigin(game),
  );
}
