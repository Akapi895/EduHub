import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Maximize2,
  PauseCircle,
  PlayCircle,
  RefreshCcw,
  Sparkles,
  Trophy,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import Button from '@/components/common/Button';
import {
  createSessionId,
  postHostCommand,
} from '@/features/games/bridge';
import type {
  GameBridgeEnvelope,
  GameManifest,
  GameRuntimeStatus,
} from '@/features/games/types';
import { isGameBridgeEnvelope } from '@/features/games/types';

interface GamePlayerShellProps {
  game: GameManifest;
}

function formatScalarValue(value: unknown) {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toString() : value.toFixed(2);
  }
  if (typeof value === 'boolean') {
    return value ? 'Có' : 'Không';
  }
  if (typeof value === 'string') {
    return value;
  }
  return '-';
}

function getRuntimeStatusLabel(status: GameRuntimeStatus) {
  switch (status) {
    case 'booting':
      return 'Đang khởi động';
    case 'ready':
      return 'Sẵn sàng';
    case 'running':
      return 'Đang chơi';
    case 'paused':
      return 'Đã tạm dừng';
    case 'completed':
      return 'Đã kết thúc';
    case 'error':
      return 'Có lỗi';
    default:
      return status;
  }
}

function getOutcomeLabel(value: unknown) {
  if (value === 'failed') return 'Chưa vượt qua';
  if (value === 'completed' || value === 'success') return 'Hoàn thành';
  return 'Đang chơi';
}

export default function GamePlayerShell({ game }: GamePlayerShellProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [sessionId, setSessionId] = useState(() => createSessionId());
  const [sessionKey, setSessionKey] = useState(0);
  const [runtimeStatus, setRuntimeStatus] = useState<GameRuntimeStatus>('booting');
  const [runtimeSnapshot, setRuntimeSnapshot] = useState<Record<string, unknown>>({});

  const aspectRatio = game.runtime?.aspect_ratio || '16 / 9';
  const sandboxPolicy = game.runtime?.sandbox || 'allow-scripts allow-same-origin';
  const allowPolicy = game.runtime?.allow || 'fullscreen';

  const sendHostCommand = (
    type: 'host:init' | 'host:pause' | 'host:resume' | 'host:restart' | 'host:ping',
    reason: string,
  ) => {
    postHostCommand(frameRef.current, game, type, {
      sessionId,
      route: window.location.pathname,
      issuedAt: new Date().toISOString(),
      reason,
    });
  };

  useEffect(() => {
    setRuntimeStatus('booting');
    setRuntimeSnapshot({});
  }, [sessionKey]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow) return;
      if (!isGameBridgeEnvelope(event.data)) return;
      const message = event.data as GameBridgeEnvelope;

      if (message.type === 'game:ready') {
        setRuntimeStatus('ready');
        setRuntimeSnapshot((current) => ({ ...current, ...(message.payload ?? {}) }));
        sendHostCommand('host:init', 'bridge-ready');
        return;
      }

      if (message.type === 'game:state' || message.type === 'game:progress') {
        setRuntimeStatus(
          message.type === 'game:progress'
            ? 'running'
            : ((message.payload?.status as GameRuntimeStatus) || 'running'),
        );
        setRuntimeSnapshot((current) => ({ ...current, ...(message.payload ?? {}) }));
        return;
      }

      if (message.type === 'game:complete') {
        setRuntimeStatus('completed');
        setRuntimeSnapshot((current) => ({ ...current, ...(message.payload ?? {}) }));
        return;
      }

      if (message.type === 'game:error') {
        setRuntimeStatus('error');
        setRuntimeSnapshot((current) => ({ ...current, ...(message.payload ?? {}) }));
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [game, sessionId]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden) {
        setRuntimeStatus((current) => (current === 'completed' || current === 'error' ? current : 'paused'));
        sendHostCommand('host:pause', 'document-hidden');
        return;
      }

      setRuntimeStatus((current) => (current === 'completed' || current === 'error' ? current : 'running'));
      sendHostCommand('host:resume', 'document-visible');
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [sessionId]);

  const facts = useMemo(() => ([
    { label: 'Trạng thái', value: getRuntimeStatusLabel((runtimeSnapshot.status as GameRuntimeStatus) ?? runtimeStatus) },
    { label: 'Điểm hiện tại', value: runtimeSnapshot.score ?? 0 },
    { label: 'Màn chơi', value: runtimeSnapshot.level ?? 1 },
    { label: 'Mục tiêu', value: runtimeSnapshot.targetScore ?? '-' },
    { label: 'Thời gian', value: runtimeSnapshot.timeRemaining ?? '-' },
  ]), [runtimeSnapshot, runtimeStatus]);

  const outcomeLabel = useMemo(
    () => getOutcomeLabel(runtimeSnapshot.outcome),
    [runtimeSnapshot.outcome],
  );

  const handleRestart = () => {
    sendHostCommand('host:restart', 'host-restart');
    setSessionId(createSessionId());
    setSessionKey((current) => current + 1);
  };

  const handleTogglePause = () => {
    if (runtimeStatus === 'paused') {
      setRuntimeStatus('running');
      sendHostCommand('host:resume', 'host-toggle');
      return;
    }
    if (runtimeStatus === 'completed' || runtimeStatus === 'error') return;
    setRuntimeStatus('paused');
    sendHostCommand('host:pause', 'host-toggle');
  };

  const handleFullscreen = async () => {
    if (!viewportRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    await viewportRef.current.requestFullscreen();
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.22),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,233,0.18),_transparent_26%),linear-gradient(180deg,#f8fafc_0%,#f1f5f9_55%,#e2e8f0_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(248,250,252,0.95))] shadow-[0_30px_90px_rgba(15,23,42,0.12)]">
          <div className="flex flex-col gap-6 px-6 py-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
            <div className="max-w-3xl space-y-4">
              <Link to="/student/games" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">
                <ArrowLeft className="h-4 w-4" />
                Quay lại danh sách trò chơi
              </Link>

              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/45 bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Chế độ chơi tập trung
                </div>
                <div>
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">{game.title}</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                    {game.short_description || game.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(game.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={handleTogglePause}
                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              >
                {runtimeStatus === 'paused' ? (
                  <>
                    <PlayCircle className="mr-1.5 h-4 w-4" />
                    Tiếp tục
                  </>
                ) : (
                  <>
                    <PauseCircle className="mr-1.5 h-4 w-4" />
                    Tạm dừng
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleRestart}
                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900"
              >
                <RefreshCcw className="mr-1.5 h-4 w-4" />
                Chơi lại
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleFullscreen}
                className="border-sky-300/60 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800"
              >
                <Maximize2 className="mr-1.5 h-4 w-4" />
                Toàn màn hình
              </Button>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Trophy className="h-3.5 w-3.5" />
                {outcomeLabel}
              </div>
            </div>
          </div>
        </header>

        <div className="mt-6 grid flex-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <section className="min-w-0">
            <div
              ref={viewportRef}
              className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.14)]"
            >
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 text-sm text-slate-600">
                Hãy tập trung chơi game và hoàn thành mục tiêu trước khi hết giờ.
              </div>
              <div className="relative w-full bg-black" style={{ aspectRatio }}>
                <iframe
                  key={`${game.slug}-${sessionKey}`}
                  ref={frameRef}
                  title={game.title}
                  src={game.entry}
                  className="h-full w-full border-0"
                  sandbox={sandboxPolicy}
                  allow={allowPolicy}
                  onLoad={() => {
                    setRuntimeStatus('booting');
                    sendHostCommand('host:init', 'iframe-load');
                  }}
                />
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
                <Trophy className="h-4 w-4 text-amber-500" />
                Bảng tiến trình
              </div>
              <div className="mt-4 space-y-3">
                {facts.map((fact, index) => (
                  <div
                    key={fact.label}
                    className={`rounded-2xl border px-4 py-3 text-sm ${
                      index === 0
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className={`${index === 0 ? 'text-emerald-700' : 'text-slate-500'}`}>{fact.label}</span>
                      <span className="font-semibold text-slate-900">{formatScalarValue(fact.value)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.1)]">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">
                <BookOpen className="h-4 w-4 text-sky-500" />
                Hướng dẫn chơi
              </div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                {(game.instructions ?? []).map((instruction) => (
                  <div key={instruction} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    {instruction}
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-sky-50 px-4 py-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-900">Mẹo nhỏ</p>
                <p className="mt-1 leading-6 text-slate-600">
                  Nếu muốn tập trung hơn, hãy dùng chế độ toàn màn hình trước khi bắt đầu kéo móc.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
