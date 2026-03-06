import { ArrowLeft, CheckCircle2, Clock, Eye, Play } from 'lucide-react';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import { formatDate } from '@/utils/helpers';
import type { Exam, Submission } from '@/types';

interface Props {
  exam: Exam;
  pastSubmissions: Submission[];
  maxAttempts: number;
  completedCount: number;
  canStartNew: boolean;
  allowReview: boolean;
  onStartNew: () => void;
  onReview: (submissionId: string) => void;
  onBack: () => void;
}

export default function ExamHistoryView({
  exam, pastSubmissions, maxAttempts, completedCount,
  canStartNew, allowReview, onStartNew, onReview, onBack,
}: Props) {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{exam.title}</h1>
          <p className="text-sm text-gray-500">
            Tối đa {maxAttempts} lượt • Đã làm {completedCount}/{maxAttempts}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-card shadow-sm divide-y divide-border">
        {pastSubmissions.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="mb-1">Bạn chưa làm bài thi này</p>
            <p className="text-xs">Nhấn nút bên dưới để bắt đầu</p>
          </div>
        ) : (
          pastSubmissions.map((sub, idx) => (
            <div key={sub.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  sub.status === 'graded' ? 'bg-green-100' : sub.status === 'submitted' ? 'bg-yellow-100' : 'bg-gray-100'
                }`}>
                  {sub.status === 'graded' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> :
                   sub.status === 'submitted' ? <Clock className="w-5 h-5 text-yellow-600" /> :
                   <Play className="w-5 h-5 text-gray-500" />}
                </div>
                <div>
                  <p className="font-medium text-gray-800">Lượt {pastSubmissions.length - idx}</p>
                  <p className="text-xs text-gray-400">
                    {sub.submitted_at ? `Nộp: ${formatDate(sub.submitted_at)}` : `Bắt đầu: ${formatDate(sub.started_at)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {sub.total_score != null && (
                  <span className="text-lg font-bold text-primary">{sub.total_score} điểm</span>
                )}
                <Badge variant={sub.status === 'graded' ? 'mint' : sub.status === 'submitted' ? 'yellow' : 'gray'}>
                  {sub.status === 'graded' ? 'Đã chấm' : sub.status === 'submitted' ? 'Đã nộp' : 'Đang làm'}
                </Badge>
                {allowReview && sub.status !== 'in_progress' && (
                  <Button size="sm" variant="secondary" onClick={() => onReview(sub.id)}>
                    <Eye className="w-4 h-4 mr-1" /> Xem lại
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {canStartNew && (
        <Button onClick={onStartNew} className="w-full">
          <Play className="w-4 h-4 mr-2" />
          {completedCount === 0 ? 'Bắt đầu làm bài' : 'Làm lại bài thi'}
        </Button>
      )}
      {!canStartNew && completedCount >= maxAttempts && (
        <p className="text-center text-sm text-gray-400">Bạn đã hết lượt làm bài</p>
      )}
      {!canStartNew && exam.status !== 'open' && completedCount < maxAttempts && (
        <p className="text-center text-sm text-gray-400">
          {exam.status === 'upcoming' ? 'Bài thi chưa mở' : 'Bài thi đã đóng'}
        </p>
      )}
    </div>
  );
}
