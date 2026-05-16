import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { format, eachDayOfInterval, startOfDay, endOfDay, subDays } from 'date-fns'
import {
  getScansInRange, countScansInRange, getAllCampaigns, getAllBillboards,
} from '../firebase/analytics'

// ── Date range presets ────────────────────────────────────────────────────────

export const PRESETS = [
  { key: 'today',  label: 'Today' },
  { key: '7d',     label: '7 Days' },
  { key: '30d',    label: '30 Days' },
  { key: '90d',    label: '90 Days' },
  { key: '1y',     label: '1 Year' },
  { key: 'custom', label: 'Custom' },
]

export function presetToRange(key) {
  const now = new Date()
  switch (key) {
    case 'today': return { start: startOfDay(now), end: endOfDay(now) }
    case '7d':    return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) }
    case '30d':   return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) }
    case '90d':   return { start: startOfDay(subDays(now, 89)), end: endOfDay(now) }
    case '1y':    return { start: startOfDay(subDays(now, 364)), end: endOfDay(now) }
    default:      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) }
  }
}

// ── Aggregation helpers ───────────────────────────────────────────────────────

function groupByDay(scans, start, end) {
  const days = eachDayOfInterval({ start, end })
  const bins = {}
  days.forEach(d => { bins[format(d, 'yyyy-MM-dd')] = 0 })
  scans.forEach(s => {
    const ts = s.timestamp?.toDate?.()
    if (!ts) return
    const key = format(ts, 'yyyy-MM-dd')
    if (key in bins) bins[key]++
  })
  return Object.entries(bins).map(([date, value]) => ({ date, value }))
}

function groupByHour(scans) {
  const bins = Array.from({ length: 24 }, (_, h) => ({ hour: h, value: 0 }))
  scans.forEach(s => {
    const ts = s.timestamp?.toDate?.()
    if (!ts) return
    bins[ts.getHours()].value++
  })
  return bins
}

function groupByDayAndHour(scans) {
  // Returns a 7×24 matrix: [dayOfWeek 0-6][hour 0-23] = count
  const matrix = Array.from({ length: 7 }, () => Array(24).fill(0))
  scans.forEach(s => {
    const ts = s.timestamp?.toDate?.()
    if (!ts) return
    matrix[ts.getDay()][ts.getHours()]++
  })
  return matrix
}

function deviceBreakdown(scans) {
  const counts = {}
  scans.forEach(s => {
    const d = s.device || 'other'
    counts[d] = (counts[d] || 0) + 1
  })
  const total = scans.length
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count, pct: total > 0 ? Math.round((count / total) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)
}

function platformBreakdown(scans) {
  const CONFIG = {
    instagram: { label: 'Instagram', color: '#E4405F' },
    tiktok:    { label: 'TikTok',    color: '#FF0050' },
    web:       { label: 'Web',       color: '#2F64FF' },
    other:     { label: 'Other',     color: '#94A3B8' },
  }
  const counts = {}
  scans.forEach(s => {
    const p = s.platform || 'other'
    counts[p] = (counts[p] || 0) + 1
  })
  const total = scans.length
  return Object.entries(counts)
    .map(([key, count]) => {
      const cfg = CONFIG[key] ?? { label: key, color: '#94A3B8' }
      return { name: cfg.label, key, count, color: cfg.color, pct: total > 0 ? Math.round((count / total) * 100) : 0 }
    })
    .sort((a, b) => b.count - a.count)
}

function topBillboards(scans, billboardMap, n = 8) {
  const counts = {}
  scans.forEach(s => {
    if (s.billboardId) counts[s.billboardId] = (counts[s.billboardId] || 0) + 1
  })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([id, count]) => {
      const bb = billboardMap.get(id) ?? {}
      return { id, name: bb.locationName ?? id, city: bb.city ?? '', count }
    })
}

function campaignTimeline(scans, campaigns, start, end) {
  const days = eachDayOfInterval({ start, end })
  const bins = {}
  campaigns.forEach(c => { bins[c.id] = {} })
  days.forEach(d => {
    const key = format(d, 'yyyy-MM-dd')
    campaigns.forEach(c => { bins[c.id][key] = 0 })
  })
  scans.forEach(s => {
    const ts = s.timestamp?.toDate?.()
    if (!ts || !s.campaignId || !bins[s.campaignId]) return
    const key = format(ts, 'yyyy-MM-dd')
    if (key in bins[s.campaignId]) bins[s.campaignId][key]++
  })
  return days.map(d => {
    const key = format(d, 'yyyy-MM-dd')
    const pt = { date: key }
    campaigns.forEach(c => { pt[c.id] = bins[c.id][key] ?? 0 })
    return pt
  })
}

function buildInsights(scans, dayData, devices, platforms, bbList, prevCount) {
  const insights = []
  const total = scans.length

  if (total === 0) return insights

  // Peak day
  const maxDay = dayData.reduce((a, b) => (b.value > a.value ? b : a), dayData[0] ?? { value: 0 })
  if (maxDay?.value > 0) {
    insights.push({
      type: 'peak_day',
      icon: 'TrendingUp',
      title: 'Peak scanning day',
      body: `${format(new Date(maxDay.date + 'T12:00:00'), 'EEEE, MMM d')} had the most scans (${maxDay.value}).`,
    })
  }

  // vs previous period
  if (prevCount !== null && prevCount !== undefined) {
    const diff = total - prevCount
    const pct  = prevCount > 0 ? Math.round(Math.abs((diff / prevCount) * 100)) : 0
    if (diff > 0) {
      insights.push({
        type: 'growth',
        icon: 'ArrowUpRight',
        title: 'Scans are up',
        body: `${pct}% more scans vs the previous period (${prevCount} → ${total}).`,
      })
    } else if (diff < 0) {
      insights.push({
        type: 'decline',
        icon: 'ArrowDownRight',
        title: 'Scans are down',
        body: `${pct}% fewer scans vs the previous period (${prevCount} → ${total}).`,
      })
    }
  }

  // Dominant platform
  if (platforms.length > 0 && platforms[0].pct > 40) {
    insights.push({
      type: 'platform',
      icon: 'Smartphone',
      title: `${platforms[0].name} dominates`,
      body: `${platforms[0].pct}% of scans came from ${platforms[0].name} during this period.`,
    })
  }

  // Top billboard
  if (bbList.length > 0 && bbList[0].count > 0) {
    insights.push({
      type: 'top_board',
      icon: 'MapPin',
      title: 'Best-performing billboard',
      body: `"${bbList[0].name}" received the most scans (${bbList[0].count}) in this period.`,
    })
  }

  // Mobile dominance
  const mobileDev = devices.find(d => d.name === 'mobile')
  if (mobileDev && mobileDev.pct > 80) {
    insights.push({
      type: 'mobile',
      icon: 'Smartphone',
      title: 'Almost entirely mobile',
      body: `${mobileDev.pct}% of scans were from mobile devices — QR is performing as expected.`,
    })
  }

  // Weekend vs weekday
  const weekendScans = scans.filter(s => {
    const ts = s.timestamp?.toDate?.()
    if (!ts) return false
    const d = ts.getDay()
    return d === 0 || d === 6
  }).length
  const weekdayScans = total - weekendScans
  const weekendPct = Math.round((weekendScans / total) * 100)
  if (weekendPct > 55) {
    insights.push({
      type: 'weekend',
      icon: 'Calendar',
      title: 'Weekend traffic spike',
      body: `${weekendPct}% of scans happened on weekends — consider boosting weekend ad spend.`,
    })
  } else if (weekdayScans > 0 && weekendPct < 25) {
    insights.push({
      type: 'weekday',
      icon: 'Briefcase',
      title: 'Weekday-heavy traffic',
      body: `${100 - weekendPct}% of scans happened on weekdays — billboards in commuter zones are performing well.`,
    })
  }

  // Low-activity billboard (if 3+ billboards and tail is weak)
  if (bbList.length >= 3) {
    const top1 = bbList[0].count
    const last = bbList[bbList.length - 1]
    if (last.count < Math.round(top1 * 0.1)) {
      insights.push({
        type: 'underperform',
        icon: 'AlertTriangle',
        title: 'Underperforming billboard',
        body: `"${last.name}" has only ${last.count} scan${last.count === 1 ? '' : 's'} — consider reviewing its placement or campaign.`,
      })
    }
  }

  return insights.slice(0, 6)
}

// ── Master hook ───────────────────────────────────────────────────────────────

export function useAnalytics() {
  const [preset,      setPreset]      = useState('30d')
  const [customRange, setCustomRange] = useState(null)
  const [compare,     setCompare]     = useState(false)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  const [scans,       setScans]       = useState([])
  const [prevCount,   setPrevCount]   = useState(null)
  const [campaigns,   setCampaigns]   = useState([])
  const [billboardMap,setBillboardMap]= useState(new Map())

  // Simple cache: key → data, avoids re-fetching same range
  const cache = useRef(new Map())

  const range = useMemo(() => {
    if (preset === 'custom' && customRange) return customRange
    return presetToRange(preset)
  }, [preset, customRange])

  const rangeKey = `${range.start.getTime()}-${range.end.getTime()}`

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch billboards + campaigns once (or from cache)
      let bbMap = billboardMap.size > 0 ? billboardMap : null
      let camps = campaigns.length > 0 ? campaigns : null

      if (!bbMap || !camps) {
        const [bbRes, campRes] = await Promise.all([
          getAllBillboards(),
          getAllCampaigns(),
        ])
        if (bbRes.success) {
          const m = new Map()
          bbRes.data.forEach(b => m.set(b.id, b))
          bbMap = m
          setBillboardMap(m)
        }
        if (campRes.success) {
          camps = campRes.data
          setCampaigns(camps)
        }
      }

      // Scans in range (cached)
      let scanData
      if (cache.current.has(rangeKey)) {
        scanData = cache.current.get(rangeKey)
      } else {
        const res = await getScansInRange(range.start, range.end)
        if (!res.success) throw new Error(res.error)
        scanData = res.data
        cache.current.set(rangeKey, scanData)
        // Keep cache small
        if (cache.current.size > 10) {
          const firstKey = cache.current.keys().next().value
          cache.current.delete(firstKey)
        }
      }
      setScans(scanData)

      // Previous period count for comparison
      if (compare) {
        const span = range.end.getTime() - range.start.getTime()
        const prevStart = new Date(range.start.getTime() - span)
        const prevEnd   = new Date(range.start.getTime() - 1)
        const prevRes   = await countScansInRange(prevStart, prevEnd)
        setPrevCount(prevRes.success ? prevRes.data : null)
      } else {
        setPrevCount(null)
      }
    } catch (err) {
      setError(err?.message ?? String(err))
    } finally {
      setLoading(false)
    }
  }, [rangeKey, compare]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  // ── Derived aggregations ──────────────────────────────────────────────────

  const dayData = useMemo(
    () => groupByDay(scans, range.start, range.end),
    [scans, range],
  )

  const hourData = useMemo(() => groupByHour(scans), [scans])

  const heatmap = useMemo(() => groupByDayAndHour(scans), [scans])

  const devices = useMemo(() => deviceBreakdown(scans), [scans])

  const platforms = useMemo(() => platformBreakdown(scans), [scans])

  const topBoards = useMemo(
    () => topBillboards(scans, billboardMap),
    [scans, billboardMap],
  )

  const campaignData = useMemo(() => {
    if (campaigns.length === 0) return { series: [], points: [] }
    // Only show campaigns that had any scans in this range
    const activeCamps = campaigns.filter(c =>
      scans.some(s => s.campaignId === c.id),
    ).slice(0, 5)
    const points = campaignTimeline(scans, activeCamps, range.start, range.end)
    return { series: activeCamps, points }
  }, [scans, campaigns, range])

  const overview = useMemo(() => {
    const total = scans.length
    const days  = Math.max(1, dayData.length)
    const avgPerDay = total > 0 ? parseFloat((total / days).toFixed(1)) : 0
    const uniqueBoards = new Set(scans.map(s => s.billboardId)).size
    const peakHour = hourData.reduce((a, b) => (b.value > a.value ? b : a), hourData[0] ?? { hour: 0, value: 0 })
    return { total, avgPerDay, uniqueBoards, peakHour: peakHour.hour }
  }, [scans, dayData, hourData])

  const insights = useMemo(
    () => buildInsights(scans, dayData, devices, platforms, topBoards, prevCount),
    [scans, dayData, devices, platforms, topBoards, prevCount],
  )

  return {
    // controls
    preset, setPreset,
    customRange, setCustomRange,
    compare, setCompare,
    range,
    // state
    loading, error,
    // data
    scans, overview, dayData, hourData, heatmap,
    devices, platforms, topBoards, campaignData, insights,
    prevCount,
    // utils
    reload: load,
  }
}
