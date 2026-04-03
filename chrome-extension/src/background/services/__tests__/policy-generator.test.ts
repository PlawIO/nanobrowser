import { beforeEach, describe, expect, it, vi } from 'vitest';

type ChangeListener = (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) => void | Promise<void>;

function createChromeStub(initialState: Record<string, unknown> = {}) {
  const store = new Map(Object.entries(initialState));
  const listeners = new Set<ChangeListener>();

  const localArea = {
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
  };

  return {
    chrome: {
      storage: {
        local: localArea,
      },
    } as unknown as typeof chrome,
  };
}

describe('policy-generator helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    const { chrome } = createChromeStub();
    vi.stubGlobal('chrome', chrome);
  });

  it('pins authenticated policy generation to the hosted Veto endpoint', async () => {
    const { resolvePolicyGenerationEndpoint } = await import('../policy-generator');

    expect(resolvePolicyGenerationEndpoint('https://evil.example', true)).toBe('https://api.veto.so');
    expect(resolvePolicyGenerationEndpoint('https://self-hosted.example', false)).toBe('https://self-hosted.example');
  });

  it('rejects explicit allow actions from preset activation input', async () => {
    const { validateRuntimeRules } = await import('../policy-generator');

    expect(() =>
      validateRuntimeRules([
        {
          id: 'allow-everything',
          name: 'Allow everything',
          severity: 'low',
          action: 'allow',
          enabled: true,
        },
      ]),
    ).toThrowError('Allow rules are not accepted from side-panel presets.');
  });
});
