import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'

interface ToastProps {
  message: string | null
  type?: 'info' | 'success' | 'warning' | 'error'
  onClose: () => void
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        onClose()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [message, onClose])

  if (!message) return null

  const getIcon = () => {
    switch (type) {
      case 'success': return '✨'
      case 'warning': return '⚠️'
      case 'error':   return '❌'
      default:        return '🔔'
    }
  }

  return createPortal(
    <div
      className="toast-notification-bottom-right"
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 99999,
        maxWidth: '420px',
        width: 'calc(100vw - 48px)',
        animation: 'slideInRight 250ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          background: 'rgba(17, 18, 25, 0.95)',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          borderLeft: '4px solid var(--color-primary)',
          borderRadius: '12px',
          padding: '14px 18px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.65), 0 0 16px rgba(99, 102, 241, 0.25)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          color: 'var(--color-heading)',
          fontSize: '0.875rem',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
          <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>{getIcon()}</span>
          <span style={{ lineHeight: 1.4, color: 'var(--color-text)' }}>{message}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notification"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            fontSize: '1.1rem',
            padding: '2px 6px',
            borderRadius: '4px',
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 150ms ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
        >
          ✕
        </button>
      </div>
    </div>,
    document.body
  )
}
