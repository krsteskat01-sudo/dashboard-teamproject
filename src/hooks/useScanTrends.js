import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore'
import { format } from 'date-fns'
import { db } from '../firebase/config'
import { getFirestoreErrorMessage } from '../utils/errorHandler'

export function useScanTrends() {
  const [trends, setTrends] = useState({ dayData: [], weekData: [], monthData: [] })
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let isMounted = true

    async function fetchTrends() {
      try {
        const now            = new Date()
        const thirtyDaysAgo  = new Date(now.getTime() - 30 * 86_400_000)
        const oneDayAgo      = new Date(now.getTime() - 86_400_000)

        const q = query(
          collection(db, 'scans'),
          where('timestamp', '>=', Timestamp.fromDate(thirtyDaysAgo)),
          orderBy('timestamp', 'asc'),
        )
        const snap = await getDocs(q)
        if (!isMounted) return

        const scans = snap.docs.map(d => ({
          ...d.data(),
          ts: d.data().timestamp.toDate(),
        }))

        // Day: hourly bins for last 24 h
        const hourBins = {}
        for (let h = 0; h < 24; h++) hourBins[`${String(h).padStart(2, '0')}:00`] = 0
        scans.filter(s => s.ts >= oneDayAgo).forEach(s => {
          const key = `${String(s.ts.getHours()).padStart(2, '0')}:00`
          if (key in hourBins) hourBins[key]++
        })
        const dayData = Object.entries(hourBins).map(([hour, scans]) => ({ hour, scans }))

        // Week: daily bins for last 7 days
        const dayBins = {}
        for (let d = 6; d >= 0; d--) {
          const dt = new Date(now)
          dt.setDate(dt.getDate() - d)
          dayBins[format(dt, 'yyyy-MM-dd')] = 0
        }
        const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000)
        scans.filter(s => s.ts >= sevenDaysAgo).forEach(s => {
          const key = format(s.ts, 'yyyy-MM-dd')
          if (key in dayBins) dayBins[key]++
        })
        const weekData = Object.entries(dayBins).map(([date, scans]) => ({ date, scans }))

        // Month: weekly bins (5 points at 0, 7, 14, 21, 28 days ago)
        const weekBins = Array.from({ length: 5 }, (_, i) => {
          const dt = new Date(now)
          dt.setDate(dt.getDate() - (4 - i) * 7)
          return { date: format(dt, 'yyyy-MM-dd'), scans: 0 }
        })
        scans.forEach(s => {
          const daysAgo = Math.floor((now - s.ts) / 86_400_000)
          const idx = Math.min(Math.floor(daysAgo / 7), 4)
          weekBins[4 - idx].scans++
        })
        const monthData = weekBins

        setTrends({ dayData, weekData, monthData })
        setLoading(false)
      } catch (err) {
        if (!isMounted) return
        setError(getFirestoreErrorMessage(err))
        setLoading(false)
      }
    }

    fetchTrends()
    return () => { isMounted = false }
  }, [])

  return { trends, loading, error }
}
