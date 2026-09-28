const STATUS_MAP = {
  confirmed:           { label: 'Confirmed',        color: 'var(--status-confirmed)',      bg: 'var(--status-confirmed-bg)',      icon: '✓' },
  coming_soon:         { label: 'Coming Soon',       color: 'var(--status-coming-soon)',    bg: 'var(--status-coming-soon-bg)',    icon: '⏳' },
  awaiting:            { label: 'Awaiting',          color: 'var(--status-awaiting)',       bg: 'var(--status-awaiting-bg)',       icon: '◷' },
  needs_verification:  { label: 'Needs Verification',color: 'var(--status-needs-review)',   bg: 'var(--status-needs-review-bg)',   icon: '⚠' },
  no_info:             { label: 'No Info Found',     color: 'var(--status-no-info)',        bg: 'var(--status-no-info-bg)',        icon: '–' },
  check_failed:        { label: 'Check Failed',      color: 'var(--status-check-failed)',   bg: 'var(--status-check-failed-bg)',   icon: '✕' },
  passed:              { label: 'Deadline Passed',   color: 'var(--status-passed)',         bg: 'var(--status-passed-bg)',         icon: '↩' },
}

export const StatusBadge = ({ status, size = 'md' }) => {
  const s = STATUS_MAP[status] || STATUS_MAP['awaiting']
  const fontSize = size === 'sm' ? '0.72rem' : '0.8rem'
  const padding  = size === 'sm' ? '2px 7px'  : '3px 10px'

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding,
      borderRadius: '999px',
      fontSize,
      fontWeight: 600,
      color: s.color,
      background: s.bg,
      border: `1px solid ${s.color}33`,
      letterSpacing: '0.01em',
      whiteSpace: 'nowrap',
    }}>
      <span aria-hidden="true" style={{ fontSize: '0.9em' }}>{s.icon}</span>
      {s.label}
    </span>
  )
}

export { STATUS_MAP }
