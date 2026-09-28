export const MonitoringHealth = ({ sources }) => {
  const total  = sources?.length ?? 0
  const active = sources?.filter((s) => s.active)?.length ?? 0
  const now    = Date.now()
  const checked24h = sources?.filter((s) =>
    s.last_checked_at && (now - new Date(s.last_checked_at).getTime()) < 86_400_000
  )?.length ?? 0
  const errors = sources?.filter((s) => s.last_error)?.length ?? 0

  const healthPct = active > 0 ? Math.round((checked24h / active) * 100) : 0

  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      <h3 style={{ fontSize: '0.95rem', marginBottom: '16px' }}>Monitoring Health</h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {[
          { label: 'Total Sources',     value: total,       color: 'var(--color-text)' },
          { label: 'Active',            value: active,      color: 'var(--status-confirmed)' },
          { label: 'Checked (24h)',     value: checked24h,  color: 'var(--status-coming-soon)' },
          { label: 'With Errors',       value: errors,      color: errors > 0 ? 'var(--status-check-failed)' : 'var(--color-text-muted)' },
        ].map((item) => (
          <div key={item.label} style={{
            padding: '12px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--color-border)',
          }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: item.color }}>
              {item.value}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {active > 0 && (
        <div style={{ marginTop: '14px' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: '6px' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Checked today
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              {healthPct}%
            </span>
          </div>
          <div style={{
            height: '4px', borderRadius: '999px',
            background: 'var(--color-surface-3)',
          }}>
            <div style={{
              height: '100%', borderRadius: '999px',
              width: `${healthPct}%`,
              background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))',
              transition: 'width 600ms ease',
            }} />
          </div>
        </div>
      )}
    </div>
  )
}
