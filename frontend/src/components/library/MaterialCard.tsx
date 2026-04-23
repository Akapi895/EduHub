import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ClipboardList,
  Copy,
  Download,
  FileText,
  FolderOutput,
  MoreVertical,
  Share2,
  Trash2,
  Video,
  Wand2,
} from 'lucide-react';

import type { Folder, Material } from '@/types';
import Badge from '@/components/common/Badge';
import { formatDate } from '@/utils/helpers';

const typeIcons: Record<string, React.ElementType> = {
  book: BookOpen,
  exam: ClipboardList,
  video: Video,
  reference: FileText,
  document: FileText,
  interactive_book: Wand2,
};

const typeBadge: Record<
  string,
  { label: string; variant: 'blue' | 'pink' | 'purple' | 'mint' | 'yellow' | 'gray' }
> = {
  book: { label: 'Sách', variant: 'blue' },
  exam: { label: 'Đề thi', variant: 'pink' },
  video: { label: 'Video', variant: 'purple' },
  reference: { label: 'Tham khảo', variant: 'mint' },
  document: { label: 'Tài liệu', variant: 'yellow' },
  interactive_book: { label: 'Sách tương tác', variant: 'purple' },
};

function getMaterialBadge(materialType: string | undefined) {
  if (materialType && typeBadge[materialType]) {
    return typeBadge[materialType];
  }

  return {
    label: materialType ? materialType.replace(/_/g, ' ') : 'Khac',
    variant: 'gray' as const,
  };
}

interface MaterialCardProps {
  material: Material;
  onClick?: () => void;
  folders?: Folder[];
  onRemoveFromFolder?: (materialId: string) => void;
  onCopy?: (materialId: string, folderId: string) => void;
  onShare?: (materialId: string) => void;
  onUnshare?: (materialId: string) => void;
  onSave?: (materialId: string) => void;
  onDelete?: (materialId: string) => void;
  mode?: 'personal' | 'system';
  shareLabel?: string;
  canSave?: boolean;
  canUnshare?: boolean;
}

export default function MaterialCard({
  material,
  onClick,
  folders,
  onRemoveFromFolder,
  onCopy,
  onShare,
  onUnshare,
  onSave,
  onDelete,
  mode,
  shareLabel = 'Đẩy lên thư viện chung',
  canSave = true,
  canUnshare = false,
}: MaterialCardProps) {
  const Icon = typeIcons[material.material_type] || FileText;
  const badge = getMaterialBadge(material.material_type);
  const [menuOpen, setMenuOpen] = useState(false);
  const [submenu, setSubmenu] = useState<'copy' | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setSubmenu(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('materialId', material.id);
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const hasMenu = folders || onShare || onUnshare || onSave || onDelete;

  return (
    <div
      draggable={Boolean(folders)}
      onDragStart={handleDragStart}
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-card bg-white shadow-md transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
    >
      <div className="relative h-40 bg-gray-100">
        <img
          src={material.thumbnail_url}
          alt={material.title}
          className="h-full w-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute left-3 top-3">
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>

        {hasMenu && (
          <div ref={menuRef} className="absolute right-2 top-2 z-20">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
                setSubmenu(null);
              }}
              className="rounded-full bg-white/90 p-1.5 shadow transition-opacity hover:bg-white"
            >
              <MoreVertical className="h-4 w-4 text-gray-600" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-9 w-56 rounded-lg border bg-white py-1 text-sm shadow-lg">
                {material.folder_id && onRemoveFromFolder && (
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFromFolder(material.id);
                      setMenuOpen(false);
                      setSubmenu(null);
                    }}
                  >
                    <FolderOutput className="h-4 w-4" /> Xóa khỏi thư mục
                  </button>
                )}

                {folders && folders.length > 0 && onCopy && (
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSubmenu(submenu === 'copy' ? null : 'copy');
                    }}
                  >
                    <Copy className="h-4 w-4" /> Tạo bản sao trong thư mục
                  </button>
                )}
                {submenu === 'copy' &&
                  folders?.map((folder) => (
                    <button
                      key={folder.id}
                      className="w-full truncate px-8 py-1.5 text-left text-gray-600 hover:bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopy?.(material.id, folder.id);
                        setMenuOpen(false);
                        setSubmenu(null);
                      }}
                    >
                      {folder.name}
                    </button>
                  ))}

                {mode === 'personal' && onShare && (
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      onShare(material.id);
                      setMenuOpen(false);
                    }}
                  >
                    <Share2 className="h-4 w-4" /> {shareLabel}
                  </button>
                )}

                {mode === 'system' && canUnshare && onUnshare && (
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUnshare(material.id);
                      setMenuOpen(false);
                    }}
                  >
                    <Share2 className="h-4 w-4" /> Gỡ khỏi thư viện chung
                  </button>
                )}

                {mode === 'system' && canSave && onSave && (
                  <button
                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSave(material.id);
                      setMenuOpen(false);
                    }}
                  >
                    <Download className="h-4 w-4" /> Lưu về thư viện cá nhân
                  </button>
                )}

                {mode === 'personal' && onDelete && (
                  <>
                    <div className="my-1 border-t border-gray-100" />
                    <button
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-red-500 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(material.id);
                        setMenuOpen(false);
                      }}
                    >
                      <Trash2 className="h-4 w-4" /> Xóa tài liệu
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <Icon className="h-4 w-4 flex-shrink-0 text-primary" />
          <h3 className="truncate font-semibold text-gray-800">{material.title}</h3>
        </div>
        <p className="mb-3 line-clamp-2 text-sm text-gray-500">{material.description}</p>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{material.subject}</span>
          <span>{formatDate(material.created_at)}</span>
        </div>
        {material.material_type === 'interactive_book' && (
          <div className="mt-2 space-y-1">
            <p className="text-xs text-purple-600">
              {material.interactive_status === 'published' ? 'Đã phát hành' : 'Chưa phát hành'}
              {material.estimated_duration ? ` • ${material.estimated_duration} phút` : ''}
            </p>
            <p className="text-xs font-medium text-slate-500">
              Mở để chỉnh sửa và xem thử theo từng sự kiện.
            </p>
          </div>
        )}
        {material.shared_by_name && (
          <p className="mt-1 text-xs text-blue-500">
            Chia sẻ bởi: {material.shared_by_name}
          </p>
        )}
      </div>
    </div>
  );
}
