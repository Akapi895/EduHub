import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';

import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import Modal from '@/components/common/Modal';
import api from '@/services/api';
import { showErrorToast } from '@/store/toast.store';
import { GRADES, SUBJECTS } from '@/utils/constants';

interface UploadedFilePayload {
  url: string;
  thumbnail_url?: string;
}

interface UploadMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderId?: string;
  onSubmit: (data: {
    title: string;
    description: string;
    material_type: string;
    subject: string;
    grade: string;
    thumbnail_url?: string;
    file_url?: string;
    folder_id?: string;
  }) => void;
}

export default function UploadMaterialModal({
  isOpen,
  onClose,
  folderId,
  onSubmit,
}: UploadMaterialModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [materialType, setMaterialType] = useState('document');
  const [subject, setSubject] = useState<string>(SUBJECTS[0]);
  const [grade, setGrade] = useState<string>(GRADES[0]);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const handleThumbnailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    const reader = new FileReader();
    reader.onload = () => setThumbnailPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (thumbnailInputRef.current) {
      thumbnailInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File, subDir: string): Promise<UploadedFilePayload> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(`/upload?sub_dir=${subDir}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data as UploadedFilePayload;
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    removeThumbnail();
    setDocFile(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setUploading(true);
    try {
      let thumbnail_url: string | undefined;
      let file_url: string | undefined;

      if (docFile) {
        const uploadedDocument = await uploadFile(docFile, 'materials');
        file_url = uploadedDocument.url;
        thumbnail_url = uploadedDocument.thumbnail_url;
      }

      if (thumbnailFile) {
        const uploadedThumbnail = await uploadFile(thumbnailFile, 'thumbnails');
        thumbnail_url = uploadedThumbnail.url;
      }

      await onSubmit({
        title,
        description,
        material_type: materialType,
        subject,
        grade,
        thumbnail_url,
        file_url,
        folder_id: folderId,
      });

      resetForm();
    } catch (err: any) {
      const message = err.response?.data?.message || err.response?.data?.detail || 'Upload tài liệu thất bại';
      showErrorToast(message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload tài liệu" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Tên tài liệu"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Nhập tên tài liệu"
          required
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Mô tả</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Mô tả ngắn gọn"
            rows={3}
            className="w-full resize-none rounded-xl border border-border px-4 py-2.5 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Loại</label>
            <select
              value={materialType}
              onChange={(event) => setMaterialType(event.target.value)}
              className="w-full rounded-xl border border-border px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
            >
              <option value="book">Sách</option>
              <option value="exam">Đề thi</option>
              <option value="video">Video</option>
              <option value="reference">Tham khảo</option>
              <option value="document">Tài liệu</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Môn học</label>
            <select
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              className="w-full rounded-xl border border-border px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
            >
              {SUBJECTS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Khối lớp</label>
          <select
            value={grade}
            onChange={(event) => setGrade(event.target.value)}
            className="w-full rounded-xl border border-border px-4 py-2.5 outline-none focus:border-primary focus:ring-2 focus:ring-blue-300"
          >
            {GRADES.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Ảnh thumbnail (Optional)</label>
          {/* {!thumbnailPreview && (
            <p className="mb-2 text-xs text-gray-500">
              Có thể bỏ trống. Hệ thống sẽ tự tạo thumbnail khi file hỗ trợ, ví dụ lấy trang đầu của PDF.
            </p>
          )} */}

          {thumbnailPreview ? (
            <div className="relative h-40 w-full overflow-hidden rounded-xl border border-border">
              <img
                src={thumbnailPreview}
                alt="Thumbnail preview"
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={removeThumbnail}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 shadow hover:bg-white"
              >
                <X className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => thumbnailInputRef.current?.click()}
              className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 text-gray-400 transition-colors hover:border-primary hover:text-primary"
            >
              <ImagePlus className="h-8 w-8" />
              <span className="text-sm">Chọn ảnh thumbnail</span>
            </button>
          )}

          <input
            ref={thumbnailInputRef}
            type="file"
            accept="image/*"
            onChange={handleThumbnailChange}
            className="hidden"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Chọn file tài liệu</label>
          <input
            type="file"
            onChange={(event) => setDocFile(event.target.files?.[0] || null)}
            className="w-full text-sm text-gray-500 file:mr-4 file:rounded-xl file:border-0 file:bg-primary-lighter file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary-light"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>Hủy</Button>
          <Button type="submit" disabled={uploading || !title}>
            {uploading ? 'Đang upload...' : 'Upload'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
