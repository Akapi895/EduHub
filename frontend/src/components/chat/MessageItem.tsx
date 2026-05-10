import type { Message } from '@/types';
import { getInitials } from '@/utils/helpers';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

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
      <div className={`flex items-end gap-2 max-w-[75%] ${isOwn ? 'flex-row-reverse' : ''}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm ${
            isOwn
              ? 'bg-primary text-white rounded-br-md'
              : 'bg-white border border-gray-100 text-gray-800 rounded-bl-md'
          }`}
        >
          <div className={`prose prose-sm max-w-none ${isOwn ? 'text-white' : 'text-gray-800'} [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_strong]:font-semibold [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-black/10 [&_pre]:bg-black/10 [&_pre]:p-2 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_.katex]:font-normal`}>
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
        <span className="text-[11px] text-gray-400 whitespace-nowrap shrink-0">{time}</span>
      </div>
    </div>
  );
}
