import type { ReactNode } from 'react';

import Badge from '@/components/common/Badge';
import type { EditorStepDefinition, EditorStepKey } from '@/utils/interactiveBookEditorLabels';

type StepBadgeVariant = 'blue' | 'pink' | 'purple' | 'mint' | 'yellow' | 'gray' | 'red';

interface StepMeta {
  badgeLabel?: string;
  badgeVariant?: StepBadgeVariant;
}

interface InteractiveBookEditorLayoutProps {
  title: string;
  description: string;
  steps: EditorStepDefinition[];
  activeStep: EditorStepKey;
  onStepChange: (step: EditorStepKey) => void;
  actions?: ReactNode;
  children: ReactNode;
  stepMeta?: Partial<Record<EditorStepKey, StepMeta>>;
}

export default function InteractiveBookEditorLayout({
  title,
  description,
  steps,
  activeStep,
  onStepChange,
  actions,
  children,
  stepMeta,
}: InteractiveBookEditorLayoutProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-4">
          {steps.map((step, index) => {
            const active = step.key === activeStep;
            const meta = stepMeta?.[step.key];
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => onStepChange(step.key)}
                className={`rounded-3xl border px-4 py-4 text-left transition ${
                  active
                    ? 'border-sky-300 bg-sky-50 shadow-sm'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    active ? 'bg-sky-600 text-white' : 'bg-white text-slate-500'
                  }`}
                  >
                    {index + 1}
                  </span>
                  {meta?.badgeLabel && (
                    <Badge variant={meta.badgeVariant ?? 'gray'}>
                      {meta.badgeLabel}
                    </Badge>
                  )}
                </div>
                <p className="mt-4 text-base font-semibold text-slate-900">{step.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-500">{step.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}
