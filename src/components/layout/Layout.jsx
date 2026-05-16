import { useState, useRef, useCallback } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useToast } from '../ui'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import PageTransition from '../shared/PageTransition'
import ShortcutsModal from '../shared/ShortcutsModal'
import logoBlack from '../../assets/logos/logo-black.svg'
import logoWhite from '../../assets/logos/logo-white.svg'
import flagIcon  from '../../assets/logos/flag.svg'
import {
  LayoutDashboard, Megaphone, MapPin, QrCode,
  BarChart3, Settings, LogOut, User, Sun, Moon,
} from 'lucide-react'
import './Layout.css'

const NAV_ITEMS = [
  { path: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { path: '/campaigns',  label: 'Campaigns',  icon: Megaphone },
  { path: '/billboards', label: 'Billboards', icon: MapPin },
  { path: '/scans',      label: 'Scans',      icon: QrCode },
  { path: '/analytics',  label: 'Analytics',  icon: BarChart3 },
  { path: '/settings',   label: 'Settings',   icon: Settings },
]

function Layout() {
  const location   = useLocation()
  const navigate   = useNavigate()
  const { currentUser, logout } = useAuth()
  const { theme, toggleTheme, isDark } = useTheme()
  const { showToast } = useToast()
  const [shortcutsOpen, setShortcutsOpen] = useState(false)

  // Mouse-follow glow on main content
  const mainRef = useRef(null)
  const glowRef = useRef(null)

  const handleMouseMove = useCallback((e) => {
    if (!glowRef.current || !mainRef.current) return
    const rect = mainRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    glowRef.current.style.setProperty('--gx', `${x}px`)
    glowRef.current.style.setProperty('--gy', `${y}px`)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  useKeyboardShortcuts([
    {
      key: 'k', ctrl: true,
      callback: () => showToast({ variant: 'info', title: 'Quick Search', message: 'Quick search coming soon.' }),
    },
    { key: '?', callback: () => setShortcutsOpen(true) },
  ])

  const initials = (currentUser?.displayName || currentUser?.email || 'A')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="layout-root">
      {/* ── Ambient background ── */}
      <div className="layout-bg" aria-hidden="true">
        <div className="lb lb--1" />
        <div className="lb lb--2" />
        <div className="lb lb--3" />
        <div className="lb lb--4" />
        <div className="lb lb--5" />
        <div className="lb--grid" />
      </div>

      {/* ── Sidebar ── */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sb-logo">
          <img
            src={isDark ? logoWhite : logoBlack}
            alt="NEXT Billboards"
            className="sb-logo-img"
          />
          <img src={flagIcon} alt="" className="sb-flag" aria-hidden="true" />
        </div>

        {/* Nav */}
        <nav className="sb-nav" aria-label="Main navigation">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
            const active = location.pathname === path
            return (
              <Link
                key={path}
                to={path}
                className={`sb-link ${active ? 'sb-link--active' : ''}`}
                aria-current={active ? 'page' : undefined}
              >
                {active && (
                  <motion.span
                    className="sb-link-pill"
                    layoutId="nav-pill"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <span className="sb-link-icon">
                  <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
                </span>
                <span className="sb-link-label">{label}</span>
                {active && <span className="sb-link-dot" aria-hidden="true" />}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="sb-footer">
          {/* Theme toggle */}
          <button
            className="sb-theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={theme}
                initial={{ rotate: -90, opacity: 0, scale: 0.7 }}
                animate={{ rotate: 0,   opacity: 1, scale: 1 }}
                exit={{    rotate:  90, opacity: 0, scale: 0.7 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex' }}
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </motion.span>
            </AnimatePresence>
            <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {/* User */}
          <div className="sb-user">
            <div className="sb-avatar" aria-hidden="true">
              {initials}
              <span className="sb-avatar-ring" />
            </div>
            <div className="sb-user-info">
              <span className="sb-user-name">
                {currentUser?.displayName || 'Admin'}
              </span>
              <span className="sb-user-email">{currentUser?.email}</span>
            </div>
          </div>

          <button className="sb-logout" onClick={handleLogout} aria-label="Sign out">
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main
        className="layout-main"
        ref={mainRef}
        onMouseMove={handleMouseMove}
      >
        {/* Mouse-follow radial glow */}
        <div className="layout-mouse-glow" ref={glowRef} aria-hidden="true" />

        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </AnimatePresence>
      </main>

      <ShortcutsModal isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  )
}

export default Layout
