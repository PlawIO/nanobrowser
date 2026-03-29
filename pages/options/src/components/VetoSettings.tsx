import { useState, useEffect, useCallback } from 'react';
import { vetoStore } from '@extension/storage';

interface VetoSettingsProps {
  isDarkMode: boolean;
}

export const VetoSettings = ({ isDarkMode }: VetoSettingsProps) => {
  const [enabled, setEnabled] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('https://api.veto.so');
  const [sessionId, setSessionId] = useState('');
  const [agentId, setAgentId] = useState('nanobrowser');
  const [failOpen, setFailOpen] = useState(true);
  const [saved, setSaved] = useState(false);

  const bg = isDarkMode ? '#0d0d0d' : '#ffffff';
  const bgMuted = isDarkMode ? '#1a1a1a' : '#f2f2f2';
  const border = isDarkMode ? '#1f1f1f' : '#e5e5e5';
  const text = isDarkMode ? '#fafafa' : '#080808';
  const textMuted = isDarkMode ? '#b8b8b8' : '#525252';
  const textDim = isDarkMode ? '#737373' : '#737373';
  const accent = '#F97316';
  const inputBg = isDarkMode ? '#1a1a1a' : '#f5f5f5';

  const loadSettings = useCallback(async () => {
    const settings = await vetoStore.getVeto();
    setEnabled(settings.enabled);
    setApiKey(settings.apiKey);
    setEndpoint(settings.endpoint);
    setSessionId(settings.sessionId);
    setAgentId(settings.agentId);
    setFailOpen(settings.failOpen);
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async () => {
    await vetoStore.updateVeto({ enabled, apiKey, endpoint, sessionId, agentId, failOpen });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleToggle = async () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    await vetoStore.updateVeto({ enabled: newEnabled });
  };

  return (
    <section className="space-y-6">
      <div style={{ backgroundColor: bg, border: `1px solid ${border}`, padding: '24px' }}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold" style={{ color: text }}>
            Veto — Policy Guard
          </h2>
          <a
            href="https://veto.so"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs"
            style={{ color: accent }}>
            veto.so ↗
          </a>
        </div>
        <p className="mb-6 text-sm" style={{ color: textMuted }}>
          Veto validates every browser action against your policies before execution. Actions that violate policies are
          blocked — the agent adapts and tries a different approach.
        </p>

        {/* Enable toggle */}
        <div
          className="mb-6 flex items-center justify-between p-4"
          style={{ backgroundColor: bgMuted, border: `1px solid ${border}` }}>
          <label htmlFor="toggle-veto" className="text-sm font-medium" style={{ color: text }}>
            Enable Veto Guard
          </label>
          <div className="relative inline-block w-12 select-none">
            <input type="checkbox" checked={enabled} onChange={handleToggle} className="sr-only" id="toggle-veto" />
            <label
              htmlFor="toggle-veto"
              className="block h-6 cursor-pointer overflow-hidden"
              style={{ backgroundColor: enabled ? accent : isDarkMode ? '#2e2e2e' : '#cccccc' }}>
              <span className="sr-only">Toggle Veto guard</span>
              <span
                className="block size-6 bg-white shadow transition-transform"
                style={{ transform: enabled ? 'translateX(24px)' : 'translateX(0)' }}
              />
            </label>
          </div>
        </div>

        {/* Settings fields */}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="veto-api-key"
              className="mb-1 block text-xs font-medium uppercase tracking-wider"
              style={{ color: textDim }}>
              API Key
            </label>
            <input
              id="veto-api-key"
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="veto_..."
              className="w-full px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: inputBg, border: `1px solid ${border}`, color: text }}
            />
            <p className="mt-1 text-xs" style={{ color: textDim }}>
              Your Veto API key from the dashboard
            </p>
          </div>

          <div>
            <label
              htmlFor="veto-endpoint"
              className="mb-1 block text-xs font-medium uppercase tracking-wider"
              style={{ color: textDim }}>
              Endpoint
            </label>
            <input
              id="veto-endpoint"
              type="text"
              value={endpoint}
              onChange={e => setEndpoint(e.target.value)}
              placeholder="https://api.veto.so"
              className="w-full px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: inputBg, border: `1px solid ${border}`, color: text }}
            />
            <p className="mt-1 text-xs" style={{ color: textDim }}>
              Use http://localhost:3001 for local development
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="veto-agent-id"
                className="mb-1 block text-xs font-medium uppercase tracking-wider"
                style={{ color: textDim }}>
                Agent ID
              </label>
              <input
                id="veto-agent-id"
                type="text"
                value={agentId}
                onChange={e => setAgentId(e.target.value)}
                placeholder="nanobrowser"
                className="w-full px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: inputBg, border: `1px solid ${border}`, color: text }}
              />
            </div>
            <div>
              <label
                htmlFor="veto-session-id"
                className="mb-1 block text-xs font-medium uppercase tracking-wider"
                style={{ color: textDim }}>
                Session ID
              </label>
              <input
                id="veto-session-id"
                type="text"
                value={sessionId}
                onChange={e => setSessionId(e.target.value)}
                placeholder="Auto-generated if empty"
                className="w-full px-3 py-2 text-sm outline-none"
                style={{ backgroundColor: inputBg, border: `1px solid ${border}`, color: text }}
              />
            </div>
          </div>

          {/* Fail open toggle */}
          <div
            className="flex items-center justify-between p-3"
            style={{ backgroundColor: bgMuted, border: `1px solid ${border}` }}>
            <div>
              <span className="text-sm font-medium" style={{ color: text }}>
                Fail Open
              </span>
              <p className="text-xs" style={{ color: textDim }}>
                Allow actions if Veto is unreachable
              </p>
            </div>
            <div className="relative inline-block w-12 select-none">
              <input
                type="checkbox"
                checked={failOpen}
                onChange={() => setFailOpen(!failOpen)}
                className="sr-only"
                id="toggle-fail-open"
              />
              <label
                htmlFor="toggle-fail-open"
                className="block h-6 cursor-pointer overflow-hidden"
                style={{ backgroundColor: failOpen ? accent : isDarkMode ? '#2e2e2e' : '#cccccc' }}>
                <span className="sr-only">Toggle fail open</span>
                <span
                  className="block size-6 bg-white shadow transition-transform"
                  style={{ transform: failOpen ? 'translateX(24px)' : 'translateX(0)' }}
                />
              </label>
            </div>
          </div>

          {/* Save button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {saved && (
              <span className="text-sm" style={{ color: '#16A34A' }}>
                Saved
              </span>
            )}
            <button
              onClick={handleSave}
              className="px-6 py-2 text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: accent }}>
              Save
            </button>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div style={{ backgroundColor: bg, border: `1px solid ${border}`, padding: '24px' }}>
        <h2 className="mb-4 text-base font-semibold" style={{ color: text }}>
          How Veto Works
        </h2>
        <ul className="list-none space-y-3 text-sm" style={{ color: textMuted }}>
          <li className="flex gap-2">
            <span style={{ color: accent }}>—</span>
            Every browser action is validated against your Veto policies before execution.
          </li>
          <li className="flex gap-2">
            <span style={{ color: accent }}>—</span>
            Denied actions return errors — the agent adapts and tries a different approach.
          </li>
          <li className="flex gap-2">
            <span style={{ color: accent }}>—</span>
            Policies are managed via the Veto dashboard at{' '}
            <a href="https://veto.so" target="_blank" rel="noopener noreferrer" style={{ color: accent }}>
              veto.so
            </a>
            .
          </li>
          <li className="flex gap-2">
            <span style={{ color: accent }}>—</span>
            Session tracking enables budget constraints, rate limits, and named counters.
          </li>
        </ul>
      </div>
    </section>
  );
};
