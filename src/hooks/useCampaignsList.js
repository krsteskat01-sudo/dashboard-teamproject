import { useState, useEffect, useRef } from 'react'
import { getCampaigns } from '../firebase/campaigns'

export function useCampaignsList() {
  const [campaigns, setCampaigns] = useState([])
  const [loading,   setLoading]   = useState(true)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    getCampaigns({ sortBy: 'name' }).then(result => {
      if (result.success) {
        setCampaigns(result.data.map(c => ({ id: c.id, name: c.name, status: c.status })))
      }
      setLoading(false)
    })
  }, [])

  return { campaigns, loading }
}
