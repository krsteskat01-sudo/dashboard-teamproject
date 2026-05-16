import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { useForm, Controller } from 'react-hook-form'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Plus, Search, MoreHorizontal, Edit2, Trash2, Eye,
  Activity, MapPin, AlertTriangle, LayoutGrid, List, Map,
  Navigation, Copy, QrCode, ToggleLeft, ToggleRight,
} from 'lucide-react'

import { Card, Button, Input, Select, Badge, Modal, EmptyState, SkeletonLoader } from '../components/ui'
import { useToast } from '../components/ui'
import { useBillboards } from '../hooks/useBillboards'
import { useCampaignsList } from '../hooks/useCampaignsList'
import { createBillboard, updateBillboard, deleteBillboard } from '../firebase/billboards'
import BillboardQR from '../components/shared/BillboardQR'
import BillboardsMap from '../components/shared/BillboardsMap'
import LocationPicker from '../components/shared/LocationPicker'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import './Billboards.css'

// ── Constants ─────────────────────────────────────────────────────────────────

const ACTIVE_OPTIONS = [
  { value: 'all',      label: 'All Status' },
  { value: 'active',   label: 'Active Only' },
  { value: 'inactive', label: 'Inactive Only' },
]

const SORT_OPTIONS = [
  { value: 'newest',    label: 'Newest First' },
  { value: 'oldest',    label: 'Oldest First' },
  { value: 'name',      label: 'Name A–Z' },
  { value: 'mostScans', label: 'Most Scans' },
]

// ── Motion variants ───────────────────────────────────────────────────────────

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
  visible: { opacity: 1, y: 0,  scale: 1,   transition: { duration: 0.3,  ease: 'easeOut' } },
  exit:    { opacity: 0, y: -8, scale: 0.97, transition: { duration: 0.2 } },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tsToDate(ts) {
  if (!ts) return null
  if (ts instanceof Date) return ts
  if (ts?.toDate) return ts.toDate()
  return new Date(ts)
}

function formatTableDate(ts) {
  const d = tsToDate(ts)
  return d ? format(d, 'MMM d, yyyy') : '—'
}

function formatCoords(coords) {
  if (!coords?.lat || !coords?.lng) return null
  return `${Number(coords.lat).toFixed(4)}, ${Number(coords.lng).toFixed(4)}`
}

// ── 3-dot Actions Menu ────────────────────────────────────────────────────────

function ActionsMenu({ onView, onEdit, onQR, onToggle, onDelete, isActive }) {
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
            <button onClick={(e) => { e.stopPropagation(); setOpen(false); onQR() }}>
              <QrCode size={14} /> View QR Code
            </button>
            <button onClick={(e) => { e.stopPropagation(); setOpen(false); onToggle() }}>
              {isActive ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
              {isActive ? 'Set Inactive' : 'Set Active'}
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

// ── Billboard Card ────────────────────────────────────────────────────────────

function BillboardCard({ billboard, campaignMap, onView, onEdit, onQR, onToggle, onDelete, isNew }) {
  const campaign = campaignMap[billboard.campaignId]

  return (
    <motion.div
      layout
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={[
        'billboard-card',
        isNew                ? 'billboard-card--new'      : '',
        !billboard.isActive  ? 'billboard-card--inactive' : '',
      ].filter(Boolean).join(' ')}
      onClick={() => onView(billboard)}
    >
      {/* Status dot */}
      <div className="billboard-card__status-row">
        <span className={`status-dot ${billboard.isActive ? 'status-dot--active' : 'status-dot--inactive'}`} />
        <span className="status-dot-label">{billboard.isActive ? 'Active' : 'Inactive'}</span>
        <ActionsMenu
          onView={() => onView(billboard)}
          onEdit={() => onEdit(billboard)}
          onQR={() => onQR(billboard)}
          onToggle={() => onToggle(billboard)}
          onDelete={() => onDelete(billboard)}
          isActive={billboard.isActive}
        />
      </div>

      {/* QR thumbnail + info row */}
      <div className="billboard-card__body">
        <div
          className="billboard-card__qr-thumb"
          onClick={(e) => { e.stopPropagation(); onQR(billboard) }}
          title="View QR Code"
        >
          <BillboardQR value={billboard.qrCodeUrl} variant="preview" />
        </div>
        <div className="billboard-card__info">
          <h3 className="billboard-card__name">{billboard.locationName}</h3>
          <p className="billboard-card__city">
            <MapPin size={12} />
            {billboard.city || '—'}
          </p>
          {campaign && (
            <span className="billboard-card__campaign">
              <Badge variant="default" size="sm">{campaign.name}</Badge>
            </span>
          )}
        </div>
      </div>

      {/* Stats footer */}
      <div className="billboard-card__footer">
        <span className="billboard-stat">
          <Activity size={12} />
          {(billboard.totalScans ?? 0).toLocaleString()} scans
        </span>
        {billboard.coordinates?.lat && (
          <span className="billboard-stat">
            <Navigation size={12} />
            {formatCoords(billboard.coordinates)}
          </span>
        )}
      </div>
    </motion.div>
  )
}

// ── Skeleton Grid ─────────────────────────────────────────────────────────────

function SkeletonGrid() {
  return (
    <div className="billboards-grid">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="billboard-card billboard-card--skeleton">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <SkeletonLoader variant="rect" width="80px" height="18px" />
            <SkeletonLoader variant="circle" width="28px" height="28px" />
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
            <SkeletonLoader variant="rect" width="80px" height="80px" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              <SkeletonLoader variant="text" width="70%" height="16px" />
              <SkeletonLoader variant="text" width="50%" height="12px" />
              <SkeletonLoader variant="rect" width="80px" height="20px" />
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 'var(--space-2)' }}>
            <SkeletonLoader variant="text" width="100px" height="12px" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Table View ────────────────────────────────────────────────────────────────

function BillboardTable({ billboards, campaignMap, onView, onEdit, onQR, onToggle, onDelete, newId }) {
  return (
    <div className="billboards-table-wrap">
      <table className="billboards-table">
        <thead>
          <tr>
            <th>QR</th>
            <th>Location</th>
            <th>City</th>
            <th>Campaign</th>
            <th>Scans</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence mode="popLayout">
            {billboards.map(b => (
              <motion.tr
                key={b.id}
                layout
                variants={cardVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className={`billboards-table__row ${newId === b.id ? 'billboards-table__row--new' : ''}`}
                onClick={() => onView(b)}
              >
                <td onClick={(e) => { e.stopPropagation(); onQR(b) }} style={{ cursor: 'pointer' }}>
                  <BillboardQR value={b.qrCodeUrl} variant="preview" />
                </td>
                <td className="billboards-table__name">{b.locationName}</td>
                <td>{b.city || '—'}</td>
                <td>{campaignMap[b.campaignId]?.name ?? '—'}</td>
                <td>{(b.totalScans ?? 0).toLocaleString()}</td>
                <td>
                  <span className={`status-dot ${b.isActive ? 'status-dot--active' : 'status-dot--inactive'}`} />
                  {b.isActive ? 'Active' : 'Inactive'}
                </td>
                <td className="billboards-table__actions" onClick={(e) => e.stopPropagation()}>
                  <button className="tbl-icon-btn" title="Edit" onClick={() => onEdit(b)}>
                    <Edit2 size={14} />
                  </button>
                  <button className="tbl-icon-btn" title="Toggle active" onClick={() => onToggle(b)}>
                    {b.isActive ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
                  </button>
                  <button className="tbl-icon-btn tbl-icon-btn--danger" title="Delete" onClick={() => onDelete(b)}>
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

// ── City Autocomplete ─────────────────────────────────────────────────────────

function CityField({ register, watch, setValue, error, existingCities }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const cityValue = watch('city') ?? ''

  const suggestions = useMemo(() => {
    if (!existingCities.length) return []
    const q = cityValue.toLowerCase()
    return existingCities.filter(c =>
      c.toLowerCase().includes(q) && c.toLowerCase() !== q
    ).slice(0, 6)
  }, [cityValue, existingCities])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="city-autocomplete" ref={containerRef}>
      <Input
        label="City"
        placeholder="e.g. Skopje"
        error={error}
        {...register('city', { required: 'City is required' })}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="city-suggestions">
          {suggestions.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => { setValue('city', c, { shouldValidate: true }); setOpen(false) }}
            >
              <MapPin size={12} />
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Billboard Form Modal ──────────────────────────────────────────────────────

function BillboardFormModal({ isOpen, mode, billboard, campaigns, existingCities, onClose, onSaved }) {
  const { showToast } = useToast()
  const [pickedCoords,  setPickedCoords]  = useState(null)
  const [regenWarning, setRegenWarning] = useState(false)

  const {
    register, handleSubmit, control, watch, reset, setValue,
    formState: { errors, isSubmitting },
  } = useForm()

  const watchActive = watch('isActive')

  const campaignOptions = campaigns.map(c => ({ value: c.id, label: c.name }))

  useEffect(() => {
    if (!isOpen) return
    setRegenWarning(false)
    if (mode === 'edit' && billboard) {
      reset({
        campaignId:   billboard.campaignId,
        locationName: billboard.locationName,
        city:         billboard.city,
        isActive:     billboard.isActive ?? true,
      })
      setPickedCoords(
        billboard.coordinates?.lat != null
          ? { lat: billboard.coordinates.lat, lng: billboard.coordinates.lng }
          : null
      )
    } else {
      reset({
        campaignId:   campaigns[0]?.id ?? '',
        locationName: '',
        city:         '',
        isActive:     true,
      })
      setPickedCoords(null)
    }
  }, [isOpen, mode, billboard, campaigns, reset])

  async function handleRegenQR() {
    if (!regenWarning) { setRegenWarning(true); return }

    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin
    const newUrl = `${baseUrl}/scan/${billboard.id}?v=${Date.now()}`
    const result = await updateBillboard(billboard.id, { qrCodeUrl: newUrl }, billboard.campaignId)
    if (result.success) {
      showToast({ variant: 'success', title: 'QR regenerated', message: 'A new QR code URL was generated.' })
      setRegenWarning(false)
    } else {
      showToast({ variant: 'error', title: 'Error', message: result.error })
    }
  }

  async function onSubmit(data) {
    const coordinates = pickedCoords
      ? { lat: Number(pickedCoords.lat), lng: Number(pickedCoords.lng) }
      : null

    const payload = {
      campaignId:   data.campaignId,
      locationName: data.locationName,
      city:         data.city,
      coordinates,
      isActive:     data.isActive,
    }

    const result = mode === 'edit'
      ? await updateBillboard(billboard.id, payload, billboard.campaignId)
      : await createBillboard(payload)

    if (result.success) {
      showToast({
        variant: 'success',
        title:   mode === 'edit' ? 'Billboard updated' : 'Billboard created',
        message: `"${data.locationName}" was ${mode === 'edit' ? 'saved' : 'created'} successfully.`,
      })
      onSaved(result.data)
      onClose()
    } else {
      showToast({ variant: 'error', title: 'Error', message: result.error })
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={mode === 'edit' ? 'Edit Billboard' : 'New Billboard'} size="lg">
      <Modal.Header />
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Modal.Body>
          <div className="form-fields">
            <div className="form-two-col">

              {/* Left column: text fields + status */}
              <div className="form-col">
                <Controller
                  name="campaignId"
                  control={control}
                  rules={{ required: 'Campaign is required' }}
                  render={({ field }) => (
                    <Select
                      label="Campaign"
                      options={campaignOptions}
                      placeholder="Select a campaign"
                      error={errors.campaignId?.message}
                      {...field}
                    />
                  )}
                />

                <Input
                  label="Location Name"
                  placeholder="e.g. City Center Billboard"
                  error={errors.locationName?.message}
                  {...register('locationName', {
                    required:   'Location name is required',
                    minLength:  { value: 3,   message: 'At least 3 characters' },
                    maxLength:  { value: 100, message: 'Max 100 characters' },
                    setValueAs: v => v.trim(),
                  })}
                />

                <CityField
                  register={register}
                  watch={watch}
                  setValue={setValue}
                  error={errors.city?.message}
                  existingCities={existingCities}
                />

                <div className="form-field">
                  <label className="form-label">Status</label>
                  <Controller
                    name="isActive"
                    control={control}
                    render={({ field }) => (
                      <div
                        className={`active-toggle ${field.value ? 'active-toggle--on' : 'active-toggle--off'}`}
                        onClick={() => field.onChange(!field.value)}
                        role="switch"
                        aria-checked={field.value}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') field.onChange(!field.value) }}
                      >
                        <span className="active-toggle__track">
                          <span className="active-toggle__thumb" />
                        </span>
                        <span className="active-toggle__label">
                          {field.value ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    )}
                  />
                </div>
              </div>

              {/* Right column: map picker */}
              <div className="form-col">
                <div className="form-field">
                  <label className="form-label">Location <span className="form-optional">(optional)</span></label>
                  <LocationPicker
                    initialLat={mode === 'edit' ? billboard?.coordinates?.lat : undefined}
                    initialLng={mode === 'edit' ? billboard?.coordinates?.lng : undefined}
                    onLocationChange={setPickedCoords}
                    height={230}
                  />
                </div>
              </div>

            </div>

            {/* Edit-only: QR preview + regen — full width below the grid */}
            {mode === 'edit' && billboard?.qrCodeUrl && (
              <div className="form-field">
                <label className="form-label">QR Code</label>
                <div className="edit-qr-section">
                  <BillboardQR value={billboard.qrCodeUrl} size={120} downloadable label={billboard.locationName} />
                  <div className="edit-qr-regen">
                    {regenWarning && (
                      <div className="form-hint">
                        <AlertTriangle size={13} />
                        This will invalidate the existing QR code. Click again to confirm.
                      </div>
                    )}
                    <Button
                      type="button"
                      variant={regenWarning ? 'danger' : 'secondary'}
                      size="sm"
                      leftIcon={<QrCode size={13} />}
                      onClick={handleRegenQR}
                    >
                      {regenWarning ? 'Confirm Regenerate' : 'Regenerate QR'}
                    </Button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={isSubmitting}>
            {mode === 'edit' ? 'Save Changes' : 'Create Billboard'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}

// ── Delete Modal ──────────────────────────────────────────────────────────────

function DeleteModal({ isOpen, billboard, onClose, onDeleted }) {
  const { showToast } = useToast()
  const [confirmText, setConfirmText] = useState('')
  const [loading,     setLoading]     = useState(false)
  const matched = confirmText === billboard?.locationName

  useEffect(() => {
    if (!isOpen) setConfirmText('')
  }, [isOpen])

  async function handleDelete() {
    if (!matched) return
    setLoading(true)
    const result = await deleteBillboard(billboard.id, billboard)
    setLoading(false)

    if (result.success) {
      showToast({ variant: 'success', title: 'Deleted', message: `"${billboard.locationName}" was deleted.` })
      onDeleted()
      onClose()
    } else {
      showToast({ variant: 'error', title: 'Cannot delete', message: result.error })
    }
  }

  const hasScans = (billboard?.totalScans ?? 0) > 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Billboard" size="sm">
      <Modal.Header />
      <Modal.Body>
        <div className="delete-modal-body">
          <div className="delete-modal-icon">
            <AlertTriangle size={28} />
          </div>
          <p className="delete-modal-text">
            Permanently delete <strong>"{billboard?.locationName}"</strong>? This cannot be undone.
          </p>

          {hasScans && (
            <div className="delete-modal-warning">
              <AlertTriangle size={14} />
              This billboard has {billboard.totalScans} scan{billboard.totalScans > 1 ? 's' : ''}.
              All scan data would be permanently lost.
            </div>
          )}

          {!hasScans && (
            <div className="delete-modal-confirm">
              <label className="form-label">Type <strong>{billboard?.locationName}</strong> to confirm</label>
              <input
                className="delete-confirm-input"
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder={billboard?.locationName}
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
          disabled={hasScans || !matched}
          onClick={handleDelete}
        >
          Delete
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

// ── QR Preview Modal ──────────────────────────────────────────────────────────

function QRPreviewModal({ isOpen, billboard, onClose }) {
  const { showToast } = useToast()

  async function handleCopy() {
    if (!billboard?.qrCodeUrl) return
    try {
      await navigator.clipboard.writeText(billboard.qrCodeUrl)
      showToast({ variant: 'success', title: 'Copied', message: 'Scan URL copied to clipboard.' })
    } catch {
      showToast({ variant: 'error', title: 'Error', message: 'Could not copy to clipboard.' })
    }
  }

  if (!billboard) return null

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="QR Code" size="sm">
      <Modal.Header />
      <Modal.Body>
        <div className="qr-preview-body">
          <BillboardQR
            value={billboard.qrCodeUrl}
            size={280}
            variant="large"
            downloadable
            label={billboard.locationName}
          />
          <div className="qr-preview-meta">
            <p className="qr-preview-name">{billboard.locationName}</p>
            <p className="qr-preview-city">
              <MapPin size={12} /> {billboard.city}
            </p>
            {billboard.coordinates?.lat && (
              <p className="qr-preview-coords">
                <Navigation size={12} />
                {formatCoords(billboard.coordinates)}
              </p>
            )}
            <p className="qr-preview-url">{billboard.qrCodeUrl}</p>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" leftIcon={<Copy size={14} />} onClick={handleCopy}>
          Copy Scan URL
        </Button>
        <Button onClick={onClose}>Close</Button>
      </Modal.Footer>
    </Modal>
  )
}

// ── View Details Modal ────────────────────────────────────────────────────────

function ViewModal({ isOpen, billboard, campaignMap, onClose, onEdit, onQR, onDelete }) {
  if (!billboard) return null

  const campaign  = campaignMap[billboard.campaignId]
  const createdAt = tsToDate(billboard.createdAt)
  const updatedAt = tsToDate(billboard.updatedAt)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={billboard.locationName} size="lg">
      <Modal.Header>
        <span className={`status-dot ${billboard.isActive ? 'status-dot--active' : 'status-dot--inactive'}`} />
        <Badge variant={billboard.isActive ? 'success' : 'default'} size="sm">
          {billboard.isActive ? 'Active' : 'Inactive'}
        </Badge>
      </Modal.Header>
      <Modal.Body>
        <div className="view-layout">
          {/* Left: QR */}
          <div className="view-qr-col">
            <BillboardQR
              value={billboard.qrCodeUrl}
              size={200}
              variant="default"
              downloadable
              label={billboard.locationName}
            />
          </div>

          {/* Right: details */}
          <div className="view-info-col">
            <div className="view-stats-grid">
              <div className="view-stat">
                <Activity size={18} className="view-stat__icon" />
                <span className="view-stat__value">{(billboard.totalScans ?? 0).toLocaleString()}</span>
                <span className="view-stat__label">Total Scans</span>
              </div>
              <div className="view-stat">
                <MapPin size={18} className="view-stat__icon" />
                <span className="view-stat__value" style={{ fontSize: 14 }}>{billboard.city || '—'}</span>
                <span className="view-stat__label">City</span>
              </div>
            </div>

            <div className="view-detail-rows">
              {campaign && (
                <div className="view-detail-row">
                  <span className="view-detail-label">Campaign</span>
                  <Badge variant="default" size="sm">{campaign.name}</Badge>
                </div>
              )}
              {billboard.coordinates?.lat && (
                <div className="view-detail-row">
                  <span className="view-detail-label">Coordinates</span>
                  <span className="view-detail-value">
                    {formatCoords(billboard.coordinates)}
                  </span>
                </div>
              )}
              {createdAt && (
                <div className="view-detail-row">
                  <span className="view-detail-label">Created</span>
                  <span className="view-detail-value">
                    {format(createdAt, 'MMM d, yyyy')}
                    {' · '}
                    {formatDistanceToNow(createdAt, { addSuffix: true })}
                  </span>
                </div>
              )}
              {updatedAt && updatedAt.getTime() !== createdAt?.getTime() && (
                <div className="view-detail-row">
                  <span className="view-detail-label">Updated</span>
                  <span className="view-detail-value">{formatDistanceToNow(updatedAt, { addSuffix: true })}</span>
                </div>
              )}
              <div className="view-detail-row">
                <span className="view-detail-label">Scan URL</span>
                <span className="view-detail-value view-detail-url">{billboard.qrCodeUrl}</span>
              </div>
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button variant="ghost" leftIcon={<QrCode size={14} />} onClick={() => { onClose(); onQR(billboard) }}>
          QR Code
        </Button>
        <Button variant="danger" leftIcon={<Trash2 size={14} />} onClick={() => { onClose(); onDelete(billboard) }}>
          Delete
        </Button>
        <Button leftIcon={<Edit2 size={14} />} onClick={() => { onClose(); onEdit(billboard) }}>
          Edit
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function Billboards() {
  useDocumentTitle('Billboards')
  const { billboards, loading, error, filters, setFilters } = useBillboards()
  const { campaigns }                                        = useCampaignsList()
  const { showToast }                                        = useToast()

  const [view,      setView]     = useState('grid')
  const [newId,     setNewId]    = useState(null)
  const [searchKey, setSearchKey] = useState(0)

  const [formModal,      setFormModal]      = useState({ isOpen: false, mode: 'create', billboard: null })
  const [deleteModal,    setDeleteModal]    = useState({ isOpen: false, billboard: null })
  const [viewModal,      setViewModal]      = useState({ isOpen: false, billboard: null })
  const [qrPreviewModal, setQRPreviewModal] = useState({ isOpen: false, billboard: null })

  // Debounce search input
  const searchRef   = useRef('')
  const debounceRef = useRef(null)

  function handleSearchChange(e) {
    searchRef.current = e.target.value
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setFilters(f => ({ ...f, search: searchRef.current }))
    }, 300)
  }

  // Clear glow after 2s
  useEffect(() => {
    if (!newId) return
    const t = setTimeout(() => setNewId(null), 2000)
    return () => clearTimeout(t)
  }, [newId])

  // Build campaign lookup map for cards
  const campaignMap = useMemo(() => {
    return campaigns.reduce((acc, c) => { acc[c.id] = c; return acc }, {})
  }, [campaigns])

  // Campaign filter options including "All Campaigns"
  const campaignFilterOptions = useMemo(() => [
    { value: '', label: 'All Campaigns' },
    ...campaigns.map(c => ({ value: c.id, label: c.name })),
  ], [campaigns])

  // Unique cities from billboard data
  const existingCities = useMemo(() =>
    [...new Set(billboards.map(b => b.city).filter(Boolean))].sort(),
    [billboards]
  )

  const cityFilterOptions = useMemo(() => [
    { value: 'all', label: 'All Cities' },
    ...existingCities.map(c => ({ value: c, label: c })),
  ], [existingCities])

  const hasData    = billboards.length > 0
  const isFiltered = filters.campaignId || filters.city !== 'all' ||
                     filters.isActive !== 'all' || filters.search

  function openCreate() { setFormModal({ isOpen: true, mode: 'create', billboard: null }) }
  function openEdit(b)  { setFormModal({ isOpen: true, mode: 'edit',   billboard: b }) }
  function openDelete(b) { setDeleteModal({ isOpen: true, billboard: b }) }
  function openView(b)  { setViewModal({ isOpen: true, billboard: b }) }
  function openQR(b)    { setQRPreviewModal({ isOpen: true, billboard: b }) }

  function handleSaved(data) {
    if (data?.id) setNewId(data.id)
  }

  function clearFilters() {
    setFilters(f => ({ ...f, campaignId: '', city: 'all', isActive: 'all', search: '' }))
    searchRef.current = ''
    setSearchKey(k => k + 1)
  }

  async function handleToggle(billboard) {
    const next = !billboard.isActive
    const result = await updateBillboard(billboard.id, { isActive: next }, billboard.campaignId)
    if (result.success) {
      showToast({
        variant: 'success',
        title:   next ? 'Billboard activated' : 'Billboard deactivated',
        message: `"${billboard.locationName}" is now ${next ? 'active' : 'inactive'}.`,
      })
    } else {
      showToast({ variant: 'error', title: 'Error', message: result.error })
    }
  }

  function renderContent() {
    if (loading) return <SkeletonGrid />

    if (!hasData && !isFiltered) {
      return (
        <EmptyState
          icon={<MapPin />}
          title="No billboards yet"
          description="Add your first billboard to start generating QR codes and tracking scans."
          action={{ label: 'Add Billboard', onClick: openCreate }}
        />
      )
    }

    if (!hasData && isFiltered) {
      return (
        <EmptyState
          icon={<Search />}
          title="No matches"
          description="No billboards match your current filters."
          action={{ label: 'Clear Filters', onClick: clearFilters, variant: 'secondary' }}
        />
      )
    }

    if (view === 'map') {
      return (
        <div className="billboards-map-view">
          <BillboardsMap
            billboards={billboards}
            height={560}
            onMarkerClick={openView}
          />
        </div>
      )
    }

    if (view === 'table') {
      return (
        <BillboardTable
          billboards={billboards}
          campaignMap={campaignMap}
          onView={openView}
          onEdit={openEdit}
          onQR={openQR}
          onToggle={handleToggle}
          onDelete={openDelete}
          newId={newId}
        />
      )
    }

    return (
      <LayoutGroup>
        <div className="billboards-grid">
          <AnimatePresence mode="popLayout">
            {billboards.map(b => (
              <BillboardCard
                key={b.id}
                billboard={b}
                campaignMap={campaignMap}
                onView={openView}
                onEdit={openEdit}
                onQR={openQR}
                onToggle={handleToggle}
                onDelete={openDelete}
                isNew={newId === b.id}
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
        className="billboards-page"
        variants={pageVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div className="billboards-header" variants={fadeUp}>
          <div>
            <h1 className="billboards-title">Billboards</h1>
            <p className="billboards-subtitle">Manage billboard locations and QR code tracking</p>
          </div>
          <Button leftIcon={<Plus size={16} />} onClick={openCreate}>
            Add Billboard
          </Button>
        </motion.div>

        {/* Filter bar */}
        <motion.div variants={fadeUp}>
          <Card padding="sm" className="billboards-filters">
            <div className="filters-left">
              <Input
                key={searchKey}
                placeholder="Search billboards…"
                leftIcon={<Search size={15} />}
                defaultValue=""
                onChange={handleSearchChange}
                className="filters-search"
              />
              <Select
                options={campaignFilterOptions}
                value={filters.campaignId}
                onChange={e => setFilters(f => ({ ...f, campaignId: e.target.value }))}
                className="filters-select"
              />
              <Select
                options={cityFilterOptions}
                value={filters.city}
                onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
                className="filters-select"
              />
              <Select
                options={ACTIVE_OPTIONS}
                value={filters.isActive}
                onChange={e => setFilters(f => ({ ...f, isActive: e.target.value }))}
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
              <button
                className={`view-btn ${view === 'map' ? 'view-btn--active' : ''}`}
                onClick={() => setView('map')}
                aria-pressed={view === 'map'}
                title="Map view"
              >
                <Map size={16} />
              </button>
            </div>
          </Card>
        </motion.div>

        {/* Error banner */}
        {error && (
          <motion.div className="billboards-error" variants={fadeUp}>
            <AlertTriangle size={16} /> {error}
          </motion.div>
        )}

        {/* Content */}
        <motion.div variants={fadeUp}>
          {renderContent()}
        </motion.div>
      </motion.div>

      {/* Modals */}
      <BillboardFormModal
        isOpen={formModal.isOpen}
        mode={formModal.mode}
        billboard={formModal.billboard}
        campaigns={campaigns}
        existingCities={existingCities}
        onClose={() => setFormModal(m => ({ ...m, isOpen: false }))}
        onSaved={handleSaved}
      />

      <DeleteModal
        isOpen={deleteModal.isOpen}
        billboard={deleteModal.billboard}
        onClose={() => setDeleteModal(m => ({ ...m, isOpen: false }))}
        onDeleted={() => {}}
      />

      <ViewModal
        isOpen={viewModal.isOpen}
        billboard={viewModal.billboard}
        campaignMap={campaignMap}
        onClose={() => setViewModal(m => ({ ...m, isOpen: false }))}
        onEdit={openEdit}
        onQR={openQR}
        onDelete={openDelete}
      />

      <QRPreviewModal
        isOpen={qrPreviewModal.isOpen}
        billboard={qrPreviewModal.billboard}
        onClose={() => setQRPreviewModal(m => ({ ...m, isOpen: false }))}
      />
    </>
  )
}
