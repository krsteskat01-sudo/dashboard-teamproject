import { useState, useEffect, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { motion, AnimatePresence } from 'framer-motion'
import { format, formatDistanceToNow } from 'date-fns'
import {
  User, Shield, Users, Settings2, Database,
  ChevronRight, UserPlus, Trash2, Edit2, MoreHorizontal,
  Download, RefreshCw, AlertTriangle, CheckCircle2, Loader2,
  Eye, EyeOff, LogOut,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { usePreferences, PREF_DEFAULTS } from '../contexts/PreferencesContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useUsers } from '../hooks/useUsers'
import { useToast } from '../components/ui'
import { Button, Input, Select, Modal, Badge, Spinner, SkeletonLoader } from '../components/ui'
import {
  getUserById, updateUserProfile, updateUserRole, inviteUser, deleteUser, changePassword,
} from '../firebase/users'
import {
  getStorageUsage, exportAllData, deleteTestScans, resetCounters, deleteAllData,
} from '../firebase/dataManagement'
import './Settings.css'

// ── Tab config ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'profile',     label: 'Profile',         icon: User },
  { key: 'security',   label: 'Security',         icon: Shield },
  { key: 'team',       label: 'Team',             icon: Users },
  { key: 'preferences',label: 'Preferences',      icon: Settings2 },
  { key: 'data',       label: 'Data Management',  icon: Database },
]

// ── Password strength ─────────────────────────────────────────────────────────

function calcStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' }
  let s = 0
  if (pw.length >= 8)            s++
  if (pw.length >= 12)           s++
  if (/[A-Z]/.test(pw))         s++
  if (/[0-9]/.test(pw))         s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  const levels = [
    { label: 'Very weak', color: 'var(--color-danger)' },
    { label: 'Weak',      color: 'var(--color-danger)' },
    { label: 'Medium',    color: 'var(--color-warning)' },
    { label: 'Strong',    color: 'var(--color-success)' },
    { label: 'Very strong', color: 'var(--color-success)' },
  ]
  return { score: s, pct: (s / 5) * 100, ...levels[Math.min(s, 4)] }
}

// ── User avatar ───────────────────────────────────────────────────────────────

function Avatar({ name, email, size = 40 }) {
  const letter = (name || email || 'A')[0].toUpperCase()
  return (
    <div className="st-avatar" style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {letter}
    </div>
  )
}

// ── Section card ──────────────────────────────────────────────────────────────

function SCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`st-card ${className}`}>
      {(title || subtitle) && (
        <div className="st-card-header">
          {title && <div className="st-card-title">{title}</div>}
          {subtitle && <div className="st-card-subtitle">{subtitle}</div>}
        </div>
      )}
      <div className="st-card-body">{children}</div>
    </div>
  )
}

// ── Preference row (instant-save toggle/radio) ────────────────────────────────

function PrefRow({ label, children }) {
  return (
    <div className="pref-row">
      <div className="pref-row-label">{label}</div>
      <div className="pref-row-control">{children}</div>
    </div>
  )
}

function RadioGroup({ options, value, onChange }) {
  return (
    <div className="pref-radio-group">
      {options.map(opt => (
        <button
          key={opt.value}
          className={`pref-radio-btn ${value === opt.value ? 'pref-radio-btn--active' : ''}`}
          onClick={() => onChange(opt.value)}
          type="button"
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ── Format helpers ────────────────────────────────────────────────────────────

function fmtDate(ts) {
  if (!ts) return '—'
  try {
    const d = ts?.toDate?.() ?? new Date(ts)
    return format(d, 'MMM d, yyyy')
  } catch { return '—' }
}

function fmtRelative(ts) {
  if (!ts) return '—'
  try {
    const d = ts?.toDate?.() ?? new Date(ts)
    return formatDistanceToNow(d, { addSuffix: true })
  } catch { return '—' }
}

// ── TIMEZONES ─────────────────────────────────────────────────────────────────

const TIMEZONES = [
  { value: 'Europe/Skopje',       label: 'Europe/Skopje (CET)' },
  { value: 'Europe/London',       label: 'Europe/London (GMT)' },
  { value: 'Europe/Paris',        label: 'Europe/Paris (CET)' },
  { value: 'Europe/Berlin',       label: 'Europe/Berlin (CET)' },
  { value: 'Europe/Rome',         label: 'Europe/Rome (CET)' },
  { value: 'Europe/Athens',       label: 'Europe/Athens (EET)' },
  { value: 'Europe/Moscow',       label: 'Europe/Moscow (MSK)' },
  { value: 'America/New_York',    label: 'America/New York (EST)' },
  { value: 'America/Chicago',     label: 'America/Chicago (CST)' },
  { value: 'America/Denver',      label: 'America/Denver (MST)' },
  { value: 'America/Los_Angeles', label: 'America/Los Angeles (PST)' },
  { value: 'America/Sao_Paulo',   label: 'America/São Paulo (BRT)' },
  { value: 'Asia/Dubai',          label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Kolkata',        label: 'Asia/Kolkata (IST)' },
  { value: 'Asia/Shanghai',       label: 'Asia/Shanghai (CST)' },
  { value: 'Asia/Tokyo',          label: 'Asia/Tokyo (JST)' },
  { value: 'Australia/Sydney',    label: 'Australia/Sydney (AEDT)' },
  { value: 'UTC',                 label: 'UTC' },
]

// ─────────────────────────────────────────────────────────────────────────────
// TAB 1 — PROFILE
// ─────────────────────────────────────────────────────────────────────────────

function ProfileTab() {
  const { currentUser, refreshUser } = useAuth()
  const { showToast } = useToast()
  const [userDoc, setUserDoc] = useState(null)

  const {
    register, handleSubmit, reset,
    formState: { isDirty, isSubmitting, errors },
  } = useForm({
    defaultValues: { displayName: currentUser?.displayName ?? '' },
  })

  // Fetch extra fields (createdAt, lastLogin) from Firestore
  useEffect(() => {
    if (!currentUser?.uid) return
    getUserById(currentUser.uid).then(res => {
      if (res.success) setUserDoc(res.data)
    })
  }, [currentUser?.uid])

  // Keep form in sync when currentUser updates (e.g. after save)
  useEffect(() => {
    reset({ displayName: currentUser?.displayName ?? '' })
  }, [currentUser?.displayName, reset])

  async function onSubmit(data) {
    const res = await updateUserProfile(currentUser.uid, {
      displayName: data.displayName.trim(),
    })
    if (res.success) {
      await refreshUser()
      showToast({ variant: 'success', title: 'Profile updated', message: 'Your display name has been saved.' })
    } else {
      showToast({ variant: 'error', title: 'Update failed', message: res.error })
    }
  }

  return (
    <div className="st-tab-content">
      <h2 className="st-tab-title">Profile</h2>

      <SCard>
        {/* Avatar */}
        <div className="profile-avatar-section">
          <Avatar name={currentUser?.displayName} email={currentUser?.email} size={80} />
          <div className="profile-avatar-info">
            <div className="profile-avatar-name">{currentUser?.displayName}</div>
            <div className="profile-avatar-email">{currentUser?.email}</div>
            <button className="profile-upload-btn" disabled>
              Upload Photo <span className="st-coming-soon">Coming soon</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="st-form" noValidate>
          <div className="st-form-grid">
            <Input
              label="Display Name"
              error={errors.displayName?.message}
              {...register('displayName', {
                required: 'Display name is required',
                minLength: { value: 2,  message: 'At least 2 characters' },
                maxLength: { value: 50, message: 'Maximum 50 characters' },
                pattern:   { value: /^[A-Za-z0-9 '\-]+$/, message: 'Only letters, numbers, spaces, hyphens, apostrophes' },
              })}
            />
            <Input
              label="Email"
              value={currentUser?.email ?? ''}
              disabled
              readOnly
            />
            <Input
              label="Role"
              value="Administrator"
              disabled
              readOnly
            />
            <Input
              label="Account Created"
              value={fmtDate(userDoc?.createdAt ?? currentUser?.createdAt)}
              disabled
              readOnly
            />
            <Input
              label="Last Login"
              value={fmtRelative(userDoc?.lastLogin ?? currentUser?.lastLogin)}
              disabled
              readOnly
            />
          </div>

          <div className="st-form-actions">
            <Button
              type="button"
              variant="secondary"
              onClick={() => reset()}
              disabled={!isDirty || isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={!isDirty}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </SCard>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 2 — SECURITY
// ─────────────────────────────────────────────────────────────────────────────

function SecurityTab() {
  const { currentUser, logout } = useAuth()
  const { showToast } = useToast()
  const [signOutModal, setSignOutModal] = useState(false)

  const {
    register, handleSubmit, watch, reset,
    formState: { isSubmitting, errors },
  } = useForm({ defaultValues: { current: '', next: '', confirm: '' } })

  const nextPw = watch('next', '')
  const strength = calcStrength(nextPw)

  async function onSubmit(data) {
    if (data.next === data.current) {
      showToast({ variant: 'warning', title: 'Same password', message: 'New password must differ from current.' })
      return
    }
    const res = await changePassword(data.current, data.next)
    if (res.success) {
      reset()
      showToast({ variant: 'success', title: 'Password updated', message: 'Your password has been changed.' })
    } else {
      showToast({ variant: 'error', title: 'Error', message: res.error })
    }
  }

  async function handleSignOutAll() {
    setSignOutModal(false)
    await logout()
  }

  const browserInfo = (() => {
    const ua = navigator.userAgent
    if (/Chrome/i.test(ua))  return 'Chrome'
    if (/Firefox/i.test(ua)) return 'Firefox'
    if (/Safari/i.test(ua))  return 'Safari'
    if (/Edge/i.test(ua))    return 'Edge'
    return 'Browser'
  })()

  return (
    <div className="st-tab-content">
      <h2 className="st-tab-title">Security</h2>

      {/* Change Password */}
      <SCard title="Change Password">
        <form onSubmit={handleSubmit(onSubmit)} className="st-form" noValidate>
          <Input
            label="Current Password"
            type="password"
            error={errors.current?.message}
            {...register('current', { required: 'Current password is required' })}
          />
          <div>
            <Input
              label="New Password"
              type="password"
              error={errors.next?.message}
              {...register('next', {
                required: 'New password is required',
                minLength: { value: 8, message: 'At least 8 characters' },
                validate: v =>
                  (/[A-Za-z]/.test(v) && /[0-9]/.test(v)) ||
                  'Must contain at least one letter and one number',
              })}
            />
            {nextPw && (
              <div className="pw-strength">
                <div className="pw-strength-bar">
                  <div
                    className="pw-strength-fill"
                    style={{ width: `${strength.pct}%`, background: strength.color }}
                  />
                </div>
                <span className="pw-strength-label" style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </div>
            )}
          </div>
          <Input
            label="Confirm New Password"
            type="password"
            error={errors.confirm?.message}
            {...register('confirm', {
              required: 'Please confirm your new password',
              validate: v => v === nextPw || 'Passwords do not match',
            })}
          />
          <div className="st-form-actions">
            <Button type="submit" loading={isSubmitting}>Update Password</Button>
          </div>
        </form>
      </SCard>

      {/* Active Sessions */}
      <SCard title="Active Sessions">
        <div className="session-row">
          <div className="session-icon">
            <Shield size={18} />
          </div>
          <div className="session-info">
            <div className="session-name">This Device — {browserInfo}</div>
            <div className="session-sub">Current session · {currentUser?.email}</div>
          </div>
          <Badge variant="success">Active</Badge>
        </div>

        <div className="st-form-actions" style={{ marginTop: 'var(--space-4)' }}>
          <Button variant="danger" onClick={() => setSignOutModal(true)} leftIcon={<LogOut size={15} />}>
            Sign Out All Devices
          </Button>
        </div>
      </SCard>

      {/* Account Activity */}
      <SCard title="Account Activity">
        <div className="activity-rows">
          <div className="activity-row">
            <span className="activity-label">Last Login</span>
            <span className="activity-value">{fmtRelative(currentUser?.lastLogin)}</span>
          </div>
          <div className="activity-row">
            <span className="activity-label">Account Created</span>
            <span className="activity-value">{fmtDate(currentUser?.createdAt)}</span>
          </div>
          <div className="activity-row">
            <span className="activity-label">Email</span>
            <span className="activity-value">{currentUser?.email}</span>
          </div>
        </div>
      </SCard>

      {/* Sign out all confirmation */}
      <Modal isOpen={signOutModal} onClose={() => setSignOutModal(false)} title="Sign Out All Devices" size="sm">
        <Modal.Header />
        <Modal.Body>
          <div className="st-confirm-warn">
            <AlertTriangle size={16} />
            You will be signed out immediately and redirected to the login page.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSignOutModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleSignOutAll}>Sign Out</Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 3 — TEAM
// ─────────────────────────────────────────────────────────────────────────────

function TeamTab() {
  const { currentUser } = useAuth()
  const { showToast } = useToast()
  const { users, loading, error, refresh } = useUsers()
  const loaded = useRef(false)

  // Lazy fetch — only fires once when this tab is first opened
  useEffect(() => {
    if (!loaded.current) { loaded.current = true; refresh() }
  }, [refresh])

  const [inviteModal,    setInviteModal]    = useState(false)
  const [roleModal,      setRoleModal]      = useState(null) // { user }
  const [removeModal,    setRemoveModal]    = useState(null) // { user }
  const [removeConfirm,  setRemoveConfirm]  = useState('')

  // Invite form
  const inviteForm = useForm({ defaultValues: { email: '', role: 'viewer' } })
  const [inviting, setInviting] = useState(false)

  async function handleInvite(data) {
    setInviting(true)
    const existing = users.find(u => u.email?.toLowerCase() === data.email.toLowerCase())
    if (existing) {
      inviteForm.setError('email', { message: 'This email already has access' })
      setInviting(false)
      return
    }
    const res = await inviteUser(data.email, data.role)
    setInviting(false)
    if (res.success) {
      setInviteModal(false)
      inviteForm.reset()
      await refresh()
      showToast({ variant: 'success', title: 'Invitation created', message: `${data.email} added as ${data.role} (pending).` })
    } else {
      showToast({ variant: 'error', title: 'Error', message: res.error })
    }
  }

  // Change role
  const [newRole,       setNewRole]       = useState('viewer')
  const [changingRole,  setChangingRole]  = useState(false)

  async function handleChangeRole() {
    if (!roleModal) return
    setChangingRole(true)
    const res = await updateUserRole(roleModal.user.id, newRole)
    setChangingRole(false)
    if (res.success) {
      setRoleModal(null)
      await refresh()
      showToast({ variant: 'success', title: 'Role updated', message: `${roleModal.user.displayName} is now ${newRole}.` })
    } else {
      showToast({ variant: 'error', title: 'Error', message: res.error })
    }
  }

  // Remove access
  const [removing, setRemoving] = useState(false)

  async function handleRemove() {
    if (!removeModal) return
    setRemoving(true)
    const res = await deleteUser(removeModal.user.id)
    setRemoving(false)
    if (res.success) {
      setRemoveModal(null)
      setRemoveConfirm('')
      await refresh()
      showToast({ variant: 'success', title: 'Access removed', message: `${removeModal.user.displayName} no longer has access.` })
    } else {
      showToast({ variant: 'error', title: 'Error', message: res.error })
    }
  }

  return (
    <div className="st-tab-content">
      <div className="team-header">
        <div>
          <h2 className="st-tab-title" style={{ marginBottom: 4 }}>Team Members</h2>
          <p className="st-tab-sub">Manage who has access to the dashboard</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          <button className="st-icon-btn" onClick={refresh} title="Refresh">
            <RefreshCw size={15} />
          </button>
          <Button
            leftIcon={<UserPlus size={15} />}
            onClick={() => setInviteModal(true)}
          >
            Invite Member
          </Button>
        </div>
      </div>

      {error && (
        <div className="st-error"><AlertTriangle size={14} />{error}</div>
      )}

      <SCard>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {[1, 2, 3].map(i => <SkeletonLoader key={i} height={52} />)}
          </div>
        ) : users.length === 0 ? (
          <div className="st-empty">No team members found</div>
        ) : (
          <div className="team-table-wrap">
            <table className="team-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Login</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const isMe = u.id === currentUser?.uid || u.email === currentUser?.email
                  return (
                    <tr key={u.id} className="team-row">
                      <td>
                        <div className="team-member-cell">
                          <Avatar name={u.displayName} email={u.email} size={32} />
                          <div>
                            <div className="team-member-name">
                              {u.displayName}
                              {isMe && <span className="team-you-badge">You</span>}
                            </div>
                            <div className="team-member-email">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Badge variant={u.role === 'admin' ? 'primary' : 'neutral'}>
                          {u.role}
                        </Badge>
                      </td>
                      <td>
                        <Badge variant={u.status === 'pending' ? 'warning' : 'success'}>
                          {u.status ?? 'active'}
                        </Badge>
                      </td>
                      <td className="team-muted">{fmtRelative(u.lastLogin)}</td>
                      <td className="team-actions-cell">
                        {!isMe && (
                          <TeamActionsMenu
                            onChangeRole={() => { setNewRole(u.role); setRoleModal({ user: u }) }}
                            onRemove={() => { setRemoveConfirm(''); setRemoveModal({ user: u }) }}
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SCard>

      {/* Invite Modal */}
      <Modal isOpen={inviteModal} onClose={() => setInviteModal(false)} title="Invite Team Member" size="sm">
        <Modal.Header />
        <Modal.Body>
          <form id="invite-form" onSubmit={inviteForm.handleSubmit(handleInvite)} className="st-form" noValidate>
            <Input
              label="Email Address"
              type="email"
              error={inviteForm.formState.errors.email?.message}
              {...inviteForm.register('email', {
                required: 'Email is required',
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email address' },
              })}
            />
            <Select
              label="Role"
              options={[
                { value: 'viewer', label: 'Viewer — read-only access' },
                { value: 'admin',  label: 'Admin — full access' },
              ]}
              {...inviteForm.register('role')}
            />
            <div className="st-info-note">
              A pending account will be created. The user must register with this email to gain access.
              Email invitations require Cloud Functions (coming soon).
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setInviteModal(false)}>Cancel</Button>
          <Button type="submit" form="invite-form" loading={inviting} leftIcon={<UserPlus size={15} />}>
            Create Invitation
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Change Role Modal */}
      <Modal isOpen={!!roleModal} onClose={() => setRoleModal(null)} title="Change Role" size="sm">
        <Modal.Header />
        <Modal.Body>
          <p className="st-modal-body-text">
            Change role for <strong>{roleModal?.user?.displayName}</strong>:
          </p>
          <Select
            label="New Role"
            value={newRole}
            onChange={e => setNewRole(e.target.value)}
            options={[
              { value: 'viewer', label: 'Viewer — read-only access' },
              { value: 'admin',  label: 'Admin — full access' },
            ]}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setRoleModal(null)}>Cancel</Button>
          <Button loading={changingRole} onClick={handleChangeRole}>Update Role</Button>
        </Modal.Footer>
      </Modal>

      {/* Remove Access Modal */}
      <Modal isOpen={!!removeModal} onClose={() => setRemoveModal(null)} title="Remove Access" size="sm">
        <Modal.Header />
        <Modal.Body>
          <div className="st-confirm-warn">
            <AlertTriangle size={16} />
            <strong>{removeModal?.user?.displayName}</strong> will lose access immediately.
            Their Firebase Auth account is not deleted.
          </div>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Input
              label={`Type "${removeModal?.user?.email}" to confirm`}
              value={removeConfirm}
              onChange={e => setRemoveConfirm(e.target.value)}
              placeholder={removeModal?.user?.email}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setRemoveModal(null)}>Cancel</Button>
          <Button
            variant="danger"
            loading={removing}
            disabled={removeConfirm !== removeModal?.user?.email}
            onClick={handleRemove}
            leftIcon={<Trash2 size={15} />}
          >
            Remove Access
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

function TeamActionsMenu({ onChangeRole, onRemove }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="team-actions-menu" ref={ref}>
      <button className="team-actions-trigger" onClick={() => setOpen(v => !v)}>
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="team-actions-dropdown">
          <button onClick={() => { setOpen(false); onChangeRole() }}>
            <Edit2 size={14} /> Change Role
          </button>
          <button className="team-actions-danger" onClick={() => { setOpen(false); onRemove() }}>
            <Trash2 size={14} /> Remove Access
          </button>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 4 — PREFERENCES
// ─────────────────────────────────────────────────────────────────────────────

function PreferencesTab() {
  const { preferences, updatePreference } = usePreferences()
  const { showToast } = useToast()

  async function save(key, value) {
    await updatePreference(key, value)
    showToast({ variant: 'success', title: 'Preferences updated', message: `${key} set to ${value}.` })
  }

  return (
    <div className="st-tab-content">
      <h2 className="st-tab-title">Preferences</h2>

      <SCard title="Display">
        <div className="pref-group">
          <PrefRow label="Theme">
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <RadioGroup
                value="dark"
                options={[{ value: 'dark', label: 'Dark' }]}
                onChange={() => {}}
              />
              <span className="st-coming-soon">Light mode coming soon</span>
            </div>
          </PrefRow>

          <PrefRow label="Density">
            <RadioGroup
              value={preferences.density}
              options={[
                { value: 'compact',      label: 'Compact' },
                { value: 'normal',       label: 'Normal' },
                { value: 'comfortable', label: 'Comfortable' },
              ]}
              onChange={v => save('density', v)}
            />
          </PrefRow>

          <PrefRow label="Font Size">
            <RadioGroup
              value={preferences.fontSize}
              options={[
                { value: 'small',  label: 'Small' },
                { value: 'medium', label: 'Medium' },
                { value: 'large',  label: 'Large' },
              ]}
              onChange={v => save('fontSize', v)}
            />
          </PrefRow>
        </div>
      </SCard>

      <SCard title="Localization">
        <div className="pref-group">
          <PrefRow label="Language">
            <Select
              options={[{ value: 'en', label: 'English' }]}
              value={preferences.language}
              onChange={() => {}}
              fullWidth={false}
            />
          </PrefRow>

          <PrefRow label="Timezone">
            <Select
              options={TIMEZONES}
              value={preferences.timezone}
              onChange={e => save('timezone', e.target.value)}
              fullWidth={false}
              className="pref-select-wide"
            />
          </PrefRow>

          <PrefRow label="Date Format">
            <RadioGroup
              value={preferences.dateFormat}
              options={[
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                { value: 'YYYY-MM-DD', label: 'ISO' },
              ]}
              onChange={v => save('dateFormat', v)}
            />
          </PrefRow>

          <PrefRow label="Time Format">
            <RadioGroup
              value={preferences.timeFormat}
              options={[
                { value: '12h', label: '12-hour' },
                { value: '24h', label: '24-hour' },
              ]}
              onChange={v => save('timeFormat', v)}
            />
          </PrefRow>

          <PrefRow label="First Day of Week">
            <RadioGroup
              value={preferences.firstDayOfWeek}
              options={[
                { value: 'sunday',  label: 'Sunday' },
                { value: 'monday', label: 'Monday' },
              ]}
              onChange={v => save('firstDayOfWeek', v)}
            />
          </PrefRow>
        </div>
      </SCard>

      <SCard title="Defaults">
        <div className="pref-group">
          <PrefRow label="Landing Page">
            <Select
              options={[
                { value: 'dashboard',  label: 'Dashboard' },
                { value: 'campaigns', label: 'Campaigns' },
                { value: 'scans',     label: 'Scans' },
                { value: 'analytics', label: 'Analytics' },
              ]}
              value={preferences.defaultLandingPage}
              onChange={e => save('defaultLandingPage', e.target.value)}
              fullWidth={false}
            />
          </PrefRow>

          <PrefRow label="Default Date Range">
            <RadioGroup
              value={preferences.defaultDateRange}
              options={[
                { value: '7d',  label: '7 days' },
                { value: '30d', label: '30 days' },
                { value: '90d', label: '90 days' },
              ]}
              onChange={v => save('defaultDateRange', v)}
            />
          </PrefRow>
        </div>
      </SCard>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// TAB 5 — DATA MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

function DataTab() {
  const { showToast } = useToast()
  const [usage,        setUsage]        = useState(null)
  const [usageLoading, setUsageLoading] = useState(true)
  const [exporting,    setExporting]    = useState(false)

  // Danger zone modals
  const [testModal,    setTestModal]    = useState(false)
  const [resetModal,   setResetModal]   = useState(false)
  const [deleteModal,  setDeleteModal]  = useState(false)
  const [deleteInput,  setDeleteInput]  = useState('')
  const [progress,     setProgress]     = useState('')
  const [working,      setWorking]      = useState(false)

  useEffect(() => {
    getStorageUsage().then(res => {
      if (res.success) setUsage(res.data)
      setUsageLoading(false)
    })
  }, [])

  async function handleExport() {
    setExporting(true)
    const res = await exportAllData()
    setExporting(false)
    if (!res.success) {
      showToast({ variant: 'error', title: 'Export failed', message: res.error })
      return
    }
    const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `next-vision-export-${format(new Date(), 'yyyy-MM-dd')}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast({ variant: 'success', title: 'Exported', message: 'Data downloaded as JSON.' })
  }

  async function handleDeleteTest() {
    setWorking(true)
    const res = await deleteTestScans()
    setWorking(false)
    setTestModal(false)
    if (res.success) {
      showToast({ variant: 'success', title: 'Done', message: `${res.data.deleted} test scan(s) deleted.` })
      getStorageUsage().then(r => { if (r.success) setUsage(r.data) })
    } else {
      showToast({ variant: 'error', title: 'Error', message: res.error })
    }
  }

  async function handleReset() {
    setWorking(true)
    const res = await resetCounters()
    setWorking(false)
    setResetModal(false)
    if (res.success) {
      showToast({ variant: 'success', title: 'Counters reset', message: `Cleared totalScans on ${res.data.billboards} billboards and ${res.data.campaigns} campaigns.` })
    } else {
      showToast({ variant: 'error', title: 'Error', message: res.error })
    }
  }

  async function handleDeleteAll() {
    setWorking(true)
    const res = await deleteAllData(msg => setProgress(msg))
    setWorking(false)
    setDeleteModal(false)
    setDeleteInput('')
    setProgress('')
    if (res.success) {
      showToast({ variant: 'success', title: 'All data deleted', message: 'Campaigns, billboards, and scans have been removed.' })
      getStorageUsage().then(r => { if (r.success) setUsage(r.data) })
    } else {
      showToast({ variant: 'error', title: 'Error', message: res.error })
    }
  }

  return (
    <div className="st-tab-content">
      <h2 className="st-tab-title">Data Management</h2>

      {/* Export */}
      <SCard title="Export Data" subtitle="Download all your data as JSON">
        <Button
          leftIcon={<Download size={15} />}
          loading={exporting}
          onClick={handleExport}
          variant="secondary"
        >
          Export All Data
        </Button>
      </SCard>

      {/* Storage Usage */}
      <SCard title="Storage Usage">
        {usageLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {[1, 2, 3].map(i => <SkeletonLoader key={i} height={32} />)}
          </div>
        ) : usage ? (
          <div className="usage-list">
            <div className="usage-row">
              <span className="usage-label">Campaigns</span>
              <span className="usage-value">{usage.campaigns.toLocaleString()} docs</span>
            </div>
            <div className="usage-row">
              <span className="usage-label">Billboards</span>
              <span className="usage-value">{usage.billboards.toLocaleString()} docs</span>
            </div>
            <div className="usage-row">
              <span className="usage-label">Scans</span>
              <span className="usage-value">{usage.scans.toLocaleString()} docs</span>
            </div>
          </div>
        ) : (
          <div className="st-empty">Could not load usage data</div>
        )}
        <p className="st-info-note" style={{ marginTop: 'var(--space-4)' }}>
          Firestore free tier: 1 GB storage, 50K reads/day, 20K writes/day.
        </p>
      </SCard>

      {/* Danger Zone */}
      <SCard title="Danger Zone" subtitle="These actions cannot be undone." className="st-card--danger">
        <div className="danger-list">

          <div className="danger-item">
            <div className="danger-item-info">
              <div className="danger-item-title">Delete Test Scans</div>
              <div className="danger-item-desc">Remove all scans with a simulated/test user agent.</div>
            </div>
            <Button variant="danger" size="sm" onClick={() => setTestModal(true)}>
              Delete Test Scans
            </Button>
          </div>

          <div className="danger-item">
            <div className="danger-item-info">
              <div className="danger-item-title">Reset Statistics</div>
              <div className="danger-item-desc">Set totalScans to 0 on all billboards and campaigns. Scan documents are kept.</div>
            </div>
            <Button variant="danger" size="sm" onClick={() => setResetModal(true)}>
              Reset Counters
            </Button>
          </div>

          <div className="danger-item">
            <div className="danger-item-info">
              <div className="danger-item-title">Delete All Data</div>
              <div className="danger-item-desc">Permanently delete all campaigns, billboards, and scans. This cannot be recovered.</div>
            </div>
            <Button variant="danger" onClick={() => { setDeleteInput(''); setDeleteModal(true) }}>
              Delete All Data
            </Button>
          </div>

        </div>
      </SCard>

      {/* Delete Test Scans Modal */}
      <Modal isOpen={testModal} onClose={() => setTestModal(false)} title="Delete Test Scans" size="sm">
        <Modal.Header />
        <Modal.Body>
          <div className="st-confirm-warn">
            <AlertTriangle size={16} />
            All scans with a simulated user agent will be permanently deleted.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setTestModal(false)}>Cancel</Button>
          <Button variant="danger" loading={working} onClick={handleDeleteTest}>Delete</Button>
        </Modal.Footer>
      </Modal>

      {/* Reset Counters Modal */}
      <Modal isOpen={resetModal} onClose={() => setResetModal(false)} title="Reset Counters" size="sm">
        <Modal.Header />
        <Modal.Body>
          <div className="st-confirm-warn">
            <AlertTriangle size={16} />
            totalScans will be set to 0 on all billboards and campaigns. Scan documents are not deleted.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setResetModal(false)}>Cancel</Button>
          <Button variant="danger" loading={working} onClick={handleReset}>Reset</Button>
        </Modal.Footer>
      </Modal>

      {/* Delete All Data Modal */}
      <Modal isOpen={deleteModal} onClose={() => setDeleteModal(false)} title="Delete All Data" size="sm">
        <Modal.Header />
        <Modal.Body>
          <div className="st-confirm-warn">
            <AlertTriangle size={16} />
            This will permanently delete <strong>all</strong> campaigns, billboards, and scans.
            This action cannot be undone.
          </div>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <Input
              label='Type "DELETE EVERYTHING" to confirm'
              value={deleteInput}
              onChange={e => setDeleteInput(e.target.value)}
              placeholder="DELETE EVERYTHING"
            />
          </div>
          {progress && <div className="st-progress">{progress}</div>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setDeleteModal(false)} disabled={working}>Cancel</Button>
          <Button
            variant="danger"
            loading={working}
            disabled={deleteInput !== 'DELETE EVERYTHING'}
            onClick={handleDeleteAll}
            leftIcon={<Trash2 size={15} />}
          >
            Delete Everything
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SETTINGS PAGE
// ─────────────────────────────────────────────────────────────────────────────

const TAB_CONTENT = {
  profile:     <ProfileTab />,
  security:    <SecurityTab />,
  team:        <TeamTab />,
  preferences: <PreferencesTab />,
  data:        <DataTab />,
}

export default function Settings() {
  useDocumentTitle('Settings')
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div className="settings-page">

      {/* Sidebar */}
      <aside className="settings-sidebar">
        <div className="settings-sidebar-title">Settings</div>
        {TABS.map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              className={`settings-tab ${active ? 'settings-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon size={16} />
              <span className="settings-tab-label">{tab.label}</span>
              {active && <ChevronRight size={14} className="settings-tab-chevron" />}
            </button>
          )
        })}
      </aside>

      {/* Content */}
      <div className="settings-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
          >
            {TAB_CONTENT[activeTab]}
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  )
}
