import { createContext, useContext, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import './Modal.css'

const ModalContext = createContext(null)

const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2, ease: 'easeOut' } },
}

const panelVariants = {
  hidden:  { opacity: 0, scale: 0.95, y: 8 },
  visible: { opacity: 1, scale: 1,    y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
}

const SIZE_MAP = {
  sm: '400px',
  md: '560px',
  lg: '720px',
  xl: '960px',
}

const FOCUSABLE = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/**
 * Modal dialog rendered via React Portal with focus trap and scroll lock.
 *
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {string} title - populates aria-labelledby and Modal.Header automatically
 * @param {'sm'|'md'|'lg'|'xl'} size - max-width preset (400/560/720/960px)
 * @param {boolean} closeOnBackdrop - default true
 * @param {boolean} closeOnEsc - default true
 * @param {boolean} showCloseButton - default true
 *
 * @example
 * <Modal isOpen={open} onClose={close} title="Edit Campaign" size="lg">
 *   <Modal.Header />
 *   <Modal.Body>…content…</Modal.Body>
 *   <Modal.Footer>
 *     <Button variant="secondary" onClick={close}>Cancel</Button>
 *     <Button>Save</Button>
 *   </Modal.Footer>
 * </Modal>
 */
function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEsc = true,
  showCloseButton = true,
  children,
}) {
  const panelRef   = useRef(null)
  const triggerRef = useRef(null)

  // Remember the element that triggered the modal; restore focus on close
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement
    } else if (triggerRef.current instanceof HTMLElement) {
      triggerRef.current.focus()
      triggerRef.current = null
    }
  }, [isOpen])

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Focus first focusable element + trap Tab + handle ESC
  useEffect(() => {
    if (!isOpen) return

    const panel = panelRef.current
    if (!panel) return

    const getFocusable = () => [...panel.querySelectorAll(FOCUSABLE)]

    requestAnimationFrame(() => {
      const items = getFocusable()
      if (items.length) items[0].focus()
    })

    const onKeyDown = (e) => {
      if (e.key === 'Escape' && closeOnEsc) {
        e.stopPropagation()
        onClose()
        return
      }

      if (e.key === 'Tab') {
        const items = getFocusable()
        if (!items.length) { e.preventDefault(); return }
        const first = items[0]
        const last  = items[items.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [isOpen, closeOnEsc, onClose])

  const handleOverlayClick = (e) => {
    if (closeOnBackdrop && e.target === e.currentTarget) onClose()
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <ModalContext.Provider value={{ onClose, showCloseButton, title }}>
          <motion.div
            className="modal-overlay"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={handleOverlayClick}
          >
            <motion.div
              ref={panelRef}
              className="modal-panel"
              style={{ maxWidth: SIZE_MAP[size] ?? SIZE_MAP.md }}
              role="dialog"
              aria-modal="true"
              aria-labelledby={title ? 'modal-title' : undefined}
              variants={panelVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </motion.div>
          </motion.div>
        </ModalContext.Provider>
      )}
    </AnimatePresence>,
    document.body
  )
}

/**
 * Modal header — renders the title from context + optional children + close button.
 */
Modal.Header = function ModalHeader({ children, className = '' }) {
  const { onClose, showCloseButton, title } = useContext(ModalContext)

  return (
    <div className={['modal-header', className].filter(Boolean).join(' ')}>
      <div className="modal-header__content">
        {title && (
          <h2 id="modal-title" className="modal-title">
            {title}
          </h2>
        )}
        {children}
      </div>

      {showCloseButton && (
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close modal"
          type="button"
        >
          <X size={18} />
        </button>
      )}
    </div>
  )
}

/**
 * Modal body — scrollable content area.
 */
Modal.Body = function ModalBody({ children, className = '' }) {
  return (
    <div className={['modal-body', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}

/**
 * Modal footer — right-aligned action buttons.
 */
Modal.Footer = function ModalFooter({ children, className = '' }) {
  return (
    <div className={['modal-footer', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}

export default Modal
