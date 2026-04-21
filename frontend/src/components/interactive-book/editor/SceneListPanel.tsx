import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import type { InteractiveBookManifest, InteractiveScene } from '@/types';
import {
  getSceneReadiness,
  inferSceneImage,
  sceneTypeMeta,
  summarizeScene,
} from '@/utils/interactiveBookEditorHelpers';

interface SceneListPanelProps {
  manifest: InteractiveBookManifest;
  selectedSceneId: string;
  readOnly?: boolean;
  draggingSceneId?: string | null;
  onDraggingSceneIdChange?: (sceneId: string | null) => void;
  onSelectScene: (sceneId: string) => void;
  onReorderScene?: (draggedId: string, targetId: string) => void;
  onRenameScene?: (sceneId: string, title: string) => void;
  onDuplicateScene?: (sceneId: string) => void;
  flowBlockingSceneIds?: Set<string>;
  flowWarningSceneIds?: Set<string>;
  inlineRename?: boolean;
  emptyHint?: string;
}

function readinessMeta(scene: InteractiveScene, manifest: InteractiveBookManifest, flowBlockingSceneIds?: Set<string>, flowWarningSceneIds?: Set<string>) {
  const fakeFlowValidation = {
    blockingErrors: flowBlockingSceneIds?.has(scene.id) ? [{ id: scene.id, severity: 'blocking', code: 'ui', message: 'blocking', sceneId: scene.id }] : [],
    warnings: flowWarningSceneIds?.has(scene.id) ? [{ id: scene.id, severity: 'warning', code: 'ui', message: 'warning', sceneId: scene.id }] : [],
    nodes: [],
    edges: [],
    reachableSceneIds: [],
    completionReachable: false,
  } as const;
  const readiness = getSceneReadiness(scene, manifest, fakeFlowValidation as never);
  const badgeVariant: 'mint' | 'yellow' | 'gray' = readiness.tone === 'ready'
    ? 'mint'
    : readiness.tone === 'needs_attention'
      ? 'yellow'
      : 'gray';
  return { readiness, badgeVariant };
}

export default function SceneListPanel({
  manifest,
  selectedSceneId,
  readOnly,
  draggingSceneId,
  onDraggingSceneIdChange,
  onSelectScene,
  onReorderScene,
  onRenameScene,
  onDuplicateScene,
  flowBlockingSceneIds,
  flowWarningSceneIds,
  inlineRename,
  emptyHint,
}: SceneListPanelProps) {
  if (manifest.scenes.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-500">
        {emptyHint ?? 'Chưa có cảnh nào. Hãy thêm cảnh đầu tiên để bắt đầu.'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {manifest.scenes.map((scene, index) => {
        const meta = sceneTypeMeta(scene.type);
        const active = scene.id === selectedSceneId;
        const dragging = draggingSceneId === scene.id;
        const { readiness, badgeVariant } = readinessMeta(scene, manifest, flowBlockingSceneIds, flowWarningSceneIds);
        const previewImage = inferSceneImage(scene);

        return (
          <div
            key={scene.id}
            draggable={Boolean(!readOnly && onReorderScene)}
            onDragStart={() => onDraggingSceneIdChange?.(scene.id)}
            onDragOver={(event) => {
              if (!onReorderScene || readOnly) return;
              event.preventDefault();
            }}
            onDragEnd={() => onDraggingSceneIdChange?.(null)}
            onDrop={(event) => {
              if (!onReorderScene || readOnly) return;
              event.preventDefault();
              if (draggingSceneId) {
                onReorderScene(draggingSceneId, scene.id);
              }
              onDraggingSceneIdChange?.(null);
            }}
            className={`rounded-3xl border px-4 py-4 transition ${active ? 'border-sky-300 bg-sky-50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'} ${dragging ? 'opacity-60' : ''}`}
          >
            <div className="flex items-start justify-between gap-3">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelectScene(scene.id)}>
                <div className="flex items-center justify-between gap-3">
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                  <span className="text-xs font-medium text-slate-400">#{index + 1}</span>
                </div>

                {inlineRename && active && onRenameScene && !readOnly ? (
                  <input
                    value={scene.title ?? ''}
                    onChange={(event) => onRenameScene(scene.id, event.target.value)}
                    className="mt-3 w-full rounded-2xl border border-sky-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200"
                    placeholder={`Cảnh ${index + 1}`}
                  />
                ) : (
                  <p className="mt-3 font-semibold text-slate-900">{scene.title || `Cảnh ${index + 1}`}</p>
                )}

                <p className="mt-1 text-sm leading-6 text-slate-500">{summarizeScene(scene)}</p>

                {previewImage && (
                  <img
                    src={previewImage}
                    alt={scene.title || scene.id}
                    className="mt-3 h-24 w-full rounded-2xl border border-slate-200 object-cover"
                  />
                )}
              </button>

              <div className="flex shrink-0 flex-col items-end gap-2">
                <Badge variant={badgeVariant}>{readiness.label}</Badge>
                {onDuplicateScene && !readOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onDuplicateScene(scene.id)}
                  >
                    Nhân bản
                  </Button>
                )}
              </div>
            </div>

            {active && readiness.details.length > 0 && (
              <div className="mt-3 rounded-2xl bg-white/80 px-3 py-3 text-xs text-amber-900">
                {readiness.details.slice(0, 2).map((detail) => (
                  <p key={detail}>{detail}</p>
                ))}
                {readiness.details.length > 2 && (
                  <p className="mt-1 text-slate-500">+{readiness.details.length - 2} lưu ý khác.</p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
