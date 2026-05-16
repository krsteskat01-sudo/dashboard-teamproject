import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import './NotFound.css'

export default function NotFound() {
  useDocumentTitle('404 — Not Found')
  const { isAuthenticated } = useAuth()

  return (
    <div className="nf-page">
      <div className="nf-card">
        <div className="nf-code">404</div>
        <h1 className="nf-title">Page not found</h1>
        <p className="nf-desc">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <Link
          className="nf-btn"
          to={isAuthenticated ? '/dashboard' : '/login'}
        >
          {isAuthenticated ? 'Go to Dashboard' : 'Go to Login'}
        </Link>
      </div>
    </div>
  )
}
