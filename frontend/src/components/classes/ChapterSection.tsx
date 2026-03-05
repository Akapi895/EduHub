import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { useState } from 'react';
import type { Chapter } from '@/types';

interface ChapterSectionProps {
  chapter: Chapter;
}

export default function ChapterSection({ chapter }: ChapterSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-primary-lighter hover:bg-primary-light transition-colors"
      >
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-primary" />
        ) : (
          <ChevronRight className="w-5 h-5 text-primary" />
        )}
        <span className="font-medium text-gray-800">{chapter.name}</span>
        <span className="text-sm text-gray-400 ml-auto">
          {chapter.materials.length} tài liệu
        </span>
      </button>

      {isOpen && (
        <div className="divide-y divide-border">
          {chapter.materials.map((mat) => (
            <div
              key={mat.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <FileText className="w-4 h-4 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">{mat.title}</p>
                <p className="text-xs text-gray-400">{mat.subject} • {mat.material_type}</p>
              </div>
            </div>
          ))}
          {chapter.materials.length === 0 && (
            <div className="px-4 py-6 text-center text-gray-400 text-sm">
              Chưa có tài liệu nào
            </div>
          )}
        </div>
      )}
    </div>
  );
}
