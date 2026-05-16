import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { useForm, Controller } from 'react-hook-form'
import { format, formatDistanceToNow, differenceInDays, isAfter, isBefore } from 'date-fns'
import {
  Plus, Search, MoreHorizontal, Edit2, Trash2, Eye,
  Activity, MapPin, Megaphone, AlertTriangle, LayoutGrid, List,
  Calendar, TrendingUp,
} from 'lucide-react'
import { Timestamp } from 'firebase/firestore'

import { Card, Button, Input, Select, Badge, Modal, EmptyState, SkeletonLoader } from '../components/ui'
import { useToast } from '../components/ui'
import { useCampaigns } from '../hooks/useCampaigns'
import { createCampaign, updateCampaign, deleteCampaign } from '../firebase/campaigns'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import './Campaigns.css'

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'all',      label: 'All Status' },
  { value: 'active',   label: 'Active' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ended',    label: 'Ended' },
]

const FORM_STATUS_OPTIONS = [
  { value: 'active',   label: 'Active' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'ended',    label: 'Ended' },
]

const SORT_OPTIONS = [
  { value: 'newest',    label: 'Newest First' },
  { value: 'oldest',    label: 'Oldest First' },
  { value: 'name',      label: 'Name A–Z' },
  { value: 'mostScans', label: 'Most Scans' },
]

const STATUS_BADGE = {
  active:   'success',
  upcoming: 'warning',
  ended:    'default',
}

// ── Motion variants ──────────────────────────────────────────────────────────

const pageVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.06 } },
}

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

const cardVariants = {
  hidden:  { opacity: 0, y: 16, scale: 0.98 },
  visible: { opacity: 1, y: 0,  scale: 1,   transition: { duration: 0.3, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.2 } },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function tsToDate(ts) {
  if (!ts) return null
  if (ts instanceof Date) return ts
  if (ts?.toDate) return ts.toDate()
  return new Date(ts)
}

function dateToInputValue(ts) {
  const d = tsToDate(ts)
  if (!d) return ''
  return format(d, 'yyyy-MM-dd')
}

function suggestStatus(startStr, endStr) {
  if (!startStr || !endStr) return null
  const now   = new Date()
  const start = new Date(startStr)
  const end   = new Date(endStr)
  if (isAfter(start, now))  return 'upcoming'
  if (isBefore(end,  now))  return 'ended'
  return 'active'
}

function formatDateRange(start, end) {
  const s = tsToDate(start)
  const e = tsToDate(end)
  if (!s || !e) return '—'
  if (s.getFullYear() === e.getFullYear())
    return `${format(s, 'MMM d')} – ${format(e, 'MMM d, yyyy')}`
  return `${format(s, 'MMM d, yyyy')} – ${format(e, 'MMM d, yyyy')}`
}

function formatTableDate(ts) {
  const d = tsToDate(ts)
  return d ? format(d, 'MMM d, yyyy') : '—'
}

function relativeDate(ts, prefix = 'Started') {
  const d = tsToDate(ts)
  if (!d) return ''
  const now = new Date()
  if (isAfter(d, now)) return `Starts ${formatDistanceToNow(d, { addSuffix: true })}`
  return `${prefix} ${formatDistanceToNow(d, { addSuffix: true })}`
}

// ── 3-dot Actions Menu ───────────────────────────────────────────────────────

function ActionsMenu({ onView, onEdit, onDelete }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="actions-menu" ref={ref}>
      <button
        className="actions-trigger"
        onClick={(e) => { e.stopPropagation(); setOpen(v => !v) }}
        aria-label="Actions"
      >
        <MoreHorizontal size={16} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className="actions-dropdown"
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1,    y: 0 }}
            exit={{    opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.12 }}
          >
            <button onClick={(e) => { e.stopPropagation(); setOpen(false); onView() }}>
              <Eye size={14} /> View Details
            </button>
            <button onClick={(e) => { e.stopPropagation(); setOpen(false); onEdit() }}>
              <Edit2 size={14} /> Edit
            </button>
            <button className="actions-dropdown__danger" onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete() }}>
              <Trash2 size={14} /> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Grid Card ────────────────────────────────────────────────────────────────

function CampaignCard({ campaign, onView, onEdit, onDelete, isNew }) {
  return (
    <motion.div
      layout
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`campaign-card ${isNew ? 'campaign-card--new' : ''}`}
      onClick={() => onView(campaign)}
    >
      <div className="campaign-card__top">
        <Badge variant={STATUS_BADGE[campaign.status]} dot size="sm">
          {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
        </Badge>
        <ActionsMenu
          onView={() => onView(campaign)}
          onEdit={() => onEdit(campaign)}
          onDelete={() => onDelete(campaign)}
        />
      </div>

      <h3 className="campaign-card__name">{campaign.name}</h3>

      {campaign.description && (
        <p className="campaign-card__desc">{campaign.description}</p>
      )}

      <div className="campaign-card__stats">
        <span className="campaign-stat">
          <Activity size={13} />
          {(campaign.totalScans ?? 0).toLocaleString()} scans
        </span>
        <span className="campaign-stat">
          <MapPin size={13} />
          {campaign.totalBillboards ?? 0} billboards
        </span>
      </div>

      <div className="campaign-card__footer">
        <span className="campaign-card__dates">
          <Calendar size={12} />
          {formatDateRange(campaign.startDate, campaign.endDate)}
        </span>
      </div>
    </motion.div>
  )
}

// ── Skeleton Grid ─────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="campaigns-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="campaign-card campaign-card--skeleton">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <SkeletonLoader variant="rect" width="72px" height="22px" />
            <SkeletonLoader variant="circle" width="28px" height="28px" />
          </div>
          <SkeletonLoader variant="text" width="70%" height="18px" />
          <div style={{ marginTop: 'var(--space-2)' }}>
            <SkeletonLoader variant="text" lines={2} height="13px" />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
            <SkeletonLoader variant="text" width="80px" height="13px" />
            <SkeletonLoader variant="text" width="90px" height="13px" />
          </div>
          <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-border)' }}>
            <SkeletonLoader variant="text" width="60%" height="12px" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Table View ───────────────────────────────────────────────────────────────

function CampaignTable({ campaigns, onView, onEdit, onDelete, newId }) {
  return (
    <div className="campaigns-table-wrap">
      <table className="campaigns-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Start Date</th>
            <th>End Date</th>
            <th>Billboards</th>
            <th>Scans</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence mode="popLayout">
            {campaigns.map(c => (
              <motion.tr
                key={c.id}
                layout
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={`campaigns-table__row ${newId === c.id ? 'campaigns-table__row--new' : ''}`}
                onClick={() => onView(c)}
              >
                <td className="campaigns-table__name">{c.name}</td>
                <td>
                  <Badge variant={STATUS_BADGE[c.status]} dot size="sm">
                    {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                  </Badge>
                </td>
                <td>{formatTableDate(c.startDate)}</td>
                <td>{formatTableDate(c.endDate)}</td>
                <td>{c.totalBillboards ?? 0}</td>
                <td>{(c.totalScans ?? 0).toLocaleString()}</td>
                <td className="campaigns-table__actions" onClick={e => e.stopPropagation()}>
                  <button className="tbl-icon-btn" title="Edit" onClick={() => onEdit(c)}>
                    <Edit2 size={14} />
                  </button>
                  <button className="tbl-icon-btn tbl-icon-btn--danger" title="Delete" onClick={() => onDelete(c)}>
                    <Trash2 size={14} />
                  </button>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
    </div>
  )
}

// ── Create / Edit Modal ───────────────────────────────────────────────────────

function CampaignFormModal({ isOpen, mode, campaign, onClose, onSaved }) {
  const { showToast } = useToast()
  const {
    register, handleSubmit, control, watch, reset,
    formState: { errors, isSubmitting },
  } = useForm()

  const watchStart  = watch('startDate')
  const watchEnd    = watch('endDate')
  const watchStatus = watch('status')
  const suggested   = suggestStatus(watchStart, watchEnd)
  const showHint    = suggested && watchStatus && suggested !== watchStatus

  useEffect(() => {
    if (!isOpen) return
    if (mode === 'edit' && campaign) {
      reset({
        name:        campaign.name,
        description: campaign.description ?? '',
        status:      campaign.status,
        startDate:   dateToInputValue(campaign.startDate),
        endDate:     dateToInputValue(campaign.endDate),
      })
    } else {
      reset({ name: '', description: '', status: 'active', startDate: '', endDate: '' })
    }
  }, [isOpen, mode, campaign, reset])

  const descValue = watch('description') ?? ''

  async function onSubmit(data) {
    const startDate = Timestamp.fromDate(new Date(data.startDate))
    const endDate   = Timestamp.fromDate(new Date(data.endDate))

    const payload = { ...data, startDate, endDate }

    const result = mode === 'edit'
      ? await updateCampaign(campaign.id, payload)
      : await createCampaign(payload)

    if (result.success) {
      showToast({
        variant: 'success',
        title:   mode === 'edit' ? 'Campaign updated' : 'Campaign created',
        message: `"${data.name}" was ${mode === 'edit' ? 'saved' : 'created'} successfully.`,
      })
      onSaved(result.data)
      onClose()
    } else {
      showToast({ variant: 'error', title: 'Error', message: result.error })
    }
  }

  const title = mode === 'edit' ? 'Edit Campaign' : 'New Campaign'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <Modal.Header />
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Modal.Body>
          <div className="form-fields">
            <Input
              label="Campaign Name"
              placeholder="e.g. Summer Refresh 2026"
              error={errors.name?.message}
              {...register('name', {
                required: 'Name is required',
                minLength: { value: 3,   message: 'At least 3 characters' },
                maxLength: { value: 100, message: 'Max 100 characters' },
                setValueAs: v => v.trim(),
              })}
            />

            <div className="form-field">
              <label className="form-label">Description <span className="form-optional">(optional)</span></label>
              <textarea
                className={`form-textarea ${errors.description ? 'form-textarea--error' : ''}`}
                placeholder="Brief description of the campaign…"
                maxLength={500}
                rows={3}
                {...register('description', {
                  maxLength: { value: 500, message: 'Max 500 characters' },
                })}
              />
              <div className="form-textarea-footer">
                {errors.description && <span className="form-error">{errors.description.message}</span>}
                <span className="form-char-count">{descValue.length}/500</span>
              </div>
            </div>

            <Controller
              name="status"
              control={control}
              rules={{ required: 'Status is required' }}
              render={({ field }) => (
                <Select
                  label="Status"
                  options={FORM_STATUS_OPTIONS}
                  error={errors.status?.message}
                  {...field}
                />
              )}
            />

            {showHint && (
              <div className="form-hint">
                <AlertTriangle size={13} />
                Suggested status based on dates: <strong>{suggested}</strong>
              </div>
            )}

            <div className="form-row">
              <Input
                label="Start Date"
                type="date"
                error={errors.startDate?.message}
                {...register('startDate', { required: 'Start date is required' })}
              />
              <Input
                label="End Date"
                type="date"
                error={errors.endDate?.message}
                {...register('endDate', {
                  required: 'End date is required',
                  validate: v => !watchStart || v > watchStart || 'Must be after start date',
                })}
              />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>
            {mode === 'edit' ? 'Save Changes' : 'Create Campaign'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}

// ── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({ isOpen, campaign, onClose, onDeleted }) {
  const { showToast } = useToast()
  const [confirmText, setConfirmText] = useState('')
  const [loading,     setLoading]     = useState(false)
  const matched = confirmText === campaign?.name

  useEffect(() => {
    if (!isOpen) setConfirmText('')
  }, [isOpen])

  async function handleDelete() {
    if (!matched) return
    setLoading(true)
    const result = await deleteCampaign(campaign.id, campaign.totalBillboards)
    setLoading(false)

    if (result.success) {
      showToast({ variant: 'success', title: 'Deleted', message: `"${campaign.name}" was deleted.` })
      onDeleted()
      onClose()
    } else {
      showToast({ variant: 'error', title: 'Cannot delete', message: result.error })
    }
  }

  const hasBillboards = (campaign?.totalBillboards ?? 0) > 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Campaign" size="sm">
      <Modal.Header />
      <Modal.Body>
        <div className="delete-modal-body">
          <div className="delete-modal-icon">
            <AlertTriangle size={28} />
          </div>
          <p className="delete-modal-text">
            Permanently delete <strong>"{campaign?.name}"</strong>? This cannot be undone.
          </p>

          {hasBillboards && (
            <div className="delete-modal-warning">
              <AlertTriangle size={14} />
              This campaign has {campaign.totalBillboards} billboard{campaign.totalBillboards > 1 ? 's' : ''}.
              Delete those first.
            </div>
          )}

          {!hasBillboards && (
            <div className="delete-modal-confirm">
              <label className="form-label">Type <strong>{campaign?.name}</strong> to confirm</label>
              <input
                className="delete-confirm-input"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={campaign?.name}
                autoFocus
              />
            </div>
          )}
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button
          variant="danger"
          loading={loading}
          disabled={hasBillboards || !matched}
          onClick={handleDelete}
        >
          Delete
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

// ── View Details Modal ────────────────────────────────────────────────────────

function ViewModal({ isOpen, campaign, onClose, onEdit }) {
  if (!campaign) return null

  const start    = tsToDate(campaign.startDate)
  const end      = tsToDate(campaign.endDate)
  const now      = new Date()
  const totalDays  = start && end ? differenceInDays(end, start) : 0
  const elapsed    = start ? Math.max(0, differenceInDays(now, start)) : 0
  const progress   = totalDays > 0 ? Math.min(100, Math.round((elapsed / totalDays) * 100)) : 0
  const daysRunning = start ? Math.max(0, differenceInDays(isBefore(now, start) ? start : now, start)) : 0
  const engagement  = campaign.totalScans > 0
    ? ((campaign.totalScans / Math.max(campaign.totalBillboards, 1)) / 30 * 100).toFixed(1)
    : '0.0'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={campaign.name} size="lg">
      <Modal.Header>
        <Badge variant={STATUS_BADGE[campaign.status]} dot>
          {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
        </Badge>
      </Modal.Header>
      <Modal.Body>
        {campaign.description && (
          <p className="view-description">{campaign.description}</p>
        )}

        <div className="view-stats-grid">
          <div className="view-stat">
            <Activity size={18} className="view-stat__icon" />
            <span className="view-stat__value">{(campaign.totalScans ?? 0).toLocaleString()}</span>
            <span className="view-stat__label">Total Scans</span>
          </div>
          <div className="view-stat">
            <MapPin size={18} className="view-stat__icon" />
            <span className="view-stat__value">{campaign.totalBillboards ?? 0}</span>
            <span className="view-stat__label">Billboards</span>
          </div>
          <div className="view-stat">
            <Calendar size={18} className="view-stat__icon" />
            <span className="view-stat__value">{daysRunning}</span>
            <span className="view-stat__label">Days Running</span>
          </div>
          <div className="view-stat">
            <TrendingUp size={18} className="view-stat__icon" />
            <span className="view-stat__value">{engagement}%</span>
            <span className="view-stat__label">Engagement</span>
          </div>
        </div>

        <div className="view-dates">
          <div className="view-dates__range">
            <span>{start ? format(start, 'MMM d, yyyy') : '—'}</span>
            <span>{end ? format(end, 'MMM d, yyyy') : '—'}</span>
          </div>
          <div className="view-progress-track">
            <motion.div
              className="view-progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <div className="view-dates__labels">
            <span>Start</span>
            <span>{progress}% elapsed</span>
            <span>End</span>
          </div>
        </div>

        {start && (
          <p className="view-relative">{relativeDate(campaign.startDate)}</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button leftIcon={<Edit2 size={15} />} onClick={() => { onClose(); onEdit(campaign) }}>
          Edit Campaign
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Campaigns() {
  useDocumentTitle('Campaigns')
  const { campaigns, loading, error, filters, setFilters } = useCampaigns()
  const { showToast } = useToast()

  const [view,        setView]      = useState('grid') // 'grid' | 'table'
  const [newId,       setNewId]     = useState(null)
  const [searchKey,   setSearchKey] = useState(0)    // incremented to reset uncontrolled input
  const [formModal, setFormModal] = useState({ isOpen: false, mode: 'create', campaign: null })
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, campaign: null })
  const [viewModal,   setViewModal]   = useState({ isOpen: false, campaign: null })

  // Debounce search
  const searchRef = useRef('')
  const debounceRef = useRef(null)

  function handleSearchChange(e) {
    const val = e.target.value
    searchRef.current = val
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilters(f => ({ ...f, search: searchRef.current }))
    }, 300)
  }

  // Clear new-item glow after 2s
  useEffect(() => {
    if (!newId) return
    const t = setTimeout(() => setNewId(null), 2000)
    return () => clearTimeout(t)
  }, [newId])

  const hasData     = campaigns.length > 0
  const isFiltered  = filters.status !== 'all' || filters.search

  function openCreate() {
    setFormModal({ isOpen: true, mode: 'create', campaign: null })
  }

  function openEdit(campaign) {
    setFormModal({ isOpen: true, mode: 'edit', campaign })
  }

  function openDelete(campaign) {
    setDeleteModal({ isOpen: true, campaign })
  }

  function openView(campaign) {
    setViewModal({ isOpen: true, campaign })
  }

  function handleSaved(data) {
    if (data?.id) setNewId(data.id)
  }

  function clearFilters() {
    setFilters(f => ({ ...f, status: 'all', search: '' }))
    searchRef.current = ''
    setSearchKey(k => k + 1)
  }

  function renderContent() {
    if (loading) return <SkeletonGrid />

    if (!hasData && !isFiltered) {
      return (
        <EmptyState
          icon={<Megaphone />}
          title="No campaigns yet"
          description="Create your first campaign to start tracking billboard performance."
          action={{ label: 'Create Campaign', onClick: openCreate }}
        />
      )
    }

    if (!hasData && isFiltered) {
      return (
        <EmptyState
          icon={<Search />}
          title="No matches"
          description="No campaigns match your current filters."
          action={{ label: 'Clear Filters', onClick: clearFilters, variant: 'secondary' }}
        />
      )
    }

    if (view === 'table') {
      return (
        <CampaignTable
          campaigns={campaigns}
          onView={openView}
          onEdit={openEdit}
          onDelete={openDelete}
          newId={newId}
        />
      )
    }

    return (
      <LayoutGroup>
        <div className="campaigns-grid">
          <AnimatePresence mode="popLayout">
            {campaigns.map(c => (
              <CampaignCard
                key={c.id}
                campaign={c}
                onView={openView}
                onEdit={openEdit}
                onDelete={openDelete}
                isNew={newId === c.id}
              />
            ))}
          </AnimatePresence>
        </div>
      </LayoutGroup>
    )
  }

  return (
    <>
      <motion.div
        className="campaigns-page"
        variants={pageVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div className="campaigns-header" variants={fadeUp}>
          <div>
            <h1 className="campaigns-title">Campaigns</h1>
            <p className="campaigns-subtitle">Manage and track all your billboard campaigns</p>
          </div>
          <Button leftIcon={<Plus size={16} />} onClick={openCreate}>
            New Campaign
          </Button>
        </motion.div>

        {/* Filter bar */}
        <motion.div variants={fadeUp}>
          <Card padding="sm" className="campaigns-filters">
            <div className="filters-left">
              <Input
                key={searchKey}
                placeholder="Search campaigns…"
                leftIcon={<Search size={15} />}
                defaultValue=""
                onChange={handleSearchChange}
                className="filters-search"
              />
              <Select
                options={STATUS_OPTIONS}
                value={filters.status}
                onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                className="filters-select"
              />
              <Select
                options={SORT_OPTIONS}
                value={filters.sortBy}
                onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value }))}
                className="filters-select"
              />
            </div>
            <div className="view-toggle" role="group" aria-label="View mode">
              <button
                className={`view-btn ${view === 'grid' ? 'view-btn--active' : ''}`}
                onClick={() => setView('grid')}
                aria-pressed={view === 'grid'}
                title="Grid view"
              >
                <LayoutGrid size={16} />
              </button>
              <button
                className={`view-btn ${view === 'table' ? 'view-btn--active' : ''}`}
                onClick={() => setView('table')}
                aria-pressed={view === 'table'}
                title="Table view"
              >
                <List size={16} />
              </button>
            </div>
          </Card>
        </motion.div>

        {/* Error banner */}
        {error && (
          <motion.div className="campaigns-error" variants={fadeUp}>
            <AlertTriangle size={16} /> {error}
          </motion.div>
        )}

        {/* Content */}
        <motion.div variants={fadeUp}>
          {renderContent()}
        </motion.div>
      </motion.div>

      {/* Modals */}
      <CampaignFormModal
        isOpen={formModal.isOpen}
        mode={formModal.mode}
        campaign={formModal.campaign}
        onClose={() => setFormModal(m => ({ ...m, isOpen: false }))}
        onSaved={handleSaved}
      />

      <DeleteModal
        isOpen={deleteModal.isOpen}
        campaign={deleteModal.campaign}
        onClose={() => setDeleteModal(m => ({ ...m, isOpen: false }))}
        onDeleted={() => {}}
      />

      <ViewModal
        isOpen={viewModal.isOpen}
        campaign={viewModal.campaign}
        onClose={() => setViewModal(m => ({ ...m, isOpen: false }))}
        onEdit={openEdit}
      />
    </>
  )
}
