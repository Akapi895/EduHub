import { useEffect, useRef, useCallback } from 'react';

export interface AutoSaveOptions {
  /** Thời gian chờ (ms) trước khi gọi save. Default: 3000 */
  delay?: number;
  /** Callback thực hiện save. Return Promise. */
  onSave: () => Promise<void>;
  /** Callback khi save thành công */
  onSuccess?: () => void;
  /** Callback khi save thất bại */
  onError?: (error: unknown) => void;
  /** Disable auto-save. Default: false */
  disabled?: boolean;
}

/**
 * Hook debounce auto-save.
 * Gọi onSave sau `delay` ms kể từ lần gọi trigger cuối cùng.
 * Nếu đang save thì chờ, không gọi chồng.
 */
export function useAutoSave({
  delay = 3000,
  onSave,
  onSuccess,
  onError,
  disabled = false,
}: AutoSaveOptions) {
  const timerRef = useRef<number | null>(null);
  const savingRef = useRef(false);
  const onSaveRef = useRef(onSave);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  // Cập nhật refs khi callbacks thay đổi (tránh dependency array dài)
  useEffect(() => {
    onSaveRef.current = onSave;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSave, onSuccess, onError]);

  // Cleanup timer khi unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const trigger = useCallback(() => {
    if (disabled) return;

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(async () => {
      if (savingRef.current) return;
      savingRef.current = true;
      try {
        await onSaveRef.current();
        onSuccessRef.current?.();
      } catch (error) {
        onErrorRef.current?.(error);
      } finally {
        savingRef.current = false;
        timerRef.current = null;
      }
    }, delay);
  }, [delay, disabled]);

  /** Force save ngay lập tức (hữu ích khi submit form) */
  const saveNow = useCallback(async () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      await onSaveRef.current();
      onSuccessRef.current?.();
    } catch (error) {
      onErrorRef.current?.(error);
    } finally {
      savingRef.current = false;
    }
  }, [onSave, onSuccess, onError]);

  /** Cancel pending save */
  const cancel = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return { trigger, saveNow, cancel };
}
