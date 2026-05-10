import { useState, useRef, useEffect } from 'react';
import { Send, Bot, Sparkles, AlertCircle, Clock } from 'lucide-react';
import MessageItem from '@/components/chat/MessageItem';
import { chatService } from '@/services/chat.service';
import type { Message } from '@/types';

const SUGGESTIONS = [
  'Giải thích định lý Pythagore',
  'Tóm tắt bài "Lão Hạc" của Nam Cao',
  'Công thức tính diện tích hình tròn',
  'Cách giải phương trình bậc 2',
];

const PLACEHOLDER_MESSAGE = 'Xin lỗi bạn! Tính năng trợ lý AI đang được phát triển. Vui lòng quay lại sau nhé!';

export default function StudentChatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [remainingQuestions, setRemainingQuestions] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Fetch remaining questions on mount
    chatService.getChatbotStatus().then((res: any) => {
      const remaining = res.data.data?.remaining_questions;
      setRemainingQuestions(remaining);
      if (remaining === 0) {
        setLimitReached(true);
      }
    }).catch(() => {
      // Silently fail - don't block the UI
    });
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;
    if (limitReached) return;

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
      const answer = res.data.data?.answer || PLACEHOLDER_MESSAGE;
      const remaining = res.data.data?.remaining_questions;
      
      if (remaining !== undefined) {
        setRemainingQuestions(remaining);
        if (remaining === 0) {
          setLimitReached(true);
        }
      }
      
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        conversation_id: 'chatbot',
        sender_id: 'ai-bot',
        content: answer,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      // Check if it's a rate limit error
      const isRateLimit = err.response?.status === 429;
      const errorMessage = err.response?.data?.detail || 'Có lỗi xảy ra. Vui lòng thử lại.';
      
      if (isRateLimit) {
        setLimitReached(true);
        setRemainingQuestions(0);
      }
      
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        conversation_id: 'chatbot',
        sender_id: 'ai-bot',
        content: isRateLimit ? errorMessage : PLACEHOLDER_MESSAGE,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Trợ lý AI</h1>
          <p className="text-gray-500 mt-1">Hỏi bất cứ điều gì bạn muốn</p>
        </div>
        
        {/* Remaining questions indicator */}
        {remainingQuestions !== null && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
            limitReached 
              ? 'bg-red-50 text-red-600 border border-red-200' 
              : remainingQuestions === 1 
                ? 'bg-amber-50 text-amber-600 border border-amber-200'
                : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
          }`}>
            {limitReached ? (
              <>
                <AlertCircle className="w-4 h-4" />
                <span>Đã hết lượt hỏi hôm nay</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                <span>Còn {remainingQuestions} lượt hỏi</span>
              </>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100/80 flex flex-col h-[calc(100vh-220px)] overflow-hidden">
        {/* Chat area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-700 mb-2">Xin chào! Mình là Trợ lý AI</h2>
              <p className="text-gray-400 text-sm mb-6 text-center max-w-md">
                Mình có thể giúp bạn giải bài tập, giải thích khái niệm hoặc tóm tắt bài học.
                Hãy thử hỏi một câu nhé!
              </p>
              
              {/* Show remaining questions info */}
              {remainingQuestions !== null && (
                <p className="text-xs text-gray-400 mb-4">
                  {limitReached 
                    ? 'Bạn đã sử dụng hết 2 lượt hỏi hôm nay. Quay lại ngày mai nhé!'
                    : `Bạn có ${remainingQuestions} lượt hỏi hôm nay`
                  }
                </p>
              )}
              
              <div className="grid grid-cols-2 gap-3 max-w-lg">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => sendMessage(s)}
                    disabled={limitReached}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 hover:border-primary/30 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="p-4 border-t border-gray-100">
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
              placeholder={limitReached ? "Bạn đã hết lượt hỏi hôm nay..." : "Nhập câu hỏi của bạn..."}
              disabled={isTyping || limitReached}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all bg-gray-50/50 focus:bg-white"
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping || limitReached}
              className="w-11 h-11 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm hover:shadow-md"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
