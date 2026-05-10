import { type ReactNode } from 'react';
import { cn } from '@/utils/helpers';

interface BadgeProps {
  children: ReactNode;
  variant?: 'blue' | 'pink' | 'purple' | 'mint' | 'yellow' | 'gray' | 'red' | 'green';
  size?: 'sm' | 'md';
  className?: string;
}

const variants = {
  blue: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200/60',
  pink: 'bg-pink-50 text-pink-700 ring-1 ring-pink-200/60',
  purple: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200/60',
  mint: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  yellow: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/60',
  gray: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
  red: 'bg-red-50 text-red-700 ring-1 ring-red-200/60',
  green: 'bg-green-50 text-green-700 ring-1 ring-green-200/60',
};

export default function Badge({
  children,
  variant = 'blue',
  size = 'sm',
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variants[variant],
        size === 'sm' ? 'px-2.5 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className
      )}
    >
      {children}
    </span>
  );
}
