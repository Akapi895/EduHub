import { AlertTriangle, BarChart3, Eye, Info, PlusCircle, Rocket, Save } from 'lucide-react';

import Badge from '@/components/common/Badge';
import Button from '@/components/common/Button';
import type { FlowValidationResult, InteractiveBookReport, InteractiveBookManifest } from '@/types';
import { FRIENDLY_INTERACTIVE_BOOK_LABELS } from '@/utils/interactiveBookEditorLabels';
import AdvancedEditorPanel from './AdvancedEditorPanel';

export interface ReviewProgressItem {
  id: string;
  label: string;
  done: boolean;
  hint?: string;
}

interface InteractiveBookStepReviewProps {
  previewManifest: InteractiveBookManifest | null;
  readOnly?: boolean;
  manifestWarnings: string[];
  flowValidation: FlowValidationResult | null;
  hasBlockingFlowErrors: boolean;
  progressItems: ReviewProgressItem[];
  showAdvancedTools: boolean;
  manifestText: string;
  manifestError: string | null;
  saving?: boolean;
  publishing?: boolean;
  canAssignToClass?: boolean;
  reportLoading?: boolean;
  reportError?: string | null;
  report?: InteractiveBookReport | null;
  onOpenPreview: () => void;
  onSelectScene: (sceneId: string) => void;
  onToggleAdvancedTools: () => void;
  onManifestTextChange: (text: string) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onOpenAssignToClass: () => void;
}

export default function InteractiveBookStepReview({
  previewManifest,
  readOnly,
  manifestWarnings,
  flowValidation,
  hasBlockingFlowErrors,
  progressItems,
  showAdvancedTools,
  manifestText,
  manifestError,
  saving,
  publishing,
  canAssignToClass,
  reportLoading,
  reportError,
  report,
  onOpenPreview,
  onSelectScene,
  onToggleAdvancedTools,
  onManifestTextChange,
  onSaveDraft,
  onPublish,
  onOpenAssignToClass,
}: InteractiveBookStepReviewProps) {
  const blockingFlowErrors = flowValidation?.blockingErrors ?? [];
  const flowWarnings = flowValidation?.warnings ?? [];
  const completedProgressCount = progressItems.filter((item) => item.done).length;

  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Kiểm tra trước khi phát hành</h2>
            <p className="mt-1 text-sm text-slate-500">
              Rà lỗi, xem thử đúng trải nghiệm của học sinh rồi mới lưu nháp hoặc phát hành.
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
            <p className="text-xs uppercase tracking-wide text-slate-400">Mức sẵn sàng</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{completedProgressCount}/{progressItems.length} mục</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Tổng số cảnh</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{previewManifest?.scenes.length ?? 0}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Lỗi chặn phát hành</p>
            <p className={`mt-1 text-lg font-semibold ${hasBlockingFlowErrors ? 'text-red-700' : 'text-emerald-700'}`}>
              {blockingFlowErrors.length}
            </p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Lưu ý nên kiểm tra</p>
            <p className="mt-1 text-lg font-semibold text-amber-800">{manifestWarnings.length + flowWarnings.length}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-slate-400">Đường học tới đích</p>
            <p className={`mt-1 text-lg font-semibold ${flowValidation?.completionReachable ? 'text-emerald-700' : 'text-amber-800'}`}>
              {flowValidation?.completionReachable ? 'Đã có' : 'Cần kiểm tra'}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-900">Checklist trước khi lưu hoặc phát hành</p>
                {progressItems.map((item) => (
                  <div key={item.id} className={`rounded-2xl border px-4 py-3 text-sm ${item.done ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-white text-amber-900'}`}>
                    <p className="font-medium">{item.done ? 'Đã xong' : 'Cần bổ sung'}: {item.label}</p>
                    {item.hint && <p className="mt-1 text-xs opacity-80">{item.hint}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Xem thử đúng runtime học sinh</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Mở trình phát thật để kiểm tra điều hướng, media, câu hỏi và phản hồi.
                  </p>
                </div>
                <Button type="button" variant="secondary" onClick={onOpenPreview}>
                  <Eye className="mr-1.5 h-4 w-4" /> Xem thử
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-700" />
                <p className="text-sm font-semibold text-slate-900">{FRIENDLY_INTERACTIVE_BOOK_LABELS.flowSafety}</p>
              </div>
              <div className="mt-3 space-y-2">
                {blockingFlowErrors.length === 0 && flowWarnings.length === 0 ? (
                  <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    Chưa phát hiện lỗi luồng học nghiêm trọng.
                  </p>
                ) : (
                  <>
                    {blockingFlowErrors.map((issue) => (
                      <button
                        key={issue.id}
                        type="button"
                        onClick={() => issue.sceneId && onSelectScene(issue.sceneId)}
                        className="block w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-left text-sm text-red-800"
                      >
                        {issue.message}
                      </button>
                    ))}
                    {flowWarnings.slice(0, 4).map((issue) => (
                      <button
                        key={issue.id}
                        type="button"
                        onClick={() => issue.sceneId && onSelectScene(issue.sceneId)}
                        className="block w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-left text-sm text-amber-900"
                      >
                        {issue.message}
                      </button>
                    ))}
                    {flowWarnings.length > 4 && (
                      <p className="text-xs text-slate-500">+{flowWarnings.length - 4} lưu ý khác trong phần nâng cao.</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Hành động</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {!readOnly && (
              <>
                <Button type="button" variant="secondary" onClick={onSaveDraft} isLoading={saving} disabled={hasBlockingFlowErrors}>
                  <Save className="mr-1.5 h-4 w-4" /> Lưu bản nháp
                </Button>
                <Button type="button" onClick={onPublish} isLoading={publishing} disabled={hasBlockingFlowErrors}>
                  <Rocket className="mr-1.5 h-4 w-4" /> Phát hành
                </Button>
              </>
            )}
            <Button type="button" variant="secondary" onClick={onOpenAssignToClass} disabled={!canAssignToClass}>
              <PlusCircle className="mr-1.5 h-4 w-4" /> Gán vào lớp
            </Button>
          </div>
        </div>
      </div>

      <AdvancedEditorPanel
        show={showAdvancedTools}
        readOnly={readOnly}
        flowValidation={flowValidation}
        manifestText={manifestText}
        manifestError={manifestError}
        onToggle={onToggleAdvancedTools}
        onManifestTextChange={onManifestTextChange}
        onSelectScene={onSelectScene}
      />

      {report && report.overview.total_attempts > 0 && (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-sky-600" />
                <h3 className="text-sm font-semibold text-slate-900">Báo cáo sau khi học sinh học</h3>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Phần này chỉ hiện sau khi sách đã có dữ liệu từ học sinh, không còn nằm trong luồng soạn chính.
              </p>
            </div>
            <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {report.overview.total_attempts} attempts
            </div>
          </div>

          {reportLoading ? (
            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Đang tải báo cáo attempts...
            </div>
          ) : reportError ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {reportError}
            </div>
          ) : (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Hoàn thành</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{report.overview.completed_attempts}/{report.overview.total_attempts}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Điểm trung bình</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{report.overview.average_total_score}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Wrong trung bình</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{report.overview.average_wrong_count}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Retry trung bình</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{report.overview.average_retry_count}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
