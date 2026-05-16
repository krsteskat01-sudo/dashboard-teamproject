import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { getFirestoreErrorMessage } from '../utils/errorHandler'

const PLATFORM_CONFIG = {
  instagram: { label: 'Instagram', color: '#E4405F' },
  tiktok:    { label: 'TikTok',    color: '#FF0050' },
  web:       { label: 'Web',       color: '#2F64FF' },
  other:     { label: 'Other',     color: '#94A3B8' },
}

export function usePlatformDistribution() {
  const [distribution, setDistribution] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)

  useEffect(() => {
    let isMounted = true
    const since   = Timestamp.fromDate(new Date(Date.now() - 30 * 86_400_000))

    const unsub = onSnapshot(
      query(collection(db, 'scans'), where('timestamp', '>=', since)),
      (snap) => {
        if (!isMounted) return

        const counts = {}
        snap.forEach(d => {
          const p = d.data().platform || 'other'
          counts[p] = (counts[p] || 0) + 1
        })

        const total = Object.values(counts).reduce((a, b) => a + b, 0)

        const dist = Object.entries(counts)
          .map(([key, count]) => {
            const cfg = PLATFORM_CONFIG[key] ?? { label: key, color: '#94A3B8' }
            return {
              name:  cfg.label,
              value: total > 0 ? Math.round((count / total) * 100) : 0,
              color: cfg.color,
            }
          })
          .sort((a, b) => b.value - a.value)

        setDistribution(dist)
        setLoading(false)
      },
      (err) => {
        if (!isMounted) return
        setError(getFirestoreErrorMessage(err))
        setLoading(false)
      },
    )

    return () => {
      isMounted = false
      unsub()
    }
  }, [])

  return { distribution, loading, error }
}
