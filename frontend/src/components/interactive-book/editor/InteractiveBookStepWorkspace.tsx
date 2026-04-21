import { UploadCloud } from 'lucide-react';

import Button from '@/components/common/Button';
import type { InteractiveBookManifest, InteractiveScene } from '@/types';
import {
  getAssetTargetsForScene,
  isAssetCompatibleWithTarget,
  type AssetTargetKey,
  type UploadedAssetItem,
} from '@/utils/interactiveBookEditorHelpers';
import SceneEditorPanel from './SceneEditorPanel';
import SceneListPanel from './SceneListPanel';

interface InteractiveBookStepWorkspaceProps {
  previewManifest: InteractiveBookManifest;
  selectedScene: InteractiveScene | null;
  selectedSceneId: string;
  selectedLayerId: string | null;
  readOnly?: boolean;
  draggingSceneId?: string | null;
  uploadingAsset?: boolean;
  uploadingFieldKey: string | null;
  linkEditorByField: Record<string, boolean>;
  assetLibrary: UploadedAssetItem[];
  flowBlockingSceneIds: Set<string>;
  flowWarningSceneIds: Set<string>;
  onSelectedSceneChange: (sceneId: string) => void;
  onSelectedLayerChange: (layerId: string | null) => void;
  onDraggingSceneChange: (sceneId: string | null) => void;
  onReorderScenes: (draggedId: string, targetId: string) => void;
  onDuplicateScene: (sceneId: string) => void;
  onToggleLinkEditor: (fieldKey: string, visible: boolean) => void;
  onInlineUpload: (
    fieldKey: string,
    file: File,
    subDir: string,
    onUploaded: (url: string) => void,
  ) => Promise<void>;
  onUploadSceneAsset: (file: File) => Promise<void>;
  onApplyAssetToScene: (url: string, target: AssetTargetKey) => void;
  updateSelectedScene: (updater: (scene: InteractiveScene, manifest: InteractiveBookManifest) => void) => void;
  updateSelectedUnifiedMediaScene: (updater: (scene: InteractiveScene, manifest: InteractiveBookManifest) => void) => void;
  moveSelectedScene: (direction: -1 | 1) => void;
  removeSelectedScene: () => void;
}

export default function InteractiveBookStepWorkspace({
  previewManifest,
  selectedScene,
  selectedSceneId,
  selectedLayerId,
  readOnly,
  draggingSceneId,
  uploadingAsset,
  uploadingFieldKey,
  linkEditorByField,
  assetLibrary,
  flowBlockingSceneIds,
  flowWarningSceneIds,
  onSelectedSceneChange,
  onSelectedLayerChange,
  onDraggingSceneChange,
  onReorderScenes,
  onDuplicateScene,
  onToggleLinkEditor,
  onInlineUpload,
  onUploadSceneAsset,
  onApplyAssetToScene,
  updateSelectedScene,
  updateSelectedUnifiedMediaScene,
  moveSelectedScene,
  removeSelectedScene,
}: InteractiveBookStepWorkspaceProps) {
  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Soạn nội dung theo từng cảnh</h2>
            <p className="mt-1 text-sm text-slate-500">
              Chọn cảnh ở cột trái, soạn nội dung ở khung phải và dùng khay tư liệu ngay trong ngữ cảnh đó.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-slate-400">Đang chỉnh</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{selectedScene?.title || selectedScene?.id || 'Chưa chọn cảnh'}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Kéo thả để đổi thứ tự cảnh. Nếu chưa đặt thủ công đường chuyển tiếp, hệ thống sẽ mặc định đi tới cảnh đứng ngay sau nó trong danh sách này.
            </div>
            <SceneListPanel
              manifest={previewManifest}
              selectedSceneId={selectedSceneId}
              readOnly={readOnly}
              draggingSceneId={draggingSceneId}
              onDraggingSceneIdChange={onDraggingSceneChange}
              onSelectScene={onSelectedSceneChange}
              onReorderScene={onReorderScenes}
              onDuplicateScene={onDuplicateScene}
              flowBlockingSceneIds={flowBlockingSceneIds}
              flowWarningSceneIds={flowWarningSceneIds}
            />
          </div>

          <div className="space-y-6">
            <SceneEditorPanel
              previewManifest={previewManifest}
              selectedScene={selectedScene}
              selectedSceneId={selectedSceneId}
              selectedLayerId={selectedLayerId}
              readOnly={readOnly}
              uploadingFieldKey={uploadingFieldKey}
              linkEditorByField={linkEditorByField}
              onSelectedLayerChange={onSelectedLayerChange}
              onToggleLinkEditor={onToggleLinkEditor}
              onInlineUpload={onInlineUpload}
              updateSelectedScene={updateSelectedScene}
              updateSelectedUnifiedMediaScene={updateSelectedUnifiedMediaScene}
              moveSelectedScene={moveSelectedScene}
              removeSelectedScene={removeSelectedScene}
            />

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Tư liệu của cảnh hiện tại</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Tải ảnh, âm thanh hoặc video và gán ngay vào cảnh đang soạn.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {selectedScene && (
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                    Đang biên soạn cảnh: <strong>{selectedScene.title || selectedScene.id}</strong>. Các nút bên dưới sẽ gắn tư liệu trực tiếp vào cảnh này.
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex cursor-pointer items-center rounded-button border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <UploadCloud className="mr-2 h-4 w-4" />
                    {uploadingAsset ? 'Đang tải tư liệu...' : 'Tải tư liệu cho cảnh'}
                    <input
                      type="file"
                      className="hidden"
                      disabled={readOnly || uploadingAsset}
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        await onUploadSceneAsset(file);
                        event.target.value = '';
                      }}
                    />
                  </label>
                </div>

                {assetLibrary.length > 0 ? (
                  <div className="space-y-2">
                    {assetLibrary.map((asset) => (
                      <div key={asset.url} className="rounded-2xl border border-slate-200 px-3 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{asset.name}</p>
                            <p className="text-xs text-slate-500">Tệp đã tải lên và sẵn sàng gắn vào cảnh hiện tại.</p>
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {asset.kind}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {getAssetTargetsForScene(selectedScene)
                            .filter((target) => isAssetCompatibleWithTarget(asset.kind, target.key))
                            .map((target) => (
                              <Button
                                key={`${asset.url}-${target.key}`}
                                type="button"
                                variant="secondary"
                                size="sm"
                                disabled={readOnly || !selectedScene}
                                onClick={() => onApplyAssetToScene(asset.url, target.key)}
                              >
                                {target.label}
                              </Button>
                            ))}
                          {getAssetTargetsForScene(selectedScene)
                            .filter((target) => isAssetCompatibleWithTarget(asset.kind, target.key))
                            .length === 0 && (
                              <p className="text-xs text-slate-500">
                                Tệp này không phù hợp với các vị trí gắn của cảnh hiện tại.
                              </p>
                            )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    Chưa có tư liệu nào trong khay này. Tải file lên để dùng ngay cho cảnh đang chỉnh.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
