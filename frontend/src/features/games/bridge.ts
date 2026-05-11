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
  const sandboxTokens = (game.runtime?.sandbox ?? '')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  const usesOpaqueSandboxOrigin = sandboxTokens.length > 0 && !sandboxTokens.includes('allow-same-origin');

  if (usesOpaqueSandboxOrigin) {
    return '*';
  }

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
  if (!frame?.contentWindow) {
    console.warn('[postHostCommand] No frame or contentWindow');
    return;
  }
  const envelope = buildHostCommand(type, game, payload);
  console.info('[postHostCommand] Sending to iframe:', type, envelope);
  frame.contentWindow.postMessage(
    envelope,
    resolveGameTargetOrigin(game),
  );
}
