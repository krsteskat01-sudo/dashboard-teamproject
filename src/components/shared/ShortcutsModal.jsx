import { Modal } from '../ui'
import './ShortcutsModal.css'

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'],  label: 'Quick search' },
  { keys: ['?'],          label: 'Show this help' },
  { keys: ['Esc'],        label: 'Close modal / dismiss' },
]

const NAV_SHORTCUTS = [
  { keys: ['G', 'D'], label: 'Go to Dashboard' },
  { keys: ['G', 'C'], label: 'Go to Campaigns' },
  { keys: ['G', 'S'], label: 'Go to Scans' },
  { keys: ['G', 'A'], label: 'Go to Analytics' },
]

function Kbd({ children }) {
  return <kbd className="kbd">{children}</kbd>
}

export default function ShortcutsModal({ isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Keyboard Shortcuts" size="sm">
      <Modal.Header />
      <Modal.Body>
        <div className="shortcuts-section">
          <div className="shortcuts-group-label">General</div>
          {SHORTCUTS.map(s => (
            <div key={s.label} className="shortcuts-row">
              <span className="shortcuts-label">{s.label}</span>
              <span className="shortcuts-keys">
                {s.keys.map((k, i) => (
                  <span key={i}>
                    <Kbd>{k}</Kbd>
                    {i < s.keys.length - 1 && <span className="shortcuts-plus">+</span>}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>

        <div className="shortcuts-section">
          <div className="shortcuts-group-label">Navigation <span className="shortcuts-coming-soon">coming soon</span></div>
          {NAV_SHORTCUTS.map(s => (
            <div key={s.label} className="shortcuts-row shortcuts-row--muted">
              <span className="shortcuts-label">{s.label}</span>
              <span className="shortcuts-keys">
                {s.keys.map((k, i) => (
                  <span key={i}>
                    <Kbd>{k}</Kbd>
                    {i < s.keys.length - 1 && <span className="shortcuts-then">then</span>}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      </Modal.Body>
    </Modal>
  )
}
