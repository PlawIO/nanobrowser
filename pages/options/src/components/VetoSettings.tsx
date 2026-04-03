import { useState, useEffect, useCallback } from 'react';
import { vetoStore, type VetoMode } from '@extension/storage';
import { c } from '../styles';

const VETO_AUTH_STATE_KEY = 'veto-auth-state';
const VETO_TOKEN_PATTERN = /^[A-Za-z0-9._-]{20,}$/;

export const VetoSettings = () => {
  const [enabled, setEnabled] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('https://api.veto.so');
  const [sessionId, setSessionId] = useState('');
  const [agentId, setAgentId] = useState('veto-browse');
  const [failOpen, setFailOpen] = useState(false);
  const [mode, setMode] = useState<VetoMode>('strict');
  const [localRulesCount, setLocalRulesCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const load = useCallback(async () => {
    const s = await vetoStore.getVeto();
    setEnabled(s.enabled);
    setApiKey(s.apiKey);
    setEndpoint(s.endpoint);
    setSessionId(s.sessionId);
    setAgentId(s.agentId);
    setFailOpen(s.failOpen);
    setMode(s.mode);
    setIsAuthenticated(s.isAuthenticated);
    setUserEmail(s.userEmail);
    try {
      const stored = await chrome.storage.local.get('veto-local-rules');
      if (stored['veto-local-rules']) {
        const rules = JSON.parse(stored['veto-local-rules']);
        setLocalRulesCount(Array.isArray(rules) ? rules.length : 0);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    load();

    const params = new URLSearchParams(window.location.search);
    const token = params.get('veto_token');
    const email = params.get('veto_email');
    const state = params.get('veto_state');

    if (!token) {
      return;
    }

    const expectedState = window.sessionStorage.getItem(VETO_AUTH_STATE_KEY);
    window.sessionStorage.removeItem(VETO_AUTH_STATE_KEY);
    window.history.replaceState({}, '', window.location.pathname);

    const hasValidState = Boolean(state && expectedState && state === expectedState);
    const hasValidTokenShape = VETO_TOKEN_PATTERN.test(token);

    if (!hasValidState || !hasValidTokenShape) {
      setAuthError('Secure Veto login expired. Please try again.');
      return;
    }

    vetoStore
      .updateVeto({
        authToken: token,
        userEmail: email || '',
        isAuthenticated: true,
        enabled: true,
      })
      .then(() => {
        setAuthError(null);
        setIsAuthenticated(true);
        setUserEmail(email || '');
        setEnabled(true);
      })
      .catch(() => {
        setAuthError('Failed to finish Veto login. Please try again.');
      });
  }, [load]);

  const save = async () => {
    await vetoStore.updateVeto({ enabled, apiKey, endpoint, sessionId, agentId, failOpen, mode });
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
            className="absolute left-0.5 top-0.5 block size-4 bg-white transition-transform"
            style={{ transform: enabled ? 'translateX(16px)' : 'translateX(0)' }}
          />
        </button>
      </div>

      {/* Veto Login or BYOK */}
      <div className="space-y-5">
        {isAuthenticated ? (
          <div
            className="flex items-center justify-between py-4"
            style={{ borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}` }}>
            <div>
              <div className="text-[13px] font-medium" style={{ color: c.text }}>
                Logged in as {userEmail || 'Veto user'}
              </div>
              <div className="mt-0.5 text-[12px]" style={{ color: c.textDim }}>
                Policy generation powered by Veto
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                await vetoStore.updateVeto({ authToken: '', userEmail: '', isAuthenticated: false });
                setIsAuthenticated(false);
                setUserEmail('');
              }}
              className="px-3 py-1 text-[12px] transition-colors hover:opacity-80"
              style={{ color: c.textDim, border: `1px solid ${c.border}` }}>
              Log out
            </button>
          </div>
        ) : (
          <>
            <div
              className="flex flex-col items-center gap-3 py-4"
              style={{ borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}` }}>
              <button
                type="button"
                onClick={() => {
                  const authState = crypto.randomUUID();
                  window.sessionStorage.setItem(VETO_AUTH_STATE_KEY, authState);
                  setAuthError(null);

                  const redirectUrl = new URL(chrome.runtime.getURL('options/index.html'));
                  redirectUrl.searchParams.set('veto_state', authState);

                  window.open(
                    `https://veto.so/auth/extension?redirect=${encodeURIComponent(redirectUrl.toString())}`,
                    '_blank',
                  );
                }}
                className="w-full py-2.5 text-[13px] font-medium text-white transition-colors hover:opacity-90"
                style={{ background: c.accent }}>
                Log in to Veto
              </button>
              <p className="text-[11px]" style={{ color: c.textDim }}>
                Get policy enforcement + AI policy generation out of the box
              </p>
            </div>

            <div className="py-2 text-center text-[11px]" style={{ color: c.textDim }}>
              — or bring your own API key —
            </div>

            {authError ? (
              <div
                className="rounded border px-3 py-2 text-[12px]"
                style={{ color: '#fca5a5', borderColor: '#7f1d1d' }}>
                {authError}
              </div>
            ) : null}

            <div>
              <label htmlFor="veto-api-key" className={labelCls} style={{ color: c.textDim }}>
                API Key
              </label>
              <input
                id="veto-api-key"
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
          </>
        )}

        <div>
          <label htmlFor="veto-endpoint" className={labelCls} style={{ color: c.textDim }}>
            Endpoint
          </label>
          <input
            id="veto-endpoint"
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
            <label htmlFor="veto-agent-id" className={labelCls} style={{ color: c.textDim }}>
              Agent ID
            </label>
            <input
              id="veto-agent-id"
              type="text"
              value={agentId}
              onChange={e => setAgentId(e.target.value)}
              placeholder="veto-browse"
              className={inputCls}
              style={inputSt}
            />
          </div>
          <div>
            <label htmlFor="veto-session-id" className={labelCls} style={{ color: c.textDim }}>
              Session ID
            </label>
            <input
              id="veto-session-id"
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
              className="absolute left-0.5 top-0.5 block size-4 bg-white transition-transform"
              style={{ transform: failOpen ? 'translateX(16px)' : 'translateX(0)' }}
            />
          </button>
        </div>

        {/* Enforcement Mode */}
        <div className="space-y-2">
          <div className={labelCls} style={{ color: c.textDim }}>
            Enforcement Mode
          </div>
          <div className="flex gap-2">
            {(['strict', 'log', 'shadow'] as const).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="flex-1 py-2 text-[12px] font-medium transition-colors"
                style={{
                  background: mode === m ? c.accent : c.input,
                  color: mode === m ? '#fff' : c.textSecondary,
                  border: `1px solid ${mode === m ? c.accent : c.border}`,
                }}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <p className="text-[11px]" style={{ color: c.textDim }}>
            {mode === 'strict' && 'Actions are blocked when policies match'}
            {mode === 'log' && 'Violations are logged but actions are allowed'}
            {mode === 'shadow' && 'Policies are evaluated silently with no enforcement'}
          </p>
        </div>

        {/* Local Rules Info */}
        {localRulesCount > 0 && (
          <div className="flex items-center justify-between py-3" style={{ borderTop: `1px solid ${c.border}` }}>
            <div className="text-[12px]" style={{ color: c.textSecondary }}>
              Local rules: {localRulesCount} active
            </div>
          </div>
        )}

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
