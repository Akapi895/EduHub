import { AlertTriangle, GitBranch, Info } from 'lucide-react';

import Badge from '@/components/common/Badge';
import type { FlowValidationResult } from '@/types';
import { FRIENDLY_INTERACTIVE_BOOK_LABELS } from '@/utils/interactiveBookEditorLabels';

interface AdvancedEditorPanelProps {
  show: boolean;
  readOnly?: boolean;
  flowValidation: FlowValidationResult | null;
  manifestText: string;
  manifestError: string | null;
  onToggle: () => void;
  onManifestTextChange: (text: string) => void;
  onSelectScene: (sceneId: string) => void;
}

export default function AdvancedEditorPanel({
  show,
  readOnly,
  flowValidation,
  manifestText,
  manifestError,
  onToggle,
  onManifestTextChange,
  onSelectScene,
}: AdvancedEditorPanelProps) {
  const blockingFlowErrors = flowValidation?.blockingErrors ?? [];
  const flowWarnings = flowValidation?.warnings ?? [];
  const nodeTone: Record<string, string> = {
    reachable: 'border-emerald-300 bg-emerald-50 text-emerald-950',
    loop: 'border-violet-300 bg-violet-50 text-violet-950',
    blocking: 'border-red-300 bg-red-50 text-red-950',
    unreachable: 'border-amber-300 bg-amber-50 text-amber-950',
  };

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{FRIENDLY_INTERACTIVE_BOOK_LABELS.advancedEditor}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Dành cho lúc cần kiểm tra sâu luồng học hoặc chỉnh manifest trực tiếp.
          </p>
        </div>
        <Badge variant="gray">{show ? 'Đang mở' : 'Đang ẩn'}</Badge>
      </button>

      {show && (
        <div className="mt-5 space-y-5">
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                Nếu giáo viên chỉ muốn sửa nội dung, video, câu hỏi hoặc thứ tự cảnh thì nên dùng các bước ở trên thay vì chỉnh trực tiếp manifest.
              </p>
            </div>
          </div>

          {flowValidation && (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-sky-600" />
                    <h3 className="text-sm font-semibold text-slate-900">{FRIENDLY_INTERACTIVE_BOOK_LABELS.flowSafety}</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    Xem chi tiết đường đi giữa các cảnh, điểm nghẽn và các nhánh chưa tới được đích.
                  </p>
                </div>
                <div className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  blockingFlowErrors.length > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                }`}
                >
                  {blockingFlowErrors.length > 0 ? `${blockingFlowErrors.length} lỗi chặn` : 'Luồng hợp lệ'}
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="min-w-0">
                  <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                    {flowValidation.nodes.map((node) => (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => onSelectScene(node.id)}
                        className={`rounded-2xl border px-3 py-3 text-left transition hover:-translate-y-0.5 ${nodeTone[node.status]}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold uppercase">{node.status}</span>
                          <span className="text-xs opacity-70">{node.type}</span>
                        </div>
                        <p className="mt-2 text-sm font-semibold">{node.title}</p>
                        <p className="mt-1 break-all text-xs opacity-70">{node.id}</p>
                      </button>
                    ))}
                  </div>

                  <div className="mt-4 max-h-48 overflow-auto rounded-2xl border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Liên kết giữa các cảnh</p>
                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      {flowValidation.edges.length === 0 ? (
                        <p>Chưa phát hiện liên kết nào.</p>
                      ) : flowValidation.edges.map((edge) => (
                        <button
                          key={edge.id}
                          type="button"
                          onClick={() => onSelectScene(edge.from)}
                          className={`block w-full rounded-xl px-2 py-1 text-left ${edge.valid ? 'hover:bg-slate-50' : 'bg-red-50 text-red-700'}`}
                        >
                          <span className="font-semibold">{edge.from}</span>
                          {' -> '}
                          <span className="font-semibold">{edge.to}</span>
                          <span className="ml-2 text-slate-400">({edge.kind}: {edge.label})</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {blockingFlowErrors.length > 0 && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-red-900">
                        <AlertTriangle className="h-4 w-4" />
                        {FRIENDLY_INTERACTIVE_BOOK_LABELS.blockingErrors}
                      </div>
                      <div className="mt-2 space-y-2">
                        {blockingFlowErrors.map((issue) => (
                          <button
                            key={issue.id}
                            type="button"
                            onClick={() => issue.sceneId && onSelectScene(issue.sceneId)}
                            className="block w-full rounded-xl bg-white px-3 py-2 text-left text-xs text-red-800"
                          >
                            {issue.message}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {flowWarnings.length > 0 && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
                      <p className="text-sm font-semibold text-amber-900">{FRIENDLY_INTERACTIVE_BOOK_LABELS.warnings}</p>
                      <div className="mt-2 space-y-2">
                        {flowWarnings.slice(0, 6).map((issue) => (
                          <button
                            key={issue.id}
                            type="button"
                            onClick={() => issue.sceneId && onSelectScene(issue.sceneId)}
                            className="block w-full rounded-xl bg-white px-3 py-2 text-left text-xs text-amber-900"
                          >
                            {issue.message}
                          </button>
                        ))}
                        {flowWarnings.length > 6 && (
                          <p className="text-xs text-amber-800">+{flowWarnings.length - 6} lưu ý khác.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-slate-900">Manifest JSON</h3>
            <textarea
              value={manifestText}
              onChange={(event) => onManifestTextChange(event.target.value)}
              rows={26}
              disabled={readOnly}
              spellCheck={false}
              className="mt-3 w-full rounded-3xl border border-slate-200 bg-slate-950 px-4 py-4 font-mono text-sm leading-6 text-slate-100 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-200 disabled:bg-slate-900"
            />
            {manifestError && <p className="mt-2 text-sm text-red-600">{manifestError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
