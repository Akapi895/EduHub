import { useState, useEffect, useCallback } from 'react';
import { MessageCircle, Loader2, PenSquare, Search } from 'lucide-react';
import ChatWindow from '@/components/chat/ChatWindow';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import Badge from '@/components/common/Badge';
import { chatService } from '@/services/chat.service';
import type { Conversation, Message } from '@/types';
import { useAuthStore } from '@/store/auth.store';
import { useChatStore } from '@/store/chat.store';
import { useDebounce } from '@/hooks/useDebounce';

interface Contact {
  id: string;
  full_name: string;
  avatar_url?: string;
  role: string;
}

interface InboxPageProps {
  subtitle: string;
  contactSearchPlaceholder: string;
  showContactRole?: boolean;
}

export default function InboxPage({ subtitle, contactSearchPlaceholder, showContactRole = false }: InboxPageProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);
  const setUnreadCount = useChatStore((s) => s.setUnreadCount);

  // Conversation search
  const [convSearch, setConvSearch] = useState('');
  const debouncedConvSearch = useDebounce(convSearch, 300);

  // New message modal
  const [showNewMsg, setShowNewMsg] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactSearch, setContactSearch] = useState('');

  const fetchConversations = useCallback(async () => {
    try {
      const res = await chatService.getConversations();
      const convs = (res.data.data || []) as Conversation[];
      convs.sort((a, b) => {
        const ta = a.last_message_at || a.id;
        const tb = b.last_message_at || b.id;
        return tb.localeCompare(ta);
      });
      setConversations(convs);
      // Sync total unread to sidebar badge
      const total = convs.reduce((sum, c) => sum + (c.unread_count || 0), 0);
      setUnreadCount(total);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [setUnreadCount]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const handleSelectConversation = async (conv: Conversation) => {
    setSelected(conv);
    try {
      const res = await chatService.getMessages(conv.id);
      setMessages(res.data.data || []);
      // Update local unread count and sync to sidebar store
      setConversations((prev) => {
        const updated = prev.map((c) => c.id === conv.id ? { ...c, unread_count: 0 } : c);
        const total = updated.reduce((sum, c) => sum + (c.unread_count || 0), 0);
        setUnreadCount(total);
        return updated;
      });
    } catch {
      setMessages([]);
    }
  };

  const handleSend = async (content: string) => {
    if (!selected) return;
    try {
      const res = await chatService.sendMessage(selected.id, { content });
      setMessages([...messages, res.data.data]);
      fetchConversations();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Gửi tin nhắn thất bại');
    }
  };

  const openNewMsg = async () => {
    setShowNewMsg(true);
    setContactSearch('');
    if (contacts.length === 0) {
      setContactsLoading(true);
      try {
        const res = await chatService.getContacts();
        setContacts(res.data.data || []);
      } catch { /* ignore */ }
      finally { setContactsLoading(false); }
    }
  };

  const handleSelectContact = async (contact: Contact) => {
    setShowNewMsg(false);
    try {
      const res = await chatService.createConversation(contact.id);
      const conv: Conversation = res.data.data;
      await fetchConversations();
      setSelected(conv);
      const msgRes = await chatService.getMessages(conv.id);
      setMessages(msgRes.data.data || []);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể tạo cuộc trò chuyện');
    }
  };

  const filteredContacts = contacts.filter((c) =>
    c.full_name.toLowerCase().includes(contactSearch.toLowerCase())
  );

  const filteredConversations = debouncedConvSearch
    ? conversations.filter((c) =>
        c.participant?.full_name?.toLowerCase().includes(debouncedConvSearch.toLowerCase())
      )
    : conversations;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Hộp thư</h1>
          <p className="text-gray-500 mt-1">{subtitle}</p>
        </div>
        <Button onClick={openNewMsg}>
          <PenSquare className="w-4 h-4 mr-2" /> Tin nhắn mới
        </Button>
      </div>

      <div className="bg-white rounded-card shadow-sm flex h-[calc(100vh-220px)] overflow-hidden">
        <div className="w-80 border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm kiếm cuộc trò chuyện..."
                value={convSearch}
                onChange={(e) => setConvSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-blue-300 outline-none"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400 mb-2">
                  {debouncedConvSearch ? 'Không tìm thấy cuộc trò chuyện' : 'Chưa có cuộc trò chuyện nào'}
                </p>
                {!debouncedConvSearch && (
                  <button onClick={openNewMsg} className="text-sm text-primary hover:underline">Bắt đầu trò chuyện</button>
                )}
              </div>
            ) : filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => handleSelectConversation(conv)}
                className={`w-full p-4 text-left hover:bg-gray-50 transition-colors border-b border-border/50 ${
                  selected?.id === conv.id ? 'bg-blue-50' : conv.unread_count > 0 ? 'bg-primary/5' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    conv.unread_count > 0 ? 'bg-primary/20' : 'bg-primary/10'
                  }`}>
                    <span className="text-sm font-bold text-primary">
                      {conv.participant.full_name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{conv.participant.full_name}</p>
                    <p className={`text-xs truncate ${conv.unread_count > 0 ? 'text-gray-700' : 'text-gray-500'}`}>{conv.last_message || 'Chưa có tin nhắn'}</p>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="min-w-[20px] h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1.5">
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
              participantRole={selected.participant.role}
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

      {/* New message modal */}
      <Modal isOpen={showNewMsg} onClose={() => setShowNewMsg(false)} title="Tin nhắn mới" size="sm">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={contactSearchPlaceholder}
              value={contactSearch}
              onChange={(e) => setContactSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-border text-sm focus:ring-2 focus:ring-blue-300 outline-none"
            />
          </div>
          <div className="max-h-72 overflow-y-auto -mx-1">
            {contactsLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : filteredContacts.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Không tìm thấy</p>
            ) : filteredContacts.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelectContact(c)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">{c.full_name.charAt(0)}</span>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{c.full_name}</p>
                </div>
                {showContactRole && (
                  <Badge variant={c.role === 'teacher' ? 'purple' : 'blue'}>
                    {c.role === 'teacher' ? 'Giáo viên' : 'Học sinh'}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
