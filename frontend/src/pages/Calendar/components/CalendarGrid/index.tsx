import { useState } from 'react'

interface Deadline {
  id: number
  title: string
  deadline_date?: string
  status: string
  category: string
  institution?: string
}

interface Props {
  deadlines: Deadline[]
  onSelectDeadline: (d: Deadline) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  admission:     '#6366f1',
  scholarship:   '#f59e0b',
  language_test: '#10b981',
  document:      '#3b82f6',
  personal:      '#8b5cf6',
  other:         '#6b7280',
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export const CalendarGrid = ({ deadlines, onSelectDeadline }: Props) => {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const prev = () => { if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1) }
  const next = () => { if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1) }

  // Map deadline_date → deadlines for this month
  const dlMap: Record<number, Deadline[]> = {}
  deadlines.forEach((dl) => {
    if (!dl.deadline_date) return
    const d = new Date(dl.deadline_date)
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!dlMap[day]) dlMap[day] = []
      dlMap[day].push(dl)
    }
  })

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  const isToday = (day: number | null) =>
    day !== null && day === today.getDate() && month === today.getMonth() && year === today.getFullYear()

  return (
    <div className="glass-card" style={{ padding: '20px' }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
        <button className="btn btn-ghost btn-icon" onClick={prev}>‹</button>
        <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{MONTHS[month]} {year}</h3>
        <button className="btn btn-ghost btn-icon" onClick={next}>›</button>
      </div>

      {/* Day headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
        {DAYS.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-text-subtle)', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '4px 0' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {cells.map((day, idx) => {
          const dots = day ? (dlMap[day] ?? []) : []
          return (
            <div
              key={idx}
              style={{
                minHeight: '52px',
                padding: '6px',
                borderRadius: '8px',
                background: isToday(day)
                  ? 'var(--color-primary-dim)'
                  : day ? 'rgba(255,255,255,0.02)' : 'transparent',
                border: isToday(day)
                  ? '1px solid rgba(99,102,241,0.4)'
                  : '1px solid transparent',
                cursor: dots.length > 0 ? 'pointer' : 'default',
                transition: 'background 150ms',
              }}
              onMouseEnter={(e) => { if (day && !isToday(day)) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={(e) => { if (day && !isToday(day)) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)' }}
              onClick={() => { if (dots.length === 1) onSelectDeadline(dots[0]) }}
            >
              {day !== null && (
                <>
                  <div style={{
                    fontSize: '0.8rem',
                    fontWeight: isToday(day) ? 700 : 400,
                    color: isToday(day) ? 'var(--color-primary)' : 'var(--color-text-muted)',
                    marginBottom: '4px',
                  }}>
                    {day}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                    {dots.slice(0, 3).map((dl, di) => (
                      <span
                        key={di}
                        title={dl.title}
                        onClick={(e) => { e.stopPropagation(); onSelectDeadline(dl) }}
                        style={{
                          display: 'block',
                          width: '8px', height: '8px', borderRadius: '50%',
                          background: CATEGORY_COLORS[dl.category] || '#6b7280',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      />
                    ))}
                    {dots.length > 3 && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--color-text-subtle)', lineHeight: '8px' }}>
                        +{dots.length - 3}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--color-border)' }}>
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, display: 'block' }} />
            {cat.replace('_', ' ')}
          </div>
        ))}
      </div>
    </div>
  )
}
