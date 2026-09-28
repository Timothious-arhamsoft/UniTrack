import { useState, useEffect } from 'react'
import { api } from '../../api'
import { getDaysUntil } from '../../components'
import { HeroStats, NextDeadlines, RecentActivity, MonitoringHealth } from './components'

export const Overview = ({ onNavigate }: { onNavigate: (page: string) => void }) => {
  const [deadlines, setDeadlines] = useState<any[]>([])
  const [sources,   setSources]   = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [dl, src] = await Promise.all([
          api.deadlines.list(),
          api.sources.list(),
        ])
        setDeadlines(dl)
        setSources(src)
      } catch (_) { /* silently handle */ }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const active = deadlines.filter((d) => !d.is_archived)

  const upcoming = active
    .filter((d) => d.deadline_date && getDaysUntil(d.deadline_date) !== null && (getDaysUntil(d.deadline_date) as number) >= 0)
    .sort((a, b) => new Date(a.deadline_date).getTime() - new Date(b.deadline_date).getTime())
    .slice(0, 7)

  const overdue     = active.filter((d) => d.deadline_date && getDaysUntil(d.deadline_date) !== null && (getDaysUntil(d.deadline_date) as number) < 0)
  const needsReview = active.filter((d) => d.needs_review)

  const stats = {
    activeSources:     sources.filter((s) => s.active).length,
    upcomingDeadlines: upcoming.length,
    overdue:           overdue.length,
    needsReview:       needsReview.length,
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <div className="spinner" style={{ width: 40, height: 40 }} />
      </div>
    )
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '1200px' }}>
      {/* Page header */}
      <div className="page-header" style={{ marginBottom: '28px' }}>
        <div>
          <h1 className="page-title" style={{ fontSize: '1.8rem' }}>Overview</h1>
          <p className="page-subtitle">Your university admissions & scholarship tracking hub</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => onNavigate('deadlines')}>
            + Deadline
          </button>
          <button className="btn btn-primary" onClick={() => onNavigate('sources')}>
            + Add Source
          </button>
        </div>
      </div>

      {/* Big stat cards */}
      <HeroStats stats={stats} />

      {/* Main two-column content */}
      <div className="overview-content-grid">
        {/* Left — upcoming deadlines (bigger column) */}
        <NextDeadlines deadlines={upcoming} onNavigate={onNavigate} />

        {/* Right — monitoring + activity stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <MonitoringHealth sources={sources} />
          <RecentActivity  sources={sources} onNavigate={onNavigate} />
        </div>
      </div>

      {/* Overdue banner if any */}
      {overdue.length > 0 && (
        <div style={{
          marginTop: '20px',
          padding: '14px 20px',
          borderRadius: 'var(--radius-lg)',
          background: 'rgba(248,113,113,0.08)',
          border: '1px solid rgba(248,113,113,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '1.2rem' }}>🚨</span>
          <div>
            <span style={{ fontWeight: 600, color: '#fca5a5' }}>
              {overdue.length} overdue deadline{overdue.length > 1 ? 's' : ''}
            </span>
            <span style={{ color: 'var(--color-text-muted)', marginLeft: '8px', fontSize: '0.875rem' }}>
              — update their status or remove them to keep your tracker clean.
            </span>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 'auto', color: '#fca5a5', border: '1px solid rgba(248,113,113,0.3)' }}
            onClick={() => onNavigate('deadlines')}
          >
            View →
          </button>
        </div>
      )}
    </div>
  )
}
