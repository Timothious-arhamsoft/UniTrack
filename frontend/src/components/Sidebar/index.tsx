import {UniTrackLogo} from '../../assets'

const NAV_ITEMS = [
  { id: 'overview',  label: 'Overview',   icon: '⊞' },
  { id: 'chat',      label: 'Unibot AI',  icon: '🤖' },
  { id: 'sources',   label: 'Sources',    icon: '🔗' },
  { id: 'deadlines', label: 'Deadlines',  icon: '📋' },
  { id: 'calendar',  label: 'Calendar',   icon: '📅' },
  { id: 'reminders', label: 'Reminders',  icon: '🔔' },
  { id: 'settings',  label: 'Settings',   icon: '⚙' },
]

export const Sidebar = ({ activePage, onNavigate, collapsed, onToggle }) => {
  return (
    <nav
      className="sidebar"
      style={{
        width: collapsed ? '64px' : '240px',
        minWidth: collapsed ? '64px' : '240px',
        height: '100vh',
        background: 'rgba(255,255,255,0.02)',
        borderRight: '1px solid var(--color-border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '16px 0',
        transition: 'width 250ms ease, min-width 250ms ease',
        overflow: 'hidden',
        flexShrink: 0,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Logo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: collapsed ? '8px 0' : '8px 20px',
        marginBottom: '24px',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <UniTrackLogo size={80} showName={!collapsed} style={{ flexShrink: 0,  width: collapsed ? '40px' : '180px',  height: 'auto', maxWidth: '100%',}} />
      </div>

      {/* Nav items */}
      <ul style={{ listStyle: 'none', flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 8px' }}>
        {NAV_ITEMS.map((item) => {
          const isActive = activePage === item.id
          return (
            <li key={item.id}>
              <button
                id={`nav-${item.id}`}
                onClick={() => onNavigate(item.id)}
                title={collapsed ? item.label : undefined}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: collapsed ? '10px' : '10px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  background: isActive ? 'var(--color-primary-dim)' : 'transparent',
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                  fontSize: '0.875rem',
                  fontWeight: isActive ? 600 : 400,
                  fontFamily: 'var(--font-sans)',
                  transition: 'all 150ms ease',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderLeft: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                }}
                onMouseLeave={(e) => {
                  if (!isActive) e.currentTarget.style.background = 'transparent'
                }}
              >
                <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{item.icon}</span>
                {!collapsed && <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>}
              </button>
            </li>
          )
        })}
      </ul>

      {/* Collapse toggle */}
      <div style={{ padding: '0 8px' }}>
        <button
          id="sidebar-toggle"
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: '10px',
            padding: collapsed ? '10px' : '10px 12px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            background: 'transparent',
            color: 'var(--color-text-subtle)',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-sans)',
            transition: 'all 150ms ease',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <span style={{ fontSize: '1rem' }}>{collapsed ? '→' : '←'}</span>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </nav>
  )
}
