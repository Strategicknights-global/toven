import { create } from 'zustand';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number; // in ms, default 5000
}

interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type: Toast['type'], duration?: number) => void;
  removeToast: (id: string) => void;
}

const RECENT_TOAST_WINDOW_MS = 8000;
export const OFFLINE_TOAST_ID = 'offline-toast';
const OFFLINE_MESSAGE = 'You appear to be offline. We\'ll retry automatically once you reconnect.';

const lastShownByKey = new Map<string, number>();

const isNavigatorOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  addToast: (rawMessage, type, duration = 5000) => {
    const message = rawMessage.trim();
    const lowerMessage = message.toLowerCase();
    const offlineDetected =
      type === 'error' && (isNavigatorOffline() || lowerMessage.includes('client is offline'));

    if (offlineDetected) {
      let added = false;
      set((state) => {
        if (state.toasts.some((toast) => toast.id === OFFLINE_TOAST_ID)) {
          return state;
        }
        added = true;
        return {
          toasts: [
            ...state.toasts,
            {
              id: OFFLINE_TOAST_ID,
              message: OFFLINE_MESSAGE,
              type: 'warning',
              duration: 0,
            },
          ],
        };
      });

      if (!added && isNavigatorOffline()) {
        // Offline toast already visible; no further action needed.
        return;
      }

      if (!isNavigatorOffline()) {
        // In rare cases navigator reported online but message indicates offline. Still show once.
        lastShownByKey.set('warning:' + OFFLINE_MESSAGE.toLowerCase(), Date.now());
      }
      return;
    }

    const key = `${type}:${lowerMessage}`;
    const now = Date.now();
    const lastShown = lastShownByKey.get(key);

    if (lastShown && now - lastShown < RECENT_TOAST_WINDOW_MS) {
      return;
    }

    lastShownByKey.set(key, now);

    const id = Math.random().toString(36).substr(2, 9);
    const toast: Toast = { id, message, type, duration };

    let added = false;
    set((state) => {
      if (state.toasts.some((existing) => existing.message === message && existing.type === type)) {
        return state;
      }
      added = true;
      return { toasts: [...state.toasts, toast] };
    });

    if (added && duration > 0) {
      setTimeout(() => {
        get().removeToast(id);
      }, duration);
    }
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
