import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import {
  FileText, Download, Search,
  Smartphone, Tablet, Monitor, Calendar,
  AlertTriangle, RefreshCw,
} from 'lucide-react'
import { useAnalytics }     from '../hooks/useAnalytics'
import { useCampaignsList } from '../hooks/useCampaignsList'
import { useBillboards }    from '../hooks/useBillboards'
import {
  Card, Button, Input, Select, Badge, EmptyState, SkeletonLoader,
} from '../components/ui'
import { useToast }         from '../components/ui'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { exportToCsv }      from '../utils/exportCsv'
import './Reports.css'

// ── Motion variants ───────────────────────────────────────────────────────────

const pageVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07 } },
}

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESET_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: '7d',    label: 'Last 7 days' },
  { value: '30d',   label: 'Last 30 days' },
  { value: '90d',   label: 'Last 90 days' },
  { value: '1y',    label: 'Last year' },
]

const PLATFORM_OPTIONS = [
  { value: '',          label: 'All Platforms' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok',    label: 'TikTok' },
  { value: 'web',       label: 'Web' },
  { value: 'other',     label: 'Other' },
]

const DEVICE_OPTIONS = [
  { value: '',        label: 'All Devices' },
  { value: 'mobile',  label: 'Mobile' },
  { value: 'tablet',  label: 'Tablet' },
  { value: 'desktop', label: 'Desktop' },
]

const PLATFORM_CFG = {
  instagram: { label: 'Instagram', color: '#E4405F' },
  tiktok:    { label: 'TikTok',    color: '#FF0050' },
  web:       { label: 'Web',       color: '#2F64FF' },
  other:     { label: 'Other',     color: '#94A3B8' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tsToDate(ts) {
  if (!ts) return null
  if (ts instanceof Date) return ts
  if (typeof ts.toDate === 'function') return ts.toDate()
  return new Date(ts)
}

function formatTs(ts) {
  const d = tsToDate(ts)
  return d ? format(d, 'MMM d, yyyy · HH:mm') : '—'
}

function DeviceIcon({ device }) {
  const map = { mobile: Smartphone, tablet: Tablet, desktop: Monitor }
  const Icon = map[device] ?? Smartphone
  return <Icon size={14} />
}

// ── Summary stat ─────────────────────────────────────────────────────────────

function SummaryStat({ label, value, sub }) {
  return (
    <div className="report-stat">
      <span className="report-stat__value">{value}</span>
      <span className="report-stat__label">{label}</span>
      {sub && <span className="report-stat__sub">{sub}</span>}
    </div>
  )
}

// ── Skeleton table ────────────────────────────────────────────────────────────

function SkeletonTable() {
  return (
    <div className="report-table-wrap">
      <table className="report-table">
        <thead>
          <tr>
            {['Time', 'Billboard', 'Campaign', 'City', 'Platform', 'Device'].map(h => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }).map((_, i) => (
            <tr key={i}>
              {Array.from({ length: 6 }).map((__, j) => (
                <td key={j}><SkeletonLoader variant="text" width="80%" height="13px" /></td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Reports() {
  useDocumentTitle('Reports')
  const { showToast } = useToast()

  // Client-side filters
  const [platformFilter, setPlatformFilter] = useState('')
  const [deviceFilter,   setDeviceFilter]   = useState('')
  const [campaignFilter, setCampaignFilter] = useState('')
  const [search,         setSearch]         = useState('')

  // useAnalytics owns the preset state
  const {
    preset, setPreset,
    scans, overview, range,
    loading, error, reload,
  } = useAnalytics()

  const { campaigns }  = useCampaignsList()
  const { billboards } = useBillboards()

  // Lookup maps
  const billboardMap = useMemo(() =>
    billboards.reduce((acc, b) => { acc[b.id] = b; return acc }, {}),
    [billboards]
  )
  const campaignMap = useMemo(() =>
    campaigns.reduce((acc, c) => { acc[c.id] = c; return acc }, {}),
    [campaigns]
  )
  const campaignOptions = useMemo(() => [
    { value: '', label: 'All Campaigns' },
    ...campaigns.map(c => ({ value: c.id, label: c.name })),
  ], [campaigns])

  // Filter scans client-side
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return scans.filter(s => {
      const bb = billboardMap[s.billboardId]
      if (platformFilter && s.platform !== platformFilter)    return false
      if (deviceFilter   && s.device   !== deviceFilter)      return false
      if (campaignFilter && bb?.campaignId !== campaignFilter) return false
      if (q) {
        const hay = [
          bb?.locationName, bb?.city,
          campaignMap[bb?.campaignId]?.name,
          s.platform, s.device,
        ].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [scans, platformFilter, deviceFilter, campaignFilter, search, billboardMap, campaignMap])

  // Derived stats from filtered set
  const filteredStats = useMemo(() => {
    const platforms = {}
    const devices   = {}
    filtered.forEach(s => {
      const p = s.platform ?? 'other'
      const d = s.device   ?? 'other'
      platforms[p] = (platforms[p] ?? 0) + 1
      devices[d]   = (devices[d]   ?? 0) + 1
    })
    const topPlatform = Object.entries(platforms).sort((a, b) => b[1] - a[1])[0]
    const topDevice   = Object.entries(devices).sort((a, b) => b[1] - a[1])[0]
    return { total: filtered.length, topPlatform, topDevice }
  }, [filtered])

  const hasFilters = platformFilter || deviceFilter || campaignFilter || search

  function clearFilters() {
    setPlatformFilter('')
    setDeviceFilter('')
    setCampaignFilter('')
    setSearch('')
  }

  function handleExport() {
    if (!filtered.length) {
      showToast({ variant: 'warning', title: 'Nothing to export', message: 'No scans match the current filters.' })
      return
    }
    const rows = filtered.map(s => {
      const bb = billboardMap[s.billboardId]
      const d  = tsToDate(s.timestamp)
      return {
        'Timestamp':  d ? format(d, 'yyyy-MM-dd HH:mm:ss') : '',
        'Billboard':  bb?.locationName ?? s.billboardId ?? '',
        'City':       bb?.city ?? '',
        'Campaign':   campaignMap[bb?.campaignId]?.name ?? '',
        'Platform':   s.platform ?? '',
        'Device':     s.device   ?? '',
        'User Agent': s.userAgent ?? '',
      }
    })
    const filename = `scans-report-${format(new Date(), 'yyyy-MM-dd')}.csv`
    exportToCsv(filename, rows)
    showToast({
      variant: 'success',
      title:   'Export complete',
      message: `${rows.length} scans exported to ${filename}`,
    })
  }

  return (
    <motion.div
      className="reports-page"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <motion.div className="reports-header" variants={fadeUp}>
        <div>
          <h1 className="reports-title">Reports</h1>
          <p className="reports-subtitle">Scan history, filters, and CSV export</p>
        </div>
        <div className="reports-header-actions">
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<RefreshCw size={14} />}
            onClick={reload}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            size="sm"
            leftIcon={<Download size={14} />}
            onClick={handleExport}
            disabled={loading || !filtered.length}
          >
            Export CSV
          </Button>
        </div>
      </motion.div>

      {/* ── Filters ────────────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <Card padding="sm" className="reports-filters">
          <div className="reports-filters__row">
            <Select
              options={PRESET_OPTIONS}
              value={preset}
              onChange={e => setPreset(e.target.value)}
              className="filters-select"
            />
            <Select
              options={campaignOptions}
              value={campaignFilter}
              onChange={e => setCampaignFilter(e.target.value)}
              className="filters-select"
            />
            <Select
              options={PLATFORM_OPTIONS}
              value={platformFilter}
              onChange={e => setPlatformFilter(e.target.value)}
              className="filters-select"
            />
            <Select
              options={DEVICE_OPTIONS}
              value={deviceFilter}
              onChange={e => setDeviceFilter(e.target.value)}
              className="filters-select"
            />
            <Input
              placeholder="Search billboard, city, campaign…"
              leftIcon={<Search size={14} />}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="filters-search"
            />
            {hasFilters && (
              <button className="reports-clear-btn" onClick={clearFilters}>
                Clear
              </button>
            )}
          </div>
        </Card>
      </motion.div>

      {/* ── Summary stats ──────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <Card padding="md" className="reports-summary">
          {loading ? (
            <div className="reports-summary__skels">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="report-stat">
                  <SkeletonLoader variant="text" width="60px" height="28px" />
                  <SkeletonLoader variant="text" width="80px" height="12px" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <SummaryStat
                label="Total scans"
                value={filteredStats.total.toLocaleString()}
                sub={`in selected range`}
              />
              <div className="reports-summary__divider" />
              <SummaryStat
                label="Top platform"
                value={
                  filteredStats.topPlatform
                    ? (PLATFORM_CFG[filteredStats.topPlatform[0]]?.label ?? filteredStats.topPlatform[0])
                    : '—'
                }
                sub={filteredStats.topPlatform ? `${filteredStats.topPlatform[1]} scans` : undefined}
              />
              <div className="reports-summary__divider" />
              <SummaryStat
                label="Top device"
                value={
                  filteredStats.topDevice
                    ? filteredStats.topDevice[0].charAt(0).toUpperCase() + filteredStats.topDevice[0].slice(1)
                    : '—'
                }
                sub={filteredStats.topDevice ? `${filteredStats.topDevice[1]} scans` : undefined}
              />
              <div className="reports-summary__divider" />
              <SummaryStat
                label="Date range"
                value={`${format(range.start, 'MMM d')} – ${format(range.end, 'MMM d')}`}
                sub={String(range.end.getFullYear())}
              />
            </>
          )}
        </Card>
      </motion.div>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && (
        <motion.div className="reports-error" variants={fadeUp}>
          <AlertTriangle size={15} />
          {error}
        </motion.div>
      )}

      {/* ── Scan table ─────────────────────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <Card padding="none" className="reports-table-card">
          <div className="reports-table-header">
            <div className="reports-table-title">
              <FileText size={16} />
              Scan Log
            </div>
            <Badge variant="default" size="sm">
              {loading ? '…' : `${filtered.length.toLocaleString()} rows`}
            </Badge>
          </div>

          {loading ? (
            <SkeletonTable />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<FileText />}
              title="No scans found"
              description={
                hasFilters
                  ? 'No scans match your current filters. Try clearing some.'
                  : 'No scans recorded in this date range.'
              }
              action={hasFilters ? {
                label: 'Clear Filters',
                onClick: clearFilters,
                variant: 'secondary',
              } : undefined}
            />
          ) : (
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Billboard</th>
                    <th>Campaign</th>
                    <th>City</th>
                    <th>Platform</th>
                    <th>Device</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => {
                    const bb  = billboardMap[s.billboardId]
                    const cfg = PLATFORM_CFG[s.platform] ?? PLATFORM_CFG.other
                    return (
                      <tr key={s.id} className="report-table__row">
                        <td className="report-table__time">
                          <Calendar size={12} />
                          {formatTs(s.timestamp)}
                        </td>
                        <td className="report-table__bold">
                          {bb?.locationName ?? s.billboardId ?? '—'}
                        </td>
                        <td>{campaignMap[bb?.campaignId]?.name ?? '—'}</td>
                        <td>{bb?.city ?? '—'}</td>
                        <td>
                          <span
                            className="report-platform-tag"
                            style={{ color: cfg.color, background: `${cfg.color}18` }}
                          >
                            {cfg.label}
                          </span>
                        </td>
                        <td>
                          <span className="report-device-cell">
                            <DeviceIcon device={s.device} />
                            {s.device ?? '—'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </motion.div>
    </motion.div>
  )
}
