import type { Class } from '@/types';
import { Users } from 'lucide-react';

interface ClassCardProps {
  classData: Class;
  onClick?: () => void;
}

export default function ClassCard({ classData, onClick }: ClassCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-card shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer overflow-hidden"
    >
      <div className="h-36 bg-gradient-to-br from-primary to-blue-400 relative">
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
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-lg font-bold text-white">{classData.name}</h3>
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm text-gray-500 mb-3">{classData.teacher_name}</p>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Users className="w-4 h-4" />
          <span>{classData.student_count} học sinh</span>
        </div>
      </div>
    </div>
  );
}
