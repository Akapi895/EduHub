import { useEffect } from 'react';
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';
import { dismissToast, useToastStore, type ToastItem, type ToastTone } from '@/store/toast.store';

const toastToneStyles: Record<
  ToastTone,
  {
    icon: typeof CheckCircle2;
    panelClassName: string;
    iconClassName: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    panelClassName: 'border-emerald-200 bg-emerald-50 text-emerald-950 shadow-emerald-100/70',
    iconClassName: 'text-emerald-600',
  },
  error: {
    icon: AlertCircle,
    panelClassName: 'border-rose-200 bg-rose-50 text-rose-950 shadow-rose-100/70',
    iconClassName: 'text-rose-600',
  },
  info: {
    icon: Info,
    panelClassName: 'border-sky-200 bg-sky-50 text-sky-950 shadow-sky-100/70',
    iconClassName: 'text-sky-600',
  },
  warning: {
    icon: TriangleAlert,
    panelClassName: 'border-amber-200 bg-amber-50 text-amber-950 shadow-amber-100/70',
    iconClassName: 'text-amber-600',
  },
};

function ToastCard({ toast }: { toast: ToastItem }) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      dismissToast(toast.id);
    }, toast.durationMs);

    return () => window.clearTimeout(timer);
  }, [toast.durationMs, toast.id]);

  const toneStyle = toastToneStyles[toast.tone];
  const Icon = toneStyle.icon;

  return (
    <div
      className={`pointer-events-auto w-[min(24rem,calc(100vw-2rem))] rounded-2xl border px-4 py-3 shadow-lg backdrop-blur ${toneStyle.panelClassName}`}
      role="status"
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${toneStyle.iconClassName}`} />
        <p className="flex-1 text-sm font-medium leading-5">{toast.message}</p>
        <button
          type="button"
          onClick={() => dismissToast(toast.id)}
          className="rounded-lg p-1 text-current/60 transition-colors hover:bg-black/5 hover:text-current"
          aria-label="Đóng thông báo"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div
      className="pointer-events-none fixed right-6 top-20 z-50 flex max-w-[calc(100vw-1rem)] flex-col gap-3"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
