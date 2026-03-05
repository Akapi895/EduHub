import type { ClassStudent } from '@/types';
import { getInitials, formatDate } from '@/utils/helpers';
import { Trash2 } from 'lucide-react';

interface StudentTableProps {
  students: ClassStudent[];
  onRemove?: (studentId: string) => void;
}

export default function StudentTable({ students, onRemove }: StudentTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full">
        <thead>
          <tr className="bg-primary-lighter border-b border-border">
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Học sinh</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Ngày tham gia</th>
            {onRemove && (
              <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700"></th>
            )}
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id} className="border-b border-border last:border-0 hover:bg-blue-50 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                    {getInitials(student.full_name)}
                  </div>
                  <span className="text-sm font-medium text-gray-800">{student.full_name}</span>
                </div>
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{student.email}</td>
              <td className="px-4 py-3 text-sm text-gray-500">{formatDate(student.joined_at)}</td>
              {onRemove && (
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onRemove(student.student_id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              )}
            </tr>
          ))}
          {students.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                Chưa có học sinh nào
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
