import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ErrorBoundary from './components/shared/ErrorBoundary'
import NetworkStatus from './components/shared/NetworkStatus'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/shared/ProtectedRoute'
import PublicRoute from './components/shared/PublicRoute'
import { Spinner } from './components/ui'

// Lazy-loaded pages — each becomes its own bundle chunk
const Login        = lazy(() => import('./pages/Login'))
const Dashboard    = lazy(() => import('./pages/Dashboard'))
const Campaigns    = lazy(() => import('./pages/Campaigns'))
const Billboards   = lazy(() => import('./pages/Billboards'))
const Scans        = lazy(() => import('./pages/Scans'))
const Analytics    = lazy(() => import('./pages/Analytics'))
const Settings     = lazy(() => import('./pages/Settings'))
const Reports      = lazy(() => import('./pages/Reports'))
const ScanRedirect = lazy(() => import('./pages/ScanRedirect'))
const NotFound     = lazy(() => import('./pages/NotFound'))

function PageLoader() {
  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      minHeight:      '50vh',
    }}>
      <Spinner size={28} />
    </div>
  )
}

function WrappedPage({ children }) {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  )
}

function App() {
  return (
    <>
      <NetworkStatus />

      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Public — login */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <WrappedPage><Login /></WrappedPage>
                </PublicRoute>
              }
            />

            {/* Protected routes with layout */}
            <Route element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route path="/dashboard"  element={<WrappedPage><Dashboard /></WrappedPage>} />
              <Route path="/campaigns"  element={<WrappedPage><Campaigns /></WrappedPage>} />
              <Route path="/billboards" element={<WrappedPage><Billboards /></WrappedPage>} />
              <Route path="/scans"      element={<WrappedPage><Scans /></WrappedPage>} />
              <Route path="/analytics"  element={<WrappedPage><Analytics /></WrappedPage>} />
              <Route path="/reports"    element={<WrappedPage><Reports /></WrappedPage>} />
              <Route path="/settings"   element={<WrappedPage><Settings /></WrappedPage>} />
            </Route>

            {/* Public scan redirect — no auth, no Layout */}
            <Route
              path="/scan/:billboardId"
              element={<WrappedPage><ScanRedirect /></WrappedPage>}
            />

            {/* 404 */}
            <Route path="*" element={<WrappedPage><NotFound /></WrappedPage>} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </>
  )
}

export default App
