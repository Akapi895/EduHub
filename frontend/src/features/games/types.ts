export const EDUHUB_GAME_CHANNEL = 'eduhub:game-bridge';

export type GameBridgeCapability =
  | 'ready'
  | 'state'
  | 'progress'
  | 'question-trigger'
  | 'answer-submitted'
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

export interface GameManifest {
  id: string;
  slug: string;
  title: string;
  description: string;
  short_description?: string;
  thumbnail?: string;
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

export interface GameQuestionTriggerPayload {
  triggerType: string;
  triggerKey: string;
  triggerValue: string;
  eventPayload?: Record<string, unknown>;
}

export interface GameAnswerSubmittedPayload {
  attemptId: string;
  answer: unknown;
  questionType?: string;
}

export interface GameHostCommandPayload {
  sessionId: string;
  attemptId?: string;
  packageId?: string;
  route?: string;
  issuedAt: string;
  reason?: string;
  runtimeConfig?: Record<string, unknown> | null;
  questionResult?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export type GameHostCommandType =
  | 'host:init'
  | 'host:pause'
  | 'host:resume'
  | 'host:restart'
  | 'host:ping';

export type GameBridgeMessageType =
  | 'game:ready'
  | 'game:state'
  | 'game:progress'
  | 'game:question-trigger'
  | 'game:answer-submitted'
  | 'game:complete'
  | 'game:error';

export function isGameManifest(value: unknown): value is GameManifest {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string'
    && typeof candidate.slug === 'string'
    && typeof candidate.title === 'string'
    && typeof candidate.description === 'string'
    && typeof candidate.entry === 'string'
  );
}

export function isGameBridgeEnvelope(value: unknown): value is GameBridgeEnvelope {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  // MEDIUM-6: Improved validation - check for required fields
  if (candidate.channel !== EDUHUB_GAME_CHANNEL) return false;
  if (typeof candidate.type !== 'string') return false;
  // Accept any message type - let downstream handle unknown types
  // This is more flexible and allows future message types
  return true;
}
