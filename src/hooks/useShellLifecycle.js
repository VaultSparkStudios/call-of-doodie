import { useCallback, useEffect, useRef, useState } from 'react';
import { buildPwaInstallAttempt, savePwaInstallAttempt } from '../utils/pwaInstallReadiness.js';

export function attachInstallPromptListener(target, onCapture) {
  const handler = (event) => {
    event.preventDefault();
    onCapture(event);
  };
  target?.addEventListener?.('beforeinstallprompt', handler);
  return () => target?.removeEventListener?.('beforeinstallprompt', handler);
}

export function attachRunNavigationGuard(target, active) {
  if (!active) return () => {};
  const handler = (event) => {
    event.preventDefault();
    event.returnValue = '';
  };
  target?.addEventListener?.('beforeunload', handler);
  return () => target?.removeEventListener?.('beforeunload', handler);
}

export function useShellLifecycle({ screen, target = globalThis.window } = {}) {
  const installPromptRef = useRef(null);
  const [pwaPromptReady, setPwaPromptReady] = useState(false);

  useEffect(() => attachInstallPromptListener(target, (event) => {
    installPromptRef.current = event;
    setPwaPromptReady(true);
  }), [target]);

  useEffect(() => attachRunNavigationGuard(target, screen === 'game'), [screen, target]);

  const promptInstallApp = useCallback(async () => {
    const promptEvent = installPromptRef.current;
    if (!promptEvent) return null;
    promptEvent.prompt();
    const result = await promptEvent.userChoice.catch(() => null);
    if (result?.outcome) savePwaInstallAttempt(buildPwaInstallAttempt({ outcome: result.outcome }));
    if (!result || result.outcome === 'accepted' || result.outcome === 'dismissed') {
      installPromptRef.current = null;
      setPwaPromptReady(false);
    }
    return result;
  }, []);

  return { pwaPromptReady, promptInstallApp };
}
