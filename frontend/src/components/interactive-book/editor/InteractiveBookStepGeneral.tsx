import Input from '@/components/common/Input';
import type { InteractiveBookManifest } from '@/types';
import { GRADES, SUBJECTS } from '@/utils/constants';
import type { FormState } from '@/utils/interactiveBookEditorHelpers';
import MediaFieldCard from './MediaFieldCard';

interface InteractiveBookStepGeneralProps {
  form: FormState;
  readOnly?: boolean;
  previewManifest: InteractiveBookManifest | null;
  onFormChange: (patch: Partial<FormState>) => void;
  onUploadCover: (file: File) => Promise<void>;
  onChangeCoverUrl: (url: string) => void;
  coverUploading?: boolean;
}

export default function InteractiveBookStepGeneral({
  form,
  readOnly,
  previewManifest,
  onFormChange,
  onUploadCover,
  onChangeCoverUrl,
  coverUploading,
}: InteractiveBookStepGeneralProps) {
  return (
    <section className="space-y-6">
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Thông tin sách</h2>
            <p className="mt-1 text-sm text-slate-500">
              Nhập thông tin mà giáo viên và học sinh nhìn thấy trước khi mở sách.
            </p>
          </div>
          {previewManifest && (
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-wide text-slate-400">Tổng số cảnh</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{previewManifest.scenes.length}</p>
            </div>
          )}
        </div>

        <div className="mt-5 space-y-4">
          <Input
            label="Tên sách"
            value={form.title}
            onChange={(event) => onFormChange({ title: event.target.value })}
            placeholder="Ví dụ: Cậu bé thông minh"
            disabled={readOnly}
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Mô tả</label>
            <textarea
              value={form.description}
              onChange={(event) => onFormChange({ description: event.target.value })}
              rows={4}
              disabled={readOnly}
              className="w-full rounded-2xl border border-border px-4 py-3 text-sm outline-none transition-all focus:border-primary focus:ring-2 focus:ring-blue-300 disabled:bg-slate-50"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Môn học</label>
              <select
                value={form.subject}
                disabled={readOnly}
                onChange={(event) => onFormChange({ subject: event.target.value })}
                className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
              >
                {SUBJECTS.map((subject) => (
                  <option key={subject} value={subject}>{subject}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Khối lớp</label>
              <select
                value={form.grade}
                disabled={readOnly}
                onChange={(event) => onFormChange({ grade: event.target.value })}
                className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
              >
                {GRADES.map((grade) => (
                  <option key={grade} value={grade}>{grade}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <MediaFieldCard
              label="Ảnh bìa"
              url={form.thumbnail_url}
              accept="image/*"
              kind="image"
              description="Ưu tiên tải ảnh lên trực tiếp. Chỉ dùng liên kết ngoài khi thực sự cần."
              disabled={readOnly}
              uploading={coverUploading}
              onUploadFile={onUploadCover}
              onChange={onChangeCoverUrl}
            />
            <Input
              label="Thời lượng ước tính (phút)"
              value={form.estimated_duration}
              onChange={(event) => onFormChange({ estimated_duration: event.target.value })}
              placeholder="10"
              disabled={readOnly}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Mọi lần lưu ở trình biên soạn này đều cập nhật trực tiếp vào thư viện cá nhân của giáo viên. Nếu cần chia sẻ cho đồng nghiệp, hãy thực hiện từ thư viện sau khi hoàn tất nội dung.
          </div>
        </div>
      </div>
    </section>
  );
}
