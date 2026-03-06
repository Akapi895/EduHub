import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Loader2 } from 'lucide-react';
import ExamCard from '@/components/exam/ExamCard';
import { examService } from '@/services/exam.service';
import type { Exam } from '@/types';

export default function StudentExams() {
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    examService.getAllMyExams().then((res) => {
      setExams(res.data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const notDone = exams.filter((e) => e.student_status !== 'completed');
  const done = exams.filter((e) => e.student_status === 'completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <ClipboardList className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-gray-800">Bài thi của tôi</h1>
      </div>

      {/* Chưa làm */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Chưa làm ({notDone.length})
        </h2>
        {notDone.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {notDone.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                onClick={() => navigate(`/student/exam/${exam.id}`)}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400 py-6">Không có bài thi nào chưa làm</p>
        )}
      </section>

      {/* Đã làm */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Đã làm ({done.length})
        </h2>
        {done.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {done.map((exam) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                onClick={() => navigate(`/student/exam/${exam.id}`)}
              />
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-400 py-6">Chưa làm bài thi nào</p>
        )}
      </section>
    </div>
  );
}
