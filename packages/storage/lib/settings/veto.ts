import { StorageEnum } from '../base/enums';
import { createStorage } from '../base/base';
import type { BaseStorage } from '../base/types';

export type VetoMode = 'strict' | 'log' | 'shadow';

export interface VetoConfig {
  enabled: boolean;
  apiKey: string; // veto_... API key (BYOK mode)
  endpoint: string; // Veto API base URL
  sessionId: string; // Session ID for tracking
  agentId: string; // Agent identifier
  failOpen: boolean; // Allow actions if Veto is unreachable
  mode: VetoMode; // Enforcement mode: strict blocks, log allows+logs, shadow simulates
  // Veto-hosted mode (CWS distribution): user logs in to veto.so, gets everything out of the box
  authToken: string; // OAuth access token from Veto platform
  userEmail: string; // Display name from Veto login
  isAuthenticated: boolean; // true = Veto-hosted mode (authToken present)
}

export type VetoStorage = BaseStorage<VetoConfig> & {
  updateVeto: (settings: Partial<VetoConfig>) => Promise<void>;
  getVeto: () => Promise<VetoConfig>;
  resetToDefaults: () => Promise<void>;
};

export const DEFAULT_VETO_SETTINGS: VetoConfig = {
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
};

const storage = createStorage<VetoConfig>('veto-settings', DEFAULT_VETO_SETTINGS, {
  storageEnum: StorageEnum.Local,
  liveUpdate: true,
});

export const vetoStore: VetoStorage = {
  ...storage,
  async updateVeto(settings: Partial<VetoConfig>) {
    const currentSettings = (await storage.get()) || DEFAULT_VETO_SETTINGS;
    await storage.set({
      ...currentSettings,
      ...settings,
    });
  },
  async getVeto() {
    const settings = await storage.get();
    return settings || DEFAULT_VETO_SETTINGS;
  },
  async resetToDefaults() {
    await storage.set(DEFAULT_VETO_SETTINGS);
  },
};
