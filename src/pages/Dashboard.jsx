import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { format, formatDistanceToNow } from 'date-fns'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import {
  Activity, MapPin, TrendingUp, TrendingDown, Clock,
  Download, Smartphone, Tablet, Monitor, ChevronRight, AlertCircle,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { Card, Badge, Button, SkeletonLoader, EmptyState } from '../components/ui'
import { useCountUp } from '../hooks/useCountUp'
import { useKpiData } from '../hooks/useKpiData'
import { useLiveScans } from '../hooks/useLiveScans'
import { useScanTrends } from '../hooks/useScanTrends'
import { useTopBillboards } from '../hooks/useTopBillboards'
import { usePlatformDistribution } from '../hooks/usePlatformDistribution'
import { useTrendComparison } from '../hooks/useTrendComparison'
import BillboardsMap from '../components/shared/BillboardsMap'
import { useBillboards } from '../hooks/useBillboards'
import './Dashboard.css'

// ── Motion variants ──────────────────────────────────────────────────────────

const pageVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const fadeUp = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

// ── Platform config for badges ───────────────────────────────────────────────

const PLATFORM = {
  instagram: { label: 'Instagram', color: '#E4405F', bg: 'rgba(228,64,95,0.12)'  },
  tiktok:    { label: 'TikTok',    color: '#FF0050', bg: 'rgba(255,0,80,0.12)'   },
  web:       { label: 'Web',       color: '#2F64FF', bg: 'rgba(47,100,255,0.12)' },
  other:     { label: 'Other',     color: '#94A3B8', bg: 'rgba(148,163,184,0.12)'},
}

// ── Sub-components ───────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, labelFmt }) {
  if (!active || !payload?.length) return null
  return (
    <div className="dash-chart-tooltip">
      <p className="dash-chart-tooltip-date">{labelFmt ? labelFmt(label) : label}</p>
      <p className="dash-chart-tooltip-value">
        {payload[0]?.value?.toLocaleString()} scans
      </p>
    </div>
  )
}

function PlatformTag({ platform }) {
  const cfg = PLATFORM[platform] ?? PLATFORM.other
  return (
    <span className="dash-platform-tag" style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  )
}

function DeviceIcon({ device }) {
  const map = { mobile: Smartphone, tablet: Tablet, desktop: Monitor }
  const Icon = map[device] ?? Smartphone
  return <Icon size={15} />
}

// ── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon,
  label,
  value,
  suffix = '',
  trend,
  color,
  bgColor,
  accentGrad,
  sparkData,
  sparkKey = 'scans',
  isText = false,
  loading,
}) {
  const decimals   = suffix === '%' ? 1 : 0
  const numTarget  = isText || loading ? 0 : (typeof value === 'number' ? value : 0)
  const animated   = useCountUp(numTarget, 1500, decimals)
  const displayVal = isText ? value : animated.toLocaleString() + suffix

  if (loading) {
    return (
      <Card variant="default" padding="md" className="kpi-card">
        <div className="kpi-skel-row">
          <SkeletonLoader variant="rect" width="40px" height="40px" />
          <SkeletonLoader variant="text" width="55%" height="13px" />
        </div>
        <SkeletonLoader variant="text" width="65%" height="32px" />
        <SkeletonLoader variant="text" width="45%" height="12px" />
        <div style={{ marginTop: 'var(--space-3)' }}>
          <SkeletonLoader variant="rect" width="100%" height="48px" />
        </div>
      </Card>
    )
  }

  return (
    <Card variant="default" padding="md" className="kpi-card" style={{ '--kpi-accent': accentGrad }}>
      <div className="kpi-top">
        <div className="kpi-icon" style={{ background: bgColor, color }}>
          <Icon size={20} />
        </div>
        <span className="kpi-label">{label}</span>
      </div>

      <div className="kpi-value">{displayVal}</div>

      {trend ? (
        <div className={`kpi-trend ${trend.positive ? 'kpi-trend--up' : 'kpi-trend--down'}`}>
          {trend.positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{trend.text}</span>
        </div>
      ) : (
        <div className="kpi-trend-gap" />
      )}

      <div className="kpi-sparkline">
        <ResponsiveContainer width="100%" height={48}>
          <AreaChart
            data={sparkData}
            margin={{ top: 4, right: 0, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id={`sg-${label}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0}    />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey={sparkKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#sg-${label})`}
              dot={false}
              isAnimationActive
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  useDocumentTitle('Dashboard')
  const { currentUser } = useAuth()
  const [activeRange, setActiveRange] = useState('week')

  const {
    totalScans, activeBillboards, engagementRate, peakHour,
    loading: kpiLoading,
  } = useKpiData()

  const { scans: liveScans, loading: scansLoading } = useLiveScans()

  const { trends, loading: trendsLoading } = useScanTrends()

  const { billboards, loading: billboardsLoading } = useTopBillboards()

  const { distribution, loading: platformLoading } = usePlatformDistribution()

  const {
    changePercent: scansChangePercent,
    loading: trendLoading,
  } = useTrendComparison(7)

  const { billboards: allBillboards } = useBillboards()

  const today    = format(new Date(), 'EEEE, MMMM d yyyy')
  const maxScans = billboards.length > 0 ? Math.max(...billboards.map(b => b.scans)) : 1

  // RANGES built from live Firestore data
  const RANGES = {
    day: {
      data:     trends.dayData,
      xKey:     'hour',
      tickFmt:  (v) => v.slice(0, 5),
      labelFmt: (v) => `Today · ${v}`,
    },
    week: {
      data:     trends.weekData,
      xKey:     'date',
      tickFmt:  (v) => format(new Date(v), 'EEE'),
      labelFmt: (v) => format(new Date(v), 'EEE, MMM d'),
    },
    month: {
      data:     trends.monthData,
      xKey:     'date',
      tickFmt:  (v) => format(new Date(v), 'MMM d'),
      labelFmt: (v) => format(new Date(v), 'MMMM d'),
    },
  }

  const range = RANGES[activeRange]

  const kpiCardsLoading = kpiLoading || trendsLoading

  const scansTrend = trendLoading ? null : {
    positive: scansChangePercent >= 0,
    text: `${scansChangePercent >= 0 ? '+' : ''}${scansChangePercent}% vs last week`,
  }

  return (
    <motion.div
      className="dashboard"
      variants={pageVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <motion.div className="dash-header" variants={fadeUp}>
        <div>
          <h1 className="dash-greeting">
            Welcome back, {currentUser?.displayName ?? 'Admin'}
          </h1>
          <p className="dash-date">{today}</p>
        </div>
        <Button variant="secondary" size="sm" leftIcon={<Download size={15} />}>
          Export Report
        </Button>
      </motion.div>

      {/* ── KPI grid ────────────────────────────────────────────────────── */}
      <motion.div className="kpi-grid" variants={fadeUp}>
        {/* NEXT brand palette: blue, yellow, pink, deep blue */}
        <KpiCard
          icon={Activity}
          label="Total Scans"
          value={totalScans}
          trend={scansTrend}
          color="#2F64FF"
          bgColor="rgba(47,100,255,0.10)"
          accentGrad="linear-gradient(90deg,#2F64FF,#225AFF)"
          sparkData={trends.weekData}
          sparkKey="scans"
          loading={kpiCardsLoading}
        />
        <KpiCard
          icon={MapPin}
          label="Active Billboards"
          value={activeBillboards}
          color="#996600"
          bgColor="rgba(254,212,69,0.12)"
          accentGrad="linear-gradient(90deg,#FED445,#F59E0B)"
          sparkData={trends.weekData}
          sparkKey="scans"
          loading={kpiCardsLoading}
        />
        <KpiCard
          icon={TrendingUp}
          label="Engagement Rate"
          value={engagementRate}
          suffix="%"
          color="#B83D67"
          bgColor="rgba(255,169,196,0.12)"
          accentGrad="linear-gradient(90deg,#FFA9C4,#FE3346)"
          sparkData={trends.weekData}
          sparkKey="scans"
          loading={kpiCardsLoading}
        />
        <KpiCard
          icon={Clock}
          label="Peak Hour"
          value={peakHour}
          isText
          color="#234BDB"
          bgColor="rgba(35,75,219,0.10)"
          accentGrad="linear-gradient(90deg,#234BDB,#2F64FF)"
          sparkData={trends.dayData}
          sparkKey="scans"
          loading={kpiCardsLoading}
        />
      </motion.div>

      {/* ── Main grid: chart + activity feed ────────────────────────────── */}
      <motion.div className="dash-main-grid" variants={fadeUp}>

        {/* Scan Trends chart */}
        <Card variant="default" padding="md" className="dash-chart-card">
          {trendsLoading ? (
            <>
              <div className="dash-skel-header">
                <SkeletonLoader variant="text" width="140px" height="18px" />
                <SkeletonLoader variant="rect" width="160px" height="32px" />
              </div>
              <SkeletonLoader variant="rect" width="100%" height="320px" />
            </>
          ) : (
            <>
              <Card.Header>
                <div>
                  <h2 className="dash-card-title">Scan Trends</h2>
                  <p className="dash-card-subtitle">
                    {activeRange === 'day'   && 'Today by hour'}
                    {activeRange === 'week'  && 'Last 7 days'}
                    {activeRange === 'month' && 'Last 5 weeks'}
                  </p>
                </div>
                <div className="range-toggle" role="group" aria-label="Time range">
                  {Object.keys(RANGES).map((r) => (
                    <button
                      key={r}
                      className={`range-btn ${activeRange === r ? 'range-btn--active' : ''}`}
                      onClick={() => setActiveRange(r)}
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              </Card.Header>

              <div className="dash-chart-wrap">
                {range.data.length === 0 ? (
                  <EmptyState
                    icon={<Activity />}
                    title="No scan data yet"
                    description="Run the seed script to populate scan history."
                  />
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart
                      data={range.data}
                      margin={{ top: 10, right: 8, bottom: 0, left: -8 }}
                    >
                      <defs>
                        <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor="#2F64FF" stopOpacity={0.28} />
                          <stop offset="55%"  stopColor="#2F64FF" stopOpacity={0.08} />
                          <stop offset="100%" stopColor="#2F64FF" stopOpacity={0}    />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(47,100,255,0.07)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey={range.xKey}
                        tickFormatter={range.tickFmt}
                        tick={{ fill: '#9AABBD', fontSize: 11, fontFamily: 'Raleway', fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        dy={8}
                      />
                      <YAxis
                        tick={{ fill: '#9AABBD', fontSize: 11, fontFamily: 'Raleway', fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                        width={32}
                      />
                      <Tooltip
                        content={(props) => (
                          <ChartTooltip {...props} labelFmt={range.labelFmt} />
                        )}
                        cursor={{ stroke: 'rgba(47,100,255,0.20)', strokeWidth: 1 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="scans"
                        stroke="#2F64FF"
                        strokeWidth={2.5}
                        fill="url(#trendGrad)"
                        dot={false}
                        activeDot={{ r: 5, fill: '#2F64FF', stroke: '#fff', strokeWidth: 2 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          )}
        </Card>

        {/* Live Activity Feed */}
        <Card variant="default" padding="md" className="dash-activity-card">
          {scansLoading ? (
            <>
              <div className="dash-skel-header">
                <SkeletonLoader variant="text" width="120px" height="18px" />
                <SkeletonLoader variant="rect" width="48px"  height="22px" />
              </div>
              <div className="dash-skel-list">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="dash-skel-row">
                    <SkeletonLoader variant="circle" width="32px" height="32px" />
                    <div style={{ flex: 1 }}>
                      <SkeletonLoader variant="text" width="70%" height="13px" />
                      <div style={{ marginTop: '5px' }}>
                        <SkeletonLoader variant="text" width="45%" height="11px" />
                      </div>
                    </div>
                    <SkeletonLoader variant="text" width="48px" height="11px" />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <Card.Header>
                <h2 className="dash-card-title">Live Activity</h2>
                <Badge variant="success" dot size="sm">Live</Badge>
              </Card.Header>

              {liveScans.length === 0 ? (
                <EmptyState
                  icon={<Activity />}
                  title="No recent scans"
                  description="Scans will appear here in real time."
                  iconSize={32}
                />
              ) : (
                <ul className="activity-list" aria-label="Recent scan activity">
                  {liveScans.map((scan) => (
                    <li key={scan.id} className="activity-item">
                      <div className="activity-device">
                        <DeviceIcon device={scan.device} />
                      </div>
                      <div className="activity-info">
                        <span className="activity-location">{scan.billboardName ?? scan.location ?? '—'}</span>
                        <PlatformTag platform={scan.platform} />
                      </div>
                      <span className="activity-time">
                        {formatDistanceToNow(
                          scan.timestamp?.toDate?.() ?? new Date(scan.timestamp),
                          { addSuffix: true }
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="activity-footer">
                <a href="/scans" className="activity-viewall">
                  View all scans <ChevronRight size={14} />
                </a>
              </div>
            </>
          )}
        </Card>
      </motion.div>

      {/* ── Bottom row: top billboards + platform pie ────────────────────── */}
      <motion.div className="dash-bottom-grid" variants={fadeUp}>

        {/* Top performing billboards */}
        <Card variant="default" padding="md">
          {billboardsLoading ? (
            <>
              <div className="dash-skel-header">
                <SkeletonLoader variant="text" width="200px" height="18px" />
              </div>
              <div className="dash-skel-list">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="dash-skel-row">
                    <SkeletonLoader variant="circle" width="28px" height="28px" />
                    <div style={{ flex: 1 }}>
                      <SkeletonLoader variant="text" width="65%" height="13px" />
                      <div style={{ marginTop: '6px' }}>
                        <SkeletonLoader variant="rect" width="100%" height="6px" />
                      </div>
                    </div>
                    <SkeletonLoader variant="text" width="52px" height="13px" />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <Card.Header>
                <h2 className="dash-card-title">Top Performing Billboards</h2>
              </Card.Header>

              {billboards.length === 0 ? (
                <EmptyState
                  icon={<MapPin />}
                  title="No billboard data"
                  description="Billboard rankings will appear after scans are recorded."
                  iconSize={32}
                />
              ) : (
                <ol className="billboard-list" aria-label="Top billboards by scans">
                  {billboards.map((board, idx) => (
                    <li key={board.id} className="billboard-item">
                      <span className="billboard-rank">{idx + 1}</span>

                      <div className="billboard-info">
                        <div className="billboard-location-row">
                          <span className="billboard-location">{board.location}</span>
                          <span
                            className={`billboard-change ${board.change >= 0 ? 'billboard-change--up' : 'billboard-change--down'}`}
                          >
                            {board.change >= 0 ? '+' : ''}{board.change}%
                          </span>
                        </div>
                        <div className="billboard-bar-track">
                          <motion.div
                            className="billboard-bar-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${(board.scans / maxScans) * 100}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 * idx }}
                          />
                        </div>
                      </div>

                      <span className="billboard-scans">{board.scans.toLocaleString()}</span>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </Card>

        {/* Platform distribution donut */}
        <Card variant="default" padding="md">
          {platformLoading ? (
            <>
              <div className="dash-skel-header">
                <SkeletonLoader variant="text" width="170px" height="18px" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', margin: 'var(--space-4) 0' }}>
                <SkeletonLoader variant="circle" width="200px" height="200px" />
              </div>
              <div className="dash-skel-list">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="dash-skel-row">
                    <SkeletonLoader variant="circle" width="10px" height="10px" />
                    <SkeletonLoader variant="text"   width="60%"  height="12px" />
                    <SkeletonLoader variant="text"   width="28px" height="12px" />
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <Card.Header>
                <h2 className="dash-card-title">Platform Distribution</h2>
              </Card.Header>

              {distribution.length === 0 ? (
                <EmptyState
                  icon={<Activity />}
                  title="No platform data"
                  description="Distribution will appear after scans are recorded."
                  iconSize={32}
                />
              ) : (
                <>
                  <div className="platform-donut-wrap">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={distribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={62}
                          outerRadius={98}
                          dataKey="value"
                          strokeWidth={0}
                          paddingAngle={2}
                        >
                          {distribution.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v) => [`${v}%`, 'Share']}
                          contentStyle={{
                            background: 'var(--chart-tooltip-bg)',
                            border: '1px solid var(--chart-tooltip-border)',
                            borderRadius: '14px',
                            fontFamily: 'Raleway',
                            fontSize: 13,
                            color: 'var(--chart-tooltip-color)',
                            boxShadow: '0 8px 28px rgba(47,100,255,0.12)',
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>

                    <div className="platform-donut-center" aria-hidden="true">
                      <span className="platform-donut-total">
                        {totalScans.toLocaleString()}
                      </span>
                      <span className="platform-donut-label">Total</span>
                    </div>
                  </div>

                  <ul className="platform-legend" aria-label="Platform breakdown">
                    {distribution.map(({ name, value, color }) => (
                      <li key={name} className="platform-legend-item">
                        <span
                          className="platform-legend-dot"
                          style={{ background: color }}
                          aria-hidden="true"
                        />
                        <span className="platform-legend-name">{name}</span>
                        <span className="platform-legend-pct">{value}%</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </Card>
      </motion.div>

      {/* ── Billboard Locations map ──────────────────────────────────────── */}
      <motion.div variants={fadeUp}>
        <Card variant="default" padding="md" className="dash-map-card">
          <Card.Header>
            <div>
              <h2 className="dash-card-title">Billboard Locations</h2>
              <p className="dash-card-subtitle">Geographic overview of all billboard sites</p>
            </div>
            <Link to="/billboards?view=map" className="dash-map-link">
              View full map <ChevronRight size={14} />
            </Link>
          </Card.Header>
          <div className="dash-map-wrap">
            <BillboardsMap
              billboards={allBillboards}
              height={400}
              mini
            />
          </div>
        </Card>
      </motion.div>
    </motion.div>
  )
}
