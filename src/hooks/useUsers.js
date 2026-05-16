import { useState, useCallback } from 'react'
import { getAllUsers } from '../firebase/users'

export function useUsers() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await getAllUsers()
    if (res.success) setUsers(res.data)
    else setError(res.error)
    setLoading(false)
  }, [])

  return { users, loading, error, refresh }
}
