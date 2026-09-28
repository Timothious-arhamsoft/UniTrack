import { useState } from 'react'
import { Modal } from '../../../../components'
import { api } from '../../../../api'

interface Deadline {
  id: number
  title: string
  deadline_date?: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  deadlines: Deadline[]
  onCreated: (r: any) => void
}

export const AddReminderModal = ({ isOpen, onClose, deadlines, onCreated }: Props) => {
  const [deadlineId, setDeadlineId] = useState('')
  const [offsetDays, setOffsetDays] = useState(7)
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!deadlineId) { setError('Please select a deadline.'); return }
    setLoading(true)
    try {
      const reminder = await api.reminders.create({
        deadline_id: Number(deadlineId),
        offset_days: Number(offsetDays),
        channel: 'browser',
      })
      onCreated(reminder)
      onClose()
      setDeadlineId('')
      setOffsetDays(7)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const datesWithDeadlines = deadlines.filter((d) => d.deadline_date)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Reminder">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="form-group">
          <label className="form-label">Deadline *</label>
          <select className="form-select" value={deadlineId} onChange={(e) => setDeadlineId(e.target.value)}>
            <option value="">— Select deadline —</option>
            {datesWithDeadlines.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} ({d.deadline_date ? new Date(d.deadline_date).toLocaleDateString() : 'No date'})
              </option>
            ))}
          </select>
          {datesWithDeadlines.length === 0 && (
            <span className="form-hint">No deadlines with confirmed dates found.</span>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Remind me (days before)</label>
          <input
            className="form-input"
            type="number"
            min="0"
            max="365"
            value={offsetDays}
            onChange={(e) => setOffsetDays(Number(e.target.value))}
          />
          <span className="form-hint">Notification fires at 9:00 AM, {offsetDays}d before the deadline date</span>
        </div>

        {error && <div className="form-error">⚠ {error}</div>}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading || datesWithDeadlines.length === 0}>
            {loading ? <><span className="spinner" /> Saving…</> : '+ Add Reminder'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
