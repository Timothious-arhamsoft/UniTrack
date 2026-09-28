import { useState, useEffect } from 'react'
import { api } from '../../api'
import { Toast } from '../../components'
import { AddSourceModal, EditSourceModal, SourcesTable } from './components'

export const Sources = () => {
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [notification, setNotification] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setNotification(msg)
  }

  const loadSources = async () => {
    try {
      const data = await api.sources.list()
      setSources(data)
    } catch (_) {}
    finally { setLoading(false) }
  }

  useEffect(() => { loadSources() }, [])

  const handleCreated = async (s: any) => {
    setSources((prev) => [s, ...prev])
    showToast(`Source "${s.name}" added successfully!`)
    if (s.url) {
      try {
        const result = await api.sources.fetch(s.id)
        if (result && result.source) {
          handleUpdated(result.source)
          const count = result.deadlines_created || 0
          showToast(`Scraped "${s.name}" — Source card details updated & ${count} deadline card(s) created (Status: Awaiting).`)
        }
      } catch (_) {}
    }
  }

  const handleUpdated = (s: any) => {
    setSources((prev) => prev.map((x) => x.id === s.id ? s : x))
  }

  const handleDeleted = (id: number) => {
    setSources((prev) => prev.filter((x) => x.id !== id))
    showToast("Source removed.")
  }

  const handleFetched = async (id: number, result: any) => {
    if (result && result.source) {
      handleUpdated(result.source)
      const count = result.deadlines_created || 0
      showToast(`Refetched "${result.source.name}" — Updated source details & synced ${count} deadline card(s) (Status: Awaiting).`)
    } else {
      try {
        const s = await api.sources.get(id)
        handleUpdated(s)
      } catch (_) {}
    }
  }

  const handleEditAction = (source: any) => {
    if (source && source.id && typeof source === 'object') {
      const already = sources.find((s: any) => s.id === source.id)
      if (already && source.active !== undefined && source.url !== undefined) {
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

      {/* Toaster Notification at Bottom Right */}
      <Toast message={notification} onClose={() => setNotification(null)} />
    </div>
  )
}
