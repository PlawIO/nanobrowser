import { memo } from 'react';

export interface PolicyRule {
  id: string;
  name: string;
  description?: string;
  severity: string;
  action: string;
  tools?: string[];
  conditions?: Array<{ field: string; operator: string; value: unknown }>;
  condition_groups?: Array<Array<{ field: string; operator: string; value: unknown }>>;
}

export interface PolicyPreview {
  rules: PolicyRule[];
  explanation: string;
  nonce?: string;
}

interface PolicyCardProps {
  preview: PolicyPreview;
  onActivate: () => void;
  onCancel: () => void;
}

const ACTION_COLORS: Record<string, string> = {
  block: 'var(--danger, #ef4444)',
  require_approval: 'var(--warning, #f59e0b)',
  warn: '#eab308',
  log: 'var(--text-muted, #6b7280)',
  allow: 'var(--success, #22c55e)',
};

function formatCondition(c: { field: string; operator: string; value: unknown }): string {
  const op = c.operator.replace(/_/g, ' ');
  const val = typeof c.value === 'string' ? `"${c.value}"` : JSON.stringify(c.value);
  return `${c.field} ${op} ${val}`;
}

export default memo(function PolicyCard({ preview, onActivate, onCancel }: PolicyCardProps) {
  return (
    <div
      className="m-2 overflow-hidden border"
      style={{
        borderColor: 'var(--accent)',
        backgroundColor: 'var(--bg-surface)',
      }}>
      <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: 'var(--accent-subtle)' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 1L3 4v4c0 3.3 2.1 6.4 5 7 2.9-.6 5-3.7 5-7V4L8 1z"
            stroke="var(--accent)"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M6 8l1.5 1.5L10 6"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
          Policy Preview
        </span>
        <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
          {preview.rules.length} rule{preview.rules.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="px-3 py-2">
        <div className="mb-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {preview.explanation}
        </div>

        {preview.rules.map(rule => (
          <div
            key={rule.id}
            className="mb-2 border px-2 py-1.5"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--bg-muted)',
            }}>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                {rule.name}
              </span>
              <span
                className="border px-1 py-0.5 text-[10px] font-semibold uppercase"
                style={{
                  color: ACTION_COLORS[rule.action] ?? 'var(--text-muted)',
                  borderColor: ACTION_COLORS[rule.action] ?? 'var(--text-muted)',
                }}>
                {rule.action.replace(/_/g, ' ')}
              </span>
              <span className="px-1 py-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {rule.severity}
              </span>
            </div>

            {rule.description && (
              <div className="mb-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {rule.description}
              </div>
            )}

            {rule.conditions && rule.conditions.length > 0 && (
              <div
                className="mt-1 space-y-0.5 text-[10px]"
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  color: 'var(--text-muted)',
                }}>
                {rule.conditions.map((c, i) => (
                  <div key={i}>{formatCondition(c)}</div>
                ))}
              </div>
            )}

            {rule.condition_groups && rule.condition_groups.length > 0 && (
              <div
                className="mt-1 space-y-0.5 text-[10px]"
                style={{
                  fontFamily: 'var(--font-mono, monospace)',
                  color: 'var(--text-muted)',
                }}>
                {rule.condition_groups.map((group, gi) => (
                  <div key={gi}>
                    {gi > 0 && <span style={{ color: 'var(--accent)' }}>OR </span>}
                    {group.map((c, ci) => (
                      <span key={ci}>
                        {ci > 0 && ' AND '}
                        {formatCondition(c)}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {rule.tools && rule.tools.length > 0 && (
              <div className="mt-1 text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                applies to: {rule.tools.map(t => t.replace('browser_', '')).join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          type="button"
          onClick={onActivate}
          className="flex-1 py-2 text-xs font-medium transition-colors hover:bg-[var(--bg-elevated)]"
          style={{ color: 'var(--success, #22c55e)' }}>
          Activate
        </button>
        <div className="w-px" style={{ backgroundColor: 'var(--border)' }} />
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 text-xs font-medium transition-colors hover:bg-[var(--bg-elevated)]"
          style={{ color: 'var(--danger, #ef4444)' }}>
          Cancel
        </button>
      </div>
    </div>
  );
});
