import { createContext, useCallback, useContext, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence } from 'framer-motion'
import Toast from './Toast'
import './Toast.css'

const ToastContext = createContext(null)

const POSITION_CLASS = {
  'top-right':     'toast-container--top-right',
  'top-left':      'toast-container--top-left',
  'bottom-right':  'toast-container--bottom-right',
  'bottom-left':   'toast-container--bottom-left',
  'top-center':    'toast-container--top-center',
  'bottom-center': 'toast-container--bottom-center',
}

/**
 * Provides toast notifications to the entire app.
 * Add this once near the root in main.jsx.
 *
 * @param {'top-right'|'top-left'|'bottom-right'|'bottom-left'|'top-center'|'bottom-center'} position
 * @param {number} maxToasts - maximum simultaneous visible toasts (default 5)
 */
export function ToastProvider({ children, position = 'top-right', maxToasts = 5 }) {
  const [toasts, setToasts] = useState([])

  /**
   * Display a new toast notification.
   *
   * @param {'success'|'error'|'warning'|'info'} variant
   * @param {string} title
   * @param {string} message
   * @param {number} duration - ms until auto-dismiss; 0 = no auto-dismiss
   * @param {{ label: string, onClick: function }} action - optional inline CTA
   */
  const showToast = useCallback(
    ({ variant = 'info', title, message, duration = 4000, action } = {}) => {
      const id = crypto.randomUUID()
      setToasts((prev) => {
        const next = [{ id, variant, title, message, duration, action }, ...prev]
        return next.slice(0, maxToasts)
      })
    },
    [maxToasts]
  )

  /** Remove a specific toast by id. */
  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  /** Remove all visible toasts. */
  const clearAll = useCallback(() => setToasts([]), [])

  const containerClass = [
    'toast-container',
    POSITION_CLASS[position] ?? POSITION_CLASS['top-right'],
  ].join(' ')

  return (
    <ToastContext.Provider value={{ showToast, removeToast, clearAll }}>
      {children}

      {createPortal(
        <div className={containerClass} aria-live="polite" aria-label="Notifications">
          <AnimatePresence mode="popLayout" initial={false}>
            {toasts.map((toast) => (
              <Toast
                key={toast.id}
                {...toast}
                position={position}
                onRemove={() => removeToast(toast.id)}
              />
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

/**
 * Hook for triggering toast notifications from any component.
 *
 * @returns {{ showToast, removeToast, clearAll }}
 * @throws if used outside <ToastProvider>
 */
export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}
