import { useState, useEffect } from 'react'
import { api } from '../../api'
import { useNotifications } from '../../hooks'
import { TimezoneSelector, OffsetChips, NotificationPanel } from './components'

export const Settings = () => {
  const [settings, setSettings]   = useState<any>(null)
  const [loading,  setLoading]    = useState(true)
  const [saving,   setSaving]     = useState(false)
  const [saved,    setSaved]      = useState(false)
  const { permission, requestPermission, sendTestNotification } = useNotifications()

  useEffect(() => {
    api.settings.get()
      .then((s: any) => setSettings(s))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    setSaved(false)
    try {
      const updated = await api.settings.update({
        timezone:             settings.timezone,
        default_offsets_days: settings.default_offsets_days,
        notification_channel: 'browser',
      })
      setSettings(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (_) {} finally { setSaving(false) }
  }

  if (loading || !settings) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    )
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '620px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Notification preferences and monitoring configuration</p>
        </div>
      </div>

      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <TimezoneSelector
          value={settings.timezone}
          onChange={(tz) => setSettings((s: any) => ({ ...s, timezone: tz }))}
        />

        <div className="divider" />

        <OffsetChips
          value={settings.default_offsets_days}
          onChange={(offsets) => setSettings((s: any) => ({ ...s, default_offsets_days: offsets }))}
        />

        <div className="divider" />

        <NotificationPanel
          permission={permission as NotificationPermission | 'unsupported'}
          onRequest={requestPermission}
          onTest={sendTestNotification}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <><span className="spinner" /> Saving…</> : 'Save Settings'}
          </button>
          {saved && (
            <span style={{ fontSize: '0.85rem', color: 'var(--status-confirmed)', animation: 'fadeIn 200ms ease' }}>
              ✓ Saved
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
