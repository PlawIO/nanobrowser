import { useState, useEffect } from 'react';
import { type GeneralSettingsConfig, generalSettingsStore, DEFAULT_GENERAL_SETTINGS } from '@extension/storage';
import { t } from '@extension/i18n';
import { c } from '../styles';

export const GeneralSettings = () => {
  const [settings, setSettings] = useState<GeneralSettingsConfig>(DEFAULT_GENERAL_SETTINGS);

  useEffect(() => {
    generalSettingsStore.getSettings().then(setSettings);
  }, []);

  const update = async <K extends keyof GeneralSettingsConfig>(key: K, value: GeneralSettingsConfig[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    await generalSettingsStore.updateSettings({ [key]: value } as Partial<GeneralSettingsConfig>);
    const latest = await generalSettingsStore.getSettings();
    setSettings(latest);
  };

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold" style={{ color: c.text }}>
        {t('options_general_header')}
      </h1>
      <p className="mb-8 text-sm" style={{ color: c.textDim }}>
        Configure agent behavior and limits
      </p>

      <div className="space-y-0" style={{ borderTop: `1px solid ${c.border}` }}>
        <Row label={t('options_general_maxSteps')} desc={t('options_general_maxSteps_desc')}>
          <NumInput value={settings.maxSteps} min={1} max={50} onChange={v => update('maxSteps', v)} />
        </Row>
        <Row label={t('options_general_maxActions')} desc={t('options_general_maxActions_desc')}>
          <NumInput
            value={settings.maxActionsPerStep}
            min={1}
            max={50}
            onChange={v => update('maxActionsPerStep', v)}
          />
        </Row>
        <Row label={t('options_general_maxFailures')} desc={t('options_general_maxFailures_desc')}>
          <NumInput value={settings.maxFailures} min={1} max={10} onChange={v => update('maxFailures', v)} />
        </Row>
        <Row label={t('options_general_enableVision')} desc={t('options_general_enableVision_desc')}>
          <Toggle checked={settings.useVision} onChange={v => update('useVision', v)} />
        </Row>
        <Row label={t('options_general_displayHighlights')} desc={t('options_general_displayHighlights_desc')}>
          <Toggle checked={settings.displayHighlights} onChange={v => update('displayHighlights', v)} />
        </Row>
        <Row label={t('options_general_planningInterval')} desc={t('options_general_planningInterval_desc')}>
          <NumInput value={settings.planningInterval} min={1} max={20} onChange={v => update('planningInterval', v)} />
        </Row>
        <Row label={t('options_general_minWaitPageLoad')} desc={t('options_general_minWaitPageLoad_desc')}>
          <NumInput
            value={settings.minWaitPageLoad}
            min={250}
            max={5000}
            step={50}
            onChange={v => update('minWaitPageLoad', v)}
          />
        </Row>
        <Row label={t('options_general_replayHistoricalTasks')} desc={t('options_general_replayHistoricalTasks_desc')}>
          <Toggle checked={settings.replayHistoricalTasks} onChange={v => update('replayHistoricalTasks', v)} />
        </Row>
      </div>
    </div>
  );
};

function Row({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-4" style={{ borderBottom: `1px solid ${c.border}` }}>
      <div className="mr-8">
        <div className="text-[13px] font-medium" style={{ color: c.text }}>
          {label}
        </div>
        <div className="mt-0.5 text-[12px]" style={{ color: c.textDim }}>
          {desc}
        </div>
      </div>
      {children}
    </div>
  );
}

function NumInput({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(Number.parseInt(e.target.value, 10))}
      className="w-20 shrink-0 px-3 py-1.5 text-[13px] outline-none transition-colors focus:border-[var(--accent)]"
      style={{ background: c.input, border: `1px solid ${c.border}`, color: c.text }}
    />
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative h-5 w-9 shrink-0 transition-colors"
      style={{ background: checked ? c.accent : '#333' }}>
      <span
        className="absolute left-0.5 top-0.5 block size-4 bg-white transition-transform"
        style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
      />
    </button>
  );
}
