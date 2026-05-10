import { type ReactNode } from 'react';
import { cn } from '@/utils/helpers';

interface CardProps {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export default function Card({
  children,
  className,
  hoverable = false,
  onClick,
  padding = 'md',
}: CardProps) {
  const paddingSizes = {
    none: '',
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-white rounded-2xl shadow-sm border border-gray-100/80',
        paddingSizes[padding],
        hoverable &&
          'hover:shadow-lg hover:border-primary/20 transition-all duration-200 cursor-pointer',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
}
