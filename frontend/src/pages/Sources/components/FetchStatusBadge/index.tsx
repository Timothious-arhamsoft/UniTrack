export const FetchStatusBadge = ({ source }) => {
  if (!source.last_checked_at) {
    return (
      <span style={{ fontSize: '0.78rem', color: 'var(--color-text-subtle)' }}>
        Never checked
      </span>
    )
  }

  if (source.last_error) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        fontSize: '0.78rem', color: 'var(--status-check-failed)',
      }}>
        <span>✕</span> Error
      </span>
    )
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '0.78rem', color: 'var(--status-confirmed)',
    }}>
      <span>✓</span> OK
    </span>
  )
}
