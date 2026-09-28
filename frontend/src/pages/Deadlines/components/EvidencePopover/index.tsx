import { useState } from 'react'

export const EvidencePopover = ({ evidence }) => {
  const [open, setOpen] = useState(false)

  if (!evidence) {
    return <span style={{ color: 'var(--color-text-subtle)', fontSize: '0.78rem' }}>None</span>
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setOpen((o) => !o)}
        style={{ fontSize: '0.75rem', padding: '2px 8px' }}
      >
        📄 View
      </button>
      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 49 }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'absolute', zIndex: 50, bottom: '110%', left: '0',
            width: '320px', padding: '12px',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            animation: 'fadeIn 150ms ease',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Source Evidence
              </span>
              <button className="btn btn-ghost btn-icon" style={{ width: '20px', height: '20px', fontSize: '0.75rem' }} onClick={() => setOpen(false)}>✕</button>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-text)', lineHeight: 1.5, maxHeight: '200px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {evidence}
            </p>
          </div>
        </>
      )}
    </div>
  )
}
