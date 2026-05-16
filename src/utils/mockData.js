// All timestamps are relative to module load time so "x minutes ago" stays fresh
const now = new Date()
const ago = (minutes) => new Date(now.getTime() - minutes * 60 * 1000)
const daysAgo = (days) => {
  const d = new Date(now)
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

// ── KPI summary ──────────────────────────────────────────────────────────────
export const kpiData = {
  totalScans:      24532,
  activeBillboards: 18,
  engagementRate:   67.3,
  peakHour:        '19:00',
}

// ── 7-day scan trends ────────────────────────────────────────────────────────
export const scanTrends = [
  { date: daysAgo(6), scans: 3241 },
  { date: daysAgo(5), scans: 2873 },
  { date: daysAgo(4), scans: 4127 },
  { date: daysAgo(3), scans: 3654 },
  { date: daysAgo(2), scans: 4382 },
  { date: daysAgo(1), scans: 3918 },
  { date: daysAgo(0), scans: 2956 },
]

// ── 5-week monthly trends (for Month toggle) ─────────────────────────────────
export const monthlyTrends = [
  { date: daysAgo(28), scans: 71200 },
  { date: daysAgo(21), scans: 68450 },
  { date: daysAgo(14), scans: 73800 },
  { date: daysAgo(7),  scans: 81200 },
  { date: daysAgo(0),  scans: 76500 },
]

// ── 24-hour profile (peak at 19:00) ──────────────────────────────────────────
export const hourlyData = [
  { hour: '00:00', scans: 45  },
  { hour: '01:00', scans: 32  },
  { hour: '02:00', scans: 28  },
  { hour: '03:00', scans: 18  },
  { hour: '04:00', scans: 22  },
  { hour: '05:00', scans: 67  },
  { hour: '06:00', scans: 143 },
  { hour: '07:00', scans: 287 },
  { hour: '08:00', scans: 412 },
  { hour: '09:00', scans: 523 },
  { hour: '10:00', scans: 648 },
  { hour: '11:00', scans: 712 },
  { hour: '12:00', scans: 834 },
  { hour: '13:00', scans: 791 },
  { hour: '14:00', scans: 765 },
  { hour: '15:00', scans: 823 },
  { hour: '16:00', scans: 945 },
  { hour: '17:00', scans: 1234 },
  { hour: '18:00', scans: 1567 },
  { hour: '19:00', scans: 1823 },
  { hour: '20:00', scans: 1654 },
  { hour: '21:00', scans: 1234 },
  { hour: '22:00', scans: 867  },
  { hour: '23:00', scans: 423  },
]

// ── Live activity feed (15 most recent scans) ────────────────────────────────
export const recentScans = [
  { id: 's01', location: 'Skopje Centar',  device: 'mobile',  platform: 'instagram', timestamp: ago(1)  },
  { id: 's02', location: 'GTC Mall',        device: 'mobile',  platform: 'tiktok',    timestamp: ago(3)  },
  { id: 's03', location: 'City Mall',       device: 'desktop', platform: 'web',       timestamp: ago(4)  },
  { id: 's04', location: 'Vero Centar',     device: 'mobile',  platform: 'instagram', timestamp: ago(6)  },
  { id: 's05', location: 'Aerodrom',        device: 'tablet',  platform: 'other',     timestamp: ago(9)  },
  { id: 's06', location: 'Skopje Centar',  device: 'mobile',  platform: 'tiktok',    timestamp: ago(12) },
  { id: 's07', location: 'GTC Mall',        device: 'mobile',  platform: 'instagram', timestamp: ago(15) },
  { id: 's08', location: 'Kisela Voda',     device: 'mobile',  platform: 'web',       timestamp: ago(18) },
  { id: 's09', location: 'City Mall',       device: 'mobile',  platform: 'tiktok',    timestamp: ago(22) },
  { id: 's10', location: 'Bit Pazar',       device: 'desktop', platform: 'web',       timestamp: ago(27) },
  { id: 's11', location: 'Kapistec',        device: 'mobile',  platform: 'instagram', timestamp: ago(34) },
  { id: 's12', location: 'Vero Centar',     device: 'tablet',  platform: 'other',     timestamp: ago(41) },
  { id: 's13', location: 'Aerodrom',        device: 'mobile',  platform: 'tiktok',    timestamp: ago(48) },
  { id: 's14', location: 'Skopje Centar',  device: 'mobile',  platform: 'instagram', timestamp: ago(56) },
  { id: 's15', location: 'GTC Mall',        device: 'mobile',  platform: 'web',       timestamp: ago(67) },
]

// ── Top 5 performing billboards ───────────────────────────────────────────────
export const topBillboards = [
  { id: 'b01', location: 'Skopje Centar', scans: 4382, change: +18.3 },
  { id: 'b02', location: 'GTC Mall',       scans: 3918, change: +7.2  },
  { id: 'b03', location: 'City Mall',      scans: 3241, change: -2.1  },
  { id: 'b04', location: 'Vero Centar',    scans: 2956, change: +4.8  },
  { id: 'b05', location: 'Aerodrom',       scans: 2743, change: +11.5 },
]

// ── Platform distribution (pie chart) ────────────────────────────────────────
export const platformDistribution = [
  { name: 'Instagram', value: 38, color: '#E4405F' },
  { name: 'TikTok',    value: 29, color: '#FF0050' },
  { name: 'Web',       value: 24, color: '#2F64FF' },
  { name: 'Other',     value: 9,  color: '#94A3B8' },
]

// ── KPI sparkline data sets ───────────────────────────────────────────────────
export const billboardSparkline = [
  { v: 15 }, { v: 15 }, { v: 16 }, { v: 17 }, { v: 17 }, { v: 18 }, { v: 18 },
]

export const engagementSparkline = [
  { v: 65.2 }, { v: 68.4 }, { v: 66.1 }, { v: 70.2 }, { v: 69.0 }, { v: 68.5 }, { v: 67.3 },
]