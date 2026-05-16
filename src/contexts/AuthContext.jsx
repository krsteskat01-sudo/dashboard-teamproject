import { createContext, useContext, useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import { onAuthChange, logoutUser as firebaseLogout } from '../firebase/auth'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setCurrentUser(user)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  const logout = async () => {
    const result = await firebaseLogout()
    if (result.success) setCurrentUser(null)
    return result
  }

  // Re-reads the user doc from Firestore and refreshes currentUser state.
  // Call this after profile updates so the sidebar/header reflects new data immediately.
  const refreshUser = async () => {
    const fbUser = auth.currentUser
    if (!fbUser) return
    try {
      const snap = await getDoc(doc(db, 'users', fbUser.uid))
      if (snap.exists()) {
        const d = snap.data()
        setCurrentUser({
          uid:         fbUser.uid,
          email:       fbUser.email,
          displayName: d.displayName || fbUser.email,
          role:        d.role,
          createdAt:   d.createdAt  ?? null,
          lastLogin:   d.lastLogin  ?? null,
          preferences: d.preferences ?? {},
        })
      }
    } catch (err) {
      console.error('refreshUser error:', err)
    }
  }

  const value = {
    currentUser,
    loading,
    logout,
    refreshUser,
    isAuthenticated: !!currentUser,
    isAdmin: currentUser?.role === 'admin',
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}