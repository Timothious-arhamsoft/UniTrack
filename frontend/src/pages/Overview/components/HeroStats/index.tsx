interface Stats {
  activeSources: number
  upcomingDeadlines: number
  overdue: number
  needsReview: number
}

interface Props {
  stats: Stats
}

const CARDS = [
  {
    key: 'activeSources',
    label: 'Active Sources',
    icon: '🔗',
    gradient: 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(139,92,246,0.12) 100%)',
    barColor: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
    color: '#a5b4fc',
  },
  {
    key: 'upcomingDeadlines',
    label: 'Upcoming Deadlines',
    icon: '📋',
    gradient: 'linear-gradient(135deg, rgba(52,211,153,0.18) 0%, rgba(16,185,129,0.06) 100%)',
    barColor: 'linear-gradient(90deg, #34d399, #10b981)',
    color: '#6ee7b7',
  },
  {
    key: 'overdue',
    label: 'Overdue',
    icon: '⚠',
    gradient: 'linear-gradient(135deg, rgba(248,113,113,0.18) 0%, rgba(239,68,68,0.06) 100%)',
    barColor: 'linear-gradient(90deg, #f87171, #ef4444)',
    color: '#fca5a5',
  },
  {
    key: 'needsReview',
    label: 'Needs Review',
    icon: '🔍',
    gradient: 'linear-gradient(135deg, rgba(251,191,36,0.18) 0%, rgba(245,158,11,0.06) 100%)',
    barColor: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
    color: '#fcd34d',
  },
]

export const HeroStats = ({ stats }: Props) => (
  <div className="overview-hero-grid">
    {CARDS.map((card) => {
      const value = stats[card.key as keyof Stats] ?? '—'
      return (
        <div
          key={card.key}
          className="glass-card overview-hero-card"
          style={{ background: card.gradient }}
        >
          <span className="stat-icon">{card.icon}</span>
          <div className="stat-value" style={{ color: card.color }}>{value}</div>
          <div className="stat-label">{card.label}</div>
          <div className="stat-bar" style={{ background: card.barColor }} />
        </div>
      )
    })}
  </div>
)
