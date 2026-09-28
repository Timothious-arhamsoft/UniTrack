const formatRelativeTime = (isoString) => {
  if (!isoString) return 'Never'
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export const RecentActivity = ({ sources, onNavigate }) => {
  const recent = [...(sources || [])]
    .filter((s) => s.last_checked_at)
    .sort((a, b) => new Date(b.last_checked_at).getTime() - new Date(a.last_checked_at).getTime())
    .slice(0, 5)

  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
        <h3 style={{ fontSize: '0.95rem', margin: 0 }}>Recent Checks</h3>
        <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('sources')}>
          View all →
        </button>
      </div>

      {recent.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--color-text-subtle)', fontSize: '0.85rem' }}>
          No sources have been checked yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {recent.map((s) => (
            <div key={s.id} style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: '8px',
              padding: '8px 10px', borderRadius: '7px',
              background: 'rgba(255,255,255,0.02)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0,
                  background: s.last_error
                    ? 'var(--status-check-failed)'
                    : 'var(--status-confirmed)',
                }} />
                <span style={{
                  fontSize: '0.85rem', color: 'var(--color-text)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {s.name}
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                {formatRelativeTime(s.last_checked_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
