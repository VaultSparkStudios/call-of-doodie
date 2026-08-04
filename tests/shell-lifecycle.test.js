import { describe, expect, it, vi } from 'vitest';
import { attachInstallPromptListener, attachRunNavigationGuard } from '../src/hooks/useShellLifecycle.js';

function target() {
  const listeners = new Map();
  return {
    addEventListener: vi.fn((type, handler) => listeners.set(type, handler)),
    removeEventListener: vi.fn((type, handler) => { if (listeners.get(type) === handler) listeners.delete(type); }),
    dispatch(type, event) { listeners.get(type)?.(event); },
    listeners,
  };
}

describe('shell lifecycle boundary', () => {
  it('captures install prompts and cleans up exactly its listener', () => {
    const host = target();
    const capture = vi.fn();
    const cleanup = attachInstallPromptListener(host, capture);
    const event = { preventDefault: vi.fn() };
    host.dispatch('beforeinstallprompt', event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(capture).toHaveBeenCalledWith(event);
    cleanup();
    expect(host.listeners.has('beforeinstallprompt')).toBe(false);
  });

  it('guards only active runs and releases the exact handler', () => {
    const host = target();
    const inactiveCleanup = attachRunNavigationGuard(host, false);
    expect(host.addEventListener).not.toHaveBeenCalled();
    inactiveCleanup();
    const cleanup = attachRunNavigationGuard(host, true);
    const event = { preventDefault: vi.fn(), returnValue: null };
    host.dispatch('beforeunload', event);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(event.returnValue).toBe('');
    cleanup();
    expect(host.listeners.has('beforeunload')).toBe(false);
  });
});
