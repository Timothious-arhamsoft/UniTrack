import { useState } from 'react'
import { api } from '../../../../api'
import { StatusBadge, CountdownBadge } from '../../../../components'
import { EvidencePopover } from '../EvidencePopover'

interface Deadline {
  id: number
  title: string
  category: string
  institution?: string
  program?: string
  intake?: string
  deadline_date?: string
  status: string
  evidence_text?: string
  confidence: string
  needs_review: boolean
  source_id?: number
  is_archived: boolean
}

interface Source {
  id: number
  name: string
  url?: string
}

interface Props {
  deadlines: Deadline[]
  sources: Source[]
  onEdit: (d: Deadline) => void
  onUpdated: (d: Deadline) => void
  onDeleted: (id: number) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  admission:     'var(--cat-admission)',
  scholarship:   'var(--cat-scholarship)',
  language_test: 'var(--cat-language-test)',
  document:      'var(--cat-document)',
  personal:      'var(--cat-personal)',
  other:         'var(--cat-other)',
}

export const DeadlinesList = ({ deadlines, sources, onEdit, onUpdated, onDeleted }: Props) => {
  const [actionId, setActionId] = useState<number | null>(null)

  const handleConfirm = async (dl: Deadline) => {
    setActionId(dl.id)
    try {
      const updated = await api.deadlines.confirm(dl.id)
      onUpdated(updated)
    } catch (_) {} finally { setActionId(null) }
  }

  const handleDismiss = async (dl: Deadline) => {
    if (!confirm(`Archive "${dl.title}"?`)) return
    setActionId(dl.id)
    try {
      const updated = await api.deadlines.dismiss(dl.id)
      onUpdated(updated)
    } catch (_) {} finally { setActionId(null) }
  }

  const handleDelete = async (dl: Deadline) => {
    if (!confirm(`Permanently delete "${dl.title}"?`)) return
    setActionId(dl.id)
    try {
      await api.deadlines.delete(dl.id)
      onDeleted(dl.id)
    } catch (_) {} finally { setActionId(null) }
  }

  if (deadlines.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">📋</span>
        <h3>No deadlines found</h3>
        <p>Add a deadline manually or fetch a source URL to extract deadlines automatically.</p>
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Deadline</th>
            <th>Date</th>
            <th>Status</th>
            <th>Countdown</th>
            <th>Evidence</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {deadlines.map((dl) => {
            const catColor = CATEGORY_COLORS[dl.category] || 'var(--cat-other)'
            const source = sources.find((s) => s.id === dl.source_id)
            return (
              <tr key={dl.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <span style={{
                      width: '3px', minHeight: '40px', borderRadius: '2px',
                      background: catColor, flexShrink: 0, marginTop: '2px',
                    }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500, color: 'var(--color-heading)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        {dl.title}
                        {dl.needs_review && (
                          <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--status-needs-review-bg)', color: 'var(--status-needs-review)' }}>
                            Review
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {dl.institution && <span>{dl.institution}</span>}
                        {dl.program && <span>· {dl.program}</span>}
                        {dl.intake && <span>· {dl.intake}</span>}
                        {source && (
                          <a href={source.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', fontSize: '0.72rem' }}>
                            ↗ {source.name}
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{ fontSize: '0.85rem', fontVariantNumeric: 'tabular-nums' }}>
                    {dl.deadline_date
                      ? new Date(dl.deadline_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                      : <span style={{ color: 'var(--color-text-subtle)' }}>TBD</span>
                    }
                  </span>
                </td>
                <td><StatusBadge status={dl.status} size="sm" /></td>
                <td><CountdownBadge deadlineDate={dl.deadline_date} size="sm" /></td>
                <td><EvidencePopover evidence={dl.evidence_text} /></td>
                <td>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {dl.status !== 'confirmed' && dl.deadline_date && (
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => handleConfirm(dl)}
                        disabled={actionId === dl.id}
                        title="Confirm date"
                        style={{ color: 'var(--status-confirmed)' }}
                      >
                        ✓
                      </button>
                    )}
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => onEdit(dl)}
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button
                      className="btn btn-ghost btn-icon btn-sm"
                      onClick={() => handleDismiss(dl)}
                      disabled={actionId === dl.id}
                      title="Archive"
                    >
                      ↓
                    </button>
                    <button
                      className="btn btn-danger btn-icon btn-sm"
                      onClick={() => handleDelete(dl)}
                      disabled={actionId === dl.id}
                      title="Delete"
                    >
                      🗑
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
