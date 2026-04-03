import { memo } from 'react';

interface Preset {
  label: string;
  description: string;
  rules: Array<{
    id: string;
    name: string;
    description: string;
    enabled: true;
    severity: 'high' | 'medium';
    action: 'block' | 'require_approval';
    tools?: string[];
    conditions?: Array<{ field: string; operator: string; value: unknown }>;
  }>;
}

const PRESETS: Preset[] = [
  {
    label: 'Shopping Guard',
    description: 'Require approval for purchases over $150',
    rules: [
      {
        id: 'preset-shopping-guard',
        name: 'Shopping Guard ($150 limit)',
        description: 'Require human approval when max price on page exceeds $150',
        enabled: true,
        severity: 'high',
        action: 'require_approval',
        conditions: [{ field: 'arguments.extracted_entities.max_price', operator: 'greater_than', value: 150 }],
      },
    ],
  },
  {
    label: 'Research Boundary',
    description: 'Block competitor pricing pages',
    rules: [
      {
        id: 'preset-research-boundary',
        name: 'Research Boundary',
        description: 'Block navigation to competitor pricing pages',
        enabled: true,
        severity: 'high',
        action: 'block',
        tools: ['browser_goToUrl', 'browser_clickElement'],
        conditions: [
          { field: 'arguments.current_url', operator: 'matches', value: '(competitor|rival|opponent).*pricing' },
        ],
      },
    ],
  },
  {
    label: 'Social Media Timer',
    description: 'Block social media after 20 minutes',
    rules: [
      {
        id: 'preset-social-timer',
        name: 'Social Media Timer (20 min)',
        description: 'Block actions on social media domains after 20 minutes cumulative time',
        enabled: true,
        severity: 'medium',
        action: 'block',
        conditions: [
          {
            field: 'arguments.current_url',
            operator: 'matches',
            value: '(twitter|x|reddit|instagram|facebook|tiktok)\\.com',
          },
          { field: 'arguments.domain_time_seconds', operator: 'greater_than', value: 1200 },
        ],
      },
    ],
  },
  {
    label: 'PII Shield',
    description: 'Block actions when sensitive data detected',
    rules: [
      {
        id: 'preset-pii-shield',
        name: 'PII Shield',
        description: 'Require approval when sensitive personal data is detected on the page',
        enabled: true,
        severity: 'high',
        action: 'require_approval',
        conditions: [{ field: 'arguments.extracted_entities.has_sensitive_pii', operator: 'equals', value: true }],
      },
    ],
  },
];

interface PolicyPresetsProps {
  onActivate: (rules: Preset['rules']) => void;
}

export default memo(function PolicyPresets({ onActivate }: PolicyPresetsProps) {
  return (
    <div className="m-2">
      <div className="mb-2 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        Policy Templates
      </div>
      <div className="grid grid-cols-1 gap-1.5">
        {PRESETS.map(preset => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onActivate(preset.rules)}
            className="border px-2 py-1.5 text-left transition-colors hover:bg-[var(--bg-elevated)]"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--bg-surface)',
            }}>
            <div className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>
              {preset.label}
            </div>
            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {preset.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});
