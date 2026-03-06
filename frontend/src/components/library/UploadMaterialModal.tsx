import { useState, useRef } from 'react';
import { ImagePlus, X } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import Input from '@/components/common/Input';
import { SUBJECTS, GRADES } from '@/utils/constants';
import api from '@/services/api';

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

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnailFile(file);
    const reader = new FileReader();
    reader.onload = () => setThumbnailPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = '';
  };

  const uploadFile = async (file: File, subDir: string): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post(`/upload?sub_dir=${subDir}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      let thumbnail_url: string | undefined;
      let file_url: string | undefined;

      if (thumbnailFile) {
        thumbnail_url = await uploadFile(thumbnailFile, 'thumbnails');
      }
      if (docFile) {
        file_url = await uploadFile(docFile, 'materials');
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

      // Reset form
      setTitle('');
      setDescription('');
      removeThumbnail();
      setDocFile(null);
    } catch {
      // error handled by parent
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
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nhập tên tài liệu"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Mô tả ngắn gọn"
            rows={3}
            className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none transition-all resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
            <select
              value={materialType}
              onChange={(e) => setMaterialType(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none"
            >
              <option value="book">Sách</option>
              <option value="exam">Đề thi</option>
              <option value="video">Video</option>
              <option value="reference">Tham khảo</option>
              <option value="document">Tài liệu</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Môn học</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none"
            >
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Khối lớp</label>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none"
          >
            {GRADES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>

        {/* Thumbnail */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh thumbnail</label>
          {thumbnailPreview ? (
            <div className="relative w-full h-40 rounded-xl overflow-hidden border border-border">
              <img
                src={thumbnailPreview}
                alt="Thumbnail preview"
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={removeThumbnail}
                className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-white"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => thumbnailInputRef.current?.click()}
              className="w-full h-32 rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-2 text-gray-400 hover:border-primary hover:text-primary transition-colors"
            >
              <ImagePlus className="w-8 h-8" />
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

        {/* Document file */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chọn file tài liệu</label>
          <input
            type="file"
            onChange={(e) => setDocFile(e.target.files?.[0] || null)}
            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-primary-lighter file:text-primary hover:file:bg-primary-light"
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
