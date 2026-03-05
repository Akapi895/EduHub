import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles } from 'lucide-react';
import MessageItem from '@/components/chat/MessageItem';
import { chatService } from '@/services/chat.service';
import type { Message } from '@/types';

const SUGGESTIONS = [
  'Giải thích định lý Pythagore',
  'Tóm tắt bài \"Lão Hạc\" của Nam Cao',
  'Công thức tính diện tích hình tròn',
  'Cách giải phương trình bậc 2',
];

export default function StudentChatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      conversation_id: 'chatbot',
      sender_id: 'student',
      content: content.trim(),
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await chatService.askChatbot(content.trim());
      const answer = res.data.data?.answer || res.data.data?.content || 'Không có phản hồi';
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        conversation_id: 'chatbot',
        sender_id: 'ai-bot',
        content: answer,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        conversation_id: 'chatbot',
        sender_id: 'ai-bot',
        content: err.response?.data?.message || 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Trợ lý AI</h1>
        <p className="text-gray-500 mt-1">Hỏi bất cứ điều gì bạn muốn</p>
      </div>

      <div className="bg-white rounded-card shadow-sm flex flex-col h-[calc(100vh-220px)] overflow-hidden">
        {/* Chat area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-accent-purple" />
              </div>
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Xin chào! Mình là Trợ lý AI</h2>
              <p className="text-gray-400 text-sm mb-6 text-center max-w-md">
                Mình có thể giúp bạn giải bài tập, giải thích khái niệm hoặc tóm tắt bài học.
                Hãy thử hỏi một câu nhé!
              </p>
              <div className="grid grid-cols-2 gap-3 max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    className="px-4 py-2.5 rounded-xl border border-border text-sm text-gray-600 hover:bg-gray-50 hover:border-primary/30 transition-colors text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <MessageItem key={msg.id} message={msg} isOwn={msg.sender_id === 'student'} />
              ))}
              {isTyping && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Bot className="w-5 h-5" />
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi của bạn..."
              disabled={isTyping}
              className="flex-1 px-4 py-3 rounded-xl border border-border text-sm focus:ring-2 focus:ring-blue-300 outline-none disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="w-11 h-11 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
