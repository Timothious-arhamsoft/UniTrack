import { useState, useEffect } from 'react'
import { Modal } from '../../../../components'
import { api } from '../../../../api'

const CATEGORIES = ['admission', 'scholarship', 'language_test', 'document', 'personal', 'other']
const STATUSES   = ['awaiting', 'confirmed', 'coming_soon', 'needs_verification', 'no_info', 'check_failed', 'passed']

export const EditDeadlineModal = ({ isOpen, onClose, deadline, onUpdated, sources = [] }) => {
  const [form, setForm]       = useState<Record<string, any>>({})
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (deadline) setForm({ ...deadline, source_id: deadline.source_id ?? '' })
  }, [deadline])

  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.title?.trim()) { setError('Title is required.'); return }
    setLoading(true)
    try {
      const updated = await api.deadlines.update(deadline.id, {
        title:         form.title,
        category:      form.category,
        institution:   form.institution   || null,
        program:       form.program       || null,
        intake:        form.intake        || null,
        deadline_date: form.deadline_date || null,
        timezone_note: form.timezone_note || null,
        status:        form.status,
        evidence_text: form.evidence_text || null,
        source_id:     form.source_id ? Number(form.source_id) : null,
      })
      onUpdated(updated)
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!deadline) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Deadline">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
        <div className="form-group">
          <label className="form-label">Title *</label>
          <input className="form-input" value={form.title || ''} onChange={(e) => set('title', e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select className="form-select" value={form.category || 'admission'} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status || 'awaiting'} onChange={(e) => set('status', e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Institution</label>
            <input className="form-input" value={form.institution || ''} onChange={(e) => set('institution', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Program</label>
            <input className="form-input" value={form.program || ''} onChange={(e) => set('program', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Deadline Date</label>
            <input className="form-input" type="date" value={form.deadline_date || ''} onChange={(e) => set('deadline_date', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Intake / Year</label>
            <input className="form-input" value={form.intake || ''} onChange={(e) => set('intake', e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Timezone Note</label>
          <input className="form-input" value={form.timezone_note || ''} onChange={(e) => set('timezone_note', e.target.value)} />
        </div>

        {sources.length > 0 && (
          <div className="form-group">
            <label className="form-label">Link to Source</label>
            <select className="form-select" value={form.source_id || ''} onChange={(e) => set('source_id', e.target.value)}>
              <option value="">— None —</option>
              {sources.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Evidence / Notes</label>
          <textarea className="form-textarea" rows={2} value={form.evidence_text || ''} onChange={(e) => set('evidence_text', e.target.value)} />
        </div>

        {error && <div className="form-error">⚠ {error}</div>}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner" /> Saving…</> : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
