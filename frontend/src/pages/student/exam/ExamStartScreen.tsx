import { AlertTriangle, ArrowLeft, Clock, ClipboardList, Play } from 'lucide-react';
import Button from '@/components/common/Button';
import type { Exam } from '@/types';

interface Props {
  exam: Exam;
  maxAttempts: number;
  completedCount: number;
  onStart: () => void;
  onBack: () => void;
}

export default function ExamStartScreen({ exam, maxAttempts, completedCount, onStart, onBack }: Props) {
  return (
    <div className="max-w-lg mx-auto py-12">
      <div className="bg-white rounded-card shadow-sm p-8">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-primary-lighter rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">{exam.title}</h1>
          {exam.description && (
            <p className="text-sm text-gray-500">{exam.description}</p>
          )}
        </div>

        <div className="space-y-3 mb-6">
          {exam.duration_minutes && (
            <div className="flex items-center gap-3 px-4 py-3 bg-blue-50 rounded-xl">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-800">Thời gian làm bài: <strong>{exam.duration_minutes} phút</strong></span>
            </div>
          )}
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
            <ClipboardList className="w-5 h-5 text-gray-600" />
            <span className="text-sm text-gray-700">Số câu hỏi: <strong>{exam.question_count ?? '—'} câu</strong></span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl">
            <Play className="w-5 h-5 text-gray-600" />
            <span className="text-sm text-gray-700">Lượt còn lại: <strong>{maxAttempts - completedCount}/{maxAttempts}</strong></span>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-6">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-yellow-800">Sau khi bắt đầu, thời gian sẽ được tính ngay. Bạn không thể tạm dừng giữa chừng.</p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại
          </Button>
          <Button className="flex-1" onClick={onStart}>
            <Play className="w-4 h-4 mr-1" /> Bắt đầu làm bài
          </Button>
        </div>
      </div>
    </div>
  );
}
