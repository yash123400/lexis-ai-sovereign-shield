import { useEffect, useRef, useCallback } from 'react';

/**
 * FIX 2.2: Session Timeout Hook
 * Resets a timer on every user interaction.
 * After `timeoutMs` of inactivity, calls `onTimeout()`.
 *
 * Usage:
 *   useSessionTimeout({ onTimeout: () => { window.location.reload(); } });
 */
interface UseSessionTimeoutOptions {
    timeoutMs?: number;   // default: 30 minutes
    onTimeout: () => void;
}

export default function useSessionTimeout({
    timeoutMs = 30 * 60 * 1000, // 30 minutes — SRA Technology Guidelines 2025
    onTimeout,
}: UseSessionTimeoutOptions) {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onTimeoutRef = useRef(onTimeout);
    onTimeoutRef.current = onTimeout;

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            onTimeoutRef.current();
        }, timeoutMs);
    }, [timeoutMs]);

    useEffect(() => {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        events.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));
        resetTimer(); // start timer immediately

        return () => {
            events.forEach(event => window.removeEventListener(event, resetTimer));
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [resetTimer]);
}
