import { useState, useEffect } from 'react'
import { collection, query, where, getCountFromServer, Timestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { getFirestoreErrorMessage } from '../utils/errorHandler'

export function useTrendComparison(days = 7) {
  const [data,    setData]    = useState({ current: 0, previous: 0, changePercent: 0 })
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let isMounted = true

    async function fetchComparison() {
      try {
        const now           = Date.now()
        const periodMs      = days * 86_400_000
        const periodStart   = Timestamp.fromDate(new Date(now - periodMs))
        const prevStart     = Timestamp.fromDate(new Date(now - 2 * periodMs))

        const [currSnap, prevSnap] = await Promise.all([
          getCountFromServer(query(
            collection(db, 'scans'),
            where('timestamp', '>=', periodStart),
          )),
          getCountFromServer(query(
            collection(db, 'scans'),
            where('timestamp', '>=', prevStart),
            where('timestamp', '<', periodStart),
          )),
        ])

        if (!isMounted) return

        const current  = currSnap.data().count
        const previous = prevSnap.data().count
        const changePercent = previous > 0
          ? parseFloat((((current - previous) / previous) * 100).toFixed(1))
          : current > 0 ? 100 : 0

        setData({ current, previous, changePercent })
        setLoading(false)
      } catch (err) {
        if (!isMounted) return
        setError(getFirestoreErrorMessage(err))
        setLoading(false)
      }
    }

    fetchComparison()
    return () => { isMounted = false }
  }, [days])

  return { ...data, loading, error }
}
