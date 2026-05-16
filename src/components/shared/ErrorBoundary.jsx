import { Component } from 'react'
import { AlertOctagon, RefreshCw, LayoutDashboard } from 'lucide-react'
import './ErrorBoundary.css'

const IS_DEV = import.meta.env.DEV

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
    this.setState({ errorInfo })
    // TODO: send to error tracking (e.g. Sentry) in production
  }

  reset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className="eb-wrap">
        <div className="eb-card">
          <div className="eb-icon">
            <AlertOctagon size={36} />
          </div>

          <h1 className="eb-title">Something went wrong</h1>

          {IS_DEV && this.state.error ? (
            <pre className="eb-stack">
              {this.state.error.toString()}
              {this.state.errorInfo?.componentStack}
            </pre>
          ) : (
            <p className="eb-desc">
              We&apos;ve been notified and are looking into it.
              <br />Try refreshing the page or go back to the dashboard.
            </p>
          )}

          <div className="eb-actions">
            <button className="eb-btn eb-btn--primary" onClick={this.reset}>
              <RefreshCw size={15} />
              Try Again
            </button>
            <a className="eb-btn eb-btn--secondary" href="/dashboard">
              <LayoutDashboard size={15} />
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
