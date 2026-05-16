import { useState, useEffect, useCallback, useRef } from 'react'
import { subscribeToBillboards } from '../firebase/billboards'

const DEFAULT_FILTERS = {
  campaignId: '',
  city:       'all',
  isActive:   'all',
  search:     '',
  sortBy:     'newest',
}

export function useBillboards() {
  const [billboards, setBillboards] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [filters,    setFilters]    = useState(DEFAULT_FILTERS)

  const unsubRef = useRef(null)

  const subscribe = useCallback((activeFilters) => {
    setLoading(true)
    setError(null)

    if (unsubRef.current) {
      unsubRef.current()
      unsubRef.current = null
    }

    unsubRef.current = subscribeToBillboards((result) => {
      if (result.success) {
        setBillboards(result.data)
        setError(null)
      } else {
        setError(result.error)
      }
      setLoading(false)
    }, activeFilters)
  }, [])

  useEffect(() => {
    subscribe(filters)
    return () => {
      if (unsubRef.current) unsubRef.current()
    }
  }, [filters, subscribe])

  const refresh = useCallback(() => subscribe(filters), [filters, subscribe])

  return { billboards, loading, error, filters, setFilters, refresh }
}
