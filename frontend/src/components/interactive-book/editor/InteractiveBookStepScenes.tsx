import { ArrowUpDown, Plus } from 'lucide-react';

import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import type { InteractiveBookManifest, InteractiveSceneType } from '@/types';
import type { SceneMetaOption } from '@/utils/interactiveBookEditorHelpers';
import SceneListPanel from './SceneListPanel';

interface SceneTypeCount {
  type: InteractiveSceneType;
  count: number;
  label: string;
  variant: 'blue' | 'purple' | 'mint' | 'yellow' | 'pink' | 'gray';
}

interface InteractiveBookStepScenesProps {
  previewManifest: InteractiveBookManifest;
  selectedSceneId: string;
  readOnly?: boolean;
  draggingSceneId?: string | null;
  newSceneType: InteractiveSceneType;
  availableSceneTypes: SceneMetaOption[];
  sceneTypeCounts: SceneTypeCount[];
  flowBlockingSceneIds: Set<string>;
  flowWarningSceneIds: Set<string>;
  onSelectedSceneChange: (sceneId: string) => void;
  onDraggingSceneChange: (sceneId: string | null) => void;
  onNewSceneTypeChange: (sceneType: InteractiveSceneType) => void;
  onAddScene: (sceneType: InteractiveSceneType) => void;
  onReorderScenes: (draggedId: string, targetId: string) => void;
  onDuplicateScene: (sceneId: string) => void;
  onRenameScene: (sceneId: string, title: string) => void;
  onEntrySceneChange: (sceneId: string) => void;
}

export default function InteractiveBookStepScenes({
  previewManifest,
  selectedSceneId,
  readOnly,
  draggingSceneId,
  newSceneType,
  availableSceneTypes,
  sceneTypeCounts,
  flowBlockingSceneIds,
  flowWarningSceneIds,
  onSelectedSceneChange,
  onDraggingSceneChange,
  onNewSceneTypeChange,
  onAddScene,
  onReorderScenes,
  onDuplicateScene,
  onRenameScene,
  onEntrySceneChange,
}: InteractiveBookStepScenesProps) {
  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Dàn cảnh của bài học</h2>
            <p className="mt-1 text-sm text-slate-500">
              Sắp khung bài học trước khi soạn sâu. Giáo viên có thể kéo thả để đổi thứ tự và chọn cảnh bắt đầu.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <ArrowUpDown className="h-4 w-4 text-slate-400" />
            {previewManifest.scenes.length} cảnh
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Cảnh bắt đầu</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{previewManifest.entry_scene_id}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Tổng số cảnh</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{previewManifest.scenes.length}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Loại cảnh</p>
            <p className="mt-1 flex flex-wrap gap-1.5">
              {sceneTypeCounts.map((item) => (
                <Badge key={item.type} variant={item.variant}>
                  {item.label}: {item.count}
                </Badge>
              ))}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <label className="mb-1 block text-sm font-medium text-slate-700">Cảnh bắt đầu của sách</label>
              <select
                value={previewManifest.entry_scene_id}
                disabled={readOnly}
                onChange={(event) => onEntrySceneChange(event.target.value)}
                className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
              >
                {previewManifest.scenes.map((scene) => (
                  <option key={scene.id} value={scene.id}>
                    {scene.title || scene.id}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">
                Không bắt buộc phải đi từ trang tổng quan. Giáo viên có thể chọn bất kỳ cảnh nào làm điểm vào.
              </p>
            </div>

            {!readOnly && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Thêm cảnh mới</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  Chọn loại cảnh mà bài học này thật sự cần. Không bắt buộc phải có đủ mọi loại cảnh.
                </p>
                <div className="mt-4 space-y-3">
                  <select
                    value={newSceneType}
                    onChange={(event) => onNewSceneTypeChange(event.target.value as InteractiveSceneType)}
                    className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
                  >
                    {availableSceneTypes.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    className="w-full"
                    variant="secondary"
                    onClick={() => onAddScene(newSceneType)}
                  >
                    <Plus className="mr-1.5 h-4 w-4" /> Thêm cảnh theo loại đã chọn
                  </Button>
                </div>
              </div>
            )}
          </div>

          <SceneListPanel
            manifest={previewManifest}
            selectedSceneId={selectedSceneId}
            readOnly={readOnly}
            draggingSceneId={draggingSceneId}
            onDraggingSceneIdChange={onDraggingSceneChange}
            onSelectScene={onSelectedSceneChange}
            onReorderScene={onReorderScenes}
            onRenameScene={onRenameScene}
            onDuplicateScene={onDuplicateScene}
            flowBlockingSceneIds={flowBlockingSceneIds}
            flowWarningSceneIds={flowWarningSceneIds}
            inlineRename
            emptyHint="Chưa có cảnh nào trong dàn bài."
          />
        </div>
      </div>
    </section>
  );
}
