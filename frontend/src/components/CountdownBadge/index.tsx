const getDaysUntil = (dateStr: string | undefined | null): number | null => {
  if (!dateStr) return null
  const target = new Date(dateStr)
  const now    = new Date()
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

const getUrgencyColor = (days: number | null): string => {
  if (days === null) return 'var(--urgency-unknown)'
  if (days < 0)      return 'var(--urgency-overdue)'
  if (days <= 7)     return 'var(--urgency-urgent)'
  if (days <= 30)    return 'var(--urgency-medium)'
  return 'var(--urgency-safe)'
}

interface Props {
  deadlineDate?: string | null
  size?: 'sm' | 'md'
}

export const CountdownBadge = ({ deadlineDate, size = 'md' }: Props) => {
  const days  = getDaysUntil(deadlineDate)
  const color = getUrgencyColor(days)

  if (days === null) {
    return (
      <span style={{ color: 'var(--urgency-unknown)', fontSize: '0.82rem' }}>
        No date
      </span>
    )
  }

  const fontSize = size === 'sm' ? '0.75rem' : '0.85rem'
  let label: string
  if (days < 0)        label = `Overdue ${Math.abs(days)}d`
  else if (days === 0) label = 'Today!'
  else                 label = `${days}d left`

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize, fontWeight: 600, color,
      fontVariantNumeric: 'tabular-nums',
    }}>
      <span style={{
        width: '6px', height: '6px', borderRadius: '50%',
        background: color, flexShrink: 0,
        animation: days >= 0 && days <= 7 ? 'pulse 1.5s ease-in-out infinite' : 'none',
      }} />
      {label}
    </span>
  )
}

export { getDaysUntil }
