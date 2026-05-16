import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { getFirestoreErrorMessage } from '../utils/errorHandler'

export function useTrendComparison(days = 7) {
  const [data,    setData]    = useState({ current: 0, previous: 0, changePercent: 0 })
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let isMounted     = true
    let currentCount  = null
    let previousCount = null

    const periodMs    = days * 86_400_000
    const now         = Date.now()
    const periodStart = Timestamp.fromDate(new Date(now - periodMs))
    const prevStart   = Timestamp.fromDate(new Date(now - 2 * periodMs))

    function compute() {
      if (currentCount === null || previousCount === null || !isMounted) return
      const changePercent = previousCount > 0
        ? parseFloat((((currentCount - previousCount) / previousCount) * 100).toFixed(1))
        : currentCount > 0 ? 100 : 0
      setData({ current: currentCount, previous: previousCount, changePercent })
      setLoading(false)
    }

    // Current period: now − days → now
    const unsubCurr = onSnapshot(
      query(collection(db, 'scans'), where('timestamp', '>=', periodStart)),
      (snap) => {
        if (!isMounted) return
        currentCount = snap.size
        compute()
      },
      (err) => {
        if (!isMounted) return
        setError(getFirestoreErrorMessage(err))
        setLoading(false)
      },
    )

    // Previous period: now − 2×days → now − days
    const unsubPrev = onSnapshot(
      query(
        collection(db, 'scans'),
        where('timestamp', '>=', prevStart),
        where('timestamp', '<',  periodStart),
      ),
      (snap) => {
        if (!isMounted) return
        previousCount = snap.size
        compute()
      },
      (err) => {
        if (!isMounted) return
        setError(getFirestoreErrorMessage(err))
        setLoading(false)
      },
    )

    return () => {
      isMounted = false
      unsubCurr()
      unsubPrev()
    }
  }, [days])

  return { ...data, loading, error }
}
