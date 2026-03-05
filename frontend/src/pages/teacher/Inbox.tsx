import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import ChatWindow from '@/components/chat/ChatWindow';
import { mockConversations, mockMessages } from '@/services/mockData';
import { formatDateTime } from '@/utils/helpers';
import type { Conversation, Message } from '@/types';

export default function TeacherInbox() {
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>(mockMessages);

  const handleSend = (content: string) => {
    const msg: Message = {
      id: Date.now().toString(),
      conversation_id: selected?.id || '',
      sender_id: 'teacher-1',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages([...messages, msg]);
  };

  const filteredMessages = selected
    ? messages.filter((m) => m.conversation_id === selected.id)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Hộp thư</h1>
        <p className="text-gray-500 mt-1">Tin nhắn với học sinh</p>
      </div>

      <div className="bg-white rounded-card shadow-sm flex h-[calc(100vh-220px)] overflow-hidden">
        {/* Conversation list */}
        <div className="w-80 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <input
              type="text"
              placeholder="Tìm kiếm cuộc trò chuyện..."
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-blue-300 outline-none"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {mockConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelected(conv)}
                className={`w-full p-4 text-left hover:bg-gray-50 transition-colors border-b border-border/50 ${
                  selected?.id === conv.id ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {conv.participant.full_name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{conv.participant.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">{conv.last_message || 'Chưa có tin nhắn'}</p>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div className="flex-1">
          {selected ? (
            <ChatWindow
              participantName={selected.participant.full_name}
              messages={filteredMessages}
              onSend={handleSend}
              currentUserId="teacher-1"
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <MessageCircle className="w-12 h-12 mb-3" />
              <p>Chọn cuộc trò chuyện để bắt đầu</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
