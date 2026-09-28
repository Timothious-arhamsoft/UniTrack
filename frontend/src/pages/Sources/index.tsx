import { useState, useEffect } from 'react'
import { api } from '../../api'
import { AddSourceModal, EditSourceModal, SourcesTable } from './components'

export const Sources = () => {
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)

  const loadSources = async () => {
    try {
      const data = await api.sources.list()
      setSources(data)
    } catch (_) {}
    finally { setLoading(false) }
  }

  useEffect(() => { loadSources() }, [])

  const handleCreated  = (s)  => setSources((prev) => [s, ...prev])
  const handleUpdated  = (s)  => setSources((prev) => prev.map((x) => x.id === s.id ? s : x))
  const handleDeleted  = (id) => setSources((prev) => prev.filter((x) => x.id !== id))
  const handleFetched  = async (id) => {
    // Reload this one source to get updated timestamps
    try {
      const s = await api.sources.get(id)
      handleUpdated(s)
    } catch (_) {}
  }

  const handleEditAction = (source) => {
    // If called with a full source object from SourcesTable (toggle/refresh), update directly.
    // If called with a plain source to open the modal, set editing.
    if (source.id && typeof source === 'object') {
      const already = sources.find((s) => s.id === source.id)
      if (already && source.active !== undefined && source.url !== undefined) {
        // It's a full updated source — just update state
        handleUpdated(source)
        return
      }
      setEditing(source)
    }
  }

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
          <h1 className="page-title">Sources</h1>
          <p className="page-subtitle">University and scholarship URLs being monitored</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          + Add Source
        </button>
      </div>

      <SourcesTable
        sources={sources}
        onEdit={handleEditAction}
        onDeleted={handleDeleted}
        onFetched={handleFetched}
      />

      <AddSourceModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={handleCreated}
      />

      <EditSourceModal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        source={editing}
        onUpdated={(s) => { handleUpdated(s); setEditing(null) }}
      />
    </div>
  )
}
