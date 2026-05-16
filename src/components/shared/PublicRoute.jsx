import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Loader2 } from 'lucide-react'

function PublicRoute({ children }) {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--color-bg)',
      }}>
        <Loader2 
          size={32} 
          style={{ 
            color: 'var(--color-primary)',
            animation: 'spin 0.8s linear infinite' 
          }} 
        />
      </div>
    )
  }

  // Веќе logged in - redirect to dashboard
  if (currentUser) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default PublicRoute