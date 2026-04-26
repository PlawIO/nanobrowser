import { useState, useEffect, useCallback } from 'react';
import { firewallStore } from '@extension/storage';
import { t } from '@extension/i18n';
import { c } from '../styles';

export const FirewallSettings = () => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [allowList, setAllowList] = useState<string[]>([]);
  const [denyList, setDenyList] = useState<string[]>([]);
  const [newUrl, setNewUrl] = useState('');
  const [activeList, setActiveList] = useState<'allow' | 'deny'>('deny');

  const load = useCallback(async () => {
    const s = await firewallStore.getFirewall();
    setIsEnabled(s.enabled);
    setAllowList(s.allowList);
    setDenyList(s.denyList);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    const clean = newUrl.trim().replace(/^https?:\/\//, '');
    if (!clean) return;
    if (activeList === 'allow') await firewallStore.addToAllowList(clean);
    else await firewallStore.addToDenyList(clean);
    await load();
    setNewUrl('');
  };

  const handleRemove = async (url: string) => {
    if (activeList === 'allow') await firewallStore.removeFromAllowList(url);
    else await firewallStore.removeFromDenyList(url);
    await load();
  };

  const list = activeList === 'allow' ? allowList : denyList;

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold" style={{ color: c.text }}>
        {t('options_firewall_header')}
      </h1>
      <p className="mb-8 text-sm" style={{ color: c.textDim }}>
        Control which domains the agent can access
      </p>

      {/* Enable */}
      <div
        className="mb-6 flex items-center justify-between py-4"
        style={{ borderTop: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}` }}>
        <div>
          <div className="text-[13px] font-medium" style={{ color: c.text }}>
            {t('options_firewall_enableToggle')}
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isEnabled}
          onClick={async () => {
            await firewallStore.updateFirewall({ enabled: !isEnabled });
            await load();
          }}
          className="relative h-5 w-9 shrink-0 transition-colors"
          style={{ background: isEnabled ? c.accent : '#333' }}>
          <span
            className="absolute left-0.5 top-0.5 block size-4 bg-white transition-transform"
            style={{ transform: isEnabled ? 'translateX(16px)' : 'translateX(0)' }}
          />
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex" style={{ borderBottom: `1px solid ${c.border}` }}>
        {(['deny', 'allow'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveList(tab)}
            className="px-4 py-2 text-[13px] font-medium transition-colors"
            style={{
              color: activeList === tab ? c.accent : c.textSecondary,
              borderBottom: activeList === tab ? `2px solid ${c.accent}` : '2px solid transparent',
            }}>
            {tab === 'deny' ? t('options_firewall_denyList_header') : t('options_firewall_allowList_header')}
          </button>
        ))}
      </div>

      {/* Add */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={newUrl}
          onChange={e => setNewUrl(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleAdd();
          }}
          placeholder={t('options_firewall_placeholders_domainUrl')}
          className="flex-1 px-3 py-2 text-[13px] outline-none transition-colors focus:border-[var(--accent)]"
          style={{ background: c.input, border: `1px solid ${c.border}`, color: c.text }}
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-4 py-2 text-[13px] font-medium text-white transition-colors hover:opacity-90"
          style={{ background: c.accent }}>
          {t('options_firewall_btnAdd')}
        </button>
      </div>

      {/* List */}
      <div className="max-h-72 overflow-y-auto">
        {list.length > 0 ? (
          <div className="space-y-px">
            {list.map(url => (
              <div
                key={url}
                className="group flex items-center justify-between px-3 py-2 transition-colors hover:bg-[#191919]"
                style={{ borderBottom: `1px solid ${c.border}` }}>
                <span className="text-[13px]" style={{ color: c.text }}>
                  {url}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(url)}
                  className="text-[11px] font-medium opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ color: c.danger }}>
                  {t('options_firewall_btnRemove')}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-[13px]" style={{ color: c.textDim }}>
            {activeList === 'allow' ? t('options_firewall_allowList_empty') : t('options_firewall_denyList_empty')}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-8 border-t pt-6" style={{ borderColor: c.border }}>
        <h2 className="mb-3 text-[11px] font-medium uppercase tracking-widest" style={{ color: c.textDim }}>
          {t('options_firewall_howItWorks_header')}
        </h2>
        <div className="space-y-1.5 text-[12px]" style={{ color: c.textSecondary }}>
          {t('options_firewall_howItWorks')
            .split('\n')
            .map((rule, i) => (
              <p key={i}>{rule}</p>
            ))}
        </div>
      </div>
    </div>
  );
};
