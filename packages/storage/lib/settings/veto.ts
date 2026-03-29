import { StorageEnum } from '../base/enums';
import { createStorage } from '../base/base';
import type { BaseStorage } from '../base/types';

export interface VetoConfig {
  enabled: boolean;
  apiKey: string; // veto_... API key
  endpoint: string; // Veto API base URL
  sessionId: string; // Session ID for tracking
  agentId: string; // Agent identifier
  failOpen: boolean; // Allow actions if Veto is unreachable
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
  agentId: 'nanobrowser',
  failOpen: true,
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
