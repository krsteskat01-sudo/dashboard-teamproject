import { useState, useEffect } from 'react'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase/config'
import { getFirestoreErrorMessage } from '../utils/errorHandler'

export function useKpiData() {
  const [data, setData] = useState({
    totalScans:       0,
    activeBillboards: 0,
    engagementRate:   0,
    peakHour:         '--:--',
  })
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let isMounted    = true
    let boardsReady  = false
    let scansReady   = false

    function checkDone() {
      if (boardsReady && scansReady && isMounted) setLoading(false)
    }

    // Real-time: all billboards → sum totalScans + count active
    const unsubBoards = onSnapshot(
      collection(db, 'billboards'),
      (snap) => {
        if (!isMounted) return
        let totalScans = 0
        let activeBillboards = 0
        snap.forEach(d => {
          const b = d.data()
          totalScans       += b.totalScans ?? 0
          activeBillboards += b.isActive ? 1 : 0
        })
        setData(prev => ({ ...prev, totalScans, activeBillboards }))
        boardsReady = true
        checkDone()
      },
      (err) => {
        if (!isMounted) return
        setError(getFirestoreErrorMessage(err))
        setLoading(false)
      },
    )

    // Real-time: last 200 scans → engagement rate + peak hour
    const q = query(collection(db, 'scans'), orderBy('timestamp', 'desc'), limit(200))

    const unsubScans = onSnapshot(
      q,
      (snap) => {
        if (!isMounted) return
        const scans = snap.docs.map(d => d.data())

        const social = scans.filter(s => s.platform !== 'other').length
        const engagementRate = scans.length > 0
          ? parseFloat(((social / scans.length) * 100).toFixed(1))
          : 0

        const hourCounts = {}
        scans.forEach(s => {
          const ts = s.timestamp?.toDate?.()
          if (ts) {
            const key = `${String(ts.getHours()).padStart(2, '0')}:00`
            hourCounts[key] = (hourCounts[key] || 0) + 1
          }
        })
        const peak     = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]
        const peakHour = peak ? peak[0] : '--:--'

        setData(prev => ({ ...prev, engagementRate, peakHour }))
        scansReady = true
        checkDone()
      },
      (err) => {
        if (!isMounted) return
        setError(getFirestoreErrorMessage(err))
        setLoading(false)
      },
    )

    return () => {
      isMounted = false
      unsubBoards()
      unsubScans()
    }
  }, [])

  return { ...data, loading, error }
}
