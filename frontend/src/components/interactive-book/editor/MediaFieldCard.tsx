import { useMemo, useState, type DragEvent } from 'react';
import { UploadCloud } from 'lucide-react';

import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { getDisplayFileName, type UploadedAssetItem } from '@/utils/interactiveBookEditorHelpers';

interface MediaFieldCardProps {
  label: string;
  url: string;
  accept: string;
  kind: UploadedAssetItem['kind'];
  description?: string;
  disabled?: boolean;
  uploading?: boolean;
  showLinkEditor?: boolean;
  onToggleLinkEditor?: (visible: boolean) => void;
  onUploadFile: (file: File) => Promise<void>;
  onChange: (url: string) => void;
  dropHint?: string;
}

function isAcceptedFile(file: File, accept: string) {
  if (!accept.trim()) return true;
  const patterns = accept.split(',').map((item) => item.trim()).filter(Boolean);
  return patterns.some((pattern) => {
    if (pattern.endsWith('/*')) {
      return file.type.startsWith(pattern.replace('/*', '/'));
    }
    return file.type === pattern;
  });
}

export default function MediaFieldCard({
  label,
  url,
  accept,
  kind,
  description,
  disabled,
  uploading,
  showLinkEditor,
  onToggleLinkEditor,
  onUploadFile,
  onChange,
  dropHint,
}: MediaFieldCardProps) {
  const [dragActive, setDragActive] = useState(false);
  const hasValue = Boolean(url);
  const helperText = useMemo(
    () => dropHint ?? `Có thể kéo thả ${kind === 'audio' ? 'âm thanh' : kind === 'video' ? 'video' : 'ảnh'} trực tiếp vào thẻ này.`,
    [dropHint, kind],
  );

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (disabled) return;

    const file = event.dataTransfer.files?.[0];
    if (!file || !isAcceptedFile(file, accept)) return;
    await onUploadFile(file);
  };

  return (
    <div
      className={`rounded-2xl border p-4 transition ${dragActive ? 'border-sky-300 bg-sky-50' : 'border-slate-200 bg-slate-50'}`}
      onDragOver={(event) => {
        if (disabled) return;
        event.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(event) => { void handleDrop(event); }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          {description && <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>}
        </div>
        {hasValue && (
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
            Đã gắn tư liệu
          </span>
        )}
      </div>

      {hasValue && !showLinkEditor && (
        <div className="mt-4 space-y-3">
          {kind === 'image' && (
            <img
              src={url}
              alt={label}
              className="h-40 w-full rounded-2xl border border-slate-200 object-cover"
            />
          )}
          {kind === 'video' && (
            <video
              src={url}
              controls
              className="h-40 w-full rounded-2xl border border-slate-200 bg-slate-950 object-cover"
            />
          )}
          {kind === 'audio' && (
            <audio controls className="w-full" src={url}>
              Trình duyệt của bạn không hỗ trợ audio.
            </audio>
          )}
          <p className="text-xs text-slate-500">Tệp hiện tại: {getDisplayFileName(url)}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <label className={`inline-flex cursor-pointer items-center rounded-button border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-white'}`}>
          <UploadCloud className="mr-2 h-4 w-4" />
          {uploading ? 'Đang tải lên...' : hasValue ? 'Tải lại tệp' : 'Tải tệp lên'}
          <input
            type="file"
            accept={accept}
            className="hidden"
            disabled={disabled || uploading}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              await onUploadFile(file);
              event.target.value = '';
            }}
          />
        </label>
        {onToggleLinkEditor && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => onToggleLinkEditor(!showLinkEditor)}
          >
            {showLinkEditor ? 'Ẩn nhập liên kết' : 'Dùng liên kết ngoài'}
          </Button>
        )}
        {hasValue && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => onChange('')}
          >
            Xóa tệp
          </Button>
        )}
      </div>

      {showLinkEditor && (
        <div className="mt-4">
          <Input
            label="Liên kết ngoài"
            value={url}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            placeholder="https://..."
          />
        </div>
      )}

      <div className={`mt-3 rounded-2xl border border-dashed px-3 py-2 text-xs ${dragActive ? 'border-sky-300 text-sky-700' : 'border-slate-300 text-slate-500'}`}>
        {helperText}
      </div>
    </div>
  );
}
