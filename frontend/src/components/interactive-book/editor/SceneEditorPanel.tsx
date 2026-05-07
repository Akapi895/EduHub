import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';

import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import SceneLayerCanvas from '@/components/interactive-book/SceneLayerCanvas';
import type {
  InteractiveBookManifest,
  InteractiveChoice,
  InteractiveInteraction,
  InteractiveLayer,
  InteractiveScene,
} from '@/types';
import { FRIENDLY_INTERACTIVE_BOOK_LABELS } from '@/utils/interactiveBookEditorLabels';
import {
  createDefaultLayer,
  disableQuestionInteraction,
  ensureContentRecord,
  ensureInteractions,
  ensureQuestionInteraction,
  getBackgroundAudioTrigger,
  getBooleanFromContent,
  getConnectDotsPoints,
  getImplicitNextSceneId,
  getQuestionInteraction,
  getSceneLayers,
  getSceneMediaKind,
  getSceneNext,
  getSceneText,
  getStringFromContent,
  getStringListFromContent,
  inferSceneImage,
  isQuestionEnabled,
  isUnifiedMediaScene,
  sceneTypeMeta,
  setSceneLayers,
  summarizeVisibilityRule,
  type BackgroundAudioTrigger,
} from '@/utils/interactiveBookEditorHelpers';
import MediaFieldCard from './MediaFieldCard';

type SceneUpdater = (scene: InteractiveScene, manifest: InteractiveBookManifest) => void;
type SceneEditorTabKey = 'content' | 'interactions' | 'presentation' | 'timeline_cards' | 'points' | 'completion' | 'playback';

interface SceneEditorPanelProps {
  previewManifest: InteractiveBookManifest;
  selectedScene: InteractiveScene | null;
  selectedSceneId: string;
  selectedLayerId: string | null;
  readOnly?: boolean;
  uploadingFieldKey: string | null;
  linkEditorByField: Record<string, boolean>;
  onSelectedLayerChange: (layerId: string | null) => void;
  onToggleLinkEditor: (fieldKey: string, visible: boolean) => void;
  onInlineUpload: (
    fieldKey: string,
    file: File,
    subDir: string,
    onUploaded: (url: string) => void,
  ) => Promise<void>;
  updateSelectedScene: (updater: SceneUpdater) => void;
  updateSelectedUnifiedMediaScene: (updater: SceneUpdater) => void;
  moveSelectedScene: (direction: -1 | 1) => void;
  removeSelectedScene: () => void;
}

interface TabDefinition {
  key: SceneEditorTabKey;
  label: string;
}

function getTabsForScene(scene: InteractiveScene | null): TabDefinition[] {
  if (!scene) return [];
  if (scene.type === 'timeline') {
    return [
      { key: 'content', label: 'Nội dung chính' },
      { key: 'timeline_cards', label: 'Thẻ timeline' },
    ];
  }
  if (scene.type === 'connect_the_dots') {
    return [
      { key: 'content', label: 'Nội dung chính' },
      { key: 'points', label: 'Các điểm' },
      { key: 'presentation', label: 'Trình bày' },
      { key: 'completion', label: 'Hoàn thành' },
    ];
  }
  if (scene.type === 'slideshow') {
    return [
      { key: 'content', label: 'Nội dung chính' },
      { key: 'playback', label: 'Âm thanh & trình chiếu' },
      { key: 'presentation', label: 'Trình bày' },
    ];
  }
  if (isUnifiedMediaScene(scene)) {
    return [
      { key: 'content', label: 'Nội dung chính' },
      { key: 'interactions', label: 'Tương tác & câu hỏi' },
      { key: 'presentation', label: 'Trình bày' },
    ];
  }
  return [
    { key: 'content', label: 'Nội dung chính' },
    { key: 'presentation', label: 'Trình bày' },
  ];
}

function getDefaultTab(scene: InteractiveScene | null): SceneEditorTabKey {
  return getTabsForScene(scene)[0]?.key ?? 'content';
}

export default function SceneEditorPanel({
  previewManifest,
  selectedScene,
  selectedSceneId,
  selectedLayerId,
  readOnly,
  uploadingFieldKey,
  linkEditorByField,
  onSelectedLayerChange,
  onToggleLinkEditor,
  onInlineUpload,
  updateSelectedScene,
  updateSelectedUnifiedMediaScene,
  moveSelectedScene,
  removeSelectedScene,
}: SceneEditorPanelProps) {
  const [activeTab, setActiveTab] = useState<SceneEditorTabKey>('content');

  useEffect(() => {
    const nextDefaultTab = getDefaultTab(selectedScene);
    if (!getTabsForScene(selectedScene).some((tab) => tab.key === activeTab)) {
      setActiveTab(nextDefaultTab);
    }
  }, [activeTab, selectedScene]);

  const tabs = useMemo(() => getTabsForScene(selectedScene), [selectedScene]);

  const renderMediaField = ({
    fieldKey,
    label,
    url,
    accept,
    subDir,
    kind,
    description,
    disabled,
    onChange,
  }: {
    fieldKey: string;
    label: string;
    url: string;
    accept: string;
    subDir: string;
    kind: 'image' | 'video' | 'audio' | 'file';
    description?: string;
    disabled?: boolean;
    onChange: (url: string) => void;
  }) => (
    <MediaFieldCard
      label={label}
      url={url}
      accept={accept}
      kind={kind}
      description={description}
      disabled={disabled}
      uploading={uploadingFieldKey === fieldKey}
      showLinkEditor={Boolean(linkEditorByField[fieldKey])}
      onToggleLinkEditor={(visible) => onToggleLinkEditor(fieldKey, visible)}
      onUploadFile={async (file) => {
        await onInlineUpload(fieldKey, file, subDir, onChange);
      }}
      onChange={onChange}
    />
  );

  const renderChoiceEditor = (
    scene: InteractiveScene,
    interaction: InteractiveInteraction | null,
    emptyLabel: string,
  ) => {
    const choices = interaction?.choices ?? [];
    if (!interaction) {
      return (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
          {emptyLabel}
        </div>
      );
    }

    const updateChoice = (
      choiceId: string,
      updater: (choice: InteractiveChoice) => void,
    ) => {
      updateSelectedScene((currentScene) => {
        const interactions = ensureInteractions(currentScene);
        const targetInteraction = interactions.find((item) => item.id === interaction.id);
        if (!targetInteraction || !Array.isArray(targetInteraction.choices)) return;
        const targetChoice = targetInteraction.choices.find((item) => item.id === choiceId);
        if (!targetChoice) return;
        updater(targetChoice);
      });
    };

    const addChoice = () => {
      updateSelectedScene((currentScene) => {
        const interactions = ensureInteractions(currentScene);
        const targetInteraction = interactions.find((item) => item.id === interaction.id);
        if (!targetInteraction) return;
        if (!Array.isArray(targetInteraction.choices)) {
          targetInteraction.choices = [];
        }
        targetInteraction.choices.push({
          id: `choice-${targetInteraction.choices.length + 1}`,
          label: `Lựa chọn ${targetInteraction.choices.length + 1}`,
          is_correct: false,
          retry: true,
          feedback: '',
        });
      });
    };

    const removeChoice = (choiceId: string) => {
      updateSelectedScene((currentScene) => {
        const interactions = ensureInteractions(currentScene);
        const targetInteraction = interactions.find((item) => item.id === interaction.id);
        if (!targetInteraction || !Array.isArray(targetInteraction.choices)) return;
        targetInteraction.choices = targetInteraction.choices.filter((choice) => choice.id !== choiceId);
      });
    };

    return (
      <div className="space-y-3">
        {choices.map((choice, index) => (
          <div key={choice.id} className="rounded-3xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">Lựa chọn {index + 1}</p>
              {!readOnly && choices.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => removeChoice(choice.id)}>
                  Xóa
                </Button>
              )}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Nhãn hiển thị"
                value={choice.label}
                disabled={readOnly}
                onChange={(event) => updateChoice(choice.id, (draftChoice) => { draftChoice.label = event.target.value; })}
              />
              <Input
                label="Phản hồi ngắn"
                value={choice.feedback ?? ''}
                disabled={readOnly}
                onChange={(event) => updateChoice(choice.id, (draftChoice) => { draftChoice.feedback = event.target.value; })}
              />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">{FRIENDLY_INTERACTIVE_BOOK_LABELS.nextAction}</label>
                <select
                  value={choice.target_scene_id ?? ''}
                  disabled={readOnly}
                  onChange={(event) => updateChoice(choice.id, (draftChoice) => {
                    draftChoice.target_scene_id = event.target.value || undefined;
                  })}
                  className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
                >
                  <option value="">Giữ nguyên tại cảnh này</option>
                  {previewManifest.scenes
                    .filter((item) => item.id !== selectedSceneId)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title || item.id}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {renderMediaField({
                fieldKey: `${selectedSceneId}:${interaction.id}:${choice.id}:feedback-image`,
                label: 'Ảnh phản hồi',
                url: choice.feedback_image_url ?? '',
                accept: 'image/*',
                subDir: 'interactive-books',
                kind: 'image',
                description: 'Nếu tải ảnh ở đây, hệ thống sẽ hiển thị ảnh này sau khi học sinh chọn đáp án.',
                disabled: readOnly,
                onChange: (url) => updateChoice(choice.id, (draftChoice) => {
                  draftChoice.feedback_image_url = url || undefined;
                }),
              })}
              {renderMediaField({
                fieldKey: `${selectedSceneId}:${interaction.id}:${choice.id}:feedback-audio`,
                label: 'Âm thanh phản hồi',
                url: choice.feedback_audio_url ?? '',
                accept: 'audio/*',
                subDir: 'interactive-books',
                kind: 'audio',
                disabled: readOnly,
                onChange: (url) => updateChoice(choice.id, (draftChoice) => {
                  draftChoice.feedback_audio_url = url || undefined;
                }),
              })}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(choice.is_correct)}
                  disabled={readOnly}
                  onChange={(event) => updateChoice(choice.id, (draftChoice) => { draftChoice.is_correct = event.target.checked; })}
                />
                Đây là đáp án đúng
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(choice.retry)}
                  disabled={readOnly}
                  onChange={(event) => updateChoice(choice.id, (draftChoice) => { draftChoice.retry = event.target.checked; })}
                />
                Cho phép làm lại
              </label>
              <Input
                label="Điểm cộng"
                type="number"
                value={String(choice.score_delta ?? 0)}
                disabled={readOnly}
                onChange={(event) => updateChoice(choice.id, (draftChoice) => {
                  const nextValue = Number(event.target.value);
                  draftChoice.score_delta = Number.isFinite(nextValue) ? nextValue : 0;
                })}
              />
            </div>
          </div>
        ))}

        {!readOnly && (
          <Button type="button" variant="secondary" onClick={addChoice}>
            Thêm lựa chọn
          </Button>
        )}
      </div>
    );
  };

  const renderCanvasLayerEditor = (scene: InteractiveScene) => {
    const layers = getSceneLayers(scene);
    const selectedLayer = layers.find((layer) => layer.id === selectedLayerId) ?? null;
    const sceneChoices = (scene.interactions ?? []).flatMap((interaction) =>
      (interaction.choices ?? []).map((choice) => ({
        id: choice.id,
        label: `${interaction.prompt || interaction.id || 'Choice'} • ${choice.label}`,
      })),
    );

    const updateLayer = (layerId: string, updater: (layer: InteractiveLayer) => void) => {
      updateSelectedScene((currentScene) => {
        const nextLayers = getSceneLayers(currentScene).map((layer) => ({ ...layer, action: layer.action ? { ...layer.action } : undefined }));
        const targetLayer = nextLayers.find((layer) => layer.id === layerId);
        if (!targetLayer) return;
        updater(targetLayer);
        setSceneLayers(currentScene, nextLayers);
      });
    };

    const addLayer = (type: InteractiveLayer['type']) => {
      updateSelectedScene((currentScene) => {
        const nextLayers = getSceneLayers(currentScene);
        const layer = createDefaultLayer(type, nextLayers.length);
        setSceneLayers(currentScene, [...nextLayers, layer]);
        onSelectedLayerChange(layer.id);
      });
    };

    const removeLayer = (layerId: string) => {
      updateSelectedScene((currentScene) => {
        setSceneLayers(currentScene, getSceneLayers(currentScene).filter((layer) => layer.id !== layerId));
      });
      onSelectedLayerChange(null);
    };

    return (
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">{FRIENDLY_INTERACTIVE_BOOK_LABELS.canvasLayers}</p>
            <p className="mt-1 text-sm text-slate-500">
              Kéo thả nội dung trên canvas. Tọa độ chỉ được lưu khi thả chuột.
            </p>
          </div>
          {!readOnly && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => addLayer('text')}>
                Thêm chữ
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => addLayer('image')}>
                Thêm ảnh
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => addLayer('button')}>
                Thêm nút
              </Button>
            </div>
          )}
        </div>

        <SceneLayerCanvas
          layers={layers}
          backgroundUrl={inferSceneImage(scene)}
          selectedLayerId={selectedLayerId}
          disabled={readOnly}
          onSelectLayer={onSelectedLayerChange}
          onCommitLayerPosition={(layerId, position) => updateLayer(layerId, (layer) => {
            layer.x = position.x;
            layer.y = position.y;
          })}
        />

        {selectedLayer ? (
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-2">
            <Input
              label="Nội dung lớp"
              value={selectedLayer.text ?? ''}
              disabled={readOnly}
              onChange={(event) => updateLayer(selectedLayer.id, (layer) => { layer.text = event.target.value; })}
            />
            <Input
              label={FRIENDLY_INTERACTIVE_BOOK_LABELS.zIndex}
              type="number"
              value={String(selectedLayer.z_index ?? 1)}
              disabled={readOnly}
              onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                layer.z_index = Number(event.target.value) || 1;
              })}
            />
            <Input
              label="Rộng (%)"
              type="number"
              value={String(selectedLayer.width)}
              disabled={readOnly}
              onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                layer.width = Number(event.target.value) || layer.width;
              })}
            />
            <Input
              label="Cao (%)"
              type="number"
              value={String(selectedLayer.height)}
              disabled={readOnly}
              onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                layer.height = Number(event.target.value) || layer.height;
              })}
            />
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">{FRIENDLY_INTERACTIVE_BOOK_LABELS.visibilityRule}</label>
              <div className="grid gap-3 md:grid-cols-2">
                <select
                  value={selectedLayer.visibility_rule?.trigger ?? 'always'}
                  disabled={readOnly}
                  onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                    layer.visibility_rule = { trigger: event.target.value as NonNullable<InteractiveLayer['visibility_rule']>['trigger'] };
                  })}
                  className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
                >
                  <option value="always">Hiện ngay</option>
                  <option value="after_delay">Hiện sau thời gian chờ</option>
                  <option value="after_click">Hiện sau khi bấm</option>
                  <option value="after_choice">Hiện sau khi chọn đáp án</option>
                  <option value="after_media_time">Hiện khi media tới thời điểm</option>
                  <option value="after_media_end">Hiện sau khi media kết thúc</option>
                  <option value="after_event">Hiện sau một sự kiện</option>
                  <option value="manual">Chỉ hiện khi được gọi</option>
                </select>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {summarizeVisibilityRule(selectedLayer)}
                </div>
              </div>

              {(selectedLayer.visibility_rule?.trigger === 'after_delay' || selectedLayer.visibility_rule?.trigger === 'after_time') && (
                <div className="mt-3">
                  <Input
                    label="Thời gian chờ (giây)"
                    type="number"
                    value={String(selectedLayer.visibility_rule?.delay_seconds ?? selectedLayer.visibility_rule?.timecode ?? 0)}
                    disabled={readOnly}
                    onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                      layer.visibility_rule = {
                        ...(layer.visibility_rule ?? { trigger: 'after_delay' }),
                        trigger: 'after_delay',
                        delay_seconds: Number(event.target.value) || 0,
                      };
                    })}
                  />
                </div>
              )}

              {selectedLayer.visibility_rule?.trigger === 'after_click' && (
                <div className="mt-3">
                  <Input
                    label="Lớp hoặc điểm chạm kích hoạt"
                    value={selectedLayer.visibility_rule?.interaction_id ?? selectedLayer.visibility_rule?.layer_id ?? ''}
                    disabled={readOnly}
                    onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                      layer.visibility_rule = {
                        ...(layer.visibility_rule ?? { trigger: 'after_click' }),
                        trigger: 'after_click',
                        interaction_id: event.target.value,
                      };
                    })}
                    placeholder="Để trống nếu chỉ cần bất kỳ click trong cảnh"
                  />
                </div>
              )}

              {selectedLayer.visibility_rule?.trigger === 'after_choice' && (
                <div className="mt-3">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Lựa chọn kích hoạt</label>
                  <select
                    value={selectedLayer.visibility_rule?.choice_id ?? ''}
                    disabled={readOnly}
                    onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                      layer.visibility_rule = {
                        ...(layer.visibility_rule ?? { trigger: 'after_choice' }),
                        trigger: 'after_choice',
                        choice_id: event.target.value,
                      };
                    })}
                    className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="">Bất kỳ lựa chọn nào</option>
                    {sceneChoices.map((choice) => (
                      <option key={choice.id} value={choice.id}>{choice.label}</option>
                    ))}
                  </select>
                </div>
              )}

              {selectedLayer.visibility_rule?.trigger === 'after_media_time' && (
                <div className="mt-3">
                  <Input
                    label="Mốc media (giây)"
                    type="number"
                    value={String(selectedLayer.visibility_rule?.timecode ?? 0)}
                    disabled={readOnly}
                    onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                      layer.visibility_rule = {
                        ...(layer.visibility_rule ?? { trigger: 'after_media_time' }),
                        trigger: 'after_media_time',
                        timecode: Number(event.target.value) || 0,
                      };
                    })}
                  />
                </div>
              )}

              {selectedLayer.visibility_rule?.trigger === 'after_event' && (
                <div className="mt-3">
                  <Input
                    label="Sự kiện kích hoạt"
                    value={selectedLayer.visibility_rule?.event_type ?? ''}
                    disabled={readOnly}
                    onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                      layer.visibility_rule = {
                        ...(layer.visibility_rule ?? { trigger: 'after_event' }),
                        trigger: 'after_event',
                        event_type: event.target.value,
                      };
                    })}
                    placeholder="Ví dụ: retry_clicked"
                  />
                </div>
              )}
            </div>
            {selectedLayer.type === 'image' && (
              <div className="md:col-span-2">
                {renderMediaField({
                  fieldKey: `${scene.id}:${selectedLayer.id}:image-layer`,
                  label: 'Ảnh của lớp',
                  url: selectedLayer.url ?? '',
                  accept: 'image/*',
                  subDir: 'interactive-books',
                  kind: 'image',
                  disabled: readOnly,
                  onChange: (url) => updateLayer(selectedLayer.id, (layer) => { layer.url = url; }),
                })}
              </div>
            )}
            {selectedLayer.type === 'button' && (
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">{FRIENDLY_INTERACTIVE_BOOK_LABELS.nextAction}</label>
                <div className="grid gap-3 md:grid-cols-2">
                  <select
                    value={selectedLayer.action?.type ?? 'go_to_scene'}
                    disabled={readOnly}
                    onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                      layer.action = { ...(layer.action ?? {}), type: event.target.value as NonNullable<InteractiveLayer['action']>['type'] };
                    })}
                    className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
                  >
                    <option value="go_to_scene">Chuyển sang cảnh khác</option>
                    <option value="open_interaction">Mở câu hỏi / tương tác</option>
                    <option value="reveal_layer">Hiện thêm nội dung</option>
                    <option value="play_audio">Phát âm thanh</option>
                  </select>
                  <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Nút có thể chuyển cảnh, mở tương tác, hiện thêm nội dung hoặc phát âm thanh.
                  </div>
                </div>

                {(selectedLayer.action?.type ?? 'go_to_scene') === 'go_to_scene' && (
                  <div className="mt-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">{FRIENDLY_INTERACTIVE_BOOK_LABELS.nextAction}</label>
                    <select
                      value={selectedLayer.action?.target_scene_id ?? ''}
                      disabled={readOnly}
                      onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                        layer.action = { ...(layer.action ?? { type: 'go_to_scene' }), type: 'go_to_scene', target_scene_id: event.target.value };
                      })}
                      className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
                    >
                      <option value="">Giữ nguyên tại cảnh này</option>
                      {previewManifest.scenes
                        .filter((item) => item.id !== selectedSceneId)
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.title || item.id}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {selectedLayer.action?.type === 'open_interaction' && (
                  <div className="mt-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Tương tác cần mở</label>
                    <select
                      value={selectedLayer.action?.interaction_id ?? ''}
                      disabled={readOnly}
                      onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                        layer.action = { ...(layer.action ?? { type: 'open_interaction' }), type: 'open_interaction', interaction_id: event.target.value };
                      })}
                      className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
                    >
                      <option value="">Chọn tương tác</option>
                      {(scene.interactions ?? []).map((interaction, index) => (
                        <option key={interaction.id ?? index} value={interaction.id ?? ''}>
                          {interaction.prompt || interaction.id || `Interaction ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedLayer.action?.type === 'reveal_layer' && (
                  <div className="mt-3">
                    <label className="mb-1 block text-sm font-medium text-slate-700">Lớp cần hiện thêm</label>
                    <select
                      value={selectedLayer.action?.target_layer_id ?? ''}
                      disabled={readOnly}
                      onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                        layer.action = { ...(layer.action ?? { type: 'reveal_layer' }), type: 'reveal_layer', target_layer_id: event.target.value };
                      })}
                      className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
                    >
                      <option value="">Chọn lớp</option>
                      {layers
                        .filter((item) => item.id !== selectedLayer.id)
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.text || item.id}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {selectedLayer.action?.type === 'play_audio' && (
                  <div className="mt-3">
                    <Input
                      label="URL âm thanh"
                      value={selectedLayer.action?.audio_url ?? ''}
                      disabled={readOnly}
                      onChange={(event) => updateLayer(selectedLayer.id, (layer) => {
                        layer.action = { ...(layer.action ?? { type: 'play_audio' }), type: 'play_audio', audio_url: event.target.value };
                      })}
                      placeholder="https://..."
                    />
                  </div>
                )}
              </div>
            )}
            {!readOnly && (
              <div className="md:col-span-2">
                <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => removeLayer(selectedLayer.id)}>
                  Xóa lớp
                </Button>
              </div>
            )}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-sm text-slate-500">
            Chọn một lớp trên canvas để sửa nội dung, kích thước, thứ tự hiển thị hoặc hành động tiếp theo.
          </p>
        )}
      </div>
    );
  };

  const renderBackgroundAudioTriggerField = (
    scene: InteractiveScene,
    onChange: (trigger: BackgroundAudioTrigger) => void,
  ) => {
    const currentTrigger = getBackgroundAudioTrigger(scene);
    const options: Array<{ value: BackgroundAudioTrigger; label: string; description: string }> = [
      {
        value: 'on_enter',
        label: 'Tự động khi mở nội dung',
        description: 'Hệ thống thử phát ngay khi cảnh mở.',
      },
      ...(scene.type === 'slideshow'
        ? [{
          value: 'on_slide_change' as const,
          label: 'Khi chuyển slide',
          description: 'Mỗi lần đổi slide sẽ phát lại âm thanh nền.',
        }]
        : []),
      {
        value: 'manual',
        label: 'Khi người dùng bấm',
        description: 'Không tự phát. Người học phải bấm nút phát.',
      },
    ];

    return (
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <label className="mb-2 block text-sm font-medium text-slate-700">Thời điểm phát âm thanh nền</label>
        <div className="grid gap-3">
          {options.map((option) => (
            <label key={`${scene.id}:${option.value}`} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
              <input
                type="radio"
                name={`background-audio-trigger-${scene.id}`}
                checked={currentTrigger === option.value}
                disabled={readOnly}
                onChange={() => onChange(option.value)}
              />
              <span>
                <span className="block font-medium text-slate-900">{option.label}</span>
                <span className="mt-1 block text-xs text-slate-500">{option.description}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  const appendSlideshowImage = (scene: InteractiveScene, url: string) => {
    const content = ensureContentRecord(scene);
    const images = Array.isArray(content.images)
      ? content.images.filter((item): item is string => typeof item === 'string')
      : [];
    if (!images.includes(url)) {
      content.images = [...images, url];
    }
    if (typeof content.image_url !== 'string' || !content.image_url) {
      content.image_url = url;
    }
  };

  const renderCommonSceneFields = (scene: InteractiveScene) => {
    const sceneText = getSceneText(scene);
    const nextSceneId = getSceneNext(scene);
    const implicitNextSceneId = getImplicitNextSceneId(previewManifest, scene.id);
    const resolvedNextSceneId = nextSceneId || implicitNextSceneId;

    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Tên cảnh"
            value={scene.title ?? ''}
            disabled={readOnly}
            onChange={(event) => updateSelectedScene((draftScene) => { draftScene.title = event.target.value; })}
            placeholder="Ví dụ: Quan hỏi cậu bé"
          />

          {scene.type !== 'timeline' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">{FRIENDLY_INTERACTIVE_BOOK_LABELS.nextAction}</label>
              <select
                value={resolvedNextSceneId}
                disabled={readOnly}
                onChange={(event) => updateSelectedScene((draftScene) => {
                  const chosenSceneId = event.target.value;
                  draftScene.next = !chosenSceneId || chosenSceneId === implicitNextSceneId
                    ? undefined
                    : chosenSceneId;
                })}
                className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
              >
                <option value={implicitNextSceneId || ''}>
                  {implicitNextSceneId ? 'Theo thứ tự trong danh sách cảnh' : 'Không thiết lập'}
                </option>
                {previewManifest.scenes
                  .filter((item) => item.id !== scene.id)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title || item.id}
                    </option>
                  ))}
              </select>
              {implicitNextSceneId && !nextSceneId && (
                <p className="mt-2 text-xs text-slate-500">
                  Hiện tại chưa đặt thủ công. Nút này sẽ mặc định đi tới cảnh đứng ngay sau nó trong danh sách.
                </p>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Mô tả hoặc lời dẫn của cảnh</label>
          <textarea
            value={sceneText}
            disabled={readOnly}
            onChange={(event) => updateSelectedScene((draftScene) => {
              ensureContentRecord(draftScene).text = event.target.value;
            })}
            rows={4}
            className="w-full rounded-3xl border border-border px-4 py-3 text-sm leading-6 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-blue-300 disabled:bg-slate-50"
            placeholder="Nhập nội dung giáo viên muốn hiển thị ở cảnh này..."
          />
        </div>
      </div>
    );
  };

  const renderUnifiedMediaContent = (scene: InteractiveScene) => {
    const imageUrl = getStringFromContent(scene, 'image_url');
    const videoUrl = getStringFromContent(scene, 'video_url');
    const posterUrl = getStringFromContent(scene, 'poster_url');
    const backgroundAudioUrl = getStringFromContent(scene, 'background_audio_url');

    const handlePrimaryMediaChange = (url: string) => {
      updateSelectedUnifiedMediaScene((currentScene) => {
        const content = ensureContentRecord(currentScene);
        // naive detection by extension
        if (/\.(mp4|webm|ogg|m4v)(\?|$)/i.test(url)) {
          content.media_kind = 'video';
          content.video_url = url;
        } else {
          content.media_kind = 'image';
          content.image_url = url;
        }
      });
    };

    return (
      <div className="space-y-4">
        {renderCommonSceneFields(scene)}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Nội dung chính</p>
            <p className="mt-1 text-sm text-slate-500">Tải lên ảnh hoặc video cho cảnh (chọn 1 file). Hệ thống sẽ tự nhận dạng loại và lưu vào trường phù hợp.</p>
            <div className="mt-3">
              {renderMediaField({
                fieldKey: `${scene.id}:primary-media`,
                label: 'Ảnh/Video chính',
                url: imageUrl || videoUrl || '',
                accept: 'image/*,video/*',
                subDir: 'interactive-books',
                kind: 'file',
                disabled: readOnly,
                onChange: (url) => {
                  handlePrimaryMediaChange(url);
                },
              })}
            </div>
          </div>

          <div className="space-y-4">
            {renderMediaField({
              fieldKey: `${scene.id}:background-audio`,
              label: 'Âm thanh nền',
              url: backgroundAudioUrl,
              accept: 'audio/*',
              subDir: 'interactive-books',
              kind: 'audio',
              disabled: readOnly,
              onChange: (url) => updateSelectedUnifiedMediaScene((currentScene) => {
                ensureContentRecord(currentScene).background_audio_url = url;
              }),
            })}
            {renderBackgroundAudioTriggerField(scene, (trigger) => updateSelectedUnifiedMediaScene((currentScene) => {
              ensureContentRecord(currentScene).background_audio_trigger = trigger;
            }))}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            {renderMediaField({
              fieldKey: `${scene.id}:poster`,
              label: 'Ảnh poster (cho video)',
              url: posterUrl,
              accept: 'image/*',
              subDir: 'interactive-books',
              kind: 'image',
              disabled: readOnly,
              onChange: (url) => updateSelectedUnifiedMediaScene((currentScene) => {
                ensureContentRecord(currentScene).poster_url = url;
              }),
            })}
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={getBooleanFromContent(scene, 'autoplay')}
                disabled={readOnly}
                onChange={(event) => updateSelectedUnifiedMediaScene((currentScene) => {
                  ensureContentRecord(currentScene).autoplay = event.target.checked;
                })}
              />
              Tự phát video khi vào cảnh
            </label>
          </div>

          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-500">
            Ảnh/Video chính sẽ hiển thị toàn màn hình. Giáo viên có thể chèn text hoặc ghi chú ở tab trình bày.
          </div>
        </div>
      </div>
    );
  };

  const renderUnifiedMediaInteractions = (scene: InteractiveScene) => {
    const questionEnabled = isQuestionEnabled(scene);
    const questionInteraction = getQuestionInteraction(scene);

    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={questionEnabled}
              disabled={readOnly}
              onChange={(event) => updateSelectedUnifiedMediaScene((currentScene) => {
                if (event.target.checked) {
                  ensureQuestionInteraction(currentScene);
                } else {
                  disableQuestionInteraction(currentScene);
                }
              })}
            />
            Bật câu hỏi cho học sinh sau khi xem hoặc nghe xong
          </label>
        </div>

        {questionEnabled ? (
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Câu hỏi của cảnh</p>
              <p className="mt-1 text-sm text-slate-500">
                Nếu cảnh có audio hoặc video, câu hỏi sẽ mở sau khi media kết thúc.
              </p>
            </div>
            <Input
              label="Câu hỏi trắc nghiệm"
              value={questionInteraction?.prompt ?? ''}
              disabled={readOnly}
              onChange={(event) => updateSelectedUnifiedMediaScene((currentScene) => {
                const interaction = ensureQuestionInteraction(currentScene);
                interaction.prompt = event.target.value;
              })}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Thông điệp mặc định khi trả lời sai"
                value={typeof questionInteraction?.data?.wrong_feedback_message === 'string' ? questionInteraction.data.wrong_feedback_message : ''}
                disabled={readOnly}
                onChange={(event) => updateSelectedUnifiedMediaScene((currentScene) => {
                  const interaction = ensureQuestionInteraction(currentScene);
                  interaction.data = { ...(interaction.data ?? {}), wrong_feedback_message: event.target.value };
                })}
                placeholder="Ví dụ: Câu trả lời này chưa đúng."
              />
              <Input
                label="Thông điệp mặc định khi trả lời đúng"
                value={typeof questionInteraction?.data?.correct_feedback_message === 'string' ? questionInteraction.data.correct_feedback_message : ''}
                disabled={readOnly}
                onChange={(event) => updateSelectedUnifiedMediaScene((currentScene) => {
                  const interaction = ensureQuestionInteraction(currentScene);
                  interaction.data = { ...(interaction.data ?? {}), correct_feedback_message: event.target.value };
                })}
                placeholder="Ví dụ: Chính xác, em tiếp tục nhé."
              />
            </div>
            {renderChoiceEditor(scene, questionInteraction, 'Cảnh này chưa có lựa chọn cho câu hỏi.')}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-500">
            Chưa bật câu hỏi cho cảnh này.
          </div>
        )}
      </div>
    );
  };

  const renderSlideshowContent = (scene: InteractiveScene) => {
    const slideshowImages = Array.from(new Set([
      ...getStringListFromContent(scene, 'images'),
      ...(getStringFromContent(scene, 'image_url') ? [getStringFromContent(scene, 'image_url')] : []),
    ]));

    return (
      <div className="space-y-4">
        {renderCommonSceneFields(scene)}
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Danh sách ảnh trình chiếu</p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Có thể tải nhiều ảnh. Trình phát sẽ hiển thị theo đúng thứ tự trong danh sách này.
              </p>
            </div>
            {!readOnly && (
              <label className="inline-flex cursor-pointer items-center rounded-button border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                {uploadingFieldKey === `${scene.id}:slideshow-images` ? 'Đang tải ảnh...' : 'Tải thêm ảnh'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingFieldKey === `${scene.id}:slideshow-images`}
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    await onInlineUpload(
                      `${scene.id}:slideshow-images`,
                      file,
                      'interactive-books',
                      (url) => updateSelectedScene((draftScene) => {
                        appendSlideshowImage(draftScene, url);
                      }),
                    );
                    event.target.value = '';
                  }}
                />
              </label>
            )}
          </div>

          {slideshowImages.length > 0 ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {slideshowImages.map((imageUrl, index) => (
                <div key={imageUrl} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <img
                    src={imageUrl}
                    alt={`Ảnh trình chiếu ${index + 1}`}
                    className="h-40 w-full rounded-2xl border border-slate-200 object-cover"
                  />
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Ảnh {index + 1}</p>
                    </div>
                    {!readOnly && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => updateSelectedScene((draftScene) => {
                          const contentRecord = ensureContentRecord(draftScene);
                          const nextImages = getStringListFromContent(draftScene, 'images').filter((item) => item !== imageUrl);
                          contentRecord.images = nextImages;
                          contentRecord.image_url = nextImages[0] ?? '';
                        })}
                      >
                        Xóa
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">
              Chưa có ảnh trình chiếu. Giáo viên có thể tải ảnh trực tiếp ở đây hoặc dùng khay tư liệu của cảnh.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSlideshowPlayback = (scene: InteractiveScene) => (
    <div className="space-y-4">
      {renderMediaField({
        fieldKey: `${scene.id}:slideshow-audio`,
        label: 'Âm thanh nền',
        url: getStringFromContent(scene, 'background_audio_url'),
        accept: 'audio/*',
        subDir: 'interactive-books',
        kind: 'audio',
        disabled: readOnly,
        onChange: (url) => updateSelectedScene((draftScene) => {
          ensureContentRecord(draftScene).background_audio_url = url;
        }),
      })}
      {renderBackgroundAudioTriggerField(scene, (trigger) => updateSelectedScene((draftScene) => {
        ensureContentRecord(draftScene).background_audio_trigger = trigger;
      }))}
    </div>
  );

  const renderConnectDotsContent = (scene: InteractiveScene) => {
    const content = ensureContentRecord(scene);
    const backgroundUrl = typeof content.background_image_url === 'string' && content.background_image_url
      ? content.background_image_url
      : getStringFromContent(scene, 'image_url');

    return (
      <div className="space-y-4">
        {renderCommonSceneFields(scene)}
        {renderMediaField({
          fieldKey: `${scene.id}:connect-dots-background`,
          label: 'Ảnh nền nối điểm',
          url: backgroundUrl,
          accept: 'image/*',
          subDir: 'interactive-books',
          kind: 'image',
          disabled: readOnly,
          onChange: (url) => updateSelectedScene((currentScene) => {
            const currentContent = ensureContentRecord(currentScene);
            currentContent.background_image_url = url;
            currentContent.image_url = url;
          }),
        })}
      </div>
    );
  };

  const renderConnectDotsPoints = (scene: InteractiveScene) => {
    const content = ensureContentRecord(scene);
    const points = getConnectDotsPoints(scene);
    const backgroundUrl = typeof content.background_image_url === 'string' && content.background_image_url
      ? content.background_image_url
      : getStringFromContent(scene, 'image_url');

    const updatePoint = (
      pointId: string,
      updater: (point: { id: string; label?: string; x: number; y: number; order: number }) => void,
    ) => {
      updateSelectedScene((currentScene) => {
        const nextPoints = getConnectDotsPoints(currentScene).map((point) => ({ ...point }));
        const targetPoint = nextPoints.find((point) => point.id === pointId);
        if (!targetPoint) return;
        updater(targetPoint);
        ensureContentRecord(currentScene).points = nextPoints.sort((left, right) => left.order - right.order);
      });
    };

    const addPointAt = (x: number, y: number) => {
      if (readOnly) return;
      updateSelectedScene((currentScene) => {
        const nextPoints = getConnectDotsPoints(currentScene);
        ensureContentRecord(currentScene).points = [
          ...nextPoints,
          {
            id: `${currentScene.id}-point-${Date.now()}`,
            label: String(nextPoints.length + 1),
            x,
            y,
            order: nextPoints.length + 1,
          },
        ];
      });
    };

    return (
      <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Canvas nối điểm</p>
            <p className="mt-1 text-sm text-slate-500">
              Click vào ảnh để thêm điểm. Học sinh phải chọn đúng theo thứ tự.
            </p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            {points.length} điểm
          </span>
        </div>

        <div
          className="relative mt-4 aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-white"
          onClick={(event) => {
            if (readOnly) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100;
            const y = ((event.clientY - rect.top) / Math.max(1, rect.height)) * 100;
            addPointAt(Math.round(x), Math.round(y));
          }}
        >
          {backgroundUrl ? (
            <img src={backgroundUrl} alt="Connect dots background" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
              Chưa có ảnh nền. Tải ảnh trước khi đặt điểm.
            </div>
          )}
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline
              points={points.map((point) => `${point.x},${point.y}`).join(' ')}
              fill="none"
              stroke="rgb(14 165 233)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {points.map((point) => (
            <div
              key={point.id}
              className="absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-sky-500 text-sm font-bold text-white shadow"
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            >
              {point.label || point.order}
            </div>
          ))}
        </div>

        <div className="mt-4 space-y-3">
          {points.map((point) => (
            <div key={point.id} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-3 md:grid-cols-[1fr_90px_90px_90px_auto]">
              <Input
                label="Nhãn"
                value={point.label ?? ''}
                disabled={readOnly}
                onChange={(event) => updatePoint(point.id, (draftPoint) => { draftPoint.label = event.target.value; })}
              />
              <Input
                label="X"
                type="number"
                value={String(point.x)}
                disabled={readOnly}
                onChange={(event) => updatePoint(point.id, (draftPoint) => { draftPoint.x = Number(event.target.value) || 0; })}
              />
              <Input
                label="Y"
                type="number"
                value={String(point.y)}
                disabled={readOnly}
                onChange={(event) => updatePoint(point.id, (draftPoint) => { draftPoint.y = Number(event.target.value) || 0; })}
              />
              <Input
                label="Thứ tự"
                type="number"
                value={String(point.order)}
                disabled={readOnly}
                onChange={(event) => updatePoint(point.id, (draftPoint) => { draftPoint.order = Number(event.target.value) || 1; })}
              />
              {!readOnly && (
                <div className="flex items-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    onClick={() => updateSelectedScene((currentScene) => {
                      ensureContentRecord(currentScene).points = getConnectDotsPoints(currentScene).filter((item) => item.id !== point.id);
                    })}
                  >
                    Xóa
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderConnectDotsCompletion = (scene: InteractiveScene) => {
    const content = ensureContentRecord(scene);

    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">{FRIENDLY_INTERACTIVE_BOOK_LABELS.nextAction}</label>
          <select
            value={typeof content.success_target_scene_id === 'string' ? content.success_target_scene_id : ''}
            disabled={readOnly}
            onChange={(event) => updateSelectedScene((currentScene) => {
              ensureContentRecord(currentScene).success_target_scene_id = event.target.value;
            })}
            className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
          >
            <option value="">Dừng ở cảnh này / nút tiếp theo mặc định</option>
            {previewManifest.scenes
              .filter((item) => item.id !== scene.id)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title || item.id}
                </option>
              ))}
          </select>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <Input
              label="Điểm hoàn thành"
              type="number"
              value={String(content.complete_score ?? 1)}
              disabled={readOnly}
              onChange={(event) => updateSelectedScene((currentScene) => {
                ensureContentRecord(currentScene).complete_score = Number(event.target.value) || 0;
              })}
            />
            <Input
              label="Phạt khi sai"
              type="number"
              value={String(content.wrong_penalty ?? 0)}
              disabled={readOnly}
              onChange={(event) => updateSelectedScene((currentScene) => {
                ensureContentRecord(currentScene).wrong_penalty = Number(event.target.value) || 0;
              })}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <label className="mb-1 block text-sm font-medium text-slate-700">Hành vi khi bấm sai thứ tự</label>
          <select
            value={typeof content.wrong_behavior === 'string' ? content.wrong_behavior : 'stay_current_point'}
            disabled={readOnly}
            onChange={(event) => updateSelectedScene((currentScene) => {
              ensureContentRecord(currentScene).wrong_behavior = event.target.value;
            })}
            className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
          >
            <option value="stay_current_point">Giữ nguyên tiến độ hiện tại</option>
            <option value="restart_current_sequence">Quay lại chuỗi hiện tại</option>
            <option value="restart_from_beginning">Làm lại từ đầu</option>
          </select>
        </div>
      </div>
    );
  };

  const renderTimelineCards = (scene: InteractiveScene) => {
    const content = ensureContentRecord(scene);
    return (
      <div className="space-y-4">
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={content.sync_from_scenes !== false}
            disabled={readOnly}
            onChange={(event) => updateSelectedScene((draftScene) => {
              ensureContentRecord(draftScene).sync_from_scenes = event.target.checked;
            })}
          />
          Tự đồng bộ thẻ timeline từ danh sách cảnh
        </label>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Thẻ sự kiện hiện tại</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {Array.isArray(content.cards) && content.cards.length > 0 ? (
              content.cards.map((card, index) => {
                const record = card as Record<string, unknown>;
                return (
                  <div key={String(record.id ?? index)} className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Sự kiện {index + 1}</p>
                    <p className="mt-1 font-semibold text-slate-900">{String(record.title ?? 'Chưa có tiêu đề')}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{String(record.description ?? '')}</p>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500">
                Chưa có thẻ timeline. Hệ thống sẽ tạo thẻ sau khi giáo viên chỉnh các cảnh còn lại.
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderGenericContent = (scene: InteractiveScene) => (
    <div className="space-y-4">
      {renderCommonSceneFields(scene)}
      {renderMediaField({
        fieldKey: `${scene.id}:generic-image`,
        label: 'Ảnh minh họa',
        url: getStringFromContent(scene, 'image_url'),
        accept: 'image/*',
        subDir: 'interactive-books',
        kind: 'image',
        disabled: readOnly,
        onChange: (url) => updateSelectedScene((draftScene) => {
          ensureContentRecord(draftScene).image_url = url;
        }),
      })}
    </div>
  );

  const renderSceneBody = () => {
    if (!selectedScene) {
      return (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-slate-500">
          Chọn một cảnh để bắt đầu chỉnh sửa.
        </div>
      );
    }

    if (selectedScene.type === 'timeline') {
      if (activeTab === 'content') {
        return (
          <div className="space-y-4">
            {renderCommonSceneFields(selectedScene)}
            <div className="grid gap-4 md:grid-cols-2">
              {renderMediaField({
                fieldKey: `${selectedScene.id}:timeline-image`,
                label: 'Ảnh tổng quan',
                url: getStringFromContent(selectedScene, 'image_url'),
                accept: 'image/*',
                subDir: 'interactive-books',
                kind: 'image',
                disabled: readOnly,
                onChange: (url) => updateSelectedScene((scene) => {
                  ensureContentRecord(scene).image_url = url;
                }),
              })}
              {renderMediaField({
                fieldKey: `${selectedScene.id}:timeline-audio`,
                label: 'Âm thanh nền',
                url: getStringFromContent(selectedScene, 'background_audio_url'),
                accept: 'audio/*',
                subDir: 'interactive-books',
                kind: 'audio',
                disabled: readOnly,
                onChange: (url) => updateSelectedScene((scene) => {
                  ensureContentRecord(scene).background_audio_url = url;
                }),
              })}
            </div>
          </div>
        );
      }
      return renderTimelineCards(selectedScene);
    }

    if (selectedScene.type === 'connect_the_dots') {
      if (activeTab === 'content') return renderConnectDotsContent(selectedScene);
      if (activeTab === 'points') return renderConnectDotsPoints(selectedScene);
      if (activeTab === 'presentation') return renderCanvasLayerEditor(selectedScene);
      return renderConnectDotsCompletion(selectedScene);
    }

    if (selectedScene.type === 'slideshow') {
      if (activeTab === 'content') return renderSlideshowContent(selectedScene);
      if (activeTab === 'playback') return renderSlideshowPlayback(selectedScene);
      return renderCanvasLayerEditor(selectedScene);
    }

    if (isUnifiedMediaScene(selectedScene)) {
      if (activeTab === 'content') return renderUnifiedMediaContent(selectedScene);
      if (activeTab === 'interactions') return renderUnifiedMediaInteractions(selectedScene);
      return renderCanvasLayerEditor(selectedScene);
    }

    if (activeTab === 'content') return renderGenericContent(selectedScene);
    return renderCanvasLayerEditor(selectedScene);
  };

  if (!selectedScene) {
    return renderSceneBody();
  }

  const meta = sceneTypeMeta(selectedScene.type);
  const sceneIndex = previewManifest.scenes.findIndex((scene) => scene.id === selectedScene.id);
  const canMoveUp = sceneIndex > 0;
  const canMoveDown = sceneIndex < previewManifest.scenes.length - 1;

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={meta.variant}>{meta.label}</Badge>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
              Mã cảnh: {selectedScene.id}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-900">{selectedScene.title || 'Cảnh chưa có tiêu đề'}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              {selectedScene.type === 'timeline'
                ? 'Trang này là điểm vào của sách. Các thẻ sự kiện sẽ tự đồng bộ từ danh sách cảnh bên trái.'
                : 'Giáo viên chỉnh trực tiếp nội dung, phương tiện và nhánh chuyển cảnh tại đây.'}
            </p>
          </div>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => moveSelectedScene(-1)} disabled={!canMoveUp}>
              Đưa lên
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => moveSelectedScene(1)} disabled={!canMoveDown}>
              Đưa xuống
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={removeSelectedScene} className="text-red-600">
              <Trash2 className="mr-1.5 h-4 w-4" /> Xóa cảnh
            </Button>
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-b border-slate-100 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-sky-100 text-sky-800'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-6">{renderSceneBody()}</div>
    </div>
  );
}
