interface Props {
  permission: NotificationPermission | 'unsupported'
  onRequest: () => void
  onTest: () => void
}

export const NotificationPanel = ({ permission, onRequest, onTest }: Props) => {
  const isGranted    = permission === 'granted'
  const isDenied     = permission === 'denied'
  const isUnsupported = permission === 'unsupported'

  return (
    <div className="form-group">
      <label className="form-label">Browser Notifications</label>

      <div className="glass-card" style={{ padding: '16px', marginTop: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <span style={{ fontSize: '1.5rem' }}>
            {isGranted ? '✅' : isDenied ? '🚫' : isUnsupported ? '⛔' : '🔔'}
          </span>
          <div>
            <p style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-heading)' }}>
              {isGranted ? 'Notifications enabled' : isDenied ? 'Notifications blocked' : isUnsupported ? 'Not supported' : 'Permission not granted'}
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', marginTop: '1px' }}>
              {isGranted
                ? 'You will receive browser reminders when deadlines approach.'
                : isDenied
                ? 'Unblock in browser settings → Site Settings → Notifications.'
                : isUnsupported
                ? 'Your browser does not support the Web Notifications API.'
                : 'Click below to allow browser notifications.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {!isGranted && !isDenied && !isUnsupported && (
            <button className="btn btn-primary btn-sm" onClick={onRequest}>
              Enable Notifications
            </button>
          )}
          {isGranted && (
            <button className="btn btn-secondary btn-sm" onClick={onTest}>
              🔔 Send Test Notification
            </button>
          )}
        </div>

        {isGranted && (
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)', marginTop: '10px' }}>
            ℹ For critical deadlines, add a backup reminder to your phone calendar until automated delivery is proven reliable.
          </p>
        )}
      </div>
    </div>
  )
}
