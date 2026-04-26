import type { ContentRuntimeMessage, ContentRuntimeSnapshot } from '@extension/storage';

const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '[role="button"]',
  '[role="link"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const UPDATE_DEBOUNCE_MS = 300;

if (window.top === window) {
  let lastMutationAt: number | null = null;
  let updateTimer: number | null = null;

  const getSnapshot = (): ContentRuntimeSnapshot => ({
    tabId: -1,
    url: window.location.href,
    title: document.title,
    ready: document.readyState !== 'loading',
    visibilityState: document.visibilityState ?? 'unknown',
    focusedTagName: document.activeElement?.tagName?.toLowerCase() ?? null,
    interactiveElementCount: document.querySelectorAll(INTERACTIVE_SELECTOR).length,
    lastMutationAt,
    observedAt: Date.now(),
  });

  const postSnapshot = (type: ContentRuntimeMessage['type']): void => {
    const message: ContentRuntimeMessage = {
      type,
      payload: getSnapshot(),
    };

    try {
      void chrome.runtime.sendMessage(message);
    } catch {
      // Ignore transient runtime failures during service worker wakeup.
    }
  };

  const scheduleUpdate = (): void => {
    if (updateTimer !== null) {
      window.clearTimeout(updateTimer);
    }

    updateTimer = window.setTimeout(() => {
      updateTimer = null;
      postSnapshot('content_runtime_update');
    }, UPDATE_DEBOUNCE_MS);
  };

  const mutationObserver = new MutationObserver(() => {
    lastMutationAt = Date.now();
    scheduleUpdate();
  });

  const startObservers = (): void => {
    mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: false,
    });

    document.addEventListener('visibilitychange', scheduleUpdate, { passive: true });
    window.addEventListener('focus', scheduleUpdate, { passive: true });
    window.addEventListener('blur', scheduleUpdate, { passive: true });
    window.addEventListener('hashchange', scheduleUpdate, { passive: true });
    window.addEventListener('popstate', scheduleUpdate, { passive: true });
    window.addEventListener('pageshow', scheduleUpdate, { passive: true });
    document.addEventListener('focusin', scheduleUpdate, { passive: true });
    document.addEventListener('click', scheduleUpdate, { passive: true });
    document.addEventListener('input', scheduleUpdate, { passive: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      () => {
        postSnapshot('content_runtime_ready');
        startObservers();
      },
      { once: true },
    );
  } else {
    postSnapshot('content_runtime_ready');
    startObservers();
  }
}
