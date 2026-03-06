import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Loader2 } from 'lucide-react';
import Table from '@/components/common/Table';
import Badge from '@/components/common/Badge';
import { examService } from '@/services/exam.service';
import { formatDateTime } from '@/utils/helpers';

interface SubmissionRow {
  [key: string]: unknown;
  id: string;
  exam_id: string;
  exam_title: string | null;
  class_name: string | null;
  class_id: string | null;
  started_at: string | null;
  submitted_at: string | null;
  total_score: number | null;
  status: string;
  allow_review: boolean;
  duration_minutes: number | null;
}

const statusMap: Record<string, { label: string; variant: 'mint' | 'yellow' | 'gray' }> = {
  graded: { label: 'Đã chấm', variant: 'mint' },
  submitted: { label: 'Đã nộp', variant: 'yellow' },
  in_progress: { label: 'Đang làm', variant: 'gray' },
};

export default function StudentExams() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    examService.getAllMySubmissions().then((res) => {
      setSubmissions(res.data.data || []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      key: 'exam_title',
      label: 'Bài thi',
      render: (row: SubmissionRow) => (
        <span className="font-medium text-gray-800">{row.exam_title || '—'}</span>
      ),
    },
    {
      key: 'class_name',
      label: 'Lớp học',
      render: (row: SubmissionRow) => (
        <span className="text-gray-600">{row.class_name || '—'}</span>
      ),
    },
    {
      key: 'started_at',
      label: 'Thời gian làm',
      render: (row: SubmissionRow) => (
        <span className="text-gray-500 text-xs">{row.started_at ? formatDateTime(row.started_at) : '—'}</span>
      ),
    },
    {
      key: 'total_score',
      label: 'Điểm',
      render: (row: SubmissionRow) => (
        row.total_score != null
          ? <span className="font-bold text-primary">{row.total_score}</span>
          : <span className="text-gray-400">—</span>
      ),
    },
    {
      key: 'status',
      label: 'Trạng thái',
      render: (row: SubmissionRow) => {
        const s = statusMap[row.status] || statusMap.in_progress;
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ClipboardList className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-gray-800">Bài thi của tôi</h1>
      </div>

      <Table<SubmissionRow>
        columns={columns}
        data={submissions}
        onRowClick={(row) => {
          if (row.allow_review && row.status !== 'in_progress') {
            navigate(`/student/exam/${row.exam_id}`);
          } else if (row.status === 'in_progress') {
            navigate(`/student/exam/${row.exam_id}`);
          }
        }}
      />
    </div>
  );
}
