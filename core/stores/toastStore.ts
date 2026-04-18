import { create } from 'zustand';

type ToastMessage = { id: string; message: string; variant?: 'default' | 'error' };

type ToastState = {
  queue: ToastMessage[];
  show: (message: string, variant?: ToastMessage['variant']) => void;
  dismiss: (id: string) => void;
};

export const useToastStore = create<ToastState>((set, get) => ({
  queue: [],
  show: (message, variant = 'default') => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    set({ queue: [...get().queue, { id, message, variant }] });
    setTimeout(() => {
      get().dismiss(id);
    }, 3200);
  },
  dismiss: (id) => set({ queue: get().queue.filter((t) => t.id !== id) }),
}));
