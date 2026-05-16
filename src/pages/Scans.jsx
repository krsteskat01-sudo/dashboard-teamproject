import { useState, useEffect, useRef, memo, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity, Smartphone, Tablet, Monitor,
  Trash2, Clock, BarChart2, AlertCircle, X,
} from 'lucide-react'
import {
  formatDistanceToNow, format, startOfDay, startOfHour,
} from 'date-fns'
import {
  Card, Badge, Modal, Button, Select, EmptyState, SkeletonLoader, useToast,
} from '../components/ui'
import { useLiveScans }       from '../hooks/useLiveScans'
import { useCampaignsList }   from '../hooks/useCampaignsList'
import { deleteScan }         from '../firebase/scans'
import { useDocumentTitle }   from '../hooks/useDocumentTitle'
import './Scans.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

function tsToDate(ts) {
  if (!ts) return null
  if (ts instanceof Date) return ts
  if (typeof ts.toDate === 'function') return ts.toDate()
  return new Date(ts)
}

function tsToMs(ts) {
  const d = tsToDate(ts)
  return d ? d.getTime() : 0
}

function relTime(ts) {
  const d = tsToDate(ts)
  return d ? formatDistanceToNow(d, { addSuffix: true }) : '—'
}

function fullTime(ts) {
  const d = tsToDate(ts)
  return d ? format(d, 'MMM d, yyyy · HH:mm:ss') : '—'
}

// ── Live indicator ────────────────────────────────────────────────────────────

function LiveIndicator() {
  return (
    <div className="live-indicator">
      <span className="live-dot" />
      <span className="live-label">LIVE</span>
    </div>
  )
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatCard({ icon, title, value, sub }) {
  return (
    <div className="scan-stat-card">
      <div className="scan-stat-icon">{icon}</div>
      <div className="scan-stat-body">
        <span className="scan-stat-value">{value}</span>
        <span className="scan-stat-title">{title}</span>
        {sub !== undefined && <span className="scan-stat-sub">{sub}</span>}
      </div>
    </div>
  )
}

// Isolated 1-second ticker — only this tiny component re-renders every second
function LastScanTicker({ scan }) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <span className="scan-stat-value">
      {scan ? relTime(scan.timestamp) : '—'}
    </span>
  )
}

// ── Device & Platform ─────────────────────────────────────────────────────────

const DEVICE_ICONS = {
  mobile:  <Smartphone size={13} />,
  tablet:  <Tablet     size={13} />,
  desktop: <Monitor    size={13} />,
}

function DeviceCell({ device }) {
  return (
    <span className="device-cell">
      {DEVICE_ICONS[device] ?? <Monitor size={13} />}
      <span>{device ?? 'desktop'}</span>
    </span>
  )
}

const PLATFORM_MAP = {
  instagram: { label: 'Instagram', variant: 'warning' },
  tiktok:    { label: 'TikTok',    variant: 'danger'  },
  facebook:  { label: 'Facebook',  variant: 'primary' },
  twitter:   { label: 'Twitter',   variant: 'info'    },
  web:       { label: 'Web',       variant: 'default' },
}

function PlatformBadge({ platform }) {
  const cfg = PLATFORM_MAP[platform] ?? { label: platform || 'Web', variant: 'default' }
  return <Badge variant={cfg.variant} size="sm">{cfg.label}</Badge>
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonRows() {
  return Array.from({ length: 7 }).map((_, i) => (
    <tr key={i} className="scan-skeleton-row">
      <td><SkeletonLoader variant="text" height="13px" width="70px" /></td>
      <td><SkeletonLoader variant="text" height="13px" width="110px" /></td>
      <td><SkeletonLoader variant="text" height="13px" width="90px" /></td>
      <td><SkeletonLoader variant="text" height="13px" width="70px" /></td>
      <td><SkeletonLoader variant="text" height="13px" width="70px" /></td>
      <td />
    </tr>
  ))
}

// ── Scan row (memoised) ───────────────────────────────────────────────────────

const ScanRow = memo(function ScanRow({ scan, isNew, onView, onDelete }) {
  const campaignVariant =
    scan.campaignStatus === 'active'  ? 'success'  :
    scan.campaignStatus === 'paused'  ? 'warning'  : 'default'

  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1,  y: 0   }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.18 } }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className={['scan-row', isNew ? 'scan-row--new' : ''].filter(Boolean).join(' ')}
      onClick={() => onView(scan)}
    >
      <td className="scan-cell scan-cell--time">
        <span title={fullTime(scan.timestamp)} className="scan-rel-time">
          {relTime(scan.timestamp)}
        </span>
      </td>

      <td className="scan-cell scan-cell--billboard">
        {scan.billboardName}
        {scan.billboardCity && (
          <span className="scan-city">{scan.billboardCity}</span>
        )}
      </td>

      <td className="scan-cell">
        {scan.campaignName !== '—'
          ? <Badge variant={campaignVariant} size="sm">{scan.campaignName}</Badge>
          : <span className="scan-muted">—</span>
        }
      </td>

      <td className="scan-cell">
        <DeviceCell device={scan.device} />
      </td>

      <td className="scan-cell">
        <PlatformBadge platform={scan.platform} />
      </td>

      <td
        className="scan-cell scan-cell--actions"
        onClick={e => { e.stopPropagation(); onDelete(scan) }}
      >
        <button className="scan-del-btn" title="Delete scan">
          <Trash2 size={14} />
        </button>
      </td>
    </motion.tr>
  )
})

// ── Scan detail modal ─────────────────────────────────────────────────────────

function DetailRow({ label, children }) {
  return (
    <div className="sd-row">
      <span className="sd-label">{label}</span>
      <span className="sd-value">{children}</span>
    </div>
  )
}

function ScanDetailModal({ scan, onClose, onDeleteConfirm, deleting }) {
  const [confirming, setConfirming] = useState(false)

  useEffect(() => { if (!scan) setConfirming(false) }, [scan])

  const campaignVariant =
    scan?.campaignStatus === 'active' ? 'success' :
    scan?.campaignStatus === 'paused' ? 'warning' : 'default'

  return (
    <Modal isOpen={!!scan} onClose={onClose} title="Scan Details" size="sm">
      <Modal.Header />
      <Modal.Body>
        {scan && (
          <div className="sd-rows">
            <DetailRow label="Time">{fullTime(scan.timestamp)}</DetailRow>

            <DetailRow label="Billboard">
              <span>{scan.billboardName}</span>
              {scan.billboardCity && (
                <span className="sd-sub">{scan.billboardCity}</span>
              )}
            </DetailRow>

            <DetailRow label="Campaign">
              {scan.campaignName !== '—'
                ? <Badge variant={campaignVariant} size="sm">{scan.campaignName}</Badge>
                : '—'
              }
            </DetailRow>

            <DetailRow label="Device">
              <DeviceCell device={scan.device} />
            </DetailRow>

            <DetailRow label="Platform">
              <PlatformBadge platform={scan.platform} />
            </DetailRow>

            {scan.referrer && (
              <DetailRow label="Referrer">
                <span className="sd-mono">{scan.referrer}</span>
              </DetailRow>
            )}

            {scan.userAgent && (
              <DetailRow label="User Agent">
                <span className="sd-mono sd-ua">{scan.userAgent}</span>
              </DetailRow>
            )}
          </div>
        )}

        {confirming && (
          <div className="sd-confirm-warn">
            <AlertCircle size={15} />
            <span>This will permanently delete this scan record.</span>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        {!confirming ? (
          <>
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button variant="danger" onClick={() => setConfirming(true)}>
              Delete Scan
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={() => onDeleteConfirm(scan.id)}
            >
              Confirm Delete
            </Button>
          </>
        )}
      </Modal.Footer>
    </Modal>
  )
}

// ── Filter options ────────────────────────────────────────────────────────────

const DEVICE_OPTS = [
  { value: 'all',     label: 'All Devices' },
  { value: 'mobile',  label: 'Mobile'      },
  { value: 'tablet',  label: 'Tablet'      },
  { value: 'desktop', label: 'Desktop'     },
]

const PLATFORM_OPTS = [
  { value: 'all',       label: 'All Platforms' },
  { value: 'web',       label: 'Web'           },
  { value: 'instagram', label: 'Instagram'     },
  { value: 'tiktok',    label: 'TikTok'        },
  { value: 'facebook',  label: 'Facebook'      },
  { value: 'twitter',   label: 'Twitter'       },
]

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Scans() {
  useDocumentTitle('Scans')
  const { scans, loading, error, filters, setFilters } = useLiveScans()
  const { campaigns } = useCampaignsList()
  const { showToast } = useToast()

  const [selectedScan, setSelectedScan] = useState(null)
  const [deleting,     setDeleting]     = useState(false)

  // Track which scan IDs are "new" (just arrived) for the flash animation
  const seenIdsRef         = useRef(new Set())
  const [newIds, setNewIds] = useState(new Set())

  useEffect(() => {
    const fresh = scans.filter(s => !seenIdsRef.current.has(s.id))
    fresh.forEach(s => seenIdsRef.current.add(s.id))
    if (fresh.length > 0) {
      const ids = new Set(fresh.map(s => s.id))
      setNewIds(ids)
      const t = setTimeout(() => setNewIds(new Set()), 1500)
      return () => clearTimeout(t)
    }
  }, [scans])

  // 60-second tick forces relative-time recalculation in rows without heavy re-renders
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(n => n + 1), 60_000)
    return () => clearInterval(id)
  }, [])

  // Stats
  const todayStart = startOfDay(new Date()).getTime()
  const hourStart  = startOfHour(new Date()).getTime()

  const todayCount = useMemo(
    () => scans.filter(s => tsToMs(s.timestamp) >= todayStart).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scans, tick],
  )
  const hourCount = useMemo(
    () => scans.filter(s => tsToMs(s.timestamp) >= hourStart).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scans, tick],
  )

  const campaignOpts = useMemo(() => [
    { value: '', label: 'All Campaigns' },
    ...campaigns.map(c => ({ value: c.id, label: c.name })),
  ], [campaigns])

  const hasFilters = !!(
    filters.campaignId ||
    filters.device   !== 'all' ||
    filters.platform !== 'all'
  )

  function clearFilters() {
    setFilters({ campaignId: '', device: 'all', platform: 'all' })
  }

  async function handleDeleteConfirm(id) {
    setDeleting(true)
    const result = await deleteScan(id)
    setDeleting(false)
    if (result.success) {
      showToast({ variant: 'success', title: 'Scan deleted' })
      setSelectedScan(null)
    } else {
      showToast({ variant: 'error', title: 'Delete failed', message: result.error })
    }
  }

  return (
    <div className="scans-page">

      {/* ── Header ── */}
      <div className="scans-header">
        <div>
          <h1 className="scans-title">Live Scans</h1>
          <p className="scans-subtitle">Real-time scan activity</p>
        </div>
        <div className="scans-header-right">
          <LiveIndicator />
          <Badge variant="info">{scans.length} scan{scans.length !== 1 ? 's' : ''}</Badge>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div className="scans-stats">
        <StatCard
          icon={<BarChart2 size={20} />}
          title="Scans Today"
          value={loading ? '—' : todayCount}
          sub={!loading && `${scans.length} in last 24 h`}
        />
        <StatCard
          icon={<Clock size={20} />}
          title="Scans This Hour"
          value={loading ? '—' : hourCount}
        />
        <div className="scan-stat-card">
          <div className="scan-stat-icon"><Activity size={20} /></div>
          <div className="scan-stat-body">
            <LastScanTicker scan={scans[0]} />
            <span className="scan-stat-title">Last Scan</span>
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <Card padding="sm">
        <div className="scans-filters">
          <div className="scans-filters-left">
            <Select
              options={campaignOpts}
              value={filters.campaignId}
              onChange={e => setFilters(f => ({ ...f, campaignId: e.target.value }))}
              fullWidth={false}
              className="scan-filter-sel"
            />
            <Select
              options={DEVICE_OPTS}
              value={filters.device}
              onChange={e => setFilters(f => ({ ...f, device: e.target.value }))}
              fullWidth={false}
              className="scan-filter-sel"
            />
            <Select
              options={PLATFORM_OPTS}
              value={filters.platform}
              onChange={e => setFilters(f => ({ ...f, platform: e.target.value }))}
              fullWidth={false}
              className="scan-filter-sel"
            />
          </div>
          {hasFilters && (
            <button className="scan-clear-btn" onClick={clearFilters}>
              <X size={13} />
              Clear
            </button>
          )}
        </div>
      </Card>

      {/* ── Error ── */}
      {error && (
        <div className="scans-error">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* ── Live feed ── */}
      <Card padding="none">
        <div className="scans-table-wrap">
          <table className="scans-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Billboard</th>
                <th>Campaign</th>
                <th>Device</th>
                <th>Platform</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : scans.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState
                      icon={<Activity />}
                      title={hasFilters ? 'No scans match your filters' : 'No scans yet'}
                      description={
                        hasFilters
                          ? 'Try adjusting or clearing your filters.'
                          : 'Scans will appear here in real-time when QR codes are scanned.'
                      }
                      action={hasFilters
                        ? { label: 'Clear Filters', onClick: clearFilters, variant: 'secondary' }
                        : undefined
                      }
                      size="sm"
                    />
                  </td>
                </tr>
              ) : (
                <AnimatePresence initial={false} mode="popLayout">
                  {scans.map(scan => (
                    <ScanRow
                      key={scan.id}
                      scan={scan}
                      isNew={newIds.has(scan.id)}
                      tick={tick}
                      onView={setSelectedScan}
                      onDelete={setSelectedScan}
                    />
                  ))}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {!loading && scans.length > 0 && (
          <div className="scans-table-footer">
            Showing {scans.length} scan{scans.length !== 1 ? 's' : ''} from the last 24 hours
          </div>
        )}
      </Card>

      {/* ── Detail modal ── */}
      <ScanDetailModal
        scan={selectedScan}
        onClose={() => setSelectedScan(null)}
        onDeleteConfirm={handleDeleteConfirm}
        deleting={deleting}
      />
    </div>
  )
}
