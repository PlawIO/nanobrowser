import { memo, useEffect, useState } from 'react';

function EntitySummary({ entities }: { entities: Record<string, unknown> }) {
  const parts: string[] = [];
  if (typeof entities.max_price === 'number' && entities.max_price > 0) parts.push(`max price: $${entities.max_price}`);
  if (entities.has_salary_figures) parts.push('salary data detected');
  if (entities.has_equity_info) parts.push('equity data detected');
  if (Array.isArray(entities.emails) && entities.emails.length > 0) parts.push(`${entities.emails.length} email(s)`);
  if (parts.length === 0) return null;
  return (
    <div className="mb-1 text-xs" style={{ color: 'var(--text-muted)' }}>
      {parts.join(' | ')}
    </div>
  );
}

export interface ApprovalRequest {
  approvalId: string;
  toolName: string;
  args: Record<string, unknown>;
  reason?: string;
  ruleId?: string;
}

interface ApprovalCardProps {
  approval: ApprovalRequest;
  onRespond: (approvalId: string, decision: 'approve' | 'deny') => void;
}

const TIMEOUT_SECONDS = 300;

export default memo(function ApprovalCard({ approval, onRespond }: ApprovalCardProps) {
  const [secondsLeft, setSecondsLeft] = useState(TIMEOUT_SECONDS);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          onRespond(approval.approvalId, 'deny');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [approval.approvalId, onRespond]);

  const actionLabel = approval.toolName.replace('browser_', '').replace(/_/g, ' ');
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div
      className="m-2 overflow-hidden border"
      style={{
        borderColor: 'var(--warning, #f59e0b)',
        backgroundColor: 'var(--bg-surface)',
      }}>
      <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: 'var(--accent-subtle)' }}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 1L1 14h14L8 1z" stroke="var(--warning, #f59e0b)" strokeWidth="1.5" fill="none" />
          <path d="M8 6v3" stroke="var(--warning, #f59e0b)" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="8" cy="11" r="0.75" fill="var(--warning, #f59e0b)" />
        </svg>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
          Approval Required
        </span>
        <span
          className={`ml-auto text-xs font-semibold tabular-nums${secondsLeft < 60 ? ' animate-pulse' : ''}`}
          style={{ color: 'var(--text-muted)' }}>
          {minutes}:{seconds.toString().padStart(2, '0')}
        </span>
      </div>

      <div className="px-3 py-2">
        <div className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-primary)' }}>
          {actionLabel}
        </div>
        {approval.reason && (
          <div className="mb-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {approval.reason}
          </div>
        )}
        {typeof approval.args.page_title === 'string' && (
          <div className="mb-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {String(approval.args.page_title)}
          </div>
        )}
        {typeof approval.args.current_url === 'string' && (
          <div
            className="mb-1 truncate px-2 py-1 text-xs"
            style={{
              backgroundColor: 'var(--bg-muted)',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono, monospace)',
            }}>
            {String(approval.args.current_url)}
          </div>
        )}
        {typeof approval.args.text === 'string' && (
          <div className="mb-1 text-xs italic" style={{ color: 'var(--text-secondary)' }}>
            Text: &quot;{String(approval.args.text).slice(0, 100)}&quot;
          </div>
        )}
        {typeof approval.args.domain_time_seconds === 'number' && approval.args.domain_time_seconds > 0 && (
          <div className="mb-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Time on domain: {Math.floor(Number(approval.args.domain_time_seconds) / 60)}m{' '}
            {Number(approval.args.domain_time_seconds) % 60}s
          </div>
        )}
        {typeof approval.args.extracted_entities === 'object' && approval.args.extracted_entities !== null ? (
          <EntitySummary entities={approval.args.extracted_entities as Record<string, unknown>} />
        ) : null}
      </div>

      <div className="flex border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          type="button"
          onClick={() => onRespond(approval.approvalId, 'approve')}
          className="flex-1 py-2.5 text-xs font-semibold transition-colors hover:bg-[var(--bg-elevated)]"
          style={{ color: 'var(--success, #22c55e)' }}>
          Approve
        </button>
        <div className="w-px" style={{ backgroundColor: 'var(--border)' }} />
        <button
          type="button"
          onClick={() => onRespond(approval.approvalId, 'deny')}
          className="flex-1 py-2.5 text-xs font-semibold transition-colors hover:bg-[var(--bg-elevated)]"
          style={{ color: 'var(--danger, #ef4444)' }}>
          Deny
        </button>
      </div>
    </div>
  );
});
