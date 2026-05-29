import { useEffect, useRef, useCallback } from 'react';

const IDLE_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'pointerdown',
];

/**
 * Signs the user out after `timeoutMs` of inactivity.
 * Resets the timer on mouse, keyboard, touch, or scroll events.
 */
export function useIdleTimeout(onTimeout: () => void, timeoutMs: number = 30 * 60 * 1000) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onTimeout, timeoutMs);
  }, [onTimeout, timeoutMs]);

  useEffect(() => {
    // Start timer immediately
    resetTimer();

    const handler = () => resetTimer();
    IDLE_EVENTS.forEach((evt) => window.addEventListener(evt, handler, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      IDLE_EVENTS.forEach((evt) => window.removeEventListener(evt, handler));
    };
  }, [resetTimer]);
}
