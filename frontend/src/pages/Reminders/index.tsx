import { useState, useEffect } from 'react'
import { api } from '../../api'
import { RemindersList, AddReminderModal } from './components'

export const Reminders = () => {
  const [reminders, setReminders] = useState<any[]>([])
  const [deadlines, setDeadlines] = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showAdd,   setShowAdd]   = useState(false)

  const loadAll = async () => {
    try {
      const [rm, dl] = await Promise.all([api.reminders.list(), api.deadlines.list()])
      setReminders(rm)
      setDeadlines(dl)
    } catch (_) {} finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])

  const handleCreated = (r: any) => setReminders((prev) => [...prev, r])
  const handleDeleted = (id: number) => setReminders((prev) => prev.filter((r) => r.id !== id))

  const pending = reminders.filter((r) => r.delivery_status === 'pending').length
  const sent    = reminders.filter((r) => r.delivery_status === 'sent').length

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
          <h1 className="page-title">Reminders</h1>
          <p className="page-subtitle">
            {pending} pending · {sent} sent
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          + Add Reminder
        </button>
      </div>

      <RemindersList reminders={reminders} deadlines={deadlines} onDeleted={handleDeleted} />

      <AddReminderModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        deadlines={deadlines}
        onCreated={handleCreated}
      />
    </div>
  )
}
