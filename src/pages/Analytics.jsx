import { useState, useEffect, useRef, useCallback } from 'react'
import { format } from 'date-fns'
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  TrendingUp, TrendingDown, BarChart2, Clock, MapPin, Smartphone,
  Calendar, Briefcase, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Download, RefreshCw, ChevronDown, Minus,
} from 'lucide-react'
import { useAnalytics, PRESETS } from '../hooks/useAnalytics'
import { Spinner, useToast } from '../components/ui'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import './Analytics.css'

// ── Design tokens ─────────────────────────────────────────────────────────────
const COLORS = {
  primary:  '#2F64FF',
  success:  '#22C55E',
  danger:   '#FE3346',
  warning:  '#F59E0B',
  muted:    '#94A3B8',
  border:   'rgba(255,255,255,0.08)',
}

const CAMPAIGN_PALETTE = [
  '#2F64FF', '#22C55E', '#F59E0B', '#FE3346', '#A855F7',
]

const DEVICE_COLORS = {
  mobile:  '#2F64FF',
  tablet:  '#22C55E',
  desktop: '#F59E0B',
  other:   '#94A3B8',
}

const HEATMAP_DAYS  = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HEATMAP_HOURS = Array.from({ length: 24 }, (_, i) =>
  i === 0 ? '12a' : i < 12 ? `${i}a` : i === 12 ? '12p' : `${i - 12}p`,
)

// ── Icon helper ───────────────────────────────────────────────────────────────
const ICON_MAP = { TrendingUp, ArrowUpRight, ArrowDownRight, Smartphone, MapPin, Calendar, Briefcase, AlertTriangle }

function InsightIcon({ name, size = 16 }) {
  const Icon = ICON_MAP[name] ?? TrendingUp
  return <Icon size={size} />
}

// ── Custom tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="an-tooltip">
      <div className="an-tooltip-label">{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} className="an-tooltip-row">
          <span className="an-tooltip-dot" style={{ background: p.color }} />
          <span className="an-tooltip-name">{p.name ?? p.dataKey}</span>
          <span className="an-tooltip-val">{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, trend, trendDir }) {
  return (
    <div className="an-stat-card">
      <div className="an-stat-icon">
        <Icon size={18} />
      </div>
      <div className="an-stat-body">
        <div className="an-stat-value">{value}</div>
        <div className="an-stat-label">{label}</div>
        {(sub || trend !== undefined) && (
          <div className="an-stat-sub">
            {trend !== undefined && (
              <span className={`an-stat-trend an-stat-trend--${trendDir ?? (trend >= 0 ? 'up' : 'down')}`}>
                {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {Math.abs(trend)}%
              </span>
            )}
            {sub}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Donut chart with center label ─────────────────────────────────────────────
function DonutChart({ data, title }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  return (
    <div className="an-donut-wrap">
      <div className="an-section-title">{title}</div>
      {total === 0 ? (
        <div className="an-empty">No data</div>
      ) : (
        <>
          <div className="an-donut-chart">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="count"
                  strokeWidth={0}
                >
                  {data.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={entry.color ?? DEVICE_COLORS[entry.name] ?? CAMPAIGN_PALETTE[i % CAMPAIGN_PALETTE.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const d = payload[0].payload
                    return (
                      <div className="an-tooltip">
                        <div className="an-tooltip-label">{d.name}</div>
                        <div className="an-tooltip-row">
                          <span className="an-tooltip-dot" style={{ background: d.color ?? DEVICE_COLORS[d.name] }} />
                          <span className="an-tooltip-val">{d.count} ({d.pct}%)</span>
                        </div>
                      </div>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="an-donut-center">
              <div className="an-donut-total">{total}</div>
              <div className="an-donut-sub">total</div>
            </div>
          </div>
          <div className="an-legend">
            {data.map((d, i) => (
              <div key={d.name} className="an-legend-row">
                <span
                  className="an-legend-dot"
                  style={{ background: d.color ?? DEVICE_COLORS[d.name] ?? CAMPAIGN_PALETTE[i % CAMPAIGN_PALETTE.length] }}
                />
                <span className="an-legend-name">{d.name}</span>
                <span className="an-legend-pct">{d.pct}%</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Heatmap ───────────────────────────────────────────────────────────────────
function Heatmap({ matrix }) {
  if (!matrix?.length) return <div className="an-empty">No data</div>

  let max = 0
  matrix.forEach(row => row.forEach(v => { if (v > max) max = v }))

  function intensity(v) {
    if (max === 0 || v === 0) return 0
    return Math.max(0.08, v / max)
  }

  return (
    <div className="an-heatmap">
      {/* Hour labels */}
      <div className="an-heatmap-row an-heatmap-row--header">
        <div className="an-heatmap-day-label" />
        {HEATMAP_HOURS.map((h, i) => (
          <div key={i} className="an-heatmap-hour-label">{i % 3 === 0 ? h : ''}</div>
        ))}
      </div>
      {HEATMAP_DAYS.map((day, di) => (
        <div key={day} className="an-heatmap-row">
          <div className="an-heatmap-day-label">{day}</div>
          {matrix[di].map((v, hi) => (
            <div
              key={hi}
              className="an-heatmap-cell"
              style={{ opacity: intensity(v) + (v > 0 ? 0 : 0) }}
              title={`${day} ${HEATMAP_HOURS[hi]}: ${v} scans`}
            >
              <div
                className="an-heatmap-fill"
                style={{
                  background: COLORS.primary,
                  opacity: intensity(v),
                }}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

// ── CSV export ────────────────────────────────────────────────────────────────
function exportCSV(scans) {
  const header = 'id,timestamp,billboardId,campaignId,device,platform,city'
  const rows = scans.map(s => {
    const ts = s.timestamp?.toDate?.()
    return [
      s.id,
      ts ? format(ts, "yyyy-MM-dd'T'HH:mm:ss") : '',
      s.billboardId ?? '',
      s.campaignId  ?? '',
      s.device      ?? '',
      s.platform    ?? '',
      s.city        ?? '',
    ].join(',')
  })
  const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `scans-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Custom date range picker ──────────────────────────────────────────────────
function DateRangeInput({ value, onChange }) {
  return (
    <div className="an-custom-range">
      <input
        type="date"
        className="an-date-input"
        value={value?.start ? format(value.start, 'yyyy-MM-dd') : ''}
        max={value?.end ? format(value.end, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')}
        onChange={e => onChange({ ...value, start: new Date(e.target.value + 'T00:00:00') })}
      />
      <span className="an-date-sep">—</span>
      <input
        type="date"
        className="an-date-input"
        value={value?.end ? format(value.end, 'yyyy-MM-dd') : ''}
        min={value?.start ? format(value.start, 'yyyy-MM-dd') : undefined}
        max={format(new Date(), 'yyyy-MM-dd')}
        onChange={e => onChange({ ...value, end: new Date(e.target.value + 'T23:59:59') })}
      />
    </div>
  )
}

// ── Campaign line toggle ──────────────────────────────────────────────────────
function CampaignToggle({ campaigns, active, onToggle }) {
  return (
    <div className="an-camp-toggles">
      {campaigns.map((c, i) => {
        const on = active.has(c.id)
        return (
          <button
            key={c.id}
            className={`an-camp-toggle ${on ? 'an-camp-toggle--on' : ''}`}
            onClick={() => onToggle(c.id)}
            style={on ? { borderColor: CAMPAIGN_PALETTE[i % CAMPAIGN_PALETTE.length], color: CAMPAIGN_PALETTE[i % CAMPAIGN_PALETTE.length] } : {}}
          >
            <span
              className="an-camp-toggle-dot"
              style={{ background: on ? CAMPAIGN_PALETTE[i % CAMPAIGN_PALETTE.length] : COLORS.muted }}
            />
            {c.name}
          </button>
        )
      })}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Analytics() {
  useDocumentTitle('Analytics')
  const {
    preset, setPreset,
    customRange, setCustomRange,
    compare, setCompare,
    range,
    loading, error,
    scans, overview, dayData, hourData, heatmap,
    devices, platforms, topBoards, campaignData, insights,
    prevCount,
    reload,
  } = useAnalytics()

  const { showToast } = useToast()

  // Active campaigns for the comparison chart
  const [activeCamps, setActiveCamps] = useState(new Set())
  const prevSeriesIdsRef = useRef('')

  // Sync activeCamps when the campaign series list changes
  useEffect(() => {
    const ids = campaignData.series.map(c => c.id).join(',')
    if (ids !== prevSeriesIdsRef.current) {
      prevSeriesIdsRef.current = ids
      setActiveCamps(new Set(campaignData.series.map(c => c.id)))
    }
  }, [campaignData.series])

  function toggleCamp(id) {
    setActiveCamps(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleExport = useCallback(() => {
    if (scans.length === 0) {
      showToast({ variant: 'warning', title: 'Nothing to export', message: 'No scans in selected range.' })
      return
    }
    exportCSV(scans)
    showToast({ variant: 'success', title: 'Exported', message: `${scans.length} rows saved as CSV.` })
  }, [scans, showToast])

  // Day-axis label formatter
  function fmtDay(dateStr) {
    try { return format(new Date(dateStr + 'T12:00:00'), 'MMM d') }
    catch { return dateStr }
  }

  const trendDir = prevCount !== null
    ? (overview.total >= prevCount ? 'up' : 'down')
    : undefined

  const trendPct = prevCount !== null && prevCount > 0
    ? parseFloat((((overview.total - prevCount) / prevCount) * 100).toFixed(1))
    : undefined

  return (
    <div className="an-page">

      {/* ── Header ── */}
      <div className="an-header">
        <div>
          <h1 className="an-title">Analytics</h1>
          <p className="an-subtitle">
            {format(range.start, 'MMM d, yyyy')} – {format(range.end, 'MMM d, yyyy')}
          </p>
        </div>

        <div className="an-header-right">
          <button
            className="an-icon-btn"
            onClick={reload}
            title="Refresh data"
          >
            <RefreshCw size={15} />
          </button>

          <button className="an-compare-btn" onClick={() => setCompare(v => !v)}>
            {compare ? <Minus size={13} /> : <BarChart2 size={13} />}
            {compare ? 'Remove compare' : 'Compare period'}
          </button>

          <button className="an-export-btn" onClick={handleExport}>
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* ── Preset tabs ── */}
      <div className="an-presets">
        {PRESETS.map(p => (
          <button
            key={p.key}
            className={`an-preset-tab ${preset === p.key ? 'an-preset-tab--active' : ''}`}
            onClick={() => setPreset(p.key)}
          >
            {p.label}
          </button>
        ))}
        {preset === 'custom' && (
          <DateRangeInput value={customRange} onChange={setCustomRange} />
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="an-error">
          <AlertTriangle size={15} />
          {error}
        </div>
      )}

      {loading ? (
        <div className="an-loading">
          <Spinner size={32} />
          <span>Loading analytics…</span>
        </div>
      ) : (
        <>
          {/* ── Overview stats ── */}
          <div className="an-stats-grid">
            <StatCard
              icon={BarChart2}
              label="Total Scans"
              value={overview.total.toLocaleString()}
              trend={trendPct}
              trendDir={trendDir}
              sub={prevCount !== null ? `vs ${prevCount} prev period` : undefined}
            />
            <StatCard
              icon={MapPin}
              label="Billboards Hit"
              value={overview.uniqueBoards}
            />
            <StatCard
              icon={TrendingUp}
              label="Avg / Day"
              value={overview.avgPerDay}
            />
            <StatCard
              icon={Clock}
              label="Peak Hour"
              value={`${String(overview.peakHour).padStart(2, '0')}:00`}
            />
          </div>

          {/* ── Trend chart ── */}
          <div className="an-card">
            <div className="an-card-header">
              <div className="an-section-title">Scan Trend</div>
            </div>
            {dayData.length === 0 || overview.total === 0 ? (
              <div className="an-empty">No scans in this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={dayData} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="anGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={COLORS.primary} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={fmtDay}
                    tick={{ fill: COLORS.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: COLORS.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    name="Scans"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    fill="url(#anGrad)"
                    dot={false}
                    activeDot={{ r: 4, fill: COLORS.primary }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Donut charts ── */}
          <div className="an-two-col">
            <div className="an-card">
              <DonutChart data={devices} title="Device Breakdown" />
            </div>
            <div className="an-card">
              <DonutChart data={platforms} title="Platform Breakdown" />
            </div>
          </div>

          {/* ── Heatmap ── */}
          <div className="an-card">
            <div className="an-card-header">
              <div className="an-section-title">Scan Heatmap <span className="an-section-sub">Hour × Day of Week</span></div>
            </div>
            <Heatmap matrix={heatmap} />
            <div className="an-heatmap-legend">
              <span className="an-heatmap-legend-label">Less</span>
              {[0.08, 0.25, 0.45, 0.65, 1].map(o => (
                <div key={o} className="an-heatmap-legend-swatch" style={{ background: COLORS.primary, opacity: o }} />
              ))}
              <span className="an-heatmap-legend-label">More</span>
            </div>
          </div>

          {/* ── Top billboards ── */}
          <div className="an-card">
            <div className="an-card-header">
              <div className="an-section-title">Top Billboards</div>
            </div>
            {topBoards.length === 0 ? (
              <div className="an-empty">No billboard data</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(160, topBoards.length * 44)}>
                <BarChart
                  data={topBoards}
                  layout="vertical"
                  margin={{ top: 0, right: 24, bottom: 0, left: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: COLORS.muted, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tick={{ fill: COLORS.muted, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Scans" fill={COLORS.primary} radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Campaign comparison ── */}
          {campaignData.series.length > 0 && (
            <div className="an-card">
              <div className="an-card-header">
                <div className="an-section-title">Campaign Comparison</div>
              </div>
              <CampaignToggle
                campaigns={campaignData.series}
                active={activeCamps}
                onToggle={toggleCamp}
              />
              {campaignData.points.length > 0 && (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={campaignData.points} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={fmtDay}
                      tick={{ fill: COLORS.muted, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: COLORS.muted, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    {campaignData.series.map((c, i) =>
                      activeCamps.has(c.id) ? (
                        <Line
                          key={c.id}
                          type="monotone"
                          dataKey={c.id}
                          name={c.name}
                          stroke={CAMPAIGN_PALETTE[i % CAMPAIGN_PALETTE.length]}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      ) : null,
                    )}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* ── AI Insights ── */}
          {insights.length > 0 && (
            <div className="an-card">
              <div className="an-card-header">
                <div className="an-section-title">
                  Insights
                  <span className="an-section-sub">{insights.length} observation{insights.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="an-insights-grid">
                {insights.map(ins => (
                  <div key={ins.type} className="an-insight">
                    <div className="an-insight-icon">
                      <InsightIcon name={ins.icon} size={16} />
                    </div>
                    <div className="an-insight-body">
                      <div className="an-insight-title">{ins.title}</div>
                      <div className="an-insight-text">{ins.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
