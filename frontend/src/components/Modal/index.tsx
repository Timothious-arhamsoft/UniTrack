export const Modal = ({ isOpen, onClose, title, children, width = '520px' }) => {
  if (!isOpen) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 150ms ease',
      }}
    >
      <div
        className="modal-panel glass-card"
        style={{
          width: '100%', maxWidth: width,
          maxHeight: '90vh', overflowY: 'auto',
          padding: '24px',
          animation: 'fadeIn 200ms ease',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '1.1rem', margin: 0 }}>{title}</h2>
          <button
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        {children}
      </div>
    </div>
  )
}
