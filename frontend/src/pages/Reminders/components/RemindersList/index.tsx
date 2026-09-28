import { api } from '../../../../api'

interface Reminder {
  id: number
  deadline_id: number
  offset_days: number
  scheduled_at: string
  channel: string
  delivery_status: string
  sent_at?: string
}

interface Deadline {
  id: number
  title: string
  deadline_date?: string
}

interface Props {
  reminders: Reminder[]
  deadlines: Deadline[]
  onDeleted: (id: number) => void
}

const STATUS_STYLES: Record<string, { color: string; label: string }> = {
  pending: { color: 'var(--status-coming-soon)', label: 'Pending' },
  sent:    { color: 'var(--status-confirmed)',   label: 'Sent' },
  failed:  { color: 'var(--status-check-failed)', label: 'Failed' },
}

export const RemindersList = ({ reminders, deadlines, onDeleted }: Props) => {
  const dlMap = Object.fromEntries(deadlines.map((d) => [d.id, d]))

  const handleDelete = async (r: Reminder) => {
    if (!confirm('Delete this reminder?')) return
    try {
      await api.reminders.delete(r.id)
      onDeleted(r.id)
    } catch (_) {}
  }

  if (reminders.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">🔔</span>
        <h3>No reminders yet</h3>
        <p>Add a reminder to get notified before a deadline approaches.</p>
      </div>
    )
  }

  // Group by deadline
  const grouped: Record<number, Reminder[]> = {}
  reminders.forEach((r) => {
    if (!grouped[r.deadline_id]) grouped[r.deadline_id] = []
    grouped[r.deadline_id].push(r)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {Object.entries(grouped).map(([dlId, rems]) => {
        const dl = dlMap[Number(dlId)]
        return (
          <div key={dlId} className="glass-card" style={{ padding: '16px 20px' }}>
            <div style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--color-border)' }}>
              <p style={{ fontWeight: 600, color: 'var(--color-heading)', fontSize: '0.9rem' }}>
                {dl?.title ?? `Deadline #${dlId}`}
              </p>
              {dl?.deadline_date && (
                <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  Due: {new Date(dl.deadline_date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {rems.map((r) => {
                const st = STATUS_STYLES[r.delivery_status] ?? STATUS_STYLES.pending
                return (
                  <div key={r.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', borderRadius: '8px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--color-border)',
                    gap: '12px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span style={{ fontSize: '1.1rem' }}>🔔</span>
                      <div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text)', fontWeight: 500 }}>
                          {r.offset_days === 0 ? 'On the day' : `${r.offset_days} day${r.offset_days !== 1 ? 's' : ''} before`}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '1px', fontVariantNumeric: 'tabular-nums' }}>
                          {new Date(r.scheduled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          {r.sent_at && ` · Sent ${new Date(r.sent_at).toLocaleTimeString()}`}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: st.color }}>{st.label}</span>
                      <button
                        className="btn btn-danger btn-icon btn-sm"
                        onClick={() => handleDelete(r)}
                        title="Delete reminder"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
