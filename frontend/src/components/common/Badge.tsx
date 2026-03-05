import { type ReactNode } from 'react';
import { cn } from '@/utils/helpers';

interface BadgeProps {
  children: ReactNode;
  variant?: 'blue' | 'pink' | 'purple' | 'mint' | 'yellow' | 'gray' | 'red';
  className?: string;
}

const variants = {
  blue: 'bg-primary-light text-blue-700',
  pink: 'bg-accent-pink text-pink-700',
  purple: 'bg-accent-purple text-purple-700',
  mint: 'bg-accent-mint text-green-700',
  yellow: 'bg-accent-yellow text-yellow-700',
  gray: 'bg-gray-100 text-gray-600',
  red: 'bg-red-100 text-red-600',
};

export default function Badge({
  children,
  variant = 'blue',
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
