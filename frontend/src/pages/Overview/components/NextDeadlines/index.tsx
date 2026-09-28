import { CountdownBadge } from '../../../../components'
import { StatusBadge } from '../../../../components'

export const NextDeadlines = ({ deadlines, onNavigate }: { deadlines: any[], onNavigate: (p: string) => void }) => {
  if (!deadlines || deadlines.length === 0) {
    return (
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '1rem' }}>Upcoming Deadlines</h3>
        <div className="empty-state" style={{ padding: '40px 16px' }}>
          <span className="empty-icon">📋</span>
          <p>No upcoming deadlines. Add a source or deadline to get started.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="glass-card" style={{ padding: '24px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
        <div>
          <h3 style={{ fontSize: '1rem', margin: 0 }}>Upcoming Deadlines</h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            Next {deadlines.length} deadline{deadlines.length > 1 ? 's' : ''} sorted by date
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('deadlines')}>
          View all →
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {deadlines.map((dl, idx) => (
          <div
            key={dl.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '14px',
              padding: '14px 16px',
              borderRadius: '10px',
              background: idx === 0
                ? 'linear-gradient(90deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.06) 100%)'
                : 'rgba(255,255,255,0.02)',
              border: idx === 0 ? '1px solid rgba(99,102,241,0.25)' : '1px solid var(--color-border)',
              transition: 'border-color 150ms',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-border-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = idx === 0 ? 'rgba(99,102,241,0.25)' : 'var(--color-border)')}
          >
            {/* Index badge */}
            <div style={{
              width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
              background: idx === 0 ? 'var(--color-primary-dim)' : 'var(--color-surface-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.78rem', fontWeight: 700,
              color: idx === 0 ? 'var(--color-primary)' : 'var(--color-text-muted)',
            }}>
              {idx + 1}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-heading)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {dl.title}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {dl.institution && <span>{dl.institution}</span>}
                {dl.category    && <span>· {dl.category.replace('_', ' ')}</span>}
                {dl.deadline_date && (
                  <span>· {new Date(dl.deadline_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <StatusBadge status={dl.status} size="sm" />
              <CountdownBadge deadlineDate={dl.deadline_date} size="sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
