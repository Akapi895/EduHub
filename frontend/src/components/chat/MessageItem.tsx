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
      <div className={`max-w-[70%]`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm ${
            isOwn
              ? 'bg-primary text-white rounded-br-md'
              : 'bg-white border border-border text-gray-800 rounded-bl-md'
          }`}
        >
          {message.content}
        </div>
        <p className={`text-xs text-gray-400 mt-1 ${isOwn ? 'text-right' : ''}`}>
          {time}
        </p>
      </div>
    </div>
  );
}
