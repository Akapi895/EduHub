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
): boolean {
  if (!frame?.contentWindow) {
    console.error('[postHostCommand] FAILED: No frame or contentWindow available', {
      type,
      hasFrame: !!frame,
      hasContentWindow: !!(frame?.contentWindow),
      timestamp: new Date().toISOString(),
    });
    return false;
  }
  
  const envelope = buildHostCommand(type, game, payload);
  const targetOrigin = resolveGameTargetOrigin(game);
  
  try {
    frame.contentWindow.postMessage(envelope, targetOrigin);
    console.info('[postHostCommand] SUCCESS:', type, {
      targetOrigin,
      payloadKeys: Object.keys(payload),
      timestamp: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    console.error('[postHostCommand] EXCEPTION while sending:', type, error);
    return false;
  }
}

// HIGH-2: Wrapper với callback để handle thành công/thất bại
export interface PostHostCommandOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
}

export function postHostCommandWithAck(
  frame: HTMLIFrameElement | null,
  game: GameManifest,
  type: GameHostCommandType,
  payload: GameHostCommandPayload,
  options: PostHostCommandOptions = {},
): boolean {
  const { onSuccess, onError, timeout = 5000 } = options;
  
  const success = postHostCommand(frame, game, type, payload);
  
  if (!success) {
    if (onError) {
      onError(new Error('postHostCommand: frame or contentWindow unavailable'));
    }
    return false;
  }
  
  // Call success callback
  if (onSuccess) {
    onSuccess();
  }
  
  return true;
}
