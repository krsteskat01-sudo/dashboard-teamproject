import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth()
  const location = useLocation()

  // Loading state
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--color-bg)',
        gap: 'var(--space-4)',
      }}>
        <Loader2 
          size={32} 
          style={{ 
            color: 'var(--color-primary)',
            animation: 'spin 0.8s linear infinite' 
          }} 
        />
        <p style={{
          color: 'var(--color-text-muted)',
          fontSize: '14px',
          fontFamily: 'var(--font-primary)',
        }}>
          Loading...
        </p>
      </div>
    )
  }

  // Not authenticated - redirect to login
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Authenticated - render children
  return children
}

export default ProtectedRoute