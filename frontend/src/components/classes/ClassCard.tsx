import type { Class } from '@/types';
import { Users, BookOpen, FileText } from 'lucide-react';

interface ClassCardProps {
  classData: Class;
  onClick?: () => void;
}

export default function ClassCard({ classData, onClick }: ClassCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-card shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer overflow-hidden max-w-[280px]"
    >
      <div className="h-28 bg-gradient-to-br from-primary to-blue-400 relative">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute bottom-2 left-3 right-3">
          <h3 className="text-sm font-bold text-white line-clamp-1">{classData.name}</h3>
        </div>
      </div>
      <div className="p-3">
        {classData.teacher_name && (
          <p className="text-xs text-gray-500 mb-2 truncate">{classData.teacher_name}</p>
        )}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{classData.student_count ?? 0}</span>
          <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{classData.material_count ?? 0}</span>
          <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{classData.exam_count ?? 0}</span>
        </div>
      </div>
    </div>
  );
}
