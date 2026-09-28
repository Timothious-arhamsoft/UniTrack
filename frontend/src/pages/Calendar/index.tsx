import { useState, useEffect } from 'react'
import { api } from '../../api'
import { CalendarGrid, DeadlineDetailPanel } from './components'

export const Calendar = () => {
  const [deadlines, setDeadlines] = useState<any[]>([])
  const [selected, setSelected]   = useState<any>(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    api.deadlines.list()
      .then((dl: any[]) => setDeadlines(dl.filter((d) => !d.is_archived && d.deadline_date)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Calendar</h1>
          <p className="page-subtitle">Confirmed deadlines by date</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>
        <CalendarGrid deadlines={deadlines} onSelectDeadline={setSelected} />
        <DeadlineDetailPanel deadline={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  )
}
