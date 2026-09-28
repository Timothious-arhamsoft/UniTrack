import { useState } from 'react'
import { Modal } from '../../../../components'
import { api } from '../../../../api'

const SOURCE_TYPES = ['university', 'scholarship', 'language_test', 'other']

export const AddSourceModal = ({ isOpen, onClose, onCreated }) => {
  const [form, setForm] = useState({
    name: '', url: '', source_type: 'university',
    program_context: '', intake_year: '', notes: '', check_cadence_hours: 24,
  })
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim()) { setError('Name is required.'); return }
    if (form.url && !form.url.match(/^https?:\/\//i)) {
      setError('URL must start with http:// or https://'); return
    }
    setLoading(true)
    try {
      const source = await api.sources.create({
        ...form,
        url: form.url || null,
        program_context: form.program_context || null,
        intake_year: form.intake_year || null,
        notes: form.notes || null,
        check_cadence_hours: Number(form.check_cadence_hours),
      })
      onCreated(source)
      onClose()
      setForm({ name: '', url: '', source_type: 'university', program_context: '', intake_year: '', notes: '', check_cadence_hours: 24 })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Source">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input className="form-input" placeholder="e.g. MIT Computer Science" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Official URL</label>
          <input className="form-input" type="url" placeholder="https://..." value={form.url} onChange={(e) => set('url', e.target.value)} />
          <span className="form-hint">Leave empty for a manual task with no URL</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-select" value={form.source_type} onChange={(e) => set('source_type', e.target.value)}>
              {SOURCE_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Check Every (hours)</label>
            <input className="form-input" type="number" min="1" max="720" value={form.check_cadence_hours} onChange={(e) => set('check_cadence_hours', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Program / Context</label>
            <input className="form-input" placeholder="e.g. MS in AI" value={form.program_context} onChange={(e) => set('program_context', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Intake / Year</label>
            <input className="form-input" placeholder="e.g. Fall 2025" value={form.intake_year} onChange={(e) => set('intake_year', e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" rows={2} placeholder="Any notes..." value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>

        {error && <div className="form-error">⚠ {error}</div>}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner" /> Saving…</> : '+ Add Source'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
