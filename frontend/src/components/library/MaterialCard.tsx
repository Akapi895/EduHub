import { useState, useRef, useEffect } from 'react';
import type { Material, Folder } from '@/types';
import Badge from '@/components/common/Badge';
import { formatDate } from '@/utils/helpers';
import { BookOpen, FileText, Video, ClipboardList, MoreVertical, FolderOutput, Copy, Share2, Download, Trash2 } from 'lucide-react';

const typeIcons: Record<string, React.ElementType> = {
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

interface MaterialCardProps {
  material: Material;
  onClick?: () => void;
  folders?: Folder[];
  onRemoveFromFolder?: (materialId: string) => void;
  onCopy?: (materialId: string, folderId: string) => void;
  onShare?: (materialId: string) => void;
  onSave?: (materialId: string) => void;
  onDelete?: (materialId: string) => void;
  mode?: 'personal' | 'system';
}

export default function MaterialCard({
  material, onClick, folders, onRemoveFromFolder, onCopy, onShare, onSave, onDelete, mode,
}: MaterialCardProps) {
  const Icon = typeIcons[material.material_type] || FileText;
  const badge = typeBadge[material.material_type];
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

  const hasMenu = folders || onShare || onSave || onDelete;

  return (
    <div
      draggable={!!folders}
      onDragStart={handleDragStart}
      onClick={onClick}
      className="bg-white rounded-card shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer overflow-hidden relative group"
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

        {hasMenu && (
          <div ref={menuRef} className="absolute top-2 right-2 z-20">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); setSubmenu(null); }}
              className="p-1.5 bg-white/80 hover:bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical className="w-4 h-4 text-gray-600" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-9 w-52 bg-white rounded-lg shadow-lg border py-1 text-sm">
                {/* Remove from folder */}
                {material.folder_id && onRemoveFromFolder && (
                  <button
                    className="w-full px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-left"
                    onClick={(e) => { e.stopPropagation(); onRemoveFromFolder(material.id); setMenuOpen(false); setSubmenu(null); }}
                  >
                    <FolderOutput className="w-4 h-4" /> Xóa khỏi thư mục
                  </button>
                )}

                {/* Copy to folder */}
                {folders && folders.length > 0 && onCopy && (
                  <button
                    className="w-full px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-left"
                    onClick={(e) => { e.stopPropagation(); setSubmenu(submenu === 'copy' ? null : 'copy'); }}
                  >
                    <Copy className="w-4 h-4" /> Tạo bản sao trong thư mục
                  </button>
                )}
                {submenu === 'copy' && folders?.map((f) => (
                  <button
                    key={f.id}
                    className="w-full px-8 py-1.5 hover:bg-primary/10 text-left text-gray-600 truncate"
                    onClick={(e) => { e.stopPropagation(); onCopy!(material.id, f.id); setMenuOpen(false); setSubmenu(null); }}
                  >
                    {f.name}
                  </button>
                ))}

                {/* Share to system */}
                {mode === 'personal' && onShare && (
                  <button
                    className="w-full px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-left"
                    onClick={(e) => { e.stopPropagation(); onShare(material.id); setMenuOpen(false); }}
                  >
                    <Share2 className="w-4 h-4" /> Chia sẻ vào thư viện chung
                  </button>
                )}

                {/* Save from system */}
                {mode === 'system' && onSave && (
                  <button
                    className="w-full px-3 py-2 hover:bg-gray-50 flex items-center gap-2 text-left"
                    onClick={(e) => { e.stopPropagation(); onSave(material.id); setMenuOpen(false); }}
                  >
                    <Download className="w-4 h-4" /> Lưu về thư viện cá nhân
                  </button>
                )}

                {/* Delete */}
                {mode === 'personal' && onDelete && (
                  <>
                    <div className="border-t border-gray-100 my-1" />
                    <button
                      className="w-full px-3 py-2 hover:bg-red-50 flex items-center gap-2 text-left text-red-500"
                      onClick={(e) => { e.stopPropagation(); onDelete(material.id); setMenuOpen(false); }}
                    >
                      <Trash2 className="w-4 h-4" /> Xóa tài liệu
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
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
        {material.shared_by_name && (
          <p className="text-xs text-blue-500 mt-1">Chia sẻ bởi: {material.shared_by_name}</p>
        )}
      </div>
    </div>
  );
}
