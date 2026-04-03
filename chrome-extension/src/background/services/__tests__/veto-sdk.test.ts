import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Rule } from 'veto-sdk/browser';

type ChangeListener = (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) => void | Promise<void>;

function createStorageArea(initialState: Record<string, unknown> = {}) {
  const store = new Map(Object.entries(initialState));
  const listeners = new Set<ChangeListener>();

  return {
    store,
    area: {
      get: vi.fn(async (keys?: string | string[] | Record<string, unknown> | null) => {
        if (!keys) {
          return Object.fromEntries(store.entries());
        }

        if (typeof keys === 'string') {
          return store.has(keys) ? { [keys]: store.get(keys) } : {};
        }

        if (Array.isArray(keys)) {
          return Object.fromEntries(keys.filter(key => store.has(key)).map(key => [key, store.get(key)]));
        }

        return Object.fromEntries(Object.keys(keys).map(key => [key, store.has(key) ? store.get(key) : keys[key]]));
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        const changes = Object.fromEntries(
          Object.entries(items).map(([key, value]) => {
            const oldValue = store.get(key);
            store.set(key, value);
            return [key, { oldValue, newValue: value }];
          }),
        );

        for (const listener of listeners) {
          await listener(changes);
        }
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        for (const key of Array.isArray(keys) ? keys : [keys]) {
          store.delete(key);
        }
      }),
      onChanged: {
        addListener: vi.fn((listener: ChangeListener) => {
          listeners.add(listener);
        }),
      },
    },
  };
}

function createChromeStub(localState: Record<string, unknown> = {}) {
  const local = createStorageArea(localState);
  const sync = createStorageArea();
  const session = createStorageArea();

  return {
    chrome: {
      storage: {
        local: local.area,
        sync: sync.area,
        session: session.area,
      },
      alarms: {
        create: vi.fn(),
        clear: vi.fn(async () => true),
        onAlarm: {
          addListener: vi.fn(),
        },
      },
    } as unknown as typeof chrome,
    localStore: local.store,
  };
}

describe('veto-sdk local rule persistence', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    try {
      const module = await import('../veto-sdk');
      module.vetoSDK.dispose();
    } catch {
      // Ignore cleanup failures during failed module initialization.
    }
  });

  it('merges new local rules with persisted rules after a service worker restart', async () => {
    const existingRule: Rule = {
      id: 'existing-rule',
      name: 'Existing rule',
      enabled: true,
      severity: 'high',
      action: 'block',
    };
    const incomingRule: Rule = {
      id: 'incoming-rule',
      name: 'Incoming rule',
      enabled: true,
      severity: 'medium',
      action: 'require_approval',
    };

    const { chrome, localStore } = createChromeStub({
      'veto-local-rules': JSON.stringify([existingRule]),
      'veto-settings': {
        enabled: false,
        apiKey: '',
        endpoint: 'https://api.veto.so',
        sessionId: '',
        agentId: 'veto-browse',
        failOpen: false,
        mode: 'strict',
        authToken: '',
        userEmail: '',
        isAuthenticated: false,
      },
    });
    vi.stubGlobal('chrome', chrome);

    const { vetoSDK } = await import('../veto-sdk');
    await vetoSDK.addLocalRules([incomingRule]);

    const persistedRules = JSON.parse(String(localStore.get('veto-local-rules')));
    expect(persistedRules).toHaveLength(2);
    expect(persistedRules.map((rule: { id: string }) => rule.id)).toEqual(['existing-rule', 'incoming-rule']);
  });
});
