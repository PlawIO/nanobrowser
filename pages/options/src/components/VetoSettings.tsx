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

  const cardClass = `rounded-lg border ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-blue-100 bg-gray-50'} p-6 text-left shadow-sm`;
  const labelClass = `text-base font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`;
  const inputClass = `w-full rounded-md border px-3 py-2 text-sm ${isDarkMode ? 'border-gray-600 bg-slate-700 text-white' : 'border-gray-300 bg-white text-gray-700'}`;
  const helpClass = `mt-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`;

  return (
    <section className="space-y-6">
      <div className={cardClass}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
            Veto — Policy Guard
          </h2>
          <a
            href="https://veto.so"
            target="_blank"
            rel="noopener noreferrer"
            className={`text-xs ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}>
            veto.so ↗
          </a>
        </div>
        <p className={`mb-6 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Veto validates every browser action against your policies before execution. Actions that violate policies are
          blocked — the agent adapts and tries a different approach.
        </p>

        {/* Enable toggle */}
        <div
          className={`my-6 rounded-lg border p-4 ${isDarkMode ? 'border-slate-700 bg-slate-700' : 'border-gray-200 bg-gray-100'}`}>
          <div className="flex items-center justify-between">
            <label htmlFor="toggle-veto" className={labelClass}>
              Enable Veto Guard
            </label>
            <div className="relative inline-block w-12 select-none">
              <input type="checkbox" checked={enabled} onChange={handleToggle} className="sr-only" id="toggle-veto" />
              <label
                htmlFor="toggle-veto"
                className={`block h-6 cursor-pointer overflow-hidden rounded-full ${
                  enabled ? 'bg-orange-500' : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                }`}>
                <span className="sr-only">Toggle Veto guard</span>
                <span
                  className={`block size-6 rounded-full bg-white shadow transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </label>
            </div>
          </div>
        </div>

        {/* Settings fields */}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="veto-api-key"
              className={`mb-1 block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              API Key
            </label>
            <input
              id="veto-api-key"
              type="password"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="veto_..."
              className={inputClass}
            />
            <p className={helpClass}>Your Veto API key from the dashboard</p>
          </div>

          <div>
            <label
              htmlFor="veto-endpoint"
              className={`mb-1 block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Endpoint
            </label>
            <input
              id="veto-endpoint"
              type="text"
              value={endpoint}
              onChange={e => setEndpoint(e.target.value)}
              placeholder="https://api.veto.so"
              className={inputClass}
            />
            <p className={helpClass}>Veto API server URL. Use http://localhost:3001 for local development.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="veto-agent-id"
                className={`mb-1 block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Agent ID
              </label>
              <input
                id="veto-agent-id"
                type="text"
                value={agentId}
                onChange={e => setAgentId(e.target.value)}
                placeholder="nanobrowser"
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="veto-session-id"
                className={`mb-1 block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Session ID (optional)
              </label>
              <input
                id="veto-session-id"
                type="text"
                value={sessionId}
                onChange={e => setSessionId(e.target.value)}
                placeholder="Auto-generated if empty"
                className={inputClass}
              />
            </div>
          </div>

          {/* Fail open toggle */}
          <div
            className={`rounded-lg border p-3 ${isDarkMode ? 'border-slate-600 bg-slate-700' : 'border-gray-200 bg-gray-100'}`}>
            <div className="flex items-center justify-between">
              <div>
                <label
                  htmlFor="toggle-fail-open"
                  className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  Fail Open
                </label>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
                  className={`block h-6 cursor-pointer overflow-hidden rounded-full ${
                    failOpen ? 'bg-orange-500' : isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                  }`}>
                  <span className="sr-only">Toggle fail open</span>
                  <span
                    className={`block size-6 rounded-full bg-white shadow transition-transform ${
                      failOpen ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Save button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {saved && (
              <span className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>Settings saved</span>
            )}
            <button
              onClick={handleSave}
              className="rounded-md bg-orange-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600">
              Save
            </button>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className={cardClass}>
        <h2 className={`mb-4 text-xl font-semibold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          How Veto Works
        </h2>
        <ul className={`list-disc space-y-2 pl-5 text-left text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <li>
            Every browser action (click, navigate, type, etc.) is validated against your Veto policies before execution.
          </li>
          <li>If a policy denies the action, the agent receives an error and adapts its approach.</li>
          <li>
            Policies are managed via the Veto dashboard at{' '}
            <a href="https://veto.so" target="_blank" rel="noopener noreferrer" className="text-orange-500 underline">
              veto.so
            </a>{' '}
            or your self-hosted server.
          </li>
          <li>Session tracking enables budget constraints, rate limits, and named counters across actions.</li>
          <li>The agent is unaware of Veto — it just sees denied actions as errors and retries differently.</li>
        </ul>
      </div>
    </section>
  );
};
