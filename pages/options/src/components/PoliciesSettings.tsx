import { useState, useEffect, useCallback } from 'react';
import { c } from '../styles';

interface Constraint {
  argumentName: string;
  enabled: boolean;
  action?: 'deny' | 'require_approval';
  notRegex?: string;
  regex?: string;
  notEnum?: string[];
  enum?: string[];
  maximum?: number;
  minimum?: number;
  maxLength?: number;
  [key: string]: unknown;
}

interface Policy {
  id: string;
  toolName: string;
  mode: string;
  version: number;
  isActive: boolean;
  constraints: Constraint[];
  sessionConstraints?: Record<string, unknown>;
}

const BROWSER_TOOLS = [
  { name: 'browser_go_to_url', label: 'Navigate', desc: 'Controls which URLs the agent can visit' },
  { name: 'browser_click_element', label: 'Click', desc: 'Controls click actions on page elements' },
  { name: 'browser_input_text', label: 'Type text', desc: 'Controls what text the agent can enter' },
  { name: 'browser_search_google', label: 'Google search', desc: 'Controls search queries' },
  { name: 'browser_send_keys', label: 'Keyboard', desc: 'Controls keyboard input' },
  { name: 'browser_open_tab', label: 'Open tab', desc: 'Controls new tab creation' },
];

export const PoliciesSettings = () => {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editJson, setEditJson] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Quick-add state
  const [quickTool, setQuickTool] = useState('browser_go_to_url');
  const [quickType, setQuickType] = useState<'block-domain' | 'block-content' | 'limit-length'>('block-domain');
  const [quickValue, setQuickValue] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      // Use chrome.runtime.sendMessage to call background service
      // But since vetoApi runs in background context, we fetch directly
      const config = await getVetoConfig();
      if (!config.apiKey || !config.enabled) {
        setError('Enable Veto Guard and add an API key first');
        setLoading(false);
        return;
      }
      const base = config.endpoint.replace(/\/$/, '') + '/v1';
      const resp = await fetch(`${base}/policies`, {
        headers: { Authorization: `Bearer ${config.apiKey}` },
      });
      if (!resp.ok) throw new Error(`${resp.status}`);
      const data = await resp.json();
      // Filter to browser_ policies
      const browserPolicies = (data.data || []).filter((p: Policy) => p.toolName.startsWith('browser_'));
      setPolicies(browserPolicies);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleActivate = async (toolName: string, active: boolean) => {
    const config = await getVetoConfig();
    const base = config.endpoint.replace(/\/$/, '') + '/v1';
    const action = active ? 'activate' : 'deactivate';
    await fetch(`${base}/policies/${encodeURIComponent(toolName)}/${action}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });
    await load();
  };

  const handleDelete = async (toolName: string) => {
    const config = await getVetoConfig();
    const base = config.endpoint.replace(/\/$/, '') + '/v1';
    await fetch(`${base}/policies/${encodeURIComponent(toolName)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${config.apiKey}` },
    });
    await load();
  };

  const handleEdit = (policy: Policy) => {
    setEditing(policy.toolName);
    setEditJson(
      JSON.stringify(
        {
          toolName: policy.toolName,
          mode: policy.mode,
          constraints: policy.constraints,
          ...(policy.sessionConstraints ? { sessionConstraints: policy.sessionConstraints } : {}),
        },
        null,
        2,
      ),
    );
    setSaveMsg('');
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const parsed = JSON.parse(editJson);
      const config = await getVetoConfig();
      const base = config.endpoint.replace(/\/$/, '') + '/v1';
      const headers = { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' };

      // Delete + recreate to handle constraint changes
      await fetch(`${base}/policies/${encodeURIComponent(parsed.toolName)}`, { method: 'DELETE', headers });
      const resp = await fetch(`${base}/policies`, { method: 'POST', headers, body: JSON.stringify(parsed) });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error?.message || `${resp.status}`);
      }
      await fetch(`${base}/policies/${encodeURIComponent(parsed.toolName)}/activate`, { method: 'POST', headers });
      setSaveMsg('Saved');
      setTimeout(() => {
        setEditing(null);
        load();
      }, 600);
    } catch (e) {
      setSaveMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickAdd = async () => {
    if (!quickValue.trim()) return;
    const config = await getVetoConfig();
    const base = config.endpoint.replace(/\/$/, '') + '/v1';
    const headers = { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' };

    let constraint: Constraint;
    if (quickType === 'block-domain') {
      // Build notRegex from domain
      const domains = quickValue.split(',').map(d => d.trim().replace(/\./g, '\\.'));
      constraint = { argumentName: 'url', enabled: true, action: 'deny', notRegex: `(${domains.join('|')})` };
    } else if (quickType === 'block-content') {
      constraint = { argumentName: 'text', enabled: true, action: 'deny', notRegex: quickValue.trim() };
    } else {
      constraint = { argumentName: 'text', enabled: true, action: 'deny', maxLength: parseInt(quickValue) || 100 };
    }

    // Check if policy exists — merge constraints or create new
    const existing = policies.find(p => p.toolName === quickTool);
    if (existing) {
      const merged = [...existing.constraints, constraint];
      await fetch(`${base}/policies/${encodeURIComponent(quickTool)}`, { method: 'DELETE', headers });
      await fetch(`${base}/policies`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ toolName: quickTool, mode: 'deterministic', constraints: merged }),
      });
    } else {
      await fetch(`${base}/policies`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ toolName: quickTool, mode: 'deterministic', constraints: [constraint] }),
      });
    }
    await fetch(`${base}/policies/${encodeURIComponent(quickTool)}/activate`, { method: 'POST', headers });
    setQuickValue('');
    await load();
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold" style={{ color: c.text }}>
        Policies
      </h1>
      <p className="mb-8 text-sm" style={{ color: c.textDim }}>
        Rules that control what the agent can do — managed on your Veto project
      </p>

      {error && (
        <div
          className="mb-6 px-4 py-3"
          style={{ background: 'rgba(239,68,68,0.06)', border: `1px solid rgba(239,68,68,0.15)` }}>
          <p className="text-[12px]" style={{ color: c.danger }}>
            {error}
          </p>
        </div>
      )}

      {/* ── Quick add ── */}
      <section className="mb-10">
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-widest" style={{ color: c.textDim }}>
          Quick Add Rule
        </h2>
        <div className="space-y-2">
          <div className="flex gap-2">
            <select
              value={quickTool}
              onChange={e => setQuickTool(e.target.value)}
              className="px-3 py-2 text-[13px] outline-none"
              style={{ background: c.input, border: `1px solid ${c.border}`, color: c.text }}>
              {BROWSER_TOOLS.map(t => (
                <option key={t.name} value={t.name}>
                  {t.label}
                </option>
              ))}
            </select>
            <select
              value={quickType}
              onChange={e => setQuickType(e.target.value as typeof quickType)}
              className="px-3 py-2 text-[13px] outline-none"
              style={{ background: c.input, border: `1px solid ${c.border}`, color: c.text }}>
              <option value="block-domain">Block domain</option>
              <option value="block-content">Block content (regex)</option>
              <option value="limit-length">Max length</option>
            </select>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={quickValue}
              onChange={e => setQuickValue(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleQuickAdd();
              }}
              placeholder={
                quickType === 'block-domain'
                  ? 'facebook.com, twitter.com'
                  : quickType === 'block-content'
                    ? 'regex pattern'
                    : '100'
              }
              className="flex-1 px-3 py-2 text-[13px] outline-none"
              style={{ background: c.input, border: `1px solid ${c.border}`, color: c.text }}
            />
            <button
              type="button"
              onClick={handleQuickAdd}
              className="px-4 py-2 text-[13px] font-medium text-white"
              style={{ background: c.accent }}>
              Add
            </button>
          </div>
        </div>
      </section>

      {/* ── Active policies ── */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[11px] font-medium uppercase tracking-widest" style={{ color: c.textDim }}>
            Active Policies
          </h2>
          <button type="button" onClick={load} className="text-[11px]" style={{ color: c.accent }}>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-[13px]" style={{ color: c.textDim }}>
            Loading...
          </div>
        ) : policies.length === 0 ? (
          <div className="py-12 text-center text-[13px]" style={{ color: c.textDim }}>
            No browser policies. Use Quick Add above to create one.
          </div>
        ) : (
          <div className="space-y-px">
            {policies.map(p => (
              <div key={p.id} className="group" style={{ borderBottom: `1px solid ${c.border}` }}>
                <div className="flex items-center justify-between px-3 py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px]" style={{ color: p.isActive ? c.success : c.danger }}>
                        {p.isActive ? '●' : '○'}
                      </span>
                      <span className="text-[13px] font-medium" style={{ color: c.text }}>
                        {p.toolName}
                      </span>
                      <span className="text-[10px]" style={{ color: c.textDim }}>
                        v{p.version} · {p.mode}
                      </span>
                    </div>
                    {p.constraints
                      .filter(cc => cc.enabled)
                      .map((cc, i) => {
                        let desc = cc.argumentName + ': ';
                        if (cc.notRegex) desc += `block /${cc.notRegex}/`;
                        else if (cc.notEnum) desc += `block [${cc.notEnum.join(', ')}]`;
                        else if (cc.regex) desc += `match /${cc.regex}/`;
                        else if (cc.enum) desc += `allow [${cc.enum.join(', ')}]`;
                        else if (cc.maximum !== undefined) desc += `≤ ${cc.maximum}`;
                        else if (cc.maxLength !== undefined) desc += `max ${cc.maxLength} chars`;
                        else desc += JSON.stringify(cc).slice(0, 50);
                        return (
                          <div key={i} className="ml-5 text-[11px]" style={{ color: c.textSecondary }}>
                            {cc.action || 'deny'} · {desc}
                          </div>
                        );
                      })}
                  </div>
                  <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleActivate(p.toolName, !p.isActive)}
                      className="text-[11px]"
                      style={{ color: p.isActive ? c.warning : c.success }}>
                      {p.isActive ? 'Pause' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEdit(p)}
                      className="text-[11px]"
                      style={{ color: c.accent }}>
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.toolName)}
                      className="text-[11px]"
                      style={{ color: c.danger }}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Edit modal ── */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-lg" style={{ background: c.raised, border: `1px solid ${c.border}` }}>
            <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: c.border }}>
              <span className="text-[13px] font-medium" style={{ color: c.text }}>
                {editing}
              </span>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="text-[13px]"
                style={{ color: c.textDim }}>
                ✕
              </button>
            </div>
            <textarea
              value={editJson}
              onChange={e => setEditJson(e.target.value)}
              className="w-full p-4 font-mono text-[12px] leading-relaxed outline-none"
              style={{ background: c.input, color: c.text, minHeight: '300px', resize: 'vertical' }}
            />
            <div className="flex items-center justify-between border-t px-4 py-3" style={{ borderColor: c.border }}>
              <span className="text-[12px]" style={{ color: saveMsg === 'Saved' ? c.success : c.danger }}>
                {saveMsg}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-1.5 text-[13px]"
                  style={{ color: c.textSecondary, border: `1px solid ${c.border}` }}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-1.5 text-[13px] font-medium text-white"
                  style={{ background: c.accent, opacity: saving ? 0.5 : 1 }}>
                  {saving ? 'Saving...' : 'Save & Activate'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Read veto config from chrome storage (options page runs in extension context)
async function getVetoConfig(): Promise<{ apiKey: string; endpoint: string; enabled: boolean }> {
  return new Promise(resolve => {
    chrome.storage.local.get('veto-settings', result => {
      const config = result['veto-settings'] || { apiKey: '', endpoint: 'https://api.veto.so', enabled: false };
      resolve(config);
    });
  });
}
