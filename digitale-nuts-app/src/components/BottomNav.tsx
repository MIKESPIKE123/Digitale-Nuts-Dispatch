import React from 'react'

export type NavKey =
  | 'home'
  | 'inspect'
  | 'handover'
  | 'ai'
  | 'sync'
  | 'workboard'
  | 'scan'

interface BottomNavProps {
  active: NavKey
  onChange: (key: NavKey) => void
}

const NAV_ITEMS: Array<{ key: NavKey; label: string; icon: string }> = [
  { key: 'home', label: 'Home', icon: '🏠' },
  { key: 'inspect', label: 'Inspectie', icon: '🧭' },
  { key: 'handover', label: 'Handover', icon: '📝' },
  { key: 'ai', label: 'AI', icon: '🤖' },
  { key: 'sync', label: 'Sync', icon: '🔄' },
  { key: 'workboard', label: 'Work', icon: '📌' },
  { key: 'scan', label: 'Scan', icon: '🚧' }
]

const BottomNav: React.FC<BottomNavProps> = ({ active, onChange }) => {
  return (
    <nav className="dn-bottom-nav">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.key}
          className={`dn-nav-item ${active === item.key ? 'is-active' : ''}`}
          type="button"
          onClick={() => onChange(item.key)}
        >
          <span className="dn-nav-icon">{item.icon}</span>
          <span className="dn-nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

export default BottomNav
