import type { Exam } from '@/types';
import Badge from '@/components/common/Badge';
import { formatDateTime } from '@/utils/helpers';
import { Clock, CheckCircle2, Play } from 'lucide-react';

const statusBadge = {
  upcoming: { label: 'Sắp mở', variant: 'yellow' as const },
  open: { label: 'Đang mở', variant: 'mint' as const },
  closed: { label: 'Đã đóng', variant: 'gray' as const },
};

const studentStatusBadge = {
  completed: { label: 'Đã làm', variant: 'mint' as const, icon: CheckCircle2 },
  in_progress: { label: 'Đang làm', variant: 'yellow' as const, icon: Play },
  not_started: { label: 'Chưa làm', variant: 'gray' as const, icon: null },
};

interface ExamCardProps {
  exam: Exam;
  onClick?: () => void;
}

export default function ExamCard({ exam, onClick }: ExamCardProps) {
  const badge = statusBadge[exam.status];
  const sBadge = exam.student_status ? studentStatusBadge[exam.student_status] : null;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-card shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer overflow-hidden"
    >
      <div className="h-32 bg-gradient-to-br from-primary-light to-accent-purple relative">
        {exam.thumbnail_url && (
          <img
            src={exam.thumbnail_url}
            alt={exam.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <div className="absolute top-3 right-3">
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        {sBadge && sBadge.icon && (
          <div className="absolute top-3 left-3">
            <Badge variant={sBadge.variant}>
              <sBadge.icon className="w-3 h-3 mr-1" />
              {sBadge.label}
            </Badge>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-gray-800 mb-2">{exam.title}</h3>
        {exam.class_name && (
          <p className="text-xs text-primary font-medium mb-1">{exam.class_name}</p>
        )}
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{exam.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDateTime(exam.start_time)}</span>
            </div>
            {exam.question_count !== undefined && (
              <span>{exam.question_count} câu hỏi</span>
            )}
          </div>
          {exam.student_status === 'completed' && exam.best_score != null && (
            <span className="text-sm font-bold text-primary">{exam.best_score} điểm</span>
          )}
        </div>
      </div>
    </div>
  );
}
