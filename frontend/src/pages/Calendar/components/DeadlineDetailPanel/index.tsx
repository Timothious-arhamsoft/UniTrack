import { StatusBadge, CountdownBadge } from '../../../../components'

interface Deadline {
  id: number
  title: string
  category: string
  institution?: string
  program?: string
  intake?: string
  deadline_date?: string
  timezone_note?: string
  status: string
  evidence_text?: string
  confidence: string
  needs_review: boolean
}

interface Props {
  deadline: Deadline | null
  onClose: () => void
}

export const DeadlineDetailPanel = ({ deadline, onClose }: Props) => {
  if (!deadline) {
    return (
      <div className="glass-card" style={{ padding: '24px' }}>
        <div className="empty-state" style={{ padding: '32px 0' }}>
          <span className="empty-icon">📅</span>
          <p>Click a deadline dot on the calendar to view details.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card animate-fade-in" style={{ padding: '24px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '1rem', margin: 0 }}>Deadline Detail</h3>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Title</p>
          <p style={{ fontWeight: 600, color: 'var(--color-heading)', fontSize: '1.05rem' }}>{deadline.title}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Status</p>
            <StatusBadge status={deadline.status} />
          </div>
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Countdown</p>
            <CountdownBadge deadlineDate={deadline.deadline_date} />
          </div>
        </div>

        {deadline.deadline_date && (
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Date</p>
            <p style={{ fontVariantNumeric: 'tabular-nums' }}>
              {new Date(deadline.deadline_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {deadline.timezone_note && <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}> ({deadline.timezone_note})</span>}
            </p>
          </div>
        )}

        {(deadline.institution || deadline.program || deadline.intake) && (
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>Institution</p>
            <p>{[deadline.institution, deadline.program, deadline.intake].filter(Boolean).join(' · ')}</p>
          </div>
        )}

        {deadline.needs_review && (
          <div style={{ padding: '10px 12px', borderRadius: '8px', background: 'var(--status-needs-review-bg)', border: '1px solid rgba(251,191,36,0.25)', fontSize: '0.83rem', color: 'var(--status-needs-review)' }}>
            ⚠ This deadline needs your verification before it can be treated as confirmed.
          </div>
        )}

        {deadline.evidence_text && (
          <div>
            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>Source Evidence</p>
            <p style={{ fontSize: '0.82rem', lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word', padding: '10px', borderRadius: '6px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', maxHeight: '160px', overflowY: 'auto' }}>
              {deadline.evidence_text}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
