import { create } from 'zustand';

interface LoginModalState {
  isOpen: boolean;
  redirectPath: string | null;
  open: (redirectPath?: string | null) => void;
  close: () => void;
  setRedirectPath: (path: string | null) => void;
  clearRedirectPath: () => void;
  consumeRedirectPath: () => string | null;
}

export const useLoginModalStore = create<LoginModalState>((set, get) => ({
  isOpen: false,
  redirectPath: null,
  open: (redirectPath) =>
    set({
      isOpen: true,
      redirectPath: redirectPath ?? null,
    }),
  close: () => set({ isOpen: false }),
  setRedirectPath: (path) => set({ redirectPath: path }),
  clearRedirectPath: () => set({ redirectPath: null }),
  consumeRedirectPath: () => {
    const path = get().redirectPath;
    set({ redirectPath: null });
    return path;
  },
}));
