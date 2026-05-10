import type { Class } from '@/types';
import { Users, BookOpen, FileText, MoreVertical, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface ClassCardProps {
  classData: Class;
  onClick?: () => void;
  onDelete?: (id: string) => void;
  showDelete?: boolean;
}

export default function ClassCard({ classData, onClick, onDelete, showDelete }: ClassCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const colors = [
    'from-primary to-blue-400',
    'from-emerald-500 to-teal-400',
    'from-violet-500 to-purple-400',
    'from-rose-500 to-pink-400',
    'from-amber-500 to-orange-400',
    'from-cyan-500 to-sky-400',
  ];
  const colorIndex = classData.name.charCodeAt(0) % colors.length;
  const gradientClass = colors[colorIndex];

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-2xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden group relative"
    >
      {/* Thumbnail/Header */}
      <div className={`h-36 bg-gradient-to-br ${gradientClass} relative`}>
        {classData.thumbnail_url && (
          <img
            src={classData.thumbnail_url}
            alt={classData.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* Delete button */}
        {showDelete && onDelete && (
          <div ref={menuRef} className="absolute top-3 right-3 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="p-2 rounded-full bg-white/90 shadow-md hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="w-4 h-4 text-gray-600" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 w-48 rounded-xl bg-white shadow-xl py-1 border border-gray-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(classData.id);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa lớp học
                </button>
              </div>
            )}
          </div>
        )}

        {/* Class name badge */}
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-lg font-bold text-white drop-shadow-md line-clamp-1">{classData.name}</h3>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {classData.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-3">{classData.description}</p>
        )}
        {classData.subject && (
          <span className="inline-block text-xs font-medium px-2.5 py-1 bg-primary/10 text-primary rounded-full mb-3">
            {classData.subject}
          </span>
        )}
        <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <Users className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{classData.student_count ?? 0}</span>
            <span className="text-gray-400">học sinh</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <BookOpen className="w-4 h-4 text-gray-400" />
            <span className="font-medium">{classData.material_count ?? 0}</span>
            <span className="text-gray-400">tài liệu</span>
          </div>
        </div>
      </div>
    </div>
  );
}
