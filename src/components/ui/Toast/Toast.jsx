import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import './Toast.css'

const VARIANT_CONFIG = {
  success: { icon: CheckCircle2, className: 'toast--success' },
  error:   { icon: AlertCircle,   className: 'toast--error'   },
  warning: { icon: AlertTriangle, className: 'toast--warning' },
  info:    { icon: Info,          className: 'toast--info'    },
}

/**
 * Returns framer-motion variants for slide-in based on toast container position.
 */
function getMotionVariants(position) {
  const fromRight  = position.includes('right')
  const fromLeft   = position.includes('left')
  const fromTop    = position.includes('top') && position.includes('center')
  const fromBottom = position.includes('bottom') && position.includes('center')

  const xOffset = fromRight ? 110 : fromLeft ? -110 : 0
  const yOffset = fromTop ? -32 : fromBottom ? 32 : 0

  return {
    hidden: {
      opacity: 0,
      x: xOffset,
      y: yOffset,
      scale: 0.9,
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 420, damping: 32 },
    },
    exit: {
      opacity: 0,
      x: xOffset * 0.6,
      scale: 0.92,
      transition: { duration: 0.18, ease: 'easeIn' },
    },
  }
}

/**
 * Individual toast notification.
 * Rendered by ToastContext; not meant to be used directly.
 *
 * @param {string} id
 * @param {'success'|'error'|'warning'|'info'} variant
 * @param {string} title
 * @param {string} message
 * @param {number} duration - ms; 0 disables auto-dismiss
 * @param {{ label: string, onClick: function }} action
 * @param {string} position - from ToastProvider
 * @param {function} onRemove
 */
function Toast({
  id,
  variant = 'info',
  title,
  message,
  duration = 4000,
  action,
  position = 'top-right',
  onRemove,
}) {
  const [progress, setProgress]   = useState(100)
  const [paused, setPaused]       = useState(false)

  // Mutable refs avoid stale closures in the interval
  const onRemoveRef    = useRef(onRemove)
  const remainingRef   = useRef(duration)
  const lastTickRef    = useRef(null)
  const intervalRef    = useRef(null)

  useEffect(() => { onRemoveRef.current = onRemove }, [onRemove])

  useEffect(() => {
    if (duration === 0 || paused) return

    lastTickRef.current = Date.now()

    intervalRef.current = setInterval(() => {
      const now   = Date.now()
      const delta = now - lastTickRef.current
      lastTickRef.current = now

      remainingRef.current = Math.max(0, remainingRef.current - delta)
      const pct = (remainingRef.current / duration) * 100
      setProgress(pct)

      if (remainingRef.current <= 0) {
        clearInterval(intervalRef.current)
        onRemoveRef.current()
      }
    }, 50)

    return () => clearInterval(intervalRef.current)
  }, [paused, duration])

  const handleMouseEnter = () => {
    setPaused(true)
    clearInterval(intervalRef.current)
    // Sync remaining time up to this moment
    if (lastTickRef.current !== null) {
      const delta = Date.now() - lastTickRef.current
      remainingRef.current = Math.max(0, remainingRef.current - delta)
      lastTickRef.current = null
    }
  }

  const handleMouseLeave = () => {
    setPaused(false)
  }

  const { icon: Icon, className: variantClass } =
    VARIANT_CONFIG[variant] ?? VARIANT_CONFIG.info

  const motionVariants = getMotionVariants(position)

  return (
    <motion.div
      layout
      variants={motionVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={['toast', variantClass].join(' ')}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="toast__icon" aria-hidden="true">
        <Icon size={18} />
      </div>

      <div className="toast__content">
        {title   && <p className="toast__title">{title}</p>}
        {message && <p className="toast__message">{message}</p>}
        {action  && (
          <button
            type="button"
            className="toast__action"
            onClick={action.onClick}
          >
            {action.label}
          </button>
        )}
      </div>

      <button
        type="button"
        className="toast__close"
        onClick={onRemove}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>

      {duration > 0 && (
        <div className="toast__progress" aria-hidden="true">
          <div
            className="toast__progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </motion.div>
  )
}

export default Toast
