import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { useToast } from '../ui'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import PageTransition from '../shared/PageTransition'
import ShortcutsModal from '../shared/ShortcutsModal'
import { LogOut, User } from 'lucide-react'

function Layout() {
  const location = useLocation()
  const navigate  = useNavigate()
  const { currentUser, logout } = useAuth()
  const { showToast } = useToast()
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  const navItems = [
    { path: '/dashboard',  label: 'Dashboard' },
    { path: '/campaigns',  label: 'Campaigns' },
    { path: '/billboards', label: 'Billboards' },
    { path: '/scans',      label: 'Scans' },
    { path: '/analytics',  label: 'Analytics' },
    { path: '/reports',    label: 'Reports' },
    { path: '/settings',   label: 'Settings' },
  ]

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  useKeyboardShortcuts([
    {
      key: 'k', ctrl: true,
      callback: () => showToast({ variant: 'info', title: 'Quick Search', message: 'Quick search coming soon.' }),
    },
    {
      key: '?',
      callback: () => setShortcutsOpen(true),
    },
  ])

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px',
        background: 'var(--color-bg-elevated)',
        borderRight: '1px solid var(--color-border)',
        padding: 'var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          fontSize: '20px',
          fontWeight: '700',
          marginBottom: 'var(--space-8)',
          color: 'var(--color-primary)',
          fontFamily: 'var(--font-display)',
        }}>
          NEXT Vision
        </div>

        {/* Navigation */}
        <nav style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          flex: 1,
        }}>
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                background: location.pathname === item.path
                  ? 'var(--color-primary)'
                  : 'transparent',
                color: location.pathname === item.path
                  ? '#fff'
                  : 'var(--color-text-muted)',
                transition: 'all var(--transition-base)',
                fontFamily: 'var(--font-primary)',
                fontWeight: 500,
                fontSize: '14px',
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* User info + Logout */}
        <div style={{
          borderTop: '1px solid var(--color-border)',
          paddingTop: 'var(--space-4)',
          marginTop: 'var(--space-4)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-3)',
            padding: 'var(--space-3)',
            marginBottom: 'var(--space-2)',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--color-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}>
              <User size={18} color="white" />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--color-text)',
                fontFamily: 'var(--font-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {currentUser?.displayName || 'Admin'}
              </div>
              <div style={{
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                fontFamily: 'var(--font-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {currentUser?.email}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: 'var(--space-3) var(--space-4)',
              background: 'transparent',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--color-text-muted)',
              fontFamily: 'var(--font-primary)',
              fontSize: '13px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              cursor: 'pointer',
              transition: 'all var(--transition-base)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background    = 'rgba(254, 51, 70, 0.1)'
              e.currentTarget.style.borderColor   = 'var(--color-danger)'
              e.currentTarget.style.color         = 'var(--color-danger)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background    = 'transparent'
              e.currentTarget.style.borderColor   = 'var(--color-border)'
              e.currentTarget.style.color         = 'var(--color-text-muted)'
            }}
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content with page transitions */}
      <main style={{ flex: 1, padding: 'var(--space-8)', overflow: 'auto', minWidth: 0 }}>
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>

      {/* Global shortcuts modal */}
      <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  )
}

export default Layout
