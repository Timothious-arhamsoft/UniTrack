import { useState } from 'react'
import { api } from '../../../../api'
import { FetchStatusBadge } from '../FetchStatusBadge'

const formatDate = (iso) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const SourcesTable = ({ sources, onEdit, onUpdated, onDeleted, onFetched }) => {
  const [fetchingId, setFetchingId] = useState(null)
  const [errorMap, setErrorMap] = useState({})

  const handleFetch = async (source) => {
    setFetchingId(source.id)
    setErrorMap((m) => ({ ...m, [source.id]: null }))
    try {
      const result = await api.sources.fetch(source.id)
      onFetched(source.id, result)
    } catch (err) {
      setErrorMap((m) => ({ ...m, [source.id]: err.message }))
    } finally {
      setFetchingId(null)
    }
  }

  const handleToggleActive = async (source) => {
    try {
      const updated = await api.sources.update(source.id, { active: !source.active })
      if (onUpdated) onUpdated(updated)
    } catch (_) {}
  }

  const handleDelete = async (source) => {
    if (!confirm(`Delete source "${source.name}"? This cannot be undone.`)) return
    try {
      await api.sources.delete(source.id)
      onDeleted(source.id)
    } catch (_) {}
  }

  if (sources.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">🔗</span>
        <h3>No sources yet</h3>
        <p>Add a university or scholarship URL to start tracking deadlines automatically.</p>
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Source</th>
            <th>Type</th>
            <th>Context</th>
            <th>Status</th>
            <th>Last Checked</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => (
            <tr key={source.id}>
              <td>
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--color-heading)', fontSize: '0.875rem' }}>
                    {source.name}
                    {!source.active && (
                      <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: 'var(--color-text-subtle)', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: '4px' }}>
                        paused
                      </span>
                    )}
                  </div>
                  {source.url && (
                    <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '260px' }}>
                      ↗ {source.url}
                    </a>
                  )}
                </div>
              </td>
              <td>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                  {source.source_type.replace('_', ' ')}
                </span>
              </td>
              <td>
                <div style={{ fontSize: '0.8rem' }}>
                  {source.program_context && <div>{source.program_context}</div>}
                  {source.intake_year && <div style={{ color: 'var(--color-text-muted)' }}>{source.intake_year}</div>}
                  {!source.program_context && !source.intake_year && <span style={{ color: 'var(--color-text-subtle)' }}>—</span>}
                </div>
              </td>
              <td>
                <div>
                  <FetchStatusBadge source={source} />
                  {source.last_error && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--status-check-failed)', marginTop: '2px', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={source.last_error}>
                      {source.last_error}
                    </div>
                  )}
                  {errorMap[source.id] && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--status-check-failed)', marginTop: '2px' }}>
                      {errorMap[source.id]}
                    </div>
                  )}
                </div>
              </td>
              <td>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                  {formatDate(source.last_checked_at)}
                </span>
              </td>
              <td>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {source.url && (
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => handleFetch(source)}
                      disabled={fetchingId === source.id}
                      title="Fetch now"
                    >
                      {fetchingId === source.id ? <span className="spinner" /> : '↻'}
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-icon btn-sm"
                    onClick={() => handleToggleActive(source)}
                    title={source.active ? 'Pause' : 'Resume'}
                  >
                    {source.active ? '⏸' : '▶'}
                  </button>
                  <button
                    className="btn btn-ghost btn-icon"
                    onClick={() => onEdit(source)}
                    title="Edit"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </button>
                  <button
                    className="btn btn-danger btn-icon"
                    onClick={() => handleDelete(source)}
                    title="Delete"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
