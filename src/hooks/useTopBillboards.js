import { useState, useEffect } from 'react'
import { collection, query, orderBy, limit, where, onSnapshot, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../firebase/config'
import { getFirestoreErrorMessage } from '../utils/errorHandler'
import { getWeekOverWeekChange } from '../firebase/firestore'

export function useTopBillboards() {
  const [billboards, setBillboards] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  useEffect(() => {
    let isMounted = true

    const q = query(
      collection(db, 'billboards'),
      orderBy('totalScans', 'desc'),
      limit(5),
    )

    const unsub = onSnapshot(q, async (snap) => {
      try {
        const boards = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        const ids    = boards.map(b => b.id)

        const { success, data: changes } = await getWeekOverWeekChange(ids)

        if (!isMounted) return

        const enriched = boards.map(board => ({
          id:       board.id,
          location: board.locationName,
          scans:    board.totalScans ?? 0,
          change:   success ? (changes?.[board.id] ?? 0) : 0,
        }))

        setBillboards(enriched)
        setLoading(false)
      } catch (err) {
        if (!isMounted) return
        setError(getFirestoreErrorMessage(err))
        setLoading(false)
      }
    }, (err) => {
      if (!isMounted) return
      setError(getFirestoreErrorMessage(err))
      setLoading(false)
    })

    return () => {
      isMounted = false
      unsub()
    }
  }, [])

  return { billboards, loading, error }
}
