import type { Material } from '@/types';
import Badge from '@/components/common/Badge';
import { formatDate } from '@/utils/helpers';
import { BookOpen, FileText, Video, ClipboardList } from 'lucide-react';

const typeIcons = {
  book: BookOpen,
  exam: ClipboardList,
  video: Video,
  reference: FileText,
  document: FileText,
};

const typeBadge = {
  book: { label: 'Sách', variant: 'blue' as const },
  exam: { label: 'Đề thi', variant: 'pink' as const },
  video: { label: 'Video', variant: 'purple' as const },
  reference: { label: 'Tham khảo', variant: 'mint' as const },
  document: { label: 'Tài liệu', variant: 'yellow' as const },
};

interface MaterialCardProps {
  material: Material;
  onClick?: () => void;
}

export default function MaterialCard({ material, onClick }: MaterialCardProps) {
  const Icon = typeIcons[material.material_type] || FileText;
  const badge = typeBadge[material.material_type];

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-card shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer overflow-hidden"
    >
      <div className="relative h-40 bg-gray-100">
        <img
          src={material.thumbnail_url}
          alt={material.title}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute top-3 left-3">
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-4 h-4 text-primary flex-shrink-0" />
          <h3 className="font-semibold text-gray-800 truncate">{material.title}</h3>
        </div>
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{material.description}</p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{material.subject}</span>
          <span>{formatDate(material.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
