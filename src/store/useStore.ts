import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AppState {
  user: User | null;
  isAuthReady: boolean;
  isAuthModalOpen: boolean;
  unreadMessagesCount: number;
  setUser: (user: User | null) => void;
  setAuthReady: (ready: boolean) => void;
  setAuthModalOpen: (isOpen: boolean) => void;
  setUnreadMessagesCount: (count: number) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  isAuthReady: false,
  isAuthModalOpen: false,
  unreadMessagesCount: 0,
  setUser: (user) => set({ user }),
  setAuthReady: (ready) => set({ isAuthReady: ready }),
  setAuthModalOpen: (isOpen) => set({ isAuthModalOpen: isOpen }),
  setUnreadMessagesCount: (count) => set({ unreadMessagesCount: count }),
}));
