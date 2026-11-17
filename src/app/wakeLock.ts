/**
 * Keeps the screen on while `active`: a phone that turns its screen off
 * freezes the workers mid-round. The browser drops the lock when the tab is
 * hidden, so it is taken again when the tab comes back. Best effort: browsers
 * without the Screen Wake Lock API, or that refuse it, just let the screen sleep.
 */
import { useEffect } from "react";

export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let stopped = false;

    const acquire = async () => {
      if (stopped || document.visibilityState !== "visible" || (sentinel && !sentinel.released))
        return;
      try {
        const s = await navigator.wakeLock.request("screen");
        if (stopped) void s.release();
        else sentinel = s;
      } catch {
        // Refused (battery saver, permissions policy): keep playing without it.
      }
    };

    const onVisibility = () => void acquire();
    document.addEventListener("visibilitychange", onVisibility);
    void acquire();
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release().catch(() => undefined);
    };
  }, [active]);
}
