import type { Message } from '@/types';
import { getInitials } from '@/utils/helpers';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  senderName?: string;
}

export default function MessageItem({ message, isOwn, senderName }: MessageItemProps) {
  const time = new Date(message.created_at).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {!isOwn && (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
          {getInitials(senderName || 'U')}
        </div>
      )}
      <div className={`flex items-end gap-2 max-w-[70%] ${isOwn ? 'flex-row-reverse' : ''}`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm ${
            isOwn
              ? 'bg-primary text-white rounded-br-md'
              : 'bg-white border border-border text-gray-800 rounded-bl-md'
          }`}
        >
          {message.content}
        </div>
        <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">{time}</span>
      </div>
    </div>
  );
}
