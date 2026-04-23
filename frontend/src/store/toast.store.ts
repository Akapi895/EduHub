import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  tone: ToastTone;
  durationMs: number;
}

interface ToastStore {
  toasts: ToastItem[];
  pushToast: (toast: ToastItem) => void;
  dismissToast: (id: string) => void;
}

const DEFAULT_DURATION_MS = 4200;

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  pushToast: (toast) =>
    set((state) => ({
      toasts: [...state.toasts, toast],
    })),
  dismissToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id),
    })),
}));

function showToast(message: string, tone: ToastTone, durationMs = DEFAULT_DURATION_MS) {
  if (!message.trim()) return '';
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  useToastStore.getState().pushToast({
    id,
    message,
    tone,
    durationMs,
  });
  return id;
}

export function dismissToast(id: string) {
  useToastStore.getState().dismissToast(id);
}

export function showSuccessToast(message: string, durationMs?: number) {
  return showToast(message, 'success', durationMs);
}

export function showErrorToast(message: string, durationMs?: number) {
  return showToast(message, 'error', durationMs);
}

export function showInfoToast(message: string, durationMs?: number) {
  return showToast(message, 'info', durationMs);
}

export function showWarningToast(message: string, durationMs?: number) {
  return showToast(message, 'warning', durationMs);
}
