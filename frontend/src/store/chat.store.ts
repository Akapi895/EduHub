import { create } from 'zustand';

interface ChatState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

export const useChatStore = create<ChatState>()((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
}));
