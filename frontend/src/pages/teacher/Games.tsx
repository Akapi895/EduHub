import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Gamepad2,
  GraduationCap,
  Loader2,
  Plus,
  Sparkles,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import Button from '@/components/common/Button';
import { classService } from '@/services/class.service';
import { showErrorToast } from '@/store/toast.store';
import type { Class } from '@/types';

export default function TeacherGames() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    classService.getClasses()
      .then((response) => {
        if (cancelled) return;
        setClasses(Array.isArray(response.data.data) ? response.data.data : []);
      })
      .catch(() => {
        if (cancelled) return;
        setClasses([]);
        showErrorToast('Không thể tải danh sách lớp học.');
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.22),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.18),_transparent_28%),linear-gradient(135deg,#0f172a,#1e293b)] px-6 py-7 text-white shadow-xl sm:px-8">
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Khu vực trò chơi
          </div>
          <div>
            <h1 className="text-3xl font-semibold sm:text-4xl">Tạo và quản lý trò chơi cho từng lớp</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
              Chọn một lớp để tạo gói trò chơi, soạn câu hỏi và giao cho học sinh vào chơi.
            </p>
          </div>
        </div>
      </section>

      {loading ? (
        <div className="flex justify-center rounded-[28px] border border-slate-200 bg-white py-20 shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : classes.length === 0 ? (
        <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">Bạn chưa có lớp học nào</p>
          <p className="mt-2 text-sm text-slate-500">
            Hãy tạo lớp trước, sau đó thêm gói trò chơi cho học sinh trong từng lớp.
          </p>
          <Button className="mt-5" onClick={() => navigate('/teacher/classes')}>
            <Plus className="mr-1.5 h-4 w-4" />
            Đi tới quản lý lớp học
          </Button>
        </section>
      ) : (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Chọn lớp để quản lý trò chơi</h2>
            <p className="mt-1 text-sm text-slate-500">
              Mỗi gói trò chơi được tạo theo từng lớp để dễ giao bài và theo dõi tiến độ của học sinh.
            </p>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            {classes.map((classItem) => (
              <article
                key={classItem.id}
                className="overflow-hidden rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                      <GraduationCap className="h-3.5 w-3.5 text-sky-500" />
                      Lớp học
                    </div>

                    <div>
                      <h3 className="text-2xl font-semibold text-slate-900">{classItem.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {classItem.description || 'Lớp học này đã sẵn sàng để thêm gói trò chơi cho học sinh.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                        <Users className="h-3.5 w-3.5 text-emerald-500" />
                        {typeof classItem.student_count === 'number' ? `${classItem.student_count} học sinh` : 'Quản lý theo lớp'}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                        <Gamepad2 className="h-3.5 w-3.5 text-amber-500" />
                        Gói trò chơi riêng
                      </span>
                    </div>
                  </div>

                  <div className="grid min-w-[220px] gap-3">
                    <Button
                      type="button"
                      variant="secondary"
                      className="justify-center"
                      onClick={() => navigate(`/teacher/classes/${classItem.id}?tab=games`)}
                    >
                      <ArrowRight className="mr-1.5 h-4 w-4" />
                      Mở danh sách trò chơi
                    </Button>
                    <Button
                      type="button"
                      className="justify-center"
                      onClick={() => navigate(`/teacher/classes/${classItem.id}/games/create`)}
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Tạo gói trò chơi mới
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
