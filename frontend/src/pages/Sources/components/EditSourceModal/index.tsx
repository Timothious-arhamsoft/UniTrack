import { useState, useEffect } from 'react'
import { Modal } from '../../../../components'
import { api } from '../../../../api'

const SOURCE_TYPES = ['university', 'scholarship', 'language_test', 'other']

export const EditSourceModal = ({ isOpen, onClose, source, onUpdated }) => {
  const [form, setForm] = useState<Record<string, any>>({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (source) setForm({ ...source })
  }, [source])

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name?.trim()) { setError('Name is required.'); return }
    setLoading(true)
    try {
      const updated = await api.sources.update(source.id, {
        name: form.name,
        url: form.url || null,
        source_type: form.source_type,
        program_context: form.program_context || null,
        intake_year: form.intake_year || null,
        notes: form.notes || null,
        active: form.active,
        check_cadence_hours: Number(form.check_cadence_hours),
      })
      onUpdated(updated)
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!source) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Source">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="form-group">
          <label className="form-label">Name *</label>
          <input className="form-input" value={form.name || ''} onChange={(e) => set('name', e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Official URL</label>
          <input className="form-input" type="url" value={form.url || ''} onChange={(e) => set('url', e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Type</label>
            <select className="form-select" value={form.source_type || 'university'} onChange={(e) => set('source_type', e.target.value)}>
              {SOURCE_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Check Every (hours)</label>
            <input className="form-input" type="number" min="1" max="720" value={form.check_cadence_hours || 24} onChange={(e) => set('check_cadence_hours', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Program / Context</label>
            <input className="form-input" value={form.program_context || ''} onChange={(e) => set('program_context', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Intake / Year</label>
            <input className="form-input" value={form.intake_year || ''} onChange={(e) => set('intake_year', e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Notes</label>
          <textarea className="form-textarea" rows={2} value={form.notes || ''} onChange={(e) => set('notes', e.target.value)} />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--color-text)' }}>
          <input type="checkbox" checked={!!form.active} onChange={(e) => set('active', e.target.checked)} />
          Active (include in monitoring)
        </label>

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
