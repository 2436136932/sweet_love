import { useEffect } from 'react';

interface UsePollingOptions {
  enabled: boolean;
  intervalMs: number;
}

export function usePolling(callback: () => void | Promise<void>, { enabled, intervalMs }: UsePollingOptions) {
  useEffect(() => {
    if (!enabled) return;

    let disposed = false;

    const runWhenVisible = () => {
      if (!disposed && document.visibilityState === 'visible') {
        void callback();
      }
    };

    runWhenVisible();
    const timer = window.setInterval(runWhenVisible, intervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runWhenVisible();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [callback, enabled, intervalMs]);
}
