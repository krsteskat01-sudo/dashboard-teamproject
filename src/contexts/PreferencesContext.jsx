import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { updateUserProfile } from '../firebase/users'

export const PREF_DEFAULTS = {
  density:            'normal',     // 'compact' | 'normal' | 'comfortable'
  fontSize:           'medium',     // 'small' | 'medium' | 'large'
  language:           'en',
  timezone:           'Europe/Skopje',
  dateFormat:         'DD/MM/YYYY', // 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  timeFormat:         '24h',        // '12h' | '24h'
  firstDayOfWeek:     'monday',     // 'sunday' | 'monday'
  defaultLandingPage: 'dashboard',  // 'dashboard' | 'campaigns' | 'scans' | 'analytics'
  defaultDateRange:   '30d',        // '7d' | '30d' | '90d'
}

const STORAGE_KEY = 'nv_preferences'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...PREF_DEFAULTS, ...JSON.parse(raw) } : { ...PREF_DEFAULTS }
  } catch {
    return { ...PREF_DEFAULTS }
  }
}

const PreferencesContext = createContext(null)

export function PreferencesProvider({ children }) {
  const { currentUser } = useAuth()
  const [preferences, setPreferences] = useState(loadFromStorage)

  // Merge preferences from Firestore when user logs in (cross-device sync)
  useEffect(() => {
    if (!currentUser?.preferences) return
    const merged = { ...PREF_DEFAULTS, ...currentUser.preferences }
    setPreferences(merged)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
  }, [currentUser?.uid]) // eslint-disable-line react-hooks/exhaustive-deps

  const updatePreference = useCallback(async (key, value) => {
    const next = { ...preferences, [key]: value }
    setPreferences(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    if (currentUser?.uid) {
      await updateUserProfile(currentUser.uid, { preferences: next })
    }
  }, [preferences, currentUser?.uid])

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreference }}>
      {children}
    </PreferencesContext.Provider>
  )
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider')
  return ctx
}
