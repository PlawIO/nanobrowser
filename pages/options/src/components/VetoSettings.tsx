import { useState, useEffect, useCallback } from 'react';
import { vetoStore } from '@extension/storage';
import { c } from '../styles';

interface VetoSettingsProps {
  isDarkMode?: boolean;
}

export const VetoSettings = ({ isDarkMode: _isDarkMode = true }: VetoSettingsProps) => {
  const [enabled, setEnabled] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('https://api.veto.so');
  const [sessionId, setSessionId] = useState('');
  const [agentId, setAgentId] = useState('nanobrowser');
  const [failOpen, setFailOpen] = useState(true);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    const s = await vetoStore.getVeto();
    setEnabled(s.enabled);
    setApiKey(s.apiKey);
    setEndpoint(s.endpoint);
    setSessionId(s.sessionId);
    setAgentId(s.agentId);
    setFailOpen(s.failOpen);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    await vetoStore.updateVeto({ enabled, apiKey, endpoint, sessionId, agentId, failOpen });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputCls = 'w-full px-3 py-2 text-[13px] outline-none transition-colors focus:border-[var(--accent)]';
  const inputSt = { background: c.input, border: `1px solid ${c.border}`, color: c.text };
  const labelCls = 'mb-1.5 block text-[11px] font-medium uppercase tracking-widest';

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold" style={{ color: c.text }}>
          Veto Guard
        </h1>
        <a
          href="https://veto.so"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px]"
          style={{ color: c.accent }}>
          veto.so ↗
        </a>
      </div>
      <p className="mb-8 text-sm" style={{ color: c.textDim }}>
        Validate every browser action against your policies before execution
      </p>

      {/* Enable */}
      <div
        className="mb-8 flex items-center justify-between py-4"
        style={{ borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}` }}>
        <div>
          <div className="text-[13px] font-medium" style={{ color: c.text }}>
            Enable Veto Guard
          </div>
          <div className="mt-0.5 text-[12px]" style={{ color: c.textDim }}>
            Intercept and validate all actions
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={async () => {
            const v = !enabled;
            setEnabled(v);
            await vetoStore.updateVeto({ enabled: v });
          }}
          className="relative h-5 w-9 shrink-0 transition-colors"
          style={{ background: enabled ? c.accent : '#333' }}>
          <span
            className="absolute top-0.5 left-0.5 block size-4 bg-white transition-transform"
            style={{ transform: enabled ? 'translateX(16px)' : 'translateX(0)' }}
          />
        </button>
      </div>

      {/* Fields */}
      <div className="space-y-5">
        <div>
          <label className={labelCls} style={{ color: c.textDim }}>
            API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="veto_..."
            className={inputCls}
            style={inputSt}
          />
          <p className="mt-1 text-[11px]" style={{ color: c.textDim }}>
            From your Veto dashboard
          </p>
        </div>

        <div>
          <label className={labelCls} style={{ color: c.textDim }}>
            Endpoint
          </label>
          <input
            type="text"
            value={endpoint}
            onChange={e => setEndpoint(e.target.value)}
            placeholder="https://api.veto.so"
            className={inputCls}
            style={inputSt}
          />
          <p className="mt-1 text-[11px]" style={{ color: c.textDim }}>
            Use http://localhost:3001 for local dev
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls} style={{ color: c.textDim }}>
              Agent ID
            </label>
            <input
              type="text"
              value={agentId}
              onChange={e => setAgentId(e.target.value)}
              placeholder="nanobrowser"
              className={inputCls}
              style={inputSt}
            />
          </div>
          <div>
            <label className={labelCls} style={{ color: c.textDim }}>
              Session ID
            </label>
            <input
              type="text"
              value={sessionId}
              onChange={e => setSessionId(e.target.value)}
              placeholder="Auto if empty"
              className={inputCls}
              style={inputSt}
            />
          </div>
        </div>

        {/* Fail open */}
        <div
          className="flex items-center justify-between py-4"
          style={{ borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}` }}>
          <div>
            <div className="text-[13px] font-medium" style={{ color: c.text }}>
              Fail open
            </div>
            <div className="mt-0.5 text-[12px]" style={{ color: c.textDim }}>
              Allow actions if Veto is unreachable
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={failOpen}
            onClick={() => setFailOpen(!failOpen)}
            className="relative h-5 w-9 shrink-0 transition-colors"
            style={{ background: failOpen ? c.accent : '#333' }}>
            <span
              className="absolute top-0.5 left-0.5 block size-4 bg-white transition-transform"
              style={{ transform: failOpen ? 'translateX(16px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        {/* Save */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {saved && (
            <span className="text-[12px]" style={{ color: c.success }}>
              Saved
            </span>
          )}
          <button
            onClick={save}
            type="button"
            className="px-5 py-2 text-[13px] font-medium text-white transition-colors hover:opacity-90"
            style={{ background: c.accent }}>
            Save
          </button>
        </div>
      </div>

      {/* How it works */}
      <div className="mt-10 border-t pt-6" style={{ borderColor: c.border }}>
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-widest" style={{ color: c.textDim }}>
          How it works
        </h2>
        <div className="space-y-2 text-[12px]" style={{ color: c.textSecondary }}>
          <p>Every action is validated against your Veto policies before execution.</p>
          <p>Denied actions return errors — the agent adapts and tries differently.</p>
          <p>Session tracking enables budgets, rate limits, and named counters.</p>
        </div>
      </div>
    </div>
  );
};
