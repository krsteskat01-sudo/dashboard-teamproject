import { useState, useEffect, useMemo } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import { subscribeToScans } from '../firebase/scans'

const DEFAULT_FILTERS = { campaignId: '', device: 'all', platform: 'all' }

export function useLiveScans() {
  const [raw,          setRaw]          = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [filters,      setFilters]      = useState(DEFAULT_FILTERS)
  const [billboardMap, setBillboardMap] = useState(new Map())
  const [campaignMap,  setCampaignMap]  = useState(new Map())

  // One-time fetch of all billboard + campaign names for client-side join
  useEffect(() => {
    Promise.all([
      getDocs(collection(db, 'billboards')),
      getDocs(collection(db, 'campaigns')),
    ]).then(([bbSnap, campSnap]) => {
      const bb   = new Map()
      const camp = new Map()
      bbSnap.docs.forEach(d => {
        const { locationName, city, coordinates } = d.data()
        bb.set(d.id, { locationName, city, coordinates })
      })
      campSnap.docs.forEach(d => {
        const { name, status } = d.data()
        camp.set(d.id, { name, status })
      })
      setBillboardMap(bb)
      setCampaignMap(camp)
    })
  }, [])

  // Real-time subscription — single subscription, filters applied client-side
  useEffect(() => {
    setLoading(true)
    const unsub = subscribeToScans(result => {
      if (result.success) {
        setRaw(result.data)
        setError(null)
      } else {
        setError(result.error)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // Derive final list: enrich → filter → cap at 100
  const scans = useMemo(() => {
    let items = raw.map(scan => {
      const bb   = billboardMap.get(scan.billboardId) ?? {}
      const camp = campaignMap.get(scan.campaignId)   ?? {}
      return {
        ...scan,
        billboardName:   bb.locationName ?? '—',
        billboardCity:   bb.city         ?? '',
        billboardCoords: bb.coordinates  ?? null,
        campaignName:    camp.name       ?? '—',
        campaignStatus:  camp.status     ?? '',
      }
    })

    if (filters.campaignId)          items = items.filter(s => s.campaignId === filters.campaignId)
    if (filters.device   !== 'all')  items = items.filter(s => s.device     === filters.device)
    if (filters.platform !== 'all')  items = items.filter(s => s.platform   === filters.platform)

    return items.slice(0, 100)
  }, [raw, filters, billboardMap, campaignMap])

  return { scans, loading, error, filters, setFilters }
}
