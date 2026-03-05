import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileText, BookOpen, Video, ClipboardList, Download, Loader2 } from 'lucide-react';
import Badge from '@/components/common/Badge';
import { libraryService } from '@/services/library.service';
import { formatDate } from '@/utils/helpers';
import type { Material } from '@/types';

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  book: BookOpen,
  exam: ClipboardList,
  video: Video,
  reference: FileText,
  document: FileText,
};

const typeBadge: Record<string, { label: string; variant: 'blue' | 'pink' | 'purple' | 'mint' | 'yellow' }> = {
  book: { label: 'Sách', variant: 'blue' },
  exam: { label: 'Đề thi', variant: 'pink' },
  video: { label: 'Video', variant: 'purple' },
  reference: { label: 'Tham khảo', variant: 'mint' },
  document: { label: 'Tài liệu', variant: 'yellow' },
};

export default function MaterialDetail() {
  const { id } = useParams();
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    libraryService
      .getMaterial(id)
      .then((res) => setMaterial(res.data.data))
      .catch(() => setMaterial(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!material) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">Không tìm thấy tài liệu</p>
        <Link to="/teacher/library/personal" className="text-primary hover:underline mt-2 inline-block">
          Quay lại thư viện
        </Link>
      </div>
    );
  }

  const Icon = typeIcons[material.material_type] || FileText;
  const badge = typeBadge[material.material_type];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/teacher/library/personal" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">Chi tiết tài liệu</h1>
      </div>

      <div className="bg-white rounded-card shadow-sm overflow-hidden">
        {material.thumbnail_url && (
          <div className="h-64 bg-gray-100">
            <img
              src={material.thumbnail_url}
              alt={material.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Icon className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-bold text-gray-800">{material.title}</h2>
            </div>
            {badge && <Badge variant={badge.variant}>{badge.label}</Badge>}
          </div>

          {material.description && (
            <p className="text-gray-600">{material.description}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
            {material.subject && <span>Môn: {material.subject}</span>}
            {material.grade && <span>Khối: {material.grade}</span>}
            <span>Ngày tạo: {formatDate(material.created_at)}</span>
          </div>

          {material.file_url && (
            <div className="pt-4 border-t border-border">
              {material.material_type === 'video' ? (
                <video controls className="w-full rounded-xl" src={material.file_url}>
                  Trình duyệt không hỗ trợ video.
                </video>
              ) : material.file_url.endsWith('.pdf') ? (
                <iframe
                  src={material.file_url}
                  title={material.title}
                  className="w-full h-[600px] rounded-xl border border-border"
                />
              ) : (
                <a
                  href={material.file_url}
                  download
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Tải xuống tài liệu
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
