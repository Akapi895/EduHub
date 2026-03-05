import { useState, useRef, useEffect } from 'react';
import type { Message } from '@/types';
import MessageItem from './MessageItem';
import { Send } from 'lucide-react';

interface ChatWindowProps {
  messages: Message[];
  currentUserId: string;
  participantName: string;
  onSend: (content: string) => void;
}

export default function ChatWindow({
  messages,
  currentUserId,
  participantName,
  onSend,
}: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    onSend(newMessage.trim());
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
          {participantName[0]?.toUpperCase()}
        </div>
        <div>
          <p className="font-medium text-gray-800">{participantName}</p>
          <p className="text-xs text-green-500">Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            isOwn={msg.sender_id === currentUserId}
            senderName={msg.sender_id === currentUserId ? 'Bạn' : participantName}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border bg-white">
        <div className="flex items-center gap-3">
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Nhập tin nhắn..."
            className="flex-1 px-4 py-2.5 rounded-xl border border-border focus:ring-2 focus:ring-blue-300 focus:border-primary outline-none text-sm"
          />
          <button
            type="submit"
            className="p-2.5 rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
