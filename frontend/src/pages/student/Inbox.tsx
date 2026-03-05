import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';
import ChatWindow from '@/components/chat/ChatWindow';
import { chatService } from '@/services/chat.service';
import type { Conversation, Message } from '@/types';
import { useAuthStore } from '@/store/auth.store';

export default function StudentInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await chatService.getConversations();
      setConversations(res.data.data || []);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleSelectConversation = async (conv: Conversation) => {
    setSelected(conv);
    try {
      const res = await chatService.getMessages(conv.id);
      setMessages(res.data.data || []);
    } catch {
      setMessages([]);
    }
  };

  const handleSend = async (content: string) => {
    if (!selected) return;
    try {
      const res = await chatService.sendMessage(selected.id, { content });
      setMessages([...messages, res.data.data]);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gửi tin nhắn thất bại');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Hộp thư</h1>
        <p className="text-gray-500 mt-1">Tin nhắn với giáo viên</p>
      </div>

      <div className="bg-white rounded-card shadow-sm flex h-[calc(100vh-220px)] overflow-hidden">
        <div className="w-80 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <input
              type="text"
              placeholder="Tìm kiếm..."
              className="w-full px-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-blue-300 outline-none"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Chưa có cuộc trò chuyện nào</p>
            ) : conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
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

        <div className="flex-1">
          {selected ? (
            <ChatWindow
              participantName={selected.participant.full_name}
              messages={messages}
              onSend={handleSend}
              currentUserId={user?.id || ''}
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
