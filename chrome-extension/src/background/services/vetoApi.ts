/**
 * Veto API client for policy management.
 * Used by the extension settings UI to CRUD policies on the Veto server.
 * Auth via API key stored in extension settings.
 */

import { vetoStore } from '@extension/storage';

export interface VetoPolicy {
  id: string;
  toolName: string;
  mode: 'deterministic' | 'llm';
  version: number;
  isActive: boolean;
  projectId?: string;
  constraints: VetoConstraint[];
  sessionConstraints?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

export interface VetoConstraint {
  argumentName: string;
  enabled: boolean;
  action?: 'deny' | 'require_approval';
  regex?: string;
  notRegex?: string;
  enum?: string[];
  notEnum?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  [key: string]: unknown;
}

async function getHeaders(): Promise<Record<string, string>> {
  const config = await vetoStore.getVeto();
  if (!config.apiKey) throw new Error('Veto API key not configured');
  return {
    Authorization: `Bearer ${config.apiKey}`,
    'Content-Type': 'application/json',
  };
}

async function getBaseUrl(): Promise<string> {
  const config = await vetoStore.getVeto();
  return config.endpoint.replace(/\/$/, '') + '/v1';
}

export const vetoApi = {
  async listPolicies(): Promise<VetoPolicy[]> {
    const base = await getBaseUrl();
    const headers = await getHeaders();
    const resp = await fetch(`${base}/policies`, { headers });
    if (!resp.ok) throw new Error(`Failed to list policies: ${resp.status}`);
    const data = await resp.json();
    return data.data || [];
  },

  async getPolicy(toolName: string): Promise<VetoPolicy | null> {
    const base = await getBaseUrl();
    const headers = await getHeaders();
    const resp = await fetch(`${base}/policies/${encodeURIComponent(toolName)}`, { headers });
    if (resp.status === 404) return null;
    if (!resp.ok) throw new Error(`Failed to get policy: ${resp.status}`);
    return resp.json();
  },

  async createPolicy(policy: {
    toolName: string;
    mode: string;
    constraints: VetoConstraint[];
    sessionConstraints?: Record<string, unknown>;
  }): Promise<VetoPolicy> {
    const base = await getBaseUrl();
    const headers = await getHeaders();
    const resp = await fetch(`${base}/policies`, {
      method: 'POST',
      headers,
      body: JSON.stringify(policy),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to create policy: ${resp.status}`);
    }
    return resp.json();
  },

  async updatePolicy(
    toolName: string,
    update: { mode?: string; constraints?: VetoConstraint[]; sessionConstraints?: Record<string, unknown> },
  ): Promise<VetoPolicy> {
    const base = await getBaseUrl();
    const headers = await getHeaders();
    const resp = await fetch(`${base}/policies/${encodeURIComponent(toolName)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(update),
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error?.message || `Failed to update policy: ${resp.status}`);
    }
    return resp.json();
  },

  async activatePolicy(toolName: string): Promise<void> {
    const base = await getBaseUrl();
    const headers = await getHeaders();
    const resp = await fetch(`${base}/policies/${encodeURIComponent(toolName)}/activate`, {
      method: 'POST',
      headers,
    });
    if (!resp.ok) throw new Error(`Failed to activate: ${resp.status}`);
  },

  async deactivatePolicy(toolName: string): Promise<void> {
    const base = await getBaseUrl();
    const headers = await getHeaders();
    const resp = await fetch(`${base}/policies/${encodeURIComponent(toolName)}/deactivate`, {
      method: 'POST',
      headers,
    });
    if (!resp.ok) throw new Error(`Failed to deactivate: ${resp.status}`);
  },

  async deletePolicy(toolName: string): Promise<void> {
    const base = await getBaseUrl();
    const headers = await getHeaders();
    const resp = await fetch(`${base}/policies/${encodeURIComponent(toolName)}`, {
      method: 'DELETE',
      headers,
    });
    if (!resp.ok) throw new Error(`Failed to delete: ${resp.status}`);
  },
};
