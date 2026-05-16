import { useState, useEffect, useCallback, useRef } from 'react'
import { subscribeToCampaigns } from '../firebase/campaigns'

const DEFAULT_FILTERS = {
  status:    'all',
  search:    '',
  sortBy:    'newest',
  sortOrder: 'desc',
}

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [filters,   setFilters]   = useState(DEFAULT_FILTERS)

  // Track the active unsubscribe so we can clean it up when filters change
  const unsubRef = useRef(null)

  const subscribe = useCallback((activeFilters) => {
    setLoading(true)
    setError(null)

    if (unsubRef.current) {
      unsubRef.current()
      unsubRef.current = null
    }

    unsubRef.current = subscribeToCampaigns((result) => {
      if (result.success) {
        setCampaigns(result.data)
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

  return { campaigns, loading, error, filters, setFilters, refresh }
}
