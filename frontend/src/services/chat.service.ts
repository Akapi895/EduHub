import api from './api';

export const chatService = {
  getConversations: () => api.get('/conversations'),
  createConversation: (userId: string) =>
    api.post('/conversations', { user_id: userId }),
  getMessages: (conversationId: string) =>
    api.get(`/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, data: { content: string; file_url?: string }) =>
    api.post(`/conversations/${conversationId}/messages`, data),
  askChatbot: (question: string) =>
    api.post('/chatbot/ask', { question }),
};
