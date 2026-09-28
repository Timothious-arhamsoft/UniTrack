import { useState, useEffect } from 'react'
import { api } from '../../api'
import { DeadlinesList, AddDeadlineModal, EditDeadlineModal } from './components'

const CATEGORIES = ['all', 'admission', 'scholarship', 'language_test', 'document', 'personal', 'other']
const STATUSES   = ['all', 'awaiting', 'confirmed', 'coming_soon', 'needs_verification', 'no_info', 'check_failed', 'passed']

export const Deadlines = () => {
  const [deadlines, setDeadlines] = useState<any[]>([])
  const [sources,   setSources]   = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showAdd,   setShowAdd]   = useState(false)
  const [editing,   setEditing]   = useState<any>(null)
  const [search,    setSearch]    = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [stFilter,  setStFilter]  = useState('all')
  const [showArchived, setShowArchived] = useState(false)

  const loadAll = async () => {
    try {
      const [dl, src] = await Promise.all([api.deadlines.list({ archived: showArchived }), api.sources.list()])
      setDeadlines(dl)
      setSources(src)
    } catch (_) {} finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [showArchived])

  const filtered = deadlines.filter((d) => {
    const matchCat = catFilter === 'all' || d.category === catFilter
    const matchSt  = stFilter  === 'all' || d.status   === stFilter
    const matchQ   = !search || [d.title, d.institution, d.program].some(
      (v) => v?.toLowerCase().includes(search.toLowerCase())
    )
    return matchCat && matchSt && matchQ
  })

  const handleCreated = (d: any) => setDeadlines((prev) => [d, ...prev])
  const handleUpdated = (d: any) => setDeadlines((prev) => prev.map((x) => x.id === d.id ? d : x))
  const handleDeleted = (id: number) => setDeadlines((prev) => prev.filter((x) => x.id !== id))

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
          <h1 className="page-title">Deadlines</h1>
          <p className="page-subtitle">{filtered.length} item{filtered.length !== 1 ? 's' : ''} shown</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Deadline</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="form-input"
          style={{ maxWidth: '240px' }}
          placeholder="Search title, institution…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="form-select" style={{ maxWidth: '160px' }} value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c === 'all' ? 'All categories' : c.replace('_', ' ')}</option>)}
        </select>
        <select className="form-select" style={{ maxWidth: '180px' }} value={stFilter} onChange={(e) => setStFilter(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s.replace(/_/g, ' ')}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--color-text-muted)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived
        </label>
      </div>

      <DeadlinesList
        deadlines={filtered}
        sources={sources}
        onEdit={setEditing}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />

      <AddDeadlineModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={handleCreated}
        sources={sources}
      />

      <EditDeadlineModal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        deadline={editing}
        onUpdated={(d: any) => { handleUpdated(d); setEditing(null) }}
        sources={sources}
      />
    </div>
  )
}
