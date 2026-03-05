import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { formatTimeRemaining } from '@/utils/helpers';

interface ExamTimerProps {
  endTime: string;
  onTimeUp?: () => void;
}

export default function ExamTimer({ endTime, onTimeUp }: ExamTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const calcRemaining = () => {
      const diff = Math.max(0, Math.floor((new Date(endTime).getTime() - Date.now()) / 1000));
      return diff;
    };

    setSecondsLeft(calcRemaining());

    const interval = setInterval(() => {
      const remaining = calcRemaining();
      setSecondsLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onTimeUp?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime, onTimeUp]);

  const getColor = () => {
    if (secondsLeft <= 60) return 'text-red-600 bg-red-50 border-red-200';
    if (secondsLeft <= 300) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-primary bg-primary-lighter border-primary-light';
  };

  return (
    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-mono font-bold text-lg ${getColor()}`}>
      <Clock className="w-5 h-5" />
      <span>{formatTimeRemaining(secondsLeft)}</span>
    </div>
  );
}
