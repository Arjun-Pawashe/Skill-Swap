import { create } from 'zustand';
import { User } from 'firebase/auth';

interface AppState {
  user: User | null;
  isAuthReady: boolean;
  isAuthModalOpen: boolean;
  setUser: (user: User | null) => void;
  setAuthReady: (ready: boolean) => void;
  setAuthModalOpen: (isOpen: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  isAuthReady: false,
  isAuthModalOpen: false,
  setUser: (user) => set({ user }),
  setAuthReady: (ready) => set({ isAuthReady: ready }),
  setAuthModalOpen: (isOpen) => set({ isAuthModalOpen: isOpen }),
}));
