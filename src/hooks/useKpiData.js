import { useState, useEffect } from 'react'
import { collection, query, orderBy, limit, onSnapshot, getCountFromServer } from 'firebase/firestore'
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
    let isMounted      = true
    let countsLoaded   = false
    let scansLoaded    = false
    let unsub          = null

    function checkDone() {
      if (countsLoaded && scansLoaded && isMounted) setLoading(false)
    }

    // One-time counts
    Promise.all([
      getCountFromServer(collection(db, 'scans')),
      getCountFromServer(collection(db, 'billboards')),
    ]).then(([scansSnap, boardsSnap]) => {
      if (!isMounted) return
      setData(prev => ({
        ...prev,
        totalScans:       scansSnap.data().count,
        activeBillboards: boardsSnap.data().count,
      }))
      countsLoaded = true
      checkDone()
    }).catch(err => {
      if (!isMounted) return
      setError(getFirestoreErrorMessage(err))
      setLoading(false)
    })

    // Real-time: last 200 scans → engagement rate + peak hour
    const q = query(collection(db, 'scans'), orderBy('timestamp', 'desc'), limit(200))

    unsub = onSnapshot(q, (snap) => {
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
      const peak = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]
      const peakHour = peak ? peak[0] : '--:--'

      setData(prev => ({ ...prev, engagementRate, peakHour }))
      scansLoaded = true
      checkDone()
    }, (err) => {
      if (!isMounted) return
      setError(getFirestoreErrorMessage(err))
      setLoading(false)
    })

    return () => {
      isMounted = false
      if (unsub) unsub()
    }
  }, [])

  return { ...data, loading, error }
}
